'use client';

import { AppSidebar } from './app-sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-0px)] w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        >
          본문으로 건너뛰기
        </a>
        <div id="app-main" className="flex flex-1 flex-col bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
