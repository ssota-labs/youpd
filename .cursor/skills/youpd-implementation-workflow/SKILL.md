---
name: youpd-implementation-workflow
description: Implement or verify YouPD monorepo code from Notion tasks (작업 유형 구현/검증). Use after AGENTS.md routes work to implementation. Follow AGENTS.md for stack conventions; this skill covers gate, branch/PR, close-out, guarded merge to dev, and small Spec/Policy patches.
---

# YouPD Implementation Workflow

**Coding conventions** (Next.js 16, Drizzle, Supabase, MCP, Turborepo, Zod 4) live in **`AGENTS.md`**. This skill covers **procedure** only.

## Prerequisites

- AGENTS.md Development router completed (Notion MCP, task row loaded).
- Task `작업 유형` is `구현` or `검증` (or user explicitly requested implementation).
- Work from latest `main`; integrate via PR to **`dev`** only (never auto-merge to `main`).

## Progressive references

- [references/implementation-gate.md](references/implementation-gate.md) — pre-code checklist
- [references/close-out.md](references/close-out.md) — verify, record, reconcile delta, merge decision

## Workflow

### 1. Gate (before any edit)

Run [references/implementation-gate.md](references/implementation-gate.md). If blocked, stop and use the blocker template there.

### 2. De-dupe and resume check

Before starting new work:

- Open PRs to `dev`: `gh pr list --base dev --state open`
- In-progress tasks in Notion with same milestone
- Dirty worktree: commit/stash or abort
- Merge conflicts on existing task branch: resolve before new feature work

**Resume** an existing in-progress task/PR when present; do not duplicate.

### 3. Read context

- Linked PRD and D3 from `관련 문서`
- `AGENTS.md`, `docs/testing.md`, relevant `apps/*` and `packages/*` on `dev`/`main`
- Predecessor code per `종속성` / Blueprint

Do not plan from Notion alone.

### 4. Plan

Summarize: task ID, dependency status, branch name, files to touch, verification commands, risks.

### 5. Execute

Follow **AGENTS.md**: hexagonal boundaries, Drizzle SSOT, MCP typed tools, no secrets in client bundles.

Create branch from `main` (or continue task branch), push, open PR **base `dev`**.

### 6. Close-out

Follow [references/close-out.md](references/close-out.md):

- **Verify** — `pnpm typecheck`, `pnpm test`, `pnpm lint`; integration/E2E when applicable
- **Record** — Notion Spec/ADR/릴리즈 노트; link `관련 문서`
- **Small Spec/Policy** — inline when change is limited to this PR
- **Reconcile delta** — task row vs merged code on `dev`
- **Guarded merge** — merge PR to `dev` only when all merge gates pass (see close-out)
- **Complete task** — set Notion `상태` to **`완료`** when close-out gates pass; do not ask the user for approval
- **Report** — task ID, PR URL, merge status, verification results, Notion status applied

### 7. Merge gates (dev only)

Merge to **`dev`** when **all** apply:

- CI/checks green (or no required checks configured)
- No merge conflicts
- No open P0 from recent reconciliation
- No secrets, destructive migrations, or force-push
- PR targets `dev`, not `main`

**Never** auto-merge to `main`. Promotion to `main` is a separate human decision.
