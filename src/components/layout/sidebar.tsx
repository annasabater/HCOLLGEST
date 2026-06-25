'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  CalendarDays,
  BookText,
  FileCheck,
  Sparkles,
  MessageCircle,
  Star,
  PiggyBank,
  UserCog,
  Truck,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  hideRestringit?: boolean; // amagat per a la vista restringida de propietat
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    items: [{ href: '/', label: 'Tauler', icon: LayoutDashboard }],
  },
  {
    title: 'Recepció',
    items: [
      { href: '/huespedes', label: 'Clients', icon: Users },
      { href: '/estancies', label: 'Estades', icon: BedDouble },
      { href: '/llibre', label: 'Llibre registre de viatgers', icon: BookText },
      { href: '/calendari', label: 'Calendari', icon: CalendarDays },
      { href: '/neteja', label: 'Neteja', icon: Sparkles, hideRestringit: true },
    ],
  },
  {
    title: 'Gestió',
    items: [
      { href: '/plantilles', label: 'Plantilles', icon: MessageCircle },
      { href: '/valoracions', label: 'Valoracions', icon: Star },
      { href: '/serveis', label: 'Proveïdors i serveis', icon: Truck },
{ href: '/personal', label: 'Treballadors', icon: UserCog, roles: ['ADMIN'], hideRestringit: true },
      { href: '/balanc', label: 'Comptabilitat', icon: PiggyBank, roles: ['ADMIN'] },
      { href: '/justificants', label: 'Justificants', icon: FileCheck },
    ],
  },
];

export function Sidebar({ role, restringit = false }: { role: Role; restringit?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {GROUPS.map((group, gi) => {
        const items = group.items.filter(
          (i) => (!i.roles || i.roles.includes(role)) && !(restringit && i.hideRestringit),
        );
        if (items.length === 0) return null;
        return (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.title && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                {group.title}
              </p>
            )}
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
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
