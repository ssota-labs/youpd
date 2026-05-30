import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';

import { TooltipProvider } from '@/components/ui/tooltip';

import './storybook.css';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
