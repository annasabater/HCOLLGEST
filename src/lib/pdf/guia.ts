/**
 * Generador de la guia d'ús de l'aplicació (PDF, pdf-lib). Explica què hi ha a
 * cada secció i què fa. Sempre actualitzada (es genera al moment).
 */
import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = { w: 595.28, h: 841.89 };
const M = 56;
const GRANATE = rgb(0.478, 0.122, 0.169);
const INK = rgb(0.13, 0.13, 0.15);

function sanitize(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/€/g, ' EUR')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

interface Section {
  h: string;
  p: string[];
}

const GUIA: Section[] = [
  {
    h: 'Què és aquesta aplicació',
    p: [
      'Gestió integral de l\'Hostal Coll: registre de viatgers (Mossos), CRM d\'hostes, estades, neteja, facturació, despeses, balanç econòmic, personal i mascotes.',
      'Principi: cada dada s\'introdueix una sola vegada i es reutilitza a tot arreu. L\'hoste del registre policial és el mateix client del CRM i de la facturació.',
      'Rols: ADMIN (tot, inclosos diners i configuració), RECEPCIÓ (dia a dia) i CONSULTA (només lectura). Els diners només els veu l\'ADMIN.',
    ],
  },
  {
    h: 'Tauler',
    p: [
      'Pàgina d\'inici. Mostra el que és urgent: comunicacions a Mossos pendents, firmes pendents, errors d\'enviament, entrades i sortides properes.',
      'Per a l\'ADMIN també mostra els indicadors econòmics del mes (ingressos, despeses, benefici, personal a pagar i dipòsits en custòdia) i alertes de factures i actius.',
    ],
  },
  {
    h: 'Hostes',
    p: [
      'Fitxa única de cada persona. Cerca per nom, document, email o telèfon.',
      'A la llista, els hostes marcats com a "no acollir" surten amb una etiqueta vermella, i els que tenen mascota amb una petjada.',
      'Dins la fitxa: dades de contacte, historial d\'estades, documents d\'identitat (xifrats), mascotes i notes internes. Hi ha accés directe als Avisos interns.',
    ],
  },
  {
    h: 'Avisos interns',
    p: [
      'Llista per vetar o vigilar persones, encara que NO siguin clients (per exemple, algú que truca per telèfon). Es registra nom, telèfon, motiu i gravetat.',
      'Quan registres una estada i escrius un nom o telèfon que coincideix amb un avís, salta una alerta vermella per recordar-te de no acollir-lo.',
      'Els avisos actius apareixen a Hostes i al Llibre de registre. Es gestionen (afegir, activar/desactivar, eliminar) des del botó "Gestionar".',
    ],
  },
  {
    h: 'Estades',
    p: [
      'Registre mestre d\'una estada amb tots els viatgers (model oficial de persones allotjades). Detecta hostes recurrents i valida DNI/NIE/codi postal.',
      'Pots escanejar el DNI/passaport (OCR) per autoemplenar, capturar la firma a la tauleta i generar la Fitxa PDF signable.',
      'Des del detall: comunicació a Mossos, ampliació de l\'estada (1.1, 1.2...), facturació, dipòsits/fiances i mascotes de l\'hoste.',
    ],
  },
  {
    h: 'Calendari i Neteja',
    p: [
      'Calendari: vista d\'ocupació per setmana o mes.',
      'Neteja: tasques per dia i habitació. Cada habitació pot ser "sortida" (neteja a fons: microones, nevera...) o "repàs", cosa que determina la tarifa.',
    ],
  },
  {
    h: 'Plantilles (WhatsApp)',
    p: [
      'Genera missatges de WhatsApp per a la dona de neteja i per als hostes, en català, castellà, francès o anglès. Cada hoste pot rebre\'l en un idioma diferent.',
      'Per a la neteja: tria el dia i, per cada habitació, si és sortida o repàs; el missatge ho indica. Els missatges s\'obren al WhatsApp del teu telèfon i els envies tu.',
    ],
  },
  {
    h: 'Llibre de registre',
    p: [
      'Export del registre de viatgers per a un rang de dates (conservar 3 anys per llei). Es pot veure a pantalla o descarregar en CSV.',
      'Inclou una columna de mascotes i l\'accés als avisos interns.',
    ],
  },
  {
    h: 'Balanç (i Facturació, Despeses, Veri*Factu)',
    p: [
      'Centre econòmic. A la part de dalt hi ha pestanyes: Balanç, Facturació, Despeses i Veri*Factu.',
      'Balanç: ingressos, despeses, personal i benefici, per mes o per any, amb gràfic d\'evolució, donut de despeses per categoria, ingressos per mètode, comparativa amb l\'any anterior i export a CSV i PDF.',
      'Ingressos = cobraments + dipòsits retinguts. Les retencions en custòdia (fiances) NO són ingrés fins que es retenen per danys.',
      'Facturació: factures i recibos. Veri*Factu: registre encadenat amb huella i QR per a l\'AEAT (obligatori cap al 2027).',
    ],
  },
  {
    h: 'Mascotes',
    p: [
      'Mascotes dels hostes, amb espècie i mida (petit/mitjà/gran). Es vinculen des de la fitxa de l\'hoste o des de l\'estada, i surten a Hostes i al Llibre.',
      'A la mateixa pàgina hi ha, com a secció secundària, els Actius (mobiliari i electrodomèstics) amb alertes de garantia i antiguitat.',
    ],
  },
  {
    h: 'Personal',
    p: [
      'Treballadors, amb pagament per hores. Es registren les jornades (dies treballats) i calcula el que cobren. També absències i nòmines. (Només ADMIN.)',
    ],
  },
  {
    h: 'Configuració',
    p: [
      'Dades de l\'establiment, Mossos, facturació i RGPD. (Només ADMIN.)',
      'Inclou la Còpia de seguretat: descàrrega manual de totes les dades en JSON i l\'enviament automàtic mensual per correu.',
    ],
  },
  {
    h: 'Seguretat i durabilitat de les dades',
    p: [
      'Les dades viuen en una base de dades PostgreSQL gestionada (Supabase) amb còpies automàtiques. Els documents d\'identitat es desen xifrats i tota acció queda auditada.',
      'A més, cada mes s\'envia una còpia completa en JSON al correu de l\'hostal, i en pots descarregar una en qualsevol moment des de Configuració. Guarda-la en un lloc segur (disc o Drive).',
      'Recomanat: activar Supabase Pro (recuperació a un punt en el temps) i el doble factor (2FA) als comptes de Vercel i Supabase.',
    ],
  },
  {
    h: 'Recordatoris legals',
    p: [
      'Mossos: comunicar les estades en menys de 24 h i conservar el registre 3 anys.',
      'Una fiança/dipòsit no és un ingrés mentre està en custòdia; només passa a ingrés si es reté per danys. Tot queda registrat i és coherent amb Veri*Factu.',
    ],
  },
];

export async function buildGuiaPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxW = A4.w - M * 2;

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;

  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
  };
  const ensure = (need: number) => {
    if (y - need < M) newPage();
  };

  const wrap = (text: string, size: number, f = font): string[] => {
    const words = sanitize(text).split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxW) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Capçalera de portada
  page.drawRectangle({ x: 0, y: A4.h - 96, width: A4.w, height: 96, color: GRANATE });
  page.drawText('Guia d\'us', { x: M, y: A4.h - 52, size: 26, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Hostal Coll - gestio integral (PMS + ERP)', { x: M, y: A4.h - 74, size: 12, font, color: rgb(0.93, 0.85, 0.86) });
  y = A4.h - 124;

  for (const sec of GUIA) {
    ensure(40);
    page.drawText(sanitize(sec.h), { x: M, y: y - 14, size: 14, font: bold, color: GRANATE });
    y -= 26;
    for (const para of sec.p) {
      for (const ln of wrap(para, 10.5)) {
        ensure(15);
        page.drawText(ln, { x: M, y: y - 11, size: 10.5, font, color: INK });
        y -= 15;
      }
      y -= 4;
    }
    y -= 10;
  }

  return doc.save();
}
