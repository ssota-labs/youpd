> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Schema and builders

> Define database schemas, database property values, and tool schemas.

The Workers SDK includes three schema-related exports:

```typescript theme={null}
import { j } from "@notionhq/workers/schema-builder";
import * as Schema from "@notionhq/workers/schema";
import * as Builder from "@notionhq/workers/builder";
```

| Import    | Used by                        | Description                                            |
| --------- | ------------------------------ | ------------------------------------------------------ |
| `j`       | [Tools](/workers/guides/tools) | JSON Schema builder for tool input and output schemas. |
| `Schema`  | [Syncs](/workers/guides/syncs) | Database property schema helpers for sync databases.   |
| `Builder` | [Syncs](/workers/guides/syncs) | Database property value helpers for sync changes.      |

## Schema builder

The `j` export from `@notionhq/workers/schema-builder` builds JSON Schemas
for [tool](/workers/reference/sdk#worker-tool) input and output. Use it instead
of hand-writing JSON Schema so tool contracts stay compatible across a wide
range of closed and open-source models. Builder methods return a
`SchemaBuilder<T>`.

```typescript theme={null}
interface SchemaBuilder<T> {
	describe(text: string): SchemaBuilder<T>;
	nullable(): SchemaBuilder<T | null>;
}
```

### j.object()

```typescript theme={null}
j.object<P extends Record<string, SchemaBuilder<unknown>>>(
	properties: P,
): SchemaBuilder<{ [K in keyof P]: Infer<P[K]> }>
```

Creates an object schema. All provided properties are included in `required`, and `additionalProperties` is set to `false`.

```typescript theme={null}
j.object({
	query: j.string(),
	limit: j.number().nullable(),
})
```

### j.string()

```typescript theme={null}
j.string(): SchemaBuilder<string>
```

Creates a string schema.

```typescript theme={null}
j.string().describe("Search query.")
```

### j.number()

```typescript theme={null}
j.number(): SchemaBuilder<number>
```

Creates a number schema.

```typescript theme={null}
j.number().describe("Maximum number of results.")
```

### j.array()

```typescript theme={null}
j.array<T>(
	items: SchemaBuilder<T>,
	options?: { minItems?: 0 | 1 },
): SchemaBuilder<T[]>
```

Creates an array schema.

```typescript theme={null}
j.array(j.string())
j.array(j.string(), { minItems: 1 })
```

### .describe()

```typescript theme={null}
schema.describe(text: string): SchemaBuilder<T>
```

Sets the JSON Schema `description` field and returns a new builder.

```typescript theme={null}
j.string().describe("Email address for the assignee.")
```

### .nullable()

```typescript theme={null}
schema.nullable(): SchemaBuilder<T | null>
```

Wraps the schema in `anyOf` with `{ type: "null" }` and returns a new builder. In object schemas, the property is still required, but its value may be `null`.

```typescript theme={null}
j.object({
	dueDate: j.string().nullable().describe("ISO date, or null when unset."),
})
```

### j.integer()

```typescript theme={null}
j.integer(): SchemaBuilder<number>
```

Creates an integer schema.

```typescript theme={null}
j.integer().describe("Whole number of retries.")
```

### j.boolean()

```typescript theme={null}
j.boolean(): SchemaBuilder<boolean>
```

Creates a boolean schema.

```typescript theme={null}
j.boolean().describe("Whether archived records should be included.")
```

### j.enum()

```typescript theme={null}
j.enum<T extends string>(...values: readonly T[]): SchemaBuilder<T>
j.enum<T extends number>(...values: readonly T[]): SchemaBuilder<T>
```

Creates an enum schema from string or number literal values.

```typescript theme={null}
j.enum("low", "medium", "high").describe("Priority level.")
```

### j.datetime()

```typescript theme={null}
j.datetime(): SchemaBuilder<string>
```

Creates a string schema with `format: "date-time"`.

```typescript theme={null}
j.datetime().describe("ISO 8601 timestamp for the event.")
```

### j.date()

```typescript theme={null}
j.date(): SchemaBuilder<string>
```

Creates a string schema with `format: "date"`.

```typescript theme={null}
j.date().describe("Due date in YYYY-MM-DD format.")
```

### j.time()

```typescript theme={null}
j.time(): SchemaBuilder<string>
```

Creates a string schema with `format: "time"`.

```typescript theme={null}
j.time().describe("Start time.")
```

### j.duration()

```typescript theme={null}
j.duration(): SchemaBuilder<string>
```

Creates a string schema with `format: "duration"`.

```typescript theme={null}
j.duration().describe("Elapsed time as an ISO 8601 duration.")
```

### j.email()

```typescript theme={null}
j.email(): SchemaBuilder<string>
```

Creates a string schema with `format: "email"`.

```typescript theme={null}
j.email().describe("Email address for the assignee.")
```

### j.hostname()

```typescript theme={null}
j.hostname(): SchemaBuilder<string>
```

Creates a string schema with `format: "hostname"`.

```typescript theme={null}
j.hostname().describe("Host name to query.")
```

### j.ipv4()

```typescript theme={null}
j.ipv4(): SchemaBuilder<string>
```

Creates a string schema with `format: "ipv4"`.

```typescript theme={null}
j.ipv4().describe("IPv4 address to allow.")
```

### j.ipv6()

```typescript theme={null}
j.ipv6(): SchemaBuilder<string>
```

Creates a string schema with `format: "ipv6"`.

```typescript theme={null}
j.ipv6().describe("IPv6 address to allow.")
```

### j.uuid()

```typescript theme={null}
j.uuid(): SchemaBuilder<string>
```

Creates a string schema with `format: "uuid"`.

```typescript theme={null}
j.uuid().describe("External record ID.")
```

### j.anyOf()

```typescript theme={null}
j.anyOf<S extends SchemaBuilder<unknown>[]>(
	...schemas: S
): SchemaBuilder<Infer<S[number]>>
```

Creates an `anyOf` schema from the provided schema builders.

```typescript theme={null}
j.anyOf(j.string(), j.number()).describe("String or numeric identifier.")
```

### j.ref()

```typescript theme={null}
j.ref(path: string): SchemaBuilder<unknown>
```

Creates a reference schema with `$ref` set to `path`.

```typescript theme={null}
j.ref("#/$defs/user")
```

<h2 id="database-schema-helpers">
  Database schema helpers
</h2>

Use `Schema` helpers to define the properties of managed databases declared with `worker.database()`.

```typescript theme={null}
import * as Schema from "@notionhq/workers/schema";

const tasks = worker.database("tasks", {
	type: "managed",
	initialTitle: "Tasks",
	primaryKeyProperty: "Task ID",
	schema: {
		properties: {
			Name: Schema.title(),
			"Task ID": Schema.richText(),
			Status: Schema.select([
				{ name: "Open" },
				{ name: "Done", color: "green" },
			]),
		},
	},
});
```

### Schema.title()

```typescript theme={null}
Schema.title(): PropertyConfiguration
```

Creates a title property definition. This field becomes the title for all pages in the database. A database must have exactly one title property.

```typescript theme={null}
Name: Schema.title()
```

Returns:

```typescript theme={null}
{ type: "title" }
```

### Schema.richText()

```typescript theme={null}
Schema.richText(): PropertyConfiguration
```

Creates a rich text property definition.

```typescript theme={null}
"Task ID": Schema.richText()
```

Returns:

```typescript theme={null}
{ type: "text" }
```

### Schema.url()

```typescript theme={null}
Schema.url(): PropertyConfiguration
```

Creates a URL property definition.

```typescript theme={null}
Website: Schema.url()
```

Returns:

```typescript theme={null}
{ type: "url" }
```

### Schema.email()

```typescript theme={null}
Schema.email(): PropertyConfiguration
```

Creates an email property definition.

```typescript theme={null}
Email: Schema.email()
```

Returns:

```typescript theme={null}
{ type: "email" }
```

### Schema.phoneNumber()

```typescript theme={null}
Schema.phoneNumber(): PropertyConfiguration
```

Creates a phone number property definition.

```typescript theme={null}
Phone: Schema.phoneNumber()
```

Returns:

```typescript theme={null}
{ type: "phone_number" }
```

### Schema.checkbox()

```typescript theme={null}
Schema.checkbox(): PropertyConfiguration
```

Creates a checkbox property definition.

```typescript theme={null}
Done: Schema.checkbox()
```

Returns:

```typescript theme={null}
{ type: "checkbox" }
```

### Schema.file()

```typescript theme={null}
Schema.file(): PropertyConfiguration
```

Creates a file property definition.

```typescript theme={null}
Attachment: Schema.file()
```

Returns:

```typescript theme={null}
{ type: "file" }
```

### Schema.number()

```typescript theme={null}
Schema.number(format?: NumberFormat): PropertyConfiguration
```

Creates a number property definition. If `format` is provided, it is included in the returned configuration.

```typescript theme={null}
Amount: Schema.number("dollar")
```

Returns:

```typescript theme={null}
{ type: "number", format: "dollar" }
```

### Schema.date()

```typescript theme={null}
Schema.date(dateFormat?: DateFormat): PropertyConfiguration
```

Creates a date property definition. If `dateFormat` is provided, it is emitted as `date_format`.

```typescript theme={null}
Due: Schema.date("YYYY/MM/DD")
```

Returns:

```typescript theme={null}
{ type: "date", date_format: "YYYY/MM/DD" }
```

### Schema.select()

```typescript theme={null}
Schema.select(options: SelectOption[]): PropertyConfiguration
```

Creates a select property definition with predefined options.

```typescript theme={null}
Status: Schema.select([
	{ name: "Open" },
	{ name: "Done", color: "green" },
])
```

Returns:

```typescript theme={null}
{
	type: "select",
	options: [
		{ name: "Open" },
		{ name: "Done", color: "green" },
	],
}
```

### Schema.multiSelect()

```typescript theme={null}
Schema.multiSelect(options: SelectOption[]): PropertyConfiguration
```

Creates a multi-select property definition with predefined options.

```typescript theme={null}
Tags: Schema.multiSelect([
	{ name: "Bug", color: "red" },
	{ name: "Feature", color: "blue" },
])
```

Returns:

```typescript theme={null}
{
	type: "multi_select",
	options: [
		{ name: "Bug", color: "red" },
		{ name: "Feature", color: "blue" },
	],
}
```

### Schema.status()

```typescript theme={null}
Schema.status(config: { groups: StatusGroup[] }): PropertyConfiguration
```

Creates a status property definition with status groups.

```typescript theme={null}
State: Schema.status({
	groups: [
		{
			name: "To-do",
			options: [{ name: "Not started" }],
		},
		{
			name: "In progress",
			options: [{ name: "In progress", color: "blue" }],
		},
		{
			name: "Complete",
			options: [{ name: "Done", color: "green" }],
		},
	],
})
```

Returns:

```typescript theme={null}
{
	type: "status",
	groups: [
		{ name: "To-do", options: [{ name: "Not started" }] },
		{ name: "In progress", options: [{ name: "In progress", color: "blue" }] },
		{ name: "Complete", options: [{ name: "Done", color: "green" }] },
	],
}
```

### Schema.people()

```typescript theme={null}
Schema.people(): PropertyConfiguration
```

Creates a people property definition.

```typescript theme={null}
Assignees: Schema.people()
```

Returns:

```typescript theme={null}
{ type: "people" }
```

### Schema.place()

```typescript theme={null}
Schema.place(): PropertyConfiguration
```

Creates a place property definition for geographic locations.

```typescript theme={null}
Location: Schema.place()
```

Returns:

```typescript theme={null}
{ type: "place" }
```

### Schema.relation()

```typescript theme={null}
Schema.relation(
	relatedDatabaseKey: string,
	config?: { twoWay: false } | { twoWay: true; relatedPropertyName: string },
): PropertyConfiguration
```

Creates a relation property definition that references another database declared in the same worker. `relatedDatabaseKey` must match the key passed to `worker.database()` for the related database. If `config` is omitted, the relation is one-way.

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
```

Returns:

```typescript theme={null}
{
	type: "relation",
	relatedDatabaseKey: "projects",
	config: {
		twoWay: true,
		relatedPropertyName: "Tasks",
	},
}
```

## Property value builders

Use `Builder` helpers to construct property values returned by sync changes. These properties must match the types defined in the [database schema](#database-schema-helpers).

```typescript theme={null}
return {
	changes: [
		{
			type: "upsert",
			key: task.id,
			properties: {
				Name: Builder.title(task.name),
				"Task ID": Builder.richText(task.id),
				Status: Builder.select(task.status),
			},
		},
	],
	hasMore: false,
};
```

### Builder.richText()

```typescript theme={null}
Builder.richText(content: string): TextValue
```

Creates a plain rich text value. `Builder.richText()` does not accept formatting
options; it returns a single text token with no annotations.

```typescript theme={null}
Builder.richText("task-123")
```

Returns:

```typescript theme={null}
[["task-123"]]
```

### Builder.url()

```typescript theme={null}
Builder.url(url: string): TextValue
```

Creates a URL value.

```typescript theme={null}
Builder.url("https://example.com")
```

Returns:

```typescript theme={null}
[["https://example.com"]]
```

### Builder.title()

```typescript theme={null}
Builder.title(content: string): TextValue
```

Creates a title value.

```typescript theme={null}
Builder.title("Write docs")
```

Returns:

```typescript theme={null}
[["Write docs"]]
```

### Builder.text()

```typescript theme={null}
Builder.text(content: string): TextValue
```

Creates a text value.

```typescript theme={null}
Builder.text("Imported from upstream.")
```

Returns:

```typescript theme={null}
[["Imported from upstream."]]
```

### Builder.email()

```typescript theme={null}
Builder.email(email: string): TextValue
```

Creates an email value.

```typescript theme={null}
Builder.email("person@example.com")
```

Returns:

```typescript theme={null}
[["person@example.com"]]
```

### Builder.phoneNumber()

```typescript theme={null}
Builder.phoneNumber(phone: string): TextValue
```

Creates a phone number value.

```typescript theme={null}
Builder.phoneNumber("+14155550123")
```

Returns:

```typescript theme={null}
[["+14155550123"]]
```

### Builder.checkbox()

```typescript theme={null}
Builder.checkbox(checked: boolean): TextValue
```

Creates a checkbox value. `true` returns `Yes`; `false` returns `No`.

```typescript theme={null}
Builder.checkbox(true)
```

Returns:

```typescript theme={null}
[["Yes"]]
```

### Builder.file()

```typescript theme={null}
Builder.file(fileUrl: string, fileName?: string): TextValue
```

Creates a file URL value. If `fileName` is omitted, the URL is also used as the display text.

```typescript theme={null}
Builder.file("https://example.com/invoice.pdf", "Invoice")
```

Returns:

```typescript theme={null}
[["Invoice", [["a", "https://example.com/invoice.pdf"]]]]
```

### Builder.number()

```typescript theme={null}
Builder.number(value: number): TextValue
```

Creates a number value by converting `value` to a string. If `value` is `NaN`, returns an empty value.

```typescript theme={null}
Builder.number(42)
```

Returns:

```typescript theme={null}
[["42"]]
```

### Builder.date()

```typescript theme={null}
Builder.date(dateString: string): TextValue
```

Creates a date value from a `YYYY-MM-DD` date string. Throws if the input does
not match that format or cannot be parsed by JavaScript `Date`.

```typescript theme={null}
Builder.date("2026-05-11")
```

Returns a date mention token:

```typescript theme={null}
[["\u2023", [["d", { type: "date", start_date: "2026-05-11" }]]]]
```

### Builder.dateTime()

```typescript theme={null}
Builder.dateTime(isoString: string, timeZone?: string): TextValue
```

Creates a datetime value from an ISO 8601 datetime string that starts with
`YYYY-MM-DDTHH:mm`. The builder stores the first 10 characters as `start_date`
and characters 11 through 16 as `start_time`. If `timeZone` is provided, it is
included as `time_zone`.

```typescript theme={null}
Builder.dateTime("2026-05-11T09:30:00Z", "America/Los_Angeles")
```

Returns a date mention token:

```typescript theme={null}
[
	[
		"\u2023",
		[
			[
				"d",
				{
					type: "datetime",
					start_date: "2026-05-11",
					start_time: "09:30",
					time_zone: "America/Los_Angeles",
				},
			],
		],
	],
]
```

### Builder.dateRange()

```typescript theme={null}
Builder.dateRange(startDate: string, endDate: string): TextValue
```

Creates a date range value from two `YYYY-MM-DD` date strings. Throws if either
input does not match that format or cannot be parsed by JavaScript `Date`. The
builder does not validate that `startDate` is before `endDate`.

```typescript theme={null}
Builder.dateRange("2026-05-11", "2026-05-15")
```

Returns a date mention token:

```typescript theme={null}
[
	[
		"\u2023",
		[
			[
				"d",
				{
					type: "daterange",
					start_date: "2026-05-11",
					end_date: "2026-05-15",
				},
			],
		],
	],
]
```

### Builder.dateTimeRange()

```typescript theme={null}
Builder.dateTimeRange(
	startDateTime: string,
	endDateTime: string,
	timeZone?: string,
): TextValue
```

Creates a datetime range value from two ISO 8601 datetime strings that start
with `YYYY-MM-DDTHH:mm`. If `timeZone` is provided, it is included as
`time_zone`. The builder does not validate that `startDateTime` is before
`endDateTime`.

```typescript theme={null}
Builder.dateTimeRange(
	"2026-05-11T09:30:00Z",
	"2026-05-11T10:30:00Z",
	"America/Los_Angeles",
)
```

Returns a date mention token:

```typescript theme={null}
[
	[
		"\u2023",
		[
			[
				"d",
				{
					type: "datetimerange",
					start_date: "2026-05-11",
					start_time: "09:30",
					end_date: "2026-05-11",
					end_time: "10:30",
					time_zone: "America/Los_Angeles",
				},
			],
		],
	],
]
```

### Builder.link()

```typescript theme={null}
Builder.link(displayText: string, url: string): TextValue
```

Creates a text value with a link annotation.

```typescript theme={null}
Builder.link("Issue", "https://example.com/issues/123")
```

Returns:

```typescript theme={null}
[["Issue", [["a", "https://example.com/issues/123"]]]]
```

### Builder.select()

```typescript theme={null}
Builder.select(value: string): TextValue
```

Creates a select value from a single option name.

```typescript theme={null}
Builder.select("Open")
```

Returns:

```typescript theme={null}
[["Open"]]
```

### Builder.multiSelect()

```typescript theme={null}
Builder.multiSelect(...values: string[]): TextValue
```

Creates a multi-select value from option names. Values are joined with commas. If no values are provided, returns an empty value.

```typescript theme={null}
Builder.multiSelect("Bug", "Customer")
```

Returns:

```typescript theme={null}
[["Bug,Customer"]]
```

### Builder.status()

```typescript theme={null}
Builder.status(value: string): TextValue
```

Creates a status value from a status option name.

```typescript theme={null}
Builder.status("Done")
```

Returns:

```typescript theme={null}
[["Done"]]
```

### Builder.people()

```typescript theme={null}
Builder.people(...emails: string[]): PeopleValue
```

Creates a people value from email addresses.

```typescript theme={null}
Builder.people("a@example.com", "b@example.com")
```

Returns:

```typescript theme={null}
[{ email: "a@example.com" }, { email: "b@example.com" }]
```

### Builder.place()

```typescript theme={null}
Builder.place(value: PlaceValue): PlaceValue
```

Creates a place value. The value must include numeric `lat` and `lon`; otherwise the function throws.

```typescript theme={null}
Builder.place({
	lat: 37.776,
	lon: -122.417,
	name: "San Francisco",
	address: "San Francisco, CA",
})
```

Returns the provided place value.

### Builder.relation()

```typescript theme={null}
Builder.relation(primaryKey: string): RelationReference
```

Creates a relation reference from the primary key of a related record. Relation property values use arrays of relation references.

Single relation:

```typescript theme={null}
Project: [Builder.relation("project-123")]
```

Multiple relations:

```typescript theme={null}
Projects: [
	Builder.relation("project-123"),
	Builder.relation("project-456"),
]
```

Returns:

```typescript theme={null}
[
	{ type: "primaryKey", value: "project-123" },
	{ type: "primaryKey", value: "project-456" },
]
```

### Builder.emojiIcon()

```typescript theme={null}
Builder.emojiIcon(emoji: string): Icon
```

Creates an emoji icon.

```typescript theme={null}
Builder.emojiIcon("✅")
```

Returns:

```typescript theme={null}
{ type: "emoji", value: "✅" }
```

### Builder.notionIcon()

```typescript theme={null}
Builder.notionIcon(
	icon: NoticonName,
	color: NoticonColor = "gray",
): Icon
```

Creates an icon using Notion's native icon set. If `color` is omitted, it defaults to `"gray"`.

```typescript theme={null}
Builder.notionIcon("checkmark", "green")
```

Returns:

```typescript theme={null}
{ type: "notion", icon: "checkmark", color: "green" }
```

### Builder.imageIcon()

```typescript theme={null}
Builder.imageIcon(url: string): Icon
```

Creates an image icon from an external URL.

```typescript theme={null}
Builder.imageIcon("https://example.com/icon.png")
```

Returns:

```typescript theme={null}
{ type: "image", url: "https://example.com/icon.png" }
```
