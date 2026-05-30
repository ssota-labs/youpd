'use client';

import { InfoIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Box } from '../ui/box';

export function InfoTooltipIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-help text-muted-foreground hover:text-foreground shrink-0"
          aria-label={tooltip}
        >
          <InfoIcon className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[180px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

interface LabelWithInfoProps {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
  /** When true, render as readonly text (p) instead of Label */
  readonly?: boolean;
}

export function LabelWithInfo({ htmlFor, children, tooltip, readonly }: LabelWithInfoProps) {
  return (
    <Box className="flex items-center gap-1.5">
      {readonly ? (
        <p className="text-muted-foreground text-sm leading-4 font-medium">{children}</p>
      ) : (
        <Label htmlFor={htmlFor}>{children}</Label>
      )}
      <InfoTooltipIcon tooltip={tooltip} />
    </Box>
  );
}
