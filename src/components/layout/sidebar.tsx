'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  ClipboardList,
  CalendarDays,
  BookText,
  FileCheck,
  Sparkles,
  MessageCircle,
  PiggyBank,
  UserCog,
  Truck,
  Receipt,
  FileText,
  Tag,
  Wallet,
 Landmark,
  Calculator,
  LifeBuoy,
  Star,
  Bell,
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
      { href: '/ocupacio', label: 'Ocupació', icon: ClipboardList },
      { href: '/llibre', label: 'Llibre registre de viatgers', icon: BookText },
      { href: '/calendari', label: 'Calendari', icon: CalendarDays },
      { href: '/neteja', label: 'Neteja', icon: Sparkles, hideRestringit: true },
    ],
  },
  {
    title: 'Gestió',
    items: [
      { href: '/plantilles', label: 'Plantilles', icon: MessageCircle },
      { href: '/personal', label: 'Treballadors', icon: UserCog, roles: ['ADMIN'], hideRestringit: true },
      { href: '/balanc', label: 'Balanç', icon: PiggyBank, roles: ['ADMIN'] },
      { href: '/impostos', label: 'Impostos', icon: Calculator, roles: ['ADMIN'] },
      { href: '/factures', label: 'Facturació', icon: Receipt },
      { href: '/pressupostos', label: 'Pressupostos', icon: FileText, roles: ['ADMIN'] },
      { href: '/tarifes', label: 'Tarifes', icon: Tag, roles: ['ADMIN'] },
      { href: '/gastos', label: 'Despeses', icon: Wallet },
      { href: '/taxa-turistica', label: 'Taxa turística', icon: Landmark, hideRestringit: true },
      { href: '/serveis', label: 'Proveïdors', icon: Truck },
      { href: '/justificants', label: 'Justificants', icon: FileCheck },
      { href: '/ressenyes', label: 'Ressenyes Google', icon: Star, hideRestringit: true },
      { href: '/recordatoris', label: 'Recordatoris', icon: Bell, hideRestringit: true },
    ],
  },
  {
    title: 'Ajuda',
    items: [{ href: '/manual', label: 'Manual d’usuari', icon: LifeBuoy }],
  },
];

/** Apartat de la barra lateral d'una adreça (per al pretítol de les pàgines). */
export function apartatDe(pathname: string): string | null {
  if (pathname.startsWith('/config')) return 'Sistema';
  if (pathname === '/') return null;
  for (const g of GROUPS) {
    if (g.items.some((i) => i.href !== '/' && (pathname === i.href || pathname.startsWith(`${i.href}/`)))) return g.title ?? null;
  }
  return null;
}

export function Sidebar({ role, restringit = false, compacta = false }: { role: Role; restringit?: boolean; compacta?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn('scrollbar-hide flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4', compacta && 'lg:px-2')}>
      {GROUPS.map((group, gi) => {
        const items = group.items.filter(
          (i) => (!i.roles || i.roles.includes(role)) && !(restringit && i.hideRestringit),
        );
        if (items.length === 0) return null;
        return (
          <div key={gi} className={cn(gi > 0 && 'mt-4', gi > 0 && compacta && 'lg:mt-2 lg:border-t lg:border-brand-800 lg:pt-2')}>
            {group.title && (
              <p className={cn('app-nav-group px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-400', compacta && 'lg:hidden')}>
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
                  aria-current={active ? 'page' : undefined}
                  title={compacta ? item.label : undefined}
                  aria-label={compacta ? item.label : undefined}
                  className={cn(
                    'app-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    compacta && 'lg:justify-center lg:px-0',
                    active ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-800',
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', compacta && 'lg:h-5 lg:w-5')} />
                  <span className={cn('flex-1', compacta && 'lg:hidden')}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
