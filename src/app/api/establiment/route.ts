import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { encryptString } from '@/lib/crypto';

const ESTABLIMENT_ID = 'hostal-coll';

export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const e = await prisma.establiment.findUniqueOrThrow({ where: { id: ESTABLIMENT_ID } });
    // Mai retornar secrets (contrasenya de Mossos ni el token de Drive).
    const { mossosPassEnc, driveRefreshTokenEnc, ...safe } = e;
    void mossosPassEnc;
    void driveRefreshTokenEnc;
    return ok({
      establiment: {
        ...safe,
        mossosPassConfigurada: Boolean(e.mossosPassEnc),
        driveConnectada: Boolean(e.driveRefreshTokenEnc),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const PatchSchema = z.object({
  fileIdentifier: z
    .string()
    .regex(/^[A-Za-z0-9]{9,10}$/, 'Ha de tenir 9-10 caràcters alfanumèrics (§9.2)')
    .or(z.literal(''))
    .optional(),
  encoding: z.enum(['latin1', 'utf-8']).optional(),
  teInternetDefault: z.boolean().optional(),
  benvingudaAutomatica: z.boolean().optional(),
  benvingudaTothom: z.boolean().optional(),
  ieetImportPersonaNit: z.coerce.number().min(0).optional(),
  retencioPolicialAnys: z.coerce.number().int().min(1).optional(),
  retencioCrmAnys: z.coerce.number().int().min(1).optional(),
  mossosUser: z.string().optional(),
  mossosPass: z.string().optional(), // se cifra antes de guardar
  // Dades per a la factura impresa (cadena buida = esborrar → null).
  raoSocial: z.string().optional(),
  adreca: z.string().optional(),
  codiPostal: z.string().optional(),
  poblacio: z.string().optional(),
  telefon: z.string().optional(),
  iban: z.string().optional(),
  descriptor: z.string().optional(),
  facturaTitular: z.string().optional(),
  facturaNif: z.string().optional(),
  // Tarifes de neteja.
  preuNetejaSortida: z.coerce.number().min(0).optional(),
  preuNetejaManteniment: z.coerce.number().min(0).optional(),
  preuNetejaZones: z.coerce.number().min(0).optional(),
  // Saldo inicial de tresoreria (balanç de situació).
  saldoInicialTresoreria: z.coerce.number().min(0).optional(),
});

// Camps de text de la factura que, si arriben buits, es desen com a null.
const CAMPS_FACTURA = [
  'raoSocial',
  'adreca',
  'codiPostal',
  'poblacio',
  'telefon',
  'iban',
  'descriptor',
  'facturaTitular',
  'facturaNif',
] as const;

export async function PATCH(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const input = PatchSchema.parse(body);

    const { mossosPass, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (rest.fileIdentifier === '') data.fileIdentifier = null;
    for (const k of CAMPS_FACTURA) {
      if (data[k] === '') data[k] = null;
    }
    if (mossosPass) data.mossosPassEnc = encryptString(mossosPass);

    const establiment = await prisma.establiment.update({ where: { id: ESTABLIMENT_ID }, data });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'establiment',
      entitatId: ESTABLIMENT_ID,
      detall: { camps: Object.keys(data).filter((k) => k !== 'mossosPassEnc') },
      ip: clientIp(req),
    });

    const { mossosPassEnc, ...safe } = establiment;
    void mossosPassEnc;
    return ok({ establiment: safe });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
