/**
 * Plantilla de factura en format Word (.doc) — com a còpia de seguretat editable
 * si mai falla l'app. Es genera com a HTML compatible amb Word (disseny amb
 * TAULES + estils inline, que Word interpreta de manera fiable), mantenint l'estil
 * de marca (granat, serif) de les factures /imprimir/factura*. L'emissor ve
 * precarregat; el client, els conceptes i els imports queden en blanc per omplir.
 */
import 'server-only';
import type { Establiment } from '@prisma/client';

const ACCENT = '#7A1F2B';
const INK = '#2C1810';
const MUTED = '#7A6868';
const LINE = '#E5D8D5';
const TINT = '#F7EEEC';

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Fila buida de la taula de conceptes (per omplir a mà a Word). */
function filaBuida(): string {
  const cell = (align: string) =>
    `<td style="border-bottom:1px solid ${LINE};padding:10px 6px;font-family:Arial,sans-serif;font-size:11pt;color:${INK};text-align:${align};height:26px">&nbsp;</td>`;
  return `<tr>${cell('center')}${cell('left')}${cell('right')}${cell('right')}</tr>`;
}

export function buildFacturaWord(establiment: Establiment | null, tipus: 'fiscal' | 'simple'): string {
  const esFiscal = tipus === 'fiscal';

  const emNom = esc(establiment?.raoSocial || establiment?.nom || 'Hostal Coll');
  const emDescriptor = esc(
    establiment?.poblacio ? `Casa de Hostes · ${establiment.poblacio}` : 'Casa de Hostes · Calella',
  );
  const emTitular = esc(establiment?.facturaTitular || 'Elisabet Nualart Coll');
  const emNif = esc(establiment?.facturaNif ? `NIF ${establiment.facturaNif}` : 'NIF 38835174L');
  const emAdreca = esc(establiment?.adreca || 'C/ Sant Isidre, 54');
  const emLocalitat = esc(
    [establiment?.codiPostal, establiment?.poblacio, establiment?.provincia ? `(${establiment.provincia})` : null]
      .filter(Boolean)
      .join(' ') || '08370 Calella (Barcelona)',
  );

  const badge = esFiscal ? 'FACTURA FISCAL' : 'SIMPLIFICADA';
  const titolDoc = 'Factura';

  // Etiqueta de camp amb una línia per omplir (border-bottom).
  const camp = (label: string) =>
    `<div style="margin-bottom:6px;font-family:Arial,sans-serif;font-size:11pt;color:${INK};border-bottom:1px solid ${LINE};padding-bottom:3px">` +
    `<span style="color:${MUTED};font-size:8.5pt;text-transform:uppercase;letter-spacing:1px">${label}</span>&nbsp;` +
    `</div>`;

  const metaFila = (k: string) =>
    `<tr>` +
    `<td style="text-align:right;padding:3px 8px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED};text-transform:uppercase;letter-spacing:1px">${k}</td>` +
    `<td style="text-align:right;padding:3px 0;font-family:Arial,sans-serif;font-size:11pt;color:${INK};border-bottom:1px solid ${LINE};min-width:120px">&nbsp;</td>` +
    `</tr>`;

  const filesBuides = Array.from({ length: 7 }, filaBuida).join('');

  // Bloc de totals (fiscal: Base + IVA + Total; simple: només Total).
  const totalFila = (label: string, big: boolean, fons: string) =>
    `<tr>` +
    `<td style="background:${fons};padding:${big ? '12px' : '7px'} 14px;font-family:Georgia,'Times New Roman',serif;font-size:${big ? '15pt' : '10.5pt'};color:${INK}">${label}</td>` +
    `<td style="background:${fons};padding:${big ? '12px' : '7px'} 14px;text-align:right;font-family:Arial,sans-serif;font-weight:bold;font-size:${big ? '15pt' : '11pt'};color:${INK};border-bottom:1px solid ${LINE}">&nbsp;€</td>` +
    `</tr>`;
  const totals = esFiscal
    ? totalFila('Base imposable', false, '#ffffff') +
      totalFila('IVA (10%)', false, '#ffffff') +
      totalFila('Total', true, TINT)
    : totalFila('Total', true, TINT);

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Plantilla ${esc(badge)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Arial, sans-serif; color: ${INK}; }
</style>
</head>
<body>

<!-- Capçalera: marca + emissor -->
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
  <tr>
    <td style="vertical-align:top">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:30pt;color:${INK};letter-spacing:1px">HOSTAL COLL</div>
      <div style="font-family:Arial,sans-serif;font-size:8.5pt;color:${ACCENT};letter-spacing:3px;text-transform:uppercase;margin-top:4px">${emDescriptor}</div>
    </td>
    <td style="vertical-align:top;text-align:right;font-family:Arial,sans-serif;font-size:10pt;color:${MUTED};line-height:1.6">
      <div style="font-weight:bold;color:${INK}">${emTitular}</div>
      <div>${emNif}</div>
      <div>${emAdreca}</div>
      <div>${emLocalitat}</div>
    </td>
  </tr>
</table>

<!-- Regle -->
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0 20px">
  <tr><td style="border-top:2px solid ${INK};font-size:1px;line-height:1px">&nbsp;</td></tr>
</table>

<!-- Client + Meta -->
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:18px">
  <tr>
    <td width="55%" style="vertical-align:top;padding-right:24px">
      <div style="font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED};letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Client</div>
      ${camp('Nom i cognoms')}
      ${camp('NIF / DNI / Passaport')}
      ${camp('Adreça')}
      ${camp('Codi postal i localitat')}
    </td>
    <td width="45%" style="vertical-align:top;text-align:right">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:24pt;color:${INK}">${titolDoc}</div>
      <div style="font-family:Arial,sans-serif;font-size:8.5pt;color:${ACCENT};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">${badge}</div>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-left:auto">
        ${metaFila('Número')}
        ${metaFila('Data')}
        ${metaFila('Habitació')}
      </table>
    </td>
  </tr>
</table>

<!-- Conceptes -->
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
  <tr>
    <td width="12%" style="border-bottom:2px solid ${INK};padding:0 6px 8px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED};letter-spacing:1px;text-transform:uppercase;text-align:center">Cant.</td>
    <td style="border-bottom:2px solid ${INK};padding:0 6px 8px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED};letter-spacing:1px;text-transform:uppercase">Concepte</td>
    <td width="20%" style="border-bottom:2px solid ${INK};padding:0 6px 8px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED};letter-spacing:1px;text-transform:uppercase;text-align:right">Preu (€)</td>
    <td width="20%" style="border-bottom:2px solid ${INK};padding:0 6px 8px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED};letter-spacing:1px;text-transform:uppercase;text-align:right">Import (€)</td>
  </tr>
  ${filesBuides}
</table>

<!-- Totals -->
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:18px 0 0 auto;width:320px">
  ${totals}
</table>

${
  esFiscal
    ? `<div style="margin-top:14px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED}">Factura subjecta a IVA. Sèrie fiscal NN/AA.</div>`
    : `<div style="margin-top:14px;font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED}">Factura simplificada (art. 7 RD 1619/2012).</div>`
}

<div style="margin-top:26px;padding-top:10px;border-top:1px solid ${LINE};font-family:Arial,sans-serif;font-size:8.5pt;color:${MUTED}">${emNom} · ${emNif}</div>

</body>
</html>`;
}
