'use client';

import { useEffect, useRef } from 'react';
import type { TextLayer } from '@youpd/types';

type Rect = { x: number; y: number; width: number; height: number };

type Props = {
  layer: TextLayer;
  // Rect in screen pixels (already scaled), measured from the actual Konva
  // node via getClientRect — guarantees the textarea covers exactly what the
  // node drew, including multi-line wrapping.
  rect: Rect;
  stageScale: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
};

// Renders a <textarea> overlaid exactly on top of the Konva text node.
// Positions assume the parent <div> wraps the Stage and has the same origin.
export function TextEditorOverlay({
  layer,
  rect,
  stageScale,
  onCommit,
  onCancel,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    ta.select();
  }, []);

  const fontWeight =
    typeof layer.fontWeight === 'number'
      ? layer.fontWeight
      : layer.fontWeight === 'bold'
        ? 700
        : 400;

  return (
    <textarea
      ref={ref}
      defaultValue={layer.text}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit(e.currentTarget.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      style={{
        position: 'absolute',
        // content-box so `width`/`height` represent the text-drawing area,
        // matching the Konva node's rect. The 1px dashed border then sits
        // *outside* the rect, shifted by -1px so it visually frames the
        // text instead of clipping it.
        boxSizing: 'content-box',
        left: rect.x - 1,
        top: rect.y - 1,
        width: rect.width,
        height: rect.height,
        fontSize: (layer.fontSize ?? 64) * stageScale,
        fontFamily: layer.fontFamily ?? 'Pretendard, sans-serif',
        fontWeight,
        lineHeight: layer.lineHeight ?? 1.1,
        letterSpacing: (layer.letterSpacing ?? 0) * stageScale,
        color: layer.fill ?? '#fff',
        textAlign: layer.align ?? 'left',
        background: 'transparent',
        border: '1px dashed #60a5fa',
        outline: 'none',
        padding: 0,
        margin: 0,
        resize: 'none',
        // Allow vertical scroll if user types more text than fits, but no
        // horizontal scroll — long lines wrap. After commit, Konva
        // re-renders the layer at the actual size needed.
        overflow: 'hidden auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        zIndex: 10,
      }}
    />
  );
}
