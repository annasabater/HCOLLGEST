'use client';

import { useState } from 'react';
import { CloudUpload, Check, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getJSON, ApiError } from '@/lib/api';

export function DriveConnect({ connectada }: { connectada: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function provar() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await getJSON<{ ok: boolean; carpeta?: string; error?: string }>(
        '/api/cron/drive-mensual?mes=actual',
      );
      setMsg(
        r.ok
          ? { tone: 'ok', text: `Fet! S’ha creat la carpeta ${r.carpeta} i s’ha pujat Hostes.xlsx al teu Drive.` }
          : { tone: 'err', text: r.error ?? 'No s’ha pogut exportar.' },
      );
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof ApiError ? e.message : 'Error provant l’export.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm text-slate-600">
      <p>
        Cada dia 1 de mes, l’app crearà al teu Google Drive la carpeta del mes (p. ex.{' '}
        <strong>2026 / juny</strong>) i hi anirà desant els documents, i mantindrà un{' '}
        <strong>Hostes.xlsx</strong> acumulatiu amb tots els clients.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/drive/connect">
          <Button type="button" variant={connectada ? 'outline' : 'primary'} size="sm">
            <CloudUpload className="h-4 w-4" />
            {connectada ? 'Reconnectar Google Drive' : 'Connectar Google Drive'}
          </Button>
        </a>
        {connectada && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={provar} disabled={busy}>
              <FolderUp className="h-4 w-4" /> {busy ? 'Provant…' : 'Provar ara'}
            </Button>
            <span className="inline-flex items-center gap-1 text-green-700">
              <Check className="h-4 w-4" /> Connectat
            </span>
          </>
        )}
      </div>
      {msg && (
        <p className={msg.tone === 'ok' ? 'text-green-700' : 'text-red-600'}>{msg.text}</p>
      )}
      {!connectada && (
        <p className="text-xs text-slate-400">
          Cal haver configurat les credencials de Google (GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET) a
          Vercel. Si en prémer «Connectar» surt un error de configuració, encara falten.
        </p>
      )}
    </div>
  );
}
