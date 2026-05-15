// Idempotent seed for the templates table — run with `pnpm --filter @youpd/api seed:templates`.
// Requires DATABASE_URL to point at a Supabase Postgres with the v0.4
// migration applied.
import { upsertTemplate } from '@youpd/supabase/repositories/templates';
import { TEMPLATE_SEEDS } from '../src/thumbnail/template-seeds';

async function main(): Promise<void> {
  for (const tpl of TEMPLATE_SEEDS) {
    await upsertTemplate({
      code: tpl.code,
      title: tpl.title,
      aspect: tpl.aspect,
      document: tpl.document,
      previewUrl: tpl.previewUrl ?? null,
      tags: tpl.tags,
      isPublic: tpl.isPublic,
    });
    // eslint-disable-next-line no-console
    console.log(`✓ seeded ${tpl.code}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
