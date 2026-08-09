import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) + ' €';
}
function plain(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await ctx.params;
  const p = await prisma.pressupost.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: { orderBy: { createdAt: 'asc' } },
      estancia: { select: { id: true, numContracte: true, anyContracte: true } },
    },
  });
  if (!p) return new Response('Not found', { status: 404 });

  const establiment = await prisma.establiment.findFirst();
  const emNom = esc(establiment?.raoSocial || establiment?.nom || 'Hostal Coll');
  const emDescriptor = esc(establiment?.poblacio ? `Casa de Hostes · ${establiment.poblacio}` : 'Casa de Hostes · Calella');
  // Emissor (dades del hostal) — igual que a la factura fiscal.
  const emTitular = esc(establiment?.facturaTitular || 'Elisabet Nualart Coll');
  const emNif = esc(establiment?.facturaNif ? `NIF ${establiment.facturaNif}` : 'NIF 38835174L');
  const emAdreca = esc(establiment?.adreca || 'C/ Sant Isidre, 54');
  const emLocalitat = esc(
    [establiment?.codiPostal, establiment?.poblacio, establiment?.provincia ? `(${establiment.provincia})` : null]
      .filter(Boolean)
      .join(' ') || '08370 Calella (Barcelona)',
  );
  const emTelefon = esc(establiment?.telefon ? `Tel. ${establiment.telefon}` : '');

  const ivaPercent = Number(p.ivaPercent);
  const base = Number(p.base);
  const iva = Number(p.iva);
  const total = Number(p.total);

  const estadaRef = p.estancia
    ? esc(`${p.estancia.anyContracte}/${p.estancia.numContracte}`)
    : '';

  const linesHtml = p.linies
    .map(
      (l) => `
    <tr class="item">
      <td><textarea class="in concept" rows="1" aria-label="Concepte">${esc(l.descripcio)}</textarea></td>
      <td class="c-amt"><input class="in amount" inputmode="decimal" aria-label="Import" value="${plain(Number(l.import))}"></td>
      <td class="it-del"><button class="del" type="button" aria-label="Eliminar línia">×</button></td>
    </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pressupost ${esc(p.numero)} · Hostal Coll</title>
<style>
  :root{
    --ink:#2A1533;
    --slate:#3A2A44;
    --muted:#8A7E93;
    --line:#E7DFEE;
    /* Lila fosc i discret: per distingir-lo de la factura (granate). */
    --accent:#574B90;
    --accent-soft:#E9E6F1;
    --warm-tint:#F2F0F7;
    --paper:#FFFDFF;
    --app:#EFEAF4;
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
    padding:12px 20px; background:rgba(253,251,255,.92); backdrop-filter:blur(10px);
    border-bottom:1px solid #E1D9E7;
  }
  .tb-brand{ font-family:Georgia,serif; color:var(--ink); font-size:16px; letter-spacing:.3px; }
  .tb-badge{ font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
    color:var(--accent); background:var(--accent-soft); border-radius:4px; padding:3px 8px; margin-left:10px; }
  .tb-actions{ display:flex; gap:10px; }
  .btn{ font:inherit; font-size:13px; line-height:1; padding:10px 15px; border-radius:9px; cursor:pointer;
        border:1px solid; transition:transform .12s ease, background .15s ease; }
  .btn:active{ transform:translateY(1px); }
  .btn.ghost{ background:#fff; color:var(--ink); border-color:var(--ink); }
  .btn.ghost:hover{ background:var(--accent-soft); }
  .btn.solid{ background:var(--accent); color:#fff; border-color:var(--accent); }
  .btn.solid:hover{ background:#453A73; }
  .app{ padding:24px 16px 48px; }
  .invoice{
    width:100%; max-width:820px; margin:0 auto; background:var(--paper);
    padding:52px 56px 40px; border:1px solid #ECE4F2; border-radius:3px;
    box-shadow:0 14px 44px rgba(42,21,51,.10); animation:rise .5s ease both;
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
  .meta-row .v{ font-weight:600; color:var(--slate); min-width:110px; }
  .estada-ref{ margin-top:6px; font-size:11px; color:var(--muted); }
  .estada-ref b{ color:var(--accent); font-weight:600; }
  table.items{ width:100%; border-collapse:collapse; }
  table.items th{
    font-size:10.5px; text-transform:uppercase; letter-spacing:1.4px; color:var(--muted);
    font-weight:600; text-align:left; padding:0 0 9px; border-bottom:1.5px solid var(--ink);
  }
  table.items th.c-amt{ text-align:right; }
  table.items td{ padding:12px 0; border-bottom:1px solid var(--line); vertical-align:top; }
  .c-amt{ width:150px; text-align:right; padding-left:14px !important; }
  .it-del{ width:30px; }
  .concept{ font-weight:600; color:var(--slate); }
  .summary{ margin:24px 0 0 auto; width:320px; }
  .sum-row{ display:flex; justify-content:space-between; align-items:center; padding:8px 12px; }
  .sum-row .lab{ color:var(--muted); }
  .sum-row .val{ font-weight:600; font-variant-numeric:tabular-nums; }
  .sum-row .iva-pct{ width:44px; }
  .sum-row.grand{ margin-top:6px; background:var(--warm-tint); border-top:2px solid var(--accent); border-radius:4px; padding:13px 12px; }
  .sum-row.grand .lab{ color:var(--ink); font-family:Georgia,serif; font-size:16px; letter-spacing:.5px; }
  .sum-row.grand .val{ color:var(--ink); font-size:20px; }

  .footer{ margin-top:34px; padding-top:16px; border-top:1px solid var(--line); }
  .pay{ border:1px solid var(--line); background:var(--warm-tint); border-radius:6px; padding:12px 14px; font-size:12.5px; }
  .pay .pay-lab{ font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--accent); margin-bottom:3px; }
  .notes-wrap{ margin-top:16px; }
  .notes-lab{ font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); margin-bottom:4px; }

  .in{ font:inherit; color:inherit; letter-spacing:inherit; border:0; background:transparent; width:100%;
       padding:2px 4px; margin:-2px -4px; border-radius:5px; }
  textarea.in{ resize:none; overflow:hidden; line-height:1.4; white-space:pre-wrap; word-break:break-word;
       display:block; min-height:1.4em; }
  .in:focus{ outline:none; background:var(--accent-soft); box-shadow:inset 0 0 0 1px rgba(87,75,144,.35); }
  .in::placeholder{ color:#C5BCD0; }
  .v .in{ text-align:right; }
  .issuer .in{ text-align:right; }
  .amount{ text-align:right; font-variant-numeric:tabular-nums; }
  .iva-pct{ text-align:right; font-variant-numeric:tabular-nums; }
  .del{ border:0; background:transparent; cursor:pointer; color:#C2BCC8; font-size:18px; line-height:1;
        width:24px; height:24px; border-radius:6px; }
  .del:hover{ background:var(--accent-soft); color:#453A73; }
  @media (max-width:680px){
    .invoice{ padding:34px 22px 30px; }
    .brand{ font-size:34px; }
    .masthead,.head-grid{ flex-direction:column; gap:18px; }
    .issuer,.meta{ text-align:left; }
    .issuer .in,.v .in,.meta-row{ text-align:left; }
    .meta-row{ justify-content:flex-start; }
    .summary{ width:100%; }
    .items-wrap{ overflow-x:auto; }
    table.items{ min-width:420px; }
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
  <div class="tb-brand">Hostal Coll<span class="tb-badge">Pressupost</span></div>
  <div class="tb-actions">
    <button id="addLine" class="btn ghost">+ Afegir línia</button>
    <button id="save" class="btn ghost" title="Desa número, data, client, línies i notes (queda guardat)">Desar canvis</button>
    <button id="print" class="btn solid">Imprimir / Guardar PDF</button>
  </div>
</div>

<div class="app">
  <div class="invoice">

    <header class="masthead">
      <div>
        <div class="brand">${emNom}</div>
        <div class="brand-sub">${emDescriptor}</div>
      </div>
      <div class="issuer">
        <span style="color:var(--slate);font-weight:500">${emTitular}</span><br>
        ${emNif}<br>
        ${emAdreca}<br>
        ${emLocalitat}${emTelefon ? '<br>' + emTelefon : ''}
      </div>
    </header>

    <div class="rule"></div>

    <section class="head-grid">
      <div class="bill-to">
        <div class="eyebrow">Per a</div>
        <div class="client-name"><input id="clientNom" class="in" aria-label="Nom del client" value="${esc(p.clientNom)}" placeholder="Nom del client / empresa"></div>
        <div><input id="clientNif" class="in" aria-label="NIF/CIF" value="${esc(p.clientNif)}" placeholder="NIF / CIF (opcional)"></div>
        <div><input id="clientAdreca" class="in" aria-label="Adreça" value="${esc(p.clientAdreca)}" placeholder="Domicili (opcional)"></div>
        <div><input id="clientLocalitat" class="in" aria-label="Localitat" value="${esc(p.clientLocalitat)}" placeholder="Localitat (opcional)"></div>
      </div>
      <div class="meta">
        <div class="meta-title">Pressupost</div>
        <div class="meta-badge">Oferta</div>
        <div class="meta-row"><span class="k">Número</span><span class="v"><input id="numero" class="in" aria-label="Número" value="${esc(p.numero)}"></span></div>
        <div class="meta-row"><span class="k">Data</span><span class="v"><input id="data" class="in" aria-label="Data" value="${fmtDate(p.data)}" placeholder="dd/mm/aaaa"></span></div>
        <div class="meta-row"><span class="k">Vàlid fins a</span><span class="v"><input id="validesa" class="in" aria-label="Vàlid fins a" value="${p.validesa ? fmtDate(p.validesa) : ''}" placeholder="dd/mm/aaaa"></span></div>
        ${estadaRef ? `<div class="estada-ref">Estada · contracte <b>${estadaRef}</b></div>` : ''}
      </div>
    </section>

    <div class="items-wrap">
      <table class="items" id="items">
        <thead>
          <tr>
            <th>Concepte</th>
            <th class="c-amt">Import (€)</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml || '<tr class="item"><td><textarea class="in concept" rows="1" aria-label="Concepte"></textarea></td><td class="c-amt"><input class="in amount" inputmode="decimal" aria-label="Import" value=""></td><td class="it-del"><button class="del" type="button" aria-label="Eliminar línia">×</button></td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="sum-row"><span class="lab">Base</span><span class="val" id="base">${money(base)}</span></div>
      <div class="sum-row"><span class="lab">IVA (<input id="ivaPercent" class="in iva-pct" inputmode="decimal" aria-label="Percentatge IVA" value="${ivaPercent}">%)</span><span class="val" id="iva">${money(iva)}</span></div>
      <div class="sum-row grand"><span class="lab">Total</span><span class="val" id="total">${money(total)}</span></div>
    </div>

  </div>
</div>

<script>
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
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const money = n => n.toLocaleString('ca-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
  const plain = n => n.toLocaleString('ca-ES', { minimumFractionDigits:2, maximumFractionDigits:2 });

  function recalc() {
    let bs = 0;
    document.querySelectorAll('.amount').forEach(a => bs += num(a.value));
    bs = round2(bs);
    const pct = num(document.getElementById('ivaPercent').value);
    const iv = round2(bs * pct / 100);
    document.getElementById('base').textContent = money(bs);
    document.getElementById('iva').textContent = money(iv);
    document.getElementById('total').textContent = money(round2(bs + iv));
  }

  function autoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
  }
  function growAll() { document.querySelectorAll('textarea.in').forEach(autoGrow); }

  document.addEventListener('DOMContentLoaded', () => { recalc(); growAll(); });
  window.addEventListener('load', growAll);
  window.addEventListener('beforeprint', growAll);

  document.addEventListener('input', e => {
    if (e.target.matches('textarea.in')) autoGrow(e.target);
    if (e.target.matches('.amount, #ivaPercent')) recalc();
  });
  document.addEventListener('blur', e => {
    if (e.target && e.target.matches && e.target.matches('.amount')) {
      const n = num(e.target.value);
      e.target.value = n ? plain(n) : '';
      recalc();
    }
  }, true);

  document.getElementById('addLine').addEventListener('click', () => {
    const tbody = document.querySelector('#items tbody');
    const row = document.querySelector('.item').cloneNode(true);
    row.querySelectorAll('.concept, .amount').forEach(i => i.value = '');
    tbody.appendChild(row);
    autoGrow(row.querySelector('.concept'));
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

  // "dd/mm/aaaa" → "aaaa-mm-dd" (ISO); si no encaixa, es deixa tal qual (el
  // servidor ho rebutjarà amb un error clar).
  function parseDataEs(s) {
    const t = String(s || '').trim();
    if (!t) return '';
    const m = t.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);
    if (!m) return t;
    const dd = m[1].length < 2 ? '0' + m[1] : m[1];
    const mm = m[2].length < 2 ? '0' + m[2] : m[2];
    return m[3] + '-' + mm + '-' + dd;
  }

  document.getElementById('save').addEventListener('click', async () => {
    const btn = document.getElementById('save');
    const rows = Array.from(document.querySelectorAll('#items tbody tr.item'));
    const linies = rows.map(r => {
      const c = r.querySelector('.concept');
      const a = r.querySelector('.amount');
      return { descripcio: (c && c.value ? c.value : '').trim(), import: num(a ? a.value : 0) };
    }).filter(l => l.descripcio || l.import);
    if (!linies.length) linies.push({ descripcio: '', import: 0 });

    const body = {
      numero: document.getElementById('numero').value.trim(),
      data: parseDataEs(document.getElementById('data').value),
      validesa: parseDataEs(document.getElementById('validesa').value),
      clientNom: document.getElementById('clientNom').value,
      clientNif: document.getElementById('clientNif').value,
      clientAdreca: document.getElementById('clientAdreca').value,
      clientLocalitat: document.getElementById('clientLocalitat').value,
      ivaPercent: num(document.getElementById('ivaPercent').value),
      linies,
    };

    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Desant…';
    try {
      const res = await fetch('/api/pressupostos/${p.id}', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error desant els canvis');
      }
      btn.textContent = 'Desat ✓';
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1600);
    } catch (e) {
      alert(e && e.message ? e.message : "No s'ha pogut desar");
      btn.textContent = orig; btn.disabled = false;
    }
  });

  document.getElementById('print').addEventListener('click', () => window.print());
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
