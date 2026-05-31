import type { IntroSkeleton } from '@youpd/types';
import { Badge } from '@youpd/ui/components/ui/badge';

const SLOT_LABELS: Record<string, string> = {
  situation: '상황',
  tension: '문제·갈등',
  surprising_claim: '의외의 주장',
  credibility_proof: '신뢰·증거',
  promise: '약속',
  transition: '연결',
};

export function SlotOrderPreview({ skeleton }: { skeleton: IntroSkeleton }) {
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
