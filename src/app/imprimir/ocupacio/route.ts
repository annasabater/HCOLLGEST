import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { getOcupacio } from '@/lib/services/ocupacio';
import type { ContracteFull, TramFull } from '@/lib/ocupacio-contractes';
import { nomPropi } from '@/lib/nom-propi';

export const dynamic = 'force-dynamic';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const dc = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');
const dllarg = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const iso = (v: string | null, def: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : def);

/**
 * GET /imprimir/ocupacio — full d'ocupació per contracte, llest per imprimir (A4 vertical)
 * o desar com a PDF. Un paràgraf per contracte (les ampliacions, dins el mateix), ordenat
 * per número de contracte; els sense número, al final. Cada pagament surt amb el dia i,
 * només si en té, el número de factura. Paràmetres: desde, fins (YYYY-MM-DD), contractes=clau1,clau2 (opcional: si falta, tots), auto=1.
 * De cada persona surt tot l'historial, no només el del període.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const p = new URL(req.url).searchParams;
  const avui = new Date().toISOString().slice(0, 10);
  const fi = new Date(); fi.setMonth(fi.getMonth() + 2);
  const desde = iso(p.get('desde'), avui);
  const fins = iso(p.get('fins'), fi.toISOString().slice(0, 10));
  const auto = p.get('auto') === '1';

  const ids = (p.get('contractes') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const contractes = await getOcupacio(desde, fins, teVistaRestringida(user), ids);

  const persones = (c: ContracteFull) =>
    c.persones
      .map((x, i, a) => {
        const sep = i === 0 ? '' : i === a.length - 1 ? ' <span class="g">i</span> ' : ', ';
        return `${sep}<span class="nom">${esc(nomPropi(x.nom))}</span>${x.telefon ? ` <span class="tel">Tel. ${esc(x.telefon)}</span>` : ''}`;
      })
      .join('');

  const pagaments = (t: TramFull) => {
    const l = [
      ...t.pagaments.map(
        (g) => `<span class="pg"><b>${eur(g.import)}</b> ${dc(g.data)}${g.factura ? ` <span class="fra">Fra. ${esc(g.factura)}</span>` : ''}</span>`,
      ),
      ...t.pendents.map((x) => `<span class="pend">PENDENT ${eur(x.import)} · ${dc(x.data)}</span>`),
    ];
    return l.length ? l.join(' <span class="s">·</span> ') : '<span class="g">sense pagaments registrats</span>';
  };

  const tram = (t: TramFull) =>
    `<div class="tram"><span class="imp">${t.import != null ? eur(t.import) : '—'}</span><span class="pt"></span>` +
    `<span class="nw">Del <b>${dc(t.del)}</b> al <b>${dc(t.al)}</b></span><span class="s">—</span><span class="pgs">${pagaments(t)}</span></div>`;

  const entrada = (c: ContracteFull, i: number) =>
    `<div class="ent${i % 2 ? ' alt' : ''}"><div class="hab">${esc(c.habitacions.join('/'))}</div><div class="cos">` +
    `<div class="pers">${persones(c)}${c.numero ? ` <span class="ctr">Contracte ${esc(c.numero)}</span>` : ''}</div>${c.trams.map(tram).join('')}</div></div>`;

  const cos = contractes.length ? contractes.map(entrada).join('') : '<p class="buit">Cap estada en aquest període.</p>';

  const html = `<!doctype html>
<html lang="ca"><head><meta charset="utf-8"><title>Ocupació</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 12px/1.4 Arial, Helvetica, sans-serif; color: #2b2b2b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #7a1f2b; padding-bottom: 10px; }
.marca { font-size: 9.5px; font-weight: 700; letter-spacing: .28em; color: #7a1f2b; }
h1 { margin: 2px 0 0; font-size: 22px; font-weight: 600; color: #222; }
.per { text-align: right; font-size: 12px; color: #555; }
.per small { color: #999; }
.ent { display: flex; gap: 14px; padding: 9px 10px 8px; break-inside: avoid; }
.ent.alt { background: #f9eff0; }
.hab { width: 38px; flex-shrink: 0; text-align: center; font-size: 26px; font-weight: 700; line-height: 1; color: #7a1f2b; }
.cos { flex: 1; min-width: 0; }
.pers { margin-bottom: 3px; font-size: 13px; }
.nom { font-weight: 600; color: #222; }
.tel { font-size: 11px; color: #7a7a7a; white-space: nowrap; }
.ctr { margin-left: 6px; font-size: 10px; font-weight: 700; letter-spacing: .06em; color: #7a1f2b; }
.g, .s { color: #aaa; }
.tram { display: flex; align-items: baseline; gap: 7px; font-size: 12px; line-height: 1.7; color: #444; }
.imp { font-weight: 600; min-width: 40px; color: #222; }
.pt { flex: 0 0 34px; border-bottom: 1px dotted #c4c4c4; transform: translateY(-3px); }
.nw { white-space: nowrap; }
.nw b { font-weight: 600; color: #222; }
.pgs { flex: 1; font-size: 11.5px; color: #555; }
.pg { white-space: nowrap; }
.pg b { font-weight: 600; color: #333; }
.fra { color: #7a7a7a; }
.pend { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; background: #7a1f2b; color: #fff; padding: 2px 7px; white-space: nowrap; }
.buit { color: #888; padding: 20px 10px; }
footer { margin-top: 10px; font-size: 9.5px; color: #999; border-top: 1px solid #e4e4e4; padding-top: 6px; }
@media screen {
  body { background: #e9e9e9; padding: 18px 12px; }
  .full { max-width: 210mm; margin: 0 auto; background: #fff; padding: 14mm; min-height: 297mm; box-shadow: 0 2px 14px rgba(0,0,0,.18); }
}
</style></head>
<body>
<div class="full">
<header>
  <div><div class="marca">HOSTAL COLL</div><h1>Ocupació</h1></div>
  <div class="per">Del <strong>${dllarg(desde)}</strong> al <strong>${dllarg(fins)}</strong><br><small>Imprès el ${dllarg(avui)}</small></div>
</header>
${cos}
<footer>Per número de contracte; els sense número, al final · Fra. = número de factura</footer>
</div>
${auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' : ''}
</body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
