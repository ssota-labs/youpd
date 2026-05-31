import Link from 'next/link';
import type { IntroTemplateCard } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@youpd/ui/components/ui/card';

const SLOT_LABELS: Record<string, string> = {
  situation: '상황',
  tension: '갈등',
  surprising_claim: '주장',
  credibility_proof: '신뢰',
  promise: '약속',
  transition: '연결',
};

type IntroTemplateCardProps = {
  template: IntroTemplateCard;
};

export function IntroTemplateCardView({ template }: IntroTemplateCardProps) {
  return (
    <Link href={`/intro-templates/${template.id}`} className="block h-full">
      <Card className="flex h-full flex-col transition-colors hover:border-primary/40">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {template.primaryCategory ? (
              <Badge variant="secondary">{template.primaryCategory.name}</Badge>
            ) : null}
            {template.topPerformanceGrade ? (
              <Badge variant="outline">{template.topPerformanceGrade}</Badge>
            ) : null}
          </div>
          <CardTitle className="text-base leading-snug">{template.name}</CardTitle>
          <CardDescription className="line-clamp-2">{template.summary}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-start gap-2 pt-0 text-xs text-muted-foreground">
          <span>인트로 증거 {template.referenceCount}개</span>
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
