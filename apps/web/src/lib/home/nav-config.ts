import {
  Home,
  Image,
  LayoutTemplate,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  FolderOpen,
  Flame,
  type LucideIcon,
} from 'lucide-react';

export type AppNavItem =
  | {
      kind: 'link';
      title: string;
      href: string;
      icon: LucideIcon;
      matchPrefix?: string;
    }
  | {
      kind: 'placeholder';
      title: string;
      icon: LucideIcon;
      hint: string;
    };

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    kind: 'link',
    title: 'Home',
    href: '/home',
    icon: Home,
    matchPrefix: '/home',
  },
  {
    kind: 'link',
    title: 'Keyword Search',
    href: '/keywords',
    icon: Search,
    matchPrefix: '/keywords',
  },
  {
    kind: 'link',
    title: 'Hot Candidates',
    href: '/hot-videos',
    icon: Flame,
    matchPrefix: '/hot-videos',
  },
  {
    kind: 'link',
    title: 'References',
    href: '/references',
    icon: FolderOpen,
    matchPrefix: '/references',
  },
  {
    kind: 'link',
    title: 'Thumbnail Library',
    href: '/thumbnail-templates',
    icon: Image,
    matchPrefix: '/thumbnail-templates',
  },
  {
    kind: 'link',
    title: 'Create Thumbnail',
    href: '/thumbnail-create',
    icon: LayoutTemplate,
    matchPrefix: '/thumbnail-create',
  },
  {
    kind: 'placeholder',
    title: 'Intro Library',
    icon: Sparkles,
    hint: 'S8에서 제공 예정',
  },
  {
    kind: 'placeholder',
    title: 'Thread Library',
    icon: MessageSquare,
    hint: 'S10에서 제공 예정',
  },
  {
    kind: 'placeholder',
    title: 'Template Library',
    icon: LayoutTemplate,
    hint: '준비 중',
  },
  {
    kind: 'placeholder',
    title: 'Assets',
    icon: FolderOpen,
    hint: '준비 중',
  },
  {
    kind: 'placeholder',
    title: 'Settings',
    icon: Settings,
    hint: '준비 중',
  },
];
