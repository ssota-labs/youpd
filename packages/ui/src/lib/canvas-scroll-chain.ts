/**
 * Contract for canvas scroll chaining: blocks (or any scrollable content) that want
 * wheel-at-edge to propagate to the canvas (e.g. for panning) mark their scroll
 * container with this data attribute. The canvas uses CANVAS_SCROLL_CHAIN_SELECTOR
 * to find such containers and applies scroll-chain logic (allow propagation at edge).
 *
 * Use on the element that has overflow-auto/overflow-scroll and wraps the scrollable content.
 * See: PDF block, Markdown/TipTap block, X preview card, etc.
 */
export const DATA_CANVAS_SCROLL_CHAIN = 'data-canvas-scroll-chain';

/** Selector for the designated scroll-chain container (used by canvas wheel handler). */
export const CANVAS_SCROLL_CHAIN_SELECTOR = `[${DATA_CANVAS_SCROLL_CHAIN}]`;
