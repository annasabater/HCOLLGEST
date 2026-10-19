'use client';

/**
 * Presentació directa a l'AEAT (PresBasicaDos) des de /impostos:
 *  - CertificatAeatCard: pujar/treure el certificat de la titular i triar
 *    l'entorn (proves o producció).
 *  - PresentarAeat: botó «Presentar a l'AEAT» de cada model, amb el resum, la
 *    conformitat explícita i la contrasenya del certificat (mai es desa).
 */
import { useEffect, useState } from 'react';
import { KeyRound, Send, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getJSON, patchJSON, delJSON, postJSON, ApiError } from '@/lib/api';
import { formatEur, cn } from '@/lib/utils';
import type { ResultatPresentacioApp } from '@/lib/services/aeat';

export interface InfoCertificatAeat {
  configurat: boolean;
  nif: string | null;
  nom: string | null;
  caduca: string | null;
  entorn: 'proves' | 'produccio';
}

// Una sola petició per a totes les targetes de la pàgina.
let pendent: Promise<InfoCertificatAeat> | null = null;
const carregaInfo = (forca = false) => {
  if (!pendent || forca) pendent = getJSON<InfoCertificatAeat>('/api/aeat/certificat');
  return pendent;
};
const avisa = () => window.dispatchEvent(new Event('certificat-aeat'));

function useCertificat(): InfoCertificatAeat | null {
  const [info, setInfo] = useState<InfoCertificatAeat | null>(null);
  useEffect(() => {
    const llegeix = () => void carregaInfo().then(setInfo).catch(() => setInfo(null));
    llegeix();
    window.addEventListener('certificat-aeat', llegeix);
    return () => window.removeEventListener('certificat-aeat', llegeix);
  }, []);
  return info;
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const diesFins = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

export function CertificatAeatCard() {
  const info = useCertificat();
  const [fitxer, setFitxer] = useState<File | null>(null);
  const [contrasenya, setContrasenya] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function puja() {
    if (!fitxer || !contrasenya) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('fitxer', fitxer);
      fd.append('contrasenya', contrasenya);
      const res = await fetch('/api/aeat/certificat', { method: 'POST', body: fd });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(j?.error ?? 'No s’ha pogut pujar el certificat');
      setFitxer(null);
      setContrasenya('');
      setMsg({ tone: 'ok', text: 'Certificat desat (xifrat). La contrasenya no s’ha desat: te la demanarem a cada presentació.' });
      await carregaInfo(true);
      avisa();
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusy(false);
    }
  }

  async function canviaEntorn(entorn: 'proves' | 'produccio') {
    if (entorn === 'produccio' && !confirm('A PRODUCCIÓ les declaracions es presenten DE VERITAT a Hisenda i no es poden anul·lar. Hi passem?')) return;
    await patchJSON('/api/aeat/certificat', { entorn });
    await carregaInfo(true);
    avisa();
  }

  async function treu() {
    if (!confirm('Vols esborrar el certificat del servidor?')) return;
    await delJSON('/api/aeat/certificat');
    await carregaInfo(true);
    avisa();
  }

  const titol = info?.configurat ? `Presentació directa a l’AEAT · ${info.entorn === 'produccio' ? 'PRODUCCIÓ' : 'PROVES'}` : 'Presentació directa a l’AEAT';
  return (
    <div className="mt-6">
      <CollapsibleCard title={titol} icon={<KeyRound className="h-5 w-5 text-brand-700" />}>
        <div className="space-y-4 text-sm text-slate-700">
          <p className="text-xs text-slate-500">
            Amb el certificat digital de la titular (fitxer .p12/.pfx de la FNMT), el 303, el 130 i el 115 es presenten des d’aquí amb un botó.
            El certificat es desa <b>xifrat</b> i la <b>contrasenya no es desa mai</b>: l’hauràs d’escriure a cada presentació.
          </p>

          {info?.configurat ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <p><b>{info.nom}</b> · NIF {info.nif}</p>
              {info.caduca && (
                <p className={cn('text-xs', diesFins(info.caduca) < 60 ? 'text-amber-700' : 'text-slate-500')}>
                  Caduca el {dataCurta(info.caduca)}{diesFins(info.caduca) < 60 ? ` (en ${diesFins(info.caduca)} dies: renova’l a la FNMT)` : ''}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Entorn:</span>
                <Button size="sm" variant={info.entorn === 'proves' ? 'primary' : 'outline'} onClick={() => void canviaEntorn('proves')}>Proves</Button>
                <Button size="sm" variant={info.entorn === 'produccio' ? 'primary' : 'outline'} onClick={() => void canviaEntorn('produccio')}>Producció (real)</Button>
                <Button size="sm" variant="ghost" onClick={() => void treu()}><Trash2 className="h-4 w-4" /> Esborra el certificat</Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {info.entorn === 'proves'
                  ? 'Proves: l’AEAT rep la declaració al seu entorn de proves (laborables de 8 a 15 h) i no compta. Fes-hi una prova abans de passar a producció.'
                  : 'Producció: les declaracions es presenten de veritat i no es poden anul·lar.'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Encara no hi ha cap certificat.</p>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs text-slate-600">
              {info?.configurat ? 'Substituir el certificat' : 'Certificat (.p12 o .pfx)'}
              <Input type="file" accept=".p12,.pfx,application/x-pkcs12" onChange={(e) => setFitxer(e.target.files?.[0] ?? null)} />
            </label>
            <label className="text-xs text-slate-600">
              Contrasenya del certificat
              <Input type="password" autoComplete="off" value={contrasenya} onChange={(e) => setContrasenya(e.target.value)} />
            </label>
            <Button size="sm" onClick={() => void puja()} disabled={busy || !fitxer || !contrasenya}><Upload className="h-4 w-4" /> Puja</Button>
          </div>
          {msg && <p className={cn('text-xs', msg.tone === 'ok' ? 'text-green-700' : 'text-red-700')}>{msg.text}</p>}
        </div>
      </CollapsibleCard>
    </div>
  );
}

export function PresentarAeat({
  model, any, periode, resum, importResultat, pagament, onFet,
}: {
  model: '303' | '130' | '115';
  any: number;
  periode: number;
  /** Text del resultat («A ingressar», «A compensar»…). */
  resum: string;
  /** Import del resultat (positiu = a ingressar). */
  importResultat: number;
  /** «U» domiciliació o «I» ingrés (fora del termini de domiciliació). */
  pagament: 'U' | 'I';
  onFet: () => Promise<void>;
}) {
  const info = useCertificat();
  const [obert, setObert] = useState(false);
  const [conforme, setConforme] = useState(false);
  const [contrasenya, setContrasenya] = useState('');
  const [nrc, setNrc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [r, setR] = useState<ResultatPresentacioApp | null>(null);

  if (!info?.configurat) return null;
  const real = info.entorn === 'produccio';
  const calNrc = importResultat > 0 && pagament === 'I';

  async function presenta() {
    setBusy(true);
    setErr(null);
    setR(null);
    try {
      const res = await postJSON<ResultatPresentacioApp>('/api/impostos/presentar', {
        model, any, trimestre: periode, pagament, contrasenya, nrc: calNrc ? nrc : undefined, conformitat: true,
      });
      setR(res);
      setContrasenya('');
      if (res.ok && res.entorn === 'produccio') await onFet();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut presentar');
    } finally {
      setBusy(false);
    }
  }

  if (!obert) {
    return (
      <Button size="sm" variant={real ? 'primary' : 'outline'} onClick={() => { setObert(true); setR(null); setErr(null); setConforme(false); }}>
        <Send className="h-4 w-4" /> {real ? 'Presentar a l’AEAT' : 'Presentar a l’AEAT (proves)'}
      </Button>
    );
  }

  return (
    <div className={cn('w-full space-y-3 rounded-lg border p-3 text-sm', real ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50')}>
      {r?.ok ? (
        <div className="space-y-1 text-green-900">
          <p className="font-semibold">{r.entorn === 'produccio' ? 'Presentada a l’AEAT ✓' : 'Prova correcta: l’AEAT l’ha acceptada al seu entorn de proves (no compta).'}</p>
          <p className="text-xs">CSV {r.csv}{r.justificant ? ` · justificant ${r.justificant}` : ''}{r.data ? ` · ${r.data} ${r.hora ?? ''}` : ''}</p>
          {r.avisos.length > 0 && <ul className="list-disc pl-4 text-xs text-amber-800">{r.avisos.map((a) => <li key={a}>{a}</li>)}</ul>}
          {r.entorn === 'produccio' && (
            <a className="text-xs font-semibold underline" href={`/api/impostos/justificant?model=${model}&any=${any}&periode=${periode}`} target="_blank" rel="noreferrer">
              Obre el justificant (PDF)
            </a>
          )}
          <div><Button size="sm" variant="ghost" onClick={() => setObert(false)}>Tanca</Button></div>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 font-semibold">
            {real ? <ShieldAlert className="h-4 w-4 text-brand-700" /> : null}
            {real ? 'Presentació REAL a Hisenda (no es pot anul·lar)' : 'Presentació de PROVA (entorn de proves de l’AEAT)'}
          </p>
          <ul className="space-y-0.5 text-xs text-slate-700">
            <li>Model {model} · {periode}T {any} · {resum}: <b>{formatEur(Math.abs(importResultat))}</b></li>
            {importResultat > 0 && <li>Pagament: {pagament === 'U' ? 'domiciliació (l’AEAT el carrega l’últim dia del termini al compte de la configuració)' : 'ingrés amb NRC (ja l’has pagat al banc)'}</li>}
            <li>Presentadora: {info.nom} · NIF {info.nif}</li>
          </ul>
          {calNrc && (
            <label className="block text-xs text-slate-600">
              NRC del pagament (22 caràcters, el dona el banc en pagar)
              <Input value={nrc} onChange={(e) => setNrc(e.target.value)} maxLength={26} />
            </label>
          )}
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={conforme} onChange={(e) => setConforme(e.target.checked)} />
            <span>He revisat les caselles i l’esborrany («Validar a l’AEAT») i <b>dono la meva conformitat</b> a aquestes dades per presentar la declaració.</span>
          </label>
          <label className="block text-xs text-slate-600">
            Contrasenya del certificat
            <Input type="password" autoComplete="off" value={contrasenya} onChange={(e) => setContrasenya(e.target.value)} />
          </label>
          {err && <p className="text-xs text-red-700">{err}</p>}
          {r && !r.ok && (
            <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-900">
              <p className="font-semibold">{r.validacio ? 'L’AEAT hi ha trobat errors (no s’ha presentat):' : 'L’AEAT no l’ha acceptada:'}</p>
              <ul className="list-disc pl-4">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void presenta()} disabled={busy || !conforme || !contrasenya || (calNrc && nrc.trim().length < 22)}>
              <Send className="h-4 w-4" /> {busy ? 'Presentant…' : real ? 'Presenta-la ara' : 'Envia la prova'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setObert(false)} disabled={busy}>Cancel·la</Button>
          </div>
        </>
      )}
    </div>
  );
}
