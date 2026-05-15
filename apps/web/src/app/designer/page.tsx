import 'server-only';
import { notFound } from 'next/navigation';
import {
  CompositionSchema,
  aspectToCanvas,
  type Composition,
} from '@youpd/types';
import { getThumbnail } from '@youpd/supabase/repositories/thumbnails';
import { ComposerShell } from './_components/composer-shell';

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

  const document: Composition = CompositionSchema.parse({
    canvas: aspectToCanvas(row!.aspect as '16:9' | '9:16'),
    background: row!.background ?? undefined,
    layers: row!.layers,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return (
    <ComposerShell
      documentId={row!.id}
      version={row!.version}
      document={document}
      name={row!.name}
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
    />
  );
}
