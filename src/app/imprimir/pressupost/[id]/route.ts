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
function fmtDate(d: Date): string {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await ctx.params;
  const p = await prisma.pressupost.findFirst({
    where: { id, deletedAt: null },
    include: { linies: { orderBy: { createdAt: 'asc' } } },
  });
  if (!p) return new Response('Not found', { status: 404 });

  const establiment = await prisma.establiment.findFirst();
  const emNom = esc(establiment?.raoSocial || establiment?.nom || 'Hostal Coll');
  const emDescriptor = esc(establiment?.poblacio ? `Casa de Hostes · ${establiment.poblacio}` : 'Casa de Hostes · Calella');
  const emTitular = esc(establiment?.facturaTitular || 'Elisabet Nualart Coll');
  const emNif = esc(establiment?.facturaNif ? `NIF ${establiment.facturaNif}` : '');
  const emAdreca = esc(establiment?.adreca || '');
  const emLoc = esc([establiment?.codiPostal, establiment?.poblacio].filter(Boolean).join(' '));
  const emTel = esc(establiment?.telefon ? `Tel. ${establiment.telefon}` : '');

  const base = Number(p.base);
  const iva = Number(p.iva);
  const total = Number(p.total);

  const filesLinies = p.linies
    .map(
      (l) =>
        `<tr><td>${esc(l.descripcio) || '—'}</td><td class="n">${money(Number(l.import))}</td></tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="ca"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pressupost ${esc(p.numero)} · Hostal Coll</title>
<style>
  :root{
    --ink:#2A1710; --slate:#3D2A24; --muted:#8A7A73; --line:#EADFDA;
    /* Rosat: per distingir-lo de la factura (granate). */
    --accent:#BE185D; --accent-soft:#FCE7F1; --warm-tint:#FDF2F7; --paper:#fff;
  }
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:var(--slate); background:#F4EEF1; line-height:1.5; }
  .toolbar{ position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center;
    padding:12px 20px; background:rgba(255,252,254,.92); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .tb-brand{ font-size:13px; font-weight:600; color:var(--accent); }
  .btn{ font:inherit; font-size:13px; cursor:pointer; border:1px solid var(--line); background:#fff; color:var(--slate); border-radius:8px; padding:7px 14px; }
  .btn.solid{ background:var(--accent); color:#fff; border-color:var(--accent); }
  .app{ padding:26px 16px; }
  .sheet{ width:100%; max-width:720px; margin:0 auto; background:var(--paper); border:1px solid #F0E3EA; border-radius:6px;
    padding:40px 46px; box-shadow:0 14px 44px rgba(60,20,40,.10); }
  .brand{ font-family:Georgia,serif; font-size:30px; color:var(--ink); letter-spacing:.5px; }
  .brand-sub{ font-size:10.5px; letter-spacing:3.5px; text-transform:uppercase; color:var(--accent); margin-top:9px; }
  .rule{ position:relative; border-top:1.5px solid var(--ink); margin:16px 0 6px; }
  .rule::before{ content:""; position:absolute; top:4px; left:0; width:66px; border-top:3px solid var(--accent); }
  .doc-title{ text-align:center; font-size:15px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:var(--accent); margin:14px 0 4px; }
  .cols{ display:flex; justify-content:space-between; gap:24px; margin-top:18px; }
  .box .lbl{ font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); margin-bottom:4px; }
  .box .val{ font-size:13px; color:var(--slate); }
  .box .val strong{ color:var(--ink); }
  .meta{ text-align:right; }
  .meta-row{ display:flex; justify-content:flex-end; gap:10px; }
  .meta-row .k{ font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--muted); }
  .meta-row .v{ font-weight:600; color:var(--slate); min-width:90px; text-align:right; }
  table{ width:100%; border-collapse:collapse; margin-top:22px; }
  th{ font-size:10px; text-transform:uppercase; letter-spacing:1px; color:var(--muted); text-align:left; padding:0 4px 8px; border-bottom:1.5px solid var(--ink); }
  th.n, td.n{ text-align:right; }
  td{ padding:9px 4px; border-bottom:1px solid var(--line); font-size:13px; }
  .sums{ margin-top:18px; margin-left:auto; width:280px; }
  .sum-row{ display:flex; justify-content:space-between; padding:5px 12px; font-size:13px; }
  .sum-row .k{ color:var(--muted); }
  .sum-row.grand{ margin-top:6px; background:var(--warm-tint); border-top:2px solid var(--accent); border-radius:4px; padding:13px 12px; font-size:15px; font-weight:700; color:var(--ink); }
  .pay{ margin-top:22px; border:1px solid var(--line); background:var(--warm-tint); border-radius:6px; padding:12px 14px; font-size:12.5px; }
  .pay .lbl{ font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:var(--accent); margin-bottom:3px; }
  .notes{ margin-top:16px; font-size:12px; color:var(--muted); white-space:pre-wrap; }
  @media print{
    body{ background:#fff; } .toolbar{ display:none !important; } .app{ padding:0; }
    .sheet{ box-shadow:none; border:none; border-radius:0; max-width:none; padding:0; }
    *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
  @page{ size:A4; margin:14mm; }
</style>
</head>
<body>
<div class="toolbar">
  <div class="tb-brand">Hostal Coll · Pressupost ${esc(p.numero)}</div>
  <button class="btn solid" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>
<div class="app">
  <div class="sheet">
    <div class="brand">${emNom}</div>
    <div class="brand-sub">${emDescriptor}</div>
    <div class="rule"></div>
    <div class="doc-title">Pressupost</div>

    <div class="cols">
      <div class="box">
        <div class="lbl">De</div>
        <div class="val"><strong>${emTitular}</strong></div>
        ${emNif ? `<div class="val">${emNif}</div>` : ''}
        ${emAdreca ? `<div class="val">${emAdreca}</div>` : ''}
        ${emLoc ? `<div class="val">${emLoc}</div>` : ''}
        ${emTel ? `<div class="val">${emTel}</div>` : ''}
      </div>
      <div class="meta">
        <div class="meta-row"><span class="k">Número</span><span class="v">${esc(p.numero)}</span></div>
        <div class="meta-row"><span class="k">Data</span><span class="v">${fmtDate(p.data)}</span></div>
        ${p.validesa ? `<div class="meta-row"><span class="k">Vàlid fins a</span><span class="v">${fmtDate(p.validesa)}</span></div>` : ''}
      </div>
    </div>

    ${
      p.clientNom || p.clientNif || p.clientAdreca
        ? `<div class="cols"><div class="box">
             <div class="lbl">Per a</div>
             ${p.clientNom ? `<div class="val"><strong>${esc(p.clientNom)}</strong></div>` : ''}
             ${p.clientNif ? `<div class="val">${esc(p.clientNif)}</div>` : ''}
             ${p.clientAdreca ? `<div class="val">${esc(p.clientAdreca)}</div>` : ''}
           </div></div>`
        : ''
    }

    <table>
      <thead><tr><th>Concepte</th><th class="n">Import</th></tr></thead>
      <tbody>${filesLinies || '<tr><td>—</td><td class="n">0,00 €</td></tr>'}</tbody>
    </table>

    <div class="sums">
      <div class="sum-row"><span class="k">Base</span><span>${money(base)}</span></div>
      <div class="sum-row"><span class="k">IVA (${Number(p.ivaPercent)}%)</span><span>${money(iva)}</span></div>
      <div class="sum-row grand"><span>Total</span><span>${money(total)}</span></div>
    </div>

    ${
      p.compte
        ? `<div class="pay"><div class="lbl">Forma de pagament</div>Transferència al compte <strong>${esc(p.compte)}</strong></div>`
        : ''
    }
    ${p.notes ? `<div class="notes">${esc(p.notes)}</div>` : ''}
  </div>
</div>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
