import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, created, handleApiError } from '@/lib/http';
import { saveUpload } from '@/lib/storage';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

// POST /api/uploads (multipart/form-data, campo "file") → { path }
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return badRequest('Cap fitxer');
    if (file.size > MAX_BYTES) return badRequest('El fitxer supera els 10 MB');
    if (file.type && !ALLOWED.has(file.type)) {
      return badRequest('Tipus de fitxer no permès (PDF o imatge)');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = await saveUpload(buffer, file.name || 'fitxer');

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
