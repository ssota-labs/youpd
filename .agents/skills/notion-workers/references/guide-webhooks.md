> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Webhooks

> Receive HTTP events from external services in a Notion Worker.

Webhooks expose an HTTP endpoint that external services can call. Use them to push events from external systems into Notion, such as a GitHub push, Stripe event, Zendesk ticket update, or any service that can send an HTTP webhook.

## Basic webhook

Define a webhook capability on your worker like this:

```typescript theme={null}
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;

worker.webhook("onExternalEvent", {
  title: "External Event Handler",
  description: "Processes incoming webhook requests",
  execute: async (events) => {
    for (const event of events) {
      console.log("Delivery:", event.deliveryId);
      console.log("Method:", event.method);
      console.log("Body:", event.body);
    }
  },
});
```

After you deploy, Notion creates a URL for each webhook capability. Give that URL to the external service as its webhook destination:

```bash theme={null}
ntn workers deploy
ntn workers webhooks list
```

## The event object

The `execute` function receives an array of `WebhookEvent` objects. The array currently contains one event, but may contain multiple events in the future.

| Property     | Type                      | Description                                                                                   |
| :----------- | :------------------------ | :-------------------------------------------------------------------------------------------- |
| `deliveryId` | `string`                  | Unique ID for this Notion delivery. It is stable across retries for the same inbound request. |
| `body`       | `Record<string, unknown>` | Parsed JSON body. If the request body is not a JSON object, this is `{}`.                     |
| `rawBody`    | `string`                  | Original request body as a string. Use this for signature verification.                       |
| `headers`    | `Record<string, string>`  | Request headers. Header names are lowercased.                                                 |
| `method`     | `string`                  | HTTP method used by the sender. Webhook URLs accept `POST` requests.                          |

<Tip>
  Use the external provider's own event ID for idempotency when the payload includes one.
  `deliveryId` is useful when Notion retries running your worker, but a provider may
  redeliver the same event as a new HTTP request.
</Tip>

## Webhook URLs

Webhook URLs include a unique ID that acts as a shared secret:

```text theme={null}
https://www.notion.so/webhooks/worker/{spaceId}/{workerId}/{uniqueWebhookId}/{webhookName}
```

Use the CLI to print the URLs for a deployed worker:

```bash theme={null}
ntn workers webhooks list
```

For scripts, use JSON or tab-separated output:

```bash theme={null}
ntn workers webhooks list --json
ntn workers webhooks list --plain
```

<Warning>
  Treat webhook URLs as secrets. Anyone with the full URL can send events to the
  webhook endpoint unless you add provider-specific signature verification inside your worker.
</Warning>

## Verify requests

Most webhook providers can sign requests with a shared [secret](/workers/guides/secrets). Store the signing secret as a worker secret, verify each request using `event.rawBody` and `event.headers`, and throw `WebhookVerificationError` when verification fails:

```typescript theme={null}
import * as crypto from "node:crypto";
import { WebhookVerificationError, Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;

/**
 * Verify a GitHub webhook signature.
 * GitHub sends the HMAC-SHA256 signature in the X-Hub-Signature-256 header
 * as "sha256={hex}". The raw body must be used for verification.
 */
function verifyGitHubSignature(
  rawBody: string,
  headers: Record<string, string>,
): void {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new WebhookVerificationError("GITHUB_WEBHOOK_SECRET not configured");
  }

  const signature = headers["x-hub-signature-256"];
  if (!signature?.startsWith("sha256=")) {
    throw new WebhookVerificationError("Invalid GitHub signature");
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  if (signature.length !== expected.length) {
    throw new WebhookVerificationError("Invalid GitHub signature");
  }

  // Use timing-safe comparison to prevent timing attacks.
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new WebhookVerificationError("Invalid GitHub signature");
  }
}

worker.webhook("onGithubPush", {
  title: "GitHub Push Webhook",
  description: "Handles push events from GitHub repositories",
  execute: async (events) => {
    for (const event of events) {
      verifyGitHubSignature(event.rawBody, event.headers);
      console.log("Verified GitHub event:", event.body);
    }
  },
});
```

Set the secret before deploying or push it from your local `.env` file:

```bash theme={null}
ntn workers env set GITHUB_WEBHOOK_SECRET=your-secret
```

See [Secrets](/workers/guides/secrets) for more ways to manage worker environment variables.

<Warning>
  After 5 consecutive `WebhookVerificationError` failures, Notion blocks that
  webhook before running your handler. Redeploy the worker to reset the failure
  counter.
</Warning>

## Execution and retries

When a webhook request reaches Notion, Notion validates the URL, enqueues the event, and responds with `202 Accepted`. Your worker runs asynchronously after the HTTP response is sent.

If your handler throws `WebhookVerificationError`, Notion records a verification failure and does not retry that event. If your handler throws another error, Notion retries the worker run up to 3 times.

Successful runs reset the consecutive verification failure counter.

## Use Notion from a webhook

Webhook handlers receive the same context object as other capabilities, including `context.notion`, the Notion API SDK client:

```typescript theme={null}
worker.webhook("createPageFromWebhook", {
  title: "Create Page From Webhook",
  description: "Creates a page when an external event is received",
  execute: async (events, { notion }) => {
    const databaseId = process.env.MY_WEBHOOK_DATABASE_ID;

    if (!databaseId) {
      throw new Error("MY_WEBHOOK_DATABASE_ID is not configured");
    }

    for (const event of events) {
      const externalId =
        typeof event.body.id === "string" ? event.body.id : event.deliveryId;

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `Webhook event ${externalId}`,
                },
              },
            ],
          },
        },
      });
    }
  },
});
```

For webhooks, `context.notion` is not automatically authenticated. To call the Notion API, create an internal integration, give it access to the relevant pages or databases, and store the integration token in `NOTION_API_TOKEN`:

```bash theme={null}
ntn workers env set NOTION_API_TOKEN=secret_xxx
```

At runtime, `context.notion` reads `process.env.NOTION_API_TOKEN` and uses it as the Notion API client token.

For more information about creating an integration token for a worker, see [Using the Notion API from a worker](/workers/guides/api-client).

## Inspect runs

Use worker run logs to debug webhook executions:

```bash theme={null}
ntn workers runs list
ntn workers runs logs <run-id>
```

To find recent webhook runs quickly:

```bash theme={null}
ntn workers runs list --plain | grep webhook
```

See the [CLI command reference](/cli/reference/commands) for all `ntn workers` flags and options.

## Next steps

<CardGroup cols={2}>
  <Card title="Secrets" icon="lock" href="/workers/guides/secrets">
    Store webhook signing secrets and API keys.
  </Card>

  <Card title="Notion API" icon="database" href="/workers/guides/api-client">
    Read and write Notion data from a webhook handler.
  </Card>

  <Card title="OAuth" icon="key" href="/workers/guides/oauth">
    Authenticate with third-party APIs from your webhook.
  </Card>

  <Card title="SDK reference" icon="book-open" href="/workers/reference/sdk#worker-webhook">
    Detailed API docs for worker.webhook() and WebhookVerificationError.
  </Card>
</CardGroup>
