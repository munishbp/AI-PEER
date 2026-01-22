/**
 * modelDownloader.ts - Download model with progress tracking
 *
 * Handles:
 * - Downloading large model files with progress callbacks
 * - Checking if model already exists (skip re-download)
 * - Resume support if download is interrupted
 *
 * Uses expo-file-system legacy API for proper streaming download
 * support with large files (378MB model).
 */

import {
  documentDirectory,
  getInfoAsync,
  deleteAsync,
  createDownloadResumable,
} from 'expo-file-system/legacy';
import { MODEL_URL, MODEL_FILENAME, MODEL_SIZE_BYTES } from './config';

/** Get the full path where the model will be stored */
export function getModelPath(): string {
  return `${documentDirectory}${MODEL_FILENAME}`;
}

/** Check if the model file already exists on disk */
export async function isModelDownloaded(): Promise<boolean> {
  const modelPath = getModelPath();
  const fileInfo = await getInfoAsync(modelPath);

  if (!fileInfo.exists) {
    return false;
  }

  // Verify file size is reasonable (at least 90% of expected)
  // This catches corrupted/incomplete downloads
  if (fileInfo.size && fileInfo.size < MODEL_SIZE_BYTES * 0.9) {
    console.log('Model file exists but appears incomplete, will re-download');
    await deleteAsync(modelPath, { idempotent: true });
    return false;
  }

  return true;
}

/** Delete the model file (for cleanup or re-download) */
export async function deleteModel(): Promise<void> {
  const modelPath = getModelPath();
  await deleteAsync(modelPath, { idempotent: true });
}

/**
 * Download the model file with progress tracking
 *
 * @param onProgress - Callback with progress percentage (0-100)
 * @returns Promise that resolves when download completes
 * @throws Error if download fails
 */
export async function downloadModel(
  onProgress: (progress: number) => void
): Promise<string> {
  const modelPath = getModelPath();

  // Check if already downloaded
  const alreadyExists = await isModelDownloaded();
  if (alreadyExists) {
    console.log('Model already downloaded');
    onProgress(100);
    return modelPath;
  }

  console.log('Starting model download from:', MODEL_URL);
  console.log('Saving to:', modelPath);

  // Create download resumable for progress tracking
  // This streams the file directly to disk without loading into memory
  const downloadResumable = createDownloadResumable(
    MODEL_URL,
    modelPath,
    {},
    (downloadProgress) => {
      const progress =
        (downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite) *
        100;
      onProgress(Math.round(progress));
    }
  );

  try {
    const result = await downloadResumable.downloadAsync();

    if (!result || !result.uri) {
      throw new Error('Download failed - no result returned');
    }

    console.log('Model download complete:', result.uri);
    return result.uri;
  } catch (error) {
    // Clean up partial download on failure
    await deleteAsync(modelPath, { idempotent: true });
    throw error;
  }
}

/**
 * Get model file size in MB (for display)
 */
export function getModelSizeMB(): number {
  return Math.round(MODEL_SIZE_BYTES / (1024 * 1024));
}
