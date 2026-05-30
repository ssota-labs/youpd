import type { Meta, StoryObj } from '@storybook/react';
import { FilterIcon, Settings2Icon } from 'lucide-react';

import { ToolbarContainer } from '@/components/ssota-ui/toolbar-container';
import { ToolbarIconButton } from '@/components/ssota-ui/toolbar-icon-button';

const meta = {
  title: 'SSOTA/Toolbar',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const FloatingChrome: Story = {
  render: () => (
    <div className="rounded-xl border bg-muted/40 p-12">
      <ToolbarContainer className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-md">
        <ToolbarIconButton icon={<FilterIcon />} tooltip="필터" />
        <ToolbarIconButton icon={<Settings2Icon />} tooltip="설정" />
      </ToolbarContainer>
    </div>
  ),
};
