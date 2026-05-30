'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { Box } from '../ui/box';
import { ToolbarIconButton } from './toolbar-icon-button';

/**
 * Option item type for ToolbarOptionPopover
 */
export interface ToolbarOption<T = unknown> {
  value: T;
  label: string;
  icon: React.ReactNode;
}

export interface ToolbarOptionPopoverProps<T = unknown> {
  /**
   * Current selected value
   */
  currentValue: T;

  /**
   * List of available options
   */
  options: ToolbarOption<T>[];

  /**
   * Callback when option is selected
   */
  onValueChange: (value: T) => void;

  /**
   * Tooltip text for the trigger button
   */
  tooltip: string;

  /**
   * Tooltip side for the trigger button
   * @default "top"
   */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Tooltip offset from the trigger button
   * @default 5
   */
  tooltipOffset?: number;

  /**
   * Popover content side
   * @default "top"
   */
  popoverSide?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Popover content alignment
   * @default "center"
   */
  popoverAlign?: 'start' | 'center' | 'end';

  /**
   * Zoom level for scaling the popover content
   * Used for canvas/flow environments where zoom affects UI
   * @default 1
   */
  zoom?: number;

  /**
   * Additional className for the trigger button
   * Will be merged with default styles using `cn()` utility
   */
  triggerClassName?: string;

  /**
   * Additional className for the popover content
   * Will be merged with default styles using `cn()` utility
   */
  contentClassName?: string;

  /**
   * Icon className for trigger button icon
   * Will be merged with default styles using `cn()` utility
   * @default "size-5"
   */
  triggerIconClassName?: string;

  /**
   * Icon className for option button icons
   * Will be merged with default styles using `cn()` utility
   * @default "size-8"
   */
  optionIconClassName?: string;

  /**
   * Additional className for option buttons
   * Will be merged with default styles using `cn()` utility
   */
  optionButtonClassName?: string;

  /**
   * Gap between option buttons
   * Will be merged with default gap using `cn()` utility
   * @default "gap-1"
   */
  optionGap?: string;

  /**
   * Comparator function to check if values are equal
   * Useful for complex value types
   */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * ToolbarOptionPopover Component
 *
 * Presentational component for toolbar option selection with popover UI
 * - No Context dependencies
 * - Renders based on Props only
 * - Can be tested independently in Storybook
 * - Follows Container/Presentational pattern
 *
 * @example
 * ```tsx
 * const EDGE_SHAPES = [
 *   { value: 'default', label: 'Curve', icon: <Workflow /> },
 *   { value: 'straight', label: 'Straight', icon: <Minus /> },
 * ];
 *
 * <ToolbarOptionPopover
 *   currentValue={currentShape}
 *   options={EDGE_SHAPES}
 *   onValueChange={handleShapeChange}
 *   tooltip="Edge Type"
 *   zoom={zoom}
 * />
 * ```
 */
// Default className constants
const DEFAULT_TRIGGER_CLASS_NAME = 'h-7 w-7 p-0 transition-colors';
const DEFAULT_CONTENT_CLASS_NAME =
  'p-1.5 w-fit will-change-transform rounded-2xl';
const DEFAULT_TRIGGER_ICON_CLASS_NAME = 'size-4';
const DEFAULT_OPTION_ICON_CLASS_NAME = 'size-7';
const DEFAULT_OPTION_BUTTON_CLASS_NAME =
  'rounded-xl size-14 transition-colors will-change-transform px-0';
const DEFAULT_OPTION_GAP = 'gap-0.5';

export function ToolbarOptionPopover<T = unknown>({
  currentValue,
  options,
  onValueChange,
  tooltip,
  tooltipSide = 'top',
  tooltipOffset = 5,
  popoverSide = 'top',
  popoverAlign = 'center',
  zoom = 1,
  triggerClassName,
  contentClassName,
  triggerIconClassName,
  optionIconClassName,
  optionButtonClassName,
  optionGap,
  isEqual,
}: ToolbarOptionPopoverProps<T>): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  // Manage selected value internally for immediate UI feedback
  const [selectedValue, setSelectedValue] = useState<T>(currentValue);

  // Sync internal state when external currentValue changes
  useEffect(() => {
    setSelectedValue(currentValue);
  }, [currentValue]);

  // Find current option and icon - use selectedValue instead of currentValue
  const currentIcon = useMemo(() => {
    const currentOption = options.find(option =>
      isEqual
        ? isEqual(option.value, selectedValue)
        : option.value === selectedValue
    );
    return currentOption?.icon || options[0]?.icon;
  }, [options, selectedValue, isEqual]);

  // Check if option is selected - use selectedValue instead of currentValue
  const isSelected = useCallback(
    (optionValue: T): boolean => {
      return isEqual
        ? isEqual(optionValue, selectedValue)
        : optionValue === selectedValue;
    },
    [selectedValue, isEqual]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ToolbarIconButton
          icon={currentIcon}
          iconClassName={cn(
            DEFAULT_TRIGGER_ICON_CLASS_NAME,
            triggerIconClassName
          )}
          tooltip={tooltip}
          tooltipSide={tooltipSide}
          tooltipOffset={tooltipOffset}
          tooltipDisabled={isOpen}
          isActive={isOpen}
          className={cn(DEFAULT_TRIGGER_CLASS_NAME, triggerClassName)}
          onMouseDown={e => e.stopPropagation()}
        />
      </PopoverTrigger>

      <PopoverContent
        className={cn(DEFAULT_CONTENT_CLASS_NAME, contentClassName)}
        side={popoverSide}
        align={popoverAlign}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onOpenAutoFocus={e => e.preventDefault()}
        style={{
          transform: `scale(${zoom / 2})`,
          transformOrigin: 'var(--radix-popover-content-transform-origin)',
        }}
      >
        <Box className={cn('flex', DEFAULT_OPTION_GAP, optionGap)}>
          {options.map((option, index) => (
            <ToolbarIconButton
              key={
                typeof option.value === 'string' ||
                  typeof option.value === 'number'
                  ? String(option.value)
                  : index
              }
              icon={option.icon}
              iconClassName={cn(
                DEFAULT_OPTION_ICON_CLASS_NAME,
                optionIconClassName
              )}
              tooltip={option.label}
              tooltipSide={tooltipSide}
              tooltipOffset={tooltipOffset}
              onClick={() => {
                setSelectedValue(option.value);
                onValueChange(option.value);
              }}
              onMouseDown={e => e.stopPropagation()}
              isActive={isSelected(option.value)}
              className={cn(
                DEFAULT_OPTION_BUTTON_CLASS_NAME,
                optionButtonClassName
              )}
            />
          ))}
        </Box>
      </PopoverContent>
    </Popover>
  );
}
