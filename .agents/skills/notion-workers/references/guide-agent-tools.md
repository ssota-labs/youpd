> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# How to write an agent tool

> Build custom tools that Notion Custom Agents can call.

Agent tools are functions that [Notion Custom Agents](https://www.notion.com/help/custom-agents) can call. Use a tool when an agent needs to look up external data, call your own service, perform an action that is not built into Notion or available through MCP, or apply custom validation that an MCP server does not provide.

This guide shows you how to add a tool to a worker, define its inputs, test it locally, and deploy it.

## Add a tool

In `src/index.ts`, import `Worker` and the schema builder:

```typescript theme={null}
import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";

const worker = new Worker();
export default worker;
```

Register a tool with `worker.tool`:

```typescript theme={null}
worker.tool("lookupCustomer", {
	title: "Lookup Customer",
	description: "Find a customer by email address.",
	schema: j.object({
		email: j.email().describe("The customer's email address."),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ email }) => {
		const customer = await findCustomerByEmail(email);

		if (!customer) {
			return {
				found: false,
				message: `No customer found for ${email}.`,
			};
		}

		return {
			found: true,
			name: customer.name,
			plan: customer.plan,
			accountUrl: customer.accountUrl,
		};
	},
});
```

The first argument, `"lookupCustomer"`, is the tool key. Use it when you run the tool from the CLI.

Choose a key that is stable and specific. If you rename a tool key, existing agent configuration that refers to the old key needs to be updated.

## Describe when the agent should use it

The `title` and `description` help Notion Custom Agents and users understand the tool. Keep the title short and write the description as an instruction boundary: what the tool does, and when it should be used.

```typescript theme={null}
worker.tool("createSupportTicket", {
	title: "Create Support Ticket",
	description:
		"Create a support ticket when the user asks to escalate an issue to the support team.",
	// ...
});
```

Avoid descriptions that are too broad, such as "Run support operations". A narrow description makes the tool easier for the agent to choose correctly.

## Define the input schema

Use the `j` schema builder to define the values your tool accepts. The builder creates a JSON Schema and gives TypeScript types to the `execute` input. See the [Schema and builders reference](/workers/reference/schema) for all available types.

```typescript theme={null}
worker.tool("searchTickets", {
	// ...
	schema: j.object({
		query: j.string().describe("The search query."),
		limit: j
			.number()
			.describe("The maximum number of results to return.")
			.nullable(),
		status: j.enum("open", "closed").describe("The ticket status to search."),
	}),
	// ...
});
```

Use `.describe()` on every field. Field descriptions tell the agent what each value means.

Use `.nullable()` for optional fields:

```typescript theme={null}
worker.tool("searchTickets", {
	// ...
	schema: j.object({
		query: j.string().describe("The search query."),
		limit: j
			.number()
			.describe("The maximum number of results to return.")
			.nullable(),
	}),
	// ...
});
```

In `execute`, handle nullable fields explicitly:

```typescript theme={null}
worker.tool("searchTickets", {
	// ...
	execute: async ({ query, limit }) => {
		const results = await searchTickets({
			query,
			limit: limit ?? 10,
		});

		return { results };
	},
});
```

The schema builder marks object properties as required and sets `additionalProperties: false`. Use `.nullable()` instead of omitting a property from the schema when a value is optional.

## Return structured output

A tool can return a string or any JSON-serialisable value. Prefer structured objects for results the agent may need to inspect or reuse:

```typescript theme={null}
worker.tool("lookupCustomer", {
	// ...
	execute: async ({ email }) => {
		const customer = await findCustomerByEmail(email);

		if (!customer) {
			return { found: false };
		}

		return {
			found: true,
			customer: {
				name: customer.name,
				plan: customer.plan,
				accountUrl: customer.accountUrl,
			},
		};
	},
});
```

If the output has a predictable shape, add `outputSchema`. The worker validates the returned value against this schema.

```typescript theme={null}
worker.tool("searchTickets", {
	// ...
	outputSchema: j.object({
		results: j.array(
			j.object({
				id: j.string().describe("The ticket ID."),
				title: j.string().describe("The ticket title."),
				url: j.string().describe("A URL for the ticket."),
			}),
		),
	}),
	execute: async ({ query }) => {
		const tickets = await searchTickets(query);
		return {
			results: tickets.map(ticket => ({
				id: ticket.id,
				title: ticket.title,
				url: ticket.url,
			})),
		};
	},
});
```

## Mark read-only tools

If a tool only reads data and has no side effects, set `readOnlyHint`:

```typescript theme={null}
worker.tool("previewAccountDeletion", {
	title: "Preview Account Deletion",
	description:
		"Inspect what would be affected if an account were deleted, without deleting or changing anything.",
	// ...
	hints: { readOnlyHint: true },
	// ...
});
```

Read-only tools are safe to call repeatedly and can be auto-executed under the default policy. Tools without this hint are treated as write tools, so the Custom Agent will ask for permission from the user before executing the tool unless the agent's settings change that behaviour.

## Use Notion and external APIs

The second argument to `execute` is a context object. Use `context.notion` to call the Notion API with the worker's authenticated Notion client. The client has the same permissions as the Custom Agent running the tool:

```typescript theme={null}
worker.tool("getPageTitle", {
	title: "Get Page Title",
	description: "Read the title of a Notion page.",
	schema: j.object({
		pageId: j.string().describe("The Notion page ID."),
	}),
	hints: { readOnlyHint: true },
	execute: async ({ pageId }, { notion }) => {
		const page = await notion.pages.retrieve({ page_id: pageId });
		return page;
	},
});
```

For external APIs, store credentials as worker [secrets](/workers/guides/secrets) and read them from `process.env`. For APIs that require user authorization (GitHub, Google, Salesforce), use [OAuth](/workers/guides/oauth) instead.

For more on `context.notion`, see [Using the Notion API from a worker](/workers/guides/api-client).

## Test a tool locally

Run the tool from your worker project with `ntn workers exec --local`:

```bash theme={null}
ntn workers exec lookupCustomer --local -d '{"email":"ada@example.com"}'
```

The CLI loads `.env` by default for local execution. To load another file, pass `--dotenv`:

```bash theme={null}
ntn workers exec lookupCustomer --local --dotenv .env.local -d '{"email":"ada@example.com"}'
```

<Note>
  The Workers runtime injects a preauthenticated Notion SDK client when your
  tool runs in Notion, but that client is not available during local execution.
  When testing locally, we recommend setting `NOTION_API_TOKEN` to a
  [personal access token](/guides/get-started/personal-access-tokens) in your
  `.env` file, which the SDK uses to create the client.
</Note>

If you do not want to load a `.env` file, pass `--no-dotenv`:

```bash theme={null}
ntn workers exec lookupCustomer --local --no-dotenv -d '{"email":"ada@example.com"}'
```

Use local execution to check schema validation, returned output, and errors before deploying.

## Deploy and run the tool

Deploy the worker:

```bash theme={null}
ntn workers deploy
```

After deployment, run the hosted tool from the CLI:

```bash theme={null}
ntn workers exec lookupCustomer -d '{"email":"ada@example.com"}'
```

When the tool works as expected, add it to a Notion Custom Agent from the agent's tool configuration.

See the [CLI command reference](/cli/reference/commands) for all `ntn workers exec` flags and options.

## Next steps

<CardGroup cols={2}>
  <Card title="Schema and builders" icon="code" href="/workers/reference/schema">
    Full reference for the j schema builder and all input types.
  </Card>

  <Card title="SDK reference" icon="book-open" href="/workers/reference/sdk#worker-tool">
    Detailed API docs for worker.tool(), hints, and output schemas.
  </Card>

  <Card title="Secrets" icon="lock" href="/workers/guides/secrets">
    Store API keys and credentials for your tools.
  </Card>

  <Card title="Notion API" icon="database" href="/workers/guides/api-client">
    Read and write Notion data from inside a tool.
  </Card>
</CardGroup>
