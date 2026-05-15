'use client';

import { useEffect, useRef, useState } from 'react';
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
import {
  snapDrag,
  type Composition,
  type GuideLine,
  type Layer,
  type LayerPatch,
} from '@youpd/composer-core';
import {
  useComposerActions,
  useComposerFontManifestUrl,
  useComposerStore,
  useComposerStoreApi,
} from '../store';
import { fontsReady, useFontManifest } from '../fonts';
import { TextEditorOverlay } from '../overlay/text-editor-overlay';

export type ComposerCanvasProps = {
  documentId: string;
  initialVersion: number;
  initialDocument: Composition;
  // Optional Supabase Realtime credentials. When present the canvas
  // subscribes to a `composer:{documentId}` broadcast channel and refetches
  // authoritative state on every patched event.
  realtime?: {
    url: string;
    anonKey: string;
    channelPrefix?: string;
  };
  // Reserved horizontal pixels for any sibling chrome (panels, etc.) so the
  // canvas can fit within the host layout.
  reservedHorizontalPx?: number;
};

export function ComposerCanvas(props: ComposerCanvasProps) {
  const actions = useComposerActions();
  const storeApi = useComposerStoreApi();
  const init = useComposerStore((s) => s.init);
  const doc = useComposerStore((s) => s.doc);
  const selectedId = useComposerStore((s) => s.selectedId);
  const hoveredId = useComposerStore((s) => s.hoveredId);
  const setSelected = useComposerStore((s) => s.setSelected);
  const setHovered = useComposerStore((s) => s.setHovered);
  const setIsDragging = useComposerStore((s) => s.setIsDragging);
  const applyLocalPatch = useComposerStore((s) => s.applyLocalPatch);
  const replaceDoc = useComposerStore((s) => s.replaceDoc);
  const setStatus = useComposerStore((s) => s.setStatus);

  // Subscribing here keeps the font manifest fetch + injection mounted; the
  // returned families aren't used directly but the side effect is what we
  // care about.
  useFontManifest();

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef(new Map<string, Konva.Node>());
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [guides, setGuides] = useState<GuideLine[]>([]);

  const { width, height } = doc.canvas;

  useEffect(() => {
    init({
      documentId: props.documentId,
      doc: props.initialDocument,
      version: props.initialVersion,
    });
  }, [init, props.documentId, props.initialDocument, props.initialVersion]);

  useEffect(() => {
    const reserved = props.reservedHorizontalPx ?? 64;
    const compute = () => {
      if (typeof window === 'undefined') return;
      const available = Math.max(320, window.innerWidth - reserved);
      const maxW = Math.min(available, 1100);
      setStageScale(Math.min(1, maxW / width));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [width, props.reservedHorizontalPx]);

  useEffect(() => {
    if (!props.realtime?.url || !props.realtime?.anonKey) return;
    const supabase = createBrowserClient(
      props.realtime.url,
      props.realtime.anonKey,
    );
    const prefix = props.realtime.channelPrefix ?? 'thumbnail';
    const channel = supabase.channel(`${prefix}:${props.documentId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'patched' }, async () => {
      if (storeApi.getState().isDragging) return;
      const data = await actions.refetchState(props.documentId);
      if (!data) return;
      replaceDoc(data.document, data.version);
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    props.documentId,
    props.realtime?.url,
    props.realtime?.anonKey,
    props.realtime?.channelPrefix,
    actions,
    replaceDoc,
    storeApi,
  ]);

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

  // Tight getSelfRect for Konva.Text so Transformer + getClientRect track the
  // actual glyph rect rather than the wrap-width box. Also override
  // _getTextWidth to use a fresh canvas — Konva's cached dummy 2D context
  // sometimes loses non-Latin glyph coverage for newly-loaded web fonts
  // (returns Latin width only), and a fresh context picks up the full
  // measurement reliably.
  useEffect(() => {
    shapeRefs.current.forEach((node, id) => {
      const layer = doc.layers.find((l) => l.id === id);
      if (!layer || layer.type !== 'text') return;
      const text = node as Konva.Text & {
        _getTextWidth?: (s: string) => number;
        _setTextData?: () => void;
      };
      text._getTextWidth = function freshGetTextWidth(s: string) {
        const cvs = document.createElement('canvas');
        const ctx = cvs.getContext('2d');
        if (!ctx) return 0;
        ctx.font = `${this.fontStyle()} ${this.fontSize()}px "${this.fontFamily()}"`;
        const w = ctx.measureText(s).width;
        const ls = this.letterSpacing();
        return w + (s.length ? ls * (s.length - 1) : 0);
      };
      // Trigger a re-measure with the override active so cached textWidth
      // reflects the correct value on first mount.
      text._setTextData?.();
      text.getSelfRect = function getTightSelfRect() {
        const wrap = this.width();
        const sw = this.strokeWidth() ?? 0;
        const align = this.align();
        const advance = this.getTextWidth();
        const emHeight = this.height();

        // Width uses advance (= getTextWidth) so we never clip the glyph's
        // right side-bearing. Height uses the canvas TextMetrics ink box
        // when available so digits / uppercase glyphs don't leave a huge
        // empty band below (em-box descender area).
        let inkTop = 0;
        let inkHeight = emHeight;
        const cvs = document.createElement('canvas');
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.font = `${this.fontStyle()} ${this.fontSize()}px "${this.fontFamily()}"`;
          ctx.textBaseline = 'alphabetic';
          const m = ctx.measureText(this.text());
          if (typeof m.actualBoundingBoxAscent === 'number') {
            const ascent = m.actualBoundingBoxAscent;
            const descent = m.actualBoundingBoxDescent;
            // Konva draws with textBaseline='top'; the alphabetic baseline
            // sits at the font's "ascent" below the top edge. Approximate
            // the font ascent as fontSize * 0.8 to position the ink box.
            const fontAscent = this.fontSize() * 0.8;
            inkTop = Math.max(0, fontAscent - ascent);
            inkHeight = ascent + descent;
          }
        }

        let xOffset = 0;
        if (align === 'center') xOffset = (wrap - advance) / 2;
        else if (align === 'right') xOffset = wrap - advance;

        return {
          x: xOffset - sw,
          y: inkTop - sw,
          width: advance + sw * 2,
          height: inkHeight + sw * 2,
        };
      };
    });
    transformerRef.current?.forceUpdate();
    transformerRef.current?.getLayer()?.batchDraw();
  }, [doc.layers]);

  // Force Konva to re-measure once @font-face fonts finish loading. Without
  // this, KText nodes mounted while a custom family (e.g. Black Han Sans)
  // is still loading get sized against the system fallback (much narrower),
  // and the bounding box is too small until the user touches a property.
  //
  // Subtlety: even after document.fonts.ready resolves, the OffscreenCanvas
  // 2D context Konva uses for measureText sometimes still falls back. We
  // call document.fonts.load with the *exact* font spec Konva uses for each
  // text node (matching fontStyle + size + family), wait a paint frame, then
  // invoke Konva.Text._setTextData() — its internal re-measurement entry —
  // to refresh the cached textWidth. The getSelfRect override picks up the
  // new width so Transformer + hover rect resize automatically.
  const fontManifestUrl = useComposerFontManifestUrl();
  useEffect(() => {
    let cancelled = false;
    const fontSpec = (n: Konva.Text): string =>
      `${n.fontStyle()} ${n.fontSize()}px "${n.fontFamily()}"`;
    const remeasureAndDraw = () => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.find('Text').forEach((t) => {
        const node = t as Konva.Text & { _setTextData?: () => void };
        node._setTextData?.();
      });
      transformerRef.current?.forceUpdate();
      stage.batchDraw();
    };
    void fontsReady(fontManifestUrl).then(async () => {
      if (cancelled) return;
      const stage = stageRef.current;
      if (stage) {
        const textNodes = stage.find('Text') as unknown as Konva.Text[];
        if ('fonts' in document) {
          const docFonts = (document as Document & { fonts: FontFaceSet })
            .fonts;
          await Promise.all(
            textNodes.map((t) =>
              docFonts.load(fontSpec(t)).catch(() => undefined),
            ),
          );
        }
        // The DocumentFontFaceSet promise can resolve before the canvas
        // implementation has actually picked up the new font face. Painting
        // the same string into a hidden DOM element forces the browser's
        // rendering pipeline to fully load the glyphs so the next canvas
        // measureText returns the loaded-font metrics.
        const probe = document.createElement('div');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText =
          'position:fixed; top:-9999px; left:-9999px; visibility:hidden; white-space:nowrap;';
        for (const t of textNodes) {
          const s = document.createElement('span');
          s.style.font = fontSpec(t);
          s.textContent = t.text();
          probe.appendChild(s);
        }
        document.body.appendChild(probe);
        // Force layout + a paint frame so the font is actually rasterized
        // somewhere before we ask Konva's canvas to measure.
        void probe.offsetWidth;
        await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        document.body.removeChild(probe);
      }
      if (cancelled) return;
      remeasureAndDraw();
      requestAnimationFrame(() => {
        if (cancelled) return;
        remeasureAndDraw();
        requestAnimationFrame(() => {
          if (cancelled) return;
          remeasureAndDraw();
        });
      });
    });
    return () => {
      cancelled = true;
    };
    // Only depend on the manifest URL: re-running on every doc.layers change
    // would cancel the in-flight font load before remeasure completes (each
    // edit replaces the layers array reference). New layers added after
    // fonts are loaded already see the correct metrics at mount time, so a
    // single mount-load-remeasure cycle is enough.
  }, [fontManifestUrl]);

  const handleStageMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (e.target === e.target.getStage()) setSelected(null);
  };

  const commitPatch = async (layerId: string, patch: LayerPatch) => {
    applyLocalPatch(layerId, patch);
    setStatus('pending');
    const baseline = storeApi.getState().version;
    const res = await actions.setLayer({
      documentId: props.documentId,
      layerId,
      patch,
      expectedVersion: baseline,
    });
    if ('conflict' in res) {
      setStatus('conflict');
      const state = await actions.refetchState(props.documentId);
      if (state) {
        replaceDoc(state.document, state.version);
        setStatus('idle');
      }
      return;
    }
    storeApi.setState({ version: res.version });
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
          {hoveredId && hoveredId !== selectedId
            ? (() => {
                const layer = doc.layers.find((l) => l.id === hoveredId);
                if (!layer) return null;
                const node = shapeRefs.current.get(hoveredId);
                const box =
                  node && stageRef.current
                    ? hoverRectForNode(node, layer)
                    : declaredBox(layer);
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

function hoverRectForNode(
  node: Konva.Node,
  layer: Layer,
): { x: number; y: number; width: number; height: number } {
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
  if (layer.type === 'shape' && layer.shape === 'circle') {
    return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
  }
  return {
    x: node.x(),
    y: node.y(),
    width: typeof node.width === 'function' ? node.width() : layer.x,
    height: typeof node.height === 'function' ? node.height() : layer.y,
  };
}

function declaredBox(layer: Layer): {
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
