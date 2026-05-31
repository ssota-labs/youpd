import {
  Home,
  Image,
  LayoutTemplate,
  Type,
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
    title: 'Copy Templates',
    href: '/copy-templates',
    icon: Type,
    matchPrefix: '/copy-templates',
  },
  {
    kind: 'link',
    title: 'Create Thumbnail',
    href: '/thumbnail-create',
    icon: LayoutTemplate,
    matchPrefix: '/thumbnail-create',
  },
  {
    kind: 'link',
    title: 'Intro Templates',
    href: '/intro-templates',
    icon: Sparkles,
    matchPrefix: '/intro-templates',
  },
  {
    kind: 'link',
    title: 'Social',
    href: '/social',
    icon: MessageSquare,
    matchPrefix: '/social',
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
