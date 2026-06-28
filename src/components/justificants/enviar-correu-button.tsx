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
    return <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3.5 w-3.5" /> Enviat</span>;
  }
  if (estat === 'error') {
    return <span className="text-xs text-red-600">{errorMsg}</span>;
  }

  return (
    <button
      type="button"
      onClick={enviar}
      disabled={estat === 'busy'}
      title="Enviar per correu a hostalcoll@gmail.com"
      className="text-slate-400 hover:text-brand-600 transition-colors disabled:opacity-40"
    >
      <Mail className="h-4 w-4" />
    </button>
  );
}
