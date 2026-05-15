import type { Composition } from '@youpd/composer-core';

// A FontManifest declares which font binaries the host serves at which URL.
// The renderer derives the subset actually used by the composition's layers,
// fetches them, and passes the resolved buffers into satori.
export type FontVariant = {
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  url: string;
  // 'normal' is the default; italic variants get tagged separately.
  style?: 'normal' | 'italic';
};

export type FontFamilyManifest = {
  family: string;
  variants: FontVariant[];
};

export type FontManifest = FontFamilyManifest[];

export async function loadFontsForComposition(
  manifest: FontManifest,
  doc: Composition,
  defaults: string[] = [],
): Promise<
  Array<{
    name: string;
    data: ArrayBuffer;
    weight: FontVariant['weight'];
    style: 'normal' | 'italic';
  }>
> {
  const wanted = new Set<string>(defaults);
  for (const l of doc.layers) {
    if (l.type === 'text' && l.fontFamily) {
      wanted.add(l.fontFamily.split(',')[0]!.trim());
    }
  }
  const families = manifest.filter((f) => wanted.has(f.family));
  const fetchFont = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.arrayBuffer();
    } catch {
      return null;
    }
  };
  const out: Awaited<ReturnType<typeof loadFontsForComposition>> = [];
  await Promise.all(
    families.flatMap((fam) =>
      fam.variants.map(async (v) => {
        const data = await fetchFont(v.url);
        if (!data) return;
        out.push({
          name: fam.family,
          data,
          weight: v.weight,
          style: v.style ?? 'normal',
        });
      }),
    ),
  );
  return out;
}
