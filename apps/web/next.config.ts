import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@youpd/api',
    '@youpd/db',
    '@youpd/supabase',
    '@youpd/types',
    '@youpd/ui',
  ],
};

export default nextConfig;
