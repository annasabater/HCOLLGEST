'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  CalendarDays,
  BookText,
  Sparkles,
  Receipt,
  ShieldCheck,
  Wallet,
  Boxes,
  UserCog,
  Settings,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  phase?: string;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Tauler', icon: LayoutDashboard },
  { href: '/huespedes', label: 'Hostes', icon: Users },
  { href: '/estancies', label: 'Estades', icon: BedDouble },
  { href: '/calendari', label: 'Calendari', icon: CalendarDays },
  { href: '/neteja', label: 'Neteja', icon: Sparkles },
  { href: '/llibre', label: 'Llibre registre', icon: BookText },
  { href: '/factures', label: 'Facturació', icon: Receipt },
  { href: '/verifactu', label: 'Veri*Factu', icon: ShieldCheck },
  { href: '/gastos', label: 'Despeses', icon: Wallet },
  { href: '/actius', label: 'Actius', icon: Boxes },
  { href: '/personal', label: 'Personal', icon: UserCog, roles: ['ADMIN'] },
  { href: '/config', label: 'Configuració', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-800',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.phase && (
              <span className="rounded bg-brand-800/60 px-1.5 py-0.5 text-[10px] text-brand-300">
                {item.phase}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
