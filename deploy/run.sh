#!/usr/bin/env bash
# Run the Veyra UI on http://127.0.0.1:5173
# Vite proxies /api to http://127.0.0.1:8787
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d node_modules ]; then
  echo "Run bash deploy/setup.sh first."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required."
  exit 1
fi

exec npm run dev
