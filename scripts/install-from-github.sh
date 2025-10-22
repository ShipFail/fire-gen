#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/install-from-github.sh <github-archive-url> <firebase-project-id>" >&2
  exit 1
fi

ARCHIVE_URL="$1"
PROJECT_ID="$2"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

curl -L "$ARCHIVE_URL" -o "$TMP_DIR/source.zip"
unzip -q "$TMP_DIR/source.zip" -d "$TMP_DIR"
SOURCE_DIR="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

npm --prefix "$SOURCE_DIR/extension/functions" install
npm --prefix "$SOURCE_DIR/extension/functions" run build

firebase ext:install --local "$SOURCE_DIR/extension" --project "$PROJECT_ID"
