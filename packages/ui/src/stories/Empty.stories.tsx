import type { Meta, StoryObj } from '@storybook/react';
import { SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

const meta = {
  title: 'UI/Empty',
  component: Empty,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VideoSearch: Story = {
  render: () => (
    <Empty className="max-w-md border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchIcon />
        </EmptyMedia>
        <EmptyTitle>검색 결과가 없습니다</EmptyTitle>
        <EmptyDescription>
          필터를 완화하거나 다른 키워드로 다시 검색해 보세요.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm">
          필터 초기화
        </Button>
      </EmptyContent>
    </Empty>
  ),
};
