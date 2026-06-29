'use client';

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { postJSON, ApiError } from '@/lib/api';

export function EnviarCorreuButton({ apiUrl }: { apiUrl: string }) {
  const [estat, setEstat] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function enviar() {
    if (estat === 'busy') return;
    setEstat('busy');
    setErrorMsg('');
    try {
      await postJSON(apiUrl, {});
      setEstat('ok');
      setTimeout(() => setEstat('idle'), 2500);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Error enviant');
      setEstat('error');
      setTimeout(() => setEstat('idle'), 3000);
    }
  }

  if (estat === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
        <Check className="h-3.5 w-3.5" /> Enviat
      </span>
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
    </button>
  );
}
