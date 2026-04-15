import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useI18n } from '@/src/i18n';
import { usePrefs } from '@/src/prefs-context';

export default function ModalScreen() {
  const { t } = useI18n();
  const { scaled } = usePrefs();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={{ fontSize: scaled.h2 }}>{t('modalScreen.title')}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link" style={{ fontSize: scaled.base }}>{t('modalScreen.go_home')}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
