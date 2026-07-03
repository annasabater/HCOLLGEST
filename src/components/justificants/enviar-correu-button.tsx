'use client';

import { useEffect, useState } from 'react';
import { Mail, Check, RotateCcw } from 'lucide-react';
import { postJSON, ApiError } from '@/lib/api';

const STORAGE_KEY = (apiUrl: string) => `correu_enviat:${apiUrl}`;

export function EnviarCorreuButton({ apiUrl }: { apiUrl: string }) {
  const [estat, setEstat] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [hora, setHora] = useState<string | null>(null);

  // Recupera la data d'enviament persistent del localStorage (traient l'hora si
  // el valor desat és antic i encara portava "HH:MM DD/MM").
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(apiUrl));
      if (saved) {
        setHora(saved.replace(/^\d{1,2}:\d{2}\s+/, ''));
        setEstat('ok');
      }
    } catch {}
  }, [apiUrl]);

  async function enviar() {
    if (estat === 'busy') return;
    setEstat('busy');
    setErrorMsg('');
    try {
      await postJSON(apiUrl, {});
      const ara = new Date();
      // Només la data (DD/MM), sense hora.
      const horaStr = `${ara.getDate().toString().padStart(2, '0')}/${(ara.getMonth() + 1).toString().padStart(2, '0')}`;
      try { localStorage.setItem(STORAGE_KEY(apiUrl), horaStr); } catch {}
      setHora(horaStr);
      setEstat('ok');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Error enviant');
      setEstat('error');
      setTimeout(() => setEstat('idle'), 4000);
    }
  }

  if (estat === 'ok') {
    return (
      <div className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700">
        <Check className="h-3.5 w-3.5 shrink-0" />
        Enviat{hora ? ` ${hora}` : ''}
        <button
          onClick={enviar}
          title="Tornar a enviar"
          className="ml-1 rounded p-0.5 text-green-500 hover:bg-green-100 hover:text-green-700"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
    );
  }
  if (estat === 'error') {
    return (
      <span className="inline-flex max-w-[200px] truncate rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600" title={errorMsg}>
        {errorMsg}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enviar}
      disabled={estat === 'busy'}
      title="Enviar per correu a hostalcoll@gmail.com"
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-40"
    >
      <Mail className="h-3.5 w-3.5" />
      {estat === 'busy' ? '…' : ''}
    </button>
  );
}
