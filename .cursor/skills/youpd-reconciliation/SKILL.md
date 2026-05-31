---
name: youpd-reconciliation
description: Run development SSOT reconciliation for YouPD (ssota-labs/youpd) — Notion task database, linked docs, repo dev/main, and open PRs. Use when the user asks for 정합성 체크, reconciliation, drift audit, or when a scheduler runs periodic consistency checks.
---

# YouPD Reconciliation

Reconcile **Notion development SSOT** with **repo state** (`dev` integration branch and `main` release line). Default scope is the **entire** development task database (all rows, all statuses), unless the user narrows scope in chat.

## Prerequisites

- Notion MCP connected (AGENTS.md gate must already have passed).
- Know current revisions: `git rev-parse dev` and `git rev-parse main`.
- List open PRs targeting `dev`: `gh pr list --base dev --state open`.

## Progressive references

Read before executing checks:

- [references/checklist.md](references/checklist.md) — axes, severity, per-row checks
- [references/report-template.md](references/report-template.md) — output format

## Workflow

### 1. Load full task database

Query the [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513) with **no status filter** unless the user explicitly limited scope.

For each row (or paginate until complete), capture at minimum:

- Title / task ID
- `상태`, `작업 유형`
- `Blocked by`, `Blocking`, `종속성`
- `관련 문서` (linked PRD, Tech Spec, Spec, etc.)

### 2. Run reconciliation axes

Apply [references/checklist.md](references/checklist.md) across **all** loaded tasks:

- **A** Task ↔ Code (`완료` vs merged code on `dev`/`main` per task type)
- **B** Doc ↔ Code (linked Spec/Tech Spec vs `packages/db`, `apps/*`, tests)
- **C** Task ↔ Doc (`관련 문서`, empty PRD/Tech Spec on IMPL)
- **D** Task ↔ Git (open PR, branch naming, merge conflicts vs task claim)
- **E** Dependency graph (predecessors in Notion vs code)

### 3. File run log in Notion (required)

After every reconciliation run, create **one** page in [유PD 개발 문서](https://www.notion.so/paxhumana/5ac346dac45682cf98ed815c25b32d38) per [references/report-template.md](references/report-template.md):

- `태그` = **`정합성`**
- Title `정합성 체크 — YYYY-MM-DD`
- Body: scope, `dev`/`main` SHAs, axes run, row count, one-line P0–P3 counts

**Do not** write reconciliation reports to the repo. Notion is the only durable log.

### 4. Report back in chat

Share the Notion URL, P0/P1 counts, top fixes, and task status updates applied.

When this run is closing out a dedicated **검증** or reconciliation task row, set that task to **`완료`** after the Notion log is filed — do not ask the user. For drift found on other rows, apply **`보류`** or doc/IMPL fix tasks directly when the fix is unambiguous; otherwise note in the reconciliation log only.

## P0 policy

If **P0** exists (e.g. `완료` IMPL but code missing; empty PRD/Tech Spec on active IMPL; task claims merged but no PR on `dev`), recommend blocking new implementation until resolved. Scheduler runs should prefer reconciliation/fix tasks over new feature work.
