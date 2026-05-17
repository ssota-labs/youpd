> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# How to manage secrets

> Store API keys and credentials for your worker securely.

Secrets let your [Notion Workers](/workers/get-started/overview) use API keys, tokens, client secrets, webhook signing secrets, and other credentials without committing those values to your source code.

Notion encrypts worker secrets at rest and exposes them as environment variables at runtime. In your worker code, read them from `process.env`.

```typescript theme={null}
const apiKey = process.env.OPENWEATHER_API_KEY;
```

<Warning>
  Never commit `.env` files or any type of secret to source control. Worker
  projects created from the template include `.env` and `.env.*` in `.gitignore`
  by default.
</Warning>

## Add a secret

Use `ntn workers env set` to store one or more secrets for your worker:

```bash theme={null}
ntn workers env set OPENWEATHER_API_KEY=your-secret
```

To set multiple secrets at once, pass multiple `KEY=value` pairs:

```bash theme={null}
ntn workers env set GITHUB_CLIENT_ID=your-client-id GITHUB_CLIENT_SECRET=your-client-secret
```

If a key already exists, setting it again replaces the previous value.

<Tip>
  Quote values that contain spaces, shell metacharacters, or other characters
  your shell might interpret.
</Tip>

## Use a secret in worker code

Read secrets from `process.env` inside your worker capability:

```typescript theme={null}
worker.tool("getWeather", {
  title: "Get Weather",
  description: "Fetch the current weather for a city",
  schema: {
    type: "object",
    properties: {
      city: { type: "string" },
    },
    required: ["city"],
    additionalProperties: false,
  },
  execute: async ({ city }) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENWEATHER_API_KEY is not configured");
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city,
      )}&appid=${apiKey}`,
    );

    return response.json();
  },
});
```

## Pull secrets for local development

When you run a worker locally, use a `.env` file to provide the same environment variables that the hosted worker receives.

Pull remote secrets into `.env`:

```bash theme={null}
ntn workers env pull
```

Or write to a different file:

```bash theme={null}
ntn workers env pull --file=.env.local
```

If the file already exists, `pull` preserves comments, blank lines, and local-only keys. It updates keys that also exist remotely, then appends new remote keys.

For non-interactive scripts, add `--yes` to skip the confirmation prompt:

```bash theme={null}
ntn workers env pull --yes
```

<Warning>
  Treat any pulled `.env` file as sensitive. Confirm that the file is ignored by Git
  before you pull secrets into a project.
</Warning>

## Push local secrets to your worker

If you've added secrets locally to `.env`, push them to the hosted worker:

```bash theme={null}
ntn workers env push
```

Or push a different file:

```bash theme={null}
ntn workers env push --file=.env.local
```

`push` adds new local keys and updates changed local keys. It does not remove keys that exist only in the remote worker environment.

For non-interactive scripts, add `--yes`:

```bash theme={null}
ntn workers env push --yes
```

## Manage another worker

When you run these commands inside a worker project, the CLI reads the worker ID from `workers.json`. To manage a different worker, pass its worker ID.

For `set` and `unset`, use `--worker-id`:

```bash theme={null}
ntn workers env set --worker-id <worker-id> API_KEY=your-secret
ntn workers env unset --worker-id <worker-id> API_KEY
```

For `list`, `pull`, and `push`, pass the worker ID as the positional argument:

```bash theme={null}
ntn workers env list <worker-id>
ntn workers env pull <worker-id>
ntn workers env push <worker-id>
```

## Use secrets for OAuth client credentials

For custom OAuth providers, store the OAuth client ID and client secret as worker secrets:

```bash theme={null}
ntn workers env set GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy
```

Then read them from `process.env` in the OAuth capability configuration:

```typescript theme={null}
worker.oauth("githubAuth", {
  name: "github-oauth",
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  scope: "repo user",
  clientId: process.env.GITHUB_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
});
```

## Command summary

| Command                         | What it does                                            |
| :------------------------------ | :------------------------------------------------------ |
| `ntn workers env set KEY=value` | Stores or replaces one or more secrets                  |
| `ntn workers env list`          | Lists secret keys without revealing values              |
| `ntn workers env unset KEY`     | Removes a secret                                        |
| `ntn workers env pull`          | Writes remote secrets to a local `.env` file            |
| `ntn workers env push`          | Adds or updates remote secrets from a local `.env` file |

See the [CLI command reference](/cli/reference/commands) for all `ntn workers env` flags and options.

## Next steps

<CardGroup cols={2}>
  <Card title="OAuth" icon="key" href="/workers/guides/oauth">
    Authenticate with third-party APIs using OAuth.
  </Card>

  <Card title="Syncs" icon="rotate" href="/workers/guides/syncs">
    Sync external data into Notion databases.
  </Card>

  <Card title="Agent tools" icon="wand-magic-sparkles" href="/workers/guides/tools">
    Build custom tools for Notion AI.
  </Card>

  <Card title="Webhooks" icon="bell" href="/workers/guides/webhooks">
    Receive HTTP events from external services.
  </Card>
</CardGroup>
