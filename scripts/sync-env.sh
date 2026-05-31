#!/usr/bin/env bash
# Materialize gitignored .env.local files from Cursor Cloud secrets, a linked
# main worktree, or .env.example templates (+ optional `supabase status -o env`).
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "error: not inside a git repository" >&2
  exit 1
}
cd "$ROOT"

FORCE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    -h | --help)
      cat <<'EOF'
Usage: scripts/sync-env.sh [--force]

Writes gitignored .env.local files when missing (or always on Cursor Cloud).

Priority:
  1. Cursor Cloud — CLOUD_AGENT_* secrets → .env.local from *.env.example
  2. Git worktree — symlink/copy from main clone (pnpm worktree:env)
  3. Local fallback — copy *.env.example; fill from `supabase status -o env` when up

Pass --force to regenerate files even when they already exist (non-cloud only).
EOF
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

is_cloud_agent() {
  [[ -n "${CLOUD_AGENT_INJECTED_SECRET_NAMES:-}" || -n "${CLOUD_AGENT_ALL_SECRET_NAMES:-}" ]]
}

env_file_exists() {
  local path=$1
  [[ -f "$path" || -L "$path" ]]
}

# shellcheck disable=SC2034

load_supabase_env() {
  if ! command -v supabase >/dev/null 2>&1; then
    return 1
  fi
  if ! supabase status >/dev/null 2>&1; then
    return 1
  fi
  # shellcheck disable=SC2046
  eval "$(supabase status -o env 2>/dev/null | sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=\(.*\)$/export \1=\2/p')"
  export DATABASE_URL="${DATABASE_URL:-${DB_URL:-}}"
  export SUPABASE_URL="${SUPABASE_URL:-${API_URL:-}}"
  export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${ANON_KEY:-}}"
  export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE_KEY:-}}"
  export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$SUPABASE_ANON_KEY}"
}

write_env_from_lines() {
  local dest=$1
  local tmp
  tmp=$(mktemp)
  mkdir -p "$(dirname "$dest")"

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key=${BASH_REMATCH[1]}
      local default=${BASH_REMATCH[2]}
      if [[ -n ${!key+x} && -n ${!key} ]]; then
        printf '%s=%s\n' "$key" "${!key}" >>"$tmp"
      else
        printf '%s=%s\n' "$key" "$default" >>"$tmp"
      fi
    else
      printf '%s\n' "$line" >>"$tmp"
    fi
  done

  mv "$tmp" "$dest"
  echo "wrote $dest"
}

write_env_from_example() {
  local dest=$1
  local example=$2

  if [[ ! -f "$example" ]]; then
    echo "skip (no example): $dest" >&2
    return 1
  fi

  write_env_from_lines "$dest" <"$example"
}

maybe_load_supabase_env() {
  if is_cloud_agent; then
    return 0
  fi
  load_supabase_env || true
}

sync_target() {
  local dest=$1
  local example=$2

  if env_file_exists "$dest" && [[ "$FORCE" != true ]] && ! is_cloud_agent; then
    echo "keep existing: $dest"
    return 0
  fi

  write_env_from_example "$dest" "$example"
}

sync_from_cloud_or_examples() {
  maybe_load_supabase_env
  sync_target ".env.local" ".env.example"
  sync_target "apps/web/.env.local" "apps/web/.env.example"
  sync_target "apps/mcp/.env.local" "apps/mcp/.env.example"
  sync_target "apps/admin/.env.local" "apps/admin/.env.example"
}

try_worktree_link() {
  if ! bash scripts/link-env-from-main.sh; then
    return 1
  fi
  env_file_exists ".env.local" && env_file_exists "apps/web/.env.local"
}

main() {
  if is_cloud_agent; then
    echo "Cursor Cloud detected — syncing .env.local from injected secrets"
    sync_from_cloud_or_examples
    echo "done (cloud env sync)"
    return 0
  fi

  if try_worktree_link; then
    echo "done (worktree env link)"
    return 0
  fi

  echo "local fallback — materializing .env.local from templates"
  sync_from_cloud_or_examples
  echo "done (local env sync)"
}

main "$@"
