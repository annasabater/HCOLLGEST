'use client';

import { useState } from 'react';
import { Home, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { formatDate, formatEur } from '@/lib/utils';

interface TascaRow {
  id: string;
  data: string;
  habitacio: string | null;
  tipus: string;
  estat: string;
  importCalculat: number;
}

interface MesGroup {
  mes: string;
  tasques: TascaRow[];
  total: number;
  pendentPagament: number;
}

function mesLabel(ym: string) {
  return new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(
    new Date(`${ym}-01T00:00:00`),
  );
}

export function TasquesNetejaSection({ tasques }: { tasques: TascaRow[] }) {
  const [mesSel, setMesSel] = useState<string>('');

  // Agrupar per mes
  const mesos = Array.from(new Set(tasques.map((t) => t.data.slice(0, 7)))).sort().reverse();
  const mesDef = mesos[0] ?? '';
  const mesActiu = mesSel || mesDef;

  const filtrades = mesActiu ? tasques.filter((t) => t.data.startsWith(mesActiu)) : tasques;
  const totalMes = filtrades.reduce((a, t) => a + t.importCalculat, 0);
  const fetes = filtrades.filter((t) => t.estat === 'FETA');
  const totalFetes = fetes.reduce((a, t) => a + t.importCalculat, 0);

  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Home className="h-4 w-4 text-brand-600" />
        <span className="flex-1 text-sm font-semibold text-slate-800">Tasques de neteja</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {/* Selector de mes + resum */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Mes:</span>
              <select
                value={mesActiu}
                onChange={(e) => setMesSel(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
              >
                {mesos.map((m) => (
                  <option key={m} value={m}>{mesLabel(m)}</option>
                ))}
              </select>
            </label>
            <span>
              Realitzades: <strong>{fetes.length}</strong> tasques ·{' '}
              <strong className="text-brand-700">{formatEur(totalFetes)}</strong>
            </span>
            {totalMes !== totalFetes && (
              <span className="text-slate-500">
                (total incl. pendents: {formatEur(totalMes)})
              </span>
            )}
          </div>

          {filtrades.length === 0 ? (
            <EmptyState>Cap tasca en aquest mes.</EmptyState>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Dia</Th>
                  <Th>Habitació</Th>
                  <Th>Tipus</Th>
                  <Th>Estat</Th>
                  <Th className="text-right">Import</Th>
                </tr>
              </Thead>
              <tbody>
                {filtrades.map((t) => (
                  <Tr key={t.id}>
                    <Td>{formatDate(t.data)}</Td>
                    <Td>{t.habitacio ? `Hab. ${t.habitacio}` : '—'}</Td>
                    <Td className="text-sm text-slate-600">
                      {t.tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Manteniment'}
                    </Td>
                    <Td>
                      {t.estat === 'FETA'
                        ? <Badge tone="success">Feta</Badge>
                        : <Badge tone="neutral">Pendent</Badge>}
                    </Td>
                    <Td className="text-right font-medium">
                      {t.importCalculat > 0 ? formatEur(t.importCalculat) : '—'}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
