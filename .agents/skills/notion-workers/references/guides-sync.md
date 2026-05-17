> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Syncs

> Pull external data into Notion databases and keep it up to date.

A sync pulls data from external sources like Salesforce, Stripe, and GitHub and writes it to a [Notion database](/guides/data-apis/working-with-databases). You define a schema for the database and an `execute` function that returns the data. Notion runs it on a schedule and manages the database for you.

## Define a database and sync

Every sync needs a database to write to. Declare one with `worker.database()`, then register a sync that targets it:

```typescript src/index.ts theme={null}
import { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";

const worker = new Worker();
export default worker;

const issues = worker.database("issues", {
  // only "managed" type is supported for now
  type: "managed",
  // the initial title of the database
  initialTitle: "Issues",
  // the property that uniquely identifies each row
  primaryKeyProperty: "Issue ID",
  // the schema defines the structure of the database
  schema: {
    // define each database property and its type
    properties: {
      Name: Schema.title(),
      "Issue ID": Schema.richText(),
      Status: Schema.richText(),
    },
  },
});

worker.sync("issuesSync", {
  // ...
});
```

`primaryKeyProperty` tells Notion which property uniquely identifies each row. This is typically the entity's ID in the external API (e.g., a Salesforce Contact ID or GitHub issue ID). When your sync emits a record with the same `key`, Notion updates the existing row instead of creating a duplicate.

<Tip>
  Syncs currently create and manage their own databases. Support for syncing to existing databases is coming soon.
</Tip>

### Schema and properties

The `schema.properties` object defines the columns of your Notion database. Each property uses a `Schema` helper to declare its type, and each upsert uses the corresponding `Builder` helper to set its value.

For the full list of supported property types, see [Schema and builders](/workers/reference/schema).

## Choose a sync mode

Workers support two sync modes. Pick the one that fits your needs:

<Tabs>
  <Tab title="Replace (default)">
    Each sync cycle returns the **full dataset**. After the final `hasMore: false`, any rows not seen during that cycle are automatically deleted.

    Best for smaller datasets (under 10k records) or APIs that don't support change tracking. Also used as the [backfill half](#combine-backfill-and-delta-syncs) of a backfill + delta pair.

    ```typescript theme={null}
    worker.sync("teamsSync", {
      database: teams,
      mode: "replace",
      execute: async (state) => {
        const page = state?.page ?? 1;
        const { items, hasMore } = await fetchPage(page, 100);
        return {
          changes: items.map((item) => ({
            type: "upsert" as const,
            key: item.id,
            properties: {
              Name: Builder.title(item.name),
              ID: Builder.richText(item.id),
            },
          })),
          hasMore,
          nextState: hasMore ? { page: page + 1 } : undefined,
        };
      },
    });
    ```
  </Tab>

  <Tab title="Incremental">
    Each sync cycle returns only **changes since the last run**. Rows not mentioned are left as-is. Deletions must be explicit.

    Best for large datasets (10k+ records) or APIs that provide a changes endpoint or cursor. Typically used as the [delta half](#combine-backfill-and-delta-syncs) of a backfill + delta pair.

    ```typescript theme={null}
    worker.sync("eventsSync", {
      database: events,
      mode: "incremental",
      execute: async (state) => {
        const { upserts, deletes, nextCursor } = await fetchChanges(state?.cursor);
        return {
          changes: [
            ...upserts.map((item) => ({
              type: "upsert" as const,
              key: item.id,
              properties: {
                Name: Builder.title(item.name),
                ID: Builder.richText(item.id),
              },
            })),
            ...deletes.map((id) => ({
              type: "delete" as const,
              key: id,
            })),
          ],
          hasMore: Boolean(nextCursor),
          nextState: nextCursor ? { cursor: nextCursor } : undefined,
        };
      },
    });
    ```
  </Tab>
</Tabs>

## Paginate large datasets

When syncing more than a few hundred records, break the work into batches. The runtime calls `execute` repeatedly until you return `hasMore: false`:

1. Return a batch of changes with `hasMore: true` and a `nextState` value.
2. The runtime calls `execute` again, passing that state back as the first argument.
3. Repeat until you return `hasMore: false`.

`nextState` can be any serializable value, such as a cursor string, page number, timestamp, or object. Start with batch sizes of \~100 records.

```typescript theme={null}
worker.sync("paginatedSync", {
  database: records,
  execute: async (state) => {
    const { items, nextCursor } = await fetchPage(state?.cursor);
    return {
      changes: items.map((item) => ({
        type: "upsert" as const,
        key: item.id,
        properties: {
          Name: Builder.title(item.name),
          ID: Builder.richText(item.id),
        },
      })),
      hasMore: Boolean(nextCursor),
      nextState: nextCursor ? { cursor: nextCursor } : undefined,
    };
  },
});
```

## Set a schedule

A schedule controls how often Notion triggers your sync. Each time it triggers, the runtime calls `execute` repeatedly until it returns `hasMore: false`, then waits for the next scheduled trigger. The default schedule is every 30 minutes.

```typescript theme={null}
worker.sync("frequentSync", {
  database: myDb,
  schedule: "5m",
  // ...
});
```

| Value                           | Behavior                            |
| :------------------------------ | :---------------------------------- |
| `"5m"`, `"15m"`, `"1h"`, `"1d"` | Run at the given interval           |
| `"manual"`                      | Only run when triggered via the CLI |

<Info>
  Minimum schedule is `"5m"`, maximum is `"7d"`.
</Info>

## Combine backfill and delta syncs

A single replace sync works for small datasets, but most real integrations need two things: fast updates (minutes, not hours) and the ability to re-sync everything when needed. You get both by registering two syncs against the same database:

* A **delta sync** runs on a schedule and fetches only what changed since the last run. This keeps the database near-real-time.
* A **backfill sync** paginates the entire upstream dataset. You trigger it manually, for example after a schema change, to populate a new property, or to catch anything the delta missed.

Since both syncs share a database and key space, upserts from both operate on the same rows. The delta keeps the database current and the backfill re-syncs the full dataset when you need to:

|                  | Delta sync                                                | Backfill sync                          |
| :--------------- | :-------------------------------------------------------- | :------------------------------------- |
| **Mode**         | `incremental`                                             | `replace`                              |
| **Schedule**     | `"5m"` or `"30m"`                                         | `"manual"`                             |
| **What it does** | Grabs recent changes via `updated_since` or a change feed | Paginates the entire upstream dataset  |
| **Deletes**      | Emits `type: "delete"` if the API supports it             | Mark-and-sweep catches everything else |
| **When it runs** | Continuously on schedule                                  | On demand                              |

```typescript theme={null}
// Delta: near-real-time updates
worker.sync("ticketsDelta", {
  database: tickets,
  mode: "incremental",
  schedule: "5m",
  execute: async (state) => {
    await apiPacer.wait();
    const { items, nextCursor } = await fetchTicketChanges(state?.cursor);
    return {
      changes: items.map((t) => ({
        type: "upsert" as const,
        key: t.id,
        properties: {
          Summary: Builder.title(t.summary),
          "Ticket ID": Builder.richText(t.id),
        },
      })),
      hasMore: Boolean(nextCursor),
      nextState: nextCursor ? { cursor: nextCursor } : undefined,
    };
  },
});

// Backfill: full dataset sweep, run manually
worker.sync("ticketsBackfill", {
  database: tickets,
  mode: "replace",
  schedule: "manual",
  execute: async (state) => {
    const page = state?.page ?? 1;
    await apiPacer.wait();
    const { items, hasMore } = await fetchAllTickets(page);
    return {
      changes: items.map((t) => ({
        type: "upsert" as const,
        key: t.id,
        properties: {
          Summary: Builder.title(t.summary),
          "Ticket ID": Builder.richText(t.id),
        },
      })),
      hasMore,
      nextState: hasMore ? { page: page + 1 } : undefined,
    };
  },
});
```

In this example, to run a backfill at any point in the future, you'd reset the state then trigger the sync to start running:

```bash theme={null}
ntn workers sync state reset ticketsBackfill
ntn workers sync trigger ticketsBackfill
```

This pattern gives you operational flexibility: run a backfill after a schema change to populate a new property, or after a bug fix to correct drifted data. This pattern also handles deletes cleanly even when the API doesn't surface them, as the backfill's replace-mode mark-and-sweep catches anything the delta missed.

<Tip>
  If both syncs hit the same API, give them the same [pacer](#rate-limit-outbound-requests). The runtime automatically splits the rate limit budget between them.
</Tip>

## Relate two databases

Link databases together with `Schema.relation()` and `Builder.relation()`:

```typescript theme={null}
const projects = worker.database("projects", {
  type: "managed",
  initialTitle: "Projects",
  primaryKeyProperty: "Project ID",
  schema: {
    properties: {
      Name: Schema.title(),
      "Project ID": Schema.richText(),
    },
  },
});

const tasks = worker.database("tasks", {
  type: "managed",
  initialTitle: "Tasks",
  primaryKeyProperty: "Task ID",
  schema: {
    properties: {
      Name: Schema.title(),
      "Task ID": Schema.richText(),
      Project: Schema.relation("projects", {
        twoWay: true,
        relatedPropertyName: "Tasks",
      }),
    },
  },
});

worker.sync("projectsSync", {
  database: projects,
  execute: async () => { /* ... */ },
});

worker.sync("tasksSync", {
  database: tasks,
  execute: async () => {
    const items = await fetchTasks();
    return {
      changes: items.map((task) => ({
        type: "upsert" as const,
        key: task.id,
        properties: {
          Name: Builder.title(task.name),
          "Task ID": Builder.richText(task.id),
          Project: [Builder.relation(task.projectId)],
        },
      })),
      hasMore: false,
    };
  },
});
```

In the example above, `Schema.relation("projects")` references the database name `projects` from `worker.database("projects", ...)`, and the `twoWay: true` option adds a "Tasks" rollup column to the Projects database automatically.

## Authenticate with external APIs

Most syncs need credentials for the external API they pull from. You have two options:

* **API keys and tokens:** store them as [secrets](/workers/guides/secrets) and read from `process.env`.
* **OAuth:** for APIs that require user authorization (GitHub, Google, Salesforce), register an [OAuth capability](/workers/guides/oauth) and call `accessToken()` in your `execute` function.

To call the Notion API from a sync (e.g., to read pages or update properties beyond sync changes), see [Using the Notion API from a worker](/workers/guides/api-client).

## Rate-limit outbound requests

Use a pacer to avoid hitting third-party API rate limits:

```typescript theme={null}
const api = worker.pacer("api", { allowedRequests: 10, intervalMs: 1000 });

worker.sync("customersSync", {
  database: customers,
  execute: async (state) => {
    await api.wait();
    const data = await fetchCustomers(state?.cursor);
    // ...
  },
});
```

`await api.wait()` blocks until a request slot is available. In this example, at most 10 requests per second.

## Manage syncs from the CLI

```bash theme={null}
# Live-updating status dashboard
ntn workers sync status

# Preview output without writing to the database
ntn workers sync trigger <syncKey> --preview

# Trigger a real sync immediately
ntn workers sync trigger <syncKey>

# Reset sync state (restart from scratch)
ntn workers sync state reset <syncKey>

# Pause a sync
ntn workers capabilities disable <syncKey>

# Resume a sync
ntn workers capabilities enable <syncKey>
```

<Note>
  Deploying does **not** reset sync state. Syncs resume from their last cursor position. See [Resetting and migrating state](#reset-and-migrate-state) below.
</Note>

## Reset and migrate state

Deploys never clear sync state. Your sync picks up where it left off. If you need to start fresh (e.g., after changing your schema or fixing a bug in your `execute` function), reset the state:

```bash theme={null}
ntn workers sync state reset <syncKey>
```

This clears the stored `nextState` so the next run starts from scratch, as if the sync had never run before.

To inspect the current state before deciding whether to reset:

```bash theme={null}
ntn workers sync state get <syncKey>
```

## Troubleshooting syncs

### Sync runs but no rows appear

* Check `ntn workers sync trigger <syncKey> --preview` to see what your `execute` function returns without writing to the database. If the preview is empty, the issue is in your data-fetching code.
* Make sure the `key` in each change matches the property named by `primaryKeyProperty`.

### Rows are duplicated

* Each row needs a unique `key`. If two changes share the same key, the second overwrites the first. If keys differ, Notion creates separate rows. Double-check that your key is the stable external ID, not a value that changes between runs.

### Stale rows aren't deleted (replace mode)

* Replace mode only deletes stale rows after the final page returns `hasMore: false`. If your sync errors partway through, no deletions happen (this is intentional to avoid data loss).

### Sync is stuck or out of date

* Run `ntn workers sync status` to see the current state and last run time.
* If state is corrupted or outdated, reset it with `ntn workers sync state reset <syncKey>`.

### Checking logs

List recent runs:

```bash theme={null}
ntn workers runs list
```

View execution logs for a specific run:

```bash theme={null}
ntn workers runs logs <runId>
```

See the [CLI command reference](/cli/reference/commands) for the full list of `ntn workers sync` flags and options.

## Next steps

<CardGroup cols={2}>
  <Card title="Schema and builders" icon="code" href="/workers/reference/schema">
    Full reference for database property types and value builders.
  </Card>

  <Card title="SDK reference" icon="book-open" href="/workers/reference/sdk">
    Detailed API docs for worker.sync(), worker.database(), and worker.pacer().
  </Card>

  <Card title="Secrets" icon="lock" href="/workers/guides/secrets">
    Store API keys and credentials for your sync.
  </Card>

  <Card title="OAuth" icon="key" href="/workers/guides/oauth">
    Connect to APIs that require user authorization.
  </Card>
</CardGroup>
