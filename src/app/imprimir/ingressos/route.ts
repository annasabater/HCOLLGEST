/**
 * Informe d'ingressos (Balanç → Imprimir):
 *   /imprimir/ingressos?desde=YYYY-MM-DD&fins=YYYY-MM-DD[&fiances=sense|amb|tot][&format=csv]
 * Resum per forma de cobrament i el detall de cada cobrament (dia, client, habitació,
 * factura, forma, import). «amb» afegeix les fiances rebudes a part; «tot», les dues
 * vistes. Només ADMIN; els comptes de vista restringida només veuen «sense».
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { csvIngressos, informeIngressos, NOM_METODE, type ModeFiances } from '@/lib/informes-ingressos';
import { csvFitxer, fmtImport } from '@/lib/informes-despeses';
import { ingressosPeriode } from '@/lib/services/informes-ingressos';

export const dynamic = 'force-dynamic';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dia = (iso: string) => iso.split('-').reverse().join('/');
const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const nom = (m: string) => NOM_METODE[m] ?? m;

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') return new Response('Sense permís', { status: 403 });

  const sp = new URL(req.url).searchParams;
  const desde = sp.get('desde') ?? '';
  const fins = sp.get('fins') ?? '';
  if (!DIA_ISO.test(desde) || !DIA_ISO.test(fins) || desde > fins) {
    return new Response('Període no vàlid (desde i fins en format aaaa-mm-dd)', { status: 400 });
  }
  const restringit = teVistaRestringida(user);
  const demanat = sp.get('fiances');
  const mode: ModeFiances = restringit ? 'sense' : demanat === 'amb' || demanat === 'tot' ? demanat : 'sense';
  const vistes: boolean[] = mode === 'tot' ? [false, true] : [mode === 'amb'];

  const ingressos = await ingressosPeriode(desde, fins, restringit);
  const blocs = vistes.map((amb) => ({ amb, titol: amb ? 'Amb fiances' : 'Sense fiances', inf: informeIngressos(ingressos, amb) }));
  const nomFitxer = `ingressos-${mode === 'sense' ? '' : `${mode}-fiances-`}${desde}_${fins}`;

  if (sp.get('format') === 'csv') {
    const text = csvFitxer(blocs.map((b) => csvIngressos(b.inf, b.amb, blocs.length > 1 ? b.titol : undefined)));
    return new Response(text, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nomFitxer}.csv"` },
    });
  }

  const est = await prisma.establiment.findFirst();
  const taules = (b: (typeof blocs)[number]) => {
    const { inf, amb } = b;
    const resum = `<table>
    <thead><tr><th>Forma de cobrament</th><th class="n">Cobraments</th>${amb ? '<th class="n">Cobrat</th><th class="n">Fiances</th>' : ''}<th class="n">Total</th></tr></thead>
    <tbody>${inf.perMetode.length ? inf.perMetode.map((f) => `<tr><td class="nom">${esc(nom(f.metode))}</td><td class="n">${f.n}</td>${amb ? `<td class="n">${fmtImport(f.cobrat)}</td><td class="n gris">${f.fianca ? fmtImport(f.fianca) : '—'}</td>` : ''}<td class="n fort">${fmtImport(f.total)}</td></tr>`).join('') : `<tr><td colspan="${amb ? 5 : 3}" class="gris" style="padding: 18px 4px;">Cap ingrés en aquest període.</td></tr>`}</tbody>
    <tfoot><tr><td>Total</td><td class="n">${inf.total.n}</td>${amb ? `<td class="n">${fmtImport(inf.total.cobrat)}</td><td class="n">${fmtImport(inf.total.fianca)}</td>` : ''}<td class="n">${fmtImport(inf.total.total)} €</td></tr></tfoot>
  </table>`;
    const detall = inf.detall.length
      ? `<h3>Detall</h3><table class="det">
    <thead><tr><th>Dia</th><th>Client</th><th>Hab.</th><th>Factura</th><th>Forma</th>${amb ? '<th>Tipus</th>' : ''}<th class="n">Import</th></tr></thead>
    <tbody>${inf.detall.map((i) => `<tr><td>${dia(i.data)}</td><td class="nom">${esc(i.client)}</td><td>${esc(i.habitacio) || '—'}</td><td class="gris">${esc(i.factura) || '—'}</td><td>${esc(nom(i.metode))}</td>${amb ? `<td class="gris">${i.fianca ? 'Fiança' : 'Cobrament'}</td>` : ''}<td class="n">${fmtImport(i.import)}</td></tr>`).join('')}</tbody>
  </table>`
      : '';
    return `${blocs.length > 1 ? `<h2>${b.titol}${amb ? ' · tot el que ha entrat' : ' · el resultat real'}</h2>` : ''}${resum}${detall}`;
  };
  const subtitol = mode === 'sense' ? '' : mode === 'amb' ? ' · amb fiances' : ' · sense i amb fiances';

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<title>Ingressos${subtitol} · ${dia(desde)} – ${dia(fins)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f3f3; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; }
  .full { max-width: 190mm; margin: 12mm auto; background: #fff; padding: 14mm 14mm 12mm; box-shadow: 0 2px 14px rgba(0,0,0,.12); }
  .cap { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7a1f2b; padding-bottom: 12px; }
  .logo { font-weight: 700; font-size: 15px; letter-spacing: .28em; }
  .logo b { color: #7a1f2b; }
  .dades { font-size: 11px; color: #737373; margin-top: 4px; }
  .titol { text-align: right; }
  .titol .t { font-size: 11px; font-weight: 700; letter-spacing: .16em; color: #7a1f2b; text-transform: uppercase; }
  .titol .p { font-size: 12px; color: #525252; margin-top: 3px; }
  h2 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #7a1f2b; margin: 22px 0 -6px; }
  h3 { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #737373; margin: 18px 0 -8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #737373; border-bottom: 1px solid #cfcfcf; padding: 6px 4px; }
  td { padding: 6px 4px; border-bottom: 1px solid #efefef; vertical-align: top; }
  .det td { padding: 4px; font-size: 11px; }
  th.n, td.n { text-align: right; white-space: nowrap; }
  .nom { font-weight: 600; }
  .gris { color: #737373; }
  .fort { font-weight: 700; }
  tfoot td { border-top: 2px solid #1a1a1a; border-bottom: 0; font-weight: 700; padding-top: 8px; }
  .eines { max-width: 190mm; margin: 12mm auto 0; display: flex; gap: 8px; }
  .eines button, .eines a { font: 600 13px Arial, sans-serif; padding: 9px 16px; border: 1px solid #d4d4d4; background: #fff; color: #1a1a1a; text-decoration: none; cursor: pointer; }
  .eines button { background: #7a1f2b; border-color: #7a1f2b; color: #fff; }
  tr { break-inside: avoid; }
  @media print { body { background: #fff; } .full { margin: 0; padding: 0; box-shadow: none; max-width: none; } .eines { display: none; } }
</style>
</head>
<body>
<div class="eines"><button type="button" onclick="window.print()">Imprimeix / PDF</button><a href="?${esc(sp.toString())}&amp;format=csv">Descarrega l'Excel (CSV)</a></div>
<div class="full">
  <div class="cap">
    <div>
      <div class="logo"><b>H</b>OSTAL COLL</div>
      <div class="dades">${esc(est?.nom ?? '')}${est ? ` · NIF ${esc(est.facturaNif || est.cif)}` : ''}${est?.poblacio ? ` · ${esc(est.poblacio)}` : ''}</div>
    </div>
    <div class="titol"><div class="t">Ingressos${esc(subtitol)}</div><div class="p">Del ${dia(desde)} al ${dia(fins)} · pel dia que entren</div></div>
  </div>
  ${blocs.map(taules).join('\n')}
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
