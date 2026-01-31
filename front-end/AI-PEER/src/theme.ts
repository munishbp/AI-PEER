// src/theme.ts
export const colors = {
  primary: "#D84535",
  background: "#F7EDE4",
  beigeTile: "#F4E3D6",
  text: "#333333",
  muted: "#575757ff",
  tabColor: "#ff9A00ff",
  tabInactive: "#5E5F5B",
  gray: "#E5E5E5",
  danger: "#DC2626",
};

export const darkColors = {
  background: "#1a1a1a",
  darkTile: "#0F1720",
  text: "#E5E7EB",
  darkMuted: "#f0f3f9ff",
  border: "#1F2937",
  primary: "#ff8f4aff",
};

export const highContrast = {
  background: "#000000",
  highTile: "#000000",
  text: "#FFFF00",
  muted: "#FFFFAF",
  accent: "#EA580C",
};

export const colorsByContrast = {
  light: {
    background: colors.background,
    bgTile: colors.beigeTile,
    text: colors.text,
    muted: colors.muted,
    accent: colors.primary,
    tabs: "#FFFFFF",
    tabColor: colors.tabColor,
    tabInactive: colors.tabInactive,
  },
  dark: {
    background: darkColors.background,
    bgTile: darkColors.darkTile,
    text: darkColors.text,
    muted: darkColors.darkMuted,
    accent: darkColors.primary,
    tabs: "#121212",
    tabColor: darkColors.primary,
    tabInactive: darkColors.primary,
  },
  high: {
    background: highContrast.background,
    bgTile: highContrast.highTile,
    text: highContrast.text,
    muted: highContrast.muted,
    accent: highContrast.accent,
    tabs: "#000000",
    tabColor: highContrast.accent,
    tabInactive: highContrast.accent },
};

export const radii = { md: 12, lg: 16 };
export const spacing = (n: number) => n * 4; // spacing(4) = 16
export const fontSizes = { base: 16, h1: 28, h2: 22, h3: 18.5, small: 13 };

// Helper to generate scaled font sizes based on an accessibility font scale
export const scaleFontSizes = (scale: number) => ({
  base: Math.round(fontSizes.base * scale),
  h1: Math.round(fontSizes.h1 * scale),
  h2: Math.round(fontSizes.h2 * scale),
  h3: Math.round(fontSizes.h3 * scale),
  small: Math.round(fontSizes.small * scale),
});
