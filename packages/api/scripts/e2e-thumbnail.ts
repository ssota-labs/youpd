// E2E flow exercising the v0.4 thumbnail MCP tools directly against
// the local Supabase. Run with `pnpm --filter @youpd/api e2e:thumbnail`.
import {
  thumbnailApplyTemplate,
  thumbnailSetLayer,
  thumbnailGetEmbedUrl,
  thumbnailList,
  thumbnailExportPng,
} from '../src/mcp/tools/index';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const NOTION_URL = 'https://www.notion.so/test-pull-candidate-e2e';

async function main(): Promise<void> {
  console.log('\n[1] apply_template');
  const applied = await thumbnailApplyTemplate({
    orgId: ORG_ID,
    notionCandidateUrl: NOTION_URL,
    templateCode: 'shock-red-number-16x9',
    name: 'E2E 시안 A',
    fillers: {
      headline: '무릎통증 90%가 모르는 사실',
      accent: '90%',
      number: '3',
    },
  });
  console.log(JSON.stringify(applied, null, 2));
  const thumbnailId = applied.thumbnailId;

  console.log('\n[2] get_embed_url');
  const embed = await thumbnailGetEmbedUrl({ thumbnailId });
  console.log(JSON.stringify(embed, null, 2));

  console.log('\n[3] list');
  const list = await thumbnailList({ orgId: ORG_ID, notionCandidateUrl: NOTION_URL });
  console.log(JSON.stringify(list, null, 2));

  console.log('\n[4] set_layer (headline)');
  const patched = await thumbnailSetLayer({
    thumbnailId,
    layerId: 'headline',
    patch: {
      text: '이 운동, 무릎에 독입니다',
      fontSize: 84,
      fill: '#FFFFFF',
    },
  });
  console.log(JSON.stringify(patched, null, 2));

  console.log('\n[5] export_png');
  const exported = await thumbnailExportPng({
    thumbnailId,
    formats: ['16:9'],
  });
  console.log(JSON.stringify(exported, null, 2));

  console.log('\n✓ e2e completed');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n✗ e2e failed:', err);
    process.exit(1);
  });
