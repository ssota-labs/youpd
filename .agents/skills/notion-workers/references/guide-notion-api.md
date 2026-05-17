> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Using the Notion API from a worker

> Read and write Notion pages and databases from inside a Notion Worker.

Every capability's `execute` function receives a [Notion API client](https://github.com/makenotion/notion-sdk-js) as `context.notion`. This is the official `@notionhq/client` SDK (the same one you'd use outside of Workers):

```typescript theme={null}
worker.tool("example", {
  // ...
  execute: async (input, { notion }) => {
    const page = await notion.pages.retrieve({ page_id: "..." });
    return page;
  },
});
```

## Authentication

How the client is authenticated depends on how the capability runs:

| Context                                                | How it works                                                                                                                  |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Tool called by a Custom Agent**                      | The platform sets `NOTION_API_TOKEN` automatically. The client has the same permissions as the Custom Agent. No setup needed. |
| **Syncs, webhooks, local testing, `ntn workers exec`** | You must provide a token yourself.                                                                                            |

To set a token for syncs, webhooks, or local development, you have two options:

* **[Personal access token](/guides/get-started/personal-access-tokens):** acts as you, with access to everything your user has access to. Simpler to set up since you don't need to manually connect it to each page.
* **[Internal integration token](/guides/get-started/internal-connections):** acts as a bot, with access limited to pages explicitly connected via the Connections menu.

<Steps>
  <Step title="Create a token">
    Create a [personal access token](https://www.notion.so/profile/integrations) or an [internal integration](https://www.notion.so/profile/integrations/internal) and copy the token.
  </Step>

  <Step title="Store the token as a secret">
    ```bash theme={null}
    ntn workers env set NOTION_API_TOKEN=ntn_...
    ```
  </Step>

  <Step title="Grant access (internal integrations only)">
    If using an internal integration, open each page or database your worker needs access to, click the **three-dot menu** in the top right, and add the integration under **Connections**. This step is not needed for personal access tokens.
  </Step>
</Steps>

For local development, pull secrets to a `.env` file so the token is available when running `ntn workers exec`:

```bash theme={null}
ntn workers env pull
```

## Common operations

The examples below use `{ notion }` destructured from the second argument to `execute`. They work the same way in tools, syncs, and webhooks:

### Query a database

```typescript theme={null}
const response = await notion.databases.query({
  database_id: "...",
  filter: {
    property: "Status",
    select: { equals: "Active" },
  },
});

for (const page of response.results) {
  // process each page
}
```

### Retrieve a page

```typescript theme={null}
const page = await notion.pages.retrieve({
  page_id: "...",
});
```

### Create a page

```typescript theme={null}
await notion.pages.create({
  parent: { database_id: "..." },
  properties: {
    Name: {
      title: [{ text: { content: "New item" } }],
    },
    Status: {
      select: { name: "Open" },
    },
  },
});
```

### Update page properties

```typescript theme={null}
await notion.pages.update({
  page_id: "...",
  properties: {
    Status: {
      select: { name: "Done" },
    },
  },
});
```

### Search

```typescript theme={null}
const results = await notion.search({
  query: "meeting notes",
  filter: { property: "object", value: "page" },
});
```

### Read page content (blocks)

```typescript theme={null}
const blocks = await notion.blocks.children.list({
  block_id: pageId,
});
```

## Permissions

What the client can access depends on the token type:

* **Custom Agent tools:** the client has the same permissions as the Custom Agent.
* **Personal access token:** the client can access everything you can access in Notion.
* **Internal integration token:** the client can only access pages and databases that the integration has been explicitly connected to via the Connections menu.

If a request returns a 403 or 404, check that your token has access to the relevant page.

For full SDK documentation, see the [Notion API reference](/reference/intro) and the [TypeScript SDK on GitHub](https://github.com/makenotion/notion-sdk-js).

## Next steps

<CardGroup cols={2}>
  <Card title="Syncs" icon="rotate" href="/workers/guides/syncs">
    Sync external data into Notion databases.
  </Card>

  <Card title="Agent tools" icon="wand-magic-sparkles" href="/workers/guides/tools">
    Build custom tools for Notion AI.
  </Card>

  <Card title="Webhooks" icon="bell" href="/workers/guides/webhooks">
    Receive HTTP events from external services.
  </Card>

  <Card title="OAuth" icon="key" href="/workers/guides/oauth">
    Connect to third-party APIs with user authorization.
  </Card>

  <Card title="Secrets" icon="lock" href="/workers/guides/secrets">
    Store API keys and credentials securely.
  </Card>
</CardGroup>
