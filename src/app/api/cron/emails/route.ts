import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { handleApiError, ok } from '@/lib/http';

/**
 * GET /api/cron/emails — envia els emails programats pendents (programatPer ≤ ara).
 * Executat automàticament cada hora pel cron de Vercel, o manualment per un ADMIN.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronOk = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!cronOk) {
      const auth = await authorize(ROLES_ADMIN);
      if (auth instanceof Response) return auth;
    }

    const pendents = await prisma.emailProgramat.findMany({
      where: {
        enviatAt: null,
        programatPer: { lte: new Date() },
      },
      orderBy: { programatPer: 'asc' },
      take: 50,
    });

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const e of pendents) {
      const res = await sendEmail({ to: e.a, subject: e.asumpte, html: e.cos });
      await prisma.emailProgramat.update({
        where: { id: e.id },
        data: res.ok
          ? { enviatAt: new Date() }
          : { errorMsg: res.error ?? 'Error desconegut' },
      });
      results.push({ id: e.id, ok: res.ok, error: res.error });
    }

    return ok({ processed: results.length, results });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
