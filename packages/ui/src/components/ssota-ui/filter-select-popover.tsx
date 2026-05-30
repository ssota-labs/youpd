'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface FilterSelectOption<T = string | null> {
  value: T;
  label: string;
}

export interface FilterSelectPopoverProps<T = string | null> {
  /** 현재 선택된 값 */
  value: T;
  /** 옵션 목록 */
  options: FilterSelectOption<T>[];
  /** 선택 변경 시 호출 */
  onValueChange: (value: T) => void;
  /** 트리거 placeholder */
  placeholder?: string;
  /** aria-label */
  ariaLabel?: string;
  /** 트리거 추가 className */
  triggerClassName?: string;
  /** 콘텐츠 추가 className */
  contentClassName?: string;
  /** 값 비교 함수 (복잡한 타입용) */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * 필터용 콤팩트 Select + Popover 컴포넌트
 *
 * - 작은 트리거 버튼 + Popover 리스트
 * - Drive 필터 등 간단한 선택 UI에 사용
 */
export function FilterSelectPopover<T = string | null>({
  value,
  options,
  onValueChange,
  placeholder = 'Select',
  ariaLabel = 'Select filter',
  triggerClassName,
  contentClassName,
  isEqual,
}: FilterSelectPopoverProps<T>): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(() => {
    const opt = options.find(o =>
      isEqual ? isEqual(o.value, value) : o.value === value
    );
    return opt?.label ?? placeholder;
  }, [options, value, placeholder, isEqual]);

  const handleSelect = React.useCallback(
    (optionValue: T) => {
      onValueChange(optionValue);
      setOpen(false);
    },
    [onValueChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            'h-7 gap-1.5 px-2.5 py-0 text-sm font-normal',
            triggerClassName
          )}
        >
          {selectedLabel}
          <ChevronDownIcon
            className="size-3.5 shrink-0 opacity-70"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-auto min-w-[--radix-popover-trigger-width] p-1', contentClassName)}
      >
        <ul role="listbox" className="flex flex-col">
          {options.map(opt => {
            const selected = isEqual
              ? isEqual(opt.value, value)
              : opt.value === value;
            return (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(opt.value);
                  }
                }}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'cursor-pointer rounded px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
