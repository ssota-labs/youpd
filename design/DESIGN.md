# YouPD Design System (SSOTA-derived)

YouPD web UI inherits the **SSOTA** visual language: warm coral primary, soft elevation, 12px radius, Inter typography, and shadcn **new-york** primitives from `@youpd/ui`.

## Source of truth

| Layer | Location |
|-------|----------|
| CSS tokens | `packages/ui/src/styles/globals.css` |
| Block/canvas colors | `packages/ui/src/lib/style-tokens.ts` |
| Base primitives | `packages/ui/src/components/ui/*` |
| Product chrome | `packages/ui/src/components/ssota-ui/*` |

Do not duplicate token values in app code. Change tokens in `globals.css` only.

## Principles

- **Surfaces**: Light mode uses near-white cards (`--card`), muted secondary backgrounds for chrome.
- **Primary**: Warm orange-coral (`oklch(0.6368 0.2078 25.3313)` light) — CTAs, focus rings, links.
- **Elevation**: Prefer `shadow-xs` / `shadow-sm`; avoid harsh borders alone.
- **Radius**: `--radius: 0.75rem` — use `rounded-md` for controls, `rounded-xl` for panels.
- **Density**: Default control height `h-9`; compact `h-8` (`size="sm"`).

## Typography

- **Sans**: Inter stack (set in root layout via `next/font`).
- **Body**: `text-sm` for UI chrome; `font-medium` on buttons and labels.
- **Mono**: Menlo stack for code (via `--font-mono`).

## Component usage

### Import path

```tsx
import { Button } from "@youpd/ui/components/ui/button";
import { ToolbarContainer } from "@youpd/ui/components/ssota-ui/toolbar-container";
```

### Button variants

| Variant | When |
|---------|------|
| `default` | Primary action |
| `outline` | Secondary on white/card |
| `ghost` | Toolbar, icon-adjacent actions |
| `destructive` | Irreversible delete (text style in SSOTA) |

### SSOTA chrome (reuse for planning surfaces)

- `ToolbarContainer` + `ToolbarIconButton` + `ToolbarOptionPopover` — floating toolbars
- `WorkspaceSelector`, `FilterSelectPopover` — scope/filter UX
- `StatusWindow` / `StatusDot` — long-running job feedback

### YouPD-only

- `Empty` — empty states (`@youpd/ui/components/ui/empty`)

## Theming

- Light/dark via `.dark` on `<html>` (use `next-themes` when adding toggle).
- Never hardcode hex for brand colors; use `bg-primary`, `text-muted-foreground`, etc.

## Adding components

1. Prefer `npx shadcn add` against `packages/ui/components.json` (style: **new-york**).
2. Or copy from SSOTA `packages/ui` and trim dependencies.
3. Document new patterns in this file.

## Storybook

Component lab for `@youpd/ui` (SSOTA tokens + primitives):

```bash
pnpm --filter @youpd/ui storybook
# http://localhost:6006
```

Stories live in `packages/ui/src/stories/`. Add `*.stories.tsx` next to new components or under `stories/`.

## Cursor / agents

When building UI in YouPD, read `.cursor/rules/youpd-ui.mdc` and import from `@youpd/ui` — not ad-hoc copies under `apps/web/src/components/ui`.
