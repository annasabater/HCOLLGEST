import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PARENTESC_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtHora(d: Date | null | undefined): string {
  if (!d) return '';
  const h = d.getHours(), m = d.getMinutes();
  if (h === 0 && m === 0) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
// Casella amb una X si està marcada.
function chk(on: boolean): string {
  return `<span class="box">${on ? 'X' : ''}</span>`;
}

const DOC_MAP: Record<string, 'NIF' | 'Pas' | 'TIE' | ''> = {
  DNI_NIF: 'NIF',
  PASSAPORT: 'Pas',
  NIE: 'TIE',
  ALTRES: '',
};

export async function GET(req: Request, ctx: { params: Promise<{ estanciaId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { estanciaId } = await ctx.params;
  // Filtre opcional: ?hab=principal (només el full de l'estada) o ?hab=<nom>
  // (només el full d'aquella habitació separada).
  const habFiltre = new URL(req.url).searchParams.get('hab');
  // Mode "plantilla en blanc": mateix formulari, sense dades d'estada (només la
  // capçalera de l'establiment). S'hi accedeix amb l'id sentinella "blank".
  const BLANK = estanciaId === 'blank';
  const dbEstancia = BLANK
    ? null
    : await prisma.estancia.findFirst({
        where: { id: estanciaId, deletedAt: null },
        include: {
          habitacio: true,
          viatgers: {
            include: { huesped: true, signatura: true, habitacioSeparada: { select: { nom: true } } },
            orderBy: { esTitular: 'desc' },
          },
          cobraments: { orderBy: { data: 'asc' } },
        },
      });
  if (!BLANK && !dbEstancia) return new Response('Not found', { status: 404 });
  const estancia =
    dbEstancia ??
    ({
      viatgers: [],
      cobraments: [],
      numContracte: '',
      anyContracte: new Date().getFullYear(),
      dataFormalitzacio: null,
      dataEntrada: null,
      dataSortida: null,
      numHabitacions: null,
      habitacio: null,
      teInternet: null,
    } as unknown as NonNullable<typeof dbEstancia>);

  type Viatger = NonNullable<typeof estancia>['viatgers'][number];

  const est = await prisma.establiment.findFirst();

  // Dades de l'establiment (Ejercicio Profesional).
  const emNom = esc(est?.raoSocial || est?.nom || 'Hostal Coll');
  const emCif = esc(est?.cif ?? '');
  const emMunicipi = esc(est?.poblacio ?? '');
  const emTel = '+34 687 55 82 48';
  const emEmail = 'hostalcoll@gmail.com';
  const emWeb = 'hostalcoll.com';
  const emAdreca = esc([est?.adreca, est?.codiPostal, est?.poblacio].filter(Boolean).join(', '));
  const nra = esc(est?.fileIdentifier ?? '');

  // Mètode de pagament (marca la casella segons els cobraments de l'estada).
  const metodes = new Set(estancia.cobraments.map((c) => c.metode));
  const pagEfectiu = metodes.has('EFECTIU');
  const pagTargeta = metodes.has('TARGETA');
  const pagTransf = metodes.has('TRANSFERENCIA');
  const pagBizum = metodes.has('BIZUM');
  const pagAltres = metodes.has('ALTRES');

  // Contracte.
  const numRef = BLANK ? '' : esc(`${estancia.numContracte}/${estancia.anyContracte}`);
  const dataFormalitzacio = fmtDate(estancia.dataFormalitzacio);
  const entradaData = fmtDate(estancia.dataEntrada);
  const entradaHora = fmtHora(estancia.dataEntrada);
  const sortidaData = fmtDate(estancia.dataSortida);
  const sortidaHora = fmtHora(estancia.dataSortida);
  const numHab = esc(estancia.numHabitacions != null ? String(estancia.numHabitacions) : (estancia.habitacio?.nom ?? ''));
  const internetSi = estancia.teInternet === true;
  const internetNo = estancia.teInternet === false;

  // Fulls separats per HABITACIÓ: els viatgers amb "habitació separada" van en un
  // full propi amb aquella habitació; la resta, al full de l'habitació de l'estada.
  // Dins de cada habitació, fulls de 4 viatgers (com el llibre en paper).
  const principals = estancia.viatgers.filter((v) => !v.habitacioSeparada);
  const separatsMap = new Map<string, Viatger[]>();
  for (const v of estancia.viatgers) {
    if (!v.habitacioSeparada) continue;
    const arr = separatsMap.get(v.habitacioSeparada.nom) ?? [];
    arr.push(v);
    separatsMap.set(v.habitacioSeparada.nom, arr);
  }
  let grups: { hab: string | null; numSep: string | null; viatgers: Viatger[] }[] = [];
  if (principals.length > 0 || separatsMap.size === 0) {
    for (let i = 0; i < Math.max(1, principals.length); i += 4) {
      grups.push({ hab: null, numSep: null, viatgers: principals.slice(i, i + 4) });
    }
  }
  for (const [nom, vs] of separatsMap) {
    // Contracte propi del full separat (el del primer viatger que en tingui).
    const numSep = vs.find((v) => v.numContracteSeparat)?.numContracteSeparat ?? null;
    for (let i = 0; i < vs.length; i += 4) {
      grups.push({ hab: nom, numSep, viatgers: vs.slice(i, i + 4) });
    }
  }
  if (habFiltre) {
    grups = grups.filter((g) => (habFiltre === 'principal' ? g.hab === null : g.hab === habFiltre));
    if (grups.length === 0) grups = [{ hab: null, numSep: null, viatgers: [] }];
  }

  function fullHtml(grup: Viatger[], habSeparada: string | null, numSep: string | null, idxGrup: number, total: number): string {
    const cel = (fn: (v: Viatger | undefined) => string) => {
      let tds = '';
      for (let i = 0; i < 4; i++) tds += `<td class="vcell">${fn(grup[i])}</td>`;
      return tds;
    };
    const h = (v: Viatger | undefined) => v?.huesped;
    // El full d'una habitació separada mostra AQUELLA habitació i el SEU contracte.
    const numHabFull = habSeparada ? esc(habSeparada) : numHab;
    const numRefFull = habSeparada
      ? esc(`${numSep ?? estancia.numContracte}/${estancia.anyContracte}`)
      : numRef;

    return `
    <div class="sheet">
      <div class="nra">Número de Registro de Alquiler (NRA o NRUA): <span class="nra-val">${nra}</span></div>

      <table class="top">
        <tr>
          <td class="sec-title" colspan="2">Ejercicio Profesional</td>
          <td class="sec-title" colspan="2">Ejercicio No Profesional</td>
        </tr>
        <tr>
          <td class="lbl">Nombre/Razón social</td><td class="val">${emNom}</td>
          <td class="lbl">Nombre</td><td class="val"></td>
        </tr>
        <tr>
          <td class="lbl">NIF o CIF</td><td class="val">${emCif}</td>
          <td class="lbl">1er apellido</td><td class="val"></td>
        </tr>
        <tr>
          <td class="lbl">Municipio</td><td class="val">${emMunicipi}</td>
          <td class="lbl">2do apellido</td><td class="val"></td>
        </tr>
        <tr>
          <td class="lbl">Provincia</td><td class="val">Barcelona</td>
          <td class="lbl">Sexo</td><td class="val">Masc. ${chk(false)} &nbsp; Fem. ${chk(false)}</td>
        </tr>
        <tr>
          <td class="lbl">Tel. Fijo y/o Móvil</td><td class="val">${emTel}</td>
          <td class="lbl">Tipo documento</td><td class="val">NIF ${chk(false)} Pas ${chk(false)} TIE ${chk(false)}</td>
        </tr>
        <tr>
          <td class="lbl">Email</td><td class="val">${emEmail}</td>
          <td class="lbl">Nº documento</td><td class="val"></td>
        </tr>
        <tr>
          <td class="lbl">Web</td><td class="val">${emWeb}</td>
          <td class="lbl">Nacionalidad</td><td class="val"></td>
        </tr>
        <tr>
          <td class="lbl">URL Anuncio</td><td class="val"></td>
          <td class="lbl">F. nacimiento</td><td class="val"></td>
        </tr>
      </table>

      <table class="viatgers">
        <tr>
          <td class="lbl vhead">Nº viajeros</td>
          ${[0, 1, 2, 3].map((i) => `<td class="vcell vhead">${i + 1} ${chk(!!grup[i])}</td>`).join('')}
        </tr>
        <tr><td class="lbl">Nombre</td>${cel((v) => esc(h(v)?.nom))}</tr>
        <tr><td class="lbl">1er apellido</td>${cel((v) => esc(h(v)?.cognom1))}</tr>
        <tr><td class="lbl">2do apellido</td>${cel((v) => esc(h(v)?.cognom2))}</tr>
        <tr><td class="lbl">Sexo</td>${cel((v) => {
          const s = h(v)?.sexe;
          return v ? `Masc. ${chk(s === 'HOME')} Fem. ${chk(s === 'DONA')}` : `Masc. ${chk(false)} Fem. ${chk(false)}`;
        })}</tr>
        <tr><td class="lbl">Tipo documento</td>${cel((v) => {
          const t = h(v)?.tipusDocument ? DOC_MAP[h(v)!.tipusDocument as string] : '';
          return `NIF ${chk(t === 'NIF')} Pas ${chk(t === 'Pas')} TIE ${chk(t === 'TIE')}`;
        })}</tr>
        <tr><td class="lbl">Nº documento</td>${cel((v) => esc(h(v)?.numDocument))}</tr>
        <tr><td class="lbl">Nº Soporte</td>${cel((v) => esc(h(v)?.numSuport))}</tr>
        <tr><td class="lbl">Nacionalidad</td>${cel((v) => esc(h(v)?.nacionalitat))}</tr>
        <tr><td class="lbl">F. nacimiento</td>${cel((v) => fmtDate(h(v)?.dataNaixement))}</tr>
        <tr><td class="lbl tall">Domicilio</td>${cel((v) => esc(h(v)?.adreca))}</tr>
        <tr><td class="lbl">Localidad/País</td>${cel((v) => esc([h(v)?.municipi ?? h(v)?.localitat, h(v)?.pais].filter(Boolean).join(', ')))}</tr>
        <tr><td class="lbl">Tel. Fijo</td>${cel(() => '')}</tr>
        <tr><td class="lbl">Tel. Móvil</td>${cel((v) => esc(h(v)?.telefon))}</tr>
        <tr><td class="lbl">Email</td>${cel((v) => esc(h(v)?.email))}</tr>
        <tr><td class="lbl">Parentesco</td>${cel((v) => esc(v?.parentesc ? PARENTESC_LABELS[v.parentesc] : ''))}</tr>
      </table>

      <table class="contracte">
        <tr>
          <td class="ctit" rowspan="6">Contrato:</td>
          <td class="lbl">Nº Referencia:</td><td class="val">${numRefFull}</td>
          <td class="lbl">Fecha</td><td class="val">${dataFormalitzacio}</td>
        </tr>
        <tr>
          <td class="lbl">Fecha y hora de entrada:</td><td class="val" colspan="3">${entradaData}${entradaHora ? ` &nbsp; ${entradaHora}` : ''}</td>
        </tr>
        <tr>
          <td class="lbl">Fecha y hora de salida:</td><td class="val" colspan="3">${sortidaData}${sortidaHora ? ` &nbsp; ${sortidaHora}` : ''}</td>
        </tr>
        <tr>
          <td class="lbl">Dirección del inmueble:</td><td class="val" colspan="3">${emAdreca}</td>
        </tr>
        <tr>
          <td class="lbl">Nº habitaciones</td><td class="val" colspan="3">${numHabFull}</td>
        </tr>
        <tr>
          <td class="lbl">Conexión a Internet</td><td class="val" colspan="3">Sí ${chk(internetSi)} &nbsp; No ${chk(internetNo)}</td>
        </tr>
      </table>

      <table class="pago">
        <tr>
          <td class="ctit" rowspan="4">Datos del pago:</td>
          <td class="lbl">Medio de pago:</td>
          <td class="val" colspan="3">
            ${chk(pagEfectiu)} Efectivo &nbsp; ${chk(pagTargeta)} Tarjeta &nbsp; ${chk(pagTransf)} Transferencia &nbsp; ${chk(pagBizum)} Bizum &nbsp; ${chk(pagAltres)} Otros
          </td>
        </tr>
        <tr>
          <td class="lbl">Tipo tarjeta y número</td><td class="val"></td>
          <td class="lbl">Fecha caducidad</td><td class="val"></td>
        </tr>
        <tr>
          <td class="lbl">IBAN cuenta bancaria</td><td class="val" colspan="3"></td>
        </tr>
        <tr>
          <td class="lbl">Titular medio de pago:</td><td class="val" colspan="3"></td>
        </tr>
      </table>

      <div class="firmes">
        <div class="firmes-lbl">Firmas</div>
        <div class="firmes-boxes">
          ${[0, 1, 2, 3].map((i) => {
            const v = grup[i];
            const sig = v?.signatura?.imatge;
            return `<div class="firma">${sig ? `<img src="${esc(sig)}" alt="">` : ''}</div>`;
          }).join('')}
        </div>
      </div>

      ${total > 1 ? `<div class="pag">Full ${idxGrup + 1} de ${total}</div>` : ''}
    </div>`;
  }

  const sheets = grups.map((g, i) => fullHtml(g.viatgers, g.hab, g.numSep, i, grups.length)).join('');
  const titol = esc(estancia.viatgers[0]?.huesped ? `${estancia.viatgers[0].huesped.nom} ${estancia.viatgers[0].huesped.cognom1}` : 'Registre');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registre ${numRef} · ${titol} · Hostal Coll</title>
<style>
  :root { --line:#2b2b2b; --lbl:#f2f0ee; --brand:#7A1F2B; }
  * { box-sizing:border-box; }
  body { font-family:Arial,Helvetica,sans-serif; background:#eee; margin:0; color:#111; }
  .toolbar { position:sticky; top:0; z-index:5; display:flex; justify-content:space-between; align-items:center;
    background:var(--brand); color:#fff; padding:10px 16px; }
  .toolbar .brand { font-weight:bold; letter-spacing:.5px; }
  .btn { border:0; border-radius:8px; padding:8px 14px; font-size:14px; cursor:pointer; background:#fff; color:var(--brand); font-weight:600; }
  .wrap { padding:16px; }
  .sheet { background:#fff; width:210mm; max-width:100%; min-height:290mm; margin:0 auto 16px; padding:10mm; page-break-after:always; }
  .sheet:last-child { page-break-after:auto; }
  .nra { font-size:12px; font-weight:bold; text-decoration:underline; margin-bottom:6px; }
  .nra-val { text-decoration:none; font-weight:normal; }
  table { border-collapse:collapse; width:100%; table-layout:fixed; }
  td { border:1px solid var(--line); padding:2px 4px; font-size:10px; vertical-align:middle; height:20px; word-break:break-word; }
  .sec-title { text-align:center; font-weight:bold; font-size:12px; background:#fff; border-bottom:2px solid var(--line); }
  .lbl { background:var(--lbl); font-size:9.5px; white-space:nowrap; }
  .top td.lbl { width:16%; }
  .top td.val { width:34%; }
  .viatgers { margin-top:6px; }
  .viatgers td.lbl { width:16%; }
  .vcell { width:21%; }
  .vhead { text-align:center; font-weight:bold; }
  .tall { height:34px; }
  .box { display:inline-block; width:12px; height:12px; border:1px solid var(--line); text-align:center; line-height:11px;
    font-size:10px; font-weight:bold; vertical-align:middle; }
  .contracte, .pago { margin-top:6px; }
  .ctit { width:12%; font-weight:bold; background:#fff; vertical-align:top; font-size:10px; }
  .contracte td.lbl, .pago td.lbl { width:22%; }
  .firmes { margin-top:8px; border:1px solid var(--line); }
  .firmes-lbl { font-size:10px; font-weight:bold; padding:2px 4px; border-bottom:1px solid var(--line); background:var(--lbl); }
  .firmes-boxes { display:flex; }
  .firma { flex:1; height:70px; border-right:1px solid var(--line); display:flex; align-items:center; justify-content:center; }
  .firma:last-child { border-right:0; }
  .firma img { max-width:100%; max-height:66px; }
  .pag { text-align:right; font-size:9px; color:#777; margin-top:4px; }
  /* Mòbil: el full A4 no hi cap; l'ajustem a l'ample de pantalla (la impressió/PDF
     manté la mida A4 gràcies a @media print). */
  @media screen and (max-width:820px) {
    .wrap { padding:6px; }
    .sheet { padding:8px; min-height:auto; }
    .toolbar { flex-wrap:wrap; gap:8px; }
    td { padding:2px 3px; }
    /* Les etiquetes poden fer salt de línia (si no, vessen sobre el valor). */
    .lbl { white-space:normal; word-break:break-word; font-size:8.5px; }
    /* Una mica més d'espai per a les etiquetes llargues d'aquestes seccions. */
    .contracte td.lbl, .pago td.lbl { width:34%; }
    .top td.lbl, .viatgers td.lbl { width:22%; }
    .ctit { width:14%; }
  }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .wrap { padding:0; }
    .sheet { width:auto; min-height:auto; margin:0; padding:0; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <div class="brand">Hostal Coll · Llibre de registre</div>
    <button class="btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  <div class="wrap">
    ${sheets}
  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
