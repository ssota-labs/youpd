import 'server-only';
import { getLivenessRow } from '@youpd/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await getLivenessRow();
    return Response.json(
      { status: 'ok', key: row.key, value: row.value },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return Response.json({ status: 'error', error: message }, { status: 503 });
  }
}
