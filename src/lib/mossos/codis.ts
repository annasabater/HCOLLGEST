/**
 * Codificacions OFICIALS del fitxer massiu de Mossos d'Esquadra, segons el
 * "Manual d'instruccions de l'usuari del web de registre de viatgers" (v8, maig
 * 2025), apartat "CODIFICACIÓ" i annex "Exemple fitxer .txt".
 *
 * A més, els mapes per convertir les nostres dades a la codificació que exigeix
 * el fitxer:
 *   - País  → ISO 3166-1 Alfa-3 (camps "país nacionalitat" i "país postal").
 *   - Província → codi INE de 2 dígits.
 *   - Municipi  → codi INE de 6 dígits (CPRO+CMUN+dígit de control), via padró INE.
 */
import { MUNICIPIS_INE } from '../data/municipis-ine';

// ---------------------------------------------------------------------------
// Codis dels desplegables (taula "CODIFICACIÓ" del manual)
// ---------------------------------------------------------------------------

export const CODES = {
  // TIPUS DOCUMENT: D=NIF/DNI/TIE · N=NIE · P=Passaport · O=Altres
  tipusDocument: { DNI_NIF: 'D', NIE: 'N', PASSAPORT: 'P', ALTRES: 'O' } as const,
  // TIPUS SEXE: M=Masculí · F=Femení · O=Altre
  sexe: { HOME: 'M', DONA: 'F' } as const,
  // TIPUS CONTRACTE: C=Contracte en curs · R=Reserva
  tipusContracte: { CONTRACTE_EN_CURS: 'C', RESERVA: 'R' } as const,
  // TIPUS PAGAMENT
  tipusPagament: {
    DESTINACIO: 'DESTI', // Pagament a destinació
    EFECTIU: 'EFECT', // Efectiu
    MOBIL: 'MOVIL', // Pagament per mòbil
    PLATAFORMA: 'PLATF', // Plataforma de pagament
    TARGETA_CREDIT: 'TARJT', // Targeta de crèdit
    TRANSFERENCIA: 'TRANS', // Transferència
    TARGETA_REGAL: 'TREG', // Targeta regal
    // Bizum no té codi propi al manual: és un pagament per mòbil → MOVIL.
    BIZUM: 'MOVIL',
  } as const,
  // TIPUS PARENTESC (abreviatures basades en el terme castellà del manual)
  parentesc: {
    AVI_AVIA: 'AB', // Abuelo/a
    BESAVI_BESAVIA: 'BA', // Bisabuelo/a
    BESNET_BESNETA: 'BN', // Biznieto/a
    CUNYAT_CUNYADA: 'CD', // Cuñado/a
    CONJUGE: 'CY', // Cónyuge
    FILL_FILLA: 'HJ', // Hijo/a
    GERMA_GERMANA: 'HR', // Hermano/a
    NET_NETA: 'NI', // Nieto/a
    PARE_MARE: 'PM', // Padre/madre
    NEBOT_NEBODA: 'SB', // Sobrino/a
    SOGRE_SOGRA: 'SG', // Suegro/a
    ONCLE_TIA: 'TI', // Tío/a
    TUTOR_TUTORA: 'TU', // Tutor/a
    GENDRE_NORA: 'YN', // Yerno/nuera
    ALTRES: 'OT', // Otros
  } as const,
  boolSiNo: (b?: boolean) => (b ? 'S' : 'N'),
} as const;

// ---------------------------------------------------------------------------
// Província → codi INE (2 dígits). Claus = noms tal com a src/lib/data/geo.ts.
// ---------------------------------------------------------------------------

export const PROVINCIA_INE: Record<string, string> = {
  'Araba/Álava': '01',
  Albacete: '02',
  Alacant: '03',
  Almeria: '04',
  Àvila: '05',
  Badajoz: '06',
  'Illes Balears': '07',
  Barcelona: '08',
  Burgos: '09',
  Càceres: '10',
  Cadis: '11',
  Castelló: '12',
  'Ciudad Real': '13',
  Còrdova: '14',
  'A Coruña': '15',
  Conca: '16',
  Girona: '17',
  Granada: '18',
  Guadalajara: '19',
  Gipuzkoa: '20',
  Huelva: '21',
  Osca: '22',
  Jaén: '23',
  Lleó: '24',
  Lleida: '25',
  'La Rioja': '26',
  Lugo: '27',
  Madrid: '28',
  Màlaga: '29',
  Múrcia: '30',
  Navarra: '31',
  Ourense: '32',
  Astúries: '33',
  Palència: '34',
  'Las Palmas': '35',
  Pontevedra: '36',
  Salamanca: '37',
  'Santa Cruz de Tenerife': '38',
  Cantàbria: '39',
  Segòvia: '40',
  Sevilla: '41',
  Sòria: '42',
  Tarragona: '43',
  Terol: '44',
  Toledo: '45',
  València: '46',
  Valladolid: '47',
  Bizkaia: '48',
  Zamora: '49',
  Saragossa: '50',
  Ceuta: '51',
  Melilla: '52',
};

export function provinciaToINE(nom: string | undefined | null): string | undefined {
  if (!nom) return undefined;
  return PROVINCIA_INE[nom.trim()];
}

// ---------------------------------------------------------------------------
// Municipi → codi INE (6 dígits), via el padró INE per província.
// ---------------------------------------------------------------------------

function normalitza(s: string): string {
  return s.trim().toLowerCase();
}

/** Índex {cpro → {nomNormalitzat → codi6}} construït un sol cop sota demanda. */
let _idx: Record<string, Record<string, string>> | null = null;
function municipiIndex(): Record<string, Record<string, string>> {
  if (_idx) return _idx;
  const idx: Record<string, Record<string, string>> = {};
  for (const cpro of Object.keys(MUNICIPIS_INE)) {
    const m: Record<string, string> = {};
    for (const [codi, nom] of MUNICIPIS_INE[cpro]!) m[normalitza(nom)] = codi;
    idx[cpro] = m;
  }
  _idx = idx;
  return idx;
}

/** Llista de municipis (nom) d'una província INE, per als desplegables. */
export function municipisDeProvincia(cpro: string): string[] {
  return (MUNICIPIS_INE[cpro] ?? []).map(([, nom]) => nom);
}

/** Codi INE de 6 dígits del municipi dins una província (per nom o pel propi codi). */
export function municipiToINE(
  cpro: string | undefined,
  municipi: string | undefined | null,
): string | undefined {
  if (!cpro || !municipi) return undefined;
  const val = municipi.trim();
  // Si ja ens passen el codi de 6 dígits, validem que existeixi a la província.
  if (/^\d{6}$/.test(val)) {
    return (MUNICIPIS_INE[cpro] ?? []).some(([c]) => c === val) ? val : undefined;
  }
  return municipiIndex()[cpro]?.[normalitza(val)];
}

// ---------------------------------------------------------------------------
// País → ISO 3166-1 Alfa-3. Claus = noms tal com a src/lib/data/geo.ts (PAISOS).
// ---------------------------------------------------------------------------

export const PAIS_ISO3: Record<string, string> = {
  Espanya: 'ESP',
  Afganistan: 'AFG',
  Albània: 'ALB',
  Alemanya: 'DEU',
  Algèria: 'DZA',
  Andorra: 'AND',
  Angola: 'AGO',
  'Aràbia Saudita': 'SAU',
  Argentina: 'ARG',
  Armènia: 'ARM',
  Austràlia: 'AUS',
  Àustria: 'AUT',
  Azerbaidjan: 'AZE',
  Bahames: 'BHS',
  Bahrain: 'BHR',
  Bangladesh: 'BGD',
  Bèlgica: 'BEL',
  Belize: 'BLZ',
  Benín: 'BEN',
  Bielorússia: 'BLR',
  Bolívia: 'BOL',
  'Bòsnia i Hercegovina': 'BIH',
  Botswana: 'BWA',
  Brasil: 'BRA',
  Bulgària: 'BGR',
  'Burkina Faso': 'BFA',
  Cambodja: 'KHM',
  Camerun: 'CMR',
  Canadà: 'CAN',
  Xile: 'CHL',
  Xina: 'CHN',
  Xipre: 'CYP',
  Colòmbia: 'COL',
  'Corea del Sud': 'KOR',
  'Costa Rica': 'CRI',
  "Costa d'Ivori": 'CIV',
  Croàcia: 'HRV',
  Cuba: 'CUB',
  Dinamarca: 'DNK',
  Egipte: 'EGY',
  'Emirats Àrabs Units': 'ARE',
  Equador: 'ECU',
  Eslovàquia: 'SVK',
  Eslovènia: 'SVN',
  'Estats Units': 'USA',
  Estònia: 'EST',
  Etiòpia: 'ETH',
  Filipines: 'PHL',
  Finlàndia: 'FIN',
  França: 'FRA',
  Gàmbia: 'GMB',
  Geòrgia: 'GEO',
  Ghana: 'GHA',
  Grècia: 'GRC',
  Guatemala: 'GTM',
  Guinea: 'GIN',
  'Guinea Equatorial': 'GNQ',
  Hondures: 'HND',
  Hongria: 'HUN',
  Índia: 'IND',
  Indonèsia: 'IDN',
  Iran: 'IRN',
  Iraq: 'IRQ',
  Irlanda: 'IRL',
  Islàndia: 'ISL',
  Israel: 'ISR',
  Itàlia: 'ITA',
  Jamaica: 'JAM',
  Japó: 'JPN',
  Jordània: 'JOR',
  Kazakhstan: 'KAZ',
  Kenya: 'KEN',
  Kuwait: 'KWT',
  Letònia: 'LVA',
  Líban: 'LBN',
  Libèria: 'LBR',
  Líbia: 'LBY',
  Lituània: 'LTU',
  Luxemburg: 'LUX',
  'Macedònia del Nord': 'MKD',
  Malàisia: 'MYS',
  Mali: 'MLI',
  Malta: 'MLT',
  Marroc: 'MAR',
  Mauritània: 'MRT',
  Mèxic: 'MEX',
  Moldàvia: 'MDA',
  Mònaco: 'MCO',
  Mongòlia: 'MNG',
  Montenegro: 'MNE',
  Moçambic: 'MOZ',
  Nepal: 'NPL',
  Nicaragua: 'NIC',
  Níger: 'NER',
  Nigèria: 'NGA',
  Noruega: 'NOR',
  'Nova Zelanda': 'NZL',
  Oman: 'OMN',
  'Països Baixos': 'NLD',
  Pakistan: 'PAK',
  Panamà: 'PAN',
  Paraguai: 'PRY',
  Perú: 'PER',
  Polònia: 'POL',
  Portugal: 'PRT',
  Qatar: 'QAT',
  'Regne Unit': 'GBR',
  'República Dominicana': 'DOM',
  'República Txeca': 'CZE',
  Romania: 'ROU',
  Rússia: 'RUS',
  Senegal: 'SEN',
  Sèrbia: 'SRB',
  Singapur: 'SGP',
  Síria: 'SYR',
  'Sud-àfrica': 'ZAF',
  Suècia: 'SWE',
  Suïssa: 'CHE',
  Tailàndia: 'THA',
  Taiwan: 'TWN',
  Tanzània: 'TZA',
  Tunísia: 'TUN',
  Turquia: 'TUR',
  Ucraïna: 'UKR',
  Uruguai: 'URY',
  Veneçuela: 'VEN',
  Vietnam: 'VNM',
};

export function paisToISO3(nom: string | undefined | null): string | undefined {
  if (!nom) return undefined;
  const val = nom.trim();
  // Si ja ens donen un codi alfa-3, l'acceptem tal qual.
  if (/^[A-Za-z]{3}$/.test(val)) return val.toUpperCase();
  return PAIS_ISO3[val];
}

/** Determina si un país és Espanya (per nom o per codi ESP). */
export function esEspanya(pais: string | undefined | null): boolean {
  if (!pais) return false;
  return paisToISO3(pais) === 'ESP';
}
