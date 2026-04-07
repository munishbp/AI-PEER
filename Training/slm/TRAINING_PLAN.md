# AI-PEER LLM Training Plan

## Goal

Replace the current rambling, repetitive Qwen3.5-0.8B finetune with a cleaner Qwen3.5-2B-Instruct finetune using a domain-appropriate dataset.

## Why This Change

The previous finetune used `Amod/mental_health_counseling_conversations` (long-form forum therapy posts) which baked in bad habits:
- Repetitive "I'm glad you reached out" phrases
- Self-contradicting advice
- Wall-of-text responses with no structure
- Random non-sequiturs

A 0.8B model overfits these surface patterns instantly. The 2B has enough capacity to follow nuanced instructions.

## What's New

1. **Bigger model**: `Qwen/Qwen3.5-2B-Instruct` (was 0.8B)
   - Q4_K_M output is ~1.2GB, acceptable for iPhone 11+ and modern Android
   - Much better instruction following than the 0.8B

2. **Better dataset**: `YsK-dev/geriatric-health-advice`
   - Apache 2.0 license
   - 10,813 rows of geriatric-focused health coaching
   - Average response: ~80 words / 3 sentences (vs. multi-paragraph forum essays)
   - Covers: fall prevention, mobility, exercise, sleep, anxiety, medication adherence, escalation
   - Already proven to train cleanly on Qwen 2.5 1.5B (`YsK-dev/zima-qwen-geriatric-1.5b`)

3. **Quality filters in `filter_dataset()`**:
   - Drop responses > 80 words
   - Blocklist filler phrases ("I'm glad you reached out", "It takes courage", etc.)
   - Drop responses with 4-gram repetition

4. **Updated system prompt**:
   - Hard 3-sentence limit
   - Explicit anti-patterns
   - Concrete example responses
   - Matches the prompt in `front-end/AI-PEER/src/llm/systemPrompt.ts`

## Hardware Requirements

- CUDA GPU with **≥12GB VRAM** (RTX 3060 12GB, 4070, 4080, 4090, 5090)
- ~30GB free disk for model + checkpoints + GGUF export
- Windows or Linux

## Steps to Run on Windows GPU PC

```powershell
# 1. Clone the repo and switch to the right branch
git clone https://github.com/munishbp/AI-PEER.git
cd AI-PEER
git checkout fixes
cd Training/slm

# 2. Create a fresh Python environment (Python 3.10 or 3.11)
python -m venv venv
.\venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the training (~30-60 min on RTX 5090)
python finetune.py

# 5. Upload to GCS
python upload_to_gcs.py --bucket qwenfinetune --dest-filename Qwen3.5-2B-aipeer-Q4_K_M.gguf
```

## Expected Outputs

- `./output/sft_geriatric/` — LoRA adapter checkpoints
- `./output/gguf_geriatric/Qwen3.5-2B-aipeer-Q4_K_M.gguf` — quantized model (~1.2GB)

## After Training: Update the App

The new model has a different filename and size. Update:

1. `front-end/AI-PEER/src/llm/config.ts`:
   ```typescript
   export const MODEL_FILENAME = 'Qwen3.5-2B-aipeer-Q4_K_M.gguf';
   export const MODEL_SIZE_BYTES = 1.2 * 1024 * 1024 * 1024; // ~1.2GB
   ```

2. `API/controllers/modelController.js`:
   ```javascript
   const Model_ID = 'models/Qwen3.5-2B-aipeer-Q4_K_M.gguf';
   ```

3. Add the OLD filename to `OLD_MODEL_FILENAMES` in `config.ts` so the app cleans it up.

4. Redeploy the API:
   ```bash
   cd API
   gcloud run deploy aipeer-api --source . --region us-central1 ...
   ```

## Tuning Knobs (in `finetune.py`)

If the model is still too verbose after training:
- Lower `MAX_RESPONSE_WORDS` from 80 → 60
- Add more phrases to `BLOCKED_PHRASES`
- Reduce `NUM_EPOCHS` (overfitting can amplify dataset patterns)
- Reduce `LEARNING_RATE` to 1e-4 for gentler adaptation

If the model still rambles:
- Try the 0.8B base model with no finetuning at all (just system prompt)
- Or move to a different base model entirely

## Notes

- **No DPO stage** — the previous pipeline used SFT + DPO, but the SFT stage was the source of the bad behavior, not lack of preference tuning. Starting clean with just SFT.
- **No thinking mode** — Qwen3.5 supports `<think>` tags for chain-of-thought, but we want direct responses for this app.
- **Filter aggressively** — better to train on 5,000 high-quality examples than 10,000 with bad ones.
