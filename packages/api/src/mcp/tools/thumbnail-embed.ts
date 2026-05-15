// Shared helper so every thumbnail_* tool builds the same iframe URL shape.
// Falls back to localhost so unit tests don't need YOUPD_APP_URL set.
export function buildEmbedUrl(thumbnailId: string): string {
  const base = (process.env.YOUPD_APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  return `${base}/designer?thumbnailId=${encodeURIComponent(thumbnailId)}`;
}

export function buildPublicPreviewUrl(thumbnailId: string): string {
  const base = (process.env.YOUPD_APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  return `${base}/t/${encodeURIComponent(thumbnailId)}`;
}
