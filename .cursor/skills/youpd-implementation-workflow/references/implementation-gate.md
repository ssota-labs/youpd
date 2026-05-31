# Implementation gate

Run **before** editing `packages/db`, `apps/web`, `apps/mcp`, `packages/api`, or shared UI.

## Checklist

1. **Task located** — current row in [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513); read `Blocked by`, `Blocking`, `종속성`, `상태`, `관련 문서`.
2. **PRD + Tech Spec linked** — version PRD and Tech Spec (`설계`) exist in docs DB and appear in `관련 문서`. Empty pages do not count.
3. **Predecessors** — prior task(s) in `종속성` are `완료` **and** expected artifacts exist (doc in docs DB for DSGN/PRD; code on `dev` for IMPL).
4. **De-dupe** — no overlapping open PR to `dev` for the same task; no duplicate branch for same task ID.
5. **Notion reachable** — if Notion MCP fails, switch to reconciliation/documentation; do not implement from memory.
6. **Override** — only if user explicitly accepted risk after a gap report (record in PR/commit).
7. **On failure** — do not open a “starter” implementation PR.

## Blocker template

```markdown
Cannot start implementation yet.

Selected candidate: [task ID / title]
Blocked by:
- [missing or blank PRD / Tech Spec / ADR]
- [Notion Blocked by relation or incomplete predecessor]
- [repo vs Notion contract mismatch, if any]
- [duplicate open PR / branch for same task]

Next recommended action:
- [PRD / DSGN / ADR task or doc to complete first]
- [resolve existing PR conflict before new work]
```
