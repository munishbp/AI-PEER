/**
 * types.ts - TypeScript interfaces for LLM integration
 *
 * These types define the "contract" for our data structures.
 * Having strict types catches bugs at compile time rather than runtime.
 */

/** A single message in a conversation */
export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
};

/**
 * A conversation with metadata for 24-hour auto-archiving.
 * Conversations older than 24 hours get cleared to prevent context rot.
 */
export type Conversation = {
    id: string;
    createdAt: number;
    lastMessageAt: number;
    messages: ChatMessage[];
};

/** Current state of the LLM system */
export type LLMState = {
    isModelDownloaded: boolean;
    isModelLoaded: boolean;
    isGenerating: boolean;
    downloadProgress: number; // 0-100
    error: string | null;
};

/** Configuration for model inference */
export type InferenceConfig = {
    maxTokens: number;
    temperature: number;
    topP: number;
    contextSize: number;
};
/*
* You're right, I apologize. Let me guide you through this instead of just writing the code for you.

  Let's start with the vision module's types.ts file. This is a great place to learn about TypeScript because it's all about defining the "shape" of your data.

  Question for you: Looking at the LLM module's types.ts that we read earlier, what do you notice about how types are organized?

  In the LLM module, they defined:
  - ChatMessage - a single piece of data
  - Conversation - a collection that includes ChatMessage[]
  - LLMState - the current status of the system
  - InferenceConfig - settings/parameters

  For our vision module, we need similar patterns but for pose estimation. Let me walk you through what we need:

  1. Keypoint - A single point on a body (like "left_shoulder" at position x, y with a confidence score)
  2. Pose - All 17 keypoints together (a complete skeleton detection)
  3. FormViolation - When the user's form is wrong (e.g., "Keep your back straight")
  4. FormFeedback - The result of checking their form (score + list of violations)
  5. VisionState - Current status (is model loaded? is it tracking? any errors?)

  Let's start with the Keypoint type.

  What properties do you think a keypoint needs? Think about:
  - Where is it located on the screen?
  - How confident is the model that this point is correct?
  - What body part does it represent?

  Try writing the Keypoint type. I'll give you a hint - the position is normalized (0 to 1) rather than pixel coordinates, which makes it work regardless of screen size.

✻ Sautéed for 1m 10s

  8 tasks (0 done, 1 in progress, 7 open) · ctrl+t to hide tasks
  ■ Create vision module types, config, and constants
  □ Create vision model downloader
  □ Create VisionService singleton
  □ Create FormAnalysisEngine and AudioFeedbackService
  □ Create ExerciseRulesRegistry and exercise rules
  □ Create VisionContext, useVision hook, and barrel exports
  □ Create UI components for vision
  □ Integrate vision module into app
* */