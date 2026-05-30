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
- Move task to `진행중` when starting; `보류` if blocked
- Optional: note PR URL and branch on task page body

## 3c Small Spec / Policy (in this workflow)

Update here (do **not** open youpd-documentation-workflow) when **all** apply:

- Change shipped in the same PR/session
- One topic Spec area (or one Policy rule)
- Update limited to Current Contract + Change Log (and tests reference)

## 3d Reconcile delta

Compare task `상태` and title to code on `dev`:

| Finding | Severity |
|---|---|
| Code merged to `dev` but task not ready for `완료` proposal | P2 |
| User asked `완료` but code missing on `dev` | P0 |
| D3/Spec clearly contradicts merged code | P1 |

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

## 3f Report

- Task ID, what changed (repo + Notion)
- PR URL and merge status
- Verification commands and results
- Reconcile delta / P0–P1
- Whether `완료` can be proposed (only if user asked)
