'use client';

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BedDouble,
  UserCog,
  Coins,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { HideAmountsButton, useAmountsHidden } from '@/components/finances/amounts-visibility';

const ICONS: Record<string, LucideIcon> = {
  TrendingUp,
  TrendingDown,
  Wallet,
  BedDouble,
  UserCog,
  Coins,
};

export type FinanceKpi = {
  label: string;
  value: string;
  icon: keyof typeof ICONS;
  color: string;
};

export function FinancesPanel({ items }: { items: FinanceKpi[] }) {
  const { hidden } = useAmountsHidden();

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-end">
        <HideAmountsButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => {
          const Icon = ICONS[f.icon] ?? Wallet;
          return (
            <Card key={f.label}>
              <CardBody className="flex items-center gap-4">
                <div className="rounded-lg bg-slate-100 p-3">
                  <Icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">
                    {hidden ? <span className="tracking-widest text-slate-400">••••</span> : f.value}
                  </p>
                  <p className="text-xs text-slate-500">{f.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
