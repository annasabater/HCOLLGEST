'use client';

import { useState } from 'react';
import { CloudUpload, Check, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getJSON, ApiError } from '@/lib/api';

export function DriveConnect({ connectada }: { connectada: boolean }) {
  const [busy, setBusy] = useState<null | 'mensual' | 'diari'>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function provar(quin: 'mensual' | 'diari') {
    setBusy(quin);
    setMsg(null);
    const url = quin === 'mensual'
      ? '/api/cron/drive-mensual?mes=actual'
      : '/api/cron/drive-diari?dies=30';
    try {
      const r = await getJSON<{
        ok: boolean;
        carpeta?: string;
        fitxers?: string[];
        errors?: string[];
        error?: string;
      }>(url);
      if (r.error) {
        setMsg({ tone: 'err', text: r.error });
      } else {
        const n = r.fitxers?.length ?? 0;
        const base = `S’han pujat ${n} fitxers a la carpeta ${r.carpeta} del teu Drive (${(r.fitxers ?? []).join(', ')}).`;
        setMsg(
          r.ok
            ? { tone: 'ok', text: `Fet! ${base}` }
            : { tone: 'err', text: `${base} Amb errors: ${(r.errors ?? []).join(' · ')}` },
        );
      }
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof ApiError ? e.message : 'Error provant l’export.' });
    } finally {
      setBusy(null);
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
            <Button type="button" variant="outline" size="sm" onClick={() => provar('mensual')} disabled={!!busy}>
              <FolderUp className="h-4 w-4" /> {busy === 'mensual' ? 'Provant…' : 'Provar mensual'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => provar('diari')} disabled={!!busy}>
              <FolderUp className="h-4 w-4" /> {busy === 'diari' ? 'Provant…' : 'Provar diari (any)'}
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
