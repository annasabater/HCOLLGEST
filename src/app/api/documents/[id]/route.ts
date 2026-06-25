import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, notFound } from '@/lib/http';
import { readEncryptedUpload } from '@/lib/storage';

async function addWatermark(buf: Buffer, mime: string): Promise<Buffer> {
  if (!mime.startsWith('image/')) return buf;
  const img = sharp(buf);
  const { width = 800, height = 600 } = await img.metadata();
  const fontSize = Math.max(28, Math.round(Math.min(width, height) / 12));
  const svg = `<svg width="${width}" height="${height}">
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      transform="rotate(-30,${width / 2},${height / 2})"
      font-family="sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="rgba(122,31,43,0.28)" letter-spacing="4">HOSTAL COLL</text>
  </svg>`;
  return img
    .composite([{ input: Buffer.from(svg), gravity: 'center' }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

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

    const mime = doc.mime || 'application/octet-stream';
    const served = await addWatermark(plain, mime);
    const servedMime = mime.startsWith('image/') ? 'image/jpeg' : mime;

    return new NextResponse(new Uint8Array(served), {
      headers: {
        'Content-Type': servedMime,
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
