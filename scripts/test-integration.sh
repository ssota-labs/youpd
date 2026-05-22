#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI is required for integration tests" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]] && ! supabase status -o json >/dev/null 2>&1; then
  echo "error: local Supabase is not running" >&2
  echo "  pnpm db:up && pnpm db:reset" >&2
  exit 1
fi

exec pnpm exec vitest run --config vitest.integration.config.ts "$@"
