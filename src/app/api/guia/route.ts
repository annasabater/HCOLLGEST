import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { buildGuiaPdf } from '@/lib/pdf/guia';

// GET /api/guia — guia d'ús de l'aplicació en PDF (qualsevol usuari autenticat)
export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const pdf = await buildGuiaPdf();
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="guia-us-hostal-coll.pdf"',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
