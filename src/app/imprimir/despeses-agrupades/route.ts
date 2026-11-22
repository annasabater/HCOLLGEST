/**
 * Informe de despeses agrupades (Balanç → Imprimir), de les despeses d'un període:
 *   /imprimir/despeses-agrupades?per=proveidor|categoria&desde=YYYY-MM-DD&fins=YYYY-MM-DD
 *     [&fiances=sense|amb|tot] [&format=csv]
 * Per defecte, el full per imprimir/PDF; amb `&format=csv`, un CSV per a Excel.
 * Fiances: «sense» (per defecte) no les compta; «amb» les suma a part (columna Fiança);
 * «tot» posa les dues vistes en un sol informe. Només ADMIN (com el balanç); els comptes
 * de vista restringida només veuen «sense».
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import {
  agrupaDespeses,
  csvFitxer,
  csvInforme,
  fmtImport,
  type AgruparPer,
  type ModeFiances,
} from '@/lib/informes-despeses';
import { despesesPeriode } from '@/lib/services/informes-despeses';

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
  const demanat = sp.get('fiances');
  const mode: ModeFiances = teVistaRestringida(user) ? 'sense' : demanat === 'amb' || demanat === 'tot' ? demanat : 'sense';
  // Vistes que s'inclouen: sense, amb, o les dues.
  const vistes: boolean[] = mode === 'tot' ? [false, true] : [mode === 'amb'];

  const gastos = await despesesPeriode(desde, fins);
  const blocs = vistes.map((amb) => ({
    amb,
    titol: amb ? 'Amb fiances' : 'Sense fiances',
    ...agrupaDespeses(gastos, per, amb),
  }));
  const nomFitxer = `despeses-per-${per}-${mode === 'sense' ? '' : `${mode}-fiances-`}${desde}_${fins}`;

  if (sp.get('format') === 'csv') {
    const text = csvFitxer(blocs.map((b) => csvInforme(b.files, b.total, per, b.amb, blocs.length > 1 ? b.titol : undefined)));
    return new Response(text, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomFitxer}.csv"`,
      },
    });
  }

  const est = await prisma.establiment.findFirst();
  const titol = per === 'proveidor' ? 'Despeses per proveïdor' : 'Despeses per categoria';
  const prov = per === 'proveidor';

  const taula = (b: (typeof blocs)[number]) => {
    const cols = [prov ? 'Proveïdor' : 'Categoria', ...(prov ? ['NIF', 'Categoria'] : []), 'Fact.', 'Base', 'IVA', ...(b.amb ? ['Fiança'] : []), 'Total'];
    const nNum = 4 + (b.amb ? 1 : 0); // darreres columnes numèriques (a la dreta)
    const fila = (f: (typeof b.files)[number]) =>
      `<tr><td class="nom">${esc(f.nom)}</td>${prov ? `<td class="gris">${esc(f.nif) || '—'}</td><td class="gris">${esc(f.categories)}</td>` : ''}<td class="n">${f.factures}</td><td class="n">${fmtImport(f.base)}</td><td class="n">${fmtImport(f.iva)}</td>${b.amb ? `<td class="n gris">${f.fianca ? fmtImport(f.fianca) : '—'}</td>` : ''}<td class="n fort">${fmtImport(f.total)}</td></tr>`;
    const resum = prov ? `${b.files.length} proveïdors` : `${b.files.length} categories`;
    return `${blocs.length > 1 ? `<h2>${b.titol}${b.amb ? ' · el que ha sortit de veritat' : ' · el resultat real'}</h2>` : ''}
  <table>
    <thead><tr>${cols.map((c, i) => `<th class="${i >= cols.length - nNum ? 'n' : ''}">${c}</th>`).join('')}</tr></thead>
    <tbody>${b.files.length ? b.files.map(fila).join('') : `<tr><td colspan="${cols.length}" class="gris" style="padding: 18px 4px;">Cap despesa en aquest període.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="${prov ? 3 : 1}">Total · ${resum}</td><td class="n">${b.total.factures}</td><td class="n">${fmtImport(b.total.base)}</td><td class="n">${fmtImport(b.total.iva)}</td>${b.amb ? `<td class="n">${fmtImport(b.total.fianca)}</td>` : ''}<td class="n">${fmtImport(b.total.total)} €</td></tr></tfoot>
  </table>`;
  };

  const subtitol = mode === 'sense' ? '' : mode === 'amb' ? ' · amb fiances' : ' · sense i amb fiances';
  const notaFiances =
    mode === 'sense'
      ? 'Les fiances no hi són incloses (no són despesa). '
      : 'Una fiança no és despesa: surt a part (columna «Fiança»), sense base ni IVA, i suma al total pagat. ';

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<title>${esc(titol)}${subtitol} · ${dia(desde)} – ${dia(fins)}</title>
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
<div class="eines"><button type="button" onclick="window.print()">Imprimeix / PDF</button><a href="?${esc(sp.toString())}&amp;format=csv">Descarrega l'Excel (CSV)</a></div>
<div class="full">
  <div class="cap">
    <div>
      <div class="logo"><b>H</b>OSTAL COLL</div>
      <div class="dades">${esc(est?.nom ?? '')}${est ? ` · NIF ${esc(est.facturaNif || est.cif)}` : ''}${est?.poblacio ? ` · ${esc(est.poblacio)}` : ''}</div>
    </div>
    <div class="titol"><div class="t">${esc(titol)}${esc(subtitol)}</div><div class="p">Del ${dia(desde)} al ${dia(fins)}</div></div>
  </div>
  ${blocs.map(taula).join('\n')}
  <div class="peu">${notaFiances}El total és l'import pagat, ja descomptada la retenció d'IRPF si n'hi ha; per això base + IVA pot no coincidir amb el total. Els imports sense desglossar s'han calculat amb un 21 % d'IVA inclòs.<br>Generat el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}.</div>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
