'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hand, MessageCircle, Check } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { patchJSON } from '@/lib/api';
import { fillTemplate, enviaWhatsApp, PLANTILLA_BENVINGUDA, LANGS, type Lang } from '@/lib/plantilles';

interface Viatger {
  nom: string;
  cognom1: string;
  telefon: string | null;
  esTitular: boolean;
  esMenor: boolean;
}
interface Pendent {
  id: string;
  habitacio: string | null;
  dataEntrada: string;
  dataSortida: string;
  viatgers: Viatger[];
}

function lsGet(key: string, def: string): string {
  if (typeof window === 'undefined') return def;
  return window.localStorage.getItem(key) ?? def;
}
function tplFor(lang: Lang): string {
  return lsGet(`plantilla_benvinguda_${lang}`, PLANTILLA_BENVINGUDA[lang]);
}
function benvLink(lang: Lang, nom: string, habitacio: string | null): string {
  const base = lsGet('enllac_benvinguda', 'https://hostalcoll.com/benvinguda.html');
  let url = `${base}${base.includes('?') ? '&' : '?'}lang=${lang}`;
  if (nom) url += `&g=${encodeURIComponent(nom)}`;
  if (habitacio) url += `&r=${encodeURIComponent(habitacio)}`;
  return url;
}

/**
 * Avís al tauler de benvingudes pendents (després de la primera nit). Reaprofita
 * la plantilla i l'enllaç de /plantilles (localStorage). El destinatari depèn de
 * la config: automàtica → titular (o tots si "tothom"); manual → tots els adults
 * a triar. Els menors no hi surten mai. "Feta" marca l'estada com a enviada.
 */
export function BenvingudesPendents({
  pendents,
  automatica,
  tothom,
}: {
  pendents: Pendent[];
  automatica: boolean;
  tothom: boolean;
}) {
  const router = useRouter();
  const [langs, setLangs] = useState<Record<string, Lang>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (pendents.length === 0) return null;

  function msg(lang: Lang, nom: string, habitacio: string | null): string {
    return fillTemplate(tplFor(lang), { nom, enllac: benvLink(lang, nom, habitacio) });
  }
  async function marcar(id: string) {
    setBusy(id);
    try {
      await patchJSON(`/api/estancies/${id}`, { benvingudaEnviada: true });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }
  function recipients(p: Pendent): Viatger[] {
    const adults = p.viatgers.filter((v) => !v.esMenor); // mai menors
    if (automatica && !tothom) {
      const tit = adults.find((v) => v.esTitular) ?? adults[0];
      return tit ? [tit] : [];
    }
    return adults; // automàtic+tothom, o manual → tots els adults
  }

  return (
    <Card className="mb-6 border-brand-200">
      <CardHeader className="flex items-center gap-2">
        <Hand className="h-4 w-4 text-brand-600" />
        <CardTitle>Benvingudes pendents ({pendents.length})</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {pendents.map((p) => {
          const lang = langs[p.id] ?? 'es';
          const recs = recipients(p);
          return (
            <div key={p.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">
                  {p.habitacio ? `Habitació ${p.habitacio}` : 'Sense habitació'}
                </span>
                <Select
                  value={lang}
                  onChange={(ev) => setLangs({ ...langs, [p.id]: ev.target.value as Lang })}
                  className="ml-auto h-8 w-28"
                >
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </Select>
                <Button type="button" size="sm" variant="ghost" onClick={() => marcar(p.id)} disabled={busy === p.id}>
                  <Check className="h-4 w-4" /> Feta
                </Button>
              </div>
              <div className="space-y-1.5">
                {recs.length === 0 && <p className="text-xs text-slate-400">Cap hoste adult amb dades.</p>}
                {recs.map((v, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-700">
                      {v.nom} {v.cognom1}
                      {v.esTitular ? ' · titular' : ''}
                    </span>
                    <span className="text-xs text-slate-400">{v.telefon ?? 'sense telèfon'}</span>
                    <div className="ml-auto">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!v.telefon}
                        title={v.telefon ? undefined : 'Aquest hoste no té telèfon'}
                        onClick={() => enviaWhatsApp(v.telefon, msg(lang, v.nom, p.habitacio), `${v.nom} ${v.cognom1}`)}
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
