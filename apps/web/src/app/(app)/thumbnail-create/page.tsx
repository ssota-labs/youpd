import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ThumbnailGenerationError,
  getThumbnailCreateBootstrap,
} from '@youpd/api/thumbnail-generation';
import { ThumbnailCreateForm } from '@/components/thumbnail-create/create-form';
import { requireSessionUserId } from '@/lib/auth/require-session-user';

type PageProps = {
  searchParams: Promise<{ templateId?: string }>;
};

export default async function ThumbnailCreatePage({ searchParams }: PageProps) {
  const userId = await requireSessionUserId();
  const { templateId } = await searchParams;

  if (!templateId) {
    redirect('/thumbnail-templates');
  }

  try {
    const bootstrap = await getThumbnailCreateBootstrap({ userId, templateId });
    return (
      <div className="min-h-screen bg-background pb-16">
        <header className="border-b border-border px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href={`/thumbnail-templates/${templateId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← 템플릿 상세
          </Link>
        </header>
        <ThumbnailCreateForm templateId={templateId} initialBootstrap={bootstrap} />
      </div>
    );
  } catch (error) {
    if (error instanceof ThumbnailGenerationError && error.code === 'NOT_FOUND') {
      notFound();
    }
    throw error;
  }
}
