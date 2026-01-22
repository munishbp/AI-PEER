/**
 * LLM Module - On-device language model for AI-PEER
 *
 * This module provides on-device LLM inference using Qwen3-0.6B.
 * All processing happens locally - no patient data leaves the phone.
 *
 * Usage:
 *   1. Wrap your app with <LLMProvider>
 *   2. Use the useLLM() hook in components
 *
 * Example:
 *   import { useLLM } from '@/src/llm';
 *
 *   function ChatScreen() {
 *     const { isReady, messages, send, needsDownload } = useLLM();
 *     // ...
 *   }
 */

// Types
export type { ChatMessage, Conversation, LLMState, InferenceConfig } from './types';

// Provider (wrap app root)
export { LLMProvider, useLLMContext } from './LLMContext';

// Main hook (use in components)
export { useLLM } from './useLLM';

// Config (for display/debugging)
export {
  MODEL_URL,
  MODEL_FILENAME,
  MODEL_SIZE_BYTES,
  INFERENCE_CONFIG,
  CONVERSATION_TTL_MS,
} from './config';

// Utilities (rarely needed directly)
export {
  isModelDownloaded,
  downloadModel,
  deleteModel,
  getModelPath,
  getModelSizeMB,
} from './modelDownloader';
