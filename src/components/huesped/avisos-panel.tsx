'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJSON } from '@/lib/api';
import { GRAVETAT_AVIS_LABELS } from '@/lib/validation/avis';

interface Avis {
  id: string;
  nom: string;
  telefon: string | null;
  motiu: string;
  gravetat: 'BAIXA' | 'MITJA' | 'ALTA';
}

const TONE = { ALTA: 'danger', MITJA: 'warning', BAIXA: 'neutral' } as const;

/** Panell compacte d'avisos interns actius, per incrustar a Hostes i Llibre. */
export function AvisosPanel() {
  const [avisos, setAvisos] = useState<Avis[]>([]);

  useEffect(() => {
    getJSON<{ avisos: Avis[] }>('/api/avisos?actiu=true')
      .then((r) => setAvisos(r.avisos))
      .catch(() => setAvisos([]));
  }, []);

  return (
    <Card className="mb-6 border-amber-200">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4" /> Avisos interns ({avisos.length})
        </CardTitle>
        <Link href="/avisos" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Gestionar
        </Link>
      </CardHeader>
      <CardBody>
        {avisos.length === 0 ? (
          <p className="text-sm text-slate-400">
            Cap avís actiu. Pots vetar una persona (encara que no sigui client) des de{' '}
            <Link href="/avisos" className="text-brand-700 hover:underline">
              Gestionar
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-1.5">
            {avisos.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={TONE[a.gravetat]}>{GRAVETAT_AVIS_LABELS[a.gravetat]}</Badge>
                <span className="font-medium text-slate-800">{a.nom}</span>
                {a.telefon && <span className="text-xs text-slate-400">{a.telefon}</span>}
                <span className="text-slate-600">— {a.motiu}</span>
              </li>
            ))}
            {avisos.length > 8 && (
              <li className="text-xs text-slate-400">
                <Link href="/avisos" className="hover:underline">
                  +{avisos.length - 8} més…
                </Link>
              </li>
            )}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
