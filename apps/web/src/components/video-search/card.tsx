import Image from 'next/image';
import Link from 'next/link';
import { RiExternalLinkLine } from '@remixicon/react';
import type { HotVideoRow } from '@youpd/api/youtube';
import { Avatar, AvatarFallback, AvatarImage } from '@youpd/ui/components/ui/avatar';
import { Badge } from '@youpd/ui/components/ui/badge';
import { Button } from '@youpd/ui/components/ui/button';
import { Separator } from '@youpd/ui/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  formatCount,
  formatDateLabel,
  formatDuration,
  formatScore,
  gradeBadgeVariant,
  gradeLabelKo,
} from '@/lib/video-search/format';
import { SaveReferenceButton } from '@/components/reference-folders/save-reference-button';

type VideoCardProps = {
  row: HotVideoRow;
  categoryLabel?: string;
  harvestId?: string;
};

function ScoreColumn({
  label,
  grade,
  value,
}: {
  label: string;
  grade: string;
  value: string;
}) {
  const emphasized = grade === 'Good' || grade === 'Great';

  return (
    <div
      className="group/score flex min-w-0 flex-1 flex-col items-center gap-1 border-r border-border px-2 py-2 text-center last:border-r-0"
      title={`${label} 점수 ${value}`}
    >
      <span className="text-[0.625rem] text-muted-foreground">{label}</span>
      <Badge
        variant={gradeBadgeVariant(grade)}
        className={cn(emphasized && 'h-6 px-2.5 text-xs font-semibold')}
      >
        {gradeLabelKo(grade)}
      </Badge>
      <span className="truncate text-[0.625rem] text-muted-foreground opacity-0 transition-opacity group-hover/score:opacity-100">
        {value}
      </span>
    </div>
  );
}

export function VideoCard({ row, categoryLabel, harvestId }: VideoCardProps) {
  const video = row.video;
  if (!video) return null;

  const channel = row.channel;
  const channelTitle = channel?.title ?? video.channelTitle;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="relative aspect-video bg-muted">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No thumbnail
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
            >
              {video.title}
            </Link>
            <p className="mt-1 text-[0.625rem] text-muted-foreground">
              조회 {formatCount(video.metrics.views)}
              <span className="mx-1">·</span>
              좋아요 {formatCount(video.metrics.likes)}
              <span className="mx-1">·</span>
              댓글 {formatCount(video.metrics.comments)}
              <span className="mx-1">·</span>
              길이 {formatDuration(video.durationSec)}
              <span className="mx-1">·</span>
              {formatDateLabel(row.hotDate)}
            </p>
            <p className="mt-1 text-[0.625rem] text-muted-foreground">
              {row.source}
              {categoryLabel ? (
                <>
                  <span className="mx-1">·</span>
                  {categoryLabel}
                </>
              ) : null}
            </p>
          </div>
          <Button variant="outline" size="icon-sm" asChild>
            <Link href={video.url} target="_blank" rel="noopener noreferrer" aria-label="YouTube에서 열기">
              <RiExternalLinkLine />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            {channel?.thumbnailUrl ? (
              <AvatarImage src={channel.thumbnailUrl} alt={channelTitle} />
            ) : null}
            <AvatarFallback>{channelTitle.charAt(0).toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{channelTitle}</p>
            <p className="text-[0.625rem] text-muted-foreground">
              구독 {formatCount(channel?.subscriberCount ?? null)}
              <span className="mx-1">·</span>
              영상 {formatCount(channel?.videoCount ?? null)}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex overflow-hidden rounded-md border border-border bg-muted/30">
          <ScoreColumn
            label="기여도"
            grade={video.score.contribution.grade}
            value={formatScore(video.score.contribution.ratio)}
          />
          <ScoreColumn
            label="성과도"
            grade={video.score.performance.grade}
            value={formatScore(video.score.performance.ratio)}
          />
          <ScoreColumn
            label="길이점수"
            grade={video.score.adjustedScore != null ? 'Normal' : 'Unknown'}
            value={formatScore(video.score.adjustedScore)}
          />
        </div>

        {harvestId ? (
          <SaveReferenceButton
            harvestId={harvestId}
            videoId={video.id}
            videoTitle={video.title}
          />
        ) : null}
      </div>
    </article>
  );
}

export function VideoListRow({
  row,
  categoryLabel,
  harvestId,
}: {
  row: HotVideoRow;
  categoryLabel?: string;
  harvestId?: string;
}) {
  const video = row.video;
  if (!video) return null;

  const channel = row.channel;
  const channelTitle = channel?.title ?? video.channelTitle;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md bg-muted lg:h-16 lg:w-28">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-1 text-sm font-medium hover:text-primary"
            >
              {video.title}
            </Link>
            <p className="text-[0.625rem] text-muted-foreground">
              {row.hotDate}
              <span className="mx-1">·</span>
              {row.source}
              <span className="mx-1">·</span>
              조회 {formatCount(video.metrics.views)}
              <span className="mx-1">·</span>
              좋아요 {formatCount(video.metrics.likes)}
              <span className="mx-1">·</span>
              댓글 {formatCount(video.metrics.comments)}
              <span className="mx-1">·</span>
              길이 {formatDuration(video.durationSec)}
              {categoryLabel ? (
                <>
                  <span className="mx-1">·</span>
                  {categoryLabel}
                </>
              ) : null}
            </p>
          </div>
          <Button variant="outline" size="icon-sm" asChild>
            <Link href={video.url} target="_blank" rel="noopener noreferrer" aria-label="YouTube에서 열기">
              <RiExternalLinkLine />
            </Link>
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Avatar className="size-8">
            {channel?.thumbnailUrl ? (
              <AvatarImage src={channel.thumbnailUrl} alt={channelTitle} />
            ) : null}
            <AvatarFallback>{channelTitle.charAt(0).toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs">{channelTitle}</span>
          <Badge variant="outline">구독 {formatCount(channel?.subscriberCount ?? null)}</Badge>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1 lg:max-w-[280px] lg:justify-end">
        <Badge
          variant={gradeBadgeVariant(video.score.contribution.grade)}
          className={cn(
            (video.score.contribution.grade === 'Good' ||
              video.score.contribution.grade === 'Great') &&
              'h-6 px-2.5 text-xs font-semibold',
          )}
          title={`기여도 점수 ${formatScore(video.score.contribution.ratio)}`}
        >
          기여 {gradeLabelKo(video.score.contribution.grade)}
        </Badge>
        <Badge
          variant={gradeBadgeVariant(video.score.performance.grade)}
          className={cn(
            (video.score.performance.grade === 'Good' ||
              video.score.performance.grade === 'Great') &&
              'h-6 px-2.5 text-xs font-semibold',
          )}
          title={`성과도 점수 ${formatScore(video.score.performance.ratio)}`}
        >
          성과 {gradeLabelKo(video.score.performance.grade)}
        </Badge>
        <Badge variant="secondary">점수 {formatScore(video.score.adjustedScore)}</Badge>
      </div>

      {harvestId ? (
        <SaveReferenceButton
          harvestId={harvestId}
          videoId={video.id}
          videoTitle={video.title}
        />
      ) : null}
    </article>
  );
}
