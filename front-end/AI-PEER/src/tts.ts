import * as Speech from "expo-speech";
import i18n from "./i18n";

// iOS has no native Haitian Creole voice, so 'ht' falls back to French.
// Spanish and English map to their standard system voices.
export function ttsLanguage(): string {
  const lang = i18n.language || "en";
  if (lang.startsWith("es")) return "es-ES";
  if (lang.startsWith("ht")) return "fr-FR";
  return "en-US";
}

export function speak(
  text: string,
  options?: Omit<Speech.SpeechOptions, "language">
): void {
  Speech.speak(text, { ...(options ?? {}), language: ttsLanguage() });
}

export function stopSpeech(): void {
  Speech.stop();
}
