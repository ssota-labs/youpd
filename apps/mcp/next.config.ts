import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@youpd/db', '@youpd/supabase', '@youpd/types'],
};

export default nextConfig;
