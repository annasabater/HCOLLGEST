import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ estanciaId: string }> },
) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { estanciaId } = await ctx.params;

  const estancia = await prisma.estancia.findFirst({
    where: { id: estanciaId },
    include: {
      habitacio: true,
      viatgers: { where: { esTitular: true }, include: { huesped: true } },
      diposits: { where: { estat: 'EN_CUSTODIA' }, orderBy: { data: 'asc' } },
    },
  });
  if (!estancia) return new Response('Not found', { status: 404 });

  const establiment = await prisma.establiment.findFirst();
  const titular = estancia.viatgers[0]?.huesped;

  const nomClean = titular
    ? `${esc(titular.nom)} ${esc(titular.cognom1)}${titular.cognom2 ? ' ' + esc(titular.cognom2) : ''}`
    : '—';
  const nifClean = titular?.numDocument ? esc(titular.numDocument) : '';

  const diposits = estancia.diposits;
  const total = diposits.reduce((a, d) => a + Number(d.import), 0);

  const fiancesHtml = diposits.map((d) => {
    const label = esc(d.notes ?? 'Fiança');
    const metode = esc(METODE_COBRAMENT_LABELS[d.metode as keyof typeof METODE_COBRAMENT_LABELS] ?? d.metode);
    const dataStr = fmtDate(d.data);
    return `
      <div class="linia">
        <span class="concepto">${label} · ${metode} · ${dataStr}</span>
        <input class="imp" value="${money(Number(d.import))}" readonly />
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Rebut de fiança</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;font-size:14px;color:#1e293b;background:#f8f5f0;display:flex;justify-content:center;padding:24px 16px}
  .page{background:#fff;border:1px solid #e2e8f0;border-radius:8px;max-width:520px;width:100%;padding:32px}
  .toolbar{position:fixed;bottom:16px;right:16px;display:flex;gap:8px}
  .btn{border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer}
  .btn-print{background:#7A1F2B;color:#fff}
  .btn-close{background:#f1f5f9;color:#475569}
  @media print{.toolbar{display:none}body{background:#fff;padding:0}
    .page{border:none;border-radius:0;max-width:100%;padding:20px}}
  h1{font-size:18px;font-weight:700;color:#7A1F2B;margin-bottom:4px}
  .subtitle{font-size:12px;color:#64748b;margin-bottom:20px}
  .block{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;font-size:13px}
  .block strong{display:block;font-size:11px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
  .linia{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .concepto{flex:1;font-size:13px;color:#475569}
  .imp{width:120px;text-align:right;border:1px solid #e2e8f0;border-radius:4px;padding:4px 8px;font-size:13px;background:#f8fafc}
  .total-row{display:flex;justify-content:space-between;border-top:2px solid #7A1F2B;padding-top:12px;margin-top:8px;font-weight:700;font-size:15px}
  .nota{margin-top:20px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
  .firma{margin-top:32px;display:flex;justify-content:space-between;gap:24px}
  .firma-box{flex:1;text-align:center;font-size:11px;color:#94a3b8}
  .firma-line{border-top:1px solid #cbd5e1;padding-top:4px;margin-top:40px}
</style>
</head>
<body>
<div class="page">
  <h1>${esc(establiment?.nom ?? 'HOSTAL COLL')}</h1>
  <div class="subtitle">NIF ${esc(establiment?.cif ?? '40331905W')} · C/ Sant Isidre 54, 08370 Calella (Barcelona)</div>

  <div style="display:flex;gap:12px;margin-bottom:16px">
    <div class="block" style="flex:1">
      <strong>Client</strong>
      ${nomClean}<br/>
      ${nifClean ? `NIF: ${nifClean}` : ''}
    </div>
    <div class="block" style="flex:1">
      <strong>Estada</strong>
      Contracte ${esc(estancia.numContracte?.toString() ?? '—')}<br/>
      ${estancia.dataEntrada ? fmtDate(estancia.dataEntrada) : '—'}${estancia.dataSortida ? ' – ' + fmtDate(estancia.dataSortida) : ''}
      ${estancia.habitacio ? '<br/>' + esc(estancia.habitacio.nom) : ''}
    </div>
  </div>

  <p style="font-size:12px;font-weight:600;text-transform:uppercase;color:#94a3b8;margin-bottom:8px">Fiances (garantia retornable)</p>
  ${fiancesHtml}
  <div class="total-row">
    <span>Total en custòdia</span>
    <span>${money(total)}</span>
  </div>

  <p class="nota">La fiança és una garantia retornable. Serà retornada en el moment de la sortida un cop comprovada l'absència de danys o incidències.</p>

  <div class="firma">
    <div class="firma-box"><div class="firma-line">Signatura establiment</div></div>
    <div class="firma-box"><div class="firma-line">Signatura client</div></div>
  </div>
</div>
<div class="toolbar">
  <button class="btn btn-close" onclick="window.close()">Tancar</button>
  <button class="btn btn-print" onclick="window.print()">Imprimir / PDF</button>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
