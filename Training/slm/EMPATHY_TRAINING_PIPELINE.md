# Empathy Training Pipeline for Qwen3-0.6B

## Overview

This document outlines a complete pipeline for fine-tuning the Qwen3-0.6B language model to generate more empathetic responses for the AI-PEER fall risk assessment application. The training uses a two-stage approach: Supervised Fine-Tuning (SFT) followed by Direct Preference Optimization (DPO).

### Why This Approach?

The goal is to make the on-device LLM sound more like a compassionate healthcare assistant rather than a generic chatbot. We achieve this through:

1. **SFT** - Teaches the model the general style and domain knowledge of empathetic counseling responses
2. **DPO** - Refines the model to prefer empathetic phrasings over cold or generic ones

This two-stage approach consistently outperforms single-stage methods because SFT provides a strong foundation that DPO can then polish.

---

## Training Data

### Source Dataset

**Dataset:** [Amod/mental_health_counseling_conversations](https://huggingface.co/datasets/Amod/mental_health_counseling_conversations)

| Attribute | Value |
|-----------|-------|
| Size | ~3,500 Q&A pairs |
| Format | Context (user question) → Response (counselor answer) |
| Language | English |
| License | RAIL-D (requires donation for commercial use) |

### Why This Dataset?

Several factors make this dataset suitable for our use case:

1. **Domain Alignment** - Mental health counseling shares core communication patterns with healthcare: validation of feelings, non-judgmental tone, supportive guidance, and appropriate boundary-setting

2. **Response Quality** - The responses come from licensed professionals, providing high-quality examples of empathetic communication patterns

3. **Size** - At ~3,500 pairs, the dataset is large enough to teach generalizable patterns but small enough to train efficiently on consumer hardware

4. **Structure** - Clean Q&A format maps directly to instruction-tuning without extensive preprocessing

### Potential Limitations

- The dataset focuses on mental health rather than fall risk specifically, so domain-specific medical knowledge may need supplementation
- Some responses are lengthy; consider filtering to match your target response length
- Quality varies across responses; the DPO stage helps filter out less empathetic patterns

---

## Phase 1: Data Preprocessing

### Data Splitting Strategy

**Recommended Split: 90% Train / 10% Validation**

| Split | Size | Purpose |
|-------|------|---------|
| Train | ~3,150 pairs | Model learning |
| Validation | ~350 pairs | Overfitting detection, hyperparameter tuning |

### Rationale for 90/10 Split

With only ~3,500 samples, we need to maximize training data while retaining enough validation samples for meaningful evaluation:

- **Why not 80/20?** Losing 700 samples (20%) from an already small dataset meaningfully impacts what the model can learn. The diversity of counseling scenarios is important.

- **Why not 95/5?** With only ~175 validation samples, you risk high variance in validation metrics. A single unusual batch could swing your loss significantly.

- **Why not a test set?** For this application, manual qualitative evaluation on real fall-risk prompts matters more than held-out test metrics. Save your data for training.

### Chat Template Formatting

The raw dataset has `Context` and `Response` fields. These must be converted to Qwen's chat format:

```
<|im_start|>system
You are a compassionate healthcare assistant...
<|im_end|>
<|im_start|>user
[Context from dataset]
<|im_end|>
<|im_start|>assistant
[Response from dataset]
<|im_end|>
```

### System Prompt Design

The system prompt anchors the model's persona. For AI-PEER, consider:

```
You are a compassionate healthcare assistant helping patients with fall risk 
concerns. Respond with empathy, validate their feelings, and provide supportive 
guidance. Keep responses concise and actionable when appropriate.
```

**Key elements:**
- **Role definition** ("healthcare assistant") - Sets domain expectations
- **Behavioral instructions** ("empathy," "validate") - Guides tone
- **Constraints** ("concise," "actionable") - Matches mobile UX needs

---

## Phase 2: Supervised Fine-Tuning (SFT)

### Purpose

SFT adapts the base Qwen3-0.6B model from general text completion to empathetic conversational responses. This stage teaches:

- Domain vocabulary (healthcare, emotional support)
- Response structure (acknowledgment → support → guidance)
- Appropriate length and tone

### Why LoRA Instead of Full Fine-Tuning?

**LoRA (Low-Rank Adaptation)** trains small adapter matrices instead of all model weights:

| Approach | Trainable Params | VRAM Usage | Training Speed |
|----------|------------------|------------|----------------|
| Full Fine-Tuning | 600M (100%) | ~12GB | Slower |
| LoRA (r=16) | ~4M (~0.7%) | ~6GB | 2-3x faster |

For a 0.6B model, full fine-tuning is feasible on your hardware, but LoRA provides:

1. **Faster iteration** - Try more experiments in less time
2. **Reduced overfitting risk** - Fewer parameters = stronger regularization
3. **Easy model management** - Swap adapters without duplicating base weights
4. **Simpler deployment** - Merge adapters into base model when satisfied

### LoRA Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `r` (rank) | 16 | Sweet spot for small models. r=8 may underfit; r=32 adds parameters without proportional gains |
| `lora_alpha` | 16 | Setting alpha=r gives effective learning rate scaling of 1.0. Common practice. |
| `lora_dropout` | 0 | Dropout during LoRA training often hurts more than helps for small datasets |
| `target_modules` | q, k, v, o, gate, up, down | All attention + MLP projections. Comprehensive coverage for behavioral changes |

### Why Target All These Modules?

Different module types capture different aspects of model behavior:

- **Attention (q, k, v, o)** - How the model attends to emotional cues in input
- **MLP (gate, up, down)** - How the model transforms representations into empathetic phrasings

For style/tone changes (like empathy), you want both. For pure factual knowledge injection, attention-only might suffice.

### Training Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Epochs | 3 | Small dataset + LoRA typically needs 2-4 epochs. Monitor validation loss for early stopping. |
| Batch Size | 4 | Fits comfortably in VRAM with 4-bit quantization |
| Gradient Accumulation | 4 | Effective batch size of 16. Larger batches stabilize training on small datasets. |
| Learning Rate | 2e-4 | Standard for LoRA. Higher than full fine-tuning (which uses ~1e-5) because fewer parameters. |
| Warmup Ratio | 0.03 | ~3% of steps for LR warmup prevents early instability |
| Optimizer | AdamW 8-bit | Memory efficient, negligible quality difference from full precision |
| Precision | FP16 | Halves memory vs FP32; RTX 5090 has excellent FP16 throughput |

### Why 3 Epochs?

Epoch count balances learning vs. overfitting:

- **1 epoch** - Model sees each example once. May underfit, especially with LoRA's implicit regularization.
- **3 epochs** - Model sees patterns multiple times, reinforcing learning. Sweet spot for small datasets.
- **5+ epochs** - Risk of memorization. Validation loss typically increases.

**Monitor validation loss**: If it starts increasing while training loss decreases, you're overfitting. Stop early.

### Expected Outcomes

After SFT, the model should:
- Respond in the style of the training data
- Use empathetic language patterns (validation, acknowledgment)
- Stay on-topic for healthcare/emotional support queries

It may still occasionally produce:
- Generic or robotic phrasings
- Inconsistent empathy levels
- Responses that are correct but not warm

These issues are what DPO addresses.

---

## Phase 3: Generating Preference Pairs for DPO

### The Core Idea

DPO requires pairs of responses: one "chosen" (good) and one "rejected" (bad). The model learns to increase probability of chosen responses relative to rejected ones.

### Data Sources for Pairs

| Component | Source | Rationale |
|-----------|--------|-----------|
| Prompt | Original dataset questions | Ensures relevance to target domain |
| Chosen Response | Original dataset answers | Human-written, high quality |
| Rejected Response | Generated by SFT model | Realistic but lower quality |

### Why Generate Rejected Responses from the SFT Model?

Several options exist for obtaining rejected responses:

1. **Random text** - Too easy; model learns nothing useful
2. **Base model (pre-SFT) outputs** - Decent, but may be too obviously bad
3. **SFT model with high temperature** - Best balance of realistic but flawed
4. **Human-written bad examples** - Gold standard but expensive/slow

Using the SFT model with high temperature produces responses that are plausible and on-topic but subtly worse—missing emotional validation, being slightly cold, or giving generic advice. This is exactly what we want the model to distinguish.

### Generation Strategy for Rejected Responses

**Temperature Sampling at T=1.5**

Normal generation uses T=0.7-1.0. Higher temperature (1.5) increases randomness:
- More likely to miss empathetic phrasings
- May include awkward word choices
- Can produce slightly off-tone responses

This creates a natural distribution of "almost good but not quite" responses.

**Additional Degradation Techniques (Optional)**

For more diverse rejected samples:
- Truncate responses at 70% length (feels abrupt, less supportive)
- Remove the first sentence (often contains validation/acknowledgment)
- Increase repetition penalty below 1.0 (allows repetitive, lazy responses)

### Quality Filtering with a Judge Model

Not all generated pairs are useful. Some rejected responses may accidentally be good, or both may be similar quality.

**Judge Model Selection**

| Model | Pros | Cons |
|-------|------|------|
| Qwen3-4B | Fits in VRAM alongside 0.6B, good quality | May miss subtle empathy differences |
| Qwen3-8B | Better judgment quality | Tight VRAM fit, slower |
| GPT-4/Claude API | Best quality | Cost, latency, data privacy concerns |

**Recommendation:** Qwen3-4B locally. It's large enough to meaningfully evaluate empathy while fitting your hardware constraints.

### Scoring Criteria

The judge evaluates responses on a 1-10 scale for empathy and helpfulness. Key aspects:

- **Acknowledgment** - Does the response recognize the user's feelings?
- **Validation** - Does it affirm that their concerns are understandable?
- **Warmth** - Is the tone caring rather than clinical?
- **Actionability** - Does it offer constructive next steps?
- **Appropriateness** - Is it safe and non-harmful?

### Filtering Threshold

**Keep pairs where: `chosen_score - rejected_score >= 2`**

| Gap | Interpretation | Action |
|-----|---------------|--------|
| 0-1 | Responses too similar | Discard (no learning signal) |
| 2-3 | Clear but moderate difference | Keep (good training signal) |
| 4+ | Obvious difference | Keep (strong training signal) |

**Why 2 as the threshold?**

- **Gap of 1** - Could be noise in judge scoring; model may learn inconsistent preferences
- **Gap of 2** - Reliably indicates meaningful quality difference
- **Gap of 3+** - Even better, but you'll have fewer pairs

Expect to retain 60-80% of pairs after filtering. If retention is lower, your SFT model may already be quite good (consider whether DPO is necessary).

### Expected Output

From ~3,150 training examples, expect ~2,000-2,500 usable preference pairs after quality filtering.

---

## Phase 4: Direct Preference Optimization (DPO)

### How DPO Works

Unlike RLHF (which requires a separate reward model and complex PPO training), DPO directly optimizes the policy using preference pairs:

1. Given prompt P, chosen response C, rejected response R
2. Increase log-probability of C relative to a reference model
3. Decrease log-probability of R relative to reference
4. Balance with KL-divergence penalty to prevent distribution collapse

The key insight: The optimal reward model under the Bradley-Terry preference model can be expressed analytically in terms of policy probabilities, eliminating the need for explicit reward modeling.

### Why DPO Over RLHF?

| Aspect | RLHF | DPO |
|--------|------|-----|
| Components needed | Policy + Reward Model + Value Model | Policy only |
| Training stability | Notoriously finicky | Much more stable |
| Compute requirements | 3-4x model memory | 1-2x model memory |
| Hyperparameter sensitivity | High (PPO has many knobs) | Low (mainly just β) |
| Results quality | Slightly better ceiling | 95%+ of RLHF quality |

For a 0.6B model on consumer hardware, DPO is the clear choice.

### DPO Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Epochs | 1 | DPO is very sample-efficient. More epochs risk overfitting to preference patterns. |
| Learning Rate | 5e-5 | Lower than SFT because we're making targeted adjustments, not broad learning |
| β (beta) | 0.1 | Controls deviation from reference policy. Lower = more aggressive preference learning. |
| Batch Size | 2 | DPO needs more memory (stores chosen + rejected). Compensate with gradient accumulation. |
| Gradient Accumulation | 8 | Effective batch of 16, matching SFT |

### Understanding the β Parameter

β controls the KL-divergence penalty between the trained policy and reference policy:

| β Value | Behavior |
|---------|----------|
| 0.01-0.05 | Aggressive optimization. Large shifts from reference. Risk of quality degradation. |
| 0.1-0.2 | Balanced. Standard starting point. |
| 0.3-0.5 | Conservative. Small shifts. Safer but less impactful. |

**Start with β=0.1.** If the model becomes too different from SFT (loses coherence), increase β. If preference learning seems weak, decrease β.

### Reference Model Handling

DPO computes probabilities under both the current policy and a reference policy (typically the SFT model).

**Options:**
1. **Explicit reference model** - Load SFT model separately. Uses 2x memory.
2. **Implicit reference** - Use gradient stopping. More memory efficient.

Most modern implementations (TRL, Unsloth) support implicit reference, which is preferred for consumer hardware.

### Why Only 1 Epoch for DPO?

DPO is remarkably sample-efficient because:

1. Each example provides a direct gradient signal (unlike SFT's indirect "match this text" signal)
2. The contrastive nature (chosen vs. rejected) is inherently more informative
3. Preference patterns are simpler than full text generation

Multiple epochs often lead to:
- Overconfidence on preference pairs
- Mode collapse toward certain phrasings
- Degraded diversity

If validation metrics suggest underfitting, try 2 epochs maximum.

---

## Phase 5: Model Export for llama.rn

### GGUF Conversion

llama.rn (and llama.cpp) require models in GGUF format. Conversion steps:

1. **Merge LoRA adapters** - Combine adapter weights back into base model
2. **Convert to GGUF** - Transform from HuggingFace format to GGUF
3. **Quantize** - Reduce precision for mobile deployment

### Quantization Options

| Format | Bits | Size (0.6B) | Quality | Speed |
|--------|------|-------------|---------|-------|
| F16 | 16 | ~1.2 GB | Best | Baseline |
| Q8_0 | 8 | ~600 MB | Near-F16 | ~1.5x faster |
| Q6_K | 6 | ~450 MB | Excellent | ~1.7x faster |
| Q5_K_M | 5 | ~400 MB | Very good | ~2x faster |
| Q4_K_M | 4 | ~350 MB | Good | ~2.5x faster |
| Q4_0 | 4 | ~300 MB | Acceptable | ~2.5x faster |
| Q2_K | 2 | ~200 MB | Degraded | ~3x faster |

### Recommended: Q4_K_M

For mobile deployment, Q4_K_M offers the best balance:

- **Size** - ~350 MB fits comfortably on mobile devices
- **Quality** - K-quant methods preserve important weights at higher precision
- **Speed** - 4-bit inference is well-optimized on mobile GPUs
- **Perplexity** - Typically <1% increase from F16 for well-trained models

**When to use alternatives:**
- **Q5_K_M** - If you have storage headroom and want slightly better quality
- **Q8_0** - For development/testing on desktop before mobile deployment
- **Q2_K** - Only if desperate for size; expect noticeable quality drop

### Verification After Quantization

Always test the quantized model before deployment:

1. Run the same prompts through F16 and quantized versions
2. Compare response quality subjectively
3. Measure perplexity on a held-out set if possible
4. Test edge cases (emotional prompts, safety-critical queries)

---

## Evaluation Strategy

### Automated Metrics

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Validation Loss (SFT) | How well model predicts training responses | Decreasing, then plateau |
| Validation Loss (DPO) | Preference prediction accuracy | Lower than SFT baseline |
| Perplexity | Response fluency | Lower is better; watch for quantization impact |
| Judge Empathy Score | Empathy quality on held-out prompts | Higher than pre-training baseline |

### Manual Evaluation (Critical)

Automated metrics don't capture everything. Create a test suite of 20-30 prompts covering:

1. **Fall risk scenarios** - "I'm worried about falling when I get up at night"
2. **Emotional distress** - "I feel like a burden to my family"
3. **Resistance/denial** - "I don't need any help, I'm fine"
4. **Safety-critical** - "I fell yesterday and hit my head"
5. **Boundary testing** - Requests outside the assistant's scope

For each prompt, evaluate:
- Is the response empathetic?
- Is it medically appropriate?
- Does it maintain appropriate boundaries?
- Is the length suitable for mobile UX?

### A/B Comparison

Compare responses from:
- Base Qwen3-0.6B
- SFT model (after Phase 2)
- DPO model (after Phase 4)

This progression should show clear improvement in empathetic qualities.

---

## Hardware Considerations

### Your Setup: RTX 5090 + 48GB RAM

This is excellent hardware for this project. Expected resource usage:

| Phase | GPU VRAM | System RAM | Time Estimate |
|-------|----------|------------|---------------|
| SFT Training | ~8-10 GB | ~16 GB | 30-60 min |
| Preference Generation | ~20 GB (two models) | ~24 GB | 2-4 hours |
| DPO Training | ~8-10 GB | ~16 GB | 20-40 min |
| GGUF Conversion | ~4 GB | ~8 GB | 5-10 min |

### Optimizations Available

Given your hardware headroom, you could:

1. **Use Qwen3-8B as judge** instead of 4B for better preference pair quality
2. **Skip 4-bit quantization during training** for slightly higher quality gradients
3. **Increase batch sizes** for faster training
4. **Run multiple experiments** in parallel to tune hyperparameters

### WSL2-Specific Notes

- Ensure CUDA is properly configured for WSL2
- Consider using Docker with NVIDIA runtime for reproducibility
- Watch for memory pressure; WSL2's memory management can be aggressive
- Set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` if you encounter fragmentation

---

## Common Pitfalls and Solutions

### Pitfall 1: Overfitting During SFT

**Symptoms:** Validation loss increases while training loss decreases; model repeats training phrases verbatim.

**Solutions:**
- Reduce epochs (try 2 instead of 3)
- Increase LoRA dropout to 0.05
- Decrease learning rate
- Add more diverse training data

### Pitfall 2: Preference Pairs Too Similar

**Symptoms:** Most pairs filtered out (high rejection rate); DPO loss barely decreases.

**Solutions:**
- Increase generation temperature (try 1.8-2.0)
- Use additional degradation techniques (truncation, repetition)
- Lower the score gap threshold to 1 (less ideal but may be necessary)

### Pitfall 3: Model Becomes Too Verbose

**Symptoms:** Responses much longer than desired; repeats empathetic phrases excessively.

**Solutions:**
- Add length constraints to system prompt
- Filter training data to exclude very long responses
- During inference, set appropriate `max_tokens`

### Pitfall 4: Loss of General Capabilities

**Symptoms:** Model handles empathy well but fails on basic questions; confused responses to straightforward queries.

**Solutions:**
- Mix in some general instruction data during SFT
- Increase β in DPO to stay closer to reference
- Use fewer training epochs

### Pitfall 5: Quantization Degrades Quality Significantly

**Symptoms:** Quantized model gives noticeably worse responses than F16 version.

**Solutions:**
- Try Q5_K_M instead of Q4_K_M
- Ensure model was properly merged before conversion
- Verify conversion used correct model architecture settings

---

## Project Checklist

### Before Starting
- [ ] Download and inspect the dataset
- [ ] Verify CUDA/GPU setup in WSL2
- [ ] Install required packages (transformers, trl, unsloth, datasets)
- [ ] Clone llama.cpp for GGUF conversion

### Phase 1: Preprocessing
- [ ] Convert dataset to chat format
- [ ] Create train/validation split
- [ ] Verify formatting looks correct

### Phase 2: SFT
- [ ] Run SFT training
- [ ] Monitor validation loss
- [ ] Save merged model
- [ ] Qualitative spot-check on sample prompts

### Phase 3: Preference Generation
- [ ] Load SFT model and judge model
- [ ] Generate rejected responses
- [ ] Score all pairs with judge
- [ ] Filter to quality pairs
- [ ] Verify reasonable retention rate (60-80%)

### Phase 4: DPO
- [ ] Run DPO training
- [ ] Monitor loss curves
- [ ] Save final merged model
- [ ] Compare SFT vs DPO on test prompts

### Phase 5: Export
- [ ] Convert to GGUF (F16)
- [ ] Quantize to Q4_K_M
- [ ] Verify quantized model quality
- [ ] Test in llama.rn environment

### Final Validation
- [ ] Full evaluation on test prompt suite
- [ ] Safety testing
- [ ] Integration testing in AI-PEER app
- [ ] Performance benchmarking on target device

---

## References and Resources

### Papers
- **LoRA**: [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) (Hu et al., 2021)
- **DPO**: [Direct Preference Optimization](https://arxiv.org/abs/2305.18290) (Rafailov et al., 2023)
- **QLoRA**: [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) (Dettmers et al., 2023)

### Tools
- [Unsloth](https://github.com/unslothai/unsloth) - Fast LoRA training
- [TRL](https://github.com/huggingface/trl) - Transformers Reinforcement Learning
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - GGUF conversion and quantization
- [llama.rn](https://github.com/mybigday/llama.rn) - React Native bindings

### Dataset
- [Amod/mental_health_counseling_conversations](https://huggingface.co/datasets/Amod/mental_health_counseling_conversations)

---

## Appendix: Quick Reference Card

```
=== SFT Training ===
Model:          Qwen3-0.6B
Method:         LoRA (r=16, alpha=16)
Data:           90% train / 10% val
Epochs:         3
LR:             2e-4
Batch:          4 (x4 accumulation = 16 effective)
Precision:      FP16 + 4-bit base

=== DPO Training ===
Base:           SFT checkpoint
Method:         LoRA (same config)
Data:           Filtered preference pairs
Epochs:         1
LR:             5e-5
Beta:           0.1
Batch:          2 (x8 accumulation = 16 effective)

=== Export ===
Format:         GGUF
Quantization:   Q4_K_M
Target:         llama.rn (React Native)
```

---

*Last Updated: January 2025*
*For AI-PEER Fall Risk Assessment Project - UCF Senior Design 2025-2026*
