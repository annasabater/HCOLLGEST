/**
 * "Declaración responsable para el impuesto sobre las estancias en establecimientos
 * turísticos" (IEET) — exempció per a MENORS DE 17 ANYS. La declara el titular del
 * contracte (pare/mare/tutor). Es genera sota demanda amb les dades ja omplertes i
 * la firma del titular incrustada (apareix sola quan s'ha firmat). Camps editables
 * abans d'imprimir. Amb id "blank" surt el full en blanc (plantilla).
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { ageAt } from '@/lib/dates';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(_req: Request, ctx: { params: Promise<{ estanciaId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { estanciaId } = await ctx.params;
  const BLANK = estanciaId === 'blank';

  const estancia = BLANK
    ? null
    : await prisma.estancia.findFirst({
        where: { id: estanciaId, deletedAt: null },
        include: {
          viatgers: {
            include: { huesped: true, signatura: true },
            orderBy: { esTitular: 'desc' },
          },
        },
      });
  if (!BLANK && !estancia) return new Response('Not found', { status: 404 });

  const est = await prisma.establiment.findFirst();
  const poblacio = est?.poblacio ?? 'Calella';

  // Declarant = titular del contracte. Menors = viatgers < 17 anys a l'entrada.
  const titular = estancia?.viatgers.find((v) => v.esTitular)?.huesped ?? estancia?.viatgers[0]?.huesped ?? null;
  const firmaImatge = estancia?.viatgers.find((v) => v.esTitular)?.signatura?.imatge ?? null;
  const ref = estancia?.dataEntrada ?? new Date();
  const menors = (estancia?.viatgers ?? [])
    .map((v) => v.huesped)
    .filter((h) => h.dataNaixement && ageAt(h.dataNaixement, ref) < 17);

  const declNom = esc(titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : '');
  const declNif = esc(titular?.numDocument ?? '');
  const declAdreca = esc(titular?.adreca ?? '');
  const declPoblacio = esc(titular?.municipi || titular?.localitat || '');
  const llocData = esc(estancia?.dataEntrada ? `${poblacio}, ${fmtDate(estancia.dataEntrada)}` : poblacio ? `${poblacio}, ` : '');

  // 4 línies de menor (les que hi ha, omplertes; la resta buides).
  const menorNoms = [0, 1, 2, 3].map((i) => {
    const h = menors[i];
    return esc(h ? [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ') : '');
  });

  const firmaHtml = firmaImatge
    ? `<img src="${esc(firmaImatge)}" alt="Firma" class="sig-img">`
    : `<div class="sig-line"></div>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Declaración responsable IEET · Hostal Coll</title>
<style>
  :root{ --ink:#1b2430; --muted:#5b6472; --line:#c9ced8; --accent:#7A1F2B; --paper:#ffffff; --app:#eceef2; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{ background:var(--app); color:var(--ink); font-family:"Manrope","Segoe UI",system-ui,sans-serif; font-size:13px; line-height:1.5; }
  .toolbar{ position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:16px;
    padding:12px 20px; background:rgba(255,255,255,.92); backdrop-filter:blur(10px); border-bottom:1px solid #dfe3ea; }
  .tb-brand{ font-family:Georgia,serif; font-size:16px; }
  .tb-badge{ font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--accent);
    background:#f7eeec; border-radius:4px; padding:3px 8px; margin-left:10px; }
  .btn{ font:inherit; font-size:13px; padding:10px 15px; border-radius:9px; cursor:pointer; border:1px solid var(--accent);
    background:var(--accent); color:#fff; }
  .app{ padding:24px 16px 48px; }
  .doc{ width:100%; max-width:820px; margin:0 auto; background:var(--paper); padding:48px 56px; border:1px solid #e5e8ee;
    box-shadow:0 14px 44px rgba(20,30,45,.10); }
  h1{ font-size:18px; font-weight:700; border-bottom:2px solid var(--ink); padding-bottom:8px; margin:0 0 26px; }
  h2{ font-size:13px; font-weight:700; text-transform:none; border-bottom:1px solid var(--ink); padding-bottom:4px; margin:22px 0 10px; }
  .row{ display:flex; gap:24px; flex-wrap:wrap; }
  .fld{ flex:1 1 220px; min-width:180px; margin-bottom:10px; }
  .fld.small{ flex:0 0 200px; }
  .fld label{ display:block; font-size:10.5px; color:var(--muted); margin-bottom:2px; }
  .in{ font:inherit; font-size:13px; width:100%; border:0; border-bottom:1px solid var(--line); background:transparent; padding:3px 2px; }
  .in:focus{ outline:none; border-bottom-color:var(--accent); }
  p.leg{ margin:10px 0; text-align:justify; }
  .declaro{ font-weight:700; margin:14px 0 6px; }
  .menor{ display:flex; align-items:baseline; gap:8px; margin:9px 0; }
  .menor .q{ white-space:nowrap; }
  .menor .in{ flex:1 1 auto; }
  .menor .tail{ white-space:nowrap; }
  .sign{ display:flex; gap:40px; margin-top:34px; }
  .sign > div{ flex:1; }
  .sig-cap{ font-size:11px; color:var(--muted); border-top:1px solid var(--ink); padding-top:6px; margin-top:70px; }
  .sig-img{ max-height:64px; max-width:100%; display:block; margin-bottom:2px; }
  .sig-line{ height:64px; }
  .notes{ font-size:10.5px; color:var(--muted); margin-top:24px; }
  .gdpr{ font-size:10px; color:var(--muted); border-top:1px solid var(--line); margin-top:18px; padding-top:8px; text-align:justify; }
  @page{ size:A4; margin:16mm; }
  @media print{ body{ background:#fff; } .toolbar{ display:none !important; } .app{ padding:0; } .doc{ box-shadow:none; border:none; max-width:none; padding:0; } .in{ border-bottom-color:#999; } }
</style>
</head>
<body>
<div class="toolbar">
  <div class="tb-brand">Hostal Coll<span class="tb-badge">Declaración IEET · menores</span></div>
  <button id="print" class="btn">Imprimir / Guardar PDF</button>
</div>
<div class="app">
  <div class="doc">
    <h1>Declaración responsable para el impuesto sobre las estancias en establecimientos turísticos</h1>

    <h2>Datos de la persona declarante</h2>
    <div class="row">
      <div class="fld"><label>Nombre y apellidos</label><input class="in" value="${declNom}"></div>
      <div class="fld small"><label>NIF</label><input class="in" value="${declNif}"></div>
    </div>
    <div class="row">
      <div class="fld"><label>En calidad de (padre/madre, tutor/a, acompañante)</label><input class="in" value="padre/madre/tutor legal"></div>
    </div>
    <div class="row">
      <div class="fld"><label>Dirección</label><input class="in" value="${declAdreca}"></div>
      <div class="fld"><label>Población</label><input class="in" value="${declPoblacio}"></div>
    </div>

    <h2>Declaración</h2>
    <p class="leg">De acuerdo con el artículo 4.2 del Decreto 141/2017, de 19 de septiembre, por el que se aprueba el
    Reglamento del impuesto sobre las estancias en establecimientos turísticos, y bajo mi responsabilidad,</p>
    <p class="declaro">DECLARO:</p>
    ${menorNoms.map((n) => `<div class="menor"><span class="q">- Que</span><input class="in" value="${n}"><span class="tail">es menor de 17 años.</span></div>`).join('')}
    <p class="leg">Y, para que conste y resulte aplicable el supuesto de exención previsto en el artículo 27.1.b) de la Ley
    5/2017, de 28 de marzo, de medidas fiscales, administrativas, financieras y del sector público y de creación y
    regulación de los impuestos sobre grandes establecimientos comerciales, sobre estancias en establecimientos
    turísticos, sobre elementos radiotóxicos, sobre bebidas azucaradas envasadas y sobre emisiones de dióxido de
    carbono, firmo esta declaración.</p>

    <div class="fld" style="max-width:320px;margin-top:12px"><label>Lugar y fecha</label><input class="in" value="${llocData}"></div>

    <div class="sign">
      <div>
        ${firmaHtml}
        <div class="sig-cap">Firma de la persona declarante</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-cap">Firma/sello del establecimiento turístico</div>
      </div>
    </div>

    <div class="notes">
      1. Indique: padre/madre, tutor/a, acompañante.<br>2. Nombre completo del/de la menor.
    </div>
    <div class="gdpr">
      <strong>Información sobre protección de datos.</strong> Este documento de declaración responsable es un modelo que
      la Agencia Tributaria de Cataluña facilita a los establecimientos turísticos con la finalidad de dar cumplimiento al
      supuesto de exención mencionado. El establecimiento turístico es el responsable del tratamiento de los datos de
      carácter personal que pueda contener.
    </div>
  </div>
</div>
<script>document.getElementById('print').addEventListener('click', () => window.print());</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const dynamic = 'force-dynamic';
