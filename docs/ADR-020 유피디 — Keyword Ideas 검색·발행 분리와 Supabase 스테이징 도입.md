# ADR-020 유피디: Keyword Ideas 검색·발행 분리와 Supabase 스테이징 도입

> **태그**: `ADR` · `엔지니어링`
> **수명**: 불변 — 결정 순간 그대로 보존
> **독자**: 미래의 우리 자신
> **명명**: ADR-020 유피디: Keyword Ideas 검색·발행 분리와 Supabase 스테이징 도입

---

> 🧭 **제품**: 유피디 제품 개요
> **결정일**: 2026-05-18
> **관련 문서**: 유피디 v0.9 기획안 · 유피디 v0.9 설계문서 · [PR #17](https://github.com/ssota-labs/youpd/pull/17)

---

## 1. 상태

`Accepted`

## 2. 맥락

v0.8 까지 운영되던 `trackKeywordIdeasDue` 노션 워커 툴은 한 keyword 의 YouTube 검색·노션 upsert 전 과정을 단일 capability 호출에서 처리했다. 두 가지 platform 한도가 충돌하면서 모든 사이클이 실패한다.

- **Notion Workers**: 단일 capability 실행 시간 **60초 ceiling** (공식적으로 명시되지는 않으나 프로덕션 에러 `Worker operation 'runCapability' timed out after 60000ms` 로 확인).
- **Notion API**: [평균 **3 req/sec** 글로벌 한도](https://developers.notion.com/reference/request-limits). 모든 플랜 공통, 상향 옵션 없음.

코드 trace 결과 keyword 1개 처리 비용은 `~3R + 10` Notion calls (R = `results_per_keyword`). 운영자가 제품 요구사항으로 **사이클당 R=300 누적**을 명시했기에 R 축소는 채택할 수 없고, 산술상 5분+ 가 필요해 60초 ceiling 을 어떤 단일 호출에서도 통과할 수 없다.

YouTube `search.list` 의 `nextPageToken` 은 수시간 내 만료되므로 “사이클 사이에 page 4 이어 받기” 식의 분할도 불가능하다.

## 3. 검토한 대안들

| 대안 | 장점 | 단점 |
| --- | --- | --- |
| **A. `results_per_keyword` 30 으로 축소 (스냅샷 모델)** | 변경 1줄. Notion 호출 ~100건 → 60초에 안정 수렴. YouTube quota 6배 절감. | 운영자가 명시한 “R=300 누적” product requirement 위반. 트래킹 시계열 신호 약해짐. |
| **B. Notion 배치 lookup (`findPageIdsByRichTextIn`) 만 도입** | 1 파일 변경. R=50 까지는 60초 안에 들어옴. | R=300 에서는 여전히 ~500+ calls / 165s 필요. 60초 ceiling 못 통과. |
| **C. nextPageToken 분할 + Notion 컬럼 추가** | 사이클당 R=300 누적 가능. Supabase 없이 끝낼 수 있음. | YouTube nextPageToken 만료로 사이클 간 분할 자체가 불가능. Notion 컬럼 추가 + 진행 상태 enum 도입으로 스키마 복잡도만 증가. |
| **D. Vercel Cron → Notion Worker capability HTTP 호출** | cron 으로 자동 트리거. | capability 자체가 60초 ceiling → cron 으로 호출해도 같은 timeout. |
| **E. 로직 전체를 Vercel Function 으로 이전 (Fluid Compute, maxDuration 300s)** | capability ceiling 우회. 단일 함수로 끝. | Notion workspace OAuth, 8개 데이터 소스 env, agent UI surface 재구성 비용 큼. Notion 컨텍스트의 가치 손실. |
| **F (채택). 검색·발행 분리 + Supabase 스테이징** | YouTube fetch 1회 + Supabase 적재 (~9s) → 노션 발행을 청크 단위 (~30s × N) 로 분할. 모든 단일 capability 실행이 60초 이내. Supabase 가 다른 컨슈머의 SSOT 까지 됨. | 신규 스키마 5개 + REST 라우트 5개 + 노션 워커 helper · 툴 2개 추가. PR 분량 ~1,600 LOC. 두 툴 사이의 호출 흐름을 Custom Agent 가 이해해야 함. |

## 4. 결정

**검색(fetch)과 발행(publish)을 두 개의 노션 워커 툴로 분리하고, 그 사이에 Supabase 를 캐노니컬 스테이징 레이어로 둔다.**

결정적 이유:

1. **R=300 누적과 60초 ceiling 을 동시에 만족하는 유일한 구조** — 다른 대안은 한쪽을 포기해야 한다.
2. **YouTube quota 효율 보존** — 한 사이클당 search.list 6회만 호출. 분할 대안 (C) 이 깨지면 quota 가 N배 증가할 위험을 회피.
3. **Notion 컨텍스트 보존** — Notion workspace OAuth · agent UI surface · 8개 데이터 소스 env 매핑을 그대로 유지. 워커는 capability 레이어로서 가벼움.
4. **부수 효과로 SSOT 확보** — canonical `videos`/`channels` 가 다른 컨슈머 (대시보드·분석·다른 자동화) 의 직접 조회 대상이 된다. 제품 로드맵의 후속 단계와 정렬.

## 5. 결과 · 예상되는 영향

- **긍정적**:
    - 모든 단일 capability 실행이 60초 이내로 안정 수렴.
    - `videos.notion_page_id` 캐싱 + `notion_relation_synced` junction flag 로 부분 실패 시 멱등 재호출 가능.
    - Supabase canonical 테이블이 비-Notion 컨슈머를 위한 SSOT 로 작동.
    - YouTube quota 사이클당 ~610 units 로 고정 (분할 없음).
- **부정적**:
    - 신규 스키마 (5 tables) + REST endpoints (5) + worker tools (2) + helpers + 마이그레이션 + 테스트 — 한 사이클 PR 으로 ~1,600 LOC.
    - Notion Custom Agent 가 두 툴 호출 흐름을 이해해야 함 (`harvestKeywordIdea` 결과의 `harvest_id` 를 `publishHarvestToNotion` 으로 전달, `has_more=false` 까지 반복). instruction 갱신 필요.
    - Supabase 비용 — 사이클당 ~320 rows. canonical 테이블은 dedup 으로 누적 증가율 낮으나 long-term 백업 정책 필요.
    - 노션 워커 SDK 가 향후 schedule/cron 을 추가하더라도 두 툴 분리 구조는 유지된다 (역으로 통합 안 되도록 명시적 설계).
- **후속 이슈**:
    - 사이클 간 동일 video 의 시점 컬럼 (`마지막 수집일` 등) 누적 방식 결정 — v0.10 ADR 후보.
    - Tool A 도중 Notion 상태 업데이트 실패 시 회복 경로 — `findActiveHarvest` 기반 자동 재개 검토.
    - 노션 워커 capability error 로깅·알림 자동화 (현재는 수동 점검).
    - YouTube 결과 일관성 — 같은 keyword 의 두 사이클 결과를 비교하는 시계열 컬럼 도입은 별도 결정.
