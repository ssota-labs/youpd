import { redirect } from 'next/navigation';
import { createUserContextClient } from '@youpd/supabase';
import { AppShell } from '@/components/app-shell/app-shell';

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.YOUPD_E2E_SKIP_AUTH !== '1') {
    const supabase = await createUserContextClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      redirect('/login?next=/home');
    }
  }

  return <AppShell>{children}</AppShell>;
}
