'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Plus, Star, Trash2 } from 'lucide-react';
import { ApiError, delJSON, patchJSON, postJSON } from '@/lib/api';
import {
  dataRessenyaText,
  estrelles,
  IDIOMES_WEB,
  ordenaPublicades,
  textCurt,
  type IdiomaWeb,
  type Traduccions,
} from '@/lib/ressenyes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Estat = 'PENDENT' | 'PUBLICADA' | 'AMAGADA';

export interface RessenyaVista {
  id: string;
  font: string;
  autor: string;
  puntuacio: number;
  text: string | null;
  idioma: string | null;
  dataRessenya: string;
  dataPrecisio: string;
  resposta: string | null;
  estat: Estat;
  destacada: boolean;
  ordre: number;
  traduccions: Traduccions | null;
}

const IDIOMA_WEB_LABEL: Record<IdiomaWeb, string> = { es: 'Castellà', ca: 'Català', en: 'Anglès', fr: 'Francès' };

interface GoogleResum {
  nota: number | null;
  total: number | null;
  url: string | null;
}

const IDIOMES: [string, string][] = [
  ['ca', 'Català'],
  ['es', 'Castellà'],
  ['en', 'Anglès'],
  ['fr', 'Francès'],
  ['de', 'Alemany'],
  ['it', 'Italià'],
  ['nl', 'Neerlandès'],
];
const IDIOMA_LABEL = Object.fromEntries(IDIOMES);

const ESTAT_BADGE: Record<Estat, { text: string; tone: 'warning' | 'success' | 'neutral' }> = {
  PENDENT: { text: 'Pendent', tone: 'warning' },
  PUBLICADA: { text: 'A la web', tone: 'success' },
  AMAGADA: { text: 'Amagada', tone: 'neutral' },
};

type Filtre = Estat | 'TOTES';

export function ModeracioRessenyes({
  ressenyes,
  google,
  canWrite,
}: {
  ressenyes: RessenyaVista[];
  google: GoogleResum;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nova, setNova] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Estat, number> = { PENDENT: 0, PUBLICADA: 0, AMAGADA: 0 };
    for (const r of ressenyes) c[r.estat]++;
    return c;
  }, [ressenyes]);

  const [filtre, setFiltre] = useState<Filtre>(counts.PENDENT > 0 ? 'PENDENT' : 'PUBLICADA');

  const publicades = useMemo(
    () =>
      ordenaPublicades(
        ressenyes
          .filter((r) => r.estat === 'PUBLICADA')
          .map((r) => ({ ...r, dataRessenya: new Date(r.dataRessenya) })),
      ),
    [ressenyes],
  );
  const visibles =
    filtre === 'TOTES'
      ? ressenyes
      : filtre === 'PUBLICADA'
        ? publicades.map((p) => ressenyes.find((r) => r.id === p.id)!)
        : ressenyes.filter((r) => r.estat === filtre);

  async function accio(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No s’ha pogut desar el canvi.');
    } finally {
      setBusy(null);
    }
  }

  const patch = (id: string, body: unknown) => accio(id, () => patchJSON(`/api/ressenyes/${id}`, body));

  const TABS: { key: Filtre; label: string; n: number }[] = [
    { key: 'PENDENT', label: 'Pendents', n: counts.PENDENT },
    { key: 'PUBLICADA', label: 'A la web', n: counts.PUBLICADA },
    { key: 'AMAGADA', label: 'Amagades', n: counts.AMAGADA },
    { key: 'TOTES', label: 'Totes', n: ressenyes.length },
  ];

  return (
    <div className="space-y-6">
      {/* Resum */}
      <section aria-label="Resum" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Card>
          <CardBody className="space-y-1 px-4 py-3 sm:px-5 sm:py-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              Nota a Google
            </span>
            {google.nota != null ? (
              <p className="font-serif text-3xl font-semibold leading-none text-slate-900 sm:text-4xl">
                {google.nota.toLocaleString('ca-ES', { minimumFractionDigits: 1 })}{' '}
                <span className="text-2xl text-amber-600 sm:text-3xl">★</span>
              </p>
            ) : (
              <p className="font-serif text-3xl font-semibold leading-none text-slate-300 sm:text-4xl">—</p>
            )}
            <p className="text-xs text-slate-500">
              {google.total != null ? `${google.total} ressenyes en total` : 'Sense configurar'}
            </p>
          </CardBody>
        </Card>
        <Stat label="Pendents" valor={counts.PENDENT} nota="per revisar" className="text-brand-700" />
        <Stat label="A la web" valor={counts.PUBLICADA} nota="publicades" className="text-green-700" />
        <Stat label="Amagades" valor={counts.AMAGADA} nota="no surten a la web" className="text-slate-500" />
      </section>

      {/* Al mòbil la vista prèvia no hi cap: enllaç directe a la secció de la web. */}
      <a
        href="https://hostalcoll.com/#resenas"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700 lg:hidden"
      >
        Veure com queden a hostalcoll.com <ExternalLink className="h-4 w-4" />
      </a>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        {/* Llista */}
        <section aria-label="Llista de ressenyes" className="min-w-0 flex-[999_1_520px] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Al mòbil, una sola fila que es pot lliscar. */}
            <div
              role="tablist"
              aria-label="Filtre per estat"
              className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={filtre === t.key}
                  onClick={() => setFiltre(t.key)}
                  className={cn(
                    'h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors sm:h-9',
                    filtre === t.key
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {t.label} <span className="opacity-75">· {t.n}</span>
                </button>
              ))}
            </div>
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNova((v) => !v)}
                className="h-10 w-full sm:h-8 sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Afegeix ressenya
              </Button>
            )}
          </div>

          {nova && canWrite && (
            <NovaRessenya
              onDesat={() => {
                setNova(false);
                setFiltre('PENDENT');
                router.refresh();
              }}
              onCancel={() => setNova(false)}
            />
          )}

          {visibles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              {ressenyes.length === 0
                ? 'Encara no hi ha cap ressenya. Copia-les de Google amb «Afegeix ressenya» (la sincronització automàtica arribarà quan Google aprovi l’accés).'
                : 'No hi ha ressenyes en aquest estat.'}
            </div>
          ) : (
            visibles.map((r) => {
              const posPub = publicades.findIndex((p) => p.id === r.id);
              const ocupat = busy === r.id;
              return (
                <Card key={r.id}>
                  <CardBody className="space-y-3 px-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <div
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700 sm:h-10 sm:w-10"
                      >
                        {r.autor.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <p className="min-w-0 break-words font-semibold text-slate-900">{r.autor}</p>
                          <div className="flex items-center gap-2">
                            <span
                              role="img"
                              aria-label={`${r.puntuacio} de 5 estrelles`}
                              className="text-base tracking-wider text-amber-600 sm:text-lg"
                            >
                              {estrelles(r.puntuacio)}
                            </span>
                            <Badge tone={ESTAT_BADGE[r.estat].tone}>{ESTAT_BADGE[r.estat].text}</Badge>
                          </div>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {dataRessenyaText(r.dataRessenya, r.dataPrecisio)} ·{' '}
                          {r.font === 'GOOGLE'
                            ? 'Google'
                            : r.font === 'WEB'
                              ? 'Google (importada de la web)'
                              : 'Google (afegida a mà)'}
                          {r.idioma && ` · ${IDIOMA_LABEL[r.idioma] ?? r.idioma}`}
                          {r.estat === 'PUBLICADA' && posPub >= 0 && ` · #${posPub + 1} a la web`}
                        </p>
                      </div>
                    </div>

                    {r.text ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{r.text}</p>
                    ) : (
                      <p className="text-sm italic text-slate-400">Només puntuació, sense text.</p>
                    )}

                    {r.text &&
                      (r.traduccions ? (
                        <details className="group rounded-lg border border-slate-100 px-3 py-2 text-sm">
                          <summary className="cursor-pointer select-none text-xs font-semibold text-slate-600">
                            Traduccions per a la web · ES · CA · EN · FR
                          </summary>
                          <dl className="mt-2 space-y-2">
                            {IDIOMES_WEB.map((l) => (
                              <div key={l}>
                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  {IDIOMA_WEB_LABEL[l]}
                                  {r.idioma === l && ' · original'}
                                </dt>
                                <dd lang={l} className="whitespace-pre-line text-slate-700">
                                  {r.traduccions?.[l]}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          {canWrite && (
                            <button
                              type="button"
                              disabled={ocupat}
                              onClick={() => void accio(r.id, () => postJSON(`/api/ressenyes/${r.id}/tradueix`, {}))}
                              className="mt-2 text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
                            >
                              {ocupat ? 'Traduint…' : 'Torna a traduir'}
                            </button>
                          )}
                        </details>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          <span>
                            Sense traduir: a la web sortirà en l’idioma original en tots els idiomes.
                          </span>
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ocupat}
                              onClick={() => void accio(r.id, () => postJSON(`/api/ressenyes/${r.id}/tradueix`, {}))}
                            >
                              {ocupat ? 'Traduint…' : 'Tradueix'}
                            </Button>
                          )}
                        </div>
                      ))}

                    {r.resposta && (
                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <strong className="text-brand-700">Resposta de l’hostal:</strong> {r.resposta}
                      </div>
                    )}

                    {canWrite && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 [&>button]:h-10 [&>button]:flex-1 sm:[&>button]:h-8 sm:[&>button]:flex-none">
                        {r.estat === 'PENDENT' && (
                          <>
                            <Button size="sm" disabled={ocupat} onClick={() => patch(r.id, { estat: 'PUBLICADA' })}>
                              Publica a la web
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ocupat}
                              onClick={() => patch(r.id, { estat: 'AMAGADA' })}
                            >
                              No la mostris
                            </Button>
                          </>
                        )}
                        {r.estat === 'PUBLICADA' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ocupat}
                              aria-pressed={r.destacada}
                              onClick={() => patch(r.id, { destacada: !r.destacada })}
                              className={cn(r.destacada && 'border-amber-400 bg-amber-50 text-amber-900')}
                            >
                              <Star className={cn('h-4 w-4', r.destacada && 'fill-amber-500 text-amber-500')} />
                              {r.destacada ? 'Destacada' : 'Destaca'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ocupat}
                              onClick={() => patch(r.id, { estat: 'AMAGADA' })}
                            >
                              Treu de la web
                            </Button>
                          </>
                        )}
                        {r.estat === 'AMAGADA' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={ocupat}
                            onClick={() => patch(r.id, { estat: 'PUBLICADA' })}
                          >
                            Publica a la web
                          </Button>
                        )}
                        <span className="hidden flex-1 sm:block" />
                        {r.font === 'MANUAL' && (
                          <button
                            type="button"
                            disabled={ocupat}
                            onClick={() => {
                              if (!confirm('Eliminar aquesta ressenya afegida a mà? No es pot desfer.')) return;
                              void accio(r.id, () => delJSON(`/api/ressenyes/${r.id}`));
                            }}
                            className="!flex-none rounded p-2.5 text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50 sm:p-2"
                            aria-label="Eliminar ressenya"
                            title="Eliminar (només les afegides a mà)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })
          )}
        </section>

        {/* Vista prèvia */}
        <aside aria-label="Vista prèvia a la web" className="hidden min-w-0 flex-[1_1_300px] space-y-4 lg:block">
          <Card>
            <CardHeader className="flex items-baseline justify-between gap-2">
              <CardTitle>Així surt a la web</CardTitle>
              <a
                href="https://hostalcoll.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                hostalcoll.com <ExternalLink className="h-3 w-3" />
              </a>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {google.nota != null ? (
                  <>
                    <strong>{google.nota.toLocaleString('ca-ES', { minimumFractionDigits: 1 })} ★</strong> a Google
                    {google.total != null && ` · ${google.total} ressenyes`} ·{' '}
                    <span className="underline">Veure-les totes</span>
                  </>
                ) : (
                  'Falta la nota de Google'
                )}
              </p>
              {publicades.length === 0 ? (
                <p className="text-sm text-slate-400">Encara no n’hi ha cap de publicada.</p>
              ) : (
                publicades.map((p) => (
                  <div key={p.id} className="space-y-1 rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex justify-between gap-2 text-xs">
                      <strong className="text-slate-800">{p.autor}</strong>
                      <span className="text-amber-600">{'★'.repeat(p.puntuacio)}</span>
                    </div>
                    {p.text && <p className="text-xs leading-relaxed text-slate-600">{textCurt(p.text, 110)}</p>}
                    {p.destacada && (
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                        Destacada · surt primer
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, valor, nota, className }: { label: string; valor: number; nota: string; className?: string }) {
  return (
    <Card>
      <CardBody className="space-y-1 px-4 py-3 sm:px-5 sm:py-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">{label}</span>
        <p className={cn('font-serif text-3xl font-semibold leading-none sm:text-4xl', className)}>{valor}</p>
        <p className="text-xs text-slate-500">{nota}</p>
      </CardBody>
    </Card>
  );
}

function NovaRessenya({ onDesat, onCancel }: { onDesat: () => void; onCancel: () => void }) {
  const [autor, setAutor] = useState('');
  const [puntuacio, setPuntuacio] = useState('5');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [idioma, setIdioma] = useState('');
  const [text, setText] = useState('');
  const [resposta, setResposta] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJSON('/api/ressenyes', { autor, puntuacio, dataRessenya: data, idioma, text, resposta });
      onDesat();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No s’ha pogut desar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-brand-200">
      <CardHeader>
        <CardTitle>Nova ressenya de Google</CardTitle>
        <p className="mt-1 text-xs text-slate-500">
          Copia-la tal com surt a Google, sense canviar res: entra com a pendent i després decideixes si es publica.
          En desar-la es tradueix sola a castellà, català, anglès i francès per a la web.
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={desa} className="grid gap-4 sm:grid-cols-2">
          <Field label="Autor (com surt a Google)" htmlFor="r-autor" required>
            <Input id="r-autor" required maxLength={80} value={autor} onChange={(e) => setAutor(e.target.value)} />
          </Field>
          {/* Mòbil: estrelles + idioma en una fila i la data a sota; ordinador: les tres en fila. */}
          <div className="grid grid-flow-row-dense grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Estrelles" htmlFor="r-punts" required>
              <Select id="r-punts" value={puntuacio} onChange={(e) => setPuntuacio(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data" htmlFor="r-data" required className="col-span-2 sm:col-span-1">
              <Input id="r-data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Field label="Idioma" htmlFor="r-idioma">
              <Select id="r-idioma" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                <option value="">—</option>
                {IDIOMES.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Text de la ressenya" htmlFor="r-text" className="sm:col-span-2">
            <Textarea id="r-text" rows={4} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <Field
            label="Resposta de l’hostal a Google (si n’hi ha)"
            htmlFor="r-resposta"
            className="sm:col-span-2"
          >
            <Textarea
              id="r-resposta"
              rows={2}
              maxLength={4000}
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm font-medium text-red-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2 [&>button]:h-10 [&>button]:flex-1 sm:[&>button]:flex-none">
            <Button type="submit" disabled={busy}>
              {busy ? 'Desant i traduint…' : 'Desa com a pendent'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel·la
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
