import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { getLlibreIngressos, getGastosSoportats, type FilaIngres, type FilaGasto } from '@/lib/services/llibre-iva';

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

interface FilaEdit {
  data: string; numeroSimple: string; numeroFiscal: string; client: string; periode: string;
  base: number; ivaPercent: number; iva: number; total: number;
}
interface FilaGastoEdit {
  data: string; nif: string; proveidor: string; numFactura: string;
  base: number; ivaPercent: number; iva: number; irpfPercent: number; irpf: number; total: number;
}

export async function GET(_req: Request, ctx: { params: Promise<{ periode: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { periode } = await ctx.params;
  const m = periode.match(/^(\d{4})-([1-4])$/);
  if (!m) return new Response('Període no vàlid (format aaaa-T, p. ex. 2026-2)', { status: 400 });
  const year = Number(m[1]);
  const trimestre = Number(m[2]);

  // Si hi ha una versió DESADA (editada), es carrega aquesta; si no, es genera de
  // les factures. La data es normalitza sempre a "dd/mm/aaaa" (string editable).
  const desat = await prisma.llibreIvaTrimestre.findUnique({ where: { periode } });
  let etiqueta: string;
  let rows: FilaEdit[];
  let gastos: FilaGastoEdit[];
  if (desat) {
    etiqueta = desat.etiqueta;
    rows = (desat.files as unknown as FilaEdit[]).map((f) => ({
      data: String(f.data ?? ''), numeroSimple: String(f.numeroSimple ?? ''), numeroFiscal: String(f.numeroFiscal ?? ''),
      client: String(f.client ?? ''), periode: String(f.periode ?? ''),
      base: Number(f.base ?? 0), ivaPercent: Number(f.ivaPercent ?? 0), iva: Number(f.iva ?? 0), total: Number(f.total ?? 0),
    }));
    // Si ja s'havien desat gastos, es carreguen; si no (llibre desat abans que
    // existís la part de despeses), es generen dels gastos del trimestre.
    const gDesat = desat.gastos as unknown as FilaGastoEdit[] | null;
    gastos = gDesat
      ? gDesat.map((g) => ({
          data: String(g.data ?? ''), nif: String(g.nif ?? ''), proveidor: String(g.proveidor ?? ''),
          numFactura: String(g.numFactura ?? ''), base: Number(g.base ?? 0), ivaPercent: Number(g.ivaPercent ?? 0),
          iva: Number(g.iva ?? 0), irpfPercent: Number(g.irpfPercent ?? 0), irpf: Number(g.irpf ?? 0), total: Number(g.total ?? 0),
        }))
      : (await getGastosSoportats(year, trimestre)).map((g: FilaGasto) => ({
          data: fmtData(g.data), nif: g.nif, proveidor: g.proveidor, numFactura: g.numFactura,
          base: g.base, ivaPercent: g.ivaPercent, iva: g.iva, irpfPercent: g.irpfPercent, irpf: g.irpf, total: g.total,
        }));
  } else {
    const llibre = await getLlibreIngressos(year, trimestre);
    etiqueta = llibre.etiqueta;
    rows = llibre.files.map((f: FilaIngres) => ({
      data: fmtData(f.data), numeroSimple: f.numeroSimple, numeroFiscal: f.numeroFiscal, client: f.client,
      periode: f.periode, base: f.base, ivaPercent: f.ivaPercent, iva: f.iva, total: f.total,
    }));
    gastos = (await getGastosSoportats(year, trimestre)).map((g: FilaGasto) => ({
      data: fmtData(g.data), nif: g.nif, proveidor: g.proveidor, numFactura: g.numFactura,
      base: g.base, ivaPercent: g.ivaPercent, iva: g.iva, irpfPercent: g.irpfPercent, irpf: g.irpf, total: g.total,
    }));
  }
  const desatAt = desat ? fmtData(desat.updatedAt.toISOString()) : '';

  // Fila editable de "Facturas emitidas" (font de veritat; el "Libro de ingresos"
  // i els totals es reconstrueixen des d'aquí amb JS).
  const filaEmesa = (f: FilaEdit) => `
    <tr class="item">
      <td><input class="in f-data" value="${esc(f.data)}"></td>
      <td><input class="in f-ns" value="${esc(f.numeroSimple)}"></td>
      <td><input class="in f-nf" value="${esc(f.numeroFiscal)}"></td>
      <td><input class="in f-cli" value="${esc(f.client)}"></td>
      <td><input class="in f-per" value="${esc(f.periode)}"></td>
      <td class="c-n"><input class="in n f-base" inputmode="decimal" value="${num(f.base)}"></td>
      <td class="c-n"><input class="in n f-ivap" inputmode="decimal" value="${f.ivaPercent}"></td>
      <td class="c-n"><input class="in n f-iva" inputmode="decimal" value="${num(f.iva)}"></td>
      <td class="c-n"><input class="in n f-total" inputmode="decimal" value="${num(f.total)}"></td>
      <td class="c-del"><button class="del" type="button" title="Eliminar fila">×</button></td>
    </tr>`;

  // Fila editable de "Facturas recibidas · soportadas" (despeses).
  const filaGasto = (g: FilaGastoEdit) => `
    <tr class="gitem">
      <td><input class="in g-data" value="${esc(g.data)}"></td>
      <td><input class="in g-nif" value="${esc(g.nif)}"></td>
      <td><input class="in g-prov" value="${esc(g.proveidor)}"></td>
      <td><input class="in g-numf" value="${esc(g.numFactura)}"></td>
      <td class="c-n"><input class="in n g-base" inputmode="decimal" value="${num(g.base)}"></td>
      <td class="c-n"><input class="in n g-ivap" inputmode="decimal" value="${g.ivaPercent}"></td>
      <td class="c-n"><input class="in n g-iva" inputmode="decimal" value="${num(g.iva)}"></td>
      <td class="c-n"><input class="in n g-irpfp" inputmode="decimal" value="${g.irpfPercent}"></td>
      <td class="c-n"><input class="in n g-irpf" inputmode="decimal" value="${num(g.irpf)}"></td>
      <td class="c-n"><input class="in n g-total" inputmode="decimal" value="${num(g.total)}"></td>
      <td class="c-del"><button class="del" type="button" title="Eliminar fila">×</button></td>
    </tr>`;

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Llibre d'IVA · Ingressos · ${esc(etiqueta)} · Hostal Coll</title>
<style>
  :root{ --ink:#2C1810; --slate:#3C2828; --muted:#7A6868; --line:#E5D8D5; --accent:#7A1F2B; --accent-soft:#F7EEEC; --paper:#fff; --app:#F0ECEB; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{ background:var(--app); color:var(--slate); font-family:"Manrope","Segoe UI",system-ui,sans-serif; font-size:12px; -webkit-font-smoothing:antialiased; }
  .toolbar{ position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;
    gap:10px; padding:12px 20px; background:rgba(255,252,248,.95); backdrop-filter:blur(10px); border-bottom:1px solid #E1D9D7; }
  .tb-brand{ font-family:Georgia,serif; color:var(--ink); font-size:16px; }
  .tb-actions{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .badge-saved{ font-size:11px; color:#0a7d33; background:#e7f6ec; border:1px solid #b6e2c4; border-radius:20px; padding:3px 10px; }
  .btn{ font:inherit; font-size:13px; padding:9px 14px; border-radius:9px; cursor:pointer; border:1px solid; }
  .btn.ghost{ background:#fff; color:var(--ink); border-color:var(--ink); }
  .btn.solid{ background:var(--accent); color:#fff; border-color:var(--accent); }
  .app{ padding:22px 16px 48px; }
  .sheet{ width:100%; max-width:1180px; margin:0 auto 22px; background:var(--paper); overflow-x:auto;
    padding:36px 40px; border:1px solid #EDE5E2; border-radius:3px; box-shadow:0 10px 34px rgba(44,24,16,.08); }
  .brand{ font-family:Georgia,serif; font-size:28px; color:var(--ink); letter-spacing:.5px; }
  .brand-sub{ font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:var(--accent); margin-top:6px; }
  .rule{ position:relative; border-top:1.5px solid var(--ink); margin:16px 0 6px; }
  .rule::before{ content:""; position:absolute; top:3px; left:0; width:56px; border-top:3px solid var(--accent); }
  .period{ text-align:center; font-weight:600; letter-spacing:1px; margin:14px 0 4px; color:var(--ink); }
  .doc-title{ text-align:center; font-size:13px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--accent); margin:2px 0 16px; }
  table{ width:100%; border-collapse:collapse; }
  th{ font-size:9.5px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); font-weight:600; text-align:left; padding:0 6px 7px; border-bottom:1.5px solid var(--ink); }
  th.n{ text-align:right; }
  td{ padding:3px 4px; border-bottom:1px solid var(--line); vertical-align:middle; }
  td.c-n{ text-align:right; }
  td.c-del{ width:26px; }
  .in{ font:inherit; color:inherit; border:0; background:transparent; width:100%; padding:4px 5px; border-radius:5px; }
  .in:focus{ outline:none; background:var(--accent-soft); box-shadow:inset 0 0 0 1px rgba(122,31,43,.3); }
  .in.n{ text-align:right; font-variant-numeric:tabular-nums; }
  /* Taules amb columnes REDIMENSIONABLES: amplada fixa per columna (colgroup) i
     una nansa a la vora dreta de cada capçalera per arrossegar-la. */
  table.rz{ table-layout:fixed; width:100%; }
  table.rz th{ position:relative; overflow:hidden; }
  .resizer{ position:absolute; top:0; right:0; width:8px; height:100%; cursor:col-resize; z-index:3; }
  .resizer:hover{ background:rgba(122,31,43,.3); }
  .del{ border:0; background:transparent; cursor:pointer; color:#C2BFB6; font-size:17px; line-height:1; width:22px; height:22px; border-radius:6px; }
  .del:hover{ background:#F1E4E0; color:#A23A2B; }
  tfoot td{ border-top:1.5px solid var(--ink); border-bottom:none; font-weight:700; color:var(--ink); padding-top:9px; }
  tfoot td.lab{ text-align:right; text-transform:uppercase; letter-spacing:.5px; font-size:10px; }
  td.roN{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; padding:7px 6px; }
  td.roC{ font-weight:600; color:var(--slate); padding:7px 6px; }
  td.ro{ padding:7px 6px; }
  .buit{ color:var(--muted); font-style:italic; padding:14px 6px; }
  .resum{ margin-top:16px; margin-left:auto; width:280px; }
  .resum-row{ display:flex; justify-content:space-between; padding:7px 12px; }
  .resum-row.grand{ background:var(--accent-soft); border-top:2px solid var(--accent); border-radius:4px; font-family:Georgia,serif; font-size:14px; color:var(--ink); }
  .note{ font-size:10px; color:var(--muted); margin-top:14px; font-style:italic; line-height:1.5; }
  .add{ margin-top:10px; }
  .add button{ font:inherit; font-size:12px; color:var(--accent); background:#fff; border:1px dashed var(--accent); border-radius:8px; padding:6px 12px; cursor:pointer; }
  @page{ size:A4 landscape; margin:12mm; }
  @media print{
    body{ background:#fff; } .toolbar,.c-del,.del,.add,.resizer{ display:none !important; } .app{ padding:0; }
    .sheet{ box-shadow:none; border:none; border-radius:0; max-width:none; padding:0; }
    .sheet + .sheet{ page-break-before:always; }
    .in:focus{ background:transparent; box-shadow:none; }
    *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <div class="tb-brand">Hostal Coll · Llibre d'IVA · ${esc(etiqueta)}</div>
  <div class="tb-actions">
    <span id="saved" class="badge-saved" style="${desatAt ? '' : 'display:none'}">Desat ${esc(desatAt)}</span>
    <button id="addRow" class="btn ghost">+ Afegir fila</button>
    <button id="save" class="btn ghost">Desar</button>
    <button id="print" class="btn solid">Imprimir / Guardar PDF</button>
  </div>
</div>
<div class="app">

  <!-- ── Facturas emitidas - repercutidas (EDITABLE) ─────────────────── -->
  <div class="sheet">
    <div class="brand">HOSTAL COLL</div>
    <div class="brand-sub">Casa de Hostes · Calella</div>
    <div class="rule"></div>
    <div class="period">${esc(etiqueta)}</div>
    <div class="doc-title">Facturas emitidas · Repercutidas</div>
    <table id="emeses" class="rz">
      <colgroup>
        <col style="width:88px"><col style="width:95px"><col style="width:95px"><col style="width:205px"><col style="width:150px"><col style="width:88px"><col style="width:50px"><col style="width:85px"><col style="width:92px"><col style="width:28px">
      </colgroup>
      <thead>
        <tr>
          <th>Fecha<span class="resizer"></span></th><th>Nº Factura S.<span class="resizer"></span></th><th>Nº Factura F.<span class="resizer"></span></th><th>Cliente<span class="resizer"></span></th>
          <th>Período de estancia<span class="resizer"></span></th><th class="n">Base imponible<span class="resizer"></span></th><th class="n">% IVA<span class="resizer"></span></th>
          <th class="n">IVA<span class="resizer"></span></th><th class="n">Total<span class="resizer"></span></th><th></th>
        </tr>
      </thead>
      <tbody>${rows.map(filaEmesa).join('')}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="lab">Total…</td>
          <td class="c-n" id="t1-base">0,00</td>
          <td></td>
          <td class="c-n" id="t1-iva">0,00</td>
          <td class="c-n" id="t1-total">0,00</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <div class="add"><button id="addRow2" type="button">+ Afegir fila</button></div>
  </div>

  <!-- ── Libro de ingresos (derivat, es reconstrueix des de dalt) ────── -->
  <div class="sheet">
    <div class="brand">HOSTAL COLL</div>
    <div class="brand-sub">Casa de Hostes · Calella</div>
    <div class="rule"></div>
    <div class="period">${esc(etiqueta)}</div>
    <div class="doc-title">Libro de ingresos</div>
    <table id="ingressos" class="rz">
      <colgroup>
        <col style="width:110px"><col style="width:130px"><col style="width:130px"><col style="width:300px"><col style="width:140px"><col style="width:140px"><col style="width:140px">
      </colgroup>
      <thead>
        <tr>
          <th>Fecha<span class="resizer"></span></th><th>Nº Factura S.<span class="resizer"></span></th><th>Nº Factura F.<span class="resizer"></span></th><th>Cliente<span class="resizer"></span></th>
          <th class="n">Importe<span class="resizer"></span></th><th class="n">Base imponible<span class="resizer"></span></th><th class="n">IVA 10%</th>
        </tr>
      </thead>
      <tbody></tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="lab">Total suma…</td>
          <td class="roN" id="t2-total">0,00</td>
          <td class="roN" id="t2-base">0,00</td>
          <td class="roN" id="t2-iva">0,00</td>
        </tr>
      </tfoot>
    </table>
    <div class="resum">
      <div class="resum-row"><span>Base imponible</span><span id="r-base">0,00 €</span></div>
      <div class="resum-row"><span>IVA repercutido (10%)</span><span id="r-iva">0,00 €</span></div>
      <div class="resum-row grand"><span>Total ingresos</span><span id="r-total">0,00 €</span></div>
    </div>
  </div>

  <!-- ── Facturas recibidas - soportadas (EDITABLE) ──────────────────── -->
  <div class="sheet">
    <div class="brand">HOSTAL COLL</div>
    <div class="brand-sub">Casa de Hostes · Calella</div>
    <div class="rule"></div>
    <div class="period">${esc(etiqueta)}</div>
    <div class="doc-title">Facturas recibidas · Soportadas</div>
    <table id="gastos" class="rz">
      <colgroup>
        <col style="width:88px"><col style="width:92px"><col style="width:180px"><col style="width:130px"><col style="width:88px"><col style="width:50px"><col style="width:82px"><col style="width:50px"><col style="width:82px"><col style="width:90px"><col style="width:28px">
      </colgroup>
      <thead>
        <tr>
          <th>Fecha<span class="resizer"></span></th><th>NIF<span class="resizer"></span></th><th>Proveedor<span class="resizer"></span></th><th>Nº factura<span class="resizer"></span></th>
          <th class="n">Base imponible<span class="resizer"></span></th><th class="n">% IVA<span class="resizer"></span></th><th class="n">IVA<span class="resizer"></span></th>
          <th class="n">% IRPF<span class="resizer"></span></th><th class="n">IRPF<span class="resizer"></span></th><th class="n">Total<span class="resizer"></span></th><th></th>
        </tr>
      </thead>
      <tbody>${gastos.map(filaGasto).join('')}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="lab">Total…</td>
          <td class="c-n" id="g-base">0,00</td>
          <td></td>
          <td class="c-n" id="g-iva">0,00</td>
          <td></td>
          <td class="c-n" id="g-irpf">0,00</td>
          <td class="c-n" id="g-total">0,00</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    <div class="add"><button id="addGasto" type="button">+ Afegir despesa</button></div>
    <p class="note">Per defecte les despeses es calculen amb IVA 21% inclòs (escrivint el total). Per a un
    LLOGUER o servei amb retenció, escriu la <strong>base</strong>, el <strong>% IVA</strong> (21) i el
    <strong>% IRPF</strong> (19): l'IVA, l'IRPF i el total (base + IVA − IRPF) es calculen sols. El nº de
    factura s'omple a mà. IRPF total del trimestre: <span id="g-irpf2">0,00</span> € (per al model 115).</p>
  </div>

  <!-- ── Resumen IVA: Repercutido / Soportado → a ingresar ───────────── -->
  <div class="sheet">
    <div class="brand">HOSTAL COLL</div>
    <div class="brand-sub">Casa de Hostes · Calella</div>
    <div class="rule"></div>
    <div class="period">${esc(etiqueta)}</div>
    <div class="doc-title">Liquidación de IVA · Repercutido / Soportado</div>
    <table class="rz">
      <colgroup>
        <col style="width:700px"><col style="width:195px"><col style="width:195px">
      </colgroup>
      <thead>
        <tr><th>Concepto<span class="resizer"></span></th><th class="n">Base imponible<span class="resizer"></span></th><th class="n">IVA</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="roC">IVA repercutido (facturas emitidas)</td>
          <td class="roN" id="s-rep-base">0,00</td>
          <td class="roN" id="s-rep-iva">0,00</td>
        </tr>
        <tr>
          <td class="roC">IVA soportado (facturas recibidas)</td>
          <td class="roN" id="s-sop-base">0,00</td>
          <td class="roN" id="s-sop-iva">0,00</td>
        </tr>
      </tbody>
    </table>
    <div class="resum">
      <div class="resum-row"><span>IVA repercutido</span><span id="s-rep">0,00 €</span></div>
      <div class="resum-row"><span>IVA soportado</span><span id="s-sop">0,00 €</span></div>
      <div class="resum-row grand"><span id="s-lab">Resultado a ingresar</span><span id="s-res">0,00 €</span></div>
    </div>
    <p class="note">Resultado = IVA repercutido − IVA soportado. Si sale positivo es a <strong>ingresar</strong>
    a Hacienda; si sale negativo, a <strong>compensar/devolver</strong> (modelo 303).</p>
  </div>

</div>
<script>
  const PERIODE = ${JSON.stringify(periode)};
  const ETIQUETA = ${JSON.stringify(etiqueta)};
  const num = v => {
    if (v == null) return 0;
    let s = String(v).trim(); if (!s) return 0;
    const hasDot = s.includes('.'), hasComma = s.includes(',');
    if (hasDot && hasComma) s = s.replace(/\\./g, '').replace(',', '.');
    else if (hasComma) s = s.replace(',', '.');
    else if (hasDot && !/^\\d+\\.\\d{1,2}$/.test(s)) s = s.replace(/\\./g, '');
    const n = parseFloat(s.replace(/[^0-9.\\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const plain = n => n.toLocaleString('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function readRows() {
    return Array.from(document.querySelectorAll('#emeses tbody tr.item')).map(r => ({
      data: r.querySelector('.f-data').value.trim(),
      numeroSimple: r.querySelector('.f-ns').value.trim(),
      numeroFiscal: r.querySelector('.f-nf').value.trim(),
      client: r.querySelector('.f-cli').value.trim(),
      periode: r.querySelector('.f-per').value.trim(),
      base: num(r.querySelector('.f-base').value),
      ivaPercent: num(r.querySelector('.f-ivap').value),
      iva: num(r.querySelector('.f-iva').value),
      total: num(r.querySelector('.f-total').value),
    }));
  }

  function readGastos() {
    return Array.from(document.querySelectorAll('#gastos tbody tr.gitem')).map(r => ({
      data: r.querySelector('.g-data').value.trim(),
      nif: r.querySelector('.g-nif').value.trim(),
      proveidor: r.querySelector('.g-prov').value.trim(),
      numFactura: r.querySelector('.g-numf').value.trim(),
      base: num(r.querySelector('.g-base').value),
      ivaPercent: num(r.querySelector('.g-ivap').value),
      iva: num(r.querySelector('.g-iva').value),
      irpfPercent: num(r.querySelector('.g-irpfp').value),
      irpf: num(r.querySelector('.g-irpf').value),
      total: num(r.querySelector('.g-total').value),
    }));
  }

  function render() {
    const rows = readRows();
    let tb = 0, ti = 0, tt = 0;
    for (const r of rows) { tb += r.base; ti += r.iva; tt += r.total; }
    document.getElementById('t1-base').textContent = plain(tb);
    document.getElementById('t1-iva').textContent = plain(ti);
    document.getElementById('t1-total').textContent = plain(tt);
    // Reconstrueix "Libro de ingresos"
    const body = rows.map(r => '<tr>' +
      '<td class="ro">' + esc(r.data) + '</td>' +
      '<td class="ro">' + esc(r.numeroSimple) + '</td>' +
      '<td class="ro">' + esc(r.numeroFiscal) + '</td>' +
      '<td class="roC">' + esc(r.client) + '</td>' +
      '<td class="roN">' + plain(r.total) + '</td>' +
      '<td class="roN">' + plain(r.base) + '</td>' +
      '<td class="roN">' + plain(r.iva) + '</td>' +
    '</tr>').join('');
    document.querySelector('#ingressos tbody').innerHTML = body;
    document.getElementById('t2-total').textContent = plain(tt);
    document.getElementById('t2-base').textContent = plain(tb);
    document.getElementById('t2-iva').textContent = plain(ti);
    document.getElementById('r-base').textContent = plain(tb) + ' €';
    document.getElementById('r-iva').textContent = plain(ti) + ' €';
    document.getElementById('r-total').textContent = plain(tt) + ' €';

    // Despeses (facturas soportadas) + liquidació d'IVA
    const gastos = readGastos();
    let gb = 0, gi = 0, girpf = 0, gt = 0;
    for (const g of gastos) { gb += g.base; gi += g.iva; girpf += g.irpf; gt += g.total; }
    document.getElementById('g-base').textContent = plain(gb);
    document.getElementById('g-iva').textContent = plain(gi);
    document.getElementById('g-irpf').textContent = plain(girpf);
    document.getElementById('g-total').textContent = plain(gt);
    document.getElementById('g-irpf2').textContent = plain(girpf);
    document.getElementById('s-rep-base').textContent = plain(tb);
    document.getElementById('s-rep-iva').textContent = plain(ti);
    document.getElementById('s-sop-base').textContent = plain(gb);
    document.getElementById('s-sop-iva').textContent = plain(gi);
    document.getElementById('s-rep').textContent = plain(ti) + ' €';
    document.getElementById('s-sop').textContent = plain(gi) + ' €';
    const resultat = Math.round((ti - gi) * 100) / 100;
    document.getElementById('s-lab').textContent = resultat >= 0 ? 'Resultado a ingresar' : 'Resultado a compensar/devolver';
    document.getElementById('s-res').textContent = plain(Math.abs(resultat)) + ' €';
  }

  function novaFila() {
    const tbody = document.querySelector('#emeses tbody');
    const first = document.querySelector('#emeses tbody tr.item');
    let row;
    if (first) { row = first.cloneNode(true); row.querySelectorAll('input').forEach(i => i.value = ''); }
    else {
      row = document.createElement('tr'); row.className = 'item';
      row.innerHTML = '<td><input class="in f-data"></td><td><input class="in f-ns"></td><td><input class="in f-nf"></td>' +
        '<td><input class="in f-cli"></td><td><input class="in f-per"></td><td class="c-n"><input class="in n f-base"></td>' +
        '<td class="c-n"><input class="in n f-ivap"></td><td class="c-n"><input class="in n f-iva"></td>' +
        '<td class="c-n"><input class="in n f-total"></td><td class="c-del"><button class="del" type="button">×</button></td>';
    }
    tbody.appendChild(row); render(); row.querySelector('.f-cli').focus();
  }

  function novaGasto() {
    const tbody = document.querySelector('#gastos tbody');
    const first = document.querySelector('#gastos tbody tr.gitem');
    let row;
    if (first) { row = first.cloneNode(true); row.querySelectorAll('input').forEach(i => i.value = ''); }
    else {
      row = document.createElement('tr'); row.className = 'gitem';
      row.innerHTML = '<td><input class="in g-data"></td><td><input class="in g-nif"></td><td><input class="in g-prov"></td>' +
        '<td><input class="in g-numf"></td><td class="c-n"><input class="in n g-base"></td>' +
        '<td class="c-n"><input class="in n g-ivap"></td><td class="c-n"><input class="in n g-iva"></td>' +
        '<td class="c-n"><input class="in n g-irpfp"></td><td class="c-n"><input class="in n g-irpf"></td>' +
        '<td class="c-n"><input class="in n g-total"></td><td class="c-del"><button class="del" type="button">×</button></td>';
    }
    tbody.appendChild(row); render(); row.querySelector('.g-prov').focus();
  }

  // Auto-càlcul a les despeses. Dos camins:
  //  · Escrivint el TOTAL (i %IVA), sense IRPF: base = total/(1+%IVA/100), IVA = total − base
  //    (cas ràpid d'una compra amb IVA inclòs, com Grupsupeco/Vodafone).
  //  · Escrivint la BASE (i %IVA i %IRPF): IVA = base·%IVA, IRPF = base·%IRPF,
  //    Total = base + IVA − IRPF (cas del LLOGUER amb retenció).
  function autoGasto(input) {
    const row = input.closest('#gastos tbody tr.gitem');
    if (!row) return;
    const r2 = n => Math.round(n * 100) / 100;
    const ivap = num(row.querySelector('.g-ivap').value);
    const irpfp = num(row.querySelector('.g-irpfp').value);
    if (input.classList.contains('g-total')) {
      // Camí "total inclòs" (nomes si no hi ha IRPF; amb IRPF cal escriure la base).
      const total = num(row.querySelector('.g-total').value);
      if (total === 0) return;
      const base = r2(total / (1 + ivap / 100));
      row.querySelector('.g-base').value = plain(base);
      row.querySelector('.g-iva').value = plain(r2(total - base));
      return;
    }
    if (input.classList.contains('g-base') || input.classList.contains('g-ivap') || input.classList.contains('g-irpfp')) {
      const base = num(row.querySelector('.g-base').value);
      if (base === 0) return;
      const iva = r2(base * ivap / 100);
      const irpf = r2(base * irpfp / 100);
      row.querySelector('.g-iva').value = plain(iva);
      row.querySelector('.g-irpf').value = plain(irpf);
      row.querySelector('.g-total').value = plain(r2(base + iva - irpf));
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('input', e => {
    if (e.target.closest('#gastos tbody')) autoGasto(e.target);
    if (e.target.closest('#emeses tbody') || e.target.closest('#gastos tbody')) render();
  });
  document.addEventListener('click', e => {
    if (e.target.classList.contains('del')) { e.target.closest('tr').remove(); render(); }
  });
  document.getElementById('addRow').addEventListener('click', novaFila);
  document.getElementById('addRow2').addEventListener('click', novaFila);
  document.getElementById('addGasto').addEventListener('click', novaGasto);
  document.getElementById('print').addEventListener('click', () => window.print());

  // Columnes redimensionables: arrossega la nansa de la vora dreta de cada
  // capçalera per fer la columna més ampla o més estreta (les que no es veuen bé,
  // p. ex. Nº factura o Client; i encongir les de % IVA / IVA / % IRPF / IRPF).
  document.querySelectorAll('table.rz th .resizer').forEach((rz) => {
    rz.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const th = rz.closest('th'); const table = rz.closest('table');
      const cols = table.querySelectorAll('colgroup col');
      const idx = Array.prototype.indexOf.call(th.parentNode.children, th);
      const col = cols[idx]; if (!col) return;
      const nextCol = cols[idx + 1];
      const ths = table.querySelectorAll('thead th');
      const startX = e.pageX; const w0 = th.offsetWidth; const wNext0 = ths[idx + 1] ? ths[idx + 1].offsetWidth : 0;
      // Amplada total constant: el que creix una columna, l'encongeix la del costat
      // (així les taules segueixen ocupant tota l'amplada).
      const move = (ev) => {
        const d = ev.pageX - startX;
        col.style.width = Math.max(40, w0 + d) + 'px';
        if (nextCol) nextCol.style.width = Math.max(40, wNext0 - d) + 'px';
      };
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; };
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  });

  document.getElementById('save').addEventListener('click', async () => {
    const btn = document.getElementById('save');
    const orig = btn.textContent; btn.disabled = true; btn.textContent = 'Desant…';
    try {
      const res = await fetch('/api/llibre-iva/' + encodeURIComponent(PERIODE), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etiqueta: ETIQUETA, files: readRows(), gastos: readGastos() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Error desant'); }
      const d = await res.json();
      const s = document.getElementById('saved');
      const dt = new Date(d.updatedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
      s.textContent = 'Desat ' + dt; s.style.display = '';
      btn.textContent = 'Desat ✓'; setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1600);
    } catch (e) { alert(e && e.message ? e.message : 'No s\\'ha pogut desar'); btn.textContent = orig; btn.disabled = false; }
  });
</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
