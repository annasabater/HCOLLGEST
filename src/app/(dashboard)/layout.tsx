import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { AppShell } from '@/components/layout/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return <AppShell user={{ nom: user.nom, role: user.role }}>{children}</AppShell>;
}
