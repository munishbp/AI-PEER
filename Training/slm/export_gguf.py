"""
Export the finetuned checkpoint to GGUF Q4_K_M.

Stage 1: Merge LoRA adapters into base model and save as HF format
Stage 2: Convert to GGUF using llama.cpp's Python converter
Stage 3: Quantize to Q4_K_M
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
import torch
import subprocess
import sys
import glob


CHECKPOINT_DIR = "./output/sft/checkpoint-594"
MERGED_DIR = "./output/merged"
GGUF_DIR = "./output/gguf"
MAX_SEQ_LENGTH = 2048
MODEL_NAME = "Qwen3.5-0.8B-aipeer"


def vram_usage(label=""):
    allocated = torch.cuda.memory_allocated() / 1024**3
    total = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"[VRAM {label}] Allocated: {allocated:.2f} GB | Total: {total:.2f} GB")


def stage1_merge():
    """Merge LoRA into base model and save as 16-bit HF format."""
    from unsloth import FastLanguageModel

    print("=== STAGE 1: Merge LoRA adapters ===")
    print(f"Loading checkpoint from {CHECKPOINT_DIR}...")
    vram_usage("before load")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=CHECKPOINT_DIR,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
    )
    vram_usage("after load")

    print(f"Saving merged model to {MERGED_DIR}...")
    model.save_pretrained_merged(
        MERGED_DIR,
        tokenizer,
        save_method="merged_16bit",
    )
    print(f"Merged model saved to {MERGED_DIR}")
    vram_usage("after merge")


def stage2_convert():
    """Convert merged HF model to GGUF using llama.cpp's Python converter."""
    print("\n=== STAGE 2: Convert to GGUF ===")

    # Clone llama.cpp if not present (just need the convert script)
    llama_cpp_dir = os.path.join(os.path.expanduser("~"), ".unsloth", "llama.cpp")
    convert_script = os.path.join(llama_cpp_dir, "convert_hf_to_gguf.py")

    if not os.path.exists(convert_script):
        print("Cloning llama.cpp for conversion script...")
        os.makedirs(os.path.dirname(llama_cpp_dir), exist_ok=True)
        subprocess.run([
            "git", "clone", "--depth=1",
            "https://github.com/ggerganov/llama.cpp.git",
            llama_cpp_dir,
        ], check=True)

    # Install gguf Python package if needed
    subprocess.run([sys.executable, "-m", "pip", "install", "gguf", "--quiet"], check=True)

    os.makedirs(GGUF_DIR, exist_ok=True)
    f16_gguf = os.path.join(GGUF_DIR, f"{MODEL_NAME}-F16.gguf")

    print(f"Converting to F16 GGUF -> {f16_gguf}")
    subprocess.run([
        sys.executable, convert_script,
        MERGED_DIR,
        "--outfile", f16_gguf,
        "--outtype", "f16",
    ], check=True)

    print(f"F16 GGUF created: {f16_gguf}")
    return f16_gguf


def stage3_quantize(f16_gguf):
    """Quantize F16 GGUF to Q4_K_M using llama-quantize."""
    print("\n=== STAGE 3: Quantize to Q4_K_M ===")

    q4_gguf = os.path.join(GGUF_DIR, f"{MODEL_NAME}-Q4_K_M.gguf")

    # Try to find llama-quantize binary
    llama_cpp_dir = os.path.join(os.path.expanduser("~"), ".unsloth", "llama.cpp")
    quantize_bin = None

    # Check common build locations
    for candidate in [
        os.path.join(llama_cpp_dir, "build", "bin", "llama-quantize.exe"),
        os.path.join(llama_cpp_dir, "build", "bin", "llama-quantize"),
        os.path.join(llama_cpp_dir, "build", "Release", "llama-quantize.exe"),
        os.path.join(llama_cpp_dir, "llama-quantize.exe"),
    ]:
        if os.path.exists(candidate):
            quantize_bin = candidate
            break

    if not quantize_bin:
        # Build llama-quantize
        print("Building llama-quantize...")
        build_dir = os.path.join(llama_cpp_dir, "build")
        os.makedirs(build_dir, exist_ok=True)
        subprocess.run(["cmake", "..", "-DGGML_CUDA=OFF"], cwd=build_dir, check=True)
        subprocess.run(["cmake", "--build", ".", "--config", "Release", "--target", "llama-quantize", "-j"], cwd=build_dir, check=True)

        # Find the built binary
        for candidate in [
            os.path.join(build_dir, "bin", "llama-quantize.exe"),
            os.path.join(build_dir, "Release", "llama-quantize.exe"),
            os.path.join(build_dir, "bin", "Release", "llama-quantize.exe"),
        ]:
            if os.path.exists(candidate):
                quantize_bin = candidate
                break

    if not quantize_bin:
        print("ERROR: Could not find llama-quantize binary after build.")
        print(f"F16 model is at: {f16_gguf}")
        print("You can quantize manually: llama-quantize <f16.gguf> <output.gguf> Q4_K_M")
        return f16_gguf

    print(f"Quantizing with {quantize_bin}")
    subprocess.run([quantize_bin, f16_gguf, q4_gguf, "Q4_K_M"], check=True)

    # Show result
    size_mb = os.path.getsize(q4_gguf) / (1024 * 1024)
    print(f"\nQ4_K_M GGUF: {q4_gguf} -- {size_mb:.1f} MB")

    # Clean up F16 (it's large)
    f16_size = os.path.getsize(f16_gguf) / (1024 * 1024)
    print(f"F16 GGUF ({f16_size:.0f} MB) kept at: {f16_gguf}")

    return q4_gguf


def main():
    stage1_merge()
    f16_gguf = stage2_convert()
    final = stage3_quantize(f16_gguf)
    print(f"\nDone! Final model: {final}")
    print("Next step: python upload_to_gcs.py")


if __name__ == "__main__":
    main()
