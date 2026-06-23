/**
 * Esquema maestro del registro (estancia + viajeros) con la LÓGICA CONDICIONAL
 * oficial (§2.3 / §4 del modelo de datos). Compartido cliente/servidor.
 *
 * La obligatoriedad cambia radicalmente entre RESERVA y CONTRACTE_EN_CURS, y
 * dentro de éste según tipo de documento, país y si el viajero es menor.
 */
import { z } from 'zod';
import {
  TipusRegistreEnum,
  TipusDocumentEnum,
  SexeEnum,
  TipusPagamentEnum,
  ParentescEnum,
  midaAnimalValues,
  metodeCobramentValues,
} from './enums';
import { endOfToday, isMenor } from '../dates';

/** Texto opcional: '' → undefined. */
const optStr = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().optional(),
);

/** Fecha opcional: '' / null → undefined; string ISO → Date. */
const optDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
);

// preprocess para que el tipo de ENTRADA acepte string|Date (z.coerce.date()
// por sí solo tipa la entrada como Date). La salida sigue siendo Date.
const reqDate = z.preprocess((v) => v, z.coerce.date());

const optEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().email('Correu no vàlid').optional(),
);

// ----------------------------------------------------------------------------
// Sub-esquemas (laxos; las obligaciones se aplican en superRefine)
// ----------------------------------------------------------------------------

export const ViatgerInputSchema = z.object({
  huespedId: optStr, // dedup CRM (Fase 2): si viene, se reutiliza la ficha
  nom: z.string().trim().min(1, 'El nom és obligatori'),
  cognom1: z.string().trim().min(1, 'El primer cognom és obligatori'),
  cognom2: optStr,
  sexe: SexeEnum.optional(),
  dataNaixement: optDate,
  nacionalitat: optStr,
  tipusDocument: TipusDocumentEnum.optional(),
  numDocument: optStr,
  numSuport: optStr,
  dataExpedicio: optDate,
  email: optEmail,
  telefon: optStr,
  adreca: optStr,
  pais: optStr,
  provincia: optStr,
  municipi: optStr,
  localitat: optStr,
  codiPostal: optStr,
  esTitular: z.boolean().default(false),
  parentesc: ParentescEnum.optional(),
  esMenor: z.boolean().default(false),
});

/** Mascota opcional vinculada a l'estada (s'associa al titular). */
export const MascotaInputSchema = z.object({
  nom: z.string().trim().min(1, 'Cal un nom'),
  especie: z.string().trim().min(1, 'Cal l’espècie'),
  mida: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(midaAnimalValues).optional(),
  ),
});

/**
 * Cobrament opcional indicat ja en el moment del registre. Permet partir el preu
 * en diversos mètodes (p. ex. una part en EFECTIU i una altra per TRANSFERENCIA).
 * En desar, es genera un rebut amb aquests cobraments.
 */
export const PagamentInputSchema = z.object({
  metode: z.enum(metodeCobramentValues),
  import: z.coerce.number().positive('L’import ha de ser positiu'),
});

export const EstanciaInputSchema = z.object({
  tipusRegistre: TipusRegistreEnum,
  numContracte: z.string().trim().min(1, 'El número de contracte és obligatori'),
  anyContracte: z.coerce.number().int().min(2000).max(2100),
  dataFormalitzacio: reqDate,
  dataEntrada: reqDate,
  dataSortida: reqDate,
  numViatgers: z.coerce.number().int().min(1, 'Mínim 1 viatger'),
  tipusPagament: TipusPagamentEnum,
  numHabitacions: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
  habitacioId: optStr,
  teInternet: z.boolean().optional(),
  observacions: optStr,
});

/**
 * Construye el esquema del registro. Con `borrany = true` (esborrany) se omite la
 * obligatoriedad condicional §2.3 de cada viajero: el registro se puede guardar
 * incompleto y se completa más tarde. La validación §2.3 completa se aplica igual
 * al GENERAR el fitxer de Mossos (`validaParte`), que es la verdadera puerta legal.
 *
 * Nota: província i municipi NO son obligatorios ni en el modo estricto (se piden
 * solo al subir a Mossos); el resto de §2.3 sí, salvo en esborrany.
 */
function buildRegistreSchema(borrany: boolean) {
  return z
    .object({
      estancia: EstanciaInputSchema,
      viatgers: z.array(ViatgerInputSchema).min(1, 'Cal almenys un viatger'),
      mascotes: z.array(MascotaInputSchema).optional(),
      pagaments: z.array(PagamentInputSchema).optional(),
    })
    .superRefine((data, ctx) => {
      const { estancia, viatgers } = data;
      const today = endOfToday();

      // --- Fechas de la estancia (sanity, siempre) ---
      if (estancia.dataFormalitzacio > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['estancia', 'dataFormalitzacio'],
          message: 'La data de formalització no pot ser futura',
        });
      }
      if (estancia.dataSortida <= estancia.dataEntrada) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['estancia', 'dataSortida'],
          message: 'La data de sortida ha de ser posterior a l’entrada',
        });
      }

      // --- Al menos un titular (siempre) ---
      if (!viatgers.some((v) => v.esTitular)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['viatgers'],
          message: 'Cal marcar un viatger com a titular',
        });
      }

      // Esborrany: se guarda con datos incompletos. La obligatoriedad §2.3 se
      // comprueba al subir a Mossos, no al guardar.
      if (borrany) return;

      const esReserva = estancia.tipusRegistre === 'RESERVA';

      viatgers.forEach((v, i) => {
        const at = (field: string, message: string) =>
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['viatgers', i, field], message });

        if (esReserva) {
          // RESERVA: solo nom, cognom1 y (email o telèfon)
          if (!v.email && !v.telefon) {
            at('email', 'En reserva cal email o telèfon');
          }
          return;
        }

        // CONTRACTE EN CURS
        const menor = v.esMenor || isMenor(v.dataNaixement, estancia.dataEntrada);

        if (!menor) {
          if (!v.tipusDocument) at('tipusDocument', 'Tipus de document obligatori');
          if (!v.numDocument) at('numDocument', 'Número de document obligatori');
        }
        if (v.tipusDocument === 'DNI_NIF' || v.tipusDocument === 'NIE') {
          if (!v.numSuport) at('numSuport', 'Número de suport obligatori (DNI/NIE)');
        }
        if (v.tipusDocument === 'DNI_NIF' && !v.cognom2) {
          at('cognom2', 'El segon cognom és obligatori amb DNI/NIF');
        }
        if (menor && !v.parentesc) {
          at('parentesc', 'Parentesc obligatori per a menors');
        }
        if (v.dataNaixement && v.dataNaixement > today) {
          at('dataNaixement', 'La data de naixement no pot ser futura');
        }
        if (v.dataExpedicio && v.dataExpedicio > today) {
          at('dataExpedicio', 'La data d’expedició no pot ser futura');
        }
        if (!v.adreca) at('adreca', 'Adreça obligatòria (contracte en curs)');
        if (!v.codiPostal) at('codiPostal', 'Codi postal obligatori');
        // Província i municipi: opcionals en desar (es validen en pujar a Mossos).
        if (v.pais && v.pais.toLowerCase() !== 'espanya' && !v.localitat) {
          at('localitat', 'Localitat obligatòria (país estranger)');
        }
      });
    });
}

/** Validación estricta para "Desar estada" (todo §2.3 salvo província/municipi). */
export const RegistreSchema = buildRegistreSchema(false);
/** Validación laxa para "Desar com a esborrany": permite guardar incompleto. */
export const RegistreEsborranySchema = buildRegistreSchema(true);

export type RegistreInput = z.input<typeof RegistreSchema>;
export type RegistreParsed = z.output<typeof RegistreSchema>;
export type ViatgerInput = z.input<typeof ViatgerInputSchema>;
export type MascotaInput = z.input<typeof MascotaInputSchema>;
export type PagamentInput = z.input<typeof PagamentInputSchema>;

// Ampliació d'una estada (1.1, 1.2…): noves dates per al període ampliat.
export const AmpliacioSchema = z
  .object({ dataEntrada: reqDate, dataSortida: reqDate })
  .superRefine((d, ctx) => {
    if (d.dataSortida <= d.dataEntrada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataSortida'],
        message: 'La data de sortida ha de ser posterior a l’entrada',
      });
    }
  });
export type AmpliacioInput = z.input<typeof AmpliacioSchema>;
