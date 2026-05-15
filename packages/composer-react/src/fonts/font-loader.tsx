'use client';

import { useEffect, useState } from 'react';
import { useComposerFontManifestUrl } from '../store/context';

type Variant = { weight: number; url: string };
type Family = { family: string; variants: Variant[]; hasBold: boolean };

// Per-page caches keyed by manifest URL so two composers on the same page
// share fetched bytes, but two pages (or two host apps) don't bleed into
// each other.
const FONTS_CACHE = new Map<string, Family[]>();
// FONTS_READY entries are populated synchronously on the first call to
// useFontManifest / fontsReady for a given url, so any concurrent
// fontsReady(url) call gets the same in-flight promise to await rather than
// resolving immediately with no fonts loaded.
const FONTS_READY = new Map<string, Promise<void>>();
const FONTS_READY_RESOLVERS = new Map<string, () => void>();

function ensureReadyPromise(manifestUrl: string): Promise<void> {
  const existing = FONTS_READY.get(manifestUrl);
  if (existing) return existing;
  let resolveFn: () => void = () => undefined;
  const p = new Promise<void>((resolve) => {
    resolveFn = resolve;
  });
  FONTS_READY.set(manifestUrl, p);
  FONTS_READY_RESOLVERS.set(manifestUrl, resolveFn);
  return p;
}

// Resolve once every variant is actually loaded by the browser. Konva caches
// font metrics from canvas measureText at first render, so any text drawn
// before fonts.load(...) resolves uses the system fallback and never
// re-measures. Callers use this promise to gate Konva re-measures.
export function fontsReady(manifestUrl: string): Promise<void> {
  if (!manifestUrl) return Promise.resolve();
  return ensureReadyPromise(manifestUrl);
}

// Pulls the host-supplied manifest URL (via ComposerProvider), injects
// @font-face once globally, and forces a real fetch + fonts.ready so Konva's
// next canvas draw measures the correct font metrics.
export function useFontManifest(): Family[] {
  const manifestUrl = useComposerFontManifestUrl();
  const [fonts, setFonts] = useState<Family[]>(
    FONTS_CACHE.get(manifestUrl) ?? [],
  );

  useEffect(() => {
    if (!manifestUrl) return;
    const cached = FONTS_CACHE.get(manifestUrl);
    if (cached) {
      setFonts(cached);
      return;
    }
    // Ensure a pending promise exists synchronously so concurrent
    // fontsReady(url) callers wait for the actual fetch + load.
    ensureReadyPromise(manifestUrl);
    let cancelled = false;
    void (async () => {
      const res = await fetch(manifestUrl);
      if (!res.ok) {
        FONTS_READY_RESOLVERS.get(manifestUrl)?.();
        return;
      }
      const data = (await res.json()) as { families: Family[] };
      FONTS_CACHE.set(manifestUrl, data.families);
      if (cancelled) {
        FONTS_READY_RESOLVERS.get(manifestUrl)?.();
        return;
      }

      const styleId = `composer-font-faces-${hash(manifestUrl)}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
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

      if ('fonts' in document) {
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
      }
      FONTS_READY_RESOLVERS.get(manifestUrl)?.();
      if (cancelled) return;
      setFonts(data.families);
    })();
    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);
  return fonts;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
