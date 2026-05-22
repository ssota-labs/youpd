import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@youpd/api',
    '@youpd/db',
    '@youpd/supabase',
    '@youpd/types',
    '@youpd/youtube',
  ],
};

export default withWorkflow(nextConfig);
