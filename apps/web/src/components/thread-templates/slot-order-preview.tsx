import type { ThreadSkeleton } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';

const SLOT_LABELS: Record<string, string> = {
  hook: '훅',
  context: '배경',
  tension: '갈등·문제',
  insight: '통찰',
  proof: '증거',
  tactical_step: '실행 팁',
  cta: '행동 유도',
  bridge: '연결',
};

export function ThreadSlotOrderPreview({ skeleton }: { skeleton: ThreadSkeleton }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {skeleton.slotOrder.map((slot, index) => (
        <li key={slot}>
          <Badge variant="secondary">
            {index + 1}. {SLOT_LABELS[slot] ?? slot}
          </Badge>
        </li>
      ))}
    </ol>
  );
}
