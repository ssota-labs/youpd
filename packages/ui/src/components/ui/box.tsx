'use client';

import { type PropsWithChildren } from 'react';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function Box({
  className,
  children,
  ...props
}: PropsWithChildren<ComponentProps<'div'>>) {
  return (
    <div className={cn(className)} data-slot="box" {...props}>
      {children}
    </div>
  );
}
