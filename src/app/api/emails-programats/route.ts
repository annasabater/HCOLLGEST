import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { buildGraciesEmail, buildBenvingudaEmail, type LangEmail } from '@/lib/email-templates';

const LangEnum = z.enum(['ca', 'es', 'en', 'fr']);

const ProgramarSchema = z.object({
  estanciaId: z.string().min(1),
  tipus: z.enum(['gracies', 'benvinguda']),
  a: z.string().email('Correu no vàlid'),
  nomDestinatari: z.string().min(1),
  lang: LangEnum,
  programatPer: z.coerce.date(),
  // Per a gràcies: enllaç de ressenya Google
  enlacRessenya: z.string().url().optional(),
  // Per a benvinguda: nom de l'habitació
  habitacio: z.string().optional(),
});

// GET /api/emails-programats?estanciaId=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const estanciaId = new URL(req.url).searchParams.get('estanciaId');
  if (!estanciaId) return ok({ emails: [] });

  const emails = await prisma.emailProgramat.findMany({
    where: { estanciaId },
    orderBy: { programatPer: 'asc' },
  });
  return ok({ emails });
}

// POST /api/emails-programats — programa un email per enviar-lo en un moment futur
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const input = ProgramarSchema.parse(body);
    const lang = input.lang as LangEmail;

    let asumpte: string;
    let cos: string;

    if (input.tipus === 'gracies') {
      const { asumpte: a, html } = buildGraciesEmail(lang, {
        nom: input.nomDestinatari,
        enlacRessenya: input.enlacRessenya ?? 'https://g.page/r/CRX-Sb9SNVzJEBM/review',
      });
      asumpte = a;
      cos = html;
    } else {
      const { asumpte: a, html } = buildBenvingudaEmail(lang, {
        nom: input.nomDestinatari,
        habitacio: input.habitacio ?? '',
      });
      asumpte = a;
      cos = html;
    }

    const email = await prisma.emailProgramat.create({
      data: {
        estanciaId: input.estanciaId,
        tipus: input.tipus,
        a: input.a,
        nomDestinatari: input.nomDestinatari,
        asumpte,
        cos,
        programatPer: input.programatPer,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'email_programat',
      entitatId: email.id,
      detall: { tipus: input.tipus, a: input.a, programatPer: input.programatPer },
      ip: clientIp(req),
    });

    return created({ email });
  } catch (err) {
    return handleApiError(err);
  }
}
