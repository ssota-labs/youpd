#!/usr/bin/env bash
# Cursor Cloud Agent bootstrap — runs on every VM `install` / update.
# See .cursor/environment.json and AGENTS.md → Cursor Cloud specific instructions.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 24 2>/dev/null || nvm install 24
  export PATH="$NVM_DIR/versions/node/v24.16.0/bin:$PATH"
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable 2>/dev/null || true
fi

pnpm install
bash scripts/sync-env.sh
