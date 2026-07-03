#!/bin/bash
# Build the native Whisper Flow menu-bar app and install it to ~/Applications.
set -euo pipefail
cd "$(dirname "$0")"

APP="$HOME/Applications/Whisper Flow.app"

echo "▸ compiling…"
swiftc main.swift -o WhisperFlow -O -swift-version 5

echo "▸ bundling…"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
mv WhisperFlow "$APP/Contents/MacOS/WhisperFlow"
cp Info.plist "$APP/Contents/Info.plist"
[ -f icon.icns ] && cp icon.icns "$APP/Contents/Resources/icon.icns"

echo "▸ signing (ad-hoc)…"
codesign --force --deep -s - "$APP"

echo "✓ installed: $APP"
