/**
 * Status Window Panel View
 *
 * 순수 View: 트리거 버튼 + 닫기 애니메이션 윈도우.
 * Result Injection: showTrigger, isExiting 등 호출부가 계산 후 전달.
 * Parameterization: onOpenClick, onCloseAnimationComplete 콜백 주입.
 */

'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Activity } from 'lucide-react';

import { Box } from '@/components/ui/box';

const buttonTransition = { type: 'tween' as const, duration: 0.1 };

const windowOpenTransition = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as const,
};

const windowCloseTransition = {
  type: 'tween' as const,
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1] as const,
};

export interface StatusWindowPanelViewProps {
  /** true: 트리거 버튼 표시, false: 윈도우 표시 */
  showTrigger: boolean;
  /** 트리거 버튼 클릭 시 */
  onOpenClick: () => void;
  /** 닫기 애니메이션 진행 중 */
  isExiting: boolean;
  /** 닫기 애니메이션 완료 시 (호출부가 dismiss 반영) */
  onCloseAnimationComplete: () => void;
  /** 윈도우 내용 (StatusWindowView 등) */
  children: React.ReactNode;
}

export function StatusWindowPanelView({
  showTrigger,
  onOpenClick,
  isExiting,
  onCloseAnimationComplete,
  children,
}: StatusWindowPanelViewProps) {
  return (
    <Box className="flex flex-col items-end">
      <AnimatePresence mode="wait">
        {showTrigger ? (
          <motion.div
            key="trigger"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={buttonTransition}
            className="flex flex-col items-end"
          >
            <button
              type="button"
              onClick={onOpenClick}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Open status window"
            >
              <Activity className="h-4 w-4" />
              Status
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="window"
            initial={{
              opacity: 0,
              width: 0,
              filter: 'blur(12px)',
            }}
            animate={
              isExiting
                ? {
                    opacity: 0,
                    width: 0,
                    filter: 'blur(12px)',
                  }
                : {
                    opacity: 1,
                    width: 320,
                    filter: 'blur(0px)',
                  }
            }
            transition={
              isExiting ? windowCloseTransition : windowOpenTransition
            }
            onAnimationComplete={onCloseAnimationComplete}
            className="overflow-hidden origin-right"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
