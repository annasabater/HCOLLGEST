'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getJSON, patchJSON, ApiError } from '@/lib/api';
import { GRAVETAT_AVIS_LABELS } from '@/lib/validation/avis';

interface Avis {
  id: string;
  nom: string;
  telefon: string | null;
  motiu: string;
  gravetat: 'BAIXA' | 'MITJA' | 'ALTA';
}

const TONE = { ALTA: 'danger', MITJA: 'warning', BAIXA: 'neutral' } as const;

/**
 * Panell d'avisos interns ACTIUS (llista de no-admissió). Només es mostra si
 * n'hi ha algun; cada avís es pot desactivar des d'aquí.
 */
export function AvisosPanel() {
  const [avisos, setAvisos] = useState<Avis[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getJSON<{ avisos: Avis[] }>('/api/avisos?actiu=true')
      .then((r) => setAvisos(r.avisos))
      .catch(() => setAvisos([]));
  }, []);

  async function desactivar(id: string) {
    if (!confirm('Desactivar aquest avís intern?')) return;
    setBusy(id);
    try {
      await patchJSON(`/api/avisos/${id}`, { actiu: false });
      setAvisos((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No s’ha pogut desactivar l’avís');
    } finally {
      setBusy(null);
    }
  }

  // Si no hi ha cap avís actiu, no mostrem res (evita el card buit).
  if (avisos.length === 0) return null;

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
        <ul className="space-y-1.5">
          {avisos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={TONE[a.gravetat]}>{GRAVETAT_AVIS_LABELS[a.gravetat]}</Badge>
              <span className="font-medium text-slate-800">{a.nom}</span>
              {a.telefon && <span className="text-xs text-slate-400">{a.telefon}</span>}
              <span className="text-slate-600">— {a.motiu}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                disabled={busy === a.id}
                onClick={() => desactivar(a.id)}
              >
                Desactivar
              </Button>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
