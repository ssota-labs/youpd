import 'server-only';
import { createServerSupabaseClient } from '../server';

function getBucket(): string {
  return process.env.THUMBNAIL_ASSETS_BUCKET || 'thumbnail-assets';
}

export type UploadAssetInput = {
  orgId: string;
  filename: string;
  bytes: Uint8Array | Buffer;
  contentType: string;
};

export type UploadAssetResult = {
  path: string;
  publicUrl: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

// Upload a user-supplied image into the thumbnail-assets bucket. Validates
// content-type and size at the boundary so the iframe can't smuggle in
// non-image files.
export async function uploadThumbnailAsset(
  input: UploadAssetInput,
): Promise<UploadAssetResult> {
  if (!ALLOWED.has(input.contentType)) {
    throw new Error(`unsupported content type: ${input.contentType}`);
  }
  if (input.bytes.byteLength > MAX_BYTES) {
    throw new Error(
      `asset too large: ${input.bytes.byteLength} > ${MAX_BYTES} bytes`,
    );
  }
  const client = createServerSupabaseClient();
  const bucket = getBucket();
  const ext = extensionFor(input.contentType);
  const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const path = `${input.orgId}/${Date.now()}-${safe || `asset.${ext}`}`;
  const { error } = await client.storage.from(bucket).upload(path, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`thumbnail asset upload failed: ${error.message}`);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

function extensionFor(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  return 'bin';
}
