'use client';

import { useEffect, useState } from 'react';

type Variant = { weight: number; url: string };
type Family = { family: string; variants: Variant[]; hasBold: boolean };

let FONTS_CACHE: Family[] | null = null;
let FONTS_READY: Promise<void> | null = null;

// Resolve once every variant is actually loaded by the browser. Konva caches
// font metrics from canvas measureText at first render, so any text drawn
// before fonts.load(...) resolves uses the system fallback and never
// re-measures. Callers use this promise to gate the initial Konva draw.
export function fontsReady(): Promise<void> {
  return FONTS_READY ?? Promise.resolve();
}

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
      // Force the browser to actually fetch every variant so Konva's
      // canvas measureText returns correct metrics on its next draw.
      FONTS_READY = (async () => {
        if (!('fonts' in document)) return;
        await Promise.all(
          data.families.flatMap((f) =>
            f.variants.map((v) =>
              (document as Document & {
                fonts: FontFaceSet;
              }).fonts
                .load(`${v.weight} 64px "${f.family}"`)
                .catch(() => undefined),
            ),
          ),
        );
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      })();
      await FONTS_READY;
      if (cancelled) return;
      setFonts(data.families);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return fonts;
}
