import { asc, eq, getDbClient, templates, type TemplateRow } from '@youpd/db';

export class TemplateNotFoundError extends Error {
  override readonly name = 'TemplateNotFoundError';
  constructor(public readonly code: string) {
    super(`template ${code} not found`);
  }
}

export async function getTemplateByCode(code: string): Promise<TemplateRow> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(templates)
    .where(eq(templates.code, code))
    .limit(1);
  const row = rows[0];
  if (!row) throw new TemplateNotFoundError(code);
  return row;
}

export async function listPublicTemplates(): Promise<TemplateRow[]> {
  const db = getDbClient();
  return db
    .select()
    .from(templates)
    .where(eq(templates.isPublic, true))
    .orderBy(asc(templates.code));
}

export type UpsertTemplateInput = {
  code: string;
  title: string;
  aspect: '16:9' | '9:16';
  document: unknown;
  previewUrl?: string | null;
  tags?: string[];
  isPublic?: boolean;
};

// Used by the seed script; production code reads via getTemplateByCode.
export async function upsertTemplate(
  input: UpsertTemplateInput,
): Promise<TemplateRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(templates)
    .values({
      code: input.code,
      title: input.title,
      aspect: input.aspect,
      document: input.document as never,
      previewUrl: input.previewUrl ?? null,
      tags: input.tags ?? [],
      isPublic: input.isPublic ?? true,
    })
    .onConflictDoUpdate({
      target: templates.code,
      set: {
        title: input.title,
        aspect: input.aspect,
        document: input.document as never,
        previewUrl: input.previewUrl ?? null,
        tags: input.tags ?? [],
        isPublic: input.isPublic ?? true,
      },
    })
    .returning();
  if (!row) throw new Error('failed to upsert template');
  return row;
}
