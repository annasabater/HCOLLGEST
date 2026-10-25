import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError } from '@/lib/http';
import { proximNumeroPressupost, calculaTotalsPressupost } from '@/lib/services/pressupost';
import { PressupostCalculSchema } from '@/lib/validation/pressupost';

// POST /api/pressupostos — crea un pressupost nou amb el següent número i una
// línia buida, i el compte per defecte (IBAN de l'establiment). Retorna l'id.
// Opcionalment s'enllaça a una estada (?estanciaId o body.estanciaId): en aquest
// cas prefilla les dades del client amb les del titular de l'estada.
// Des de la calculadora de preus, el body porta també { linies, ivaPercent, notes }.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const body = await req.json().catch(() => null);
    const estanciaId =
      url.searchParams.get('estanciaId') ||
      (body && typeof body === 'object' && typeof body.estanciaId === 'string' ? body.estanciaId : null) ||
      null;

    // Si ve d'una estada, agafem el titular per prefillar el client.
    let clientNom: string | null = null;
    let clientNif: string | null = null;
    let clientAdreca: string | null = null;
    let clientLocalitat: string | null = null;
    let estanciaOk: string | null = null;
    if (estanciaId) {
      const est = await prisma.estancia.findFirst({
        where: { id: estanciaId, deletedAt: null },
        include: { viatgers: { where: { esTitular: true }, include: { huesped: true }, take: 1 } },
      });
      if (est) {
        estanciaOk = est.id;
        const h = est.viatgers[0]?.huesped ?? null;
        if (h) {
          clientNom = [h.nom, h.cognom1, h.cognom2].filter(Boolean).join(' ') || null;
          clientNif = h.numDocument ? `${h.tipusDocument ?? 'DNI'} ${h.numDocument}` : null;
          clientAdreca = h.adreca ?? null;
          clientLocalitat = [h.codiPostal, h.municipi || h.localitat].filter(Boolean).join(' ') || null;
        }
      }
    }

    // Des de la calculadora de preus: ja ve amb línies, IVA i notes.
    const calcul = PressupostCalculSchema.safeParse(body);
    const linies = calcul.success && calcul.data.linies.length ? calcul.data.linies : [{ descripcio: '', import: 0 }];
    const ivaPercent = calcul.success ? calcul.data.ivaPercent : 21;
    const totals = calculaTotalsPressupost(linies, ivaPercent);

    const numero = await proximNumeroPressupost(prisma);
    const est = await prisma.establiment.findFirst({ select: { iban: true } });
    const p = await prisma.pressupost.create({
      data: {
        numero,
        estanciaId: estanciaOk,
        clientNom,
        clientNif,
        clientAdreca,
        clientLocalitat,
        compte: est?.iban ?? null,
        notes: calcul.success ? calcul.data.notes || null : null,
        ivaPercent,
        ...totals,
        linies: { create: linies },
      },
    });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'pressupost', entitatId: p.id, ip: clientIp(req) });
    return created({ id: p.id, numero: p.numero });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
