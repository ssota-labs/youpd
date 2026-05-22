import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@youpd/api',
    '@youpd/composer-core',
    '@youpd/composer-render-satori',
    '@youpd/db',
    '@youpd/supabase',
    '@youpd/types',
    '@youpd/youtube',
  ],
  // satori + @resvg/resvg-js are NAPI modules pulled in transitively via
  // @youpd/api/mcp/tools (thumbnail_export_png). Treat them as Node
  // externals so Turbopack doesn't try to bundle the native binary.
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
};

export default withWorkflow(nextConfig);
