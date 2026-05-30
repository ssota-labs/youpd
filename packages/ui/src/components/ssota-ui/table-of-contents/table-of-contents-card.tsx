'use client';

import { Box } from '@/components/ui/box';
import type { TableOfContentsItem } from './types';

export interface TableOfContentsCardProps {
  items: TableOfContentsItem[];
  getIsActive: (item: TableOfContentsItem) => boolean;
  onItemClick: (item: TableOfContentsItem) => void;
  /** Max dimensions. Default: max-h-[400px] min-w-[200px] max-w-[300px] for summary style */
  className?: string;
}

export function TableOfContentsCard({
  items,
  getIsActive,
  onItemClick,
  className = 'max-h-[400px] min-w-[200px] max-w-[300px]',
}: TableOfContentsCardProps) {
  if (items.length === 0) return null;

  return (
    <Box
      className={`absolute right-0 top-1/2 -translate-y-1/2 bg-background border border-border rounded-md shadow-lg p-3 overflow-y-auto ${className}`}
    >
      <Box className="space-y-1">
        {items.map((item) => {
          const isActive = getIsActive(item);
          const indentClass =
            item.level === 1 ? 'pl-0' : item.level === 2 ? 'pl-4' : item.level === 3 ? 'pl-8' : 'pl-0';
          return (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left cursor-pointer hover:bg-muted/50 py-1.5 rounded transition-colors text-xs whitespace-nowrap ${indentClass} ${isActive ? 'text-primary font-medium bg-muted/30' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => onItemClick(item)}
            >
              {item.label}
            </button>
          );
        })}
      </Box>
    </Box>
  );
}
