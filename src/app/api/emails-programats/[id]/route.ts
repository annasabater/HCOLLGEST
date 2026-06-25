import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/emails-programats/:id — cancel·la (esborra) un email no enviat
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const email = await prisma.emailProgramat.findFirst({ where: { id } });
    if (!email) return notFound();
    if (email.enviatAt) {
      return new Response(JSON.stringify({ error: 'Aquest email ja ha estat enviat' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await prisma.emailProgramat.delete({ where: { id } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'email_programat',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
