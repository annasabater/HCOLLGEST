'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PawPrint, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON } from '@/lib/api';
import { midaAnimalValues, MIDA_ANIMAL_LABELS } from '@/lib/validation/enums';

export interface Mascota {
  id: string;
  nom: string;
  especie: string;
  mida: 'PETIT' | 'MITJA' | 'GRAN' | null;
}

export function MascotesPanel({
  huespedId,
  mascotes,
  canWrite,
}: {
  huespedId: string;
  mascotes: Mascota[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [especie, setEspecie] = useState('Gos');
  const [mida, setMida] = useState('');
  const [saving, setSaving] = useState(false);

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !especie.trim()) return;
    setSaving(true);
    try {
      await postJSON('/api/animals', { nom, especie, mida: mida || undefined, huespedId });
      setNom('');
      setMida('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {mascotes.length === 0 ? (
        <p className="text-sm text-slate-400">Sense mascotes.</p>
      ) : (
        <ul className="space-y-2">
          {mascotes.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <PawPrint className="h-4 w-4 text-brand-600" />
              <span className="font-medium text-slate-800">{m.nom}</span>
              <span className="text-slate-400">· {m.especie}</span>
              {m.mida && <Badge tone="neutral" className="ml-auto">{MIDA_ANIMAL_LABELS[m.mida]}</Badge>}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={afegir} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Nom</label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Espècie</label>
            <Input value={especie} onChange={(e) => setEspecie(e.target.value)} placeholder="Gos, gat…" />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Mida</label>
            <Select value={mida} onChange={(e) => setMida(e.target.value)}>
              <option value="">—</option>
              {midaAnimalValues.map((v) => (
                <option key={v} value={v}>
                  {MIDA_ANIMAL_LABELS[v]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={saving}>
            <Plus className="h-4 w-4" /> Afegir
          </Button>
        </form>
      )}
    </div>
  );
}
