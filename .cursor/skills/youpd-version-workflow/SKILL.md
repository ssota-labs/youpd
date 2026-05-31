---
name: youpd-version-workflow
description: Deprecated router alias — use AGENTS.md Development router first, then youpd-reconciliation, youpd-documentation-workflow, or youpd-implementation-workflow. Kept for backward compatibility with slash commands and older rules.
---

# YouPD Version Workflow (router alias)

> **Prefer `AGENTS.md` → Development SSOT And Agentic Workflow** for all new work. This file is a thin compatibility wrapper; detailed procedures live in the specialized skills below.

## Read first (mandatory)

1. **`AGENTS.md`** — Development router (Notion gate, scheduler loop, de-dupe, merge policy).
2. Query the [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513).

## Route to specialized skills

| Intent | Skill |
|---|---|
| 정합성, reconciliation, drift | `.cursor/skills/youpd-reconciliation/SKILL.md` |
| PRD, Tech Spec, Blueprint, Policy, ADR docs | `.cursor/skills/youpd-documentation-workflow/SKILL.md` |
| 구현, 검증, PR to `dev` | `.cursor/skills/youpd-implementation-workflow/SKILL.md` |
| Notion doc authoring details | `.cursor/skills/youpd-dev-docs/SKILL.md` |

## Legacy reference

The sections below remain for agents that still load this skill directly. New edits belong in the specialized skills or `AGENTS.md`.

---

# YouPD Version Workflow (legacy body)

Use this skill to select and execute the next **YouPD (유피디)** development unit from the Notion task database.

Notion task database (shared with youpd-skills):
`https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`

## Progressive References

Before classifying a task as PRD, 설계, 스펙, or 구현, read:

- [references/documentation-workflow.md](references/documentation-workflow.md) — document types, dependency order, and per-type deliverables (from [제품 문서화 가이드](https://www.notion.so/ada346dac45682dca9f001cfff8ae0fc))
- `.cursor/skills/youpd-dev-docs/SKILL.md` — when creating or updating PRD, 설계, ADR, or other docs in the **유PD 개발 문서** database

## Core Rule

**Always read Notion before acting.** Do not plan or implement from repo memory or stale local docs alone.

The work unit may be **documentation** (Blueprint, Policy, PRD, Tech Spec, Spec, release notes, ADR) or **implementation** (code in `apps/*`, `packages/*`). Do not start implementation until roadmap, PRD, and Tech Spec are complete or explicitly accepted.

Normal sequence:

1. Phase roadmap / Blueprint
2. Cumulative Policy (when recurring rules emerge)
3. Phase-version PRD (D2)
4. Phase-version design (Tech Spec)
5. Phase-version development
6. Topic Spec updates and release notes (after or alongside implementation)

If a predecessor is missing, blocked, or ambiguous, stop and report the dependency gap instead of proceeding.

## Workflow

### 1. Read The Notion Task Database

Use the Notion MCP/database tools (or `notion-cli`) to inspect the task database **before coding or drafting docs**.

Identify:

- Current phase and version in progress
- Candidate next version
- Task status fields
- Dependency/predecessor fields
- Links to roadmap, PRD, and design documents
- Any explicit blockers or owner notes

If the database schema is unclear, fetch the database/source schema first, then query rows.

Filter or select tasks for **YouPD (유피디)** when the database mixes products. Prefer rows whose title, product field, or linked docs clearly belong to this monorepo.

### 2. Determine The Next Work Unit

Read [references/documentation-workflow.md](references/documentation-workflow.md) and classify the task type before proceeding.

Choose the next work unit by dependency order, not by convenience.

Rules:

- A **development** task can start only if its roadmap, PRD, and Tech Spec design tasks are complete or explicitly accepted.
- A **Tech Spec (설계)** task can start only if its phase-version PRD is complete or explicitly accepted.
- A **PRD** task can start only if the phase roadmap/Blueprint exists or the user explicitly asks to draft the roadmap first.
- A **Spec** task updates topic-level current contracts from implemented code — it is not a substitute for PRD or Tech Spec. Read migrations, route handlers, MCP tools, and tests on `main`.
- A **Blueprint** or **Policy** task may precede or run parallel to version PRD/Tech Spec when phase-wide context or recurring rules are needed.
- If multiple eligible tasks exist, prefer the lowest unfinished phase-version number.
- If the current version is already in progress, continue it before starting a new version unless the user says otherwise.

### 3. Read The Required Context

Before creating a plan, read documents matching the classified work type (see [references/documentation-workflow.md](references/documentation-workflow.md)):

| Work type | Read |
|---|---|
| PRD | Phase roadmap/Blueprint, D1 product overview |
| Tech Spec design | Version PRD, Blueprint, applicable Policy |
| Spec | Current code on `main`, migrations, MCP tools, tests |
| Implementation | Roadmap, PRD, Tech Spec, plus repo docs below |

Always read for implementation and spec work:

- `AGENTS.md`
- Local product specs in `docs/` (Notion remains authoritative if they diverge)
- Relevant current code on `main`

For YouPD implementation, also read relevant packages:

- `apps/mcp/` — MCP tools, OAuth, remote transport
- `apps/web/` — Next.js surface, API routes, OAuth callbacks
- `packages/api/` — shared contracts, orchestration
- `packages/db/` — Drizzle schema and migrations
- `packages/supabase/` — Supabase adapters
- `docs/testing.md` — verification workflow

Do not plan from Notion alone. Plans for implementation and spec work must reflect the current code on `main`.

### 4. Produce A Concrete Plan

Before editing code or Notion docs, summarize:

- Selected phase-version and **task type** (PRD / Tech Spec / Spec / implementation / other)
- Notion task row(s) used
- Dependency status
- Documents read (Notion + repo)
- Current-code findings (for Spec and implementation)
- Deliverables or files likely to change
- Verification commands (for implementation)
- Risks or open questions

Keep the plan specific enough that another agent could execute it.

### 5. Execute Conservatively

For **implementation**, follow project rules in `AGENTS.md`:

- Hexagonal architecture: domain in `packages/*`, frameworks at edges
- Drizzle ORM in `packages/db` is schema SSOT
- Zod 4 at package and network boundaries
- MCP tools in `apps/mcp` with typed contracts
- Enforce plans, rate limits, and usage before expensive YouTube/Notion calls
- Never commit secrets, `.env*`, or local Supabase keys

For **PRD, Tech Spec, Spec, Policy, Blueprint, ADR**, follow `youpd-dev-docs` and [references/documentation-workflow.md](references/documentation-workflow.md). Do not mix document types (e.g. implementation detail in PRD, unimplemented Blueprint items in Spec).

### 6. Verify

Run at minimum after substantive code changes:

```bash
pnpm typecheck
pnpm test
pnpm lint
```

For API, MCP, or Supabase changes, also run integration tests when applicable:

```bash
pnpm test:integration   # requires local Supabase — see docs/testing.md
```

For web UI flows, run E2E when the change touches critical paths:

```bash
pnpm test:e2e
```

Do not claim verification success unless commands actually ran and passed.

### 7. Report Back

End with:

- What version/task was worked on
- Notion task row(s) and linked SSOT docs consulted
- What changed
- Dependency assumptions
- Verification results
- Notion status applied (`완료` / `보류` / `진행중`) per AGENTS.md autonomous task completion

When close-out gates pass, set task `상태` to **`완료`** in Notion immediately. Do not ask the user for approval.

## Blocker Response Template

If dependencies are not satisfied, respond with:

```markdown
Cannot start implementation yet.

Selected candidate: [phase-version/task]
Blocked by:
- [missing/incomplete dependency]
- [missing PRD/design link, if any]

Next recommended action:
[roadmap/Blueprint/PRD/Tech Spec/Spec task to do first — see references/documentation-workflow.md]
```

## Related Skills

| Skill | When |
|-------|------|
| `youpd-dev-docs` | Authoring/updating PRD, 설계, ADR in **유PD 개발 문서** |
| `ssota-ontology-setup` | Notion SSOT mapping, DB IDs, project anchors |
| `notion-cli` | Terminal/API Notion queries |
| `mcp-builder` | MCP server and tool design |
| `prd` | PRD content quality |
