/**
 * config.ts - LLM configuration constants
 *
 * Centralizing config makes it easy to:
 * - Swap models (0.6B vs 1.7B)
 * - Tune inference parameters
 * - Change URLs without hunting through code
 */

import { InferenceConfig } from './types';

/**
 * Model download URL
 * Using Qwen3 0.6B Q4_K_M quantization (~378MB)
 * Q4_K_M = 4-bit quantization, good balance of size vs quality
 *
 * HuggingFace page: https://huggingface.co/unsloth/Qwen3-0.6B-GGUF?show_file_info=Qwen3-0.6B-Q4_K_M.gguf
 *
 * TODO: For production, upload model to your GCS bucket for faster/reliable downloads
 */
export const MODEL_URL =
  'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf';

/** Filename for the downloaded model (stored in app's document directory) */
export const MODEL_FILENAME = 'Qwen3-0.6B-Q4_K_M.gguf';

/** Expected model size in bytes (for download progress) - 378MB */
export const MODEL_SIZE_BYTES = 378 * 1024 * 1024;

/**
 * Inference configuration
 *
 * - maxTokens: Maximum response length (512 = ~400 words)
 * - temperature: Randomness (0.7 = balanced creativity/coherence)
 * - topP: Nucleus sampling (0.9 = consider top 90% probability tokens)
 * - contextSize: How much conversation history to remember (8192 tokens ≈ 6000 words)
 */
export const INFERENCE_CONFIG: InferenceConfig = {
  maxTokens: 512,
  temperature: 0.7,
  topP: 0.9,
  contextSize: 8192,
};

/** How long before conversations auto-archive (24 hours in milliseconds) */
export const CONVERSATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Storage keys for AsyncStorage/FileSystem */
export const STORAGE_KEYS = {
  conversations: 'aipeer_conversations',
  currentConversationId: 'aipeer_current_conversation',
};
