import { NextResponse } from 'next/server';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError } from '@/lib/http';
import { getImpostosAny } from '@/lib/services/impostos';
import { formulariOmplert, type ModelFormulari } from '@/lib/pdf/formulari-aeat';

const MODELS: ModelFormulari[] = ['303', '130', '390'];

// GET /api/impostos/formulari?model=303&any=2026&periode=3 — formulari OFICIAL de
// l'AEAT (annex del BOE) amb les caselles omplertes: les presentades si n'hi ha,
// si no, les calculades del llibre d'IVA.
export async function GET(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const sp = new URL(req.url).searchParams;
    const model = sp.get('model') as ModelFormulari | null;
    const any = Number(sp.get('any'));
    const periode = Number(sp.get('periode') ?? 0);
    if (!model || !MODELS.includes(model)) return badRequest('Model no vàlid (303, 130 o 390)');
    if (!Number.isInteger(any) || any < 2020 || any > 2100) return badRequest('Any no vàlid');
    if (model === '390' ? periode !== 0 : !(periode >= 1 && periode <= 4)) return badRequest('Període no vàlid');

    const d = await getImpostosAny(any);
    const m = model === '390' ? d.anual['390'] : d.trimestres[periode - 1]!.models[model];
    const caselles = m.presentada?.caselles ?? m.calculades;
    const pdf = await formulariOmplert({
      model, any, periode, caselles, titular: d.titular,
      activitat: model === '390' ? { descripcio: 'SERVEI D’HOSTATGE EN HOSTALS I PENSIONS', clau: 'A03', epigraf: '682' } : undefined,
      marca347: model === '390' && d.anual['347'].obligat,
    });
    await audit({ usuariId: auth.id, accio: 'DESCARREGA', entitat: 'formulari_aeat', detall: { model, any, periode }, ip: clientIp(req) });
    const nom = `Model ${model} ${any}${periode ? ` ${periode}T` : ''}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="model-${model}-${any}${periode ? `-${periode}T` : ''}.pdf"; filename*=UTF-8''${encodeURIComponent(nom)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
