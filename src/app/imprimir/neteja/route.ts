import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getPlanificacio } from '@/lib/services/neteja-planificacio';
import type { DiaNeteja, SetmanaNeteja } from '@/lib/neteja-planificacio';

export const dynamic = 'force-dynamic';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dllarg = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dcurt = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
const RE = /^\d{4}-\d{2}-\d{2}$/;
const DIES = ['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds'];

/**
 * GET /imprimir/neteja?desde=&fins=[&auto=1] — el full de neteja com el que es feia
 * a mà: files de 3 setmanes, cada setmana amb els seus dies (mínim 2 caselles; les
 * buides, per escriure-hi a mà). A cada dia, les habitacions amb sortida o
 * manteniment, les observacions i si està feta / per pagar / planificada.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const p = new URL(req.url).searchParams;
  const avui = new Date().toISOString().slice(0, 10);
  const desde = RE.test(p.get('desde') ?? '') ? p.get('desde')! : `${avui.slice(0, 8)}01`;
  const fins = RE.test(p.get('fins') ?? '') ? p.get('fins')! : avui;
  const auto = p.get('auto') === '1';

  const { setmanes, treballadors, resum } = await getPlanificacio(desde, fins);
  const persones = [
    ...new Set(setmanes.flatMap((s) => s.dies.map((d) => d.treballadorId)).filter((x): x is string => !!x)),
  ].map((id) => treballadors.find((t) => t.id === id)?.nom ?? '');

  const cela = (d: DiaNeteja | null) => {
    if (!d) return '<div class="dia buit"><div class="cap">&nbsp;</div></div>';
    const marca = d.fet && d.pendent
      ? '<span class="pl">DESADA</span>'
      : d.fet
      ? d.pagament === 'PER_PAGAR'
        ? '<span class="pp">PER PAGAR</span>'
        : d.pagament === 'PAGAT'
          ? '<span class="ok">✓ pagat</span>'
          : '<span class="ok">✓</span>'
      : '<span class="pl">PLANIF.</span>';
    const habs = d.habitacions
      .map(
        (h) =>
          `<div class="h"><b>${esc(h.habitacioId ? h.nom : 'Zones')}</b> ${
            h.tipus === 'CANVI_COMPLET' ? '<span class="s">sortida</span>' : '<span class="m">mant.</span>'
          }${h.bugaderia ? ' <span class="nt">· bugaderia</span>' : ''}${h.nota ? ` <span class="nt">· ${esc(h.nota)}</span>` : ''}</div>`,
      )
      .join('');
    const dow = DIES[new Date(`${d.data}T00:00:00Z`).getUTCDay()];
    return `<div class="dia"><div class="cap"><b>${dow} ${dcurt(d.data)}</b>${marca}</div>${habs}${d.nota ? `<div class="nd">${esc(d.nota.text)}</div>` : ''}</div>`;
  };

  const setmana = (s: SetmanaNeteja, i: number) => {
    const dies: (DiaNeteja | null)[] = [...s.dies];
    while (dies.length < 2) dies.push(null);
    return `<div class="set${i % 2 ? ' alt' : ''}"><div class="rang">${dcurt(s.dilluns)} – ${dcurt(s.diumenge)}</div><div class="dies">${dies
      .map(cela)
      .join('')}</div>${s.nota ? `<div class="ns">${esc(s.nota.text)}</div>` : ''}</div>`;
  };

  const files: string[] = [];
  for (let i = 0; i < setmanes.length; i += 3) {
    const tros = setmanes.slice(i, i + 3);
    files.push(`<div class="fila">${tros.map((s, j) => setmana(s, i + j)).join('')}${'<div class="set buida"></div>'.repeat(3 - tros.length)}</div>`);
  }

  const html = `<!doctype html>
<html lang="ca"><head><meta charset="utf-8"><title>Neteja</title>
<style>
@page { size: A4 portrait; margin: 11mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 11px/1.4 Arial, Helvetica, sans-serif; color: #222; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #7a1f2b; padding-bottom: 9px; margin-bottom: 8px; }
.marca { font-size: 9.5px; font-weight: 700; letter-spacing: .28em; color: #7a1f2b; }
h1 { margin: 2px 0 0; font-size: 21px; font-weight: 600; }
.per { text-align: right; font-size: 12px; color: #555; }
.per small { color: #999; }
.fila { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1.5px solid #7a1f2b; break-inside: avoid; }
.set { border-right: 1px solid #e7d3d6; padding: 4px 0 5px; }
.set:last-child { border-right: 0; }
.set.alt { background: #f9eff0; }
.rang { font-size: 8.5px; font-weight: 700; letter-spacing: .1em; color: #999; padding: 0 6px 2px; }
.dies { display: flex; }
.dia { flex: 1; min-width: 0; padding: 0 6px; min-height: 78px; }
.dia + .dia { border-left: 1px dashed #e2c8cc; }
.cap { display: flex; align-items: baseline; gap: 4px; border-bottom: 1px solid #d9b9be; margin-bottom: 3px; padding-bottom: 1px; }
.cap b { font-size: 11px; color: #7a1f2b; flex: 1; }
.h { font-size: 10.5px; line-height: 1.45; }
.s { color: #7a1f2b; font-weight: 700; }
.m { color: #666; }
.nt, .nd { color: #666; font-style: italic; }
.nd { font-size: 9.5px; margin-top: 2px; }
.ns { font-size: 9.5px; color: #78350f; padding: 3px 6px 0; border-top: 1px dashed #e7d3d6; margin-top: 3px; }
.ok { font-size: 9px; color: #047857; font-weight: 700; }
.pp { font-size: 7.5px; font-weight: 800; background: #7a1f2b; color: #fff; padding: 0 4px; }
.pl { font-size: 7.5px; font-weight: 700; color: #94a3b8; }
.llegenda { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 10px; color: #555; }
.resum { margin-top: 8px; border: 1px solid #e7d3d6; padding: 7px 9px; font-size: 11px; }
.resum b.t { color: #7a1f2b; }
footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e4e4e4; font-size: 9px; color: #999; }
@media screen {
  body { background: #e9e9e9; padding: 18px 12px; }
  .full { max-width: 210mm; margin: 0 auto; background: #fff; padding: 12mm; min-height: 297mm; box-shadow: 0 2px 14px rgba(0,0,0,.18); }
}
</style></head>
<body>
<div class="full">
<header>
  <div><div class="marca">HOSTAL COLL</div><h1>Neteja${persones.length ? ` · ${esc(persones.join(', '))}` : ''}</h1></div>
  <div class="per">Del <strong>${dllarg(desde)}</strong> al <strong>${dllarg(fins)}</strong><br><small>Imprès el ${dllarg(avui)}</small></div>
</header>
${files.join('')}
<div class="llegenda"><span><b style="color:#7a1f2b">sortida</b> = a fons</span><span>mant. = manteniment</span><span>✓ feta</span><span><span class="pp">PER PAGAR</span> feta i no pagada</span><span class="pl" style="font-size:10px">PLANIF. = encara no feta</span></div>
<div class="resum"><b class="t">Resum del període:</b> ${resum.dies} dies · ${resum.sortides} sortides · ${resum.manteniments} manteniments · bugaderia ${resum.bugaderia} ${resum.bugaderia === 1 ? 'cop' : 'cops'} · <b>per pagar ${eur(resum.perPagar)}</b></div>
<footer>Les caselles buides, per escriure-hi a mà.</footer>
</div>
${auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' : ''}
</body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
