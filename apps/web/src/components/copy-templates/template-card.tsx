import Link from 'next/link';
import type { CopyTemplateCard } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@youpd/ui/components/ui/card';

const HOOK_LABELS: Record<string, string> = {
  curiosity_gap: '호기심 갭',
  contrast: '대비',
  numeric_emphasis: '숫자',
  social_proof: '사회적 증거',
  question: '질문',
  how_to_promise: '방법 약속',
};

type CopyTemplateCardProps = {
  template: CopyTemplateCard;
};

export function CopyTemplateCardView({ template }: CopyTemplateCardProps) {
  return (
    <Link href={`/copy-templates/${template.id}`} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {template.primaryCategory ? (
              <Badge variant="secondary">{template.primaryCategory.name}</Badge>
            ) : null}
            {template.primaryHookType ? (
              <Badge variant="outline">
                {HOOK_LABELS[template.primaryHookType] ?? template.primaryHookType}
              </Badge>
            ) : null}
            {template.topPerformanceGrade ? (
              <Badge variant="outline">{template.topPerformanceGrade}</Badge>
            ) : null}
          </div>
          <CardTitle className="text-base leading-snug">{template.name}</CardTitle>
          <CardDescription className="line-clamp-2">{template.summary}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2 pt-0 text-xs text-muted-foreground">
          <span>제목 증거 {template.referenceCount}개</span>
          <span>썸네일 페어링 {template.pairedThumbnailCount}개</span>
          {template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag.code} variant="outline" className="font-normal">
              {tag.name}
            </Badge>
          ))}
        </CardFooter>
      </Card>
    </Link>
  );
}
