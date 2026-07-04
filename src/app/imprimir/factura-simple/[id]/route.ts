import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function plain(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const ambCustodia = url.searchParams.get('custodia') === 'true';

  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      cobraments: true,
      estancia: {
        include: {
          habitacio: true,
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
          diposits: { where: { estat: 'EN_CUSTODIA' }, orderBy: { data: 'asc' } },
        },
      },
    },
  });
  if (!factura) return new Response('Not found', { status: 404 });

  const establiment = await prisma.establiment.findFirst();
  const titular = factura.estancia.viatgers[0]?.huesped ?? null;

  // Si la fiança ja va inclosa a la base (fiancaInclosa), no la tornem a afegir
  // com a bloc de custòdia (evita duplicar-la).
  const diposits = ambCustodia && !factura.fiancaInclosa ? factura.estancia.diposits : [];

  const emNom = esc(establiment?.raoSocial || establiment?.nom || 'Hostal Coll');
  const emDescriptor = esc(establiment?.poblacio ? `Casa de Hostes · ${establiment.poblacio}` : 'Casa de Hostes · Calella');
  const emTelefon = esc(establiment?.telefon ? `Tel. ${establiment.telefon}` : '');

  // Número: només la part seqüencial, sense l'any (2026-0001 → 0001).
  const numeroDisplay = esc(factura.numero.replace(/^\d{4}-/, ''));

  const habDates = esc(
    factura.estancia.dataEntrada && factura.estancia.dataSortida
      ? `Del ${fmtDate(factura.estancia.dataEntrada)} al ${fmtDate(factura.estancia.dataSortida)}`
      : '',
  );

  const clientNom = titular
    ? esc([titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' '))
    : '';
  const clientNif = esc(titular?.numDocument ? `${titular.tipusDocument ?? 'DNI'} ${titular.numDocument}` : '');
  const clientAdreca = esc(titular?.adreca ?? '');
  const clientCpPob = esc([titular?.codiPostal, titular?.municipi || titular?.localitat].filter(Boolean).join(' '));

  // Línies des de la base de dades (font de veritat de l'import facturat)
  const linesHtml = factura.linies.map((l) => {
    const label = esc(l.descripcio ?? l.concepte);
    // Per a línies d'allotjament sense dates a la descripció, afegim-les com a detall
    const needsDates = l.concepte === 'ALLOTJAMENT' && habDates && !label.includes('Del ');
    return `
    <tr class="item">
      <td class="c-qty"><input class="in qty" inputmode="decimal" aria-label="Quantitat" value="1"></td>
      <td>
        <input class="in concept" aria-label="Concepte" value="${label}">
        ${needsDates ? `<input class="in detail" aria-label="Detall" value="${habDates}" placeholder="">` : ''}
      </td>
      <td class="c-amt"><input class="in price" inputmode="decimal" aria-label="Preu" value="${plain(Number(l.import))}"></td>
      <td class="c-amt"><input class="in amount" inputmode="decimal" aria-label="Import" value="${plain(Number(l.import))}"></td>
      <td class="it-del"><button class="del" type="button" aria-label="Eliminar línia">×</button></td>
    </tr>`;
  }).join('');

  // Total: suma de línies + dipòsits inclosos
  const totalLinies = round2(factura.linies.reduce((a, l) => a + Number(l.import), 0));
  const totalCobraments = round2(totalLinies + diposits.reduce((a, d) => a + Number(d.import), 0));

  // Línies de dipòsit (fiança) addicionals si s'inclou (amb custodia)
  const dipositsHtml = diposits.length > 0 ? diposits.map((d) => `
    <tr class="item">
      <td class="c-qty"><input class="in qty" inputmode="decimal" aria-label="Quantitat" value="1"></td>
      <td><input class="in concept" aria-label="Concepte" value="${esc((d.notes ?? 'Fiança') + ' ' + fmtDate(d.data))}"></td>
      <td class="c-amt"><input class="in price" inputmode="decimal" aria-label="Preu" value="${esc(plain(Number(d.import)))}"></td>
      <td class="c-amt"><input class="in amount" inputmode="decimal" aria-label="Import" value="${esc(plain(Number(d.import)))}"></td>
      <td class="it-del"><button class="del" type="button" aria-label="Eliminar línia">×</button></td>
    </tr>`).join('') : '';

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factura simplificada · Hostal Coll</title>
<style>
  :root{
    --ink:#2C1810;
    --slate:#3C2828;
    --muted:#7A6868;
    --line:#E5D8D5;
    --accent:#7A1F2B;
    --accent-soft:#F7EEEC;
    --warm-tint:#F5ECEC;
    --paper:#FFFCF8;
    --app:#F0ECEB;
  }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{
    background:var(--app); color:var(--slate);
    font-family:"Manrope","Segoe UI",system-ui,sans-serif;
    font-size:13.5px; line-height:1.5; -webkit-font-smoothing:antialiased;
  }
  .toolbar{
    position:sticky; top:0; z-index:10;
    display:flex; align-items:center; justify-content:space-between; gap:16px;
    padding:12px 20px; background:rgba(255,252,248,.92); backdrop-filter:blur(10px);
    border-bottom:1px solid #E1D9D7;
  }
  .tb-brand{ font-family:Georgia,serif; color:var(--ink); font-size:16px; letter-spacing:.3px; }
  .tb-badge{ font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
    color:var(--accent); background:var(--accent-soft); border-radius:4px; padding:3px 8px; margin-left:10px; }
  .tb-actions{ display:flex; gap:10px; }
  .btn{ font:inherit; font-size:13px; line-height:1; padding:10px 15px; border-radius:9px; cursor:pointer;
        border:1px solid; transition:transform .12s ease, background .15s ease; }
  .btn:active{ transform:translateY(1px); }
  .btn.ghost{ background:#fff; color:var(--ink); border-color:var(--ink); }
  .btn.ghost:hover{ background:#F5EEEC; }
  .btn.solid{ background:var(--accent); color:#fff; border-color:var(--accent); }
  .btn.solid:hover{ background:#621829; }
  .app{ padding:24px 16px 48px; }
  .invoice{
    width:100%; max-width:820px; margin:0 auto; background:var(--paper);
    padding:52px 56px 40px; border:1px solid #EDE5E2; border-radius:3px;
    box-shadow:0 14px 44px rgba(44,24,16,.10); animation:rise .5s ease both;
  }
  @keyframes rise{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } }
  @media (prefers-reduced-motion:reduce){ .invoice{ animation:none; } }
  .masthead{ display:flex; justify-content:space-between; align-items:flex-start; gap:30px; }
  .brand{ font-family:Georgia,serif; font-size:42px; line-height:.95; color:var(--ink); letter-spacing:.5px; }
  .brand-sub{ font-size:10.5px; letter-spacing:3.5px; text-transform:uppercase; color:var(--accent); margin-top:9px; }
  .issuer{ text-align:right; color:var(--muted); font-size:12px; line-height:1.7; min-width:210px; }
  .rule{ position:relative; border-top:1.5px solid var(--ink); margin:22px 0 30px; }
  .rule::before{ content:""; position:absolute; top:4px; left:0; width:66px; border-top:3px solid var(--accent); }
  .head-grid{ display:flex; justify-content:space-between; align-items:flex-start; gap:40px; margin-bottom:30px; }
  .bill-to{ flex:1 1 auto; max-width:330px; }
  .eyebrow{ font-size:10px; text-transform:uppercase; letter-spacing:2px; color:var(--muted); margin-bottom:8px; }
  .client-name{ font-size:15.5px; font-weight:600; color:var(--slate); }
  .meta{ flex:0 0 auto; text-align:right; min-width:210px; }
  .meta-title{ font-family:Georgia,serif; font-size:28px; color:var(--ink); letter-spacing:1px; line-height:1; }
  .meta-badge{ display:inline-block; margin:5px 0 12px; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:var(--accent); }
  .meta-row{ display:flex; justify-content:flex-end; align-items:baseline; gap:10px; }
  .meta-row .k{ font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); }
  .meta-row .v{ font-weight:600; color:var(--slate); min-width:96px; }
  table.items{ width:100%; border-collapse:collapse; }
  table.items th{
    font-size:10.5px; text-transform:uppercase; letter-spacing:1.4px; color:var(--muted);
    font-weight:600; text-align:left; padding:0 0 9px; border-bottom:1.5px solid var(--ink);
  }
  table.items th.c-amt{ text-align:right; }
  table.items th.c-qty{ text-align:center; }
  table.items td{ padding:12px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  .c-qty{ width:54px; text-align:center; }
  .c-amt{ width:116px; text-align:right; padding-left:14px !important; }
  .it-del{ width:30px; }
  .concept{ font-weight:600; color:var(--slate); }
  .detail{ color:var(--muted); font-size:12.5px; margin-top:2px; }
  .summary{ margin:24px 0 0 auto; width:310px; }
  .sum-row{ display:flex; justify-content:space-between; align-items:center; padding:9px 12px; }
  .sum-row .lab{ color:var(--muted); }
  .sum-row .val{ font-weight:600; font-variant-numeric:tabular-nums; }
  .sum-row.grand{ margin-top:6px; background:var(--warm-tint); border-top:2px solid var(--accent); border-radius:4px; padding:13px 12px; }
  .sum-row.grand .lab{ color:var(--ink); font-family:Georgia,serif; font-size:16px; letter-spacing:.5px; }
  .sum-row.grand .val{ color:var(--ink); font-size:20px; }
  .iva-note{ text-align:right; font-size:10.5px; color:var(--muted); margin-top:7px; padding-right:12px; font-style:italic; }

  .footer{ display:flex; justify-content:space-between; align-items:flex-end; gap:30px; margin-top:38px; padding-top:16px; border-top:1px solid var(--line); }
  .pay{ display:grid; grid-template-columns:auto 1fr; gap:5px 12px; align-items:center; max-width:360px; }
  .pay-lab{ font-size:10px; text-transform:uppercase; letter-spacing:1.4px; color:var(--muted); }
  .note{ font-family:Georgia,serif; color:var(--ink); font-size:15px; white-space:nowrap; }
  .in{ font:inherit; color:inherit; letter-spacing:inherit; border:0; background:transparent; width:100%;
       padding:2px 4px; margin:-2px -4px; border-radius:5px; }
  .in:focus{ outline:none; background:var(--accent-soft); box-shadow:inset 0 0 0 1px rgba(122,31,43,.3); }
  .in::placeholder{ color:#C8BFBE; }
  .v .in{ text-align:right; }
  .issuer .in{ text-align:right; }
  .qty{ text-align:center; font-variant-numeric:tabular-nums; }
  .price, .amount{ text-align:right; font-variant-numeric:tabular-nums; }
  .rate{ width:38px; text-align:center; font-variant-numeric:tabular-nums; }
  .del{ border:0; background:transparent; cursor:pointer; color:#C2BFB6; font-size:18px; line-height:1;
        width:24px; height:24px; border-radius:6px; }
  .del:hover{ background:#F1E4E0; color:#A23A2B; }
  @media (max-width:680px){
    .invoice{ padding:34px 22px 30px; }
    .brand{ font-size:34px; }
    .masthead,.head-grid,.footer{ flex-direction:column; gap:18px; }
    .issuer,.meta{ text-align:left; }
    .issuer .in,.v .in,.meta-row{ text-align:left; }
    .meta-row{ justify-content:flex-start; }
    .summary{ width:100%; }
    .items-wrap{ overflow-x:auto; }
    table.items{ min-width:500px; }
  }
  @page{ size:A4; margin:14mm; }
  @media print{
    body{ background:#fff; }
    .toolbar{ display:none !important; }
    .app{ padding:0; }
    .invoice{ box-shadow:none; border:none; border-radius:0; max-width:none; padding:0; animation:none; }
    .it-del,.del{ display:none !important; }
    .in:focus{ background:transparent; box-shadow:none; }
    *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <div class="tb-brand">Hostal Coll<span class="tb-badge">${ambCustodia ? 'Factura simple amb fiança' : 'Factura simple'}</span></div>
  <div class="tb-actions">
    <button id="addLine" class="btn ghost">+ Afegir línia</button>
    <button id="print" class="btn solid">Imprimir / Guardar PDF</button>
  </div>
</div>

<div class="app">
  <div class="invoice">

    <header class="masthead">
      <div>
        <div class="brand"><input class="in" aria-label="Nom" value="${emNom}"></div>
        <div class="brand-sub"><input class="in" aria-label="Descriptor" value="${emDescriptor}" style="width:280px"></div>
      </div>
      <div class="issuer">
        <input class="in" aria-label="Titular" value="Elisabet Nualart Coll" style="color:var(--slate);font-weight:500"><br>
        <input class="in" aria-label="NIF" value="NIF 38835174L"><br>
        <input class="in" aria-label="Adreça" value="C/ Sant Isidre, 54"><br>
        <input class="in" aria-label="CP i Localitat" value="08370 Calella (Barcelona)"><br>
        <input class="in" aria-label="Telèfon" value="${emTelefon}">
      </div>
    </header>

    <div class="rule"></div>

    <section class="head-grid">
      <div class="bill-to">
        <div class="eyebrow">Client</div>
        <div class="client-name"><input class="in" aria-label="Nom del client" value="${clientNom}"></div>
        <div><input class="in" aria-label="NIF/DNI" value="${clientNif}" placeholder="NIF / DNI (opcional)"></div>
        <div><input class="in" aria-label="Adreça" value="${clientAdreca}" placeholder="Domicili (opcional)"></div>
        <div><input class="in" aria-label="Localitat" value="${clientCpPob}" placeholder="Localitat (opcional)"></div>
      </div>
      <div class="meta">
        <div class="meta-title">Factura</div>
        <div class="meta-badge">Simplificada</div>
        <div class="meta-row"><span class="k">Número</span><span class="v"><input class="in" aria-label="Número" value="${numeroDisplay}"></span></div>
        <div class="meta-row"><span class="k">Data</span><span class="v"><input class="in" aria-label="Data" value="${fmtDate(factura.data)}"></span></div>
        ${factura.estancia.habitacio?.nom ? `<div class="meta-row"><span class="k">Habitació</span><span class="v"><input class="in" aria-label="Habitació" value="${esc(factura.estancia.habitacio.nom)}"></span></div>` : ''}
      </div>
    </section>

    <div class="items-wrap">
      <table class="items" id="items">
        <thead>
          <tr>
            <th class="c-qty">Cant.</th>
            <th>Concepte</th>
            <th class="c-amt">Preu (€)</th>
            <th class="c-amt">Import (€)</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}${dipositsHtml}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="sum-row grand"><span class="lab">Total</span><span class="val" id="total">${money(totalCobraments)}</span></div>
    </div>

    <footer class="footer">
      <div></div>
    </footer>

  </div>
</div>

<script>
  const num = v => {
    if (v == null) return 0;
    let s = String(v).trim(); if (!s) return 0;
    const hasDot = s.includes('.'), hasComma = s.includes(',');
    if (hasDot && hasComma) s = s.replace(/\./g, '').replace(',', '.');
    else if (hasComma) s = s.replace(',', '.');
    else if (hasDot && !/^\\d+\\.\\d{1,2}$/.test(s)) s = s.replace(/\\./g, '');
    const n = parseFloat(s.replace(/[^0-9.\\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const money = n => n.toLocaleString('ca-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
  const plain = n => n.toLocaleString('ca-ES', { minimumFractionDigits:2, maximumFractionDigits:2 });

  function lineCalc(row) {
    const q = row.querySelector('.qty').value.trim();
    const p = row.querySelector('.price').value.trim();
    if (q !== '' && p !== '') {
      const v = num(q) * num(p);
      row.querySelector('.amount').value = v ? plain(v) : '';
    }
  }

  function recalc() {
    let tot = 0;
    document.querySelectorAll('.amount').forEach(a => tot += num(a.value));
    document.getElementById('total').textContent = money(tot);
  }

  document.addEventListener('DOMContentLoaded', recalc);

  document.addEventListener('input', e => {
    if (e.target.matches('.qty, .price')) { lineCalc(e.target.closest('.item')); recalc(); }
    else if (e.target.matches('.amount')) recalc();
  });
  document.addEventListener('blur', e => {
    if (e.target.matches('.price, .amount')) {
      const n = num(e.target.value);
      e.target.value = n ? plain(n) : '';
    }
  }, true);

  document.getElementById('addLine').addEventListener('click', () => {
    const tbody = document.querySelector('#items tbody');
    const row = document.querySelector('.item').cloneNode(true);
    row.querySelectorAll('.qty, .concept, .detail, .price, .amount').forEach(i => i.value = '');
    tbody.appendChild(row);
    row.querySelector('.concept').focus();
    recalc();
  });

  document.addEventListener('click', e => {
    if (e.target.classList.contains('del')) {
      if (document.querySelectorAll('.item').length > 1) {
        e.target.closest('tr').remove();
        recalc();
      }
    }
  });

  document.getElementById('print').addEventListener('click', () => window.print());
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
