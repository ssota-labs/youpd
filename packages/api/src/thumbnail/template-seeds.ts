import type { Template } from '@youpd/types';

// 8 thumbnail patterns × 2 aspects. Coordinates are in design pixels for the
// canvas of each aspect (1280×720 or 720×1280). Text fields contain
// {placeholder} markers that applyTemplate substitutes with fillers.
export const TEMPLATE_SEEDS: readonly Template[] = [
  // 1. shock-red-number: 큰 빨간 숫자 + 흰 텍스트
  buildShockRedNumber('16:9'),
  buildShockRedNumber('9:16'),
  // 2. face-quote: 인물 사진 + 따옴표 캡션
  buildFaceQuote('16:9'),
  buildFaceQuote('9:16'),
  // 3. bold-headline: 큰 단일 헤드라인 + accent 워드
  buildBoldHeadline('16:9'),
  buildBoldHeadline('9:16'),
  // 4. warning-yellow: 노란 박스 경고 톤
  buildWarningYellow('16:9'),
  buildWarningYellow('9:16'),
  // 5. before-after: 좌우 분할
  buildBeforeAfter('16:9'),
  buildBeforeAfter('9:16'),
  // 6. listicle-3: "3가지" 리스티클
  buildListicle3('16:9'),
  buildListicle3('9:16'),
  // 7. comment-quote: 댓글 박스 캡처 톤
  buildCommentQuote('16:9'),
  buildCommentQuote('9:16'),
  // 8. interview-strip: 하단 자막 스트립
  buildInterviewStrip('16:9'),
  buildInterviewStrip('9:16'),
];

type Dims = { width: number; height: number };
function dims(aspect: '16:9' | '9:16'): Dims {
  return aspect === '16:9'
    ? { width: 1280, height: 720 }
    : { width: 720, height: 1280 };
}

function buildShockRedNumber(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `shock-red-number-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '쇼크 빨간 숫자',
    canvas: { width, height },
    isPublic: true,
    tags: ['shock', 'number', 'red'],
    document: {
      canvas: { width, height },
      background: { color: '#0B0B0B' },
      layers: [
        {
          type: 'text',
          id: 'number',
          text: '{number}',
          x: width * 0.05,
          y: height * 0.1,
          fontSize: Math.round(height * 0.5),
          fontWeight: 900,
          fill: '#FF2D2D',
          stroke: '#FFFFFF',
          strokeWidth: 4,
        },
        {
          type: 'text',
          id: 'headline',
          text: '{headline}',
          x: width * 0.05,
          y: height * 0.7,
          fontSize: Math.round(height * 0.1),
          fontWeight: 800,
          fill: '#FFFFFF',
          width: width * 0.9,
          align: 'left',
        },
        {
          type: 'text',
          id: 'accent',
          text: '{accent}',
          x: width * 0.05,
          y: height * 0.85,
          fontSize: Math.round(height * 0.07),
          fontWeight: 700,
          fill: '#FFD600',
        },
      ],
    },
  };
}

function buildFaceQuote(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `face-quote-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '인물 + 인용',
    canvas: { width, height },
    isPublic: true,
    tags: ['face', 'quote'],
    document: {
      canvas: { width, height },
      background: { color: '#1A1A1A' },
      layers: [
        {
          type: 'image',
          id: 'face_image',
          src: '{face_image}',
          x: 0,
          y: 0,
          width: aspect === '16:9' ? width * 0.5 : width,
          height: aspect === '16:9' ? height : height * 0.5,
          fit: 'cover',
        },
        {
          type: 'text',
          id: 'headline',
          text: '"{headline}"',
          x: aspect === '16:9' ? width * 0.55 : width * 0.05,
          y: aspect === '16:9' ? height * 0.2 : height * 0.55,
          fontSize: Math.round(height * 0.08),
          fontWeight: 800,
          fill: '#FFFFFF',
          width: aspect === '16:9' ? width * 0.4 : width * 0.9,
          lineHeight: 1.2,
        },
        {
          type: 'text',
          id: 'quote',
          text: '— {quote}',
          x: aspect === '16:9' ? width * 0.55 : width * 0.05,
          y: aspect === '16:9' ? height * 0.75 : height * 0.85,
          fontSize: Math.round(height * 0.04),
          fontWeight: 500,
          fill: '#A0A0A0',
        },
      ],
    },
  };
}

function buildBoldHeadline(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `bold-headline-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '굵은 헤드라인',
    canvas: { width, height },
    isPublic: true,
    tags: ['bold', 'headline'],
    document: {
      canvas: { width, height },
      background: { color: '#101820' },
      layers: [
        {
          type: 'text',
          id: 'headline',
          text: '{headline}',
          x: width * 0.05,
          y: height * 0.25,
          fontSize: Math.round(height * 0.13),
          fontWeight: 900,
          fill: '#FFFFFF',
          width: width * 0.9,
          lineHeight: 1.1,
        },
        {
          type: 'text',
          id: 'accent',
          text: '{accent}',
          x: width * 0.05,
          y: height * 0.7,
          fontSize: Math.round(height * 0.09),
          fontWeight: 900,
          fill: '#FFCD00',
        },
      ],
    },
  };
}

function buildWarningYellow(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `warning-yellow-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '경고 옐로우',
    canvas: { width, height },
    isPublic: true,
    tags: ['warning', 'yellow'],
    document: {
      canvas: { width, height },
      background: { color: '#FFD600' },
      layers: [
        {
          type: 'shape',
          id: 'strip',
          shape: 'rect',
          x: 0,
          y: height * 0.7,
          width,
          height: height * 0.3,
          fill: '#0B0B0B',
        },
        {
          type: 'text',
          id: 'headline',
          text: '{headline}',
          x: width * 0.05,
          y: height * 0.1,
          fontSize: Math.round(height * 0.12),
          fontWeight: 900,
          fill: '#0B0B0B',
          width: width * 0.9,
        },
        {
          type: 'text',
          id: 'accent',
          text: '{accent}',
          x: width * 0.05,
          y: height * 0.78,
          fontSize: Math.round(height * 0.07),
          fontWeight: 800,
          fill: '#FFD600',
        },
      ],
    },
  };
}

function buildBeforeAfter(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `before-after-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: 'Before / After',
    canvas: { width, height },
    isPublic: true,
    tags: ['before', 'after'],
    document: {
      canvas: { width, height },
      background: { color: '#0B0B0B' },
      layers: [
        {
          type: 'shape',
          id: 'left',
          shape: 'rect',
          x: 0,
          y: 0,
          width: aspect === '16:9' ? width * 0.5 : width,
          height: aspect === '16:9' ? height : height * 0.5,
          fill: '#2F4858',
        },
        {
          type: 'shape',
          id: 'right',
          shape: 'rect',
          x: aspect === '16:9' ? width * 0.5 : 0,
          y: aspect === '16:9' ? 0 : height * 0.5,
          width: aspect === '16:9' ? width * 0.5 : width,
          height: aspect === '16:9' ? height : height * 0.5,
          fill: '#86BBD8',
        },
        {
          type: 'text',
          id: 'headline',
          text: '{headline}',
          x: width * 0.05,
          y: height * 0.4,
          fontSize: Math.round(height * 0.1),
          fontWeight: 900,
          fill: '#FFFFFF',
          width: width * 0.9,
          align: 'center',
        },
      ],
    },
  };
}

function buildListicle3(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `listicle-3-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '3가지 리스티클',
    canvas: { width, height },
    isPublic: true,
    tags: ['list', 'number'],
    document: {
      canvas: { width, height },
      background: { color: '#1B1F3B' },
      layers: [
        {
          type: 'text',
          id: 'number',
          text: '{number}가지',
          x: width * 0.05,
          y: height * 0.1,
          fontSize: Math.round(height * 0.18),
          fontWeight: 900,
          fill: '#F7B538',
        },
        {
          type: 'text',
          id: 'headline',
          text: '{headline}',
          x: width * 0.05,
          y: height * 0.5,
          fontSize: Math.round(height * 0.1),
          fontWeight: 800,
          fill: '#FFFFFF',
          width: width * 0.9,
        },
      ],
    },
  };
}

function buildCommentQuote(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `comment-quote-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '댓글 인용',
    canvas: { width, height },
    isPublic: true,
    tags: ['comment', 'quote'],
    document: {
      canvas: { width, height },
      background: { color: '#0B0B0B' },
      layers: [
        {
          type: 'shape',
          id: 'card',
          shape: 'rect',
          x: width * 0.05,
          y: height * 0.2,
          width: width * 0.9,
          height: height * 0.6,
          fill: '#FFFFFF',
          cornerRadius: 16,
        },
        {
          type: 'text',
          id: 'quote',
          text: '"{quote}"',
          x: width * 0.1,
          y: height * 0.28,
          fontSize: Math.round(height * 0.07),
          fontWeight: 700,
          fill: '#0B0B0B',
          width: width * 0.8,
          lineHeight: 1.2,
        },
        {
          type: 'text',
          id: 'headline',
          text: '— {headline}',
          x: width * 0.1,
          y: height * 0.7,
          fontSize: Math.round(height * 0.05),
          fontWeight: 600,
          fill: '#666666',
        },
      ],
    },
  };
}

function buildInterviewStrip(aspect: '16:9' | '9:16'): Template {
  const { width, height } = dims(aspect);
  return {
    code: `interview-strip-${aspect === '16:9' ? '16x9' : '9x16'}`,
    title: '인터뷰 자막 스트립',
    canvas: { width, height },
    isPublic: true,
    tags: ['interview', 'strip'],
    document: {
      canvas: { width, height },
      background: { color: '#000000' },
      layers: [
        {
          type: 'image',
          id: 'face_image',
          src: '{face_image}',
          x: 0,
          y: 0,
          width,
          height: height * 0.78,
          fit: 'cover',
        },
        {
          type: 'shape',
          id: 'strip',
          shape: 'rect',
          x: 0,
          y: height * 0.78,
          width,
          height: height * 0.22,
          fill: '#FFFFFF',
        },
        {
          type: 'text',
          id: 'headline',
          text: '{headline}',
          x: width * 0.05,
          y: height * 0.82,
          fontSize: Math.round(height * 0.08),
          fontWeight: 900,
          fill: '#0B0B0B',
          width: width * 0.9,
        },
      ],
    },
  };
}
