import type { ThumbnailSkeleton } from '@youpd/types';
import { cn } from '@youpd/ui/lib/utils';

const ROLE_COLORS: Record<string, string> = {
  background: 'bg-muted',
  subject: 'bg-primary/30',
  text_primary: 'bg-amber-500/40',
  text_secondary: 'bg-amber-500/20',
  badge: 'bg-emerald-500/40',
  chart: 'bg-sky-500/40',
  logo: 'bg-violet-500/40',
};

type SkeletonPreviewProps = {
  skeleton: ThumbnailSkeleton;
  className?: string;
};

export function SkeletonPreview({ skeleton, className }: SkeletonPreviewProps) {
  const aspectClass = skeleton.aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg border border-border bg-card',
        aspectClass,
        className,
      )}
    >
      {skeleton.regions.map((region) => (
        <div
          key={region.id}
          className={cn(
            'absolute rounded-sm border border-border/60',
            ROLE_COLORS[region.role] ?? 'bg-muted-foreground/20',
          )}
          style={{
            left: `${region.box.x * 100}%`,
            top: `${region.box.y * 100}%`,
            width: `${region.box.w * 100}%`,
            height: `${region.box.h * 100}%`,
          }}
          title={region.bindsSlot ? `slot: ${region.bindsSlot}` : region.role}
        />
      ))}
    </div>
  );
}
