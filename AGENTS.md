# AGENTS.md

## Project

**YouPD (유피디)** is a YouTube planning and production workflow product moving toward a **web SaaS** surface first: Next.js app, YouTube Data API capture, Supabase for account data (profiles, plans, usage counters, rate limits), and optional Notion-backed operating pages for the product workspace.

Ground product behavior in these local specs (Notion SSOT remains authoritative for long-form history):

- `docs/유피디 — 유튜브 기획 제작 커스텀 에이전트 기획안 c29d45781454451ea58ed4677b23e946.md`
- `docs/뷰트랩 자체 구축 설계 — Notion DB + YouTube API + MCP c478864759b447d7aa2c2065f5547232.md` (historical; MCP/worker scope deferred — see Out of scope)

This file is the default entrypoint for coding agents. Use it to understand the stack, package boundaries, architectural rules, and which `.agents/skills/`* skill to read before work.

**Out of scope for now:** native mobile apps (Expo), device voice runtimes, ElevenLabs-specific voice agent hosting, **`apps/mcp`** (remote MCP server, OAuth transport, MCP tools), and **Notion Workers** (`@notionhq/workers`, worker deploy/sync). Reintroduce only when the product explicitly needs them. Agent work should focus on **`apps/web`**, shared **`packages/*`**, and Supabase—not MCP or worker code paths unless the user asks.

## Source Of Truth

- YouPD operates under the SSOTA Labs operating system. Follow SSOTA Labs ontology workflows for project, meeting, document, action, entity, stakeholder, and business-unit operations.
- Product and project planning SSOT: [https://www.notion.so/TV-35e2f1b57fc380e59f84e5ed02c788d1?v=35e2f1b57fc380afac17000cc9357cf7&source=copy_link](https://www.notion.so/TV-35e2f1b57fc380e59f84e5ed02c788d1?v=35e2f1b57fc380afac17000cc9357cf7&source=copy_link), [https://www.notion.so/35e2f1b57fc38072846fd0b29537ec76?v=35e2f1b57fc380afac17000cc9357cf7&source=copy_link](https://www.notion.so/35e2f1b57fc38072846fd0b29537ec76?v=35e2f1b57fc380afac17000cc9357cf7&source=copy_link).
- **Development task SSOT:** [Notion development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513) (shared with youpd-skills). Before starting version, phase, feature, PRD, design, or implementation work, read `.cursor/skills/youpd-version-workflow/SKILL.md` and query this database for the current task, dependencies, and linked docs.
- **Long-form dev docs SSOT:** [유PD 개발 문서](https://www.notion.so/paxhumana/5ac346dac45682cf98ed815c25b32d38) (`collection://b2a346da-c456-8251-a5c9-876afa9c62ef`). Use `.cursor/skills/youpd-dev-docs/SKILL.md` when authoring or updating PRD, 설계, ADR, and related records.
- Notion is the unified documentation SSOT. Repository docs should stay minimal and operational, acting only as tooling/setup mirrors where local files are required.
- `.agents/docs/` and `ssota-`* skills define SSOTA Labs ontology workflows as applied to YouPD. Revise them only when they conflict with current project decisions or the SSOTA Labs operating system.
- Before changing project definitions, specs, task ontology, meeting/action/document workflows, or Notion-linked metadata, read the relevant `ssota-*` skill and use Notion as the source of truth.

## Development SSOT And Agentic Workflow

**Notion is the source of truth for how we build YouPD.** The repository holds code; Notion holds tasks, specs, policies, and decisions. Git history alone does not capture reasoning.

### Git branches

| Branch | Role |
|---|---|
| **`main`** | Release line. Human promotion only — **agents must never auto-merge here**. |
| **`dev`** | Integration branch. All agent PRs target `dev`. Guarded auto-merge allowed when gates pass. |

Repo: `ssota-labs/youpd`. Start feature branches from latest `main`; open PRs with **base `dev`**.

### Development router (read first)

For **any** development request (work, reconciliation, docs, implementation, scheduler tick), start here. Skills are not auto-loaded every turn; this section is the always-on gate.

#### Step 0 — Notion (mandatory)

1. Confirm **Notion** is reachable for the development task DB (Notion plugin, CLI, or user-provided task context). If not, stop — do not plan or code from memory.
2. Load context from the [development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513):
   - User named a task → fetch that row.
   - Otherwise → identify in-progress or next eligible row; state the selected task ID in the run report and proceed without waiting for user confirmation.
3. Docs database: `https://www.notion.so/paxhumana/5ac346dac45682cf98ed815c25b32d38`

#### Step 1 — De-dupe and conflict-first

Before picking new work, check:

- Open PRs to `dev`: `gh pr list --base dev --state open`
- In-progress Notion tasks with overlapping scope
- Dirty worktree or unresolved merge conflicts on task branches
- Recent automation run notes on active tasks

**Priority:** resolve conflicts / finish in-flight PRs / P0 reconciliation **before** starting new features.

#### Step 2 — Classify intent

| User / scheduler says | Intent | Read skill |
|---|---|---|
| 정합성 체크, reconciliation, drift audit | `reconcile` | `.cursor/skills/youpd-reconciliation/SKILL.md` |
| 작업 진행, continue task, implement | `work` | Step 3 |
| PRD, 설계, Blueprint, Policy, ADR | `document` | `.cursor/skills/youpd-documentation-workflow/SKILL.md` |

**Reconcile default scope:** entire development task database (all `상태`), `dev` at current HEAD — unless the user narrowed scope.

#### Step 3 — `work` branch

Use the loaded task’s `작업 유형`:

| Route | Read skill |
|---|---|
| PRD 작성, 설계 작성, 상세 로드맵 작성 | `.cursor/skills/youpd-documentation-workflow/SKILL.md` |
| 구현, 검증 | `.cursor/skills/youpd-implementation-workflow/SKILL.md` |

Small Spec/Policy patches (single topic, same PR) → implementation skill close-out, not documentation skill.

#### Scheduler loop (Cursor Automation)

When running on a schedule (e.g. every 5 minutes):

1. Notion gate (Step 0)
2. De-dupe / conflict-first (Step 1)
3. If P0 reconciliation → run reconcile skill; do not start new IMPL
4. Else resume only in-progress task/PR work whose dependencies are satisfied, or pick the next eligible `대기` task with satisfied dependencies
5. If no dependency-ready in-progress or `대기` task exists, **no-op for this tick**: report "no eligible dependency-ready work" if a report is required, and do not force work, bypass dependencies, or start speculative tasks
6. Route selected work to documentation or implementation skill
7. At close-out, **guarded merge to `dev` only** when all merge gates pass (see below)
8. **Autonomous task completion (CRITICAL)** — when close-out gates pass, set the task `상태` to **`완료`** in Notion immediately. Do **not** ask the user for approval, propose completion, or leave the task in `진행중` waiting for human sign-off. Skipping this **blocks all downstream `종속성` tasks** and stops the scheduler until fixed.

Do **not** enable the scheduler until `dev` merge preflight has passed (write access + successful test merge).

#### Autonomous task completion (all agent runs) — **CRITICAL**

**This step is load-bearing.** The development task DB uses `종속성` / `Blocked by` to gate every downstream task. Implementation and documentation gates require predecessor rows to be **`완료`** with artifacts present (doc on Notion or code on `dev`). If an agent finishes work but leaves the row in `진행중` or `대기`, or only *proposes* `완료` and waits for a human, **no later task becomes dependency-ready**, the scheduler **no-ops on every tick**, and the **entire agentic pipeline stops** — even when PRs are merged and docs are written. There is no parallel bypass. **Always set `완료` when close-out gates pass.**

Agents run **end-to-end without human approval**. Apply Notion updates directly; never "propose" status changes and wait.

| `작업 유형` | Set `완료` when |
|---|---|
| **PRD 작성 / 설계 작성 / 상세 로드맵 작성** | Linked doc in docs DB is non-empty, correct `태그`, linked via `관련 문서`, and task acceptance criteria are met |
| **구현** | Implementation gate passed; verify commands passed; PR merged to `dev` (or no code change required and deliverable recorded) |
| **검증** | Verification plan executed; no P0 findings for this task; required E2E/integration evidence captured per testing policy |

If close-out gates fail, set `보류` with a blocker note on the task page — do **not** ask the user what to do next. The next scheduler tick resumes or no-ops.

**Never** block the dependency chain by leaving a finished task in `진행중` or `대기`.

#### Guarded merge policy (`dev` only)

Merge a PR to **`dev`** when **all** apply:

- PR base branch is `dev` (never `main`)
- CI/checks green (or no required checks configured)
- No merge conflicts
- No open P0 reconciliation for the task
- No secrets, service keys, or destructive git/db operations in the diff

If merge fails (permissions, branch rules, conflicts), stop and report — fix rules/permissions before continuing the scheduler.

**Policy SSOT:** Notion doc *YouPD Agentic Workflow Policy* (`태그`: `정책`).

### Search before you build

Search Notion for related tasks, ADRs, specs, and policies before creating duplicates.

## Required Runtime And Versions

Use the current stable ecosystem unless a task explicitly requires otherwise.

- Node.js: 24 via `nvm`.
- Package manager: latest stable `pnpm`. Before significant dependency work, check the current pnpm release and run `corepack prepare pnpm@latest --activate` if needed.
- Monorepo orchestration: Turborepo. Use Turbopack where Next.js supports it.
- Language: TypeScript first. Use the latest stable TypeScript and pin the exact version in root `package.json` once the monorepo exists.
- Runtime validation: Zod 4 at package and network boundaries.
- Web and API: Next.js 16 App Router, deployed on Vercel.
- Styling: Tailwind CSS 4. Use shadcn/ui for web primitives.
- Auth, database, storage, realtime: Supabase, with Drizzle ORM as the schema/query SSOT.

Before adding or upgrading dependencies, check package registries and product docs. Do not rely on memory for rapidly changing packages such as Next.js, Supabase, Drizzle, Tailwind, shadcn/ui, or Zod.

## Target Monorepo Layout

```text
apps/
  web/          # Next.js 16: web surface, API routes, OAuth callbacks, metering
  admin/        # Admin/operations console when it grows beyond apps/web
packages/
  agents/       # Optional: shared domain logic and orchestration helpers
  api/          # Shared API contracts, route handlers, DTO mappers, server orchestration
  ui/           # Shared headless UI contracts, design tokens, web-focused adapters
  db/           # Drizzle schema, query DSL, migration generation, createDbClient
  supabase/     # Supabase adapters: repositories, auth/storage/realtime integrations
  types/        # Shared TypeScript types and Zod schemas
  config/       # Shared tsconfig, eslint, tailwind, testing config
design/         # OpenPencil files, component lab assets, design tokens, UI specs
docs/           # Architecture decisions, setup, product specs mirrored from SSOT
supabase/       # Supabase CLI config, local Docker stack, runtime migrations
```

`apps/mcp/` may exist in the repo but is **out of scope** for current agent work unless the user explicitly requests it.

Create nested `AGENTS.md` files for subprojects once a package or app develops local rules that should override this root file.

## Package Responsibilities

- `apps/web`: Next.js surface, marketing or app UI, server components, **API routes** (OAuth callbacks, entitlement checks, usage accounting), and Supabase server-side integration. **Primary focus** for current work.
- `apps/admin`: operational admin UI. Keep it thin and use shared API/domain packages.
- `packages/agents` (when used): shared domain behavior—no voice-runtime coupling unless the product adds it later.
- `packages/api`: HTTP/server contracts, route orchestration, request/response schemas, and server-only use cases shared by `apps/web` and `apps/admin`.
- `packages/ui`: SSOTA-derived design system (`@youpd/ui`) — tokens in `src/styles/globals.css`, shadcn primitives, `ssota-ui` chrome. See `design/DESIGN.md`. Do not put product business rules here.
- `packages/db`: Drizzle ORM SSOT: schema definitions, relations, typed queries, generated SQL, and database client factory. Framework- and Supabase-agnostic.
- `packages/supabase`: implements persistence/auth/storage/realtime ports using Supabase and Drizzle. Do not leak Supabase-specific APIs into domain packages.
- `packages/types`: shared Zod schemas, DTOs, event types, and branded identifiers.
- `packages/config`: shared build, lint, TypeScript, test, and formatting configuration.

Do **not** edit `apps/mcp` or Notion Worker deploy/sync code unless the user explicitly expands scope.

## Architecture Rules

Follow an adapter-port, hexagonal architecture pattern.

- Domain logic belongs in `packages/api`, `packages/agents` (if present), or another domain-focused package, not in React components or route files.
- Frameworks live at the edges: Next.js in `apps/web` and `apps/admin`, Supabase in `packages/supabase`.
- Define ports/interfaces for persistence, auth, external APIs (YouTube, Notion product integrations when in scope), telemetry, file storage, and optional LLM providers.
- Implement adapters separately from orchestration. External provider responses must normalize into project-owned types before higher layers consume them.
- Keep React components thin: render state, call hooks/actions, and delegate business decisions to packages.
- Use Zod 4 schemas at network, storage, and external provider boundaries.
- Prefer explicit errors over silent fallback behavior. Avoid compatibility shims for unshipped branch-only behavior.

## App, Web, And API Rules

- Use Next.js 16 App Router in web/admin. Prefer server components by default; use client components only for interactivity, browser APIs, or stateful UI.
- API routes deployed on Vercel should live close to `apps/web` while delegating orchestration to `packages/api` and domain packages.
- Browsers call **project APIs**, not database clients directly.
- Use standard `fetch` or typed HTTP wrappers. Avoid Axios unless a specific dependency requires it.
- Never place secrets in `NEXT_PUBLIC_`*.
- Use TanStack Query or an equivalent cache intentionally for client data. Define query keys and invalidation rules near API contracts.
- Enforce **plans, rate limits, and usage** via Supabase (or server-side checks) before expensive YouTube API calls; do not rely on the client alone.
- OAuth tokens and provider secrets stay **server-side** in API routes—never expose service keys in public env vars or untrusted bundles.
- Optional LLM usage remains **adapter-based**; do not hard-code a single vendor in domain logic.
- If a planned workflow needs a new external API key or OAuth app that is not already configured, do not block the sprint on secrets. Implement the typed adapter boundary, local fixtures/stubs, and a clear "not configured" UI/API state; continue with manual URL upload/input fallback where possible.

## UI And Design Rules

- OpenPencil is both a design SSOT and a component lab. Use it to inspect, design, compare, and validate UI components before promoting patterns into code.
- OpenPencil exports or JSX are starting points, not unreviewed production code. Human-readable component APIs and accessibility still matter.
- Shared UI means shared headless contracts, state machines, tokens, copy patterns, and tests on the web surface.
- Use shadcn/ui for web primitives and composition. Do not hand-roll common web primitives when an appropriate shadcn component exists.
- Prefer composition over boolean prop proliferation. Use compound components, explicit variants, and provider boundaries for flexible UI APIs.
- Keep design tokens centralized and portable. Tailwind 4 is the web styling default.
- Business logic must not live in UI components, OpenPencil artifacts, or story/demo fixtures.
- Components should be easy to test in isolation with mocked ports and predictable fixtures.

## Supabase And Database Rules

- Supabase Auth is the default auth system.
- Drizzle ORM in `packages/db` is the schema and typed query SSOT. Do not introduce a parallel ORM.
- `packages/supabase` consumes `packages/db` and implements repository-style adapters for domain ports.
- Hybrid migration model: Drizzle generates SQL from schema changes, but Supabase migrations are the runtime artifact.
- Use Supabase CLI local Docker for development: `pnpm db:up`, `pnpm db:down`, `pnpm db:reset`.
- Use Supabase branching for isolated database changes when working against remote environments.
- Do not run `drizzle-kit migrate` unless the project explicitly changes its migration model.
- Keep generated Supabase types isolated from domain types. Map between them explicitly.
- Do not expose service role keys, database URLs, or privileged Supabase clients to browsers or public client bundles.
- Enable RLS for every table in exposed schemas.
- Default policy shape is deny-all: create no permissive policies, or use explicit `using (false)` / `with check (false)` policies when a policy object is needed for clarity.
- Add client-readable/client-writable policies only for intentional browser exposure, such as Supabase Realtime or a deliberately designed direct client feature.
- Otherwise, all reads and writes go through server-side code, and repository/service code must enforce ownership and authorization invariants even when using privileged database connections.

## Skill Routing

Before doing work, check whether a skill applies. If it applies, read it first and follow it. For work spanning multiple areas, read all relevant skills before editing.

Use `.agents/skills/*/SKILL.md` descriptions as the full routing map. Always read a named, attached, slash-invoked, or clearly matching skill before editing.

High-frequency routing:

- Follow **Development SSOT And Agentic Workflow** above before any substantive work. Query the [Notion development task database](https://www.notion.so/paxhumana/55eda245160f43eba0ebe28b71604f89?v=c58d8705594d4e7c8844ab7d98354513) first; do not plan from repo memory alone.
- Read `youpd-reconciliation` when running 정합성 checks or before starting IMPL after drift.
- Read `youpd-documentation-workflow` for Blueprint, PRD, D3, Policy, ADR tasks.
- Read `youpd-implementation-workflow` for 구현/검증, PR workflow, and guarded merge to `dev`.
- Read `youpd-dev-docs` when creating or updating records in **유PD 개발 문서** (authoring details).
- `youpd-version-workflow` is a deprecated compatibility alias — prefer the three workflow skills above.
- Read `ssota-ontology-setup` before discovering or updating the YouPD Notion SSOT mapping, database IDs, templates, or business-unit/project anchors.
- Read the relevant `ssota-*` skill before changing project, meeting, document, action, digest, ontology-health, or ontology-extract workflows.
- Read `vercel-react-best-practices`, `next-best-practices`, `shadcn`, `open-pencil`, or UI/design skills before Next.js, web UI, shared component, or design work.
- Read `supabase` and, for schema/query performance, `supabase-postgres-best-practices` before Supabase, database, auth, RLS, migration, or storage work.
- Read `agent-browser`, `browser-use`, or `playwright` before browser QA, screenshots, scraping, or end-to-end UI verification.
- Read `create-agentsmd`, `create-skill`, `create-rule`, or other Cursor automation skills before changing agent instructions, skills, rules, hooks, or Cursor settings.

## Git Worktrees And Local Environment

Git worktrees do not copy ignored files. After creating a worktree (including Cursor worktrees under `.cursor/worktrees/youpd/`), sync env before `pnpm dev` or tests:

```bash
pnpm install
pnpm env:sync
```

- **Script:** `scripts/sync-env.sh` (also `pnpm env:sync`). On Cursor Cloud, writes `.env.local` from injected secrets. Locally, tries `pnpm worktree:env` (symlink from main) then `.env.example` templates.
- **Worktree-only link:** `scripts/link-env-from-main.sh` (also `pnpm worktree:env`). Symlinks ignored env files from the main worktree: `.env.local`, `apps/web/.env.local`, `apps/web/.env.youtube` (YouTube API key pool for `pnpm youtube:keys:sync`). Next.js 16 only auto-loads `.env*` from each app directory, not the repo root alone.
- **Main clone resolution:** `YOUPD_MAIN_WORKTREE` if set; else the worktree on branch `main`; else the first worktree that already has `.env.local`.
- **Copy instead of link** (e.g. different ports per worktree): `pnpm worktree:env -- --copy`
- **Canonical local clone** (this machine): `/Users/titanism/projects/youpd` on branch `main`.

First-time setup on the main clone: copy `.env.example` → `.env.local` (and the two app templates), run `pnpm db:up`, then paste Supabase keys from `supabase status`.

### Supabase local defaults (`pnpm db:up`)

Default CLI ports from `supabase/config.toml`. Keys below are the **standard local demo JWTs** (same for every `supabase start`); safe for local dev only — never use in production.

| Variable | Local value |
|----------|-------------|
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `DATABASE_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU` |

Other local URLs (optional): Studio `http://127.0.0.1:54323`, Inbucket/Mailpit `http://127.0.0.1:54324`. Refresh keys after `supabase stop` / `db:reset` if your CLI prints different values: `supabase status` or `supabase status -o env`.

Still set manually on the main clone (not from Supabase): `YOUTUBE_API_KEY`, `CRON_SECRET`, Notion/OAuth secrets — see root and `apps/*/`.env.example`.

## Cursor Cloud specific instructions

Cloud VMs ship Node 22 at `/exec-daemon/node`. YouPD requires **Node 24** — prepend nvm’s bin dir to `PATH` on every shell session (the VM update script does this before `pnpm install`):

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24 2>/dev/null || nvm install 24
export PATH="$NVM_DIR/versions/node/v24.16.0/bin:$PATH"
```

**Docker + Supabase (not in the update script):** Local DB/integration/E2E need Docker and the Supabase CLI (`npm install -g supabase`). If `pnpm db:up` reports permission denied on `/var/run/docker.sock`, run `sudo chmod 666 /var/run/docker.sock` (or add the user to the `docker` group and re-login). Then `pnpm db:up` and `pnpm db:reset` before integration tests, E2E, or Hot Videos data.

**Env files (Cloud + local):** Cursor Cloud injects secrets as **process environment variables**, not as files. On every VM boot, `.cursor/environment.json` runs `.cursor/install.sh`, which calls `pnpm env:sync` to materialize gitignored `.env.local` files from Cloud secrets (when `CLOUD_AGENT_*` is set) or from `.env.example` / worktree link locally. You can also run `pnpm env:sync` manually after adding secrets.

For a **one-time manual setup** (non-Cloud): copy `.env.example` → `.env.local`, `apps/web/.env.example` → `apps/web/.env.local`, `apps/mcp/.env.example` → `apps/mcp/.env.local`, and add `apps/admin/.env.local` with at least `DATABASE_URL` + `SUPABASE_URL` + `SUPABASE_ANON_KEY` (Next.js 16 only auto-loads `.env*` from each app directory). Fill Supabase keys from the demo JWT table above or `supabase status -o env`. Git worktrees on a machine with a main clone can use `pnpm worktree:env` instead.

**Hot Videos demo seed:** After DB reset, `set -a && source .env.local && set +a` then `pnpm --filter @youpd/api exec tsx /workspace/e2e/seed-hot-videos.ts` (absolute path — required when exec cwd is `packages/api`).

**Long-running dev servers:** Use tmux (`tmux -f /exec-daemon/tmux.portal.conf`) — e.g. `pnpm --filter @youpd/web dev` (:3000), `admin` (:3001), `mcp` (:3002). Standard commands: `docs/testing.md`, root `package.json` scripts.

**Known lint noise on `main`:** `@youpd/web` may fail `react-hooks/set-state-in-effect` in `apps/web/src/components/video-search/results.tsx` (pre-existing); typecheck and unit/integration tests still run independently.

## Setup And Development Commands

The repository may start before the monorepo is scaffolded. Once scaffolded, keep these root commands available:

```bash
pnpm install
pnpm env:sync       # Cloud VM, worktree, or first local setup
pnpm worktree:env   # git worktree only — link from main clone
pnpm run dev
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:integration  # local Supabase required — docs/testing.md
pnpm run test:e2e
```

Expected app-specific commands after scaffolding:

```bash
pnpm --filter @youpd/web dev
pnpm --filter @youpd/admin dev
```

Expected database commands after Supabase setup:

```bash
pnpm db:up
pnpm db:down
pnpm db:reset
pnpm db:generate
pnpm db:push
```

If a command does not exist yet, add it as part of project setup rather than documenting a different workflow.

## Testing Policy

Full local workflow (worktree env, Supabase reset, auth stubs, unit / integration scope, E2E): **`docs/testing.md`**.

Testing must run in a closed loop for every meaningful change.

- Unit tests for pure logic, schemas, mappers, policies, reducers, state machines, hooks, and adapters with mocks (`pnpm test`).
- Integration tests for API contracts, package boundaries, and Supabase adapters against **local Supabase** (`pnpm test:integration`; requires `pnpm db:up` — see `docs/testing.md`).
- E2E tests for critical user flows in `apps/web` and `apps/admin` where relevant (`pnpm test:e2e`, Playwright under `e2e/`).
- Design/component tests for shared UI contracts on the web surface.
- Lint, typecheck, and tests must pass before handoff unless the user explicitly accepts a known failing state.

Do not claim verification success unless the relevant command actually ran and passed. If the repo is not scaffolded enough to run a check, say that clearly.

### E2E Evidence Policy

For web UI work, E2E tests are not just pass/fail gates. They must leave enough evidence for the user and the next agent to review the implemented flow.

- Any sprint that changes `apps/web`, `apps/admin`, shared UI chrome, route navigation, or critical user flows must add or update Playwright E2E coverage.
- Normal verification can use `pnpm test:e2e`, with screenshots/videos/traces retained on failure according to the Playwright config.
- Final sprint close-out on latest `dev` must run a full evidence mode command, expected as `pnpm test:e2e:artifacts`. If that command does not exist yet, the sprint must add it before claiming the evidence policy is satisfied.
- Full evidence mode must save screenshots, videos, traces, and an HTML report for the covered flows. Use ignored artifact locations such as `test-results/` and `playwright-report/`; never commit generated screenshots, videos, traces, or reports.
- The final agent report must include the E2E command run, artifact output paths, which screenshots/videos/traces were produced, and any flows intentionally not covered.
- If the app cannot run E2E because required local services or env are missing, report the blocker explicitly and do not claim E2E success.

## Browser And App Automation

Use `agent-browser` or the browser automation skill for web QA.

Core workflow:

1. `agent-browser open <url>`
2. `agent-browser snapshot -i`
3. `agent-browser click @e1` or `agent-browser fill @e2 "text"`
4. Re-snapshot after page changes

## Quality Rules

- Preserve user changes. Never revert unrelated work unless explicitly requested.
- Do not comment out code to hide failures.
- Do not skip, disable, or weaken tests to make a change pass unless the user explicitly approves and the reason is documented.
- Do not leave dead code, unused exports, temporary debug code, or unused dependencies.
- Avoid broad refactors while implementing a narrow request.
- Prefer small, typed, testable modules.
- Use structured parsers, schemas, and SDKs instead of ad hoc string manipulation when available.
- Keep secrets out of source, logs, public env vars, public client bundles, and screenshots.
- Public-facing advice in regulated domains must be conservative and avoid unsupported clinical, legal, or financial claims.

## Documentation Rules

- Notion is the unified documentation SSOT. The YouPD Notion page is the project SSOT inside the SSOTA Labs operating system.
- PRDs, user flows, policy documents, technical decisions, design documents, architecture decisions, product specs, setup notes, package responsibilities, provider choices, database rules, deployment models, and tradeoffs must live in the YouPD Notion SSOT.
- Agents must read these documents from Notion before using them as context, and must write or update them in Notion rather than creating parallel long-form repo docs.
- Keep repository docs minimal and operational only when a file is required by tooling or local developer workflow. If a repo doc duplicates Notion, treat Notion as authoritative and update/migrate the Notion record first.
- Keep setup instructions current in Notion when package versions, runtime versions, or required commands change. Mirror only the short commands that agents must execute directly in `AGENTS.md`.
- When `.agents/docs` or `ssota-*` workflows conflict with this project, resolve the SSOTA Labs operating-system rule and YouPD project decision in Notion before copying assumptions into repository files.
- Keep `AGENTS.md` focused on agent-operational guidance. Put long product specs and decision history in Notion.

## Build And Deployment

- Deploy Next.js web/admin/API routes through Vercel.
- Use Vercel/GitHub checks for web/API CI.
- Do not add deploy-affecting secrets to public environment variables.
- Preview environments should point to matching Supabase branches or isolated local/preview resources.

## Git And Collaboration

- Do not create commits unless the user explicitly asks.
- Do not change commit authors unless the user explicitly asks. The previous project-specific commit-author override is not required here.
- Never run destructive git commands such as `git reset --hard` or force push without explicit approval.
- When adding dependencies, use `pnpm add` with the proper workspace filter so lockfiles stay consistent.
- Before final handoff, summarize changed files and verification results.

