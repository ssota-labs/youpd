// Notion-shaped property schemas. Each property value is the body Notion
// expects under databases.create.properties.<name>. Keeping these as plain
// JSON-serialisable values means `get_latest_version_schema` can hand them
// straight to the agent for createDatabase calls.

export type NotionSelectOption = { name: string; color?: string };

export type NotionPropertySchema =
  | { type: 'title'; title: Record<string, never> }
  | { type: 'rich_text'; rich_text: Record<string, never> }
  | { type: 'number'; number: { format?: 'number' | 'number_with_commas' | 'percent' } }
  | { type: 'select'; select: { options: NotionSelectOption[] } }
  | { type: 'multi_select'; multi_select: { options: NotionSelectOption[] } }
  | { type: 'status'; status: { options: NotionSelectOption[] } }
  | { type: 'date'; date: Record<string, never> }
  | { type: 'people'; people: Record<string, never> }
  | { type: 'files'; files: Record<string, never> }
  | { type: 'checkbox'; checkbox: Record<string, never> }
  | { type: 'url'; url: Record<string, never> }
  | { type: 'email'; email: Record<string, never> }
  | { type: 'phone_number'; phone_number: Record<string, never> }
  | {
      type: 'formula';
      formula: { expression: string };
    }
  | {
      type: 'relation';
      relation: {
        database_ref: string;
        type?: 'single_property' | 'dual_property';
      };
    }
  | {
      type: 'rollup';
      rollup: {
        relation_property: string;
        rollup_property: string;
        function:
          | 'count'
          | 'count_values'
          | 'sum'
          | 'average'
          | 'median'
          | 'min'
          | 'max'
          | 'range';
      };
    };

export type NotionDatabaseSchema = {
  key: string;
  title: string;
  description: string;
  icon: string;
  // Insertion order matters — Notion preserves property order in the UI.
  properties: Array<{ name: string; schema: NotionPropertySchema }>;
};

export type ChangelogEntry = {
  version: string;
  released_at: string;
  notes: string[];
};
