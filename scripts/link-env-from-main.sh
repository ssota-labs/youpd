#!/usr/bin/env bash
# Symlink ignored env files (.env.local, apps/web/.env.youtube) from the main worktree.
# Git worktrees do not copy ignored env files; run this after every new worktree.
set -euo pipefail

MODE=link
if [[ "${1:-}" == "--copy" ]]; then
  MODE=copy
  shift
fi

WT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "error: not inside a git worktree" >&2
  exit 1
}

find_main_worktree() {
  if [[ -n "${YOUPD_MAIN_WORKTREE:-}" && -d "${YOUPD_MAIN_WORKTREE}" ]]; then
    echo "${YOUPD_MAIN_WORKTREE}"
    return 0
  fi

  local wt="" branch=""
  while IFS= read -r line; do
    case "$line" in
      worktree\ *)
        wt=${line#worktree }
        ;;
      branch\ *)
        branch=${line#branch refs/heads/}
        if [[ "$branch" == "main" && -n "$wt" ]]; then
          echo "$wt"
          return 0
        fi
        ;;
    esac
  done < <(git worktree list --porcelain)

  wt=""
  while IFS= read -r line; do
    case "$line" in
      worktree\ *)
        wt=${line#worktree }
        if [[ -f "$wt/.env.local" ]]; then
          echo "$wt"
          return 0
        fi
        ;;
    esac
  done < <(git worktree list --porcelain)

  git worktree list --porcelain | awk '/^worktree / { print $2; exit }'
}

MAIN=$(find_main_worktree)

if [[ "$MAIN" == "$WT_ROOT" ]]; then
  echo "already on main worktree: $MAIN"
  echo "set YOUPD_MAIN_WORKTREE to another path if you meant a linked worktree"
  exit 0
fi

ENV_PATHS=(
  .env.local
  apps/web/.env.local
  apps/web/.env.youtube
  apps/mcp/.env.local
)

linked=0
skipped=0

for rel in "${ENV_PATHS[@]}"; do
  src="$MAIN/$rel"
  dst="$WT_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"

  if [[ ! -f "$src" ]]; then
    echo "skip (missing on main): $rel — create $src or copy from .env.example" >&2
    skipped=$((skipped + 1))
    continue
  fi

  if [[ -e "$dst" && ! -L "$dst" ]]; then
    echo "skip (regular file exists): $rel — remove or backup before linking" >&2
    skipped=$((skipped + 1))
    continue
  fi

  rm -f "$dst"
  if [[ "$MODE" == "copy" ]]; then
    cp "$src" "$dst"
    echo "copied $rel <- $src"
  else
    ln -sfn "$src" "$dst"
    echo "linked $rel -> $src"
  fi
  linked=$((linked + 1))
done

echo ""
echo "main worktree: $MAIN"
echo "done ($MODE): $linked linked/copied, $skipped skipped"
if [[ $linked -eq 0 ]]; then
  exit 1
fi
