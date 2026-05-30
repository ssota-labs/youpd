import React, { forwardRef } from 'react';

import { Box } from '@/components/ui/box';
import { cn } from '@/lib/utils';

export interface ToolbarContainerProps extends React.ComponentPropsWithoutRef<
  typeof Box
> {
  /**
   * Toolbar의 ref
   */
  toolbarRef?: React.RefObject<HTMLDivElement | null>;

  /**
   * React Flow 드래그 방지 (nodrag nowheel 클래스 추가)
   * @default false
   */
  preventDrag?: boolean;

  /**
   * Mouse down 이벤트 전파 방지
   * @default false
   */
  preventMouseDown?: boolean;

  /**
   * Click 이벤트 전파 방지
   * @default false
   */
  preventClick?: boolean;
}

/**
 * Toolbar Container Component
 *
 * Toolbar를 감싸는 공통 컨테이너 컴포넌트
 * - Edge toolbar와 Viewport controls toolbar에서 공통으로 사용
 * - Presentational 컴포넌트: Props만 받아서 렌더링
 * - Storybook에서 독립적으로 테스트 가능
 * - 스타일은 className으로 전달 (Tailwind classes)
 */
export const ToolbarContainer = forwardRef<
  HTMLDivElement,
  ToolbarContainerProps
>(
  (
    {
      toolbarRef,
      preventDrag = false,
      preventMouseDown = false,
      preventClick = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Box
        ref={toolbarRef || ref}
        className={cn(
          preventDrag && 'nodrag nowheel',
          'bg-background/90 backdrop-blur-md border border-border rounded-md shadow-lg px-1.5 py-1 flex items-center justify-center gap-0.5',
          className
        )}
        style={{ touchAction: 'none', ...props.style }}
        onWheel={e => {
          e.stopPropagation();
          props.onWheel?.(e);
        }}
        onMouseDown={e => {
          if (preventMouseDown) {
            e.stopPropagation();
          }
          props.onMouseDown?.(e);
        }}
        onClick={e => {
          if (preventClick) {
            e.stopPropagation();
          }
          props.onClick?.(e);
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }
);

ToolbarContainer.displayName = 'ToolbarContainer';
