import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface StatusDotProps {
  /** When true, dot is green (active/on); when false, red (inactive/off). */
  active: boolean;
  /** Tooltip label (e.g. "Public", "Active"). Shown as "Label: On" or "Label: Off". */
  label: string;
}

/**
 * Small status indicator dot with tooltip. Use for Public/Active or similar boolean states.
 * Green (--chart-4) when active, red (--destructive) when inactive.
 */
export function StatusDot({ active, label }: StatusDotProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-block size-2 shrink-0 rounded-full"
          aria-hidden
          style={{
            backgroundColor: active ? 'var(--chart-4)' : 'var(--destructive)',
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}: {active ? 'On' : 'Off'}
      </TooltipContent>
    </Tooltip>
  );
}
