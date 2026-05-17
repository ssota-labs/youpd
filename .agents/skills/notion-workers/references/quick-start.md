> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Quickstart

> Create and deploy your first worker in minutes.

Get up and running with Workers in a few steps.

## Prerequisites

<CardGroup cols={2}>
  <Card title="Node.js" icon="node-js" horizontal color="#0076d7">
    Version 22 or higher
  </Card>

  <Card title="npm" icon="npm" horizontal color="#0076d7">
    Version 10 or higher
  </Card>
</CardGroup>

## Create your first worker

<Steps>
  <Step title="Install the CLI">
    ```bash theme={null}
    curl -fsSL https://ntn.dev | bash
    ```
  </Step>

  <Step title="Initialize a new project">
    Scaffold a new worker project:

    ```bash theme={null}
    ntn workers new
    ```

    Choose a folder name when prompted.
  </Step>

  <Step title="Deploy to Notion">
    Connect to your Notion workspace and deploy:

    ```bash theme={null}
    ntn workers deploy
    ```

    Follow the prompts to authenticate with your Notion workspace.
  </Step>

  <Step title="Run the sample tool">
    Execute the included sample tool:

    ```bash theme={null}
    ntn workers exec sayHello -d '{"name": "World"}'
    ```
  </Step>
</Steps>

## What's in a worker?

The scaffolded project lives in `src/index.ts` and exports a single `Worker` instance:

```typescript src/index.ts theme={null}
import { Worker } from "@notionhq/workers";

const worker = new Worker();
export default worker;

worker.tool("sayHello", {
  title: "Say Hello",
  description: "Returns a friendly greeting",
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
    },
    required: ["name"],
    additionalProperties: false,
  },
  execute: ({ name }) => `Hello, ${name}!`,
});
```

## Next steps

<CardGroup cols={2}>
  <Card title="Syncs" icon="https://mintcdn.com/notion-demo/7WdlNb9IZkRhGCcR/icons/nds/arrowCircleLoopForward.svg?fit=max&auto=format&n=7WdlNb9IZkRhGCcR&q=85&s=25d8d1ea2405c9af06347df80ab90fcf" href="/workers/guides/syncs" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/arrowCircleLoopForward.svg">
    Sync external data into Notion databases.
  </Card>

  <Card title="Agent tools" icon="https://mintcdn.com/notion-demo/7WdlNb9IZkRhGCcR/icons/nds/aiFace.svg?fit=max&auto=format&n=7WdlNb9IZkRhGCcR&q=85&s=d473a8d294324c9f2e19f44d487744dd" href="/workers/guides/tools" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/aiFace.svg">
    Build custom tools for Notion AI.
  </Card>

  <Card title="Webhooks" icon="https://mintcdn.com/notion-demo/yKfkO8UsVZTLLPNp/icons/nds/bell.svg?fit=max&auto=format&n=yKfkO8UsVZTLLPNp&q=85&s=0ee1c6e084361d853c48609a1f989a2c" href="/workers/guides/webhooks" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/bell.svg">
    Receive HTTP events from external services.
  </Card>

  <Card title="OAuth" icon="https://mintcdn.com/notion-demo/yKfkO8UsVZTLLPNp/icons/nds/pathRoundEnds.svg?fit=max&auto=format&n=yKfkO8UsVZTLLPNp&q=85&s=f1b9491091d34c2249a03218696218a3" href="/workers/guides/oauth" horizontal color="#0076d7" width="20" height="20" data-path="icons/nds/pathRoundEnds.svg">
    Connect to third-party APIs.
  </Card>
</CardGroup>
