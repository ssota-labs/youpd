import { SocialHub } from '@/components/social/social-hub';

export default function SocialPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <h1 className="text-xl font-semibold tracking-tight">Social</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thread/X URL을 레퍼런스 증거로 수집합니다. 연동이 없어도 URL 붙여넣기로 진행할 수 있습니다.
        </p>
      </header>
      <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <SocialHub />
      </div>
    </div>
  );
}
