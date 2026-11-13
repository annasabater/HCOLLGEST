import { handleApiError, ok, serverError } from '@/lib/http';
import { enviaRecordatorisAHora } from '@/lib/services/resum-whatsapp';

export const maxDuration = 60;

/**
 * GET /api/cron/recordatoris-hora — avisa dels recordatoris amb hora pròpia quan
 * n'és l'hora. Vercel Hobby només permet un cron al dia, així que el crida cada
 * 10 minuts un GitHub Action (`.github/workflows/recordatoris-hora.yml`) amb
 * `Authorization: Bearer CRON_HORA_SECRET` (o CRON_SECRET).
 */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization');
    const secrets = [process.env.CRON_HORA_SECRET, process.env.CRON_SECRET].filter((s): s is string => !!s);
    if (!secrets.some((s) => auth === `Bearer ${s}`)) {
      return new Response(JSON.stringify({ error: 'No autoritzat' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    try {
      return ok(await enviaRecordatorisAHora());
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'No s’han pogut enviar els recordatoris');
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
