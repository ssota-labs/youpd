> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Data sources

> Create, query, and manage data sources from the terminal.

A [data source](/reference/data-source) is a table of pages under a Notion database. For background on how databases and data sources fit together, see [Working with databases](/guides/data-apis/working-with-databases).

All examples below assume you've already [authenticated](/cli/get-started/authentication) with `ntn login`.

To work with data sources, you use a combo of `ntn datasources` and `ntn api` commands.

## Find a data source ID

Data sources live under a database. Retrieve the parent database to list its data sources. See [Working with databases](/guides/data-apis/working-with-databases#adding-pages-to-a-data-source) for how to find a database ID from a Notion URL:

```bash theme={null}
ntn api v1/databases/<database-id>
```

Each item in the response's `data_sources` array contains an `id`. To get the ID from the Notion app: open the database's settings menu, choose **Manage data sources**, click the data source's `•••` menu, and click **Copy data source ID**.

## Retrieve a data source

Fetch the schema (properties, title, parent) for a single data source. See [Retrieve a data source](/reference/retrieve-a-data-source) for the response shape:

```bash theme={null}
ntn api v1/data_sources/<data-source-id>
```

## Create a data source

Add a new data source to an existing database. `parent[type]=database_id` is the type discriminator; `parent[database_id]` is the database's unique ID. `properties` is a map of column name to [property schema](/reference/property-schema-object). See [Create a data source](/reference/create-a-data-source) for every supported field:

```bash theme={null}
ntn api v1/data_sources \
  parent[type]=database_id \
  parent[database_id]=<database-id> \
  title[0][type]=text \
  title[0][text][content]="Bugs" \
  properties:='{"Name":{"title":{}},"Status":{"select":{"options":[{"name":"Open","color":"red"},{"name":"Closed","color":"green"}]}},"Priority":{"number":{"format":"number"}}}'
```

A default "table" view is created alongside the data source. See [Working with views](/guides/data-apis/working-with-views) to learn about managing views.

## Query a data source

Use `ntn datasources query` to list pages in a data source:

```bash theme={null}
ntn datasources query <data-source-id> --limit 50
```

Pass `--filter` with the same shape documented in [Filter data source entries](/reference/filter-data-source-entries):

```bash theme={null}
ntn datasources query <data-source-id> --filter '{"property":"Status","select":{"equals":"Open"}}'
```

Paginate with `--start-cursor` using the `next_cursor` from the previous response. Add `--json` for machine-readable output.

For sorts, `filter_properties`, or other options, drop down to `ntn api`. See [Query a data source](/reference/query-a-data-source) for the full request and response:

```bash theme={null}
ntn api v1/data_sources/<data-source-id>/query \
  filter:='{"and":[{"property":"Status","select":{"equals":"Open"}},{"property":"Priority","number":{"greater_than_or_equal_to":2}}]}' \
  sorts:='[{"property":"Priority","direction":"descending"}]' \
  page_size:=25
```

To speed up large queries, restrict the columns returned with the `filter_properties` query param (it accepts property IDs or names):

```bash theme={null}
ntn api 'v1/data_sources/<data-source-id>/query?filter_properties[]=title&filter_properties[]=Status'
```

Paginate by passing `start_cursor` from the previous response's `next_cursor` until `has_more` is `false`. Query results cap at 10,000 pages. For larger data sources, narrow with filters or subscribe to [webhooks](/reference/webhooks).

## Update a data source

`PATCH` updates the title, description, parent, or schema. To add a column, pass it under `properties` keyed by name:

```bash theme={null}
ntn api v1/data_sources/<data-source-id> -X PATCH \
  title:='[{"type":"text","text":{"content":"Bugs (Q2)"}}]' \
  properties:='{"Assignee":{"people":{}}}'
```

To rename or remove a property, key it by its existing name and pass either a new `name` or `null`:

```bash theme={null}
ntn api v1/data_sources/<data-source-id> -X PATCH \
  properties:='{"Priority":{"name":"Severity"},"Notes":null}'
```

See [Update a data source](/reference/update-a-data-source) for the full list of editable fields and properties that can't be changed via the API.

## List page templates

List the page templates that show up in a data source's **New** dropdown. See [List data source templates](/reference/list-data-source-templates) for the response shape:

```bash theme={null}
ntn api v1/data_sources/<data-source-id>/templates
```

Templates are regular Notion pages. Fetch full content with [Retrieve a page](/reference/retrieve-a-page):

```bash theme={null}
ntn api v1/pages/<template-id>
```

## Discover the endpoints

To see the request schema or jump to the docs for any of these commands:

```bash theme={null}
ntn api v1/data_sources --spec -X POST
ntn api v1/data_sources --docs -X POST
```
