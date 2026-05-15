import 'server-only';
import type { ThumbnailDocument } from '@youpd/types';
import {
  renderComposition,
  loadFontsForComposition,
  type FontManifest,
} from '@youpd/composer-render-satori';

// YouPD ships the font binaries served by the web app's /api/fonts route.
// The renderer module itself stays agnostic; this manifest tells it which
// URLs to fetch (relative to the configured FONT_CDN_BASE_URL).
function youpdFontManifest(): FontManifest {
  const base = (process.env.FONT_CDN_BASE_URL ?? '').replace(/\/$/, '');
  if (!base) return [];
  const u = (file: string) => `${base}/${file}`;
  return [
    {
      family: 'Pretendard',
      variants: [
        { weight: 400, url: u('Pretendard-Regular.otf') },
        { weight: 700, url: u('Pretendard-Bold.otf') },
      ],
    },
    {
      family: 'Noto Sans KR',
      variants: [
        { weight: 400, url: u('NotoSansKR-Regular.otf') },
        { weight: 700, url: u('NotoSansKR-Bold.otf') },
      ],
    },
    {
      family: 'Black Han Sans',
      variants: [{ weight: 900, url: u('BlackHanSans-Regular.ttf') }],
    },
    {
      family: 'Jua',
      variants: [{ weight: 400, url: u('Jua-Regular.ttf') }],
    },
    {
      family: 'Do Hyeon',
      variants: [{ weight: 400, url: u('DoHyeon-Regular.ttf') }],
    },
  ];
}

export async function renderThumbnailPng(
  doc: ThumbnailDocument,
): Promise<Uint8Array> {
  const fonts = await loadFontsForComposition(youpdFontManifest(), doc, [
    'Pretendard',
  ]);
  return renderComposition(doc, { fonts });
}
