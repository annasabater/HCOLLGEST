'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface Viatger {
  id: string;
  nom: string;
  cognom1: string;
  cognom2?: string | null;
  esTitular: boolean;
}

export function FitxaExpandible({
  estanciaId,
  titular,
  numContracte,
  anyContracte,
  viatgers,
}: {
  estanciaId: string;
  titular: string;
  numContracte: string;
  anyContracte: number;
  viatgers: Viatger[];
}) {
  const [obert, setObert] = useState(true);
  const altresViatgers = viatgers.filter((v) => !v.esTitular);

  return (
    <div>
      <div className="flex items-start gap-1">
        {altresViatgers.length > 0 && (
          <button
            type="button"
            onClick={() => setObert((o) => !o)}
            className="mt-0.5 text-slate-400 hover:text-slate-600"
            title={obert ? 'Plegar' : 'Veure viatgers'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${obert ? 'rotate-180' : ''}`} />
          </button>
        )}
        <div>
          <Link href={`/estancies/${estanciaId}`} className="font-medium text-slate-900 hover:text-brand-700">
            {titular}
          </Link>
          <div className="text-xs text-slate-400">{numContracte}/{anyContracte}</div>
        </div>
      </div>
      {obert && altresViatgers.length > 0 && (
        <div className="mt-1 ml-5 space-y-0.5 border-l border-slate-100 pl-3">
          {altresViatgers.map((v) => (
            <div key={v.id} className="text-xs text-slate-500">
              {v.nom} {v.cognom1} {v.cognom2 ?? ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
