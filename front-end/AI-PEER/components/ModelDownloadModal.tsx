/**
 * ModelDownloadModal.tsx - Model download UI
 *
 * Shows when the user opens AI Chat and the model isn't downloaded yet.
 * Displays:
 * - Warning about file size (~378MB)
 * - Download button
 * - Progress bar during download
 * - Error state with retry
 *
 * Matches the app's beige/warm-red color scheme.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getModelSizeMB } from '@/src/llm';

// App color scheme
const beige = '#F7EDE4';
const beigeTile = '#F4E3D6';
const warmRed = '#D84535';
const darkText = '#3F2F25';
const subtleText = '#7A6659';

type Props = {
  visible: boolean;
  downloadProgress: number;
  isDownloading: boolean;
  error: string | null;
  onStartDownload: () => void;
  onCancel: () => void;
};

export default function ModelDownloadModal({
  visible,
  downloadProgress,
  isDownloading,
  error,
  onStartDownload,
  onCancel,
}: Props) {
  const modelSizeMB = getModelSizeMB();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download-outline" size={48} color={warmRed} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Download AI Model</Text>

          {/* Description */}
          <Text style={styles.description}>
            To use AI Chat, we need to download the language model to your
            device. This only happens once.
          </Text>

          {/* Size warning */}
          <View style={styles.sizeBox}>
            <Ionicons name="information-circle-outline" size={20} color={subtleText} />
            <Text style={styles.sizeText}>
              Download size: ~{modelSizeMB}MB{'\n'}
              Requires Wi-Fi recommended
            </Text>
          </View>

          {/* Progress bar (shown during download) */}
          {isDownloading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${downloadProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{downloadProgress}%</Text>
            </View>
          )}

          {/* Error message */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={warmRed} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttons}>
            {!isDownloading && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Later</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.downloadButton,
                isDownloading && styles.downloadButtonDisabled,
              ]}
              onPress={onStartDownload}
              activeOpacity={0.8}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.downloadButtonText}>
                    {error ? 'Retry' : 'Download'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Privacy note */}
          <Text style={styles.privacyNote}>
            <Ionicons name="shield-checkmark-outline" size={12} color={subtleText} />
            {' '}All AI processing happens on your device. Your conversations
            never leave your phone.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    }),
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: beigeTile,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: darkText,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: subtleText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  sizeBox: {
    flexDirection: 'row',
    backgroundColor: beigeTile,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  sizeText: {
    flex: 1,
    fontSize: 13,
    color: subtleText,
    lineHeight: 18,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: beigeTile,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: warmRed,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: subtleText,
    textAlign: 'center',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: warmRed,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: beigeTile,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: subtleText,
  },
  downloadButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: warmRed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  downloadButtonDisabled: {
    opacity: 0.7,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 11,
    color: subtleText,
    textAlign: 'center',
    lineHeight: 16,
  },
});
