import sharp from 'sharp';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, created, handleApiError } from '@/lib/http';
import { saveUpload } from '@/lib/storage';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /api/uploads (multipart/form-data, campo "file") → { path }
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return badRequest('Cap fitxer');
    if (file.size > MAX_BYTES) return badRequest('El fitxer supera els 10 MB');

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name || ''));

    let buffer: Buffer = rawBuffer;
    let name = file.name || 'fitxer';
    if (!isPdf) {
      // Normalitza QUALSEVOL imatge (incloent HEIC de l'iPhone/iPad, que el
      // navegador no sap previsualitzar) a JPEG amb l'orientació EXIF correcta.
      // Si no és una imatge vàlida, sharp llança i rebutgem el fitxer.
      try {
        buffer = await sharp(rawBuffer)
          .rotate()
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
        name = name.replace(/\.[^./\\]+$/, '') + '.jpg';
      } catch {
        return badRequest('Tipus de fitxer no permès (PDF o imatge)');
      }
    }

    const path = await saveUpload(buffer, name);

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'fitxer',
      detall: { path, mida: file.size },
      ip: clientIp(req),
    });

    return created({ path });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
