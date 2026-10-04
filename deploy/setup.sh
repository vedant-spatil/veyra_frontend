#!/usr/bin/env bash
# Local setup: frontend env file and npm packages.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node 18 or newer."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created frontend/.env. VITE_GOOGLE_CLIENT_ID is public. The client secret stays in backend/.env."
fi

npm install
echo "Frontend is set up. Start it with bash deploy/run.sh"
