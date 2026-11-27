/**
 * Dades del pressupost imprès, compartides entre el full HTML
 * (`/imprimir/pressupost/:id`) i el PDF fet al servidor (`/api/pressupostos/:id/pdf`,
 * el que s'adjunta al WhatsApp). Mateixos textos, emissor i client.
 */
import 'server-only';
import type { Establiment, Huesped, LiniaPressupost, Pressupost } from '@prisma/client';
import type { DocPdf } from '@/lib/pdf/document';

export type IdiomaPressupost = 'ca' | 'es' | 'fr' | 'en';

export const DICT_PRESSUPOST = {
  ca: { doc: 'Pressupost', oferta: 'Oferta', casa: 'Casa de Hostes', per: 'Per a', numero: 'Número', data: 'Data', valid: 'Vàlid fins a', estada: 'Estada · contracte', concepte: 'Concepte', import: 'Import (€)', base: 'Base', iva: 'IVA', total: 'Total', ivaIncl: '(IVA inclòs)', formaPag: 'Forma de pagament', phCli: 'Nom del client / empresa', phNif: 'NIF / CIF (opcional)', phDom: 'Domicili (opcional)', phLoc: 'Localitat (opcional)', phData: 'dd/mm/aaaa' },
  es: { doc: 'Presupuesto', oferta: 'Oferta', casa: 'Casa de Huéspedes', per: 'Para', numero: 'Número', data: 'Fecha', valid: 'Válido hasta', estada: 'Estancia · contrato', concepte: 'Concepto', import: 'Importe (€)', base: 'Base', iva: 'IVA', total: 'Total', ivaIncl: '(IVA incluido)', formaPag: 'Forma de pago', phCli: 'Nombre del cliente / empresa', phNif: 'NIF / CIF (opcional)', phDom: 'Domicilio (opcional)', phLoc: 'Localidad (opcional)', phData: 'dd/mm/aaaa' },
  fr: { doc: 'Devis', oferta: 'Offre', casa: "Maison d'hôtes", per: 'Pour', numero: 'Numéro', data: 'Date', valid: "Valable jusqu'au", estada: 'Séjour · contrat', concepte: 'Description', import: 'Montant (€)', base: 'Base', iva: 'TVA', total: 'Total', ivaIncl: '(TVA incluse)', formaPag: 'Mode de paiement', phCli: 'Nom du client / entreprise', phNif: 'NIF / CIF (facultatif)', phDom: 'Adresse (facultatif)', phLoc: 'Ville (facultatif)', phData: 'jj/mm/aaaa' },
  en: { doc: 'Quote', oferta: 'Offer', casa: 'Guest House', per: 'For', numero: 'Number', data: 'Date', valid: 'Valid until', estada: 'Stay · contract', concepte: 'Description', import: 'Amount (€)', base: 'Subtotal', iva: 'VAT', total: 'Total', ivaIncl: '(VAT included)', formaPag: 'Payment method', phCli: 'Client / company name', phNif: 'Tax ID (optional)', phDom: 'Address (optional)', phLoc: 'City (optional)', phData: 'dd/mm/yyyy' },
} as const;

export function idiomaPressupost(idioma: string): IdiomaPressupost {
  return (['ca', 'es', 'fr', 'en'].includes(idioma) ? idioma : 'ca') as IdiomaPressupost;
}

/** Emissor (dades del hostal), igual que a la factura fiscal. Text pla (sense escapar). */
export function emissorPressupost(establiment: Establiment | null, idioma: IdiomaPressupost) {
  const T = DICT_PRESSUPOST[idioma];
  return {
    nom: establiment?.raoSocial || establiment?.nom || 'Hostal Coll',
    descriptor: establiment?.poblacio ? `${T.casa} · ${establiment.poblacio}` : `${T.casa} · Calella`,
    titular: establiment?.facturaTitular || 'Elisabeth Nualart Coll',
    nif: establiment?.facturaNif ? `NIF ${establiment.facturaNif}` : 'NIF 38835174L',
    adreca: establiment?.adreca || 'C/ Sant Isidre, 54',
    localitat:
      [establiment?.codiPostal, establiment?.poblacio, establiment?.provincia ? `(${establiment.provincia})` : null]
        .filter(Boolean)
        .join(' ') || '08370 Calella (Barcelona)',
    telefon: establiment?.telefon ? `Tel. ${establiment.telefon}` : '',
  };
}

/**
 * Client del pressupost: si està enllaçat a una estada i els camps són buits,
 * les dades del titular (com la factura fiscal).
 */
export function clientPressupost(p: Pressupost, titular: Huesped | null) {
  return {
    nom: p.clientNom || (titular ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ') : ''),
    nif: p.clientNif || (titular?.numDocument ? `${titular.tipusDocument ?? 'DNI'} ${titular.numDocument}` : ''),
    adreca: p.clientAdreca || titular?.adreca || '',
    localitat: p.clientLocalitat || (titular ? [titular.codiPostal, titular.municipi || titular.localitat].filter(Boolean).join(' ') : ''),
  };
}

const num = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
const data = (d: Date) => d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' });

/** Contingut del PDF del pressupost (el que dibuixa `buildDocPdf`), tal com està desat. */
export function docPdfPressupost(
  p: Pressupost & { linies: LiniaPressupost[] },
  titular: Huesped | null,
  establiment: Establiment | null,
): DocPdf {
  const idioma = idiomaPressupost(p.idioma);
  const T = DICT_PRESSUPOST[idioma];
  const em = emissorPressupost(establiment, idioma);
  const cli = clientPressupost(p, titular);
  const linies = p.linies.filter((l) => l.descripcio.trim() || Number(l.import));
  return {
    ref: p.id,
    title: `Pressupost ${p.numero}`,
    accent: '#574B90',
    ink: '#2A1533',
    brand: em.nom,
    brandSub: em.descriptor,
    issuer: [em.titular, em.nif, em.adreca, em.localitat, em.telefon].filter(Boolean),
    billLabel: T.per,
    bill: [cli.nom, cli.nif, cli.adreca, cli.localitat].filter(Boolean),
    docTitle: T.doc,
    badge: T.oferta,
    meta: [
      { k: T.numero, v: p.numero },
      { k: T.data, v: data(p.data) },
      ...(p.validesa ? [{ k: T.valid, v: data(p.validesa) }] : []),
    ],
    cols: [
      { label: T.concepte, kind: 'text' },
      { label: T.import, kind: 'amt' },
    ],
    rows: linies.map((l) => ({ cells: [l.descripcio, num(Number(l.import))] })),
    summary: [
      ...(p.ocultaIva
        ? []
        : [
            { label: T.base, value: `${num(Number(p.base))} €`, grand: false },
            { label: `${T.iva} (${Number(p.ivaPercent)}%)`, value: `${num(Number(p.iva))} €`, grand: false },
          ]),
      { label: p.ocultaIva ? `${T.total} ${T.ivaIncl}` : T.total, value: `${num(Number(p.total))} €`, grand: true },
    ],
  };
}
