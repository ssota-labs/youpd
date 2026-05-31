# Implementation close-out

Required at end of every **구현** or **검증** session.

## 3a Verify

```bash
pnpm typecheck
pnpm test
pnpm lint
```

Add `pnpm test:integration` when Supabase/API/MCP boundaries change (`pnpm db:up` first — see `docs/testing.md`).

Add `pnpm test:e2e` when critical web flows change.

## 3b Record (Notion)

- Link new/updated docs via task `관련 문서`
- Set correct `태그` (스펙, 정책, 릴리즈 노트, ADR, …)
- Set `진행중` when starting; `보류` if blocked (with blocker note on task page)
- Note PR URL and branch on task page body when applicable

## 3c Small Spec / Policy (in this workflow)

Update here (do **not** open youpd-documentation-workflow) when **all** apply:

- Change shipped in the same PR/session
- One topic Spec area (or one Policy rule)
- Update limited to Current Contract + Change Log (and tests reference)

## 3d Reconcile delta

Compare task `상태` and title to code on `dev`:

| Finding | Severity |
|---|---|
| Code merged to `dev` but task still `진행중`/`대기` after close-out gates pass | P2 — set `완료` now |
| Task `완료` but code missing on `dev` | P0 |
| Tech Spec/Spec clearly contradicts merged code | P1 |

For **`검증`** tasks: run or recommend [youpd-reconciliation](../../youpd-reconciliation/SKILL.md) with **full task database** scope unless recently done.

## 3e Guarded merge to dev

When user or scheduler authorized merge:

```bash
gh pr checks <number>
gh pr view <number> --json mergeable,state,baseRefName
gh pr merge <number> --merge --delete-branch   # or --squash per team preference
```

Merge only if:

- `baseRefName` is `dev`
- `mergeable` is `MERGEABLE`
- Required checks pass
- No P0 reconciliation findings for this task
- No secrets or destructive ops in diff

If merge fails (permissions, protection, conflicts), **stop** and report — do not retry blindly.

## 3f Complete task (autonomous)

Set Notion `상태` to **`완료`** when **all** apply for this task type. Do **not** ask the user for approval.

**구현**

- Implementation gate was satisfied at start
- `pnpm typecheck`, `pnpm test`, `pnpm lint` passed (plus integration/E2E when applicable)
- PR merged to `dev`, or session explicitly required doc-only/no-code deliverable

**검증**

- Verification plan in linked PRD/Tech Spec executed
- No P0 findings for this task scope
- E2E evidence captured when UI flows were in scope (`AGENTS.md` testing policy)

If gates fail, set `보류` with blocker note — do not leave finished work in `진행중`.

## 3g Report

- Task ID, what changed (repo + Notion)
- PR URL and merge status
- Verification commands and results
- Reconcile delta / P0–P1
- Notion status applied (`완료` / `보류`)
