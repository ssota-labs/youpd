---
name: notion-workers
description: Builds Notion Workers with the `@notionhq/workers` SDK—tools for Custom Agents, scheduled syncs into managed databases, webhooks, OAuth, pacers, secrets, and `context.notion`. Use when the user mentions Notion Workers, `worker.tool`, `worker.sync`, `worker.webhook`, `worker.oauth`, `@notionhq/workers`, schema builders, or worker deploy/exec flows.
---

# Notion Workers SDK

## When to use

Use this skill when implementing or changing Worker TypeScript (`src/index.ts`), capability definitions, schema/builders, OAuth/secrets, or how Workers call Notion via `context.notion`. Use `notion-cli` for pure terminal/`ntn` command reference without SDK edits.

## Before changing code or running commands

- Read [references/guide-secret.md](references/guide-secret.md) before touching secrets, `ntn workers env *`, or `.env`; never commit secrets or paste tokens into chat/logs.
- Read [references/guide-oauth.md](references/guide-oauth.md) before OAuth client IDs/secrets or provider redirect URLs.
- Schema changes on managed databases can migrate data destructively—review [references/sdk-reference.md](references/sdk-reference.md) managed-database warnings before deploy.
- Local `ntn workers exec --local` differs from hosted runtime for Notion client injection; follow [references/guide-agent-tools.md](references/guide-agent-tools.md) and [references/guide-notion-api.md](references/guide-notion-api.md).

## Quick start (SDK shape)

```typescript
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;
```

Register capabilities on `worker`, for example:

- `worker.database()` — managed DB for sync output
- `worker.pacer()` — rate-limit outbound HTTP
- `worker.sync()` — scheduled/manual sync into a managed database
- `worker.tool()` — callable Custom Agent tools (JSON Schema inputs)
- `worker.webhook()` — HTTP event handlers
- `worker.oauth()` — third-party OAuth configuration

End-to-end scaffold and sample: [references/quick-start.md](references/quick-start.md). Concepts: [references/get-started-overview.md](references/get-started-overview.md).

## Task → reference (read before deep work)

| Task | Reference |
|------|-----------|
| Worker API surface, sync/tool/webhook/oauth/database/pacer details | [references/sdk-reference.md](references/sdk-reference.md) |
| Agent tools: schemas (`j`), `outputSchema`, hints, local/hosted exec | [references/guide-agent-tools.md](references/guide-agent-tools.md) |
| Sync modes (replace/incremental), pagination, schedules, CLI sync ops | [references/guides-sync.md](references/guides-sync.md) |
| `Schema.*` / `Builder.*` / `j.*` for DB properties and values | [references/reference-schema-builder.md](references/reference-schema-builder.md) |
| Webhook handlers, verification, retries | [references/guide-webhooks.md](references/guide-webhooks.md) |
| OAuth capability definition, deploy order, `accessToken()`, examples | [references/guide-oauth.md](references/guide-oauth.md) |
| `ntn workers env` set/list/pull/push | [references/guide-secret.md](references/guide-secret.md) |
| `context.notion`, token types for tools vs sync/webhook/local | [references/guide-notion-api.md](references/guide-notion-api.md) |

## Progressive disclosure

Keep `SKILL.md` as routing only. Open exactly one reference file per concern; links stay one level deep under `references/`.
