'use client';

import { useState } from 'react';
import { Mail, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { postJSON, ApiError } from '@/lib/api';

export function EnviarCorreuButton({
  apiUrl,
  defaultEmail,
}: {
  apiUrl: string;
  defaultEmail?: string;
}) {
  const [obert, setObert] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [busy, setBusy] = useState(false);
  const [missatge, setMissatge] = useState<{ ok: boolean; text: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setMissatge(null);
    try {
      await postJSON(apiUrl, { to: email });
      setMissatge({ ok: true, text: `Enviat a ${email}` });
      setTimeout(() => { setObert(false); setMissatge(null); }, 2000);
    } catch (err) {
      setMissatge({ ok: false, text: err instanceof ApiError ? err.message : 'Error enviant' });
    } finally {
      setBusy(false);
    }
  }

  if (!obert) {
    return (
      <button
        type="button"
        onClick={() => setObert(true)}
        title="Enviar per correu"
        className="text-slate-400 hover:text-brand-600 transition-colors"
      >
        <Mail className="h-4 w-4" />
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="flex items-center gap-1">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correu@exemple.com"
        className="h-7 w-48 text-xs"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={busy || !email} className="h-7 px-2">
        <Send className="h-3.5 w-3.5" />
      </Button>
      <button type="button" onClick={() => { setObert(false); setMissatge(null); }} className="text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
      {missatge && (
        <span className={`text-xs ${missatge.ok ? 'text-green-600' : 'text-red-600'}`}>
          {missatge.text}
        </span>
      )}
    </form>
  );
}
