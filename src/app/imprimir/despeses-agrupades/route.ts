/**
 * Informe de despeses agrupades (Balanç → Imprimir), de les despeses d'un període:
 *   /imprimir/despeses-agrupades?per=proveidor|categoria&desde=YYYY-MM-DD&fins=YYYY-MM-DD
 * Per defecte, el full per imprimir/PDF; amb `&format=csv`, un CSV per a Excel.
 * Només ADMIN (com el balanç). Les fiances no hi són.
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { csvInforme, fmtImport, type AgruparPer } from '@/lib/informes-despeses';
import { informeDespeses } from '@/lib/services/informes-despeses';

export const dynamic = 'force-dynamic';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dia = (iso: string) => iso.split('-').reverse().join('/');
const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') return new Response('Sense permís', { status: 403 });

  const sp = new URL(req.url).searchParams;
  const per: AgruparPer = sp.get('per') === 'categoria' ? 'categoria' : 'proveidor';
  const desde = sp.get('desde') ?? '';
  const fins = sp.get('fins') ?? '';
  if (!DIA_ISO.test(desde) || !DIA_ISO.test(fins) || desde > fins) {
    return new Response('Període no vàlid (desde i fins en format aaaa-mm-dd)', { status: 400 });
  }

  const { files, total } = await informeDespeses(desde, fins, per);
  const nomFitxer = `despeses-per-${per === 'proveidor' ? 'proveidor' : 'categoria'}-${desde}_${fins}`;

  if (sp.get('format') === 'csv') {
    return new Response(csvInforme(files, total, per), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomFitxer}.csv"`,
      },
    });
  }

  const est = await prisma.establiment.findFirst();
  const titol = per === 'proveidor' ? 'Despeses per proveïdor' : 'Despeses per categoria';
  const cols = per === 'proveidor' ? ['Proveïdor', 'NIF', 'Categoria', 'Fact.', 'Base', 'IVA', 'Total'] : ['Categoria', 'Fact.', 'Base', 'IVA', 'Total'];
  const nNum = 4; // darreres columnes numèriques (a la dreta)
  const fila = (f: (typeof files)[number]) =>
    per === 'proveidor'
      ? `<td class="nom">${esc(f.nom)}</td><td class="gris">${esc(f.nif) || '—'}</td><td class="gris">${esc(f.categories)}</td><td class="n">${f.factures}</td><td class="n">${fmtImport(f.base)}</td><td class="n">${fmtImport(f.iva)}</td><td class="n fort">${fmtImport(f.total)}</td>`
      : `<td class="nom">${esc(f.nom)}</td><td class="n">${f.factures}</td><td class="n">${fmtImport(f.base)}</td><td class="n">${fmtImport(f.iva)}</td><td class="n fort">${fmtImport(f.total)}</td>`;
  const colspanTotal = per === 'proveidor' ? 3 : 1;
  const resum = per === 'proveidor' ? `${files.length} proveïdors` : `${files.length} categories`;

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<title>${esc(titol)} · ${dia(desde)} – ${dia(fins)}</title>
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
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #737373; border-bottom: 1px solid #cfcfcf; padding: 6px 4px; }
  td { padding: 6px 4px; border-bottom: 1px solid #efefef; vertical-align: top; }
  th.n, td.n { text-align: right; white-space: nowrap; }
  .nom { font-weight: 600; }
  .gris { color: #737373; }
  .fort { font-weight: 700; }
  tfoot td { border-top: 2px solid #1a1a1a; border-bottom: 0; font-weight: 700; padding-top: 8px; }
  .peu { margin-top: 16px; font-size: 10px; color: #8a8a8a; line-height: 1.5; }
  .eines { max-width: 190mm; margin: 12mm auto 0; display: flex; gap: 8px; }
  .eines button, .eines a { font: 600 13px Arial, sans-serif; padding: 9px 16px; border: 1px solid #d4d4d4; background: #fff; color: #1a1a1a; text-decoration: none; cursor: pointer; }
  .eines button { background: #7a1f2b; border-color: #7a1f2b; color: #fff; }
  tr { break-inside: avoid; }
  @media print { body { background: #fff; } .full { margin: 0; padding: 0; box-shadow: none; max-width: none; } .eines { display: none; } }
</style>
</head>
<body>
<div class="eines"><button type="button" onclick="window.print()">Imprimeix / PDF</button><a href="?${esc(new URL(req.url).searchParams.toString())}&amp;format=csv">Descarrega l'Excel (CSV)</a></div>
<div class="full">
  <div class="cap">
    <div>
      <div class="logo"><b>H</b>OSTAL COLL</div>
      <div class="dades">${esc(est?.nom ?? '')}${est ? ` · NIF ${esc(est.facturaNif || est.cif)}` : ''}${est?.poblacio ? ` · ${esc(est.poblacio)}` : ''}</div>
    </div>
    <div class="titol"><div class="t">${esc(titol)}</div><div class="p">Del ${dia(desde)} al ${dia(fins)}</div></div>
  </div>
  <table>
    <thead><tr>${cols.map((c, i) => `<th class="${i >= cols.length - nNum ? 'n' : ''}">${c}</th>`).join('')}</tr></thead>
    <tbody>${files.length ? files.map((f) => `<tr>${fila(f)}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="gris" style="padding: 18px 4px;">Cap despesa en aquest període.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="${colspanTotal}">Total · ${resum}</td><td class="n">${total.factures}</td><td class="n">${fmtImport(total.base)}</td><td class="n">${fmtImport(total.iva)}</td><td class="n">${fmtImport(total.total)} €</td></tr></tfoot>
  </table>
  <div class="peu">Les fiances no hi són incloses (no són despesa). El total és l'import pagat, ja descomptada la retenció d'IRPF si n'hi ha; per això base + IVA pot no coincidir amb el total. Els imports sense desglossar s'han calculat amb un 21 % d'IVA inclòs.<br>Generat el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}.</div>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
