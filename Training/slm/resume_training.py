"""
Resume training from epoch 1 checkpoint for 1 more epoch (epoch 2 only).
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
import torch


MODEL_NAME = "Qwen/Qwen3.5-0.8B"
CHECKPOINT_DIR = "./output/sft/checkpoint-396"
DATASET_NAME = "Amod/mental_health_counseling_conversations"
OUTPUT_DIR = "./output/sft"
MAX_SEQ_LENGTH = 2048

LORA_R = 16
LORA_ALPHA = 16

BATCH_SIZE = 4
GRAD_ACCUM_STEPS = 4
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.1

SYSTEM_PROMPT = (
    "You are AI-PEER, a compassionate healthcare companion focused on the "
    "PEER framework for fall prevention and exercise motivation. "
    "Respond with empathy, validate feelings, and provide supportive guidance. "
    "Keep responses concise and actionable. Do not use emojis in your responses. "
    "You are NOT a medical professional. Redirect medical questions to "
    "the user's healthcare provider."
)


def vram_usage(label=""):
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

    print(f"Loading checkpoint from {CHECKPOINT_DIR}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=CHECKPOINT_DIR,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
    )
    vram_usage("after model load")

    print(f"Loading dataset: {DATASET_NAME}")
    dataset = load_dataset(DATASET_NAME, split="train")

    def format_conversation(example):
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": example["Context"]},
            {"role": "assistant", "content": example["Response"]},
        ]
        text = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=False,
        )
        return {"text": text}

    dataset = dataset.map(format_conversation, num_proc=1)
    split = dataset.train_test_split(test_size=0.1, seed=3407)
    train_dataset = split["train"]
    val_dataset = split["test"]
    print(f"Train: {len(train_dataset)} | Val: {len(val_dataset)}")

    class VRAMCallback(TrainerCallback):
        def on_step_end(self, args, state, control, **kwargs):
            if state.global_step == 1 or state.global_step % 50 == 0:
                vram_usage(f"step {state.global_step}")
        def on_epoch_end(self, args, state, control, **kwargs):
            vram_usage(f"epoch {state.epoch:.0f} end")

    # Train for 2 total epochs, resume from checkpoint-198 (end of epoch 1)
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
            num_train_epochs=3,
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
            dataloader_num_workers=0,
            dataloader_pin_memory=True,
        ),
        callbacks=[VRAMCallback()],
    )

    print("Resuming training from epoch 1 checkpoint...")
    vram_usage("before training")
    trainer.train(resume_from_checkpoint=CHECKPOINT_DIR)
    vram_usage("after training")
    print("Epoch 2 complete!")


if __name__ == "__main__":
    main()
