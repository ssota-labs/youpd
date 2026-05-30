# Reconciliation log (Notion only)

**Do not** save reconciliation reports under the repo. The durable record is **one Notion page per run** in the docs database.

## Where to file

| Field | Value |
|---|---|
| Database | [유PD 개발 문서](https://www.notion.so/paxhumana/5ac346dac45682cf98ed815c25b32d38) (`data_source_id`: `b2a346da-c456-8251-a5c9-876afa9c62ef`) |
| `태그` | `정합성` (add to DB options if missing) |
| `상태` | `확정` |
| Page title | `정합성 체크 — YYYY-MM-DD` (audit date; one page per run) |

Link the new page from an open VERF task or standing reconciliation task via `관련 문서` when one exists (optional).

## Page body (minimal)

```markdown
## 실행 요약

- **Repo:** ssota-labs/youpd @ `dev`=`abcdef1`, `main`=`fedcba9`
- **범위:** 개발 태스크 DB 전체 (모든 `상태`) — or user-narrowed scope
- **스캔 행 수:** N
- **Open PRs (base dev):** N

## 수행한 축

- [x] A — Task ↔ Code
- [x] B — Doc ↔ Code
- [x] C — Task ↔ Doc
- [x] D — Task ↔ Git / PR
- [x] E — Dependency graph

## 결과 요약 (한 줄)

P0: n | P1: n | P2: n | P3: n — top finding in one line if any P0/P1
```

Uncheck axes that were **out of scope** for this run. Do not paste long P0/P1 tables unless the user asked.

## Chat reply

After filing Notion, summarize in chat: Notion page URL, axes run, P0/P1 counts, top fixes, and any task status updates applied (`완료` on the reconciliation/VERF task when gates pass; `보류` on drift rows when unambiguous).
