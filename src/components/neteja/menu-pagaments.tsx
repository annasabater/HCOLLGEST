'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { toISODate } from '@/lib/dates';

/**
 * «Llistat de pagaments ▾» de Neteja: el PDF del compte d'una treballadora, o bé només el que
 * té pendent de pagament, o bé tot des d'una data (o des del primer dia). S'obre en aquesta
 * mateixa pestanya, amb «← Tornar» i «Imprimir / desar PDF».
 */
export function MenuPagaments({ treballadors }: { treballadors: { id: string; nom: string }[] }) {
  const [obert, setObert] = useState(false);
  const [persona, setPersona] = useState('');
  const [desde, setDesde] = useState(() => `${new Date().getFullYear()}-01-01`);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!persona && treballadors[0]) setPersona(treballadors[0].id);
  }, [treballadors, persona]);

  useEffect(() => {
    if (!obert) return;
    const clic = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setObert(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setObert(false); };
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', clic); document.removeEventListener('keydown', tecla); };
  }, [obert]);

  const base = `/imprimir/neteja-pagaments?treballador=${encodeURIComponent(persona)}`;
  const boto = 'inline-flex h-9 items-center gap-1.5 bg-brand-700 px-3.5 text-[13px] font-semibold text-white hover:bg-brand-800';

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" aria-expanded={obert} aria-haspopup="dialog" onClick={() => setObert((o) => !o)}>
        <Wallet className="h-4 w-4" /> Llistat de pagaments <ChevronDown className="h-4 w-4" />
      </Button>
      {obert && (
        <div role="dialog" aria-label="Llistat de pagaments" className="ui-card absolute right-0 z-30 mt-1 w-[27rem] max-w-[calc(100vw-2rem)] border border-slate-300 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Treballadora</p>
            <Select className="mt-2" value={persona} onChange={(e) => setPersona(e.target.value)} aria-label="Treballadora">
              {treballadors.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900">Pendent de pagament</span>
              <span className="block text-xs text-slate-500">El que encara se li ha de pagar, dia a dia, amb el total.</span>
            </span>
            <a className={boto} href={`${base}&mode=pendent`}><Download className="h-3.5 w-3.5" /> PDF</a>
          </div>
          <div className="px-4 py-3">
            <span className="block text-sm font-bold text-slate-900">Des de…</span>
            <span className="block text-xs text-slate-500">Tot el que ha fet des d&apos;una data: pagat i pendent, amb sumes per mes i total.</span>
            <div className="mt-2.5 flex items-center gap-2">
              <Input type="date" value={desde} max={toISODate(new Date())} onChange={(e) => setDesde(e.target.value)} aria-label="Des de" className="flex-1" />
              <a className="inline-flex h-9 items-center border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-brand-600 hover:text-brand-700" href={`${base}&mode=desde`}>
                Des del primer dia
              </a>
            </div>
            <div className="mt-2.5 flex justify-end">
              <a className={boto} href={desde ? `${base}&mode=desde&desde=${desde}` : `${base}&mode=desde`}><Download className="h-3.5 w-3.5" /> PDF</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
