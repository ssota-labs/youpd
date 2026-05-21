// Add a YouTube API key to the rotation pool.
//   pnpm --filter @youpd/api youtube-key:add --label=<label> --key=<key>
//
// Requires DATABASE_URL. Keys go straight into youtube_api_keys with status='active';
// the rotation picker (packages/api/src/mcp/youtube-key-pool.ts) will use them on
// the next request.
import { insertKey } from '@youpd/supabase/repositories/youtube-keys';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : undefined;
}

async function main(): Promise<void> {
  const label = parseArg('label');
  const key = parseArg('key');
  if (!label || !key) {
    console.error(
      'usage: youtube-key:add --label=<label> --key=<youtube-api-key>',
    );
    process.exit(2);
  }
  const row = await insertKey(label, key);
  console.log(`✓ inserted youtube_api_keys row ${row.id} (label=${row.label})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
