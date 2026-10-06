import QRCode from 'qrcode';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { habitacioLlibre } from '@/lib/habitacio-llibre';
import { getSessionUser } from '@/lib/auth/session';
import { PDF_CLIENT_SCRIPT } from '@/lib/pdf/client-script';
import { VERIFACTU_LLEGENDA } from '@/lib/verifactu/software';
import { carregaEdicions, edicionsBootstrap, EDICIONS_SCRIPT } from '@/lib/edicions';

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
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const CONCEPTE_LABEL: Record<string, string> = {
  ALLOTJAMENT: 'Estancia Pensión Coll',
  EXTRA: 'Extra',
  DESCOMPTE: 'Descompte',
  TASA: 'Taxa turística',
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await ctx.params;
  // La factura fiscal ja inclou la fiança dins la base (una sola línia "Estancia
  // Pensión Coll"): mai es mostra el bloc de "fiança en custòdia" a part.
  const ambFianca = false;

  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      cobraments: true,
      estancia: {
        include: {
          habitacio: true,
          viatgers: { where: { esTitular: true }, include: { huesped: true, habitacioSeparada: { select: { nom: true } } } },
          diposits: { where: { estat: 'EN_CUSTODIA' }, orderBy: { data: 'asc' } },
        },
      },
      verifactu: true,
    },
  });
  if (!factura) return new Response('Not found', { status: 404 });

  const establiment = await prisma.establiment.findFirst();
  const edicions = await carregaEdicions('factura', factura.id);
  const titular = factura.estancia.viatgers[0]?.huesped ?? null;

  const base = Number(factura.base);
  const iva = Number(factura.iva);
  const total = Number(factura.total);
  const tassa = round2(total - base - iva);
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;

  const fiances = ambFianca ? factura.estancia.diposits : [];
  const totalFianca = fiances.reduce((a, f) => a + Number(f.import), 0);
  const totalAmbFianca = total + totalFianca;

  const emNom = esc(establiment?.raoSocial || establiment?.nom || 'Hostal Coll');
  const emDescriptor = esc(establiment?.descriptor || 'Casa de Hostes · Calella');
  const emIban = esc(establiment?.iban ?? '');
  const emTelefon = esc(establiment?.telefon ? `Tel. ${establiment.telefon}` : '');

  // Titular/NIF/adreça de l'emissor: els de l'establiment (config) si n'hi ha,
  // si no el valor històric per defecte. (Aquesta pantalla no té "Desar canvis":
  // una factura fiscal no s'edita des d'aquí un cop generada.)
  const emTitular = esc(factura.emissorTitular || establiment?.facturaTitular || 'Elisabet Nualart Coll');
  const emNif = esc(factura.emissorNif || `NIF ${establiment?.facturaNif || '38835174L'}`);
  const emAdreca = esc(factura.emissorAdreca || establiment?.adreca || 'C/ Sant Isidre, 54');
  const emLocalitat = esc(
    factura.emissorLocalitat ||
      [establiment?.codiPostal, establiment?.poblacio, establiment?.provincia ? `(${establiment.provincia})` : null]
        .filter(Boolean)
        .join(' ') ||
      '08370 Calella (Barcelona)',
  );

  const clientNom = esc(
    factura.clientNom ?? (titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : ''),
  );
  const clientNif = esc(
    factura.clientNif ?? (titular?.numDocument ? `${titular.tipusDocument ?? 'DNI'} ${titular.numDocument}` : ''),
  );
  const clientAdreca = esc(factura.clientAdreca ?? titular?.adreca ?? '');
  const clientCpPob = esc(
    factura.clientLocalitat ?? [titular?.codiPostal, titular?.municipi || titular?.localitat].filter(Boolean).join(' '),
  );

  // Número: només la part seqüencial; el prefix d'any es recupera en desar.
  const numeroPrefix = esc(factura.numero.match(/^(\d{4}-)/)?.[1] ?? '');
  // Una factura ja registrada a Veri*Factu és immutable: no es pot desar.
  const bloquejada = !!factura.verifactu;

  const periode = factura.estancia.dataEntrada && factura.estancia.dataSortida
    ? `Del periodo ${fmtDate(factura.estancia.dataEntrada)} al ${fmtDate(factura.estancia.dataSortida)}`
    : '';

  const qrDataUrl = factura.verifactu
    ? await QRCode.toDataURL(factura.verifactu.qrUrl, { width: 140, margin: 1 })
    : null;

  const linesHtml = factura.linies.map((l) => {
    const label = l.descripcio || (CONCEPTE_LABEL[l.concepte] ?? l.concepte);
    // El detall desat mana sempre (encara que sigui buit); si mai s'ha desat,
    // l'allotjament hi mostra el període de l'estada.
    const detail = l.detall ?? (l.concepte === 'ALLOTJAMENT' && !label.includes('Del ') ? periode : '');
    const qty = l.quantitat !== null && Number(l.quantitat) > 0 ? Number(l.quantitat) : 1;
    const preu = round2(Number(l.import) / qty);
    return `
    <tr class="item" data-concepte="${esc(l.concepte)}">
      <td class="c-qty"><input class="in qty" inputmode="decimal" aria-label="Quantitat" value="${esc(String(qty).replace('.', ','))}"></td>
      <td>
        <input class="in concept" aria-label="Concepte" value="${esc(label)}">
        <input class="in detail" aria-label="Detall" value="${esc(detail)}" placeholder="">
      </td>
      <td class="c-amt"><input class="in price" inputmode="decimal" aria-label="Preu" value="${preu ? plain(preu) : ''}"></td>
      <td class="c-amt"><input class="in amount" inputmode="decimal" aria-label="Import" value="${Number(l.import) ? plain(Number(l.import)) : ''}"></td>
      <td class="it-del"><button class="del" type="button" aria-label="Eliminar línia">×</button></td>
    </tr>`;
  }).join('');

  const fiancesHtml = fiances.length > 0 ? `
    <div class="custodia-block">
      <div class="custodia-title">Fiança en custòdia</div>
      ${fiances.map((f) => `
        <div class="custodia-row">
          <span class="custodia-lab">${esc(f.notes || 'Fiança')} <span class="custodia-date">(${fmtDate(f.data)})</span></span>
          <span class="custodia-val">${money(Number(f.import))}</span>
        </div>`).join('')}
      <div class="custodia-total">
        <span>Total lliurat amb fiança</span>
        <span id="totalAmbFianca">${money(totalAmbFianca)}</span>
      </div>
    </div>` : '';

  const qrHtml = qrDataUrl ? `
    <div class="qr-block">
      <img src="${qrDataUrl}" alt="QR AEAT" class="qr-img">
      <div class="qr-text">
        <p>${esc(VERIFACTU_LLEGENDA)}</p>
        <p class="qr-hash">Empremta: ${esc(factura.verifactu!.huella)}</p>
      </div>
    </div>` : '';

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factura ${esc(factura.numero)} · Hostal Coll</title>
<style>
  :root{
    --ink:#16233A;
    --slate:#2A3A52;
    --muted:#6B7688;
    --line:#D8DEE8;
    --accent:#1D3E6E;
    --accent-soft:#EAF0F8;
    --warm-tint:#EDF2F9;
    --paper:#FDFDFE;
    --app:#ECEEF2;
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
  .btn.solid:hover{ background:#152C4E; }
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
  .issuer{ text-align:right; color:var(--muted); font-size:12px; line-height:1.85; min-width:220px; }
  .issuer .issuer-name{ font-size:14px; font-weight:600; color:var(--ink); font-style:italic; font-family:Georgia,serif; letter-spacing:.3px; }
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
  .summary{ margin:24px 0 0 auto; width:310px; }
  .sum-row{ display:flex; justify-content:space-between; align-items:center; padding:9px 12px; }
  .sum-row .lab{ color:var(--muted); }
  .sum-row .val{ font-weight:600; font-variant-numeric:tabular-nums; }
  .sum-row.grand{ margin-top:6px; background:var(--warm-tint); border-top:2px solid var(--accent); border-radius:4px; padding:13px 12px; }
  .sum-row.grand .lab{ color:var(--ink); font-family:Georgia,serif; font-size:16px; letter-spacing:.5px; }
  .sum-row.grand .val{ color:var(--ink); font-size:20px; }
  .custodia-block{ margin-top:28px; border-top:1.5px dashed var(--accent); padding-top:18px; }
  .custodia-title{ font-size:10px; text-transform:uppercase; letter-spacing:2px; color:var(--accent); margin-bottom:12px; font-weight:600; }
  .custodia-row{ display:flex; justify-content:space-between; padding:6px 12px; color:var(--muted); font-size:13px; }
  .custodia-date{ font-size:11px; }
  .custodia-val{ font-weight:600; }
  .custodia-total{ display:flex; justify-content:space-between; margin-top:10px; background:var(--warm-tint); border-top:2px solid var(--accent); border-radius:4px; padding:13px 12px; font-family:Georgia,serif; font-size:16px; color:var(--ink); }
  .custodia-note{ font-size:10.5px; color:var(--muted); margin-top:10px; font-style:italic; line-height:1.5; }
  .footer{ display:flex; justify-content:space-between; align-items:flex-end; gap:30px; margin-top:38px; padding-top:16px; border-top:1px solid var(--line); }
  .pay{ display:grid; grid-template-columns:auto 1fr; gap:5px 12px; align-items:center; max-width:360px; }
  .pay-lab{ font-size:10px; text-transform:uppercase; letter-spacing:1.4px; color:var(--muted); }
  .note{ font-family:Georgia,serif; color:var(--ink); font-size:15px; white-space:nowrap; }
  .qr-block{ display:flex; align-items:flex-start; gap:14px; margin-top:24px; border-top:1px solid var(--line); padding-top:16px; }
  .qr-img{ width:90px; height:90px; border:1px solid var(--line); border-radius:4px; flex-shrink:0; }
  .qr-text{ font-size:9.5px; color:var(--muted); line-height:1.55; max-width:500px; }
  .qr-hash{ margin-top:4px; font-family:monospace; font-size:8px; word-break:break-all; }
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
  /* margin:0 fa que el navegador no imprimeixi capçalera/peu (URL, data, pàgina); el marge el posa el body */
  @page{ size:A4; margin:0; }
  @media print{
    body{ background:#fff; padding:14mm; box-sizing:border-box; }
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
  <div class="tb-brand">Hostal Coll <span class="tb-badge">${ambFianca ? 'Factura fiscal amb fiança' : 'Factura fiscal'}</span></div>
  <div class="tb-actions">
    <button id="addLine" class="btn ghost">+ Afegir línia</button>
    ${bloquejada ? '' : '<button id="save" class="btn ghost" title="Desa tot el que hi ha escrit al document (queda guardat per sempre)">Desar canvis</button>'}
    <button id="printPdf" class="btn solid">Imprimir PDF</button>
  </div>
</div>

<div class="app">
  <div class="invoice">

    <header class="masthead">
      <div>
        <div class="brand"><input class="in" data-k="emNom" aria-label="Nom" value="${emNom}"></div>
        <div class="brand-sub"><input class="in" data-k="emDescriptor" aria-label="Descriptor" value="${emDescriptor}" style="width:280px"></div>
      </div>
      <div class="issuer">
        <div class="issuer-name"><input id="emTitular" class="in" aria-label="Titular" value="${emTitular}"></div>
        <input id="emNif" class="in" aria-label="NIF" value="${emNif}"><br>
        <input id="emAdreca" class="in" aria-label="Adreça" value="${emAdreca}"><br>
        <input id="emLocalitat" class="in" aria-label="CP i Localitat" value="${emLocalitat}"><br>
        <input class="in" data-k="emTelefon" aria-label="Telèfon" value="${emTelefon}">
      </div>
    </header>

    <div class="rule"></div>

    <section class="head-grid">
      <div class="bill-to">
        <div class="eyebrow">Client</div>
        <div class="client-name"><input id="clientNom" class="in" aria-label="Nom del client" value="${clientNom}"></div>
        <div><input id="clientNif" class="in" aria-label="NIF/DNI" value="${clientNif}" placeholder="NIF / DNI (opcional)"></div>
        <div><input id="clientAdreca" class="in" aria-label="Adreça" value="${clientAdreca}" placeholder="Domicili (opcional)"></div>
        <div><input id="clientLocalitat" class="in" aria-label="Localitat" value="${clientCpPob}" placeholder="Localitat (opcional)"></div>
      </div>
      <div class="meta">
        <div class="meta-title">Factura</div>
        <div class="meta-badge">${ambFianca ? '<span style="font-size:10px;color:#7A6868">Amb fiança</span>' : ''}</div>
        <div class="meta-row"><span class="k">Número</span><span class="v"><input id="numero" class="in" aria-label="Número" value="${esc(factura.numero.replace(/^\d{4}-/, ''))}" data-prefix="${numeroPrefix}"></span></div>
        <div class="meta-row"><span class="k">Data</span><span class="v"><input id="data" class="in" aria-label="Data" value="${fmtDate(factura.data)}" placeholder="dd/mm/aaaa"></span></div>
        ${habitacioLlibre(factura.estancia) ? `<div class="meta-row"><span class="k">Habitació</span><span class="v"><input class="in" data-k="habitacio" aria-label="Habitació" value="${esc(habitacioLlibre(factura.estancia)!)}"></span></div>` : ''}
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
          ${linesHtml}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="sum-row"><span class="lab">Base imposable</span><span class="val" id="base">${money(base)}</span></div>
      <div class="sum-row"><span class="lab">IVA (<input class="in rate" id="rate" inputmode="decimal" aria-label="Tipus d'IVA" value="${ivaPercent}">%)</span><span class="val" id="iva">${money(iva)}</span></div>
      ${tassa > 0 ? `<div class="sum-row"><span class="lab">Taxa turística (IEET)</span><span class="val" id="tassa">${money(tassa)}</span></div>` : ''}
      <div class="sum-row grand"><span class="lab">Total</span><span class="val" id="total">${money(total)}</span></div>
    </div>

    ${fiancesHtml}

    <footer class="footer">
      ${emIban ? `<div class="pay"><span class="pay-lab">IBAN</span><span>${emIban}</span></div>` : '<div></div>'}
      <div></div>
    </footer>

    ${qrHtml}

  </div>
</div>

${edicionsBootstrap('factura', factura.id, edicions)}
<script>${EDICIONS_SCRIPT}</script>
<script>
  const num = v => {
    if (v == null) return 0;
    let s = String(v).trim(); if (!s) return 0;
    const hasDot = s.includes('.'), hasComma = s.includes(',');
    if (hasDot && hasComma) s = s.replace(/\\./g, '').replace(',', '.');
    else if (hasComma) s = s.replace(',', '.');
    else if (hasDot && !/^\\d+\\.\\d{1,2}$/.test(s)) s = s.replace(/\\./g, '');
    const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const money = n => n.toLocaleString('ca-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
  const plain = n => n.toLocaleString('ca-ES', { minimumFractionDigits:2, maximumFractionDigits:2 });

  const TASSA = ${tassa};

  function lineCalc(row) {
    const q = row.querySelector('.qty').value.trim();
    const p = row.querySelector('.price').value.trim();
    if (q !== '' && p !== '' && num(p) !== 0) {
      const v = num(q) * num(p);
      row.querySelector('.amount').value = v ? plain(v) : '';
    }
  }

  function syncPrice(row) {
    if (!row) return;
    const q = num(row.querySelector('.qty').value) || 1;
    const a = num(row.querySelector('.amount').value);
    row.querySelector('.price').value = a ? plain(a / q) : '';
  }

  function recalc() {
    let tot = 0;
    document.querySelectorAll('.amount').forEach(a => tot += num(a.value));
    const rate = num(document.getElementById('rate').value);
    // Els imports de línia són la BASE; l'IVA s'hi suma (igual que al servidor).
    const base = tot;
    const iva = Math.round(base * rate) / 100;
    const totalFactura = base + iva + TASSA;
    document.getElementById('base').textContent = money(base);
    document.getElementById('iva').textContent = money(iva);
    document.getElementById('total').textContent = money(totalFactura);
    const tf = document.getElementById('totalAmbFianca');
    if (tf) {
      let fiances = 0;
      document.querySelectorAll('.custodia-val').forEach(v => fiances += num(v.textContent));
      tf.textContent = money(totalFactura + fiances);
    }
  }

  document.addEventListener('input', e => {
    if (e.target.matches('.qty, .price')) { lineCalc(e.target.closest('.item')); recalc(); }
    else if (e.target.matches('.amount')) { syncPrice(e.target.closest('.item')); recalc(); }
    else if (e.target.matches('#rate')) recalc();
  });
  // Xarxa de seguretat: en sortir del camp (o 'change') recomputa la línia si cal,
  // reformata i torna a sumar el total, encara que algun 'input' no s'hagi disparat.
  function settle(el) {
    if (!el || !el.matches) return;
    if (el.matches('.qty, .price, .amount, #rate')) {
      const row = el.closest('.item');
      if (row && el.matches('.qty, .price')) lineCalc(row);
      if (el.matches('.price, .amount')) {
        const n = num(el.value);
        el.value = n ? plain(n) : '';
      }
      recalc();
    }
  }
  document.addEventListener('blur', e => settle(e.target), true);
  document.addEventListener('change', e => settle(e.target));

  document.getElementById('addLine').addEventListener('click', () => {
    const tbody = document.querySelector('#items tbody');
    const tmpl = document.querySelector('.item');
    const row = tmpl.cloneNode(true);
    row.querySelectorAll('.qty, .concept, .detail, .price, .amount').forEach(i => i.value = '');
    row.setAttribute('data-concepte', 'EXTRA');
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

  function parseDataEs(s) {
    const m = String(s || '').trim().match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);
    if (!m) return s;
    const dd = m[1].length < 2 ? '0' + m[1] : m[1];
    const mm = m[2].length < 2 ? '0' + m[2] : m[2];
    return m[3] + '-' + mm + '-' + dd;
  }

  // Desa línies, IVA, número, data, client i emissor a la factura.
  const saveBtn = document.getElementById('save');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    const rows = Array.from(document.querySelectorAll('#items tbody tr.item'));
    const linies = rows.map(r => {
      const c = r.querySelector('.concept');
      const d = r.querySelector('.detail');
      const q = r.querySelector('.qty');
      const a = r.querySelector('.amount');
      return {
        concepte: r.getAttribute('data-concepte') || 'EXTRA',
        descripcio: (c && c.value ? c.value : '').trim(),
        detall: d ? d.value.trim() : null,
        quantitat: q && num(q.value) > 0 ? num(q.value) : null,
        import: num(a ? a.value : 0)
      };
    }).filter(l => l.descripcio || l.detall || l.import)
      .map(l => ({ concepte: l.concepte, descripcio: l.descripcio || 'Concepte', detall: l.detall, quantitat: l.quantitat, import: l.import }));
    if (!linies.length) { alert('Cal almenys una línia amb concepte o import.'); return; }

    const numeroInput = document.getElementById('numero');
    const body = {
      linies,
      ivaPercent: num(document.getElementById('rate').value),
      numero: (numeroInput.dataset.prefix || '') + numeroInput.value.trim(),
      data: parseDataEs(document.getElementById('data').value),
      clientNom: document.getElementById('clientNom').value,
      clientNif: document.getElementById('clientNif').value,
      clientAdreca: document.getElementById('clientAdreca').value,
      clientLocalitat: document.getElementById('clientLocalitat').value,
      emissorTitular: document.getElementById('emTitular').value,
      emissorNif: document.getElementById('emNif').value,
      emissorAdreca: document.getElementById('emAdreca').value,
      emissorLocalitat: document.getElementById('emLocalitat').value,
    };

    const orig = saveBtn.textContent;
    saveBtn.disabled = true; saveBtn.textContent = 'Desant…';
    try {
      const res = await fetch('/api/factures/${factura.id}', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error desant els canvis');
      }
      // La resta del que hi ha escrit (nom, telèfon, habitació…).
      await window.desaEdicions();
      saveBtn.textContent = 'Desat ✓';
      setTimeout(() => { saveBtn.textContent = orig; saveBtn.disabled = false; }, 1600);
    } catch (e) {
      alert(e && e.message ? e.message : "No s'ha pogut desar");
      saveBtn.textContent = orig; saveBtn.disabled = false;
    }
  });

</script>
<script>window.__pdfRef = ${JSON.stringify(factura.id)}; window.__pdfTitle = ${JSON.stringify(`Factura ${factura.numero}`)};</script>
<script>${PDF_CLIENT_SCRIPT}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
