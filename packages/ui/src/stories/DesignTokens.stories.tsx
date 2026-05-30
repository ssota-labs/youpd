import type { Meta, StoryObj } from '@storybook/react';

import {
  COLOR_TOKEN_LABELS,
  ColorToken,
  TAILWIND_COLOR_PALETTE,
} from '@/lib/style-tokens';

const meta = {
  title: 'Foundation/Design Tokens',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const semanticSwatches = [
  { name: 'background', className: 'bg-background' },
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'card', className: 'bg-card' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'destructive', className: 'bg-destructive' },
  { name: 'border', className: 'bg-border' },
] as const;

export const SemanticColors: Story = {
  render: () => (
    <div className="w-full max-w-3xl space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Semantic (CSS variables)</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          SSOTA-derived tokens from <code>globals.css</code>. Toggle light/dark
          in the toolbar.
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {semanticSwatches.map((swatch) => (
            <div key={swatch.name} className="space-y-1">
              <div
                className={`h-14 rounded-lg border shadow-xs ${swatch.className}`}
              />
              <p className="font-mono text-xs">{swatch.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Block palette</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.values(ColorToken).map((token) => (
            <div key={token} className="space-y-1">
              <div
                className="h-14 rounded-lg border"
                style={{ backgroundColor: TAILWIND_COLOR_PALETTE[token][500] }}
              />
              <p className="text-xs font-medium">{COLOR_TOKEN_LABELS[token]}</p>
              <p className="font-mono text-[0.65rem] text-muted-foreground">
                {TAILWIND_COLOR_PALETTE[token][500]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonPreview />
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium">Card surface</p>
          <p className="text-xs text-muted-foreground">
            radius 0.75rem · soft shadow
          </p>
        </div>
      </div>
    </div>
  ),
};

function ButtonPreview() {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-4">
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs"
      >
        Primary
      </button>
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs"
      >
        Outline
      </button>
    </div>
  );
}
