---
name: youpd-documentation-workflow
description: Write or update YouPD Notion documentation — SaaS Blueprint, PRD, D3 설계, Policy, ADR, dedicated Spec/릴리즈 노트 tasks. Use after AGENTS.md routes "work" to documentation. Not for small Spec patches during implementation (use youpd-implementation-workflow Close-out).
---

# YouPD Documentation Workflow

Primary deliverable is a **Notion document** in [유PD 개발 문서](https://www.notion.so/paxhumana/5ac346dac45682cf98ed815c25b32d38). Small **Spec/Policy** patches from a single implementation PR → [youpd-implementation-workflow](../youpd-implementation-workflow/SKILL.md) Close-out.

**Source SSOT:** [제품 문서화 가이드](https://www.notion.so/ada346dac45682dca9f001cfff8ae0fc) and `.cursor/skills/youpd-dev-docs/SKILL.md`.

## Databases

- Tasks: `https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513`
- Docs: `https://www.notion.so/5ac346dac45682cf98ed815c25b32d38` — set `태그`, link via task `관련 문서`

## Session workflow

1. Task row(s) already loaded via AGENTS router.
2. Classify document type (below).
3. Read dependencies per preconditions.
4. Draft/update Notion; correct `태그` and templates.
5. Link `관련 문서`; `진행중` when starting, `보류` if blocked (with blocker note).
6. **Close-out (autonomous)** — when deliverable is done, set `상태` to **`완료`** immediately. Do not ask the user for approval.
7. Summarize: task ID, doc URL(s), `태그`, Notion status applied.

### Autonomous completion gates

Set **`완료`** when **all** apply:

- Linked doc exists in docs DB, is non-empty, and uses the correct `태그`
- Task is linked via `관련 문서`
- Task body acceptance criteria are met (PRD scope, D3 contracts, Blueprint section, etc.)

If blocked (missing predecessor, empty dependency doc), set **`보류`** with a note — do not wait for human sign-off.

Do **not** edit `dev`/`main` except to read for Spec accuracy.

## When to use this skill

| Route here | Use implementation skill instead |
|---|---|
| `작업 유형` = PRD 작성, 설계 작성, 상세 로드맵 작성 | `구현`, `검증` |
| SaaS Blueprint, Policy, ADR, version PRD/D3 | Small Spec patch (one topic, same PR) |
| Dedicated Spec restructure / large contract rewrite | — |

## Document types

| Document | Lifetime | Role |
|---|---|---|
| **SaaS Blueprint** | Product phase | Web SaaS surface, domain model, route/API map, version cuts |
| **Policy** | Cumulative | Agentic workflow, merge rules, RLS, metering, MCP OAuth |
| **Spec** | Living | Current implementation contract |
| **D2 PRD** | Frozen at release | Why/what for one sprint/version |
| **D3 Tech Spec** | Frozen at release | What to implement this version |
| **D4 Release Notes** | Cumulative | Shipped vs plan |
| **D5 ADR** | Immutable | One major decision |

**Overlap rule:** longest-lived doc wins — Blueprint for phase map, Policy for recurring rules, Spec for current contracts.

## Dependency order

SaaS Blueprint → (Policy) + PRD → D3 → Implementation → Spec / Release notes. ADR at decision time.

| Work type | Can start when |
|---|---|
| SaaS Blueprint | Product direction accepted (PDR / idea doc read) |
| Policy | Recurring rule identified |
| D2 PRD | Blueprint exists (or user asks to draft Blueprint first) |
| D3 | PRD accepted; Policy/Blueprint read |
| Topic Spec | Code/migrations/tests exist on `dev` |
| D4 | Version shipped to `main` |

## Deliverables by type

### SaaS Blueprint

Web app scope, Notion-backed workspace, YouTube capture, Supabase account layer, MCP tools, domain model, route/API map, sprint cuts. Name: `YouPD SaaS Technical Blueprint` (not "Phase 1").

### D2 PRD

User scenarios, scope in/out, success metrics, open questions → D3. **No** Drizzle schema, API handlers, migration SQL.

### D3 Tech Spec

Data model, interfaces, algorithms, verification plan for **this version only**. **No** product-wide scope (→ Blueprint/Policy).

### Topic Spec

**Current Contract** from `dev`; **Not Implemented**; **Validation** (tests); **Change Log**.

### Policy / D4 / D5

Cumulative rules; ship report; `[ADR-NNNN]` immutable decision.

## Task DB mapping

| `작업 유형` | Section |
|---|---|
| 상세 로드맵 작성 | SaaS Blueprint |
| PRD 작성 | D2 PRD |
| 설계 작성 | D3 |
| 구현 / 검증 | → implementation skill |

## Notion `태그`

| Type | `태그` |
|---|---|
| SaaS Blueprint | `제품 로드맵` |
| Policy | `정책` |
| PRD | `PRD` |
| D3 | `설계` |
| Spec | `스펙` |
| Release | `릴리즈 노트` |
| ADR | `ADR` |
| Guide | `가이드` |
| Reconciliation log | `정합성` |

## Anti-patterns

- Full product schema in one D3 → Blueprint + per-version D3 cuts
- Recurring agent/merge rules in every D3 → Policy (`YouPD Agentic Workflow Policy`)
- Unimplemented Blueprint items in Spec → Not Implemented section
- Implementation results in PRD → D4 or Spec
