import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getLlibreIngressos, type FilaIngres } from '@/lib/services/llibre-iva';

export const dynamic = 'force-dynamic';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function num(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}
function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(_req: Request, ctx: { params: Promise<{ periode: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { periode } = await ctx.params;
  const m = periode.match(/^(\d{4})-([1-4])$/);
  if (!m) return new Response('Període no vàlid (format aaaa-T, p. ex. 2026-2)', { status: 400 });
  const year = Number(m[1]);
  const trimestre = Number(m[2]);

  const llibre = await getLlibreIngressos(year, trimestre);

  // Fila de la taula "Facturas emitidas - repercutidas".
  const filaEmesa = (f: FilaIngres) => `
    <tr${f.esAbono ? ' class="abono"' : ''}>
      <td>${fmtData(f.data)}</td>
      <td>${esc(f.numeroSimple)}</td>
      <td>${esc(f.numeroFiscal)}</td>
      <td class="cli">${esc(f.client)}</td>
      <td class="per">${esc(f.periode)}</td>
      <td class="n">${num(f.base)}</td>
      <td class="n">${f.ivaPercent}</td>
      <td class="n">${num(f.iva)}</td>
      <td class="n">${num(f.total)}</td>
    </tr>`;

  // Fila de la taula "Libro de ingresos" (mateixes dades, columnes reduïdes).
  const filaIngres = (f: FilaIngres) => `
    <tr${f.esAbono ? ' class="abono"' : ''}>
      <td>${fmtData(f.data)}</td>
      <td>${esc(f.numeroSimple)}</td>
      <td>${esc(f.numeroFiscal)}</td>
      <td class="cli">${esc(f.client)}</td>
      <td class="n">${num(f.total)}</td>
      <td class="n">${num(f.base)}</td>
      <td class="n">${num(f.iva)}</td>
    </tr>`;

  const buit =
    llibre.files.length === 0
      ? `<p class="buit">No hi ha factures emeses en aquest trimestre.</p>`
      : '';

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Llibre d'IVA · Ingressos · ${esc(llibre.etiqueta)} · Hostal Coll</title>
<style>
  :root{
    --ink:#2C1810; --slate:#3C2828; --muted:#7A6868; --line:#E5D8D5;
    --accent:#7A1F2B; --accent-soft:#F7EEEC; --paper:#fff; --app:#F0ECEB;
  }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{ background:var(--app); color:var(--slate);
    font-family:"Manrope","Segoe UI",system-ui,sans-serif; font-size:12px; -webkit-font-smoothing:antialiased; }
  .toolbar{ position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between;
    gap:16px; padding:12px 20px; background:rgba(255,252,248,.95); backdrop-filter:blur(10px); border-bottom:1px solid #E1D9D7; }
  .tb-brand{ font-family:Georgia,serif; color:var(--ink); font-size:16px; }
  .btn{ font:inherit; font-size:13px; padding:9px 15px; border-radius:9px; cursor:pointer; border:1px solid; }
  .btn.solid{ background:var(--accent); color:#fff; border-color:var(--accent); }
  .app{ padding:22px 16px 48px; }
  .sheet{ width:100%; max-width:900px; margin:0 auto 22px; background:var(--paper);
    padding:40px 44px; border:1px solid #EDE5E2; border-radius:3px; box-shadow:0 10px 34px rgba(44,24,16,.08); }
  .brand{ font-family:Georgia,serif; font-size:30px; color:var(--ink); letter-spacing:.5px; }
  .brand-sub{ font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:var(--accent); margin-top:6px; }
  .rule{ position:relative; border-top:1.5px solid var(--ink); margin:16px 0 6px; }
  .rule::before{ content:""; position:absolute; top:3px; left:0; width:56px; border-top:3px solid var(--accent); }
  .period{ text-align:center; font-weight:600; letter-spacing:1px; margin:14px 0 4px; color:var(--ink); }
  .doc-title{ text-align:center; font-size:13px; font-weight:700; letter-spacing:.5px; text-transform:uppercase;
    color:var(--accent); margin:2px 0 18px; }
  table{ width:100%; border-collapse:collapse; }
  th{ font-size:9.5px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); font-weight:600;
    text-align:left; padding:0 6px 7px; border-bottom:1.5px solid var(--ink); }
  th.n{ text-align:right; }
  td{ padding:7px 6px; border-bottom:1px solid var(--line); vertical-align:top; }
  td.n{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  td.cli{ font-weight:600; color:var(--slate); }
  td.per{ color:var(--muted); white-space:nowrap; }
  tr.abono td{ color:#A23A2B; }
  tfoot td{ border-top:1.5px solid var(--ink); border-bottom:none; font-weight:700; color:var(--ink); padding-top:9px; }
  tfoot td.lab{ text-align:right; text-transform:uppercase; letter-spacing:.5px; font-size:10px; }
  .buit{ color:var(--muted); font-style:italic; padding:14px 6px; }
  .resum{ margin-top:16px; margin-left:auto; width:280px; }
  .resum-row{ display:flex; justify-content:space-between; padding:7px 12px; }
  .resum-row.grand{ background:var(--accent-soft); border-top:2px solid var(--accent); border-radius:4px;
    font-family:Georgia,serif; font-size:14px; color:var(--ink); }
  .note{ font-size:10px; color:var(--muted); margin-top:14px; font-style:italic; line-height:1.5; }
  @page{ size:A4 landscape; margin:12mm; }
  @media print{
    body{ background:#fff; } .toolbar{ display:none !important; } .app{ padding:0; }
    .sheet{ box-shadow:none; border:none; border-radius:0; max-width:none; padding:0; }
    .sheet + .sheet{ page-break-before:always; }
    *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <div class="tb-brand">Hostal Coll · Llibre d'IVA · ${esc(llibre.etiqueta)}</div>
  <button id="print" class="btn solid">Imprimir / Guardar PDF</button>
</div>
<div class="app">

  <!-- ── Facturas emitidas - repercutidas ─────────────────────────── -->
  <div class="sheet">
    <div class="brand">HOSTAL COLL</div>
    <div class="brand-sub">Casa de Hostes · Calella</div>
    <div class="rule"></div>
    <div class="period">${esc(llibre.etiqueta)}</div>
    <div class="doc-title">Facturas emitidas · Repercutidas</div>
    ${buit || `
    <table>
      <thead>
        <tr>
          <th>Fecha</th><th>Nº Factura S.</th><th>Nº Factura F.</th><th>Cliente</th>
          <th>Período de estancia</th><th class="n">Base imponible</th><th class="n">% IVA</th>
          <th class="n">IVA</th><th class="n">Total</th>
        </tr>
      </thead>
      <tbody>${llibre.files.map(filaEmesa).join('')}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="lab">Total…</td>
          <td class="n">${num(llibre.totalBase)}</td>
          <td></td>
          <td class="n">${num(llibre.totalIva)}</td>
          <td class="n">${num(llibre.totalTotal)}</td>
        </tr>
      </tfoot>
    </table>`}
  </div>

  <!-- ── Libro de ingresos ────────────────────────────────────────── -->
  <div class="sheet">
    <div class="brand">HOSTAL COLL</div>
    <div class="brand-sub">Casa de Hostes · Calella</div>
    <div class="rule"></div>
    <div class="period">${esc(llibre.etiqueta)}</div>
    <div class="doc-title">Libro de ingresos</div>
    ${buit || `
    <table>
      <thead>
        <tr>
          <th>Fecha</th><th>Nº Factura S.</th><th>Nº Factura F.</th><th>Cliente</th>
          <th class="n">Importe</th><th class="n">Base imponible</th><th class="n">IVA 10%</th>
        </tr>
      </thead>
      <tbody>${llibre.files.map(filaIngres).join('')}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="lab">Total suma…</td>
          <td class="n">${num(llibre.totalTotal)}</td>
          <td class="n">${num(llibre.totalBase)}</td>
          <td class="n">${num(llibre.totalIva)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="resum">
      <div class="resum-row"><span>Base imponible</span><span>${num(llibre.totalBase)} €</span></div>
      <div class="resum-row"><span>IVA repercutido (10%)</span><span>${num(llibre.totalIva)} €</span></div>
      <div class="resum-row grand"><span>Total ingresos</span><span>${num(llibre.totalTotal)} €</span></div>
    </div>
    <p class="note">IVA repercutido del trimestre: ${num(llibre.totalIva)} €. El IVA soportado (facturas
    recibidas) y el resultado a ingresar/compensar se calcularán cuando los gastos incluyan el desglose de IVA.</p>`}
  </div>

</div>
<script>document.getElementById('print').addEventListener('click', () => window.print());</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
