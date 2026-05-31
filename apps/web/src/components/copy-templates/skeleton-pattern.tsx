import type { CopySkeleton } from '@youpd/types';

type SkeletonPatternProps = {
  skeleton: CopySkeleton;
};

export function SkeletonPattern({ skeleton }: SkeletonPatternProps) {
  const parts = skeleton.pattern.split(/(\{\{[a-zA-Z][a-zA-Z0-9_]*\}\})/g);

  return (
    <p className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed">
      {parts.map((part, index) => {
        if (/^\{\{[a-zA-Z][a-zA-Z0-9_]*\}\}$/.test(part)) {
          return (
            <span
              key={`${part}-${index}`}
              className="rounded bg-primary/15 px-1 text-primary"
            >
              {part}
            </span>
          );
        }
        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </p>
  );
}
