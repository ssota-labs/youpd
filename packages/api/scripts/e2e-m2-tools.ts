// E2E for the M2 backend additions: reorder + delete.
import {
  thumbnailApplyTemplate,
  thumbnailAddLayer,
  thumbnailReorderLayers,
  thumbnailDeleteLayer,
} from '../src/mcp/tools/index';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const NOTION_URL = 'https://www.notion.so/test-m2';

async function main(): Promise<void> {
  console.log('\n[1] apply_template');
  const applied = await thumbnailApplyTemplate({
    orgId: ORG_ID,
    notionCandidateUrl: NOTION_URL,
    templateCode: 'shock-red-number-16x9',
    name: 'M2 시안',
    fillers: { headline: 'M2 검증', accent: '검증', number: '2' },
  });
  console.log(JSON.stringify(applied, null, 2));
  const id = applied.thumbnailId;

  console.log('\n[2] add_layer (subcopy)');
  const added = await thumbnailAddLayer({
    thumbnailId: id,
    layer: {
      type: 'text',
      id: 'subcopy',
      text: '서브 카피',
      x: 120,
      y: 600,
      width: 800,
      fontSize: 40,
      fill: '#ffffff',
    },
  });
  console.log(JSON.stringify(added, null, 2));

  console.log('\n[3] reorder_layers (subcopy 맨 위로)');
  // Pull current order via list — but easier: hardcode based on template seed.
  // shock-red-number-16x9 starts with [number, headline, accent]; after add it's
  // [number, headline, accent, subcopy].
  const reordered = await thumbnailReorderLayers({
    thumbnailId: id,
    layerIds: ['subcopy', 'number', 'headline', 'accent'],
  });
  console.log(JSON.stringify(reordered, null, 2));

  console.log('\n[4] delete_layer (accent)');
  const deleted = await thumbnailDeleteLayer({
    thumbnailId: id,
    layerId: 'accent',
  });
  console.log(JSON.stringify(deleted, null, 2));

  console.log('\n✓ M2 backend e2e completed');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n✗ failed:', err);
    process.exit(1);
  });
