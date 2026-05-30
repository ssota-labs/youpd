# YouPD automation memory

## Cloud VM — Docker daemon (Supabase / E2E)

Cursor Cloud agent VM often ships with Docker installed but the **daemon stopped** and/or the user lacks socket access.

**Before `pnpm db:up` or `pnpm test:e2e`:**

```bash
sudo service docker start
sudo chmod 666 /var/run/docker.sock   # if: permission denied on /var/run/docker.sock
docker ps                             # sanity check
```

Then:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
export PATH="$NVM_DIR/versions/node/v24.16.0/bin:$PATH"
pnpm db:up                            # or rely on existing supabase containers
eval "$(supabase status -o env)"      # inject keys for Playwright webServer
pnpm exec playwright test e2e/home-dashboard.spec.ts
```

**Do not commit** `apps/*/next-env.d.ts` if they change to `./.next/dev/types/routes.d.ts` after `next dev` — restore with `git restore`.

Playwright config loads env via `e2e/load-supabase-env.ts` → requires `supabase status` (local stack running).

## Cloud VM — Node / env

- Node **24** via nvm; prepend to `PATH` before `pnpm`.
- First run: copy `.env.example` → `.env.local`, `apps/web/.env.example` → `apps/web/.env.local`, or `pnpm worktree:env` on main worktree.

## Active sprint (S1)

- **YOUPD-S1-IMPL** → 완료 (PR #41 merged to `dev`).
- **YOUPD-S1-VERF** → 완료 (2026-05-30): E2E `home-dashboard.spec.ts` 3/3; evidence in `test-results/` + `playwright-report/`.
- **Next eligible:** YOUPD-S2-DSGN (documentation).

## Lint note

`@youpd/web` may fail `react-hooks/set-state-in-effect` in `video-search/results.tsx` (pre-existing on `main`); typecheck/unit/E2E can still pass independently.
