---
name: notion-cli
description: Runs and troubleshoots the Notion CLI (`ntn`) for login, Workers lifecycle, authenticated Notion API calls, data sources, and file uploads. Use when the user mentions `ntn`, Notion CLI, terminal API requests, `ntn api`, `ntn workers`, `ntn datasources`, `ntn files`, or CLI authentication.
---

# Notion CLI (`ntn`)

## When to use

Use this skill when work involves installing `ntn`, authenticating, scripting Notion API requests from the terminal, managing Workers from the CLI, querying data sources, or uploading files—not when authoring `@notionhq/workers` TypeScript (see `notion-workers`).

## Before executing commands

- Read [references/authentication.md](references/authentication.md) before tokens, `ntn login`, CI/headless flows, or workspace overrides.
- Never print paste logs that include bearer tokens; avoid `--unsafe-verbose` outside a trusted local shell.
- Confirm destructive actions (`delete`, `logout`, sync reset, etc.) with the user when ambiguous.

## Quick start

```bash
ntn login
ntn api v1/users/me
ntn api v1/pages/$PAGE_ID
ntn workers new
ntn workers deploy
ntn workers exec <capability-key> -d '{"input":"value"}'
```

Overview of CLI capabilities: [references/get-started.md](references/get-started.md).

## Task → reference (read before deep work)

| Task | Reference |
|------|-----------|
| Install, verify, completions, build from source | [references/installation.md](references/installation.md) |
| Login, PATs, workspace targeting, keychain / `NOTION_KEYRING` | [references/authentication.md](references/authentication.md) |
| `ntn api` paths, inline body syntax (`=`, `:=`, `==`), stdin/`--data`, `--spec`/`--docs`, versioning | [references/guide-api-request.md](references/guide-api-request.md) |
| Data source IDs, query/filter/sort, create/update via API | [references/guide-data-source.md](references/guide-data-source.md) |
| `ntn files create`, attach uploads, troubleshooting | [references/guide-file-uploads.md](references/guide-file-uploads.md) |
| Full command tables, global flags, env vars | [references/command-reference.md](references/command-reference.md) |

## Progressive disclosure

Keep `SKILL.md` as routing only. Load the linked reference file for the specific task; do not nest deeper than one hop from this file.
