'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Copy, Share2, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { postJSON } from '@/lib/api';
import { waLink, type Lang } from '@/lib/plantilles';
import { missatgePressupost, nomSalutacio, telefonWhatsApp } from '@/lib/pressupost-whatsapp';

interface Props {
  pressupostId: string;
  numero: string;
  idioma: Lang;
  telefon: string;
  clientNom: string;
  entrada: string | null;
  sortida: string | null;
  linies: { descripcio: string }[];
  total: number;
  iva: number;
  signatura: string;
  enviatEl: string | null; // ISO
  /** Desa el formulari abans d'enviar (perquè el PDF i el pressupost quedin com es veu). */
  desa: () => Promise<boolean>;
}

const quan = (iso: string) =>
  new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

/** Text de WhatsApp amb la negreta (*així*) per a la vista prèvia. */
function Bombolla({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap break-words rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm leading-snug text-[#111b21] shadow-sm">
      {text.split(/(\*[^*\n]+\*)/g).map((t, i) =>
        t.startsWith('*') && t.endsWith('*') && t.length > 2 ? <b key={i}>{t.slice(1, -1)}</b> : <span key={i}>{t}</span>,
      )}
    </div>
  );
}

/**
 * «Enviar per WhatsApp»: text per defecte (en l'idioma del pressupost) amb les
 * dates i el total, vista prèvia, i:
 *  - Obrir al WhatsApp (wa.me amb el número i el text; l'envies tu des d'allà).
 *  - Compartir amb el PDF (mòbil: full de compartir del sistema → WhatsApp, amb el PDF adjunt).
 *  - Descarregar el PDF (ordinador: per arrossegar-lo al xat).
 * No s'envia res sol: només s'anota quan s'ha obert el WhatsApp.
 */
export function EnviarWhatsappCard(p: Props) {
  const perDefecte = useMemo(
    () =>
      missatgePressupost({
        idioma: p.idioma,
        clientNom: p.clientNom,
        entrada: p.entrada,
        sortida: p.sortida,
        linies: p.linies,
        total: p.total,
        iva: p.iva,
        signatura: p.signatura,
      }),
    [p.idioma, p.clientNom, p.entrada, p.sortida, p.linies, p.total, p.iva, p.signatura],
  );
  const [retocat, setRetocat] = useState<string | null>(null); // null = el text per defecte
  const [veureText, setVeureText] = useState(false);
  const text = retocat ?? perDefecte;
  const numero = telefonWhatsApp(p.telefon);

  const [enviatEl, setEnviatEl] = useState(p.enviatEl);
  const [estat, setEstat] = useState<string | null>(null);
  const [ocupat, setOcupat] = useState(false);

  // El full de compartir amb fitxers només hi és al mòbil (i a alguns navegadors).
  const [potCompartir, setPotCompartir] = useState(false);
  useEffect(() => {
    try {
      const f = new File([new Blob()], 'p.pdf', { type: 'application/pdf' });
      setPotCompartir(typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] }));
    } catch {
      setPotCompartir(false);
    }
  }, []);
  // PDF preparat per compartir (si el navegador demana tornar a tocar el botó).
  const [pdfPreparat, setPdfPreparat] = useState<File | null>(null);
  useEffect(() => setPdfPreparat(null), [perDefecte, retocat]);

  async function anota() {
    try {
      const r = await postJSON<{ whatsappEnviatEl: string }>(`/api/pressupostos/${p.pressupostId}/whatsapp`, {});
      setEnviatEl(r.whatsappEnviatEl);
    } catch {
      /* no és greu: només és l'anotació */
    }
  }

  async function obreWhatsapp() {
    // La finestra s'obre dins del clic perquè el navegador no la bloquegi.
    const w = window.open('', '_blank');
    setOcupat(true);
    setEstat(null);
    const ok = await p.desa();
    setOcupat(false);
    if (!ok) {
      w?.close();
      setEstat('No s’ha pogut desar el pressupost: no s’obre el WhatsApp.');
      return;
    }
    const url = waLink(numero, text);
    if (w) w.location.href = url;
    else window.location.href = url;
    await anota();
  }

  async function comparteix() {
    setEstat(null);
    let fitxer = pdfPreparat;
    if (!fitxer) {
      setOcupat(true);
      try {
        if (!(await p.desa())) throw new Error('No s’ha pogut desar el pressupost.');
        const res = await fetch(`/api/pressupostos/${p.pressupostId}/pdf`);
        if (!res.ok) throw new Error('No s’ha pogut generar el PDF.');
        fitxer = new File([await res.blob()], `Pressupost ${p.numero} - Hostal Coll.pdf`, { type: 'application/pdf' });
        setPdfPreparat(fitxer);
      } catch (e) {
        setEstat(e instanceof Error ? e.message : 'No s’ha pogut preparar el PDF.');
        return;
      } finally {
        setOcupat(false);
      }
    }
    try {
      await navigator.share({ files: [fitxer], text });
      await anota();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // l'ha tancat
      // Alguns mòbils no deixen compartir després d'esperar el PDF: ja és a punt.
      setEstat('PDF a punt: torna a tocar «Compartir amb el PDF».');
    }
  }

  async function descarrega() {
    if (!(await p.desa())) return;
    window.location.href = `/api/pressupostos/${p.pressupostId}/pdf?descarrega=1`;
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(text);
      setEstat('Text copiat.');
    } catch {
      setEstat('No s’ha pogut copiar.');
    }
  }

  const nom = nomSalutacio(p.clientNom) || 'Client';

  return (
    <Card id="whatsapp" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Enviar per WhatsApp</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-3">
          {!numero && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Falta el telèfon del client (a «Client»). Sense telèfon, el WhatsApp s’obre perquè triïs tu el contacte.
            </p>
          )}
          {(!p.entrada || !p.sortida) && (
            <p className="text-sm text-slate-500">Sense dates d’entrada i sortida, el missatge no diu de quin dia a quin dia és.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={obreWhatsapp} disabled={ocupat}>
              <MessageCircle className="h-4 w-4" /> {ocupat ? 'Desant…' : 'Obrir al WhatsApp'}
            </Button>
            {potCompartir && (
              <Button type="button" variant="outline" onClick={comparteix} disabled={ocupat}>
                <Share2 className="h-4 w-4" /> Compartir amb el PDF
              </Button>
            )}
            {!potCompartir && (
              <Button type="button" variant="outline" onClick={descarrega} disabled={ocupat} title="Per arrossegar-lo al xat del WhatsApp de l’ordinador">
                <Download className="h-4 w-4" /> Descarregar el PDF
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={copia}>
              <Copy className="h-4 w-4" /> Copiar el text
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            {potCompartir
              ? '«Compartir amb el PDF» obre el menú del mòbil: tria WhatsApp i el contacte, i el PDF hi va adjunt.'
              : 'El WhatsApp no deixa adjuntar fitxers amb un enllaç: descarrega el PDF i arrossega’l al xat.'}
          </p>
          {estat && <p className="text-sm text-slate-700">{estat}</p>}
          {enviatEl && <p className="text-sm text-emerald-700">Enviat per WhatsApp el {quan(enviatEl)}.</p>}

          <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
            <input type="checkbox" checked={veureText} onChange={(e) => setVeureText(e.target.checked)} />
            Vull retocar el text abans d’enviar
          </label>
          {veureText && (
            <div className="space-y-2">
              <Textarea rows={10} value={text} onChange={(e) => setRetocat(e.target.value)} />
              {retocat !== null && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setRetocat(null)}>
                  <RotateCcw className="h-4 w-4" /> Torna al text per defecte
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Vista prèvia: com el rebrà el client. */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-[#efe7dd]">
          <div className="flex items-center gap-2 bg-[#008069] px-3 py-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-sm font-semibold text-[#455a64]">{nom[0]}</span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{nom}</div>
              <div className="truncate text-xs opacity-80">{numero ? `+${numero}` : 'sense telèfon'}</div>
            </div>
          </div>
          <div className="space-y-1.5 p-3 pl-8">
            {potCompartir && (
              <div className="flex items-center gap-2 rounded-lg bg-[#d9fdd3] px-2 py-1.5 text-xs text-[#111b21]">
                <span className="bg-red-600 px-1.5 py-1 text-[10px] font-bold text-white">PDF</span>
                Pressupost {p.numero} - Hostal Coll.pdf
              </div>
            )}
            <Bombolla text={text} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
