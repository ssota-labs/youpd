'use client';

import { Box } from '@/components/ui/box';
import type { TableOfContentsItem } from './types';

export interface TableOfContentsLinesProps {
  items: TableOfContentsItem[];
  isHovered: boolean;
  getIsActive: (item: TableOfContentsItem) => boolean;
  onItemClick: (item: TableOfContentsItem) => void;
}

export function TableOfContentsLines({
  items,
  isHovered,
  getIsActive,
  onItemClick,
}: TableOfContentsLinesProps) {
  if (items.length === 0) return null;

  return (
    <Box
      className={`relative flex flex-col items-end rounded-md transition-all w-[25px] gap-0.5 p-1 ${isHovered ? 'bg-background/95' : 'bg-transparent'}`}
    >
      {items.map((item) => {
        const isActive = getIsActive(item);
        const widthClass =
          item.widthHint === 'narrow'
            ? 'w-2 group-hover:w-3'
            : item.level === 1
              ? 'w-4 group-hover:w-5'
              : item.level === 2
                ? 'w-3 group-hover:w-4'
                : item.level === 3
                  ? 'w-2 group-hover:w-3'
                  : 'w-4 group-hover:w-5';
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="group relative flex items-center justify-end cursor-pointer py-0.5 w-full"
            aria-label={`Go to ${item.label}`}
          >
            <Box
              className={`h-px transition-all ${widthClass} ${isActive ? 'bg-primary' : 'bg-border/60 group-hover:bg-foreground/60'}`}
            />
          </button>
        );
      })}
    </Box>
  );
}
