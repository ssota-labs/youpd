import { thumbnailSetLayer } from '../src/mcp/tools/index';

const id = process.argv[2];
if (!id) {
  console.error('usage: e2e-realtime-patch <thumbnailId>');
  process.exit(1);
}

await thumbnailSetLayer({
  thumbnailId: id,
  layerId: 'headline',
  patch: { text: '실시간 동기화 ✓', fill: '#FBBF24' },
});
console.log('patched', id);
process.exit(0);
