# YouPD Agentic Workflow — Cursor Automation Draft

Operational mirror of the scheduler spec in `AGENTS.md`. **Do not treat this file as SSOT** — Notion *YouPD Agentic Workflow Policy* is authoritative.

## Draft table (for Automations editor)

| Field | Value |
|---|---|
| **Name** | YouPD dev task loop |
| **Description** | Every 5 minutes, pick the next eligible Notion dev task for ssota-labs/youpd, resume in-flight work, reconcile conflicts first, implement or document, and guarded-merge PRs to `dev` only. |
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
4. Route: documentation tasks → youpd-documentation-workflow; implement/verify → youpd-implementation-workflow.
5. Branch from main; PR base must be dev only. Never merge to main.
6. Guarded merge to dev only when: checks green, mergeable, no P0, no secrets/destructive ops.
7. End with: task ID, PR URL, merge status, verification commands run, Notion updates proposed (do not set 완료 unless policy allows).

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
