# AI-PEER Mobile App

React Native / Expo app for fall risk assessment and exercise interventions. Built for UCF Senior Design 2025-2026 in collaboration with UCF College of Medicine.

## Requirements

- Node.js 18+
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

## Setup

```bash
npm install
```

## Running the App

This is a bare workflow project (ejected from Expo managed). Expo Go will not work.

**Android:**
```bash
# Terminal 1: Start Metro bundler
npx expo start

# Terminal 2: Build and run (or use Android Studio)
npx expo run:android
```

**iOS (macOS only):**
```bash
npx expo start
npx expo run:ios
```

**Or open `android/` or `ios/` folder directly in Android Studio / Xcode.**

## Features

- Fall risk assessment with FRA matrix visualization
- On-device AI chat powered by Qwen3-0.6B (no data leaves phone)
- Conversation history with 24-hour auto-archive
- Activity tracking and weekly summaries
- HIPAA-compliant design

## Project Structure

```
app/                  # Expo Router screens
  (tabs)/             # Bottom tab navigation
    index.tsx         # Home - risk score, activity
    ai-chat.tsx       # AI chat interface
    activity.tsx      # Activity tracking
    contacts.tsx      # Contacts
    settings.tsx      # Settings
  chat-history.tsx    # Conversation history
src/
  llm/                # On-device LLM module
    LLMContext.tsx    # React context for state
    LLMService.ts     # llama.rn wrapper
    useLLM.ts         # Hook for components
components/           # Reusable UI components
```

## On-Device LLM

The AI chat uses Qwen3-0.6B running locally via llama.rn. On first launch, users download the model (~378MB). All inference happens on-device for HIPAA compliance.

Configuration in `src/llm/config.ts`:
- Max tokens: 512
- Context size: 8192
- Conversation TTL: 24 hours
