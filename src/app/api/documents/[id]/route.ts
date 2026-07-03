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
    const w = Math.max(1, width);
    const h = Math.max(1, height);

    // Marca d'aigua REPETIDA i ben visible en tota la imatge ("HOSTAL COLL"),
    // en negre amb un contorn blanc perquè es llegeixi tant sobre zones clares
    // com fosques del document.
    const fontSize = Math.max(18, Math.round(w / 16));
    const stepX = Math.max(200, Math.round(w / 1.9));
    const stepY = Math.max(110, Math.round(h / 5));
    let tiles = '';
    for (let y = stepY; y < h + stepY; y += stepY) {
      for (let x = -Math.round(w * 0.2); x < w; x += stepX) {
        tiles +=
          `<text x="${x}" y="${y}" transform="rotate(-30 ${x} ${y})" ` +
          `font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${fontSize}" ` +
          `fill="#000000" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1">HOSTAL COLL</text>`;
      }
    }
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${tiles}</svg>`,
    );

    return await img
      .grayscale()
      .composite([{ input: svg, gravity: 'northwest' }])
      .jpeg({ quality: 88 })
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
