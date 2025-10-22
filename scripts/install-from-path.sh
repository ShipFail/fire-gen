#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/install-from-path.sh <extension-path> <firebase-project-id>" >&2
  exit 1
fi

EXTENSION_PATH="$1"
PROJECT_ID="$2"

npm --prefix "$EXTENSION_PATH/functions" install
npm --prefix "$EXTENSION_PATH/functions" run build

firebase ext:install --local "$EXTENSION_PATH" --project "$PROJECT_ID"
