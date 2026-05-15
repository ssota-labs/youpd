'use client';

import { useEffect, useRef } from 'react';
import type { TextLayer } from '@youpd/types';

type Props = {
  layer: TextLayer;
  stageScale: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
};

// Renders a <textarea> overlaid exactly on top of the Konva text node.
// Positions assume the parent <div> wraps the Stage and has the same origin.
export function TextEditorOverlay({ layer, stageScale, onCommit, onCancel }: Props) {
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
        left: layer.x * stageScale,
        top: layer.y * stageScale,
        width: (layer.width ?? 600) * stageScale,
        minHeight: (layer.fontSize ?? 64) * (layer.lineHeight ?? 1.1) * stageScale,
        fontSize: (layer.fontSize ?? 64) * stageScale,
        fontFamily: layer.fontFamily ?? 'Pretendard, sans-serif',
        fontWeight,
        lineHeight: layer.lineHeight ?? 1.1,
        letterSpacing: (layer.letterSpacing ?? 0) * stageScale,
        color: layer.fill ?? '#fff',
        textAlign: layer.align ?? 'left',
        background: 'transparent',
        border: '2px solid #60a5fa',
        outline: 'none',
        padding: 0,
        margin: 0,
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        zIndex: 10,
      }}
    />
  );
}
