'use client';

import React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface WorkspaceSelectorItem {
  id: string;
  name: string;
  iconNode?: React.ReactNode;
}

export interface WorkspaceSelectorProps {
  items: WorkspaceSelectorItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Workspace selector: Popover trigger + list. Presentational only; host provides items with optional iconNode per item.
 * Use in main chat header and (home) pages (e.g. skill new) to avoid domain-specific UI in app.
 */
export function WorkspaceSelector({
  items,
  selectedId,
  onSelect,
}: WorkspaceSelectorProps) {
  const selectedItem = items.find((i) => i.id === selectedId);
  const displayName = selectedItem?.name ?? 'Workspace';
  const displayIcon = selectedItem?.iconNode ?? null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'text-sm font-medium text-foreground'
          )}
          aria-label="Select workspace"
        >
          {displayIcon}
          <span className="truncate max-w-[150px]">{displayName}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <ScrollArea className="max-h-[280px]">
          <div className="flex flex-col gap-0.5 p-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs',
                  'hover:bg-accent hover:text-accent-foreground',
                  selectedId === item.id && 'bg-accent text-accent-foreground'
                )}
              >
                {item.iconNode ?? null}
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
