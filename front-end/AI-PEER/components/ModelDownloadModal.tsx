/**
 * ModelDownloadModal.tsx - Model download UI
 */

import React, { useMemo } from 'react';
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
import { usePrefs } from '@/src/prefs-context';
import { type ContrastPalette } from '@/src/theme';
import { useI18n } from '@/src/i18n';

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
  const { colors, scaled } = usePrefs();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download-outline" size={48} color={colors.accent} />
          </View>

          <Text style={[styles.title, { fontSize: scaled.h3 }]}>{t('modelDownload.title')}</Text>

          <Text style={[styles.description, { fontSize: scaled.small }]}>
            {t('modelDownload.description')}
          </Text>

          <View style={styles.sizeBox}>
            <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
            <Text style={[styles.sizeText, { fontSize: scaled.small }]}>
              {t('modelDownload.size_line_1', { sizeMb: modelSizeMB })}
              {'\n'}
              {t('modelDownload.size_line_2')}
            </Text>
          </View>

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
              <Text style={[styles.progressText, { fontSize: scaled.small }]}>{downloadProgress}%</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
              <Text style={[styles.errorText, { fontSize: scaled.small }]}>{error}</Text>
            </View>
          )}

          <View style={styles.buttons}>
            {!isDownloading && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { fontSize: scaled.base }]}>{t('common.later')}</Text>
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
                  <Text style={[styles.downloadButtonText, { fontSize: scaled.base }]}>
                    {error ? t('common.retry') : t('common.download')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.privacyNote, { fontSize: scaled.small }]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.muted} />
            {' '}
            {t('modelDownload.privacy_note')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ContrastPalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modal: {
      backgroundColor: colors.bgTile,
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
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      color: colors.text,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    sizeBox: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      gap: 8,
    },
    sizeText: {
      flex: 1,
      color: colors.text,
      lineHeight: 18,
    },
    progressContainer: {
      marginBottom: 16,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    progressText: {
      color: colors.text,
      textAlign: 'center',
      marginTop: 4,
      fontWeight: '700',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    errorText: {
      flex: 1,
      color: colors.text,
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
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontWeight: '600',
      color: colors.text,
    },
    downloadButton: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    downloadButtonDisabled: {
      opacity: 0.7,
    },
    downloadButtonText: {
      fontWeight: '600',
      color: '#FFFFFF',
    },
    privacyNote: {
      color: colors.text,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
