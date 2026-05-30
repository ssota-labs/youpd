/**
 * Generic Table of Contents item for shared TOC UI
 */

export interface TableOfContentsItem {
  id: string;
  label: string;
  /** Heading level (1-3) for summary TOC indent */
  level?: 1 | 2 | 3;
  /** Width hint for timeline TOC (5min vs 10min intervals) */
  widthHint?: 'narrow' | 'wide';
}
