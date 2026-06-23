import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, notFound } from '@/lib/http';
import { readEncryptedUpload } from '@/lib/storage';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/documents/:id — descifra y sirve el documento (autorizado + auditado §7)
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const doc = await prisma.documentoPujat.findFirst({ where: { id, deletedAt: null } });
    if (!doc) return notFound();

    let plain: Buffer;
    try {
      plain = await readEncryptedUpload(doc.fitxerPath);
    } catch {
      return notFound();
    }

    await audit({
      usuariId: auth.id,
      accio: 'DESCARREGA',
      entitat: 'documento_pujat',
      entitatId: doc.id,
      detall: { huespedId: doc.huespedId, tipus: doc.tipus },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(plain), {
      headers: {
        'Content-Type': doc.mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.fitxerNom.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/documents/:id — borrado lógico
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const doc = await prisma.documentoPujat.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!doc) return notFound();

    await prisma.documentoPujat.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'documento_pujat',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
