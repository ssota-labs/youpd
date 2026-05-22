import { describe, expect, it } from 'vitest';
import { registerTools } from './server';

type ToolConfig = {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

type RegisteredTool = {
  name: string;
  config: ToolConfig;
  handler: unknown;
};

const EXPECTED_TOOL_NAMES = [
  'youpd_analyze_video',
  'youpd_analyze_channel',
  'youpd_search_keyword',
  'youpd_get_trending_videos',
];

function captureRegisteredTools(): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool(name: string, config: ToolConfig, handler: unknown): void {
      tools.set(name, { name, config, handler });
    },
  } as unknown as Parameters<typeof registerTools>[0];

  registerTools(server);
  return tools;
}

function descriptionFor(
  tools: Map<string, RegisteredTool>,
  name: string,
): string {
  const description = tools.get(name)?.config.description;
  expect(description, `${name} should have a description`).toEqual(
    expect.any(String),
  );
  return description as string;
}

describe('registerTools', () => {
  it('registers the workflow MCP tool set', () => {
    const tools = captureRegisteredTools();
    expect([...tools.keys()]).toEqual(EXPECTED_TOOL_NAMES);
  });

  it('uses workflow-oriented descriptions without low-level persist flags', () => {
    const tools = captureRegisteredTools();

    for (const name of EXPECTED_TOOL_NAMES) {
      const description = descriptionFor(tools, name);
      expect(description).toContain('Inputs:');
      expect(description).toContain('Side effects:');
      expect(description).toContain('Returns');
      expect(description).not.toMatch(/persist defaults to true/i);
      expect(description).not.toMatch(/v0\.12 REST wrapper/i);
    }
  });

  it('marks stored trending lookup as read-only', () => {
    const tools = captureRegisteredTools();
    const tool = tools.get('youpd_get_trending_videos');

    expect(tool?.config.annotations).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
    });
    expect(descriptionFor(tools, 'youpd_get_trending_videos')).toContain(
      'read-only and idempotent',
    );
    expect(descriptionFor(tools, 'youpd_get_trending_videos')).toContain(
      'does not call YouTube directly',
    );
  });
});
