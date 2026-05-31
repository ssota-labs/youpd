import Link from 'next/link';
import type { ThreadTemplateCard } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@youpd/ui/components/ui/card';

const SLOT_LABELS: Record<string, string> = {
  hook: '훅',
  context: '배경',
  tension: '갈등',
  insight: '통찰',
  proof: '증거',
  tactical_step: '팁',
  cta: 'CTA',
  bridge: '연결',
};

const STRUCTURE_LABELS: Record<string, string> = {
  contrarian_take: '반론',
  teardown: '뜯어보기',
  lesson: '교훈',
  listicle: '리스트',
  case_study: '사례',
  story_arc: '스토리',
  tactical_checklist: '체크리스트',
  myth_bust: '미신 반박',
};

type ThreadTemplateCardProps = {
  template: ThreadTemplateCard;
};

export function ThreadTemplateCardView({ template }: ThreadTemplateCardProps) {
  return (
    <Link href={`/thread-templates/${template.id}`} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {template.primaryCategory ? (
              <Badge variant="secondary">{template.primaryCategory.name}</Badge>
            ) : null}
            {template.structureType ? (
              <Badge variant="outline">
                {STRUCTURE_LABELS[template.structureType] ?? template.structureType}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-base leading-snug">{template.name}</CardTitle>
          <CardDescription className="line-clamp-2">{template.summary}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-2 pt-0 text-xs text-muted-foreground">
          <span>소셜 증거 {template.referenceCount}개</span>
          <div className="flex flex-wrap gap-1">
            {template.slotOrderPreview.slice(0, 4).map((slot) => (
              <Badge key={slot} variant="outline" className="font-normal">
                {SLOT_LABELS[slot] ?? slot}
              </Badge>
            ))}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
