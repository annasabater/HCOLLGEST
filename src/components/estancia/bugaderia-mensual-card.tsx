'use client';

import { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eur } from '@/components/finances/amounts-visibility';

interface Row {
  id: string;
  data: string;
  habitacio: string | null;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  articles: string;
  total: number;
}

/** Total de bugaderia del mes (per comprovar la factura de la Mireia). */
export function BugaderiaMensualCard() {
  const now = new Date();
  const [mes, setMes] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [total, setTotal] = useState(0);
  const [detall, setDetall] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/bugaderia/mensual?mes=${mes}`)
      .then((r) => r.json())
      .then((d) => { if (!cancel) { setTotal(d.total ?? 0); setDetall(d.detall ?? []); } })
      .catch(() => {})
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [mes]);

  const mesos = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const dataCurta = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '—';

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Shirt className="h-4 w-4 text-brand-600" /> Bugaderia del mes</CardTitle>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
        >
          {mesos.map((mm) => (
            <option key={mm} value={mm}>
              {new Date(`${mm}-01T00:00:00`).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardBody>
        <div className="mb-1 text-2xl font-bold text-slate-900"><Eur value={total} /></div>
        <p className="mb-3 text-xs text-slate-400">
          Suma la bugaderia que has marcat a les <strong>neteges</strong> d&apos;aquest mes (a Neteja, per cada habitació). Només compta el que has marcat que fa la Mireia. Serveix per comprovar la seva factura.
        </p>
        {loading ? (
          <p className="text-sm text-slate-400">Carregant…</p>
        ) : detall.length === 0 ? (
          <p className="text-sm text-slate-400">Cap bugaderia marcada aquest mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="py-1.5 text-left font-medium">Dia</th>
                  <th className="py-1.5 text-center font-medium">Hab.</th>
                  <th className="py-1.5 text-center font-medium">Tipus</th>
                  <th className="py-1.5 text-left font-medium">Articles</th>
                  <th className="py-1.5 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {detall.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 align-top">
                    <td className="py-1.5 whitespace-nowrap text-slate-500">{dataCurta(r.data)}</td>
                    <td className="py-1.5 text-center text-slate-500">{r.habitacio ?? '—'}</td>
                    <td className="py-1.5 text-center">
                      <Badge tone={r.tipus === 'CANVI_COMPLET' ? 'warning' : 'neutral'} className="text-xs">
                        {r.tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Repàs'}
                      </Badge>
                    </td>
                    <td className="py-1.5 text-slate-600">{r.articles}</td>
                    <td className="py-1.5 text-right font-medium text-slate-800"><Eur value={r.total} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
