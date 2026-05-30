/**
 * Style Tokens (SSOT for color palette)
 *
 * ColorToken and TAILWIND_COLOR_PALETTE are the single source of truth.
 * Used by ssota-editor (bubble menu), block-management (group/shape blocks), canvas edge toolbar, etc.
 */

/**
 * 색상 토큰 Enum
 */
export enum ColorToken {
  RED = 'red',
  ORANGE = 'orange',
  AMBER = 'amber',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  PINK = 'pink',
  GRAY = 'gray',
}

/**
 * Tailwind 색상 팔레트 (SSOT)
 * https://tailwindcss.com/docs/customizing-colors
 */
export const TAILWIND_COLOR_PALETTE: Record<
  ColorToken,
  {
    100: string;
    400: string;
    500: string;
    700: string;
    800: string;
    900: string;
  }
> = {
  [ColorToken.GRAY]: {
    100: '#f3f4f6',
    400: '#9ca3af',
    500: '#6b7280',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  [ColorToken.RED]: {
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  [ColorToken.ORANGE]: {
    100: '#ffedd5',
    400: '#fb923c',
    500: '#f97316',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  [ColorToken.AMBER]: {
    100: '#fef3c7',
    400: '#fbbf24',
    500: '#f59e0b',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  [ColorToken.GREEN]: {
    100: '#d1fae5',
    400: '#4ade80',
    500: '#10b981',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  [ColorToken.BLUE]: {
    100: '#dbeafe',
    400: '#60a5fa',
    500: '#3b82f6',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  [ColorToken.PURPLE]: {
    100: '#ede9fe',
    400: '#c084fc',
    500: '#a855f7',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  [ColorToken.PINK]: {
    100: '#fce7f3',
    400: '#f472b6',
    500: '#ec4899',
    700: '#be185d',
    800: '#9f1239',
    900: '#831843',
  },
};

/**
 * 색상 토큰별 라벨
 */
export const COLOR_TOKEN_LABELS: Record<ColorToken, string> = {
  [ColorToken.RED]: 'Red',
  [ColorToken.ORANGE]: 'Orange',
  [ColorToken.AMBER]: 'Amber',
  [ColorToken.GREEN]: 'Green',
  [ColorToken.BLUE]: 'Blue',
  [ColorToken.PURPLE]: 'Purple',
  [ColorToken.PINK]: 'Pink',
  [ColorToken.GRAY]: 'Gray',
};

/**
 * 색상 라벨 가져오기
 */
export function getColorLabel(token: ColorToken): string {
  return COLOR_TOKEN_LABELS[token];
}
