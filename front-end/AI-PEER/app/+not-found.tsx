import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useI18n } from '@/src/i18n';
import { usePrefs } from '@/src/prefs-context';

export default function NotFoundScreen() {
  const { t } = useI18n();
  const { colors, scaled } = usePrefs();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.screen_title') }} />
      <View style={styles.container}>
        <Text style={[styles.title, { fontSize: scaled.h2, color: colors.text }]}>{t('notFound.title')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.accent, fontSize: scaled.base }]}>{t('notFound.go_home')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontWeight: '700',
  },
});
