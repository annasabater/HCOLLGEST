/**
 * Genera una guia d'ús (PDF) del programa de gestió del Hostal Coll.
 *   node scripts/guia-pdf.mjs  →  docs/Guia-us-Hostal-Coll.pdf
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';

const A4 = { w: 595.28, h: 841.89 };
const M = 56;
const GRANATE = rgb(0.478, 0.122, 0.169); // #7A1F2B
const INK = rgb(0.1, 0.1, 0.12);
const MUTE = rgb(0.42, 0.42, 0.45);

const sanitize = (s) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');

const blocks = [
  ['h1', "Guia d'us"],
  ['sub', 'Programa de gestio del Hostal Coll (PMS + ERP)'],
  [
    'p',
    "El programa centralitza tota la gestio del hostal: el registre obligatori de viatgers (Mossos d'Esquadra), el llibre de viatgers, els clients (CRM), les factures, les despeses, l'inventari, el personal i els numeros del negoci.",
  ],
  [
    'p',
    "La idea clau: s'introdueix cada dada una sola vegada i s'aprofita a tot arreu. L'hoste que registres per als Mossos es el mateix client del CRM i el mateix de la factura. A mes, cada accio queda registrada (qui ho ha fet i quan).",
  ],

  ['h2', "Com s'hi entra"],
  ['p', 'A gestio.hostalcoll.com, amb correu i contrasenya. Hi ha tres nivells:'],
  ['b', 'Administrador: ho pot fer tot (inclos personal i configuracio).'],
  ['b', 'Recepcio: el dia a dia (hostes, estades, factures, despeses...).'],
  ['b', 'Consulta: nomes mirar, sense modificar.'],

  ['h2', 'El Tauler (pantalla inicial)'],
  [
    'p',
    "Un cop d'ull al dia: alertes del que es urgent per llei (estades pendents d'enviar als Mossos, firmes que falten, enviaments amb error), els numeros del mes (ingressos, despeses, benefici i % d'ocupacio) i les properes entrades i sortides dels propers 7 dies.",
  ],

  ['h2', 'Hostes (la fitxa del client)'],
  ['b', 'Cada persona te una sola fitxa, encara que vingui moltes vegades.'],
  ['b', 'Historial de visites i estadistiques (visites, nits, primera/ultima vegada).'],
  ['b', "Notes internes objectives (fets, ex: 'factura nº 12 impagada') i marca 'no acollir' si cal."],
  ['b', "Documents d'identitat (DNI/passaport) pujats i guardats xifrats (protegits)."],

  ['h2', "Estades (el registre d'entrada)"],
  ['p', "Omples un sol formulari, que s'adapta sol:"],
  ['b', 'Si es reserva: nomes nom, cognom i un contacte.'],
  ['b', "Si es estada real: demana el que exigeix la llei (document, adreca...), amb les regles de DNI/passaport, menors i estrangers."],
  ['b', 'Escaner del DNI/passaport: fas una foto i omple les dades soles.'],
  ['b', 'Si l-hoste ja existeix, el reconeix i no duplica la fitxa.'],
  ['b', 'Despres: captura de firma a la tauleta, fitxa PDF signable, fitxer per als Mossos i factura.'],

  ['h2', 'Calendari'],
  [
    'p',
    "Vista setmanal: qui entra, qui surt i quines tasques de neteja toquen cada dia, per habitacio. Pots marcar una neteja com a feta amb un clic.",
  ],

  ['h2', 'Neteja'],
  [
    'p',
    'Tasques de neteja per habitacio (canvi complet o repas), assignades a la persona de neteja. En registrar una sortida, la tasca de neteja es crea automaticament.',
  ],

  ['h2', 'Llibre de registre'],
  [
    'p',
    "El registre de viatgers que s'ha de conservar 3 anys. El pots filtrar per dates i exportar a full de calcul.",
  ],

  ['h2', 'Facturacio'],
  [
    'p',
    'Pots fer un rebut (simple) o una factura formal. Calcula l-IVA i la tassa turistica (IEET), registra els cobraments i marca la factura com a cobrada.',
  ],

  ['h2', 'Veri*Factu (factura electronica de Hisenda)'],
  [
    'p',
    'La factura electronica obligatoria cap al 2027: cada factura genera el registre amb segell de seguretat encadenat i codi QR. Ja esta preparat; nomes falta el certificat per enviar-ho de veritat.',
  ],

  ['h2', 'Despeses'],
  [
    'p',
    "Apuntes les despeses per categoria i proveidor, amb l'adjunt (factura/tiquet), i veus els totals per periode. Pots lligar una despesa a una habitacio o a un animal.",
  ],

  ['h2', 'Actius i animals'],
  [
    'p',
    "L'inventari del hostal (TV, electrodomestics, mobiliari...): antiguitat, alertes de garantia a punt de vencer i de substitucio, historial d'avaries i reparacions, i es pot veure per habitacio. Inclou els animals del hostal amb les seves despeses.",
  ],

  ['h2', 'Personal (nomes administrador)'],
  ['p', 'Treballadors, absencies (vacances/baixes) i nomines.'],

  ['h2', 'Configuracio (nomes administrador)'],
  [
    'p',
    "Dades de l'establiment, parametres dels Mossos, la tarifa IEET i els terminis de conservacio de dades (RGPD).",
  ],

  ['h2', 'Cercador global'],
  ['p', 'A dalt de tot: escrius i busca alhora a hostes, estades, factures, despeses, actius i personal.'],

  ['h1', 'La part legal (el mes important)'],
  ['b', 'Mossos: cal comunicar cada allotjament en menys de 24 h. El programa genera el fitxer i avisa del que tens pendent.'],
  ['b', 'Conservacio del registre durant 3 anys, com mana la llei.'],
  ['b', 'RGPD: documents xifrats, cada acces auditat, i notes sobre clients sempre com a fets objectius (mai etiquetes ni discriminacio).'],

  ['h1', 'Estat actual'],
  ['b', 'Funcionant a gestio.hostalcoll.com: tot el descrit en aquesta guia.'],
  ['b', 'Pendents (necessiten dades externes): el detall del manual de Mossos, el certificat de Hisenda per a Veri*Factu i l-export complet a Excel/PDF.'],
];

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const maxW = A4.w - M * 2;

let page = doc.addPage([A4.w, A4.h]);
// Banner granate a la primera pagina
page.drawRectangle({ x: 0, y: A4.h - 120, width: A4.w, height: 120, color: GRANATE });
page.drawText('HOSTAL COLL', { x: M, y: A4.h - 60, size: 26, font: bold, color: rgb(1, 1, 1) });
page.drawText('Guia d-us del programa de gestio', {
  x: M,
  y: A4.h - 88,
  size: 12,
  font,
  color: rgb(0.93, 0.85, 0.86),
});
let y = A4.h - 150;

function wrap(text, f, size) {
  const words = sanitize(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (f.widthOfTextAtSize(test, size) > maxW - 14 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function ensure(need) {
  if (y - need < M) {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
  }
}
function draw(text, { size, f, color, x, lh }) {
  ensure(size + (lh ?? 6));
  page.drawText(sanitize(text), { x, y: y - size, size, font: f, color });
  y -= size + (lh ?? 6);
}

for (const [type, text] of blocks) {
  if (type === 'h1') {
    y -= 8;
    draw(text, { size: 17, f: bold, color: GRANATE, x: M, lh: 8 });
    ensure(6);
    page.drawLine({
      start: { x: M, y: y + 2 },
      end: { x: A4.w - M, y: y + 2 },
      thickness: 0.6,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 8;
  } else if (type === 'sub') {
    draw(text, { size: 11, f: font, color: MUTE, x: M, lh: 10 });
  } else if (type === 'h2') {
    y -= 6;
    draw(text, { size: 13, f: bold, color: INK, x: M, lh: 6 });
  } else if (type === 'p') {
    for (const ln of wrap(text, font, 10.5)) draw(ln, { size: 10.5, f: font, color: INK, x: M, lh: 4 });
    y -= 4;
  } else if (type === 'b') {
    const lines = wrap(text, font, 10.5);
    lines.forEach((ln, i) => {
      ensure(16);
      if (i === 0) page.drawText('-', { x: M, y: y - 10.5, size: 10.5, font: bold, color: GRANATE });
      page.drawText(sanitize(ln), { x: M + 14, y: y - 10.5, size: 10.5, font, color: INK });
      y -= 10.5 + 4;
    });
  }
}

// Peu a l-ultima pagina
ensure(30);
y -= 6;
page.drawLine({
  start: { x: M, y: y },
  end: { x: A4.w - M, y: y },
  thickness: 0.6,
  color: rgb(0.85, 0.85, 0.85),
});
y -= 14;
page.drawText('Acces restringit - totes les accions queden auditades - gestio.hostalcoll.com', {
  x: M,
  y,
  size: 8.5,
  font,
  color: MUTE,
});

const bytes = await doc.save();
mkdirSync('docs', { recursive: true });
writeFileSync('docs/Guia-us-Hostal-Coll.pdf', bytes);
console.log(`OK -> docs/Guia-us-Hostal-Coll.pdf (${(bytes.length / 1024).toFixed(0)} KB, ${doc.getPageCount()} pagines)`);
