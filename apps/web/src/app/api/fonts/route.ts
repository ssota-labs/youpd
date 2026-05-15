import { NextResponse } from 'next/server';

// Manifest of fonts hosted under /public/fonts. Returned to the iframe so the
// designer can render in the same families satori will use server-side for
// PNG export. Cached aggressively — fonts rarely change.
type Weight = 400 | 500 | 700 | 800 | 900;

type FontVariant = {
  weight: Weight;
  url: string;
};

type FontFamily = {
  family: string;
  variants: FontVariant[];
  // Whether this family is bundled with both light and bold weights, used by
  // the designer Text panel to know if a "굵게" toggle is meaningful.
  hasBold: boolean;
};

const FONTS: FontFamily[] = [
  {
    family: 'Pretendard',
    variants: [
      { weight: 400, url: '/fonts/Pretendard-Regular.otf' },
      { weight: 700, url: '/fonts/Pretendard-Bold.otf' },
    ],
    hasBold: true,
  },
  {
    family: 'Noto Sans KR',
    variants: [
      { weight: 400, url: '/fonts/NotoSansKR-Regular.otf' },
      { weight: 700, url: '/fonts/NotoSansKR-Bold.otf' },
    ],
    hasBold: true,
  },
  {
    family: 'Black Han Sans',
    variants: [{ weight: 900, url: '/fonts/BlackHanSans-Regular.ttf' }],
    hasBold: false,
  },
  {
    family: 'Jua',
    variants: [{ weight: 400, url: '/fonts/Jua-Regular.ttf' }],
    hasBold: false,
  },
  {
    family: 'Do Hyeon',
    variants: [{ weight: 400, url: '/fonts/DoHyeon-Regular.ttf' }],
    hasBold: false,
  },
];

export async function GET() {
  return NextResponse.json(
    { families: FONTS },
    {
      headers: {
        'cache-control': 'public, max-age=3600, immutable',
      },
    },
  );
}
