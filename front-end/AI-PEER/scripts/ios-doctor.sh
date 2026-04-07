#!/usr/bin/env bash
#
# ios-doctor.sh — preflight check for the AI-PEER iOS build environment.
#
# Run this before attempting an iOS build, especially after pulling new
# changes or onto a fresh machine. Read-only: it never installs, removes,
# or modifies anything. Exits 0 if every required check passes, 1 otherwise.
#
# Invoke via:  npm run ios:doctor
#

set -u

# Resolve repo root (this script lives in scripts/) so we can be invoked from
# anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Color helpers — only emit ANSI codes when stdout is a TTY.
if [ -t 1 ]; then
  GREEN=$'\033[32m'
  RED=$'\033[31m'
  YELLOW=$'\033[33m'
  BOLD=$'\033[1m'
  RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; BOLD=""; RESET=""
fi

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() {
  printf "  %sPASS%s  %s\n" "$GREEN" "$RESET" "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  printf "  %sFAIL%s  %s\n" "$RED" "$RESET" "$1"
  if [ -n "${2:-}" ]; then
    printf "         %s\n" "$2"
  fi
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn() {
  printf "  %sWARN%s  %s\n" "$YELLOW" "$RESET" "$1"
  if [ -n "${2:-}" ]; then
    printf "         %s\n" "$2"
  fi
  WARN_COUNT=$((WARN_COUNT + 1))
}

printf "%sAI-PEER iOS environment doctor%s\n\n" "$BOLD" "$RESET"

# 1. Xcode installed and version >= 26
if command -v xcodebuild >/dev/null 2>&1; then
  XCODE_LINE=$(xcodebuild -version 2>/dev/null | head -1)
  XCODE_MAJOR=$(printf "%s" "$XCODE_LINE" | sed -E 's/^Xcode ([0-9]+).*/\1/')
  if [ -n "$XCODE_MAJOR" ] && [ "$XCODE_MAJOR" -ge 26 ] 2>/dev/null; then
    pass "$XCODE_LINE (>= 26)"
  else
    fail "$XCODE_LINE — need Xcode 26 or later" "Update Xcode from the App Store."
  fi
else
  fail "xcodebuild not found" "Install Xcode from the App Store."
fi

# 2. Command Line Tools selection points at Xcode.app
CLT_PATH=$(xcode-select -p 2>/dev/null || true)
case "$CLT_PATH" in
  /Applications/Xcode*.app/*)
    pass "Command Line Tools: $CLT_PATH"
    ;;
  "")
    fail "xcode-select returned no path" "Run: sudo xcode-select -s /Applications/Xcode.app"
    ;;
  *)
    fail "Command Line Tools points at $CLT_PATH" "Run: sudo xcode-select -s /Applications/Xcode.app"
    ;;
esac

# 3. Node version matches .nvmrc
if [ -f .nvmrc ]; then
  PINNED_NODE=$(tr -d '[:space:]' < .nvmrc)
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | sed 's/^v//')
    NODE_MAJOR=$(printf "%s" "$NODE_VERSION" | cut -d. -f1)
    PINNED_MAJOR=$(printf "%s" "$PINNED_NODE" | cut -d. -f1)
    if [ "$NODE_MAJOR" = "$PINNED_MAJOR" ]; then
      pass "Node v$NODE_VERSION (matches .nvmrc: $PINNED_NODE)"
    else
      fail "Node v$NODE_VERSION (expected major $PINNED_NODE)" "Run: nvm use   (or: nvm install $PINNED_NODE)"
    fi
  else
    fail "node not found" "Install Node $PINNED_NODE via nvm/fnm/asdf/volta."
  fi
else
  warn ".nvmrc missing" "Cannot verify Node version."
fi

# 4. CocoaPods installed via Homebrew, version >= 1.16
if command -v pod >/dev/null 2>&1; then
  POD_PATH=$(command -v pod)
  POD_VERSION=$(pod --version 2>/dev/null)
  POD_MAJOR=$(printf "%s" "$POD_VERSION" | cut -d. -f1)
  POD_MINOR=$(printf "%s" "$POD_VERSION" | cut -d. -f2)
  if [ "$POD_MAJOR" -gt 1 ] 2>/dev/null || { [ "$POD_MAJOR" = "1" ] && [ "$POD_MINOR" -ge 16 ] 2>/dev/null; }; then
    pass "CocoaPods $POD_VERSION ($POD_PATH)"
  else
    fail "CocoaPods $POD_VERSION (need >= 1.16)" "Run: brew upgrade cocoapods"
  fi
else
  fail "pod not found" "Run: brew install cocoapods"
fi

# 6. ios/Pods/ exists
if [ -d ios/Pods ]; then
  pass "ios/Pods/ present"
else
  warn "ios/Pods/ missing" "Run: cd ios && bundle exec pod install"
fi

# 7. .env exists
if [ -f .env ]; then
  pass ".env present"
else
  warn ".env missing" "Run: cp .env.example .env  (then fill in credentials)"
fi

# 8. react-native-worklets-core present in node_modules
# Required by the custom MediaPipe Swift plugin — see README note.
if [ -d node_modules/react-native-worklets-core ]; then
  pass "react-native-worklets-core installed"
else
  if [ -d node_modules ]; then
    fail "react-native-worklets-core missing from node_modules/" "Run: npm install   (it is a direct dependency)"
  else
    warn "node_modules/ missing" "Run: npm install"
  fi
fi

# Summary
printf "\n%sSummary:%s %s%d passed%s, %s%d failed%s, %s%d warnings%s\n" \
  "$BOLD" "$RESET" \
  "$GREEN" "$PASS_COUNT" "$RESET" \
  "$RED" "$FAIL_COUNT" "$RESET" \
  "$YELLOW" "$WARN_COUNT" "$RESET"

if [ "$FAIL_COUNT" -gt 0 ]; then
  printf "\nFix the failures above before attempting an iOS build.\n"
  exit 1
fi

printf "\nEnvironment looks good. You can build iOS.\n"
exit 0
