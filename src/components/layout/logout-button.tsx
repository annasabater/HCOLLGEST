'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton({ compacta = false }: { compacta?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      title={compacta ? 'Sortir' : undefined}
      aria-label={compacta ? 'Sortir' : undefined}
      className={`app-nav-item app-logout flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand-100 transition-colors hover:bg-brand-800${compacta ? ' lg:justify-center lg:px-0' : ''}`}
    >
      <LogOut className="h-4 w-4" />
      <span className={compacta ? 'lg:hidden' : undefined}>Sortir</span>
    </button>
  );
}
