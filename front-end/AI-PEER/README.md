# AI-PEER Mobile App

React Native / Expo app for fall risk assessment and exercise interventions. Built for UCF Senior Design 2025-2026 in collaboration with UCF College of Medicine.

## Requirements

- Node.js 18+
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

## Setup

<<<<<<< HEAD
**First time setup or after pulling changes with new native modules:**

```bash
# 1. Install JS dependencies
npm install

# 2. Regenerate native folders with native modules linked
npx expo prebuild --clean

# 3. For iOS only: Install CocoaPods
cd ios && pod install && cd ..
```

The `--clean` flag is important - it regenerates the `android/` and `ios/` folders from scratch, ensuring all native modules (like `llama.rn` for the AI chat) are properly linked.

**Quick setup (no native module changes):**

=======
>>>>>>> c802f177aa84764abed56c352fa36fe947070702
```bash
npm install
```

<<<<<<< HEAD
### Troubleshooting

**"Cannot read property 'install' of null" or similar native module errors:**

This means native modules aren't linked. Run:
```bash
npx expo prebuild --clean
```

Then rebuild the app in Android Studio or Xcode.

**Android Studio not finding the project:**

Open the `android/` folder directly as a project, then let Gradle sync complete before running.

=======
>>>>>>> c802f177aa84764abed56c352fa36fe947070702
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
