import { createUserContextClient } from '@youpd/supabase';

export async function requireSessionUserId(): Promise<string> {
  if (process.env.YOUPD_E2E_SKIP_AUTH === '1') {
    return '00000000-0000-4000-8000-00000000e2e0';
  }

  const supabase = await createUserContextClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('Unauthorized');
  }
  return data.user.id;
}
