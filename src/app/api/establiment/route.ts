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
    // Nunca devolver la contraseña cifrada de Mossos.
    const { mossosPassEnc, ...safe } = e;
    void mossosPassEnc;
    return ok({ establiment: { ...safe, mossosPassConfigurada: Boolean(e.mossosPassEnc) } });
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
  ieetImportPersonaNit: z.coerce.number().min(0).optional(),
  retencioPolicialAnys: z.coerce.number().int().min(1).optional(),
  retencioCrmAnys: z.coerce.number().int().min(1).optional(),
  mossosUser: z.string().optional(),
  mossosPass: z.string().optional(), // se cifra antes de guardar
});

export async function PATCH(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const input = PatchSchema.parse(body);

    const { mossosPass, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (rest.fileIdentifier === '') data.fileIdentifier = null;
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
