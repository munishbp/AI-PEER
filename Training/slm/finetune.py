"""
Fine-tune Qwen3.5-2B-Instruct on YsK-dev/geriatric-health-advice.

Why this approach:
- Qwen3.5-2B-Instruct is the smallest "decent" instruction-tuned model
  that can hold a coherent multi-turn conversation. The 0.8B finetune
  on mental_health_counseling_conversations produced rambling,
  repetitive output. The 2B has more capacity to follow nuanced
  system prompt rules.
- YsK-dev/geriatric-health-advice is purpose-built for elderly health
  coaching: short responses (~80 words avg, 3 sentences), Apache 2.0
  license, covers fall prevention, mobility, exercise, sleep, anxiety,
  medication adherence, and when to escalate to a healthcare provider.
- Someone has already finetuned Qwen 2.5 1.5B on this exact dataset
  successfully (YsK-dev/zima-qwen-geriatric-1.5b), so we know the data
  trains cleanly on this model class.

Outputs a GGUF Q4_K_M model for on-device inference via llama.rn.
Q4_K_M of Qwen3.5-2B is ~1.2GB - acceptable for iPhone 11+ and
modern Android devices.

Thinking mode is disabled - we want direct responses, not chain of thought.

Usage:
    pip install -r requirements.txt
    python finetune_geriatric.py

Requires: CUDA GPU with >= 12GB VRAM (RTX 3060 12GB, 4070, 4080, 5090, etc.)
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
import torch

# -----------------------------------------------
# Configuration
# -----------------------------------------------
MODEL_NAME = "Qwen/Qwen3.5-2B-Instruct"
DATASET_NAME = "YsK-dev/geriatric-health-advice"
OUTPUT_DIR = "./output/sft_geriatric"
GGUF_DIR = "./output/gguf_geriatric"
MAX_SEQ_LENGTH = 1024  # geriatric dataset is short - no need for 2048

# LoRA - slightly higher rank for the larger 2B model
LORA_R = 16
LORA_ALPHA = 16

# Training (RTX 5090 32GB - can handle larger batches with 2B model)
NUM_EPOCHS = 3
BATCH_SIZE = 4
GRAD_ACCUM_STEPS = 4          # effective batch = 16
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.1
DATALOADER_WORKERS = 0        # 0 avoids Windows multiprocessing overhead

# Filter rules to prevent rambling/sappy patterns
MAX_RESPONSE_WORDS = 80       # drop responses longer than this
BLOCKED_PHRASES = [
    "I'm glad you reached out",
    "I am glad you reached out",
    "It takes courage",
    "I hear you",
    "Please remember that",
    "It's important to remember",
    "Take this time to",
]

# System prompt - matches the app's PEER framework persona
# This MUST match the prompt in front-end/AI-PEER/src/llm/systemPrompt.ts
SYSTEM_PROMPT = (
    "You are AI-PEER, a calm, focused companion for the PEER fall-prevention "
    "exercise program. You speak with older adults.\n\n"
    "Length Rules: Maximum 3 sentences per response. Never repeat the same "
    "idea twice. Never start consecutive sentences with the same phrase.\n\n"
    "Style: Direct and warm. Short sentences. One idea at a time. Speak like "
    "a calm friend, not a self-help book. If the user expresses fear or "
    "anxiety, acknowledge it in ONE sentence, then offer ONE concrete next "
    "step. If asked about exercises, give numbered steps (3-5 max).\n\n"
    "Boundaries: You are not a medical professional. For symptoms, pain, "
    "injuries, or medication questions, redirect to their healthcare "
    "provider in one sentence. Do not diagnose, recommend treatments, or "
    "discuss dosages. Do not use emojis."
)


def vram_usage(label=""):
    """Print current VRAM usage."""
    allocated = torch.cuda.memory_allocated() / 1024**3
    reserved = torch.cuda.memory_reserved() / 1024**3
    total = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"[VRAM {label}] Allocated: {allocated:.2f} GB | Reserved: {reserved:.2f} GB | Total: {total:.2f} GB | Free: {total - reserved:.2f} GB")


def filter_dataset(example):
    """
    Drop training examples that would teach rambling/sappy patterns.
    This is the most important defense against the failure mode of
    the previous training run.
    """
    response = example.get("output", "")

    # Drop overly long responses
    if len(response.split()) > MAX_RESPONSE_WORDS:
        return False

    # Drop responses with blocklisted filler phrases
    for phrase in BLOCKED_PHRASES:
        if phrase.lower() in response.lower():
            return False

    # Drop responses with obvious 4-gram repetition
    words = response.split()
    if len(words) >= 4:
        seen_4grams = set()
        for i in range(len(words) - 3):
            gram = tuple(words[i:i+4])
            if gram in seen_4grams:
                return False
            seen_4grams.add(gram)

    return True


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
    # 3. Load, filter, and format dataset
    # -----------------------------------------------
    print(f"Loading dataset: {DATASET_NAME}")
    dataset = load_dataset(DATASET_NAME, split="train")
    print(f"Dataset size before filtering: {len(dataset)} examples")

    # Apply quality filters
    dataset = dataset.filter(filter_dataset, num_proc=1)
    print(f"Dataset size after filtering: {len(dataset)} examples")

    def format_conversation(example):
        """Convert instruction/input/output to ChatML."""
        # Combine instruction + input into the user message if input is non-empty
        # For this dataset, input is mostly boilerplate ("Patient is elderly...")
        # so we drop it and just use the instruction as the user message.
        user_message = example["instruction"]
        assistant_message = example["output"]

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_message},
        ]
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )
        return {"text": text}

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

    print("\nDone! Next steps:")
    print("  1. Update upload_to_gcs.py to point at the new GGUF file")
    print("  2. python upload_to_gcs.py --bucket qwenfinetune")
    print("  3. Update front-end/AI-PEER/src/llm/config.ts with the new filename and size")
