> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# OAuth

> Authenticate with third-party APIs like GitHub, Google, and Salesforce from a Notion Worker.

Use OAuth when the API you're connecting to requires user authorization, such as GitHub, Google, Salesforce, and most SaaS APIs. You register an OAuth capability on your worker, deploy, complete the authorization flow via the CLI, and then call `accessToken()` in your code to get a valid token.

## Define an OAuth capability

Call `worker.oauth()` with your provider's OAuth 2.0 endpoints and credentials:

```typescript src/index.ts theme={null}
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;

const githubAuth = worker.oauth("githubAuth", {
  name: "github-oauth",
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  scope: "repo user",
  clientId: process.env.GITHUB_CLIENT_ID ?? "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
});
```

<Warning>
  Store your `clientId` and `clientSecret` as [secrets](/workers/guides/secrets), not in code:

  ```bash theme={null}
  ntn workers env set GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy
  ```
</Warning>

### Configuration options

| Property                | Required | Description                                                                         |
| :---------------------- | :------- | :---------------------------------------------------------------------------------- |
| `name`                  | Yes      | Unique identifier for this OAuth connection                                         |
| `authorizationEndpoint` | Yes      | The provider's OAuth 2.0 authorization URL                                          |
| `tokenEndpoint`         | Yes      | The provider's OAuth 2.0 token exchange URL                                         |
| `clientId`              | Yes      | Your OAuth app's client ID                                                          |
| `clientSecret`          | Yes      | Your OAuth app's client secret                                                      |
| `scope`                 | Yes      | Space-separated list of OAuth scopes to request                                     |
| `authorizationParams`   | No       | Additional parameters to include in the authorization request                       |
| `accessTokenExpireMs`   | No       | Default token expiry in milliseconds (for providers that don't return `expires_in`) |

## Deploy and authorize

Setting up OAuth requires multiple steps in a specific order. The worker must be deployed before you can store secrets or start the OAuth flow:

<Steps>
  <Step title="Deploy your worker">
    If you haven't deployed at least once already, do so first. The first deploy registers the worker with Notion. Your OAuth credentials won't be available yet (that's expected).

    ```bash theme={null}
    ntn workers deploy
    ```
  </Step>

  <Step title="Get your redirect URL">
    ```bash theme={null}
    ntn workers oauth show-redirect-url
    ```

    You'll need this when creating the OAuth app with your provider.
  </Step>

  <Step title="Create an OAuth app with your provider">
    Go to your provider's developer settings (e.g., GitHub Developer Settings, Google Cloud Console) and create an OAuth app. Add the redirect URL from the previous step as an authorized redirect URI. Copy the client ID and client secret.
  </Step>

  <Step title="Store your OAuth credentials">
    ```bash theme={null}
    ntn workers env set GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy
    ```
  </Step>

  <Step title="Deploy again">
    Redeploy so the worker picks up the credentials:

    ```bash theme={null}
    ntn workers deploy
    ```
  </Step>

  <Step title="Start the OAuth flow">
    ```bash theme={null}
    ntn workers oauth start githubAuth
    ```

    This opens a browser window where you authorize the connection. Once complete, the worker runtime stores the token securely.
  </Step>
</Steps>

## Use the token

Call `accessToken()` on the OAuth capability object to get a valid token. The runtime handles refresh automatically. This works in [tools](/workers/guides/tools), [syncs](/workers/guides/syncs), and [webhooks](/workers/guides/webhooks):

```typescript theme={null}
import { j } from "@notionhq/workers/schema-builder";

worker.tool("getGitHubRepos", {
  title: "Get GitHub repos",
  description: "Fetch the user's GitHub repositories",
  schema: j.object({}),
  execute: async () => {
    const token = await githubAuth.accessToken();
    const response = await fetch("https://api.github.com/user/repos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
});
```

This works the same way in syncs and webhooks:

```typescript theme={null}
import * as Builder from "@notionhq/workers/builder";

worker.sync("githubIssuesSync", {
  database: issues,
  execute: async (state) => {
    const token = await githubAuth.accessToken();
    const response = await fetch("https://api.github.com/issues", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const items = await response.json();
    return {
      changes: items.map((issue) => ({
        type: "upsert" as const,
        key: String(issue.id),
        properties: {
          Title: Builder.title(issue.title),
          "Issue ID": Builder.richText(String(issue.id)),
        },
      })),
      hasMore: false,
    };
  },
});
```

## Test locally

Once you've completed the OAuth flow (via `ntn workers oauth start`), pull your environment to get a fresh access token locally:

```bash theme={null}
ntn workers env pull
```

This writes a `.env` file with all your worker's secrets, including a fresh OAuth access token. The server refreshes the token automatically before returning it, so the token you get is always valid.

You can then test your capability locally with the `--local` flag:

```bash theme={null}
ntn workers exec getGitHubRepos --local
```

<Info>
  OAuth tokens expire. If you get a 401 from the provider, run `ntn workers env pull` again to get a refreshed token.
</Info>

## Examples

### Google

```typescript theme={null}
const googleAuth = worker.oauth("googleAuth", {
  name: "google-oauth",
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  scope: "https://www.googleapis.com/auth/calendar.readonly",
  clientId: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  authorizationParams: {
    access_type: "offline",
    prompt: "consent",
  },
});
```

### Salesforce

```typescript theme={null}
const salesforceAuth = worker.oauth("salesforceAuth", {
  name: "salesforce-oauth",
  authorizationEndpoint: "https://login.salesforce.com/services/oauth2/authorize",
  tokenEndpoint: "https://login.salesforce.com/services/oauth2/token",
  scope: "api refresh_token",
  clientId: process.env.SALESFORCE_CLIENT_ID ?? "",
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET ?? "",
});
```

<Tip>
  Some providers (like Salesforce) don't return `expires_in` in their token response. Set `accessTokenExpireMs` to a sensible default (e.g., `3600000` for 1 hour) so the runtime knows when to refresh.
</Tip>

## Next steps

<CardGroup cols={2}>
  <Card title="Secrets" icon="lock" href="/workers/guides/secrets">
    Store API keys and OAuth credentials securely.
  </Card>

  <Card title="Syncs" icon="rotate" href="/workers/guides/syncs">
    Sync external data into Notion databases.
  </Card>

  <Card title="Webhooks" icon="bell" href="/workers/guides/webhooks">
    Receive HTTP events from external services.
  </Card>
</CardGroup>
