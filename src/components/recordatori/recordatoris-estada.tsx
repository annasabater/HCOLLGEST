'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Pencil, Plus } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { ACCIO_RECORDATORI_LABELS, diesEntre, textQuan } from '@/lib/recordatoris';
import type { EstadaRecordatori, RecordatoriVista } from '@/lib/services/recordatoris';
import { RecordatoriFormulari } from './formulari';
import type { AvisosRecordatori } from './tarja';

const dc = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/**
 * Fitxa de l'estada: els seus recordatoris pendents (i dels altres contractes de
 * la mateixa estada) i «+ Recordatori», que obre el formulari ja lligat a l'estada.
 */
export function RecordatorisEstada({
  estada,
  items,
  avui,
  avisos,
}: {
  estada: EstadaRecordatori;
  items: RecordatoriVista[];
  avui: string;
  avisos: AvisosRecordatori;
}) {
  const router = useRouter();
  const [form, setForm] = useState<{ obert: boolean; r: RecordatoriVista | null }>({ obert: false, r: null });

  return (
    <CollapsibleCard
      title="Recordatoris d’aquesta estada"
      icon={<Bell className="h-4 w-4 text-brand-600" />}
      count={items.length}
      defaultOpen={items.length > 0}
    >
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            Cap. P. ex. «M’ha de dir si allarga» el dia que t’ha dit, o «M’ha de pagar».
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const dies = diesEntre(avui, r.ajornatFins ?? r.data);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                    {r.accio ? ACCIO_RECORDATORI_LABELS[r.accio] : 'Recordatori'}
                  </span>
                  <span className="text-sm tabular-nums text-slate-600">
                    {dc(r.ajornatFins ?? r.data)} · {dies === 0 ? 'avui' : textQuan(dies)}
                  </span>
                  <span className="min-w-0 flex-[1_1_12rem] text-[15px] font-semibold text-slate-900">{r.titol}</span>
                  {r.estada && r.estada.id !== estada.id && (
                    <span className="text-xs text-slate-500">(contracte {r.estada.contracte ?? '—'})</span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setForm({ obert: true, r })}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <Button size="sm" variant="outline" onClick={() => setForm({ obert: true, r: null })}>
          <Plus className="h-4 w-4" /> Recordatori
        </Button>
      </div>
      {form.obert && (
        <RecordatoriFormulari
          inicial={form.r}
          estadaInicial={form.r ? null : estada}
          mobilActiu={avisos.mobilActiu}
          calendariConnectat={avisos.calendariConnectat}
          onTanca={() => setForm({ obert: false, r: null })}
          onDesat={() => {
            setForm({ obert: false, r: null });
            router.refresh();
          }}
        />
      )}
    </CollapsibleCard>
  );
}
