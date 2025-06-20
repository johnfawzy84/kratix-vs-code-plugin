#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Compiling extension..."
npm run compile

echo "Packaging extension (.vsix)..."
if ! command -v vsce &> /dev/null; then
  echo "Installing vsce..."
  npm install -g @vscode/vsce
fi
vsce package

echo "Build complete. Find your .vsix file in the project root."
