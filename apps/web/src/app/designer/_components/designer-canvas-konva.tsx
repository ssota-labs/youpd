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
  Line as KLine,
} from 'react-konva';
import type Konva from 'konva';
import type { Layer, LayerPatch, ThumbnailDocument } from '@youpd/types';
import { ASPECT_DIMENSIONS } from '@youpd/types';
import {
  useDesignerStore,
  patchLayerOnServer,
} from './designer-store';
import { TextEditorOverlay } from './text-editor-overlay';
import { snapDrag, type GuideLine } from './snap';
import { fontsReady } from './font-loader';

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
  const [guides, setGuides] = useState<GuideLine[]>([]);

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
      // Account for left layer panel (240) + right properties panel (288) +
      // padding so the canvas fits the center column. Clamp to 320 minimum
      // so the preview is usable on narrow viewports.
      const reserved = 560;
      const available = Math.max(320, window.innerWidth - reserved);
      const maxW = Math.min(available, 1100);
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

  // Konva.Text.getSelfRect() returns the wrap-width box, which inflates the
  // Transformer (and any client-rect consumer) for short text inside a wide
  // wrap width. Override to return the tight glyph rect with align applied.
  // We re-apply on every layer change so newly mounted text nodes get the
  // override too.
  useEffect(() => {
    shapeRefs.current.forEach((node, id) => {
      const layer = doc.layers.find((l) => l.id === id);
      if (!layer || layer.type !== 'text') return;
      const text = node as Konva.Text;
      text.getSelfRect = function getTightSelfRect() {
        const wrap = this.width();
        const w = this.getTextWidth();
        const h = this.height();
        let x = 0;
        const align = this.align();
        if (align === 'center') x = (wrap - w) / 2;
        else if (align === 'right') x = wrap - w;
        return { x, y: 0, width: w, height: h };
      };
    });
    transformerRef.current?.forceUpdate();
    transformerRef.current?.getLayer()?.batchDraw();
  }, [doc.layers]);

  // Konva measures fonts via canvas measureText at first draw and caches the
  // metrics. If our @font-face fonts loaded after the initial mount, all
  // text nodes are stuck on system fallback. Wait until fonts.ready, then
  // force every text node to re-measure by re-applying fontFamily.
  useEffect(() => {
    let cancelled = false;
    void fontsReady().then(() => {
      if (cancelled) return;
      const stage = stageRef.current;
      if (!stage) return;
      stage.find('Text').forEach((t) => {
        const fam = (t as Konva.Text).fontFamily();
        // Toggle to force Konva to invalidate cached metrics.
        (t as Konva.Text).fontFamily(fam + ' ');
        (t as Konva.Text).fontFamily(fam);
      });
      stage.batchDraw();
    });
    return () => {
      cancelled = true;
    };
  }, [doc.layers.length]);

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
              onDragMove: (node) => {
                const x = node.x();
                const y = node.y();
                const widthEst =
                  'width' in layer && typeof layer.width === 'number'
                    ? layer.width
                    : 100;
                const heightEst =
                  'height' in layer && typeof layer.height === 'number'
                    ? layer.height
                    : layer.type === 'text'
                      ? (layer.fontSize ?? 64) * 1.2
                      : 100;
                const snapped = snapDrag({
                  layers: doc.layers,
                  draggedId: layer.id,
                  x,
                  y,
                  canvasW: width,
                  canvasH: height,
                  shape: { width: widthEst, height: heightEst },
                });
                if (snapped.x !== x) node.x(snapped.x);
                if (snapped.y !== y) node.y(snapped.y);
                setGuides(snapped.guides);
              },
              onDragEnd: (x, y) => {
                setIsDragging(false);
                setGuides([]);
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
        <Layer_ listening={false}>
          {/* Hover bounding box (skipped when selected — Transformer takes over).
              getClientRect({ relativeTo: stage }) returns source-space coords
              that match what the KRect will draw inside the same scaled
              stage, so we use it verbatim. Multi-line text + auto-width
              wrap is reflected correctly because the rect comes from the
              actual measured Konva node. */}
          {hoveredId && hoveredId !== selectedId
            ? (() => {
                const layer = doc.layers.find((l) => l.id === hoveredId);
                if (!layer) return null;
                const node = shapeRefs.current.get(hoveredId);
                const stage = stageRef.current;
                const box =
                  node && stage
                    ? hoverRectForNode(node, layer)
                    : boundingBox(layer);
                return (
                  <KRect
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    stroke="#60a5fa"
                    strokeWidth={1 / stageScale}
                    dash={[6 / stageScale, 4 / stageScale]}
                    listening={false}
                  />
                );
              })()
            : null}
          {guides.map((g, i) =>
            g.axis === 'v' ? (
              <KLine
                key={`v-${i}-${g.x}`}
                points={[g.x, 0, g.x, height]}
                stroke="#ec4899"
                strokeWidth={1 / stageScale}
                dash={[6 / stageScale, 4 / stageScale]}
              />
            ) : (
              <KLine
                key={`h-${i}-${g.y}`}
                points={[0, g.y, width, g.y]}
                stroke="#ec4899"
                strokeWidth={1 / stageScale}
                dash={[6 / stageScale, 4 / stageScale]}
              />
            ),
          )}
        </Layer_>
      </Stage>
      {editingLayer && editingLayer.type === 'text'
        ? (() => {
            // Mirror the hover box: use getTextWidth + align so the textarea
            // hugs the visible glyphs instead of the wrap width. Then convert
            // source-space coords to screen pixels for the absolute-positioned
            // <textarea>.
            const node = shapeRefs.current.get(editingLayer.id);
            const tight = node
              ? hoverRectForNode(node, editingLayer)
              : {
                  x: editingLayer.x,
                  y: editingLayer.y,
                  width: editingLayer.width ?? 600,
                  height:
                    (editingLayer.fontSize ?? 64) *
                    (editingLayer.lineHeight ?? 1.1),
                };
            const rect = {
              x: tight.x * stageScale,
              y: tight.y * stageScale,
              width: tight.width * stageScale,
              height: tight.height * stageScale,
            };
            return (
              <TextEditorOverlay
                layer={editingLayer}
                rect={rect}
                stageScale={stageScale}
                onCommit={(text) => {
                  setEditingTextId(null);
                  if (text !== editingLayer.text) {
                    void commitPatch(editingLayer.id, { text });
                  }
                }}
                onCancel={() => setEditingTextId(null)}
              />
            );
          })()
        : null}
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
  onDragMove: (node: Konva.Node) => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (patch: LayerPatch) => void;
  onDoubleClick: () => void;
  registerNode: (node: Konva.Node | null) => void;
};

// For text layers, Konva's getClientRect returns the wrap-width box even if
// the actual text is much shorter. Use getTextWidth() and account for align
// so the hover indicator hugs the visible glyphs. Non-text nodes always have
// width/height equal to what's drawn.
function hoverRectForNode(node: Konva.Node, layer: Layer): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (layer.type === 'text') {
    const textNode = node as Konva.Text;
    const wrapWidth = textNode.width();
    const textWidth = textNode.getTextWidth();
    const tightWidth = Math.min(wrapWidth, textWidth);
    const align = textNode.align();
    let x = textNode.x();
    if (align === 'center') x += (wrapWidth - tightWidth) / 2;
    else if (align === 'right') x += wrapWidth - tightWidth;
    return {
      x,
      y: textNode.y(),
      width: tightWidth,
      height: textNode.height(),
    };
  }
  // Shapes / images: use the declared rect directly so rotation doesn't
  // inflate the hover box.
  if (layer.type === 'shape' && layer.shape === 'circle') {
    return {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
    };
  }
  return {
    x: node.x(),
    y: node.y(),
    width: typeof node.width === 'function' ? node.width() : layer.x,
    height: typeof node.height === 'function' ? node.height() : layer.y,
  };
}

function boundingBox(layer: Layer): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (layer.type === 'text') {
    return {
      x: layer.x,
      y: layer.y,
      width: layer.width ?? 400,
      height: (layer.fontSize ?? 64) * (layer.lineHeight ?? 1.1),
    };
  }
  return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

function renderLayer(layer: Layer, h: LayerHandlers): React.ReactNode {
  if (layer.visible === false) return null;

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
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth ?? 0}
        draggable
        onDragStart={h.onDragStart}
        onDragMove={(e) => h.onDragMove(e.target)}
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
        onDragMove={h.onDragMove}
        onDragEnd={h.onDragEnd}
        onTransformEnd={(node) => onTransformEndFor(node)}
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
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth ?? 0}
        opacity={layer.opacity ?? 1}
        rotation={layer.rotation ?? 0}
        draggable
        onDragStart={h.onDragStart}
        onDragMove={(e) => h.onDragMove(e.target)}
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
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth ?? 0}
      cornerRadius={layer.cornerRadius ?? 0}
      opacity={layer.opacity ?? 1}
      rotation={layer.rotation ?? 0}
      draggable
      onDragStart={h.onDragStart}
        onDragMove={(e) => h.onDragMove(e.target)}
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
  onDragMove: (node: Konva.Node) => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (node: Konva.Node) => void;
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
      draggable
      onDragStart={props.onDragStart}
      onDragMove={(e) => props.onDragMove(e.target)}
      onDragEnd={(e) => props.onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={(e) => props.onTransformEnd(e.target)}
      onClick={props.onSelect}
      onTap={props.onSelect}
      onMouseEnter={props.onHoverIn}
      onMouseLeave={props.onHoverOut}
    />
  );
}
