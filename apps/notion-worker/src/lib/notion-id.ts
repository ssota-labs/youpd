/**
 * Normalize anything that could plausibly identify a Notion page into the
 * canonical dashed-UUID form the Notion REST API expects.
 *
 * Notion's hosted agent tools (Custom Agent, Notion AI) hand back a row's
 * identifier as a *page URL* rather than as a raw page id, e.g.
 *   - "https://www.notion.so/c0fb4d20cefb431890b7a73896bc0c78"
 *   - "https://www.notion.so/Workspace/Title-c0fb4d20cefb431890b7a73896bc0c78"
 *   - "https://www.notion.so/Title-c0fb4d20-cefb-4318-90b7-a73896bc0c78?pvs=21"
 * The Notion REST API in turn refuses URLs and requires the dashed UUID
 *   "c0fb4d20-cefb-4318-90b7-a73896bc0c78"
 * Accepting all of the above on every page-id input is decisive: agents
 * cannot reliably extract the hex run themselves, and asking humans to
 * paste UUIDs is friction we control.
 */

const UUID_DASHED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32 = /^[0-9a-f]{32}$/i;
const URL_DASHED = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const URL_HEX32 = /[0-9a-f]{32}/i;

/**
 * Returns the dashed-UUID form of `input` if it is, or contains, a Notion
 * page id. Throws when no plausible id can be extracted.
 *
 * Accepted forms:
 *   - "c0fb4d20-cefb-4318-90b7-a73896bc0c78"
 *   - "c0fb4d20cefb431890b7a73896bc0c78"
 *   - "https://www.notion.so/<anything>/<title?>-<id>"  (id with or without dashes)
 *   - "https://www.notion.so/<id>?<anyquery>"
 */
export function normalizeNotionPageId(input: string): string {
  const v = (input ?? '').trim();
  if (!v) throw new Error('Notion page id is empty');

  if (UUID_DASHED.test(v)) return v.toLowerCase();
  if (HEX32.test(v)) return toDashed(v.toLowerCase());

  // Prefer an already-dashed UUID inside a URL or surrounding text — it
  // avoids accidentally matching another 32-hex substring elsewhere in the
  // string (rare but possible with slug content).
  const dashed = v.match(URL_DASHED);
  if (dashed) return dashed[0].toLowerCase();

  const hex = v.match(URL_HEX32);
  if (hex) return toDashed(hex[0].toLowerCase());

  throw new Error(
    `Cannot extract Notion page id from: ${input}. ` +
      'Pass either a 32-char hex id, a dashed UUID, or a Notion page URL.',
  );
}

function toDashed(hex32: string): string {
  return (
    hex32.slice(0, 8) +
    '-' +
    hex32.slice(8, 12) +
    '-' +
    hex32.slice(12, 16) +
    '-' +
    hex32.slice(16, 20) +
    '-' +
    hex32.slice(20, 32)
  );
}
