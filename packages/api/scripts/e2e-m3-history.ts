// E2E for M3 undo/redo and history-state.
import {
  thumbnailApplyTemplate,
  thumbnailSetLayer,
  thumbnailUndo,
  thumbnailRedo,
  thumbnailHistoryState,
} from '../src/mcp/tools/index';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const NOTION_URL = 'https://www.notion.so/test-m3';

async function main(): Promise<void> {
  console.log('\n[1] apply_template');
  const applied = await thumbnailApplyTemplate({
    orgId: ORG_ID,
    notionCandidateUrl: NOTION_URL,
    templateCode: 'shock-red-number-16x9',
    name: 'M3 시안',
    fillers: { headline: '원본 헤드라인', accent: '90%', number: '3' },
  });
  const id = applied.thumbnailId;
  console.log({ id });

  console.log('\n[2] history_state initial');
  console.log(await thumbnailHistoryState({ thumbnailId: id }));

  console.log('\n[3] set_layer A');
  await thumbnailSetLayer({
    thumbnailId: id,
    layerId: 'headline',
    patch: { text: '편집 A' },
  });

  console.log('\n[4] set_layer B');
  await thumbnailSetLayer({
    thumbnailId: id,
    layerId: 'headline',
    patch: { text: '편집 B' },
  });

  console.log('\n[5] history_state after 2 edits');
  console.log(await thumbnailHistoryState({ thumbnailId: id }));

  console.log('\n[6] undo (B → A)');
  console.log(await thumbnailUndo({ thumbnailId: id }));

  console.log('\n[7] history_state after undo');
  console.log(await thumbnailHistoryState({ thumbnailId: id }));

  console.log('\n[8] redo (A → B)');
  console.log(await thumbnailRedo({ thumbnailId: id }));

  console.log('\n[9] history_state after redo');
  console.log(await thumbnailHistoryState({ thumbnailId: id }));

  console.log('\n✓ M3 history e2e completed');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n✗ failed:', err);
    process.exit(1);
  });
