'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Stage,
  Layer as Layer_,
  Text as KText,
  Image as KImage,
  Rect as KRect,
  Circle as KCircle,
  Transformer,
} from 'react-konva';
import type Konva from 'konva';
import type { Layer, LayerPatch, ThumbnailDocument } from '@youpd/types';
import { ASPECT_DIMENSIONS } from '@youpd/types';
import {
  useDesignerStore,
  patchLayerOnServer,
} from './designer-store';
import { TextEditorOverlay } from './text-editor-overlay';

type Props = {
  thumbnailId: string;
  initialVersion: number;
  initialDocument: ThumbnailDocument;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function DesignerCanvas(props: Props) {
  const init = useDesignerStore((s) => s.init);
  const doc = useDesignerStore((s) => s.doc);
  const version = useDesignerStore((s) => s.version);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const hoveredId = useDesignerStore((s) => s.hoveredId);
  const setSelected = useDesignerStore((s) => s.setSelected);
  const setHovered = useDesignerStore((s) => s.setHovered);
  const setIsDragging = useDesignerStore((s) => s.setIsDragging);
  const applyLocalPatch = useDesignerStore((s) => s.applyLocalPatch);
  const replaceDoc = useDesignerStore((s) => s.replaceDoc);
  const setStatus = useDesignerStore((s) => s.setStatus);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef(new Map<string, Konva.Node>());
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);

  const { width, height } = ASPECT_DIMENSIONS[doc.aspect];

  useEffect(() => {
    init({
      thumbnailId: props.thumbnailId,
      doc: props.initialDocument,
      version: props.initialVersion,
    });
  }, [init, props.thumbnailId, props.initialDocument, props.initialVersion]);

  // Fit the stage to viewport without rescaling the source coords.
  useEffect(() => {
    const compute = () => {
      if (typeof window === 'undefined') return;
      // M2 will reserve ~380px for side panels; for now use the full width.
      const maxW = Math.min(window.innerWidth - 64, 1100);
      setStageScale(Math.min(1, maxW / width));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [width]);

  // Realtime subscription — refetch authoritative state via API on each
  // broadcast so the iframe doesn't trust an unvalidated payload.
  useEffect(() => {
    if (!props.supabaseUrl || !props.supabaseAnonKey) return;
    const supabase = createBrowserClient(props.supabaseUrl, props.supabaseAnonKey);
    const channel = supabase.channel(`thumbnail:${props.thumbnailId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'patched' }, async () => {
      if (useDesignerStore.getState().isDragging) return;
      const res = await fetch(
        `/api/mcp/thumbnail/state?thumbnailId=${props.thumbnailId}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        version: number;
        document: ThumbnailDocument;
      };
      replaceDoc(data.document, data.version);
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [props.thumbnailId, props.supabaseUrl, props.supabaseAnonKey, replaceDoc]);

  // Attach the Transformer to the currently selected node.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedId && shapeRefs.current.has(selectedId)) {
      tr.nodes([shapeRefs.current.get(selectedId)!]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, doc.layers.length]);

  const handleStageMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    // Click on empty area → deselect.
    if (e.target === e.target.getStage()) setSelected(null);
  };

  const commitPatch = async (layerId: string, patch: LayerPatch) => {
    applyLocalPatch(layerId, patch);
    setStatus('pending');
    const baseline = useDesignerStore.getState().version;
    const res = await patchLayerOnServer({
      thumbnailId: props.thumbnailId,
      layerId,
      patch,
      expectedVersion: baseline,
    });
    if ('conflict' in res) {
      setStatus('conflict');
      // Re-pull authoritative state.
      const stateRes = await fetch(
        `/api/mcp/thumbnail/state?thumbnailId=${props.thumbnailId}`,
      );
      if (stateRes.ok) {
        const data = (await stateRes.json()) as {
          version: number;
          document: ThumbnailDocument;
        };
        replaceDoc(data.document, data.version);
        setStatus('idle');
      }
      return;
    }
    useDesignerStore.setState({ version: res.version });
    setStatus('idle');
  };

  const editingLayer =
    editingTextId !== null
      ? (doc.layers.find((l) => l.id === editingTextId) ?? null)
      : null;

  return (
    <div className="relative rounded-lg overflow-hidden ring-1 ring-zinc-800 bg-zinc-900">
      <Stage
        ref={(n) => {
          stageRef.current = n;
        }}
        width={width * stageScale}
        height={height * stageScale}
        scaleX={stageScale}
        scaleY={stageScale}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
      >
        <Layer_ listening={false}>
          {doc.background?.color ? (
            <KRect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={doc.background.color}
            />
          ) : null}
        </Layer_>
        <Layer_>
          {doc.layers.map((layer) =>
            renderLayer(layer, {
              isSelected: selectedId === layer.id,
              isHovered: hoveredId === layer.id,
              isEditing: editingTextId === layer.id,
              onSelect: () => setSelected(layer.id),
              onHoverIn: () => setHovered(layer.id),
              onHoverOut: () => setHovered(null),
              onDragStart: () => setIsDragging(true),
              onDragEnd: (x, y) => {
                setIsDragging(false);
                void commitPatch(layer.id, { x, y });
              },
              onTransformEnd: (patch) => {
                void commitPatch(layer.id, patch);
              },
              onDoubleClick: () => {
                if (layer.type === 'text') setEditingTextId(layer.id);
              },
              registerNode: (node) => {
                if (node) shapeRefs.current.set(layer.id, node);
                else shapeRefs.current.delete(layer.id);
              },
            }),
          )}
          <Transformer
            ref={(n) => {
              transformerRef.current = n;
            }}
            rotateEnabled
            keepRatio={false}
            anchorSize={10}
            borderStroke="#60a5fa"
            anchorStroke="#60a5fa"
            anchorFill="#fff"
          />
        </Layer_>
      </Stage>
      {editingLayer && editingLayer.type === 'text' ? (
        <TextEditorOverlay
          layer={editingLayer}
          stageScale={stageScale}
          onCommit={(text) => {
            setEditingTextId(null);
            if (text !== editingLayer.text) {
              void commitPatch(editingLayer.id, { text });
            }
          }}
          onCancel={() => setEditingTextId(null)}
        />
      ) : null}
      <StatusBadge version={version} />
    </div>
  );
}

function StatusBadge({ version }: { version: number }) {
  const status = useDesignerStore((s) => s.status);
  const label =
    status === 'pending'
      ? '저장 중…'
      : status === 'conflict'
        ? '동기화됨'
        : status === 'error'
          ? '저장 실패'
          : `v${version}`;
  return (
    <div className="absolute right-2 top-2 text-[10px] px-2 py-1 rounded bg-zinc-800/80 text-zinc-300">
      {label}
    </div>
  );
}

type LayerHandlers = {
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (patch: LayerPatch) => void;
  onDoubleClick: () => void;
  registerNode: (node: Konva.Node | null) => void;
};

function renderLayer(layer: Layer, h: LayerHandlers): React.ReactNode {
  if (layer.visible === false) return null;
  const outlineStroke = h.isSelected
    ? '#60a5fa'
    : h.isHovered
      ? '#3f3f46'
      : undefined;
  const outlineWidth = h.isSelected ? 2 : h.isHovered ? 1 : 0;

  const onTransformEndFor = (node: Konva.Node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const patch: LayerPatch = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };
    if ('width' in layer && typeof layer.width === 'number') {
      patch.width = Math.max(8, layer.width * scaleX);
    }
    if ('height' in layer && typeof layer.height === 'number') {
      patch.height = Math.max(8, layer.height * scaleY);
    }
    if (layer.type === 'text' && layer.fontSize) {
      patch.fontSize = Math.max(8, layer.fontSize * scaleY);
    }
    // Reset scale so future transforms aren't compounded.
    node.scaleX(1);
    node.scaleY(1);
    h.onTransformEnd(patch);
  };

  if (layer.type === 'text') {
    return (
      <KText
        key={layer.id}
        ref={(n) => h.registerNode(n)}
        x={layer.x}
        y={layer.y}
        text={layer.text}
        fontSize={layer.fontSize ?? 64}
        fontStyle={
          typeof layer.fontWeight === 'number' && layer.fontWeight >= 600
            ? 'bold'
            : 'normal'
        }
        fontFamily={layer.fontFamily ?? 'Pretendard, sans-serif'}
        fill={layer.fill ?? '#fff'}
        align={layer.align ?? 'left'}
        width={layer.width}
        lineHeight={layer.lineHeight ?? 1.1}
        letterSpacing={layer.letterSpacing}
        opacity={h.isEditing ? 0 : (layer.opacity ?? 1)}
        rotation={layer.rotation ?? 0}
        stroke={outlineStroke ?? layer.stroke}
        strokeWidth={outlineWidth || (layer.strokeWidth ?? 0)}
        draggable
        onDragStart={h.onDragStart}
        onDragEnd={(e) => h.onDragEnd(e.target.x(), e.target.y())}
        onTransformEnd={(e) => onTransformEndFor(e.target)}
        onClick={h.onSelect}
        onTap={h.onSelect}
        onDblClick={h.onDoubleClick}
        onDblTap={h.onDoubleClick}
        onMouseEnter={h.onHoverIn}
        onMouseLeave={h.onHoverOut}
      />
    );
  }
  if (layer.type === 'image') {
    return (
      <KonvaImageLoader
        key={layer.id}
        layer={layer}
        registerNode={h.registerNode}
        onSelect={h.onSelect}
        onHoverIn={h.onHoverIn}
        onHoverOut={h.onHoverOut}
        onDragStart={h.onDragStart}
        onDragEnd={h.onDragEnd}
        onTransformEnd={(node) => onTransformEndFor(node)}
        outlineStroke={outlineStroke}
        outlineWidth={outlineWidth}
      />
    );
  }
  if (layer.shape === 'circle') {
    return (
      <KCircle
        key={layer.id}
        ref={(n) => h.registerNode(n)}
        x={layer.x + layer.width / 2}
        y={layer.y + layer.height / 2}
        radius={Math.min(layer.width, layer.height) / 2}
        fill={layer.fill}
        stroke={outlineStroke ?? layer.stroke}
        strokeWidth={outlineWidth || (layer.strokeWidth ?? 0)}
        opacity={layer.opacity ?? 1}
        rotation={layer.rotation ?? 0}
        draggable
        onDragStart={h.onDragStart}
        onDragEnd={(e) =>
          h.onDragEnd(
            e.target.x() - layer.width / 2,
            e.target.y() - layer.height / 2,
          )
        }
        onTransformEnd={(e) => onTransformEndFor(e.target)}
        onClick={h.onSelect}
        onTap={h.onSelect}
        onMouseEnter={h.onHoverIn}
        onMouseLeave={h.onHoverOut}
      />
    );
  }
  return (
    <KRect
      key={layer.id}
      ref={(n) => h.registerNode(n)}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fill={layer.fill}
      stroke={outlineStroke ?? layer.stroke}
      strokeWidth={outlineWidth || (layer.strokeWidth ?? 0)}
      cornerRadius={layer.cornerRadius ?? 0}
      opacity={layer.opacity ?? 1}
      rotation={layer.rotation ?? 0}
      draggable
      onDragStart={h.onDragStart}
      onDragEnd={(e) => h.onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => onTransformEndFor(e.target)}
      onClick={h.onSelect}
      onTap={h.onSelect}
      onMouseEnter={h.onHoverIn}
      onMouseLeave={h.onHoverOut}
    />
  );
}

function KonvaImageLoader(props: {
  layer: Extract<Layer, { type: 'image' }>;
  registerNode: (n: Konva.Node | null) => void;
  onSelect: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (node: Konva.Node) => void;
  outlineStroke: string | undefined;
  outlineWidth: number;
}) {
  const { layer } = props;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.src = layer.src;
    i.onload = () => setImg(i);
  }, [layer.src]);
  if (!img) return null;
  return (
    <KImage
      ref={(n) => props.registerNode(n)}
      image={img}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      opacity={layer.opacity ?? 1}
      rotation={layer.rotation ?? 0}
      stroke={props.outlineStroke}
      strokeWidth={props.outlineWidth}
      draggable
      onDragStart={props.onDragStart}
      onDragEnd={(e) => props.onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => props.onTransformEnd(e.target)}
      onClick={props.onSelect}
      onTap={props.onSelect}
      onMouseEnter={props.onHoverIn}
      onMouseLeave={props.onHoverOut}
    />
  );
}
