'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { patchJSON, ApiError } from '@/lib/api';

export function ConvertirAEnCurs({
  estanciaId,
  numContracteActual,
}: {
  estanciaId: string;
  numContracteActual?: string | null;
}) {
  const router = useRouter();
  const [obert, setObert] = useState(false);
  const [numContracte, setNumContracte] = useState(numContracteActual ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function checkin() {
    if (!numContracte.trim()) {
      setErr('El número de contracte és obligatori per fer el check-in');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, {
        estat: 'EN_CURS',
        tipusRegistre: 'CONTRACTE_EN_CURS',
        numContracte: numContracte.trim(),
      });
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Error en fer el check-in');
      setLoading(false);
    }
  }

  if (!obert) {
    return (
      <Button size="sm" onClick={() => setObert(true)}>
        <LogIn className="h-4 w-4" /> Check-in <ChevronDown className="h-3 w-3 ml-0.5" />
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-300 bg-brand-50 p-4 shadow-md w-80">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-brand-900 text-sm flex items-center gap-1.5">
          <LogIn className="h-4 w-4" /> Convertir a contracte en curs
        </p>
        <button onClick={() => setObert(false)} className="text-slate-400 hover:text-slate-600">
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Assigna el número de contracte i completa les dades del viatger si cal.
      </p>

      <Field label="Número de contracte *">
        <Input
          value={numContracte}
          onChange={(e) => setNumContracte(e.target.value)}
          placeholder="Ex: 42"
          autoFocus
        />
      </Field>

      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}

      <div className="mt-3 flex flex-col gap-2">
        <Button onClick={checkin} disabled={loading || !numContracte.trim()} className="w-full justify-center">
          <LogIn className="h-4 w-4" />
          {loading ? 'Processant…' : 'Fer check-in'}
        </Button>
        <a
          href={`/estancies/${estanciaId}/edita`}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Editar totes les dades primer
        </a>
      </div>
    </div>
  );
}
