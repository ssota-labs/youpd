# YouPD 테스팅 가이드

운영 SSOT는 Notion이지만, **로컬에서 테스트를 돌리는 절차**는 이 파일을 기준으로 합니다. 에이전트는 `AGENTS.md` → 이 문서 순으로 참고하세요.

> **Agent HTTP surface (v1.5+)**: 유저/에이전트는 **MCP only** (`apps/mcp`). 스케줄 수집은 **`/api/cron/youpd/*`** (Bearer `CRON_SECRET`). Public REST `/api/youpd/rest/*`는 제거됨.

## 테스트 피라미드 (이 레포 기준)

| 층 | 무엇을 검증하나 | 어디에 있나 | 실행 |
|----|----------------|------------|------|
| **Unit** | 순수 로직, Zod, MCP 도구(YouTube/DB **mock**), 워크플로 orchestration mock | `packages/**`, `apps/**` 의 `*.test.ts` | `pnpm test` |
| **Integration** | 패키지 경계 + **로컬 Supabase** + Drizzle repository / Route Handler (실 DB, YouTube는 mock) | `**/*.integration.test.ts` | `pnpm test:integration` |
| **E2E** | web + admin + mcp dev 서버 기동 후 HTTP 스모크 | `e2e/*.spec.ts`, Playwright | `pnpm test:e2e` |

```text
        ┌─────────────┐
        │  E2E (few)  │  Playwright: /api/health, web /
        ├─────────────┤
        │ Integration │  로컬 Supabase + repository / API (구축 예정)
        ├─────────────┤
        │ Unit (many) │  vitest + vi.mock
        └─────────────┘
```

---

## 0. 사전 요구

- Node.js 24 (`nvm`)
- `pnpm install` (루트)
- [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker (로컬 DB)
- Playwright 브라우저 (E2E 최초 1회): `pnpm exec playwright install chromium`

---

## 1. 로컬 env 연결 (git worktree)

워크트리는 `.gitignore` 된 env를 **복사하지 않습니다.** 새 worktree마다:

```bash
pnpm install
pnpm worktree:env
```

메인 클론(`/Users/titanism/projects/youpd` [main] 등)에서 아래 4개를 **심볼릭 링크**합니다.

| 파일 | 용도 |
|------|------|
| `.env.local` | 루트 공통 (turbo / 스크립트) |
| `apps/web/.env.local` | Next.js web (`next dev`가 여기만 로드) |
| `apps/web/.env.youtube` | YouTube 키 풀 → `pnpm youtube:keys:sync` |
| `apps/mcp/.env.local` | MCP 서버 |

- 메인 경로 override: `export YOUPD_MAIN_WORKTREE=/path/to/main/clone`
- 워크트리별 포트 분리: `pnpm worktree:env -- --copy` 후 해당 파일만 수정

메인 클론에 env가 없으면:

```bash
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/mcp/.env.example apps/mcp/.env.local
# apps/web/.env.youtube 는 YouTube 키 변수를 직접 작성
```

---

## 2. Supabase 로컬 기동 · reset · seed

### 기동

```bash
pnpm db:up          # supabase start
pnpm db:reset       # supabase db reset --local (migration + seed)
```

`db:reset` 후 `supabase/seed.sql` 이 적용됩니다. 예: `health_checks` 에 `liveness=ok` (admin `/api/health` E2E·integration에서 사용).

### 연결 정보 확인

```bash
supabase status
supabase status -o env    # ANON_KEY, SERVICE_ROLE_KEY, DATABASE_URL
supabase status -o json   # Playwright e2e/load-supabase-env.ts 가 사용
```

### 로컬 기본값 (CLI 기본 포트)

```bash
SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# 로컬 demo JWT (모든 supabase start 설치에서 동일 — 프로덕션 금지)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

기타 URL: Studio `http://127.0.0.1:54323`, Mailpit `http://127.0.0.1:54324`.

CLI가 **Publishable / Secret** 키만 보여주는 경우에도, 앱 env 이름은 위 JWT 변수를 쓰면 됩니다 (`supabase status -o env` 권장).

### YouTube 키 DB 동기화 (integration / MCP 전)

```bash
pnpm youtube:keys:sync   # apps/web/.env.youtube → youtube_api_keys
```

`DATABASE_URL` 이 `apps/web/.env.local` 에 있어야 합니다.

### 종료

```bash
pnpm db:down
```

---

## 3. Unit 테스트

```bash
pnpm test                              # turbo: 워크스페이스별 vitest
pnpm --filter @youpd/api test
pnpm --filter @youpd/web test
pnpm typecheck
pnpm lint
```

**특징**

- `@youpd/api` MCP 도구: `makeClient()` 로 YouTube HTTP mock, `vi.mock('@youpd/supabase/repositories/...')` 로 DB mock.
- 워크플로: `fetchTrendingYouTubeVideos` 등 foundation mock — **실 Supabase 없음**.
- `apps/web/src/lib/supabase-fetch.test.ts`: Supabase Auth **REST** 를 `globalThis.fetch` mock (아래 §Stub).

변경 후 최소 권장: 관련 패키지 `test` + `typecheck`.

---

## 4. Integration 테스트 — 이 레포에서 무엇을 할까

`AGENTS.md` 의 integration 은 **“mock 없이 또는 최소 mock으로 경계를 건너는 테스트”** 를 뜻합니다. 루트 `vitest.integration.config.ts` + `pnpm test:integration` 으로 실행합니다.

### 4.1 대상 (우선순위)

1. **`packages/supabase` repositories** — `getDbClient()` + 로컬 `DATABASE_URL`, migration/seed 반영 후 `upsertHotVideos`, `queryHotVideos`, quota, `getLivenessRow` 등.
2. **`packages/api` 경계** — foundation/workflow는 YouTube만 mock, persist는 **실 DB** (또는 test transaction + rollback).
3. **`apps/web` Route Handlers** — `/api/cron/youpd/*` (`CRON_SECRET`), `Request` 주입 vitest 또는 `node:test` + `fetch` to running server.
4. **`apps/mcp`** — `/api/health` + OAuth token verify + tool handler (YouTube mock 유지 가능).
5. **REST 계약** — Zod envelope, 401/403, quota 초과 shape.

### 4.2 하지 않을 것 (integration이 아닌 것)

- 순수 함수·스키마만 검증 → unit.
- 브라우저 UI 클릭·전체 OAuth consent 화면 → E2E / agent-browser.
- 프로덕션 Supabase / 실 YouTube quota 소모 (기본은 로컬 + mock).

### 4.3 실행 전 체크리스트 (integration 공통)

```bash
pnpm worktree:env          # worktree일 때
pnpm db:up && pnpm db:reset
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=<supabase status -o env>
pnpm youtube:keys:sync     # YouTube 경로 테스트 시
pnpm test:integration
```

### 4.4 현재 스펙

```text
packages/supabase/src/repositories/healthChecks.integration.test.ts
packages/supabase/src/repositories/youtube-hot-videos.integration.test.ts
packages/supabase/src/repositories/harvest-sessions.integration.test.ts
apps/admin/src/app/api/health/route.integration.test.ts
apps/web/src/app/api/cron/youpd/trending/route.integration.test.ts  # collector mocked; cron auth real
```

설정: `vitest.integration.config.ts`, 전역 setup `test/integration/global-setup.ts` (`supabase status` → env).

---

## 5. Supabase Auth stub / 로컬 테스트 유저

레포에는 **세 가지 패턴**이 있습니다.

### 5.1 Unit — Auth REST mock (`apps/web`)

`supabase-fetch.test.ts` 는 GoTrue가 아니라 **OAuth authorization REST** (`/auth/v1/oauth/authorizations/...`) 를 stub 합니다.

```typescript
// 패턴: globalThis.fetch mock + SUPABASE_URL / SUPABASE_ANON_KEY env
process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY = 'anon-test';
globalThis.fetch = vi.fn() // → Pending / auto_approved JSON
```

통합 테스트에서 **실 Auth API** 가 필요하면 mock 대신 로컬 `supabase start` URL을 쓰고, 아래 5.3 으로 유저를 만듭니다.

### 5.2 Unit — MCP JWT verify stub (`apps/mcp`)

`apps/mcp/src/oauth/verify-token.test.ts`:

```typescript
import { __setJwksForTests, verifyAccessToken } from './verify-token';

// JWKS HTTP 없이 검증 키 주입
__setJwksForTests(async () => publicKey);
process.env.MCP_OAUTH_ISSUER = 'https://test.supabase.co/auth/v1';
process.env.MCP_OAUTH_RESOURCE = 'http://localhost:3002/api/mcp';
```

Integration 에서는 로컬 issuer(`http://127.0.0.1:54321/auth/v1`) + 실제로 발급한 JWT 를 쓰는 쪽으로 확장할 수 있습니다.

### 5.3 Integration / 수동 — 로컬 테스트 유저 (service role)

서버 코드의 privileged 경로는 `createServerSupabaseClient()` (**service role**, RLS bypass) 입니다. 대부분의 repository/integration 테스트는 **Auth 유저 없이** `DATABASE_URL` + service role 만으로 충분합니다.

**브라우저 세션·RLS as user** 가 필요할 때만 테스트 유저를 만듭니다.

```bash
# env 로드 (예시)
source <(supabase status -o env | sed 's/^/export /')

curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@youpd.local",
    "password": "test-password-16chars",
    "email_confirm": true
  }'
```

로그인(anon)으로 access token 받기:

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@youpd.local","password":"test-password-16chars"}'
```

Next.js **쿠키 세션** (`createUserContextClient`) 은 Route Handler / Server Action 에서만 set 가능합니다. Integration 에서는:

- Bearer JWT 를 헤더에 직접 넣는 API 를 테스트하거나,
- Playwright E2E 에서 로그인 UI 플로우를 추가하는 방식을 선택합니다.

### 5.4 Cron stub env

| 변수 | 용도 |
|------|------|
| `CRON_SECRET` | `/api/cron/youpd/*` → `Authorization: Bearer $CRON_SECRET` |

로컬 `.env.local` 에 임의 문자열을 넣고 integration 요청 헤더에 동일 값을 사용합니다.

---

## 6. E2E (Playwright)

### 전제

```bash
pnpm worktree:env
pnpm db:up && pnpm db:reset
pnpm test:e2e
```

`e2e/global-setup.ts` → `loadSupabaseEnv()` 가 `supabase status -o json` 으로 env 를 채웁니다. Supabase 가 꺼져 있으면 실패 메시지로 안내합니다.

### 동작

- `playwright.config.ts` 가 **web :3000, admin :3001, mcp :3002** dev 서버를 순차 기동 (`reuseExistingServer: !CI`).
- 스펙:
  - `e2e/web.spec.ts` — `GET /` 200
  - `e2e/admin.spec.ts` — `GET /api/health` + seed `liveness`
  - `e2e/mcp.spec.ts` — `GET /api/health`

UI 로그인·MCP OAuth 전체 플로우는 **아직 E2E 없음**.

### 디버그

```bash
pnpm exec playwright test --ui
pnpm exec playwright show-report
```

---

## 7. 변경 유형별 권장 실행

| 변경 | 권장 |
|------|------|
| 순수 로직 / mock 기반 MCP | `pnpm --filter @youpd/api test` |
| Supabase repository / migration | `pnpm db:reset` → (향후) integration → `pnpm --filter @youpd/api test` |
| Next route / cron | `pnpm --filter @youpd/web test` + (향후) integration |
| 앱 기동·포트·health | `pnpm test:e2e` |
| 워크트리 첫 오픈 | `pnpm worktree:env` |

### PR 전체 스모크 (로컬)

```bash
pnpm install
pnpm worktree:env
pnpm db:up && pnpm db:reset
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:integration
```

---

## 9. 관련 파일

| 경로 | 역할 |
|------|------|
| `scripts/link-env-from-main.sh` | worktree env 링크 |
| `playwright.config.ts` | E2E |
| `e2e/load-supabase-env.ts` | E2E Supabase env |
| `supabase/seed.sql` | health_checks seed |
| `packages/supabase/src/server.ts` | service role client |
| `packages/supabase/src/ssr.ts` | anon + cookie user client |
| `apps/web/src/lib/supabase-fetch.test.ts` | Auth REST unit stub |
| `apps/mcp/src/oauth/verify-token.test.ts` | JWT verify unit stub |

---

## 10. `pnpm test:integration`

```bash
pnpm db:up && pnpm db:reset   # 최초 또는 migration 변경 후
pnpm test:integration
```

- `scripts/test-integration.sh` — Supabase 가동 여부 확인 후 `vitest.integration.config.ts` 실행
- `DATABASE_URL` 이 이미 있으면 `supabase status` 생략 가능
- Unit vitest (`pnpm test`) 는 `*.integration.test.ts` 를 exclude 함
- YouTube 실호출 integration 은 아직 없음 — 추가 시 `YOUTUBE_API_KEY` + `youtube:keys:sync` opt-in 권장
