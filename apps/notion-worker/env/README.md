# Notion worker env

Non-secret production env vars are versioned in [`prod.env`](./prod.env) and
pushed to the deployed worker by [`.github/workflows/deploy-notion-worker.yml`](../../../.github/workflows/deploy-notion-worker.yml)
on every successful main deploy.

## Adding or changing a non-secret var

Edit `prod.env`, open a PR, merge. The next deploy pushes the new file with
`ntn workers env push --yes`. The push replaces the remote env, so this file
must mirror **every** non-secret var the worker needs.

## Adding a secret

1. Add the value as a GitHub repository secret (Settings → Secrets and
   variables → Actions → New repository secret).
2. Reference it from `deploy-notion-worker.yml` in the "Compose env file"
   step and append it to the temp `.env` before `ntn workers env push`.
3. Never paste raw secret values into `prod.env` or any other tracked file.

## Current required GitHub Actions secrets

| Secret name | Used as | Notes |
|---|---|---|
| `NOTION_API_TOKEN` | `context.notion` auth in worker + `ntn` CLI auth in CI | Same token serves both purposes. Reissue from <https://www.notion.so/profile/integrations/internal>. |
| `YOUPD_API_TOKEN` | Bearer for `/api/youpd/rest/*` calls | Must match the token apps/web validates. |

## Sanity-check what's deployed

```sh
# Read what the worker currently has (will include secrets — local only).
ntn workers env pull --no-file \
  --workers-config-file=apps/notion-worker/workers.json
```
