import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { getOcupacio } from '@/lib/services/ocupacio';
import type { FilaOcupacio } from '@/lib/ocupacio';

export const dynamic = 'force-dynamic';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const dc = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');
const dllarg = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const iso = (v: string | null, def: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : def);

/**
 * GET /imprimir/ocupacio — full d'ocupació per habitació, llest per imprimir (A4) o
 * desar com a PDF des del navegador. Paràmetres (tots opcionals):
 *   desde, fins (YYYY-MM-DD) · tel, imp, met, pag, notes (1/0) · blancs (0-3)
 *   acabades=amaga|ratlla · orient=v|h · auto=1 (obre el diàleg d'impressió)
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const p = new URL(req.url).searchParams;
  const avui = new Date().toISOString().slice(0, 10);
  const fi = new Date(); fi.setMonth(fi.getMonth() + 2);
  const desde = iso(p.get('desde'), avui);
  const fins = iso(p.get('fins'), fi.toISOString().slice(0, 10));
  const flag = (k: string, def: boolean) => (p.has(k) ? p.get(k) === '1' : def);
  const tel = flag('tel', true), imp = flag('imp', true), met = flag('met', true), pag = flag('pag', false), notes = flag('notes', false);
  const blancs = Math.min(3, Math.max(0, Number(p.get('blancs') ?? 2) || 0));
  const ratlla = p.get('acabades') === 'ratlla';
  const h = p.get('orient') === 'h';
  const auto = p.get('auto') === '1';

  const habitacions = await getOcupacio(desde, fins, teVistaRestringida(user));

  // Columnes: la de clients s'estira, les altres tenen amplada fixa.
  const cols = ['1fr'];
  if (tel) cols.push('104px');
  cols.push('150px');
  if (imp) cols.push('64px');
  if (met) cols.push('72px');
  if (pag) cols.push('120px');
  if (notes) cols.push('1fr');
  const grid = `grid-template-columns:${cols.join(' ')}`;

  const cap =
    `<div class="fila cap" style="${grid}"><span>CLIENTS</span>${tel ? '<span>TELÈFON</span>' : ''}<span>DEL → AL</span>` +
    `${imp ? '<span class="d">IMPORT</span>' : ''}${met ? '<span class="d">PAGAMENT</span>' : ''}${pag ? '<span>PAGAT / FALTA</span>' : ''}${notes ? '<span>NOTES</span>' : ''}</div>`;

  const fila = (f: FilaOcupacio) => {
    const classe = f.acabada && ratlla ? 'fila rat' : 'fila';
    return (
      `<div class="${classe}" style="${grid}"><span class="cl">${esc(f.clients.join(', '))}</span>` +
      `${tel ? `<span>${esc(f.telefon)}</span>` : ''}<span>${dc(f.entrada)} → ${dc(f.sortida)}</span>` +
      `${imp ? `<span class="d b">${f.import != null ? eur(f.import) : ''}</span>` : ''}` +
      `${met ? `<span class="d">${esc(f.metodes.join(' + '))}</span>` : ''}` +
      `${pag ? `<span>${f.import != null ? `${eur(f.pagat)}${f.pendent > 0 ? ` · falta ${eur(f.pendent)}` : ''}` : ''}</span>` : ''}` +
      `${notes ? `<span class="nt">${esc(f.notes)}</span>` : ''}</div>`
    );
  };

  const blocs = habitacions
    .map((hab) => {
      const files = hab.files.filter((f) => !(f.acabada && !ratlla));
      const cos = files.length
        ? files.map(fila).join('')
        : `<div class="fila lliure" style="${grid}"><span class="cl">lliure</span></div>`;
      const buits = Array.from({ length: blancs }, () => '<div class="blanc"></div>').join('');
      return `<section class="hab"><div class="num">${esc(hab.nom)}</div><div class="cos">${cos}${buits}</div></section>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="ca"><head><meta charset="utf-8"><title>Ocupació d'habitacions</title>
<style>
@page { size: A4 ${h ? 'landscape' : 'portrait'}; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 12px/1.35 Arial, Helvetica, sans-serif; color: #111; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 8px; }
.marca { font-size: 10px; font-weight: 700; letter-spacing: .26em; color: #7a1f2b; }
h1 { margin: 0; font-size: 21px; }
.per { text-align: right; font-size: 12px; color: #444; }
.per small { color: #888; }
.fila { display: grid; gap: 8px; padding: 3px 0; border-bottom: 1px dotted #ccc; align-items: baseline; }
.fila.cap { font-size: 9px; font-weight: 700; letter-spacing: .1em; color: #666; border-bottom: 0; padding: 8px 0 5px; }
.capwrap { display: grid; grid-template-columns: 50px 1fr; border-bottom: 1px solid #111; }
.d { text-align: right; }
.b { font-weight: 700; }
.cl { font-weight: 600; }
.nt { color: #555; font-size: 11px; }
.rat { text-decoration: line-through; color: #888; }
.lliure { color: #999; font-style: italic; }
.hab { display: grid; grid-template-columns: 50px 1fr; border-bottom: 1px solid #111; padding: 6px 0 4px; break-inside: avoid; }
.num { font-size: 26px; font-weight: 700; color: #7a1f2b; line-height: 1; }
.blanc { height: 22px; border-bottom: 1px dotted #999; margin-top: 2px; }
footer { margin-top: 8px; font-size: 9px; color: #777; border-top: 1px solid #ccc; padding-top: 4px; display: flex; justify-content: space-between; }
@media screen {
  body { background: #e2e5e9; padding: 18px 12px; }
  .full { max-width: ${h ? '297mm' : '210mm'}; margin: 0 auto; background: #fff; padding: 14mm; min-height: ${h ? '210mm' : '297mm'}; box-shadow: 0 2px 14px rgba(0,0,0,.18); }
}
</style></head>
<body>
<div class="full">
<header>
  <div><div class="marca">HOSTAL COLL</div><h1>Ocupació d'habitacions</h1></div>
  <div class="per">Del <strong>${dllarg(desde)}</strong> al <strong>${dllarg(fins)}</strong><br><small>Imprès el ${dllarg(avui)}</small></div>
</header>
<div class="capwrap"><div></div>${cap}</div>
${blocs}
<footer><span>Hostal Coll</span><span>${dllarg(avui)}</span></footer>
</div>
${auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>' : ''}
</body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
