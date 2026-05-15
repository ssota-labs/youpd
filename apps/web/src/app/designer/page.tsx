import 'server-only';
import { notFound } from 'next/navigation';
import { ThumbnailDocumentSchema, type ThumbnailDocument } from '@youpd/types';
import { getThumbnail } from '@youpd/supabase/repositories/thumbnails';
import { DesignerCanvas } from './_components/designer-canvas';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ thumbnailId?: string }>;

export default async function DesignerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { thumbnailId } = await searchParams;
  if (!thumbnailId) notFound();

  let row;
  try {
    row = await getThumbnail(thumbnailId);
  } catch {
    notFound();
  }

  const document: ThumbnailDocument = ThumbnailDocumentSchema.parse({
    aspect: row!.aspect,
    background: row!.background ?? undefined,
    layers: row!.layers,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 gap-4">
      <header className="flex w-full max-w-5xl items-center justify-between">
        <h1 className="text-lg font-semibold">
          {row!.name ?? '시안'}{' '}
          <span className="text-zinc-400 text-sm">v{row!.version}</span>
        </h1>
        <span className="text-xs text-zinc-500">{row!.aspect}</span>
      </header>
      <DesignerCanvas
        thumbnailId={row!.id}
        initialVersion={row!.version}
        initialDocument={document}
        supabaseUrl={supabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
      />
    </main>
  );
}
