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
  try {
    const img = sharp(buf);
    const { width = 800, height = 600 } = await img.metadata();
    const targetH = Math.max(40, Math.round(Math.min(width, height) / 8));

    // Text natiu de sharp (Pango/libvips) — no depèn de fonts del sistema ni librsvg
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textImg = await (sharp as any)({ text: { text: 'HOSTAL COLL', rgba: true, dpi: 144 } })
      .resize(null, targetH, { fit: 'inside' })
      .png()
      .toBuffer() as Buffer;

    // Reduïm l'opacitat manipulant el canal alpha directament
    const { data, info } = await sharp(textImg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) data[i] = Math.round((data[i] ?? 255) * 0.45);
    const dimmed = await sharp(data, { raw: { width: info.width!, height: info.height!, channels: 4 } })
      .rotate(-30, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return await img
      .composite([{ input: dimmed, gravity: 'center' }])
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err) {
    console.error('[watermark error]', err);
    return buf;
  }
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
