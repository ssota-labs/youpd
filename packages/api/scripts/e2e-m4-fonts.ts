// E2E for M4 font picker: edit a layer to use Black Han Sans and export PNG.
// FONT_CDN_BASE_URL must point at the running web app (e.g. http://localhost:3000/fonts).
import {
  thumbnailApplyTemplate,
  thumbnailSetLayer,
  thumbnailExportPng,
} from '../src/mcp/tools/index';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main(): Promise<void> {
  console.log('\n[1] apply_template');
  const applied = await thumbnailApplyTemplate({
    orgId: ORG_ID,
    templateCode: 'shock-red-number-16x9',
    fillers: { headline: 'Black Han Sans 시안', accent: '굵게', number: '4' },
  });
  console.log({ id: applied.thumbnailId });

  console.log('\n[2] set_layer fontFamily = Black Han Sans');
  await thumbnailSetLayer({
    thumbnailId: applied.thumbnailId,
    layerId: 'headline',
    patch: { fontFamily: 'Black Han Sans', fontWeight: 900 },
  });

  console.log('\n[3] export_png');
  const exp = await thumbnailExportPng({
    thumbnailId: applied.thumbnailId,
    formats: ['16:9'],
  });
  console.log(exp);

  console.log('\n✓ M4 font e2e completed');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n✗ failed:', err);
    process.exit(1);
  });
