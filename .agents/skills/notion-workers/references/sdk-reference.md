> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# SDK reference

> Complete reference for the @notionhq/workers SDK.

The `@notionhq/workers` SDK defines a worker manifest in TypeScript. A worker exports one `Worker` instance, then registers resource declarations and capabilities on that instance.

```typescript src/index.ts theme={null}
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;
```

For database schemas, property value builders, and tool input schemas, see [Schema and builders](/workers/reference/schema).

## Worker

```typescript theme={null}
import { Worker } from "@notionhq/workers";
```

`Worker` is the entry point for every worker project. The class exposes methods
that add databases, pacers, and capabilities to the worker manifest.

| Method                                  | Adds       | Description                                                      |
| --------------------------------------- | ---------- | ---------------------------------------------------------------- |
| [`worker.database()`](#worker-database) | Database   | Declares a managed Notion database for sync output.              |
| [`worker.pacer()`](#worker-pacer)       | Pacer      | Declares a rate limit budget for calls to an external API.       |
| [`worker.sync()`](#worker-sync)         | Capability | Syncs upstream records into a managed Notion database.           |
| [`worker.tool()`](#worker-tool)         | Capability | Defines a callable tool with JSON Schema input and output.       |
| [`worker.webhook()`](#worker-webhook)   | Capability | Defines an HTTP webhook handler.                                 |
| [`worker.oauth()`](#worker-oauth)       | Capability | Defines OAuth configuration for external service authentication. |

<h2 id="worker-database">
  worker.database()
</h2>

Declares a managed Notion database for sync output.

```typescript theme={null}
const tasks = worker.database("tasks", {
	type: "managed",
	initialTitle: "Tasks",
	primaryKeyProperty: "Task ID",
	schema: {
		properties: {
			Name: Schema.title(),
			"Task ID": Schema.richText(),
			Status: Schema.select([{ name: "Open" }, { name: "Done" }]),
		},
	},
});
```

| Property             | Description                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `type`               | Database declaration type. Currently only `"managed"` is supported.                                          |
| `initialTitle`       | Title used when Notion first creates the database. Changing this later does not rename an existing database. |
| `primaryKeyProperty` | Property used to match sync changes to Notion pages. Must be present in `schema.properties`.                 |
| `schema`             | Database property schema. See [Schema and builders](/workers/reference/schema).                              |

### Managed database lifecycle

Each `worker.database()` declaration corresponds to a Notion database that the
platform creates for the worker. Managed databases are migrated on every deploy.
Changing the schema in code and redeploying migrates the database schema in
Notion.

<Warning>
  Schema migrations can drop data. Review schema changes before deploying,
  especially when removing or changing existing properties.
</Warning>

Managed databases are currently used only by sync capabilities. They are not
generic worker storage, and they are not used by webhooks.

The managed database schema must match the property values returned by sync
changes. In Notion, properties defined in code are not editable. Users can add
additional properties to the database, and those additional properties remain
editable in Notion.

`worker.database()` returns an opaque database handle. Pass that handle to `worker.sync()`.

<h2 id="worker-pacer">
  worker.pacer()
</h2>

Declares a rate limit budget for calls to an external API.

```typescript theme={null}
const issueTrackerApi = worker.pacer("issueTrackerApi", {
	allowedRequests: 10,
	intervalMs: 1000,
});
```

| Property          | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `allowedRequests` | Maximum requests allowed per interval.                   |
| `intervalMs`      | Interval length in milliseconds.                         |
| `wait()`          | Promise that resolves when the next request can proceed. |

Call `await issueTrackerApi.wait()` before each external API request in a sync.

A pacer spreads requests across the configured window. The server injects a
wait-between period, and `wait()` sleeps the sandbox for that period before the
next request proceeds. For example, a pacer configured for 10,000 requests per
day spaces those requests across the day instead of allowing the worker to use
the full budget immediately.

This pacing can underutilise the upstream limit, but it keeps syncs making
progress throughout the pacer window. When multiple capabilities use the same
pacer, the server calculates the number of concurrently executing capabilities
and divides the pace across them.

<h2 id="worker-sync">
  worker.sync()
</h2>

Registers a sync capability that writes changes into a [database](#worker-database). See the [Syncs guide](/workers/guides/syncs) for usage patterns, pagination, and scheduling.

```typescript theme={null}
worker.sync("tasksSync", {
	database: tasks,
	schedule: "30m",
	execute: async (state) => {
		const page = state?.page ?? 1;
		await issueTrackerApi.wait();
		const { items, hasMore } = await fetchTasks(page);

		return {
			changes: items.map((item) => ({
				type: "upsert",
				key: item.id,
				properties: {
					Name: Builder.title(item.name),
					"Task ID": Builder.richText(item.id),
					Status: Builder.select(item.status),
				},
			})),
			hasMore,
			nextState: hasMore ? { page: page + 1 } : undefined,
		};
	},
});
```

| Property   | Description                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `database` | Database handle returned from `worker.database()`.                                                               |
| `mode`     | Sync lifecycle mode. Defaults to `"replace"`.                                                                    |
| `schedule` | Run cadence. Defaults to `"30m"`.                                                                                |
| `execute`  | Function that fetches upstream data and returns sync changes. Receives the previous state as its first argument. |

### Execution cycle

A sync cycle is one or more `execute` calls. The runtime calls `execute` once,
applies the returned changes, and calls it again when `hasMore` is `true`. The
cycle completes when `hasMore` is `false`.

`state` is `undefined` on the first execution. To continue within a cycle, return
`hasMore: true` with a serialisable `nextState`; the runtime passes that value
as `state` to the next `execute` call.

### State

```typescript theme={null}
execute: async (state) => {
	const cursor = state?.cursor;
	const { items, nextCursor } = await fetchChanges(cursor);

	return {
		changes: items.map(toUpsert),
		hasMore: Boolean(nextCursor),
		nextState: nextCursor ? { cursor: nextCursor } : undefined,
	};
}
```

`nextState` can be a cursor string, page number, timestamp, or object. Return it
whenever the next execution needs a cursor. If `hasMore` is `true`, `nextState`
must contain enough information for the next `execute` call to make progress.
Sync state persists across scheduled executions and deploys.

For incremental syncs against eventually consistent APIs, keep timestamp cursors
slightly behind the current time so recently written upstream records are not
skipped permanently:

```typescript theme={null}
const bufferedNow = new Date(Date.now() - 15_000).toISOString();
const latestReturnedCursor = records.at(-1)?.updatedAt;
const cursor =
	latestReturnedCursor && latestReturnedCursor < bufferedNow
		? latestReturnedCursor
		: bufferedNow;

return {
	changes: records.map(toUpsert),
	hasMore: false,
	nextState: { cursor },
};
```

### Modes

| Mode            | Description                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"replace"`     | Each completed sync cycle represents the full upstream dataset. After `hasMore: false`, records not seen in the cycle are deleted.                 |
| `"incremental"` | Each completed sync cycle represents only changed records. Existing records not mentioned are left unchanged; deletes must be returned explicitly. |

Use `mode: "replace"` for small sources or full backfills. Use
`mode: "incremental"` for delta syncs that fetch only records changed since the
last cursor.

### Schedule

```typescript theme={null}
worker.sync("hourlySync", {
	database: tasks,
	schedule: "1h",
	execute: async () => ({
		changes: [],
		hasMore: false,
	}),
});
```

Use `"continuous"`, `"manual"`, or an interval string ending in `m`, `h`, or
`d`. Interval schedules must be at least `1m` and at most `7d`.

| Schedule                | Description                              |
| ----------------------- | ---------------------------------------- |
| `"continuous"`          | Runs as frequently as the system allows. |
| `"manual"`              | Runs only when explicitly triggered.     |
| `"15m"`, `"1h"`, `"1d"` | Runs at the specified interval.          |

If `schedule` is omitted, the sync runs every 30 minutes.

### Sync result

```typescript theme={null}
const result = {
	changes: [],
	hasMore: false,
};
```

For paginated syncs, return `hasMore: true` with a serialisable `nextState`:

```typescript theme={null}
const result = {
	changes,
	hasMore: true,
	nextState: { cursor: "next-page-cursor" },
};
```

| Property    | Description                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `changes`   | Batch of upsert and delete changes to apply.                                                                           |
| `hasMore`   | `true` when the runtime should call `execute` again with `nextState`; `false` when the current sync cycle is complete. |
| `nextState` | Optional serialisable cursor or pagination state for the next execution. Required when `hasMore` is `true`.            |

Return batches sized for the upstream API and sync runtime. A batch of about 100
changes is a typical starting point.

### Sync changes

```typescript theme={null}
const upsert = {
	type: "upsert",
	key: "task-123",
	properties: {
		Name: Builder.title("Write SDK docs"),
		"Task ID": Builder.richText("task-123"),
		Status: Builder.select("Open"),
	},
	upstreamUpdatedAt: "2026-05-11T09:30:00Z",
	pageContentMarkdown: "Imported from the upstream task tracker.",
};
```

Use `"delete"` to remove a record by upstream key:

```typescript theme={null}
const deleteChange = {
	type: "delete",
	key: "task-123",
};
```

| Property              | Description                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `type`                | `"upsert"` creates or updates a record. `"delete"` removes a record.                                                    |
| `key`                 | Upstream record identifier. This should match the value stored in the database primary key property.                    |
| `targetDatabaseKey`   | Optional database key override. Defaults to the database associated with the sync.                                      |
| `properties`          | Upsert-only property values. Keys must match the database schema. See [Schema and builders](/workers/reference/schema). |
| `upstreamUpdatedAt`   | Optional ISO 8601 timestamp used for conflict resolution when multiple syncs write to the same database.                |
| `icon`                | Optional page icon.                                                                                                     |
| `pageContentMarkdown` | Optional markdown page body content.                                                                                    |

Delete changes are only applicable in `mode: "incremental"`. In
`mode: "replace"`, the runtime deletes records that were not seen by the end of
the completed sync cycle.

### Multiple syncs for one database

Multiple syncs can write to the same database by passing the same database
handle. A common pattern is a manual replace-mode backfill sync plus a scheduled
incremental delta sync:

```typescript theme={null}
worker.sync("tasksBackfill", {
	database: tasks,
	mode: "replace",
	schedule: "manual",
	execute: async (state) => {
		const page = state?.page ?? 1;
		await issueTrackerApi.wait();
		const { items, hasMore } = await fetchAllTasks(page);

		return {
			changes: items.map(toTaskUpsert),
			hasMore,
			nextState: hasMore ? { page: page + 1 } : undefined,
		};
	},
});

worker.sync("tasksDelta", {
	database: tasks,
	mode: "incremental",
	schedule: "5m",
	execute: async (state) => {
		const cursor = state?.cursor;
		await issueTrackerApi.wait();
		const { items, nextCursor } = await fetchChangedTasks(cursor);

		return {
			changes: items.map(toTaskUpsert),
			hasMore: Boolean(nextCursor),
			nextState: nextCursor ? { cursor: nextCursor } : undefined,
		};
	},
});
```

Both syncs must use unique sync keys. When multiple syncs share a pacer, the
server apportions the request budget across them. Use `upstreamUpdatedAt` on
upsert changes when multiple syncs can update the same record.

<h2 id="worker-tool">
  worker.tool()
</h2>

Registers a tool that can be called by Notion Custom Agents. See the [Agent tools guide](/workers/guides/tools) for a walkthrough of defining inputs, testing locally, and deploying.

Tools extend custom agent functionality. A worker is attached to a custom agent,
and each tool declared by that worker can be enabled or disabled on that
connection.

```typescript theme={null}
worker.tool("searchTasks", {
	title: "Search tasks",
	description: "Searches tasks by query.",
	schema: j.object({
		query: j.string().describe("Search query."),
	}),
	outputSchema: j.object({
		results: j.array(j.string()),
	}),
	hints: {
		readOnlyHint: true,
	},
	execute: async ({ query }) => {
		const results = await searchTasks(query);
		return { results };
	},
});
```

| Property       | Description                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `title`        | Human-readable tool name shown in Notion.                                                                                  |
| `description`  | Description of what the tool does and when it should be used.                                                              |
| `schema`       | Input schema built with `j` from `@notionhq/workers/schema-builder`. See [Schema and builders](/workers/reference/schema). |
| `outputSchema` | Optional output schema built with `j`. When present, tool output is validated before it is returned.                       |
| `hints`        | Optional advisory metadata for Notion Custom Agents.                                                                       |
| `execute`      | Function called with validated input and a capability context. The return value must be JSON-serialisable.                 |

### Tool hints

```typescript theme={null}
hints: {
	readOnlyHint: true,
}
```

Tool hints describe how the tool behaves. `readOnlyHint: true` marks a tool as
read-only and safe to auto-execute. Tools without `readOnlyHint: true` are
treated as write tools and prompt for confirmation.

<h2 id="worker-webhook">
  worker.webhook()
</h2>

Registers an HTTP webhook endpoint for external services. See the [Webhooks guide](/workers/guides/webhooks) for request verification, retries, and using the Notion API from a webhook handler.

```typescript theme={null}
worker.webhook("onGithubPush", {
	title: "GitHub push",
	description: "Handles GitHub push events.",
	execute: async (events) => {
		for (const event of events) {
			if (!verifySignature(event.rawBody, event.headers)) {
				throw new WebhookVerificationError("Invalid signature");
			}
		}
	},
});
```

| Property      | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| `title`       | Human-readable webhook name shown in Notion.                          |
| `description` | Description of what the webhook handles.                              |
| `execute`     | Function called when the webhook receives events.                     |
| `deliveryId`  | Unique ID for this webhook delivery, stable across retries.           |
| `body`        | Parsed JSON body, or an empty object when the body is not valid JSON. |
| `rawBody`     | Raw request body. Use this for signature verification.                |
| `headers`     | HTTP headers from the incoming request.                               |
| `method`      | HTTP method, such as `"POST"`.                                        |

Throw `WebhookVerificationError` from `execute` to signal signature verification failure. After five consecutive verification failures, the platform rejects incoming requests for the webhook without executing the handler.

<h2 id="worker-oauth">
  worker.oauth()
</h2>

Registers a user-managed OAuth provider and returns an OAuth capability handle. See the [OAuth guide](/workers/guides/oauth) for the full setup flow, including provider configuration and testing locally.

OAuth capabilities require an OAuth app configured with the external provider.
Use the provider's client ID, client secret, authorisation endpoint, token
endpoint, and scopes in the capability configuration. Store credentials as [secrets](/workers/guides/secrets), not in code.

```typescript theme={null}
const githubAuth = worker.oauth("githubAuth", {
	name: "GitHub",
	clientId: process.env.GITHUB_CLIENT_ID ?? "",
	clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
	authorizationEndpoint: "https://github.com/login/oauth/authorize",
	tokenEndpoint: "https://github.com/login/oauth/access_token",
	scope: "repo user",
});
```

| Property                | Description                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `name`                  | OAuth provider instance name. Used to identify the connected token.                                        |
| `clientId`              | OAuth app client ID.                                                                                       |
| `clientSecret`          | OAuth app client secret.                                                                                   |
| `authorizationEndpoint` | OAuth 2.0 authorisation endpoint.                                                                          |
| `tokenEndpoint`         | OAuth 2.0 token endpoint.                                                                                  |
| `scope`                 | OAuth scopes requested during authorisation.                                                               |
| `authorizationParams`   | Optional extra query parameters for the authorisation request.                                             |
| `callbackUrl`           | Optional OAuth redirect URL override.                                                                      |
| `accessTokenExpireMs`   | Optional default access token expiry in milliseconds when the provider does not return expiry information. |

### OAuth setup

Use the redirect URL from the CLI when configuring the OAuth app with the
provider:

```shell theme={null}
ntn workers oauth show-redirect-url
```

After the worker is deployed, start the three-legged OAuth flow for the OAuth
capability:

```shell theme={null}
ntn workers oauth start githubAuth
```

`githubAuth` is the capability key passed as the first argument to
`worker.oauth()`.

Use `accessToken()` from tool, sync, or webhook handlers to read the connected token.

```typescript theme={null}
const token = await githubAuth.accessToken();
```

After the OAuth flow completes, the server stores the refresh token and refreshes
access tokens automatically according to the access token expiry. If the token
response does not include expiry information, `accessTokenExpireMs` supplies the
default expiry interval.
