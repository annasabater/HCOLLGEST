import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { badRequest, handleApiError, notFound } from '@/lib/http';
import { readUpload } from '@/lib/storage';

// GET /api/impostos/justificant?model=303&any=2026&periode=3
// PDF del justificant de presentació de l'AEAT (declaracions presentades des de l'app).
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const q = new URL(req.url).searchParams;
    const model = q.get('model') ?? '';
    const any = Number(q.get('any'));
    const periode = Number(q.get('periode'));
    if (!model || !Number.isInteger(any) || !Number.isInteger(periode)) return badRequest('Paràmetres no vàlids');
    const d = await prisma.declaracioFiscal.findUnique({ where: { model_any_periode: { model, any, periode } } });
    if (!d?.justificantPdf) return notFound();
    const pdf = await readUpload(d.justificantPdf);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${model}_${any}_${periode}T_justificant.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
