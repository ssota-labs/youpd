'use client';

import { useEffect, useState } from 'react';

type Variant = { weight: number; url: string };
type Family = { family: string; variants: Variant[]; hasBold: boolean };

let FONTS_CACHE: Family[] | null = null;

// Singleton-ish font manifest fetch + global @font-face injection. Konva and
// the Text overlay share the same font names so the canvas matches the
// server-rendered PNG.
export function useFontManifest(): Family[] {
  const [fonts, setFonts] = useState<Family[]>(FONTS_CACHE ?? []);
  useEffect(() => {
    if (FONTS_CACHE) {
      setFonts(FONTS_CACHE);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch('/api/fonts');
      if (!res.ok) return;
      const data = (await res.json()) as { families: Family[] };
      FONTS_CACHE = data.families;
      if (cancelled) return;
      // Inject @font-face declarations once.
      if (!document.getElementById('youpd-font-faces')) {
        const style = document.createElement('style');
        style.id = 'youpd-font-faces';
        style.textContent = data.families
          .flatMap((f) =>
            f.variants.map(
              (v) => `@font-face {
  font-family: "${f.family}";
  src: url("${v.url}") format("opentype");
  font-weight: ${v.weight};
  font-display: swap;
}`,
            ),
          )
          .join('\n');
        document.head.appendChild(style);
      }
      setFonts(data.families);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return fonts;
}
