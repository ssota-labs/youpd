// Notion REST API property-value builders. The agent passes the returned
// `properties` map straight to pages.create — we only own the shape. Property
// names match exactly what get_latest_version_schema publishes; agents that
// renamed columns must edit them on their side.
//
// References:
//   https://developers.notion.com/reference/page-property-values

export type RichText = { text: { content: string } };

export type NotionPropertyValue =
  | { title: RichText[] }
  | { rich_text: RichText[] }
  | { number: number | null }
  | { select: { name: string } | null }
  | { multi_select: Array<{ name: string }> }
  | { status: { name: string } }
  | { date: { start: string; end?: string | null } | null }
  | { checkbox: boolean }
  | { url: string | null }
  | { people: Array<{ id: string }> }
  | { files: Array<FileEntry> }
  | { relation: Array<{ id: string }> };

export type FileEntry =
  | { name: string; external: { url: string }; type?: 'external' }
  | { name: string; file: { url: string; expiry_time?: string }; type?: 'file' };

// Notion caps rich_text content to 2000 chars per chunk. Long strings are
// chopped into multiple rich_text segments so the agent never gets a 400.
const CHUNK = 2000;

function richText(value: string): RichText[] {
  if (!value) return [];
  const out: RichText[] = [];
  for (let i = 0; i < value.length; i += CHUNK) {
    out.push({ text: { content: value.slice(i, i + CHUNK) } });
  }
  return out;
}

export const NotionProp = {
  title(value: string): NotionPropertyValue {
    return { title: richText(value) };
  },
  richText(value: string | null | undefined): NotionPropertyValue {
    return { rich_text: richText(value ?? '') };
  },
  number(value: number | null | undefined): NotionPropertyValue {
    return { number: value ?? null };
  },
  select(value: string | null | undefined): NotionPropertyValue {
    return { select: value ? { name: value } : null };
  },
  multiSelect(values: string[] | null | undefined): NotionPropertyValue {
    return { multi_select: (values ?? []).map((name) => ({ name })) };
  },
  status(value: string): NotionPropertyValue {
    return { status: { name: value } };
  },
  date(value: string | null | undefined): NotionPropertyValue {
    return { date: value ? { start: value } : null };
  },
  checkbox(value: boolean): NotionPropertyValue {
    return { checkbox: value };
  },
  url(value: string | null | undefined): NotionPropertyValue {
    return { url: value ?? null };
  },
  people(ids: string[] | null | undefined): NotionPropertyValue {
    return { people: (ids ?? []).map((id) => ({ id })) };
  },
  files(entries: FileEntry[] | null | undefined): NotionPropertyValue {
    return { files: entries ?? [] };
  },
  relation(ids: string[] | null | undefined): NotionPropertyValue {
    return { relation: (ids ?? []).map((id) => ({ id })) };
  },
} as const;

export type NotionPagePayload = {
  // The agent fills `parent.database_id` from its Agent Meta lookup; we only
  // produce the property map so multi-tenant deploys stay correct.
  properties: Record<string, NotionPropertyValue>;
  icon?: { type: 'emoji'; emoji: string };
  // Optional callsite hint for the agent — which `database_ref` from
  // get_latest_version_schema this payload targets.
  database_ref: string;
};
