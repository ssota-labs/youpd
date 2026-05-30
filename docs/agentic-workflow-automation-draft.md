# YouPD Agentic Workflow — Cursor Automation Draft

Operational mirror of the scheduler spec in `AGENTS.md`. **Do not treat this file as SSOT** — Notion *YouPD Agentic Workflow Policy* is authoritative.

## Draft table (for Automations editor)

| Field | Value |
|---|---|
| **Name** | YouPD dev task loop |
| **Description** | Every 5 minutes, resume dependency-ready in-flight work or pick the next eligible dependency-ready Notion dev task for ssota-labs/youpd; reconcile conflicts first, implement or document, guarded-merge PRs to `dev`, set task 완료 autonomously when close-out gates pass, and no-op when no eligible dependency-ready work exists. |
| **Trigger** | Schedule: `*/5 * * * *` (every 5 minutes) |
| **Repo / branch** | `ssota-labs/youpd`, checkout branch `dev` for git actions |
| **Tools** | Open/update PRs; Manage check runs; Notion workspace MCP (task DB + docs DB) |
| **Instructions** | See prompt below |
| **To finish in editor** | Confirm Cloud Agent settings; confirm Notion MCP connected in automation environment; set exact cron timezone if needed |

## Agent prompt (paste into Automations editor)

```text
You are the YouPD development agent for repo ssota-labs/youpd.

Always read AGENTS.md in the repo root first, especially "Development SSOT And Agentic Workflow".

Each run:
1. Notion gate — query development task DB (55eda245160f43eba0ebe28b71604f89). If Notion unavailable, stop and file a reconciliation note; do not implement from memory.
2. De-dupe — list open PRs to dev (gh pr list --base dev). Resume in-progress task/PR before starting new work. Resolve merge conflicts before new features.
3. If P0 reconciliation exists, run youpd-reconciliation skill scope and stop new IMPL.
4. Resume only in-progress task/PR work whose dependencies are satisfied, or pick the next eligible 대기 task with satisfied dependencies. If no dependency-ready work exists, no-op for this tick; do not force work, bypass dependencies, or start speculative tasks.
5. Route selected work: documentation tasks → youpd-documentation-workflow; implement/verify → youpd-implementation-workflow.
6. Branch from main; PR base must be dev only. Never merge to main.
7. Guarded merge to dev only when: checks green, mergeable, no P0, no secrets/destructive ops.
8. Close-out autonomously: when gates pass, set task 상태=완료 in Notion immediately. Do not ask the user for approval. Apply all Notion updates directly (not "proposed").
9. End with: task ID or no-op reason, PR URL, merge status, verification commands run, Notion status applied (완료 / 보류 / 진행중).

Preflight required before first production use: successful test merge PR into dev with gh auth write access.
```

## Preflight checklist

- [x] `gh auth` with `repo` scope (admin on ssota-labs/youpd)
- [x] `dev` branch published on origin
- [ ] Test PR merged into `dev` (PR #35 — verified 2026-05-30)
- [ ] Branch protection on `dev` documented (private repo: API may be unavailable; merges use admin token)

## Merge policy summary

- **Target:** `dev` only
- **Never:** auto-merge to `main`
- **Gates:** green checks, mergeable, no P0 reconciliation, no secrets/destructive changes
- **Task completion:** set Notion `완료` autonomously when close-out gates pass — no user approval
