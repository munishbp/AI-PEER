/**
 * LLMService.ts - Singleton service for llama.rn
 *
 * Why a Singleton?
 * - Loading a 378MB model into memory is expensive (several seconds)
 * - We want ONE instance that persists across component unmounts
 * - Prevents accidentally loading multiple copies (memory explosion)
 *
 * This class handles:
 * - Model initialization (loading into memory)
 * - Text generation (inference)
 * - Cleanup (releasing memory)
 */

import { initLlama, LlamaContext } from 'llama.rn';
import { INFERENCE_CONFIG } from './config';
import { getModelPath } from './modelDownloader';
import { formatPrompt } from './systemPrompt';
import { ChatMessage } from './types';

class LLMService {
  private static instance: LLMService;
  private context: LlamaContext | null = null;
  private isInitializing = false;

  /** Private constructor enforces singleton pattern */
  private constructor() {}

  /** Get the singleton instance */
  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /** Check if model is loaded and ready */
  isReady(): boolean {
    return this.context !== null;
  }

  /** Check if currently initializing */
  isLoading(): boolean {
    return this.isInitializing;
  }

  /**
   * Initialize the LLM context (load model into memory)
   * This is slow (~5-10 seconds) so call it once at app start
   */
  async initialize(): Promise<void> {
    if (this.context) {
      console.log('LLM already initialized');
      return;
    }

    if (this.isInitializing) {
      console.log('LLM initialization already in progress');
      return;
    }

    this.isInitializing = true;
    const modelPath = getModelPath();

    try {
      console.log('Initializing LLM with model:', modelPath);
      const startTime = Date.now();

      this.context = await initLlama({
        model: modelPath,
        n_ctx: INFERENCE_CONFIG.contextSize,
        n_threads: 4, // Use 4 CPU threads for inference
        n_gpu_layers: 0, // CPU-only for broad compatibility
      });

      const elapsed = Date.now() - startTime;
      console.log(`LLM initialized in ${elapsed}ms`);
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generate a response from the LLM
   *
   * @param messages - Conversation history (user and assistant messages)
   * @returns The generated response text
   */
  async generate(messages: ChatMessage[]): Promise<string> {
    if (!this.context) {
      throw new Error('LLM not initialized. Call initialize() first.');
    }

    // Format messages into prompt
    const prompt = formatPrompt(
      messages.map((m) => ({ role: m.role, content: m.content }))
    );

    console.log('Generating response...');
    const startTime = Date.now();

    try {
      const result = await this.context.completion({
        prompt,
        n_predict: INFERENCE_CONFIG.maxTokens,
        temperature: INFERENCE_CONFIG.temperature,
        top_p: INFERENCE_CONFIG.topP,
        stop: ['<|im_end|>', '<|im_start|>'], // Stop at chat markers
      });

      const elapsed = Date.now() - startTime;
      console.log(`Generated ${result.text.length} chars in ${elapsed}ms`);

      // Clean up the response (remove any trailing markers)
      let text = result.text.trim();
      if (text.endsWith('<|im_end|>')) {
        text = text.slice(0, -10).trim();
      }

      return text;
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    }
  }

  /**
   * Release the LLM context and free memory
   * Call this when the app is backgrounded or memory is low
   */
  async release(): Promise<void> {
    if (this.context) {
      console.log('Releasing LLM context');
      await this.context.release();
      this.context = null;
    }
  }
}

// Export the singleton instance
export default LLMService.getInstance();
