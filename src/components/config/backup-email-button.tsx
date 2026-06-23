'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackupEmailButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function send() {
    setState('sending');
    setMsg('');
    try {
      const res = await fetch('/api/cron/backup', { credentials: 'same-origin' });
      const data = await res.json();
      if (data.sent) {
        setState('ok');
        setMsg(`Enviat a ${data.to}`);
      } else {
        setState('err');
        setMsg(data.error || 'No s’ha pogut enviar (cal configurar RESEND_API_KEY).');
      }
    } catch {
      setState('err');
      setMsg('Error enviant el correu.');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={send} disabled={state === 'sending'}>
        <Mail className="h-4 w-4" /> {state === 'sending' ? 'Enviant…' : 'Enviar còpia per correu ara'}
      </Button>
      {msg && <span className={`text-sm ${state === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
    </div>
  );
}
