import type { TitleObservedAxes } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';

const HOOK_LABELS: Record<string, string> = {
  curiosity_gap: '호기심 갭',
  contrast: '대비',
  numeric_emphasis: '숫자 강조',
  social_proof: '사회적 증거',
  question: '질문',
  warning: '경고',
  story_hook: '스토리',
  how_to_promise: '방법 약속',
  controversy: '논쟁',
  listicle: '리스트',
};

const SHAPE_LABELS: Record<string, string> = {
  short_label: '단문',
  colon_two_part: '콜론 2단',
  parenthetical: '괄호',
  list_enumeration: '나열',
  conversational: '대화형',
  quote_style: '인용',
};

type TitleAxesChipsProps = {
  axes: TitleObservedAxes;
};

export function TitleAxesChips({ axes }: TitleAxesChipsProps) {
  const chips: string[] = [];
  if (axes.hookType) {
    chips.push(`훅: ${HOOK_LABELS[axes.hookType] ?? axes.hookType}`);
  }
  if (axes.titleShape) {
    chips.push(`형태: ${SHAPE_LABELS[axes.titleShape] ?? axes.titleShape}`);
  }
  if (axes.specificity) {
    chips.push(`구체성: ${axes.specificity}`);
  }
  for (const tone of axes.tones ?? []) {
    chips.push(`톤: ${tone}`);
  }

  if (chips.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">기록된 제목 증거 축이 없습니다.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <Badge key={chip} variant="outline" className="font-normal">
          {chip}
        </Badge>
      ))}
    </div>
  );
}
