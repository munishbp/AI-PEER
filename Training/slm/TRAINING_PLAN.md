# AI-PEER SLM Training Plan

Fine-tune `Qwen/Qwen3.5-2B` on `YsK-dev/geriatric-health-advice` using 4-bit QLoRA (unsloth), export a Q4_K_M GGUF (~1.2GB), and ship it to iPhone via llama.rn.

## Dataset

**Name:** [`YsK-dev/geriatric-health-advice`](https://huggingface.co/datasets/YsK-dev/geriatric-health-advice)
**License:** Apache 2.0
**Size:** 10,813 rows
**Structure:** Instruction-style Q&A with short responses (averaging ~80 words / 3 sentences)
**Topics:** Fall prevention, mobility, exercise, sleep, anxiety, medication adherence, and when to escalate to a healthcare provider

Why this dataset: it's purpose-built for elderly health coaching, the responses are the right shape for on-device chat (no multi-paragraph forum essays), and someone has already finetuned Qwen 2.5 1.5B on it successfully ([`YsK-dev/zima-qwen-geriatric-1.5b`](https://huggingface.co/YsK-dev/zima-qwen-geriatric-1.5b)) so we know the data trains cleanly on this model class.

The filter in `filter_dataset()` drops any row whose response exceeds 80 words, contains blocked filler phrases ("I'm glad you reached out", "It takes courage", etc.), or has obvious 4-gram repetition.

## Base Model

**Name:** [`Qwen/Qwen3.5-2B`](https://huggingface.co/Qwen/Qwen3.5-2B) — note the Qwen 3.5 lineage dropped the `-Instruct` suffix. The 2B repo is instruction-tuned by default.

**Caveat:** Qwen3.5-2B is technically a vision-language model. We only finetune the text side (the LoRA adapters sit on the text attention layers), and the GGUF export produces two files:
- `Qwen3.5-2B.Q4_K_M.gguf` (~1.2GB) — the language model, **this is what we ship**
- `Qwen3.5-2B.BF16-mmproj.gguf` (~641MB) — the vision projector, **we ignore this** since the app is text-only

llama.rn on iPhone loads the Q4_K_M file for text-only inference and never touches the mmproj.

## Training Recipe

| Hyperparameter | Value |
|---|---|
| Method | 4-bit QLoRA via unsloth |
| LoRA rank | 16 |
| LoRA alpha | 16 |
| Target modules | q/k/v/o + gate/up/down projections |
| Batch size | 4 |
| Gradient accumulation | 4 (effective batch 16) |
| Epochs | 3 |
| Learning rate | 2e-4 |
| Warmup ratio | 0.1 |
| Max sequence length | 1024 |
| Precision | bf16 on Ampere+, fp16 fallback |

No DPO stage. No thinking mode (Qwen3.5 supports `<think>` tags for chain-of-thought but we want direct responses).

## Hardware

- CUDA GPU with **≥12GB VRAM** (RTX 3060 12GB minimum; RTX 5090 32GB was the reference run)
- **Blackwell cards (5090, RTX Pro 6000) need CUDA runtime ≥12.4.** Older pytorch images built against cu12.1 will fail at `bitsandbytes` load time with a `libnvJitLink.so.13` error.
- ~30GB free disk for base model weights + checkpoints + GGUF export artifacts
- Linux (the script is platform-agnostic, but the setup gotchas below assume Linux)

## Setup (Linux, vast.ai-ready)

Everything in this section runs inside a `tmux` session so the training survives SSH disconnects.

### 1. Pick an instance

- Image: `pytorch/pytorch:2.4.0-cuda12.4-cudnn9-devel` or newer. The **`-devel`** suffix matters — unsloth clones and builds `llama.cpp` on the fly during the GGUF export step, which needs `cmake` + `gcc` + full CUDA headers.
- Disk: ≥60GB ephemeral (base model ≈6GB, checkpoints ≈4GB, GGUF outputs ≈2GB, llama.cpp build tree, pip cache)
- On-demand, **not** interruptible — losing the instance mid-train wastes the model download

### 2. Clone and set up the environment

```bash
# Inside a tmux session so disconnects don't kill training
apt-get update && apt-get install -y git tmux
tmux new -s train

git clone https://github.com/munishbp/AI-PEER.git
cd AI-PEER/Training/slm
```

**If the pytorch image ships a preinstalled venv at `/venv/main` with torch+CUDA already working, use it directly rather than building a second venv on top.** Building a fresh venv loses access to the preinstalled PyTorch and can leave you with dangling symlinks:

```bash
source /venv/main/bin/activate
python --version
python -c "import torch; print(torch.__version__, 'cuda=', torch.cuda.is_available())"

pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Install torchvision (if missing)

Some pytorch container images don't ship `torchvision`, and `unsloth_zoo.vision_utils` imports it at module load time. Install it from the matching CUDA wheel index so pip can't silently pull a stable wheel that downgrades your torch:

```bash
pip install torchvision --index-url https://download.pytorch.org/whl/cu130
```

(Replace `cu130` with whatever matches your torch CUDA build — `python -c "import torch; print(torch.version.cuda)"`.)

Sanity-check:

```bash
python -c "import torch, torchvision; print('torch', torch.__version__, '| tv', torchvision.__version__)"
```

### 4. Fix the bitsandbytes `libnvJitLink.so.13` error

On the reference run this error appeared:

```
bitsandbytes library load error: libnvJitLink.so.13: cannot open shared object file: No such file or directory
```

The CUDA 13 runtime libraries ship as a bundled pip package at `/venv/main/lib/python3.12/site-packages/nvidia/cu13/lib/` but aren't on the linker's search path. Two fixes:

**Quick fix (current shell only):**

```bash
export LD_LIBRARY_PATH=/venv/main/lib/python3.12/site-packages/nvidia/cu13/lib
```

Important: **no trailing colon**. A trailing colon creates an empty path element that triggers glibc's `AT_SECURE` behavior on some distros and silently disables `LD_LIBRARY_PATH` entirely.

**Durable fix (survives new tmux panes / reconnects):**

```bash
echo /venv/main/lib/python3.12/site-packages/nvidia/cu13/lib > /etc/ld.so.conf.d/nvidia-cu13.conf
ldconfig
```

Verify:

```bash
python -c "import bitsandbytes; print('bnb ok:', bitsandbytes.__version__)"
```

No error lines before the version print means the native library loaded cleanly.

### 5. Run training

```bash
python finetune.py
```

The script loads the model in 4-bit, applies LoRA adapters, loads and filters the dataset, does a 90/10 train/val split, trains for 3 epochs with per-epoch `eval_loss`, then exports Q4_K_M GGUF via unsloth's `save_pretrained_gguf` (which builds llama.cpp on the fly — this takes 5–10 minutes and looks like it's hanging but isn't).

**Output path:** unsloth appends `_gguf` to whatever `GGUF_DIR` you pass, so despite `GGUF_DIR = "./output/gguf_geriatric"` in the script the files actually land at:

```
./output/gguf_geriatric_gguf/Qwen3.5-2B.Q4_K_M.gguf         # ship this
./output/gguf_geriatric_gguf/Qwen3.5-2B.BF16-mmproj.gguf    # ignore
```

## Reference Run (2026-04-07)

**Hardware:** vast.ai RTX 5090 32GB (Linux, CUDA 13, torch 2.10.0+cu130)

| Metric | Value |
|---|---|
| Total runtime | 2h 11m 36s |
| Total steps | 1827 (609/epoch × 3 epochs) |
| Steps/sec | ~0.23 (~4.5s/step) |
| Peak VRAM | ~2.5 GB allocated (massive headroom on 32GB) |
| Train loss (start) | 2.735 |
| Epoch 1 eval_loss | 0.1755 |
| Epoch 2 eval_loss | 0.1468 |
| Epoch 3 eval_loss | 0.1286 |

Loss trajectory was clean: eval tracked train the entire run with no generalization gap. Zero overfitting signal at any epoch boundary.

## After Training — Ship to Device

Pull the GGUF down to your local machine (not the rented box) so credentials never leave your Mac:

```bash
# From your Mac
mkdir -p ~/Desktop/AI-PEER/Training/slm/output/gguf_geriatric
scp -P <vast_port> root@<vast_host>:/workspace/AI-PEER/Training/slm/output/gguf_geriatric_gguf/Qwen3.5-2B.Q4_K_M.gguf ~/Desktop/AI-PEER/Training/slm/output/gguf_geriatric/Qwen3.5-2B-aipeer-Q4_K_M.gguf
```

Note the rename during scp: the source file is `Qwen3.5-2B.Q4_K_M.gguf` and we ship it as `Qwen3.5-2B-aipeer-Q4_K_M.gguf`.

Upload to GCS using `gsutil` (already auth'd via `gcloud auth application-default login`):

```bash
gsutil cp ~/Desktop/AI-PEER/Training/slm/output/gguf_geriatric/Qwen3.5-2B-aipeer-Q4_K_M.gguf gs://qwenfinetune/models/Qwen3.5-2B-aipeer-Q4_K_M.gguf
```

Then **destroy the vast.ai instance** — billing is by the second.

### Update the app and API

1. `front-end/AI-PEER/src/llm/config.ts`:
   ```typescript
   export const MODEL_FILENAME = 'Qwen3.5-2B-aipeer-Q4_K_M.gguf';
   export const MODEL_SIZE_BYTES = 1215 * 1024 * 1024; // ~1.2GB
   export const OLD_MODEL_FILENAMES = [
     'Qwen3-0.6B-Q4_K_M.gguf',
     'Qwen3.5-0.8B-aipeer-Q4_K_M.gguf',
   ];
   ```

2. `API/controllers/modelController.js`:
   ```javascript
   const Model_ID = 'models/Qwen3.5-2B-aipeer-Q4_K_M.gguf';
   ```

3. Redeploy the API:
   ```bash
   cd API && gcloud run deploy aipeer-api --source . --region us-central1 --no-invoker-iam-check --service-account "munish@research-ai-peer-dev.iam.gserviceaccount.com"
   ```

4. Rebuild the iOS app in Release mode:
   ```bash
   cd front-end/AI-PEER/ios
   xcodebuild -workspace AIPEER.xcworkspace -scheme AIPEER -configuration Release -destination "generic/platform=iOS" -derivedDataPath build -allowProvisioningUpdates build
   xcrun devicectl device install app --device <device-id> build/Build/Products/Release-iphoneos/AIPEER.app
   ```

On first launch, the app detects the new `MODEL_FILENAME`, deletes anything listed in `OLD_MODEL_FILENAMES` from the documents directory, fetches a signed URL from `/model/getModelURL`, and downloads the new 1.2GB GGUF.

## Tuning Knobs (in `finetune.py`)

If the model is still too verbose after training:
- Lower `MAX_RESPONSE_WORDS` from 80 → 60
- Add more phrases to `BLOCKED_PHRASES`
- Reduce `NUM_EPOCHS` (overfitting can amplify dataset patterns)
- Reduce `LEARNING_RATE` to 1e-4 for gentler adaptation

If the model still rambles or produces off-topic content:
- Tighten the inference-time system prompt in `front-end/AI-PEER/src/llm/systemPrompt.ts` rather than retraining — it's cheaper to iterate and doesn't risk regressing the baseline.

## Notes

- **No DPO stage** — the previous pipeline used SFT + DPO, but the SFT stage was the source of the bad behavior on the old model, not lack of preference tuning. Starting clean with just SFT worked.
- **Filter aggressively** — better to train on 5,000 high-quality examples than 10,000 with filler phrases or run-on responses.
- **The inference-time system prompt** (`front-end/AI-PEER/src/llm/systemPrompt.ts`) intentionally drifts from the training-time one in `finetune.py`. The training prompt is a historical record of what this specific checkpoint saw; the inference prompt is where you iterate on tone and PEER-specific rules without retraining.
