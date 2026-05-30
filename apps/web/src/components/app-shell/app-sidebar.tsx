'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@youpd/ui/components/ui/tooltip';
import { APP_NAV_ITEMS } from '@/lib/home/nav-config';

function isActive(pathname: string, href: string, matchPrefix?: string) {
  const prefix = matchPrefix ?? href;
  if (prefix === '/home') return pathname === '/home' || pathname === '/';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link href="/home" className="text-sm font-semibold tracking-tight">
          YouPD
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">유튜브 기획 워크스페이스</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="앱 메뉴">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">작업</p>
        {APP_NAV_ITEMS.map((item) => {
          if (item.kind === 'link') {
            const active = isActive(pathname, item.href, item.matchPrefix);
            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                <span>{item.title}</span>
              </Link>
            );
          }

          return (
            <Tooltip key={item.title}>
              <TooltipTrigger asChild>
                <span
                  className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
                  aria-disabled
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span>{item.title}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">{item.hint}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <p className="border-t border-sidebar-border px-3 py-2 text-xs text-muted-foreground">
        Planning Recommendation Feed
      </p>
    </aside>
  );
}
