# Reconciliation checklist

Scope default: **full** development task database + `dev` at audit revision (+ `main` for release-line checks).

## Severity

| Level | Meaning | Example |
|---|---|---|
| **P0** | Wrong agent/human action likely | `완료` IMPL, no matching code on `dev`; IMPL with no linked PRD/Tech Spec |
| **P1** | SSOT trust degraded | Tech Spec contradicts merged migrations; `보류` without blocker note; open merge conflict on task branch |
| **P2** | Hygiene | Stale `AGENTS.md`; orphan doc not linked to any task |
| **P3** | Doc quality | PRD contains migration SQL; ADR edited in place |

## Axis A — Task ↔ Code

For each row with `작업 유형` = `구현` or `검증`:

| Check | P0 if |
|---|---|
| `완료` | Expected artifacts absent on `dev` (schema, routes, MCP tools, tests per Tech Spec/IMPL title) |
| `진행중` | No branch/PR activity and no WIP note on task |
| `대기` | Blocking relations claim predecessor `완료` but predecessor code missing |

Implementation truth branch: **`dev`** (integration). **`main`** only when task explicitly tracks release promotion.

## Axis B — Doc ↔ Code

For each page in `관련 문서` on IMPL/VERF/Spec-related tasks:

| Doc `태그` | Check |
|---|---|
| `설계` (Tech Spec) | Tables, routes, env vars match `dev` — `packages/db`, `apps/web`, `apps/mcp`, `packages/api` |
| `스펙` | Current Contract section matches merged code; tests cited in doc exist |
| `PRD` | No implementation-only APIs that contradict Tech Spec/code without open question |

## Axis C — Task ↔ Doc links

| Check | P0 if |
|---|---|
| IMPL / VERF | Zero linked PRD or Tech Spec |
| PRD / 설계 tasks | `완료` but linked doc empty or missing |
| Any task | Linked doc `태그` mismatches work type (PRD content under `설계`) |

## Axis D — Task ↔ Git / PR

| Check | P1 if |
|---|---|
| Task `진행중` + IMPL | No open PR to `dev` and no local branch matching task ID pattern |
| Open PR to `dev` | Merge conflicts, failing required checks, or draft with no activity |
| Multiple open PRs | Same milestone or overlapping scope without explicit split |

Branch naming convention: `feat/<task-slug>`, `fix/<task-slug>`, or `cursor/<id>` — link PR body to Notion task URL.

## Axis E — Dependency graph

| Check | P1 if |
|---|---|
| `Blocked by` / `종속성` | Names predecessor whose IMPL not `완료` and code absent on `dev` |
| Blueprint / roadmap | Version in task title not reflected in SaaS Blueprint scope |

## Scheduler default prompt

```text
정합성 체크해줘. 개발 태스크 DB 전체, dev 최신 기준.
```

After the run, file a Notion log page (`태그` = `정합성`) — see [report-template.md](report-template.md). Do not save reports in the repo.

## Out of scope (unless explicit)

- Vercel preview env parity
- Production Supabase branch drift
- End-user product runtime (Notion workspace pages owned by customers)
