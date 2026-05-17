> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# What are Notion Workers?

> Learn what Notion Workers are, what you can build with them, and how they fit into Notion.

Notion Workers are small Node/TypeScript programs that extend Notion. You write code, deploy it with the [Notion CLI](/cli/get-started/overview), and Notion hosts and runs it for you. No servers to manage.

With Workers, you can:

* **Sync external data** into [Notion databases](/guides/data-apis/working-with-databases) on a schedule.
* **Give Notion AI new tools** that your [Custom Agents](https://www.notion.com/help/custom-agents) can call.
* **Receive webhooks** from external services like GitHub, Stripe, or Zendesk.

Workers are designed to be built with AI coding agents. Scaffold a project, describe what you want, and deploy.

## What you can build

<CardGroup cols={3}>
  <Card title="Sync data" icon="https://mintcdn.com/notion-demo/7WdlNb9IZkRhGCcR/icons/nds/arrowCircleLoopForward.svg?fit=max&auto=format&n=7WdlNb9IZkRhGCcR&q=85&s=25d8d1ea2405c9af06347df80ab90fcf" href="/workers/guides/syncs" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/arrowCircleLoopForward.svg">
    Pull data from Salesforce, Stripe, GitHub, or any API into Notion databases — kept in sync automatically.
  </Card>

  <Card title="Agent tools" icon="https://mintcdn.com/notion-demo/7WdlNb9IZkRhGCcR/icons/nds/aiFace.svg?fit=max&auto=format&n=7WdlNb9IZkRhGCcR&q=85&s=d473a8d294324c9f2e19f44d487744dd" href="/workers/guides/tools" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/aiFace.svg">
    Give Notion Custom Agents functions like "create a Jira ticket" or "look up a customer in our CRM."
  </Card>

  <Card title="Webhooks" icon="https://mintcdn.com/notion-demo/yKfkO8UsVZTLLPNp/icons/nds/bell.svg?fit=max&auto=format&n=yKfkO8UsVZTLLPNp&q=85&s=0ee1c6e084361d853c48609a1f989a2c" href="/workers/guides/webhooks" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/bell.svg">
    Receive HTTP events from GitHub pushes, Stripe payments, or any service that sends webhooks.
  </Card>
</CardGroup>

## How it works

A worker is a single TypeScript file that exports a `Worker` instance. You register **capabilities** on it (syncs, tools, webhooks) and deploy with `ntn workers deploy`:

```typescript src/index.ts theme={null}
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;

// Register capabilities on the worker
worker.tool("sayHello", { /* ... */ });
worker.sync("customersSync", { /* ... */ });
worker.webhook("onGithubPush", { /* ... */ });
```

Once deployed, Notion takes over:

* **Syncs** run on a schedule (default every 30 minutes) and write results to Notion databases.
* **Tools** appear in Notion Custom Agents and are called by agents on demand.
* **Webhooks** receive HTTP events from external services and run your handler asynchronously.

Your code runs in a sandboxed Node.js environment. You can make HTTP requests to external APIs, [use secrets](/workers/guides/secrets) stored via the CLI, and authenticate with third-party services through [OAuth](/workers/guides/oauth).

| Concept        | What it does                                                                                            |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| **Worker**     | The container for your code. One worker per project.                                                    |
| **Capability** | Something the worker can do, i.e. a sync, tool, or webhook. A worker can have one or more capabilities. |
| **Database**   | A Notion database managed by a sync. You define its schema in code.                                     |
| **Pacer**      | Rate-limits outbound API calls so you don't hit third-party quotas.                                     |
| **OAuth**      | Handles authorization flows for services like GitHub and Google.                                        |
| **Secrets**    | Environment variables stored securely and injected at runtime.                                          |

## Typical workflow

<Steps>
  <Step title="Scaffold a project">
    ```bash theme={null}
    ntn workers new
    ```

    This creates a new directory with a `src/index.ts` starter file, TypeScript config, and dependencies.
  </Step>

  <Step title="Write your capabilities">
    Add syncs, tools, or webhooks to `src/index.ts`. Use an AI coding agent to help. The template includes prompts and skills, like the `/sync` skill.
  </Step>

  <Step title="Deploy">
    ```bash theme={null}
    ntn workers deploy
    ```

    The CLI bundles your code, uploads it to Notion, and starts running your capabilities.
  </Step>

  <Step title="Iterate">
    Edit your code and redeploy.
  </Step>
</Steps>

## Next steps

<CardGroup cols={2}>
  <Card title="Quickstart" icon="https://mintcdn.com/notion-demo/yKfkO8UsVZTLLPNp/icons/nds/arrowChevronDoubleForward.svg?fit=max&auto=format&n=yKfkO8UsVZTLLPNp&q=85&s=e9dad4152e1d3bf11e6a8404d9504665" href="/workers/get-started/quickstart" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/arrowChevronDoubleForward.svg">
    Create and deploy your first worker in less than five minutes.
  </Card>

  <Card title="CLI reference" icon="https://mintcdn.com/notion-demo/7WdlNb9IZkRhGCcR/icons/nds/terminal.svg?fit=max&auto=format&n=7WdlNb9IZkRhGCcR&q=85&s=ed75fe4bd49b0ec0117eeead6adb4e5d" href="/cli/get-started/overview" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/terminal.svg">
    Install and configure the Notion CLI.
  </Card>
</CardGroup>
