import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@youpd/api',
    '@youpd/composer-core',
    '@youpd/composer-react',
    '@youpd/db',
    '@youpd/supabase',
    '@youpd/types',
    '@youpd/ui',
  ],
  // satori + @resvg/resvg-js ship native NAPI bindings that Turbopack can't
  // place into ESM chunks. They run only inside server route handlers
  // (thumbnail_export_png), so excluding them from the client/server bundle
  // and letting Node resolve them at runtime is correct.
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
};

export default nextConfig;
