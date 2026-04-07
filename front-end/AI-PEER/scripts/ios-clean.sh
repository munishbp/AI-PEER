#!/usr/bin/env bash
#
# ios-clean.sh — full nuke-and-rebuild of the iOS native dependencies and
# Xcode caches. Run this when an iOS build fails with mysterious template
# errors, "works on my machine" weirdness, or after pulling Podfile changes.
#
# What it does:
#   1. Deintegrate CocoaPods (removes Pods/, Pods.xcodeproj entries)
#   2. Wipe ios/Pods, ios/Podfile.lock, ios/build
#   3. Wipe ~/Library/Developer/Xcode/DerivedData (ALL projects, not just ours)
#   4. Reinstall Pods
#
# After this finishes, open Xcode → Product → Clean Build Folder (Cmd+Shift+K),
# then build.
#
# Invoke via:  npm run ios:clean
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if [ -t 1 ]; then
  BOLD=$'\033[1m'
  YELLOW=$'\033[33m'
  RESET=$'\033[0m'
else
  BOLD=""; YELLOW=""; RESET=""
fi

step() {
  printf "\n%s==>%s %s\n" "$BOLD" "$RESET" "$1"
}

if [ ! -d ios ]; then
  printf "Error: ios/ directory not found. Run from the AI-PEER repo root.\n" >&2
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  printf "Error: CocoaPods is not installed. Run: brew install cocoapods\n" >&2
  exit 1
fi

printf "%s%sThis will wipe ios/Pods, ios/Podfile.lock, ios/build, and ~/Library/Developer/Xcode/DerivedData.%s\n" \
  "$BOLD" "$YELLOW" "$RESET"
printf "%sDerivedData is shared across ALL Xcode projects on this machine — other projects will rebuild from scratch on next open.%s\n\n" \
  "$YELLOW" "$RESET"

step "Deintegrating CocoaPods"
if [ -d ios/Pods ]; then
  (cd ios && pod deintegrate) || true
else
  printf "  ios/Pods not present; skipping deintegrate.\n"
fi

step "Removing ios/Pods, ios/Podfile.lock, ios/build"
rm -rf ios/Pods ios/Podfile.lock ios/build

step "Removing ~/Library/Developer/Xcode/DerivedData"
rm -rf ~/Library/Developer/Xcode/DerivedData

step "Reinstalling Pods (pod install)"
(cd ios && pod install)

printf "\n%sDone.%s In Xcode: Product → Clean Build Folder (Cmd+Shift+K), then build.\n" "$BOLD" "$RESET"
