/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { usePrefs } from '@/src/prefs-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background' | 'tint' | 'icon' | 'tabIconDefault' | 'tabIconSelected'
) {
  const { prefs, colors } = usePrefs();
  const colorFromProps = prefs.contrast === 'light' ? props.light : props.dark;

  const mapped = {
    text: colors.text,
    background: colors.background,
    tint: colors.accent,
    icon: colors.muted,
    tabIconDefault: colors.muted,
    tabIconSelected: colors.accent,
  }[colorName];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return mapped;
  }
}
