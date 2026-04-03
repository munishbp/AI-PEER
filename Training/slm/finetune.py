"""
Fine-tune Qwen3.5-0.8B on mental health counseling conversations.

Outputs a GGUF Q4_K_M model for on-device inference via llama.rn.
Thinking mode is disabled -- Qwen3.5-0.8B defaults to non-thinking,
and we train without <think> tags so the model responds directly.

Usage:
    pip install -r requirements.txt
    python finetune.py

Requires: CUDA GPU with >= 8GB VRAM (T4, A10, RTX 3060+, etc.)
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
import torch

# -----------------------------------------------
# Configuration
# -----------------------------------------------
MODEL_NAME = "Qwen/Qwen3.5-0.8B"
DATASET_NAME = "Amod/mental_health_counseling_conversations"
OUTPUT_DIR = "./output/sft"
GGUF_DIR = "./output/gguf"
MAX_SEQ_LENGTH = 2048

# LoRA
LORA_R = 16
LORA_ALPHA = 16

# Training (RTX 5090 32GB - batch=4 keeps ~60% VRAM with 150k vocab logits)
NUM_EPOCHS = 3
BATCH_SIZE = 4
GRAD_ACCUM_STEPS = 4          # effective batch = 16
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.1
DATALOADER_WORKERS = 0        # 0 avoids Windows multiprocessing overhead

# System prompt -- matches the app's PEER framework persona
SYSTEM_PROMPT = (
    "You are AI-PEER, a compassionate healthcare companion focused on the "
    "PEER framework for fall prevention and exercise motivation. "
    "Respond with empathy, validate feelings, and provide supportive guidance. "
    "Keep responses concise and actionable. Do not use emojis in your responses. "
    "You are NOT a medical professional. Redirect medical questions to "
    "the user's healthcare provider."
)


def vram_usage(label=""):
    """Print current VRAM usage."""
    allocated = torch.cuda.memory_allocated() / 1024**3
    reserved = torch.cuda.memory_reserved() / 1024**3
    total = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"[VRAM {label}] Allocated: {allocated:.2f} GB | Reserved: {reserved:.2f} GB | Total: {total:.2f} GB | Free: {total - reserved:.2f} GB")


def main():
    from unsloth import FastLanguageModel
    from datasets import load_dataset
    from trl import SFTTrainer, SFTConfig
    from transformers import TrainerCallback

    vram_usage("startup")

    # -----------------------------------------------
    # 1. Load model + tokenizer (4-bit QLoRA)
    # -----------------------------------------------
    print(f"Loading {MODEL_NAME} in 4-bit mode...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
    )
    vram_usage("after model load")

    # -----------------------------------------------
    # 2. Apply LoRA adapters
    # -----------------------------------------------
    print("Applying LoRA adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        lora_alpha=LORA_ALPHA,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
        max_seq_length=MAX_SEQ_LENGTH,
    )
    vram_usage("after LoRA")

    # -----------------------------------------------
    # 3. Load & format dataset
    # -----------------------------------------------
    print(f"Loading dataset: {DATASET_NAME}")
    dataset = load_dataset(DATASET_NAME, split="train")
    print(f"Dataset size: {len(dataset)} examples")

    def format_conversation(example):
        """Convert Context/Response into ChatML without thinking tags."""
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": example["Context"]},
            {"role": "assistant", "content": example["Response"]},
        ]
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}

    # num_proc=1 on Windows to avoid multiprocessing spawn issues
    dataset = dataset.map(format_conversation, num_proc=1)

    # Train/val split (90/10)
    split = dataset.train_test_split(test_size=0.1, seed=3407)
    train_dataset = split["train"]
    val_dataset = split["test"]
    print(f"Train: {len(train_dataset)} | Val: {len(val_dataset)}")

    # -----------------------------------------------
    # 4. Train (SFT) with VRAM monitoring
    # -----------------------------------------------

    class VRAMCallback(TrainerCallback):
        """Log VRAM usage every N steps and after first step."""
        def on_step_end(self, args, state, control, **kwargs):
            if state.global_step == 1 or state.global_step % 50 == 0:
                vram_usage(f"step {state.global_step}")

        def on_epoch_end(self, args, state, control, **kwargs):
            vram_usage(f"epoch {state.epoch:.0f} end")

    print("Starting SFT training...")
    vram_usage("before training")

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        args=SFTConfig(
            dataset_text_field="text",
            max_seq_length=MAX_SEQ_LENGTH,
            per_device_train_batch_size=BATCH_SIZE,
            gradient_accumulation_steps=GRAD_ACCUM_STEPS,
            num_train_epochs=NUM_EPOCHS,
            learning_rate=LEARNING_RATE,
            warmup_ratio=WARMUP_RATIO,
            logging_steps=10,
            eval_strategy="epoch",
            save_strategy="epoch",
            output_dir=OUTPUT_DIR,
            optim="adamw_8bit",
            seed=3407,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            dataloader_num_workers=DATALOADER_WORKERS,
            dataloader_pin_memory=True,
        ),
        callbacks=[VRAMCallback()],
    )

    trainer.train()
    vram_usage("after training")
    print("Training complete!")

    # -----------------------------------------------
    # 5. Export to GGUF Q4_K_M
    # -----------------------------------------------
    os.makedirs(GGUF_DIR, exist_ok=True)
    print(f"Exporting to GGUF Q4_K_M -> {GGUF_DIR}/")
    vram_usage("before GGUF export")

    model.save_pretrained_gguf(
        GGUF_DIR,
        tokenizer,
        quantization_method="q4_k_m",
    )

    vram_usage("after GGUF export")

    # List output files
    for f in os.listdir(GGUF_DIR):
        size_mb = os.path.getsize(os.path.join(GGUF_DIR, f)) / (1024 * 1024)
        print(f"  {f} -- {size_mb:.1f} MB")

    print("\nDone! Next step: python upload_to_gcs.py")


if __name__ == "__main__":
    main()
