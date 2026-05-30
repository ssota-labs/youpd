import Link from 'next/link';
import type { ThumbnailTemplateCard } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@youpd/ui/components/ui/card';

type TemplateCardProps = {
  template: ThumbnailTemplateCard;
};

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link href={`/thumbnail-templates/${template.id}`} className="block h-full">
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
        <CardContent className="flex-1">
          {template.previewImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={template.previewImageUrl}
              alt=""
              className="aspect-video w-full rounded-md border border-border object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
              스켈레톤 미리보기
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 pt-0 text-xs text-muted-foreground">
          <span>레퍼런스 {template.referenceCount}개</span>
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
