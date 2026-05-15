import 'server-only';
import { createServerSupabaseClient } from '../server';

function getBucket(): string {
  return process.env.THUMBNAIL_EXPORT_BUCKET || 'thumbnail-exports';
}

export type UploadInput = {
  thumbnailId: string;
  aspect: '16:9' | '9:16';
  bytes: Uint8Array | Buffer;
  contentType?: string;
};

export type UploadResult = {
  path: string;
  publicUrl: string;
};

// Upload a rendered PNG to the export bucket and return a long-lived public
// URL suitable for Notion file attachment. The bucket is expected to be
// public (or fronted by a CDN); private exports would need signed URLs.
export async function uploadThumbnailExport(
  input: UploadInput,
): Promise<UploadResult> {
  const client = createServerSupabaseClient();
  const bucket = getBucket();
  const folder = input.aspect === '9:16' ? '9x16' : '16x9';
  const path = `${folder}/${input.thumbnailId}-${Date.now()}.png`;
  const { error } = await client.storage.from(bucket).upload(path, input.bytes, {
    contentType: input.contentType ?? 'image/png',
    upsert: false,
  });
  if (error) {
    throw new Error(`thumbnail export upload failed: ${error.message}`);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
