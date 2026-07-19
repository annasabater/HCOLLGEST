import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { GRUP_TARIFA_LABELS, type GrupTarifa } from '@/lib/validation/tarifa-tipus';

export const dynamic = 'force-dynamic';

const ORDRE_GRUP: GrupTarifa[] = ['INDIVIDUAL', 'DOBLE_1P', 'DOBLE'];

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function eur(n: unknown): string {
  if (n == null) return '';
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
}

type Row = {
  grup: string; etiqueta: string; nota: string | null;
  preuDia: unknown; preuDia4: unknown; preuSetmana: unknown; preuDosSetmanes: unknown; preuMes: unknown; reserva: unknown;
};

const TRAMS: { key: keyof Row; label: string }[] = [
  { key: 'preuDia', label: 'Dia' },
  { key: 'preuDia4', label: '4 dies (€/dia)' },
  { key: 'preuSetmana', label: 'Setmana' },
  { key: 'preuDosSetmanes', label: '2 setmanes' },
  { key: 'preuMes', label: 'Mes' },
  { key: 'reserva', label: 'Reserva' },
];

function taulaGrup(grup: GrupTarifa, rows: Row[]): string {
  if (rows.length === 0) return '';
  const cols = rows;
  const head = cols.map((c) => `<th>${esc(c.etiqueta)}</th>`).join('');
  const cos = TRAMS.map((t) => {
    // Amaga la fila si cap columna té valor per a aquest tram.
    if (cols.every((c) => c[t.key] == null)) return '';
    const cells = cols.map((c) => `<td>${eur(c[t.key])}</td>`).join('');
    return `<tr><th class="rowlab">${t.label}</th>${cells}</tr>`;
  }).join('');
  const notes = cols.filter((c) => c.nota).map((c) => `<li><strong>${esc(c.etiqueta)}:</strong> ${esc(c.nota)}</li>`).join('');
  return `
  <section class="grup">
    <h2>${GRUP_TARIFA_LABELS[grup]}</h2>
    <div class="tbl-wrap">
      <table class="tarifes">
        <thead><tr><th class="corner"></th>${head}</tr></thead>
        <tbody>${cos}</tbody>
      </table>
    </div>
    ${notes ? `<ul class="notes">${notes}</ul>` : ''}
  </section>`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const grupParam = new URL(req.url).searchParams.get('grup');
  const grups = grupParam && ORDRE_GRUP.includes(grupParam as GrupTarifa) ? [grupParam as GrupTarifa] : ORDRE_GRUP;

  const files = await prisma.tarifaTipus.findMany({
    where: { grup: { in: grups } },
    orderBy: [{ grup: 'asc' }, { ordre: 'asc' }],
  });

  const seccions = grups
    .map((g) => taulaGrup(g, files.filter((f) => f.grup === g) as unknown as Row[]))
    .join('');

  const titol = grupParam ? `Tarifes · ${GRUP_TARIFA_LABELS[grupParam as GrupTarifa]}` : 'Tarifes';

  const html = `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titol)} · Hostal Coll</title>
<style>
  :root{ --ink:#2C1810; --muted:#7A6868; --line:#E5D8D5; --accent:#7A1F2B; --tint:#F7EEEC; --paper:#FFFCF8; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{ background:#F0ECEB; color:var(--ink); font-family:"Manrope","Segoe UI",system-ui,sans-serif; font-size:13px; }
  .toolbar{ position:sticky; top:0; display:flex; justify-content:space-between; align-items:center; gap:12px;
    padding:12px 20px; background:rgba(255,252,248,.95); border-bottom:1px solid var(--line); }
  .tb-brand{ font-family:Georgia,serif; color:var(--ink); font-size:16px; }
  .btn{ font:inherit; font-size:13px; padding:9px 15px; border-radius:9px; cursor:pointer; border:1px solid var(--accent);
    background:var(--accent); color:#fff; }
  .app{ padding:24px 16px 48px; }
  .sheet{ max-width:900px; margin:0 auto; background:var(--paper); border:1px solid #EDE5E2; border-radius:4px;
    padding:40px 44px; box-shadow:0 14px 44px rgba(44,24,16,.10); }
  .masthead{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid var(--ink); padding-bottom:12px; margin-bottom:6px; }
  .brand{ font-family:Georgia,serif; font-size:30px; color:var(--ink); }
  .brand-sub{ font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--accent); margin-top:4px; }
  .period{ text-align:right; color:var(--muted); font-size:12px; }
  .accent-rule{ height:3px; width:64px; background:var(--accent); margin-bottom:22px; }
  .grup{ margin-bottom:26px; }
  .grup h2{ font-family:Georgia,serif; font-size:17px; color:var(--accent); margin:0 0 10px; }
  .tbl-wrap{ overflow-x:auto; }
  table.tarifes{ width:100%; border-collapse:collapse; }
  table.tarifes th, table.tarifes td{ border:1px solid var(--line); padding:8px 10px; text-align:center; font-variant-numeric:tabular-nums; }
  table.tarifes thead th{ background:var(--tint); color:var(--ink); font-size:11px; font-weight:600; }
  table.tarifes th.corner{ background:transparent; border:0; }
  table.tarifes th.rowlab{ background:#FBF6F4; text-align:left; color:var(--muted); font-weight:600; white-space:nowrap; }
  table.tarifes td{ color:var(--ink); }
  .notes{ margin:10px 0 0; padding-left:18px; color:var(--muted); font-size:11.5px; }
  .notes li{ margin:2px 0; }
  .foot{ margin-top:24px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:11px; text-align:center; }
  @page{ size:A4; margin:14mm; }
  @media print{
    body{ background:#fff; }
    .toolbar{ display:none !important; }
    .app{ padding:0; }
    .sheet{ box-shadow:none; border:none; border-radius:0; max-width:none; padding:0; }
    *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <div class="tb-brand">Hostal Coll · Tarifes</div>
  <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>
<div class="app">
  <div class="sheet">
    <div class="masthead">
      <div>
        <div class="brand">HOSTAL COLL</div>
        <div class="brand-sub">Casa de Hostes · Calella</div>
      </div>
      <div class="period">Full de preus<br>2025 – 2026</div>
    </div>
    <div class="accent-rule"></div>
    ${seccions || '<p style="color:#7A6868">No hi ha tarifes configurades.</p>'}
    <div class="foot">Preus per habitació i nit segons temporada. Consulteu la recepció per a estades llargues.</div>
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
