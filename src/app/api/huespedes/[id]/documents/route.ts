import type { TipusDocumentPujat } from '@prisma/client';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, created, handleApiError } from '@/lib/http';
import { saveEncryptedUpload } from '@/lib/storage';
import { tipusDocumentPujatValues } from '@/lib/validation/enums';

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

// POST /api/huespedes/:id/documents (multipart: file + tipus) — guarda CIFRADO
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const huesped = await prisma.huesped.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!huesped) return badRequest('Hoste no trobat');

    const form = await req.formData();
    const file = form.get('file');
    const tipusRaw = String(form.get('tipus') ?? '');
    if (!(file instanceof File)) return badRequest('Cap fitxer');
    if (file.size > MAX_BYTES) return badRequest('El fitxer supera els 10 MB');
    if (file.type && !ALLOWED.has(file.type)) {
      return badRequest('Tipus de fitxer no permès (PDF o imatge)');
    }
    if (!(tipusDocumentPujatValues as readonly string[]).includes(tipusRaw)) {
      return badRequest('Tipus de document no vàlid');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fitxerPath = await saveEncryptedUpload(buffer, file.name || 'document');

    const document = await prisma.documentoPujat.create({
      data: {
        huespedId: id,
        tipus: tipusRaw as TipusDocumentPujat,
        fitxerNom: file.name || 'document',
        fitxerPath,
        mime: file.type || 'application/octet-stream',
        usuariId: auth.id,
      },
      select: { id: true, tipus: true, fitxerNom: true, mime: true, dataSubida: true },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'documento_pujat',
      entitatId: document.id,
      detall: { huespedId: id, tipus: tipusRaw }, // ⚠ sense contingut del document
      ip: clientIp(req),
    });

    return created({ document });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
