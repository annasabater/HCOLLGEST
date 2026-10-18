/**
 * Fitxers d'importació de l'AEAT per als models 303, 130 i 115 a partir de les
 * caselles que calcula /impostos (lib/impostos.ts). Dissenys de registre:
 *  - 303: DR303e26v101 (exercici 2026 i següents, actualitzat 28/01/26).
 *  - 130: DR130e15v12 (Orden HAP/258/2015, exercicis 2019 i següents).
 *  - 115: DR115e15v13 (Orden EHA/3435/2007, exercicis 2019 i següents).
 * Només el règim general (sense mòduls, prorrata ni criteri de caixa), que és el
 * cas de l'hostal. Funcions PURES i testejables.
 */
import type { Caselles } from '../impostos';
import { blancs, constant, fitxer, netejaIban, pagina, separaNom, type Camp } from './fitxer';

/** Identificador del programa (camp «Versión del Programa» de la capçalera). */
export const VERSIO_PROGRAMA = 'HC01';

/**
 * Forma de pagament quan surt a ingressar:
 *  - U: domiciliació (l'AEAT carrega l'import l'últim dia del termini; cal IBAN).
 *  - I: ingrés (es paga al banc o amb NRC i després es presenta).
 */
export type FormaPagament = 'U' | 'I';

export interface DadesDeclarant {
  nif: string;
  /** «Nom Cognom1 Cognom2» del titular (persona física). */
  nomComplet: string;
  any: number;
  /** Trimestre 1–4. */
  trimestre: number;
  formaPagament: FormaPagament;
  iban?: string | null;
}

const imp = (pos: number, valor: number | undefined, tipus: 'Num' | 'N' = 'Num'): Camp => ({
  pos, lon: 17, tipus, valor: valor ?? 0, import: true,
});
const num = (pos: number, lon: number, valor: string | number): Camp => ({ pos, lon, tipus: 'Num', valor });
const txt = (pos: number, lon: number, valor: string | null | undefined): Camp => ({ pos, lon, tipus: 'An', valor });

/** Valida les dades comunes i torna l'IBAN net (obligatori si es domicilia). */
function comprova(d: DadesDeclarant, resultat: number): string {
  if (!/^[0-9A-Z]{9}$/.test(d.nif.toUpperCase())) throw new Error('Falta el NIF del titular (Configuració → dades de facturació)');
  if (!d.nomComplet.trim()) throw new Error('Falta el nom del titular (Configuració → dades de facturació)');
  if (d.trimestre < 1 || d.trimestre > 4) throw new Error('Trimestre no vàlid');
  const iban = netejaIban(d.iban);
  if (resultat > 0 && d.formaPagament === 'U' && !/^ES\d{22}$/.test(iban)) {
    throw new Error("Per domiciliar cal un IBAN espanyol vàlid (Configuració → dades de facturació)");
  }
  return iban;
}

/** Tipus de declaració per a 130/115: I/U si surt a ingressar, N si surt zero, B si és negatiu (130). */
function tipusIrpf(resultat: number, forma: FormaPagament, negatiu: 'B' | 'N'): string {
  if (resultat > 0) return forma;
  if (resultat < 0) return negatiu;
  return 'N';
}

// ─── 303 ────────────────────────────────────────────────────────────────────

/**
 * Tipus de declaració del 303 (nota 1, pàgina 1): I/U a ingressar; C a
 * compensar (negatiu en 1T-3T); D devolució (negatiu al 4T); N resultat zero.
 */
export function tipus303(c: Caselles, forma: FormaPagament, ultimTrimestre: boolean): string {
  const r = c['71'] ?? 0;
  if (r > 0) return forma;
  if (r < 0) return ultimTrimestre ? 'D' : 'C';
  return 'N';
}

export function fitxer303(c: Caselles, d: DadesDeclarant): string {
  const resultat = c['71'] ?? 0;
  const iban = comprova(d, resultat);
  const ultim = d.trimestre === 4;
  const periode = `${d.trimestre}T`;
  const { nom, cognoms } = separaNom(d.nomComplet);
  const tipus = tipus303(c, d.formaPagament, ultim);

  const p1 = pagina(
    [
      constant(1, '<T'), constant(3, '303'), constant(6, '01000'), constant(11, '>'),
      blancs(12, 1),
      txt(13, 1, tipus),
      txt(14, 9, d.nif),
      txt(23, 80, `${cognoms} ${nom}`),
      num(103, 4, d.any),
      constant(107, periode),
      num(109, 1, 2), // tributació exclusivament foral: NO
      num(110, 1, 2), // registre de devolució mensual: NO
      num(111, 1, 3), // règim simplificat: NO (només règim general)
      num(112, 1, 2), // autoliquidació conjunta: NO
      num(113, 1, 2), // criteri de caixa: NO
      num(114, 1, 2), // destinatari d'operacions en criteri de caixa: NO
      // Prorrata especial (opció / revocació): blanc fora del 4T; «2» (NO) al 4T.
      ultim ? num(115, 1, 2) : blancs(115, 1),
      ultim ? num(116, 1, 2) : blancs(116, 1),
      num(117, 1, 2), // concurs de creditors: NO
      blancs(118, 8), // data de l'auto de concurs
      blancs(126, 1), // tipus d'autoliquidació en concurs
      num(127, 1, 2), // SII voluntari: NO
      num(128, 1, ultim ? 2 : 0), // exonerat del 390: NO al 4T; «0» la resta
      num(129, 1, 0), // volum d'operacions ≠ 0 (només exonerats del 390)
      num(130, 1, 0), // pagament a compte de carburants: «0» en trimestrals
      // IVA meritat: [150]-[152] i [165]-[167] (tipus «00000»), [01]-[03] 4 %,
      // [153]-[155] (tipus «00000»), [04]-[06] 10 %, [07]-[09] 21 %.
      imp(131, 0), num(148, 5, '00000'), imp(153, 0),
      imp(170, 0), num(187, 5, '00000'), imp(192, 0),
      imp(209, c['01']), num(226, 5, '00400'), imp(231, c['03']),
      imp(248, 0), num(265, 5, '00000'), imp(270, 0),
      imp(287, c['04']), num(304, 5, '01000'), imp(309, c['06']),
      imp(326, c['07']), num(343, 5, '02100'), imp(348, c['09']),
      imp(365, 0), imp(382, 0), // [10] [11] adquisicions intracomunitàries
      imp(399, 0), imp(416, 0), // [12] [13] inversió del subjecte passiu
      imp(433, 0, 'N'), imp(450, 0, 'N'), // [14] [15] modificació de bases
      // Recàrrec d'equivalència: [156]-[158], [168]-[170], [16]-[18], [19]-[21], [22]-[24]
      imp(467, 0), num(484, 5, '00175'), imp(489, 0),
      imp(506, 0), num(523, 5, '00050'), imp(528, 0),
      imp(545, 0), num(562, 5, '00000'), imp(567, 0),
      imp(584, 0), num(601, 5, '00140'), imp(606, 0),
      imp(623, 0), num(640, 5, '00520'), imp(645, 0),
      imp(662, 0, 'N'), imp(679, 0, 'N'), // [25] [26]
      imp(696, c['27'], 'N'), // [27] total quota meritada
      imp(713, c['28']), imp(730, c['29']), // [28] [29] operacions interiors corrents
      imp(747, 0), imp(764, 0), // [30] [31] béns d'inversió
      imp(781, 0), imp(798, 0), imp(815, 0), imp(832, 0), // [32]-[35] importacions
      imp(849, 0), imp(866, 0), imp(883, 0), imp(900, 0), // [36]-[39] intracomunitàries
      imp(917, 0, 'N'), imp(934, 0, 'N'), // [40] [41] rectificació de deduccions
      imp(951, 0, 'N'), imp(968, 0, 'N'), imp(985, 0, 'N'), // [42] [43] [44]
      imp(1002, c['45'], 'N'), // [45] total a deduir
      imp(1019, c['46'], 'N'), // [46] resultat règim general
      blancs(1036, 521),
      blancs(1557, 13), // segell electrònic (AEAT)
      constant(1570, '</T30301000>'),
    ],
    1581,
  );

  const p3 = pagina(
    [
      constant(1, '<T'), constant(3, '303'), constant(6, '03000'), constant(11, '>'),
      imp(12, 0, 'N'), imp(29, 0, 'N'), imp(46, 0, 'N'), imp(63, 0, 'N'), // [59] [60] [120] [122]
      imp(80, 0, 'N'), imp(97, 0, 'N'), // [123] [124]
      imp(114, 0, 'N'), imp(131, 0, 'N'), imp(148, 0, 'N'), imp(165, 0, 'N'), // [62] [63] [74] [75]
      imp(182, 0, 'N'), // [76]
      imp(199, c['64'], 'N'), // [64] suma de resultats
      { pos: 216, lon: 5, tipus: 'Num', valor: c['65'] ?? 100, import: true }, // [65] % atribuïble (100,00)
      imp(221, c['66'], 'N'), // [66]
      imp(238, 0), // [77]
      imp(255, c['110']), imp(272, c['78']), imp(289, c['87']), // [110] [78] [87]
      imp(306, 0, 'N'), imp(323, 0, 'N'), // [68] [108]
      imp(340, c['69'], 'N'), // [69]
      imp(357, 0), imp(374, 0), imp(391, 0), // [70] [109] [112]
      imp(408, c['71'], 'N'), // [71] resultat
      blancs(425, 1), // sense activitat
      blancs(426, 1), blancs(427, 13), blancs(440, 1), // rectificativa
      imp(441, 0), blancs(458, 1), blancs(459, 1),
      blancs(460, 546),
      constant(1006, '</T30303000>'),
    ],
    1017,
  );

  // Pàgina DID: IBAN de domiciliació (U) o de devolució (D).
  const ambCompte = tipus === 'U' || tipus === 'D';
  if (tipus === 'D' && !/^ES\d{22}$/.test(iban)) throw new Error('Per a la devolució cal un IBAN espanyol vàlid');
  const did = ambCompte
    ? [pagina(
        [
          constant(1, '<T'), constant(3, '303'), constant(6, 'DID00'), constant(11, '>'),
          blancs(12, 11), // SWIFT-BIC (només comptes estrangers)
          txt(23, 34, iban),
          blancs(57, 70), blancs(127, 35), blancs(162, 30), blancs(192, 2),
          num(194, 1, tipus === 'D' ? 1 : 0), // marca SEPA: «1» compte a Espanya (devolució)
          blancs(195, 617),
          constant(812, '</T303DID00>'),
        ],
        823,
      )]
    : [];

  return fitxer(
    { model: '303', any: d.any, periode, versio: VERSIO_PROGRAMA, nifDesenvolupador: d.nif },
    [p1, p3, ...did],
  );
}

// ─── 130 ────────────────────────────────────────────────────────────────────

export function fitxer130(c: Caselles, d: DadesDeclarant): string {
  const resultat = c['19'] ?? 0;
  const iban = comprova(d, resultat);
  const periode = `${d.trimestre}T`;
  const { nom, cognoms } = separaNom(d.nomComplet);
  const tipus = tipusIrpf(resultat, d.formaPagament, 'B');
  const p1 = pagina(
    [
      constant(1, '<T'), constant(3, '130'), constant(6, '01'), constant(8, '000>'),
      blancs(12, 1),
      txt(13, 1, tipus),
      txt(14, 9, d.nif),
      txt(23, 60, cognoms),
      txt(83, 20, nom),
      num(103, 4, d.any),
      constant(107, periode),
      imp(109, c['01']), imp(126, c['02']), imp(143, c['03'], 'N'),
      imp(160, c['04']), imp(177, c['05']), imp(194, c['06']), imp(211, c['07'], 'N'),
      imp(228, 0), imp(245, 0), imp(262, 0), imp(279, 0, 'N'), // [08]-[11] activitats agràries
      imp(296, c['12']), imp(313, c['13']), imp(330, c['14'], 'N'),
      imp(347, c['15']), imp(364, c['16']), imp(381, c['17'], 'N'),
      imp(398, c['18']), imp(415, c['19'], 'N'),
      blancs(432, 1), blancs(433, 13), // complementària
      txt(446, 34, tipus === 'U' ? iban : ''),
      blancs(480, 96),
      blancs(576, 13),
      constant(589, '</T13001000>'),
    ],
    600,
  );
  return fitxer({ model: '130', any: d.any, periode, versio: VERSIO_PROGRAMA, nifDesenvolupador: d.nif }, [p1]);
}

// ─── 115 ────────────────────────────────────────────────────────────────────

export function fitxer115(c: Caselles, d: DadesDeclarant): string {
  const resultat = c['05'] ?? 0;
  const iban = comprova(d, resultat);
  const periode = `${d.trimestre}T`;
  const { nom, cognoms } = separaNom(d.nomComplet);
  const tipus = tipusIrpf(resultat, d.formaPagament, 'N');
  const p1 = pagina(
    [
      constant(1, '<T'), constant(3, '115'), constant(6, '01'), constant(8, '000>'),
      blancs(12, 1),
      txt(13, 1, tipus),
      txt(14, 9, d.nif),
      txt(23, 60, cognoms),
      txt(83, 20, nom),
      num(103, 4, d.any),
      constant(107, periode),
      num(109, 15, c['01'] ?? 0), // nombre de perceptors
      imp(124, c['02']), imp(141, c['03']), imp(158, c['04']), imp(175, c['05']),
      blancs(192, 1), blancs(193, 13), // complementària
      txt(206, 34, tipus === 'U' ? iban : ''),
      blancs(240, 236),
      blancs(476, 13),
      constant(489, '</T11501000>'),
    ],
    500,
  );
  return fitxer({ model: '115', any: d.any, periode, versio: VERSIO_PROGRAMA, nifDesenvolupador: d.nif }, [p1]);
}
