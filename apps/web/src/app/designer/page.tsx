import 'server-only';
import { notFound } from 'next/navigation';
import { ThumbnailDocumentSchema, type ThumbnailDocument } from '@youpd/types';
import { getThumbnail } from '@youpd/supabase/repositories/thumbnails';
import { DesignerShell } from './_components/designer-shell';

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
    <DesignerShell
      thumbnailId={row!.id}
      initialVersion={row!.version}
      initialDocument={document}
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
      name={row!.name}
    />
  );
}
