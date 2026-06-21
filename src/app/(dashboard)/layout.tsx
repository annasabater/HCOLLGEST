import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { LogoutButton } from '@/components/layout/logout-button';
import { GlobalSearch } from '@/components/layout/global-search';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPCIO: 'Recepció',
  CONSULTA: 'Consulta',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-brand-900 text-white">
        <div className="border-b border-brand-800 px-5 py-5">
          <p className="font-serif text-2xl font-semibold tracking-wide">Hostal Coll</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-brand-300">
            Gestió integral
          </p>
        </div>
        <Sidebar role={user.role} />
        <div className="border-t border-brand-800 p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium">{user.nom}</p>
            <p className="text-xs text-brand-300">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-slate-50">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
          <GlobalSearch />
        </header>
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
