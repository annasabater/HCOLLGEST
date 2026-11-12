/**
 * Resum diari per WhatsApp (cap a les 9:00, hora de Madrid): els recordatoris que
 * toquen avui, les sortides d'avui i demà, els cobraments a punt (com el pop-up
 * del panell) i les opinions noves de les últimes 24 h. Si no hi ha res, no envia.
 */
import 'server-only';
import { prisma } from '../db';
import { decryptString } from '../crypto';
import { enviaWhatsapp, normalitzaTelefon, parseDestinataris, type Destinatari } from '../whatsapp';
import {
  diaMadrid,
  horaMadrid,
  resumBuit,
  sumaDies,
  textResum,
  tocaWhatsapp,
  type ResumDiari,
} from '../recordatoris';

const HORA_RESUM = 9;
const aData = (d: string) => new Date(`${d}T00:00:00Z`);
const deData = (d: Date) => d.toISOString().slice(0, 10);
const urlBase = () => process.env.NEXT_PUBLIC_APP_URL || 'https://gestio.hostalcoll.com';

type Titular = { viatgers: { huesped: { nom: string; cognom1: string } | null }[]; numContracte?: string | null };
const nomTitular = (e: Titular) => {
  const h = e.viatgers[0]?.huesped;
  return h ? `${h.nom} ${h.cognom1}`.trim() : e.numContracte ? `Contracte ${e.numContracte}` : 'Sense titular';
};
const titularSel = {
  numContracte: true,
  viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } },
} as const;

export async function construeixResum(dia: string): Promise<ResumDiari> {
  const ahir = new Date(Date.now() - 24 * 3_600_000);
  const [recs, cobs, sortides, ressenyes, valoracions] = await Promise.all([
    prisma.recordatori.findMany({
      where: { deletedAt: null, fetAt: null, whatsapp: true, data: { lte: aData(sumaDies(dia, 366)) } },
      orderBy: { data: 'asc' },
    }),
    // Igual que el pop-up: avui, demà i demà passat.
    prisma.pagamentPrevist.findMany({
      where: { pagat: false, dataPrevista: { gte: aData(dia), lt: aData(sumaDies(dia, 3)) }, estancia: { deletedAt: null } },
      orderBy: { dataPrevista: 'asc' },
      take: 30,
      select: { import: true, dataPrevista: true, concepte: true, estancia: { select: titularSel } },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataSortida: { gte: aData(dia), lt: aData(sumaDies(dia, 2)) } },
      orderBy: { dataSortida: 'asc' },
      take: 30,
      select: { dataSortida: true, habitacio: { select: { nom: true } }, ...titularSel },
    }),
    prisma.ressenya.findMany({
      where: { estat: 'PENDENT', font: { not: 'MANUAL' }, createdAt: { gte: ahir } },
      select: { autor: true, puntuacio: true },
      take: 10,
    }),
    prisma.valoracio.findMany({
      where: { vista: false, createdAt: { gte: ahir } },
      select: { nom: true, habitacio: true, puntuacio: true },
      take: 10,
    }),
  ]);

  return {
    dia,
    recordatoris: recs
      .filter((r) =>
        tocaWhatsapp(
          { data: deData(r.data), diesAbans: r.diesAbans, whatsapp: r.whatsapp, ajornatFins: r.ajornatFins ? deData(r.ajornatFins) : null, fet: false },
          dia,
        ),
      )
      .map((r) => ({ titol: r.titol, data: deData(r.data), notes: r.notes })),
    cobraments: cobs.map((c) => ({
      titular: nomTitular(c.estancia),
      import: Number(c.import),
      data: deData(c.dataPrevista),
      concepte: c.concepte,
    })),
    sortides: sortides
      .filter((e) => e.dataSortida)
      .map((e) => ({ titular: nomTitular(e), habitacio: e.habitacio?.nom ?? null, data: deData(e.dataSortida!) })),
    opinions: [
      ...ressenyes.map((r) => ({ autor: r.autor, puntuacio: r.puntuacio, tipus: 'GOOGLE' as const })),
      ...valoracions.map((v) => ({
        autor: v.nom || (v.habitacio ? `Hoste de l’habitació ${v.habitacio}` : 'Hoste'),
        puntuacio: v.puntuacio,
        tipus: 'VALORACIO' as const,
      })),
    ],
  };
}

async function credencials() {
  const est = await prisma.establiment.findFirst({
    select: { id: true, whatsappActiu: true, whatsappDestinataris: true, whatsappResumDia: true },
  });
  if (!est) throw new Error('No hi ha establiment configurat.');
  return { ...est, destinataris: parseDestinataris(est.whatsappDestinataris) };
}

const finalTel = (tel: string) => `…${tel.slice(-3)}`;

/** Envia el mateix text a cada destinatari actiu; retorna quants han rebut. Errors junts. */
async function enviaATots(dest: Destinatari[], text: string): Promise<{ ok: number; errors: string[] }> {
  let ok = 0;
  const errors: string[] = [];
  for (const d of dest) {
    if (!d.apikeyEnc) {
      errors.push(`${finalTel(d.telefon)}: falta la clau`);
      continue;
    }
    try {
      await enviaWhatsapp(d.telefon, decryptString(d.apikeyEnc), text);
      ok++;
    } catch (err) {
      errors.push(`${finalTel(d.telefon)}: ${err instanceof Error ? err.message : 'error'}`);
    }
  }
  return { ok, errors };
}

export type ResultatResum = { enviat: boolean; motiu?: string; elements?: number };

/**
 * L'invoca el cron del matí: envia un sol cop al dia, a partir de les 9:00 de
 * Madrid. `forcar` = botó «Envia el resum ara».
 */
export async function enviaResumDiari({ forcar = false }: { forcar?: boolean } = {}): Promise<ResultatResum> {
  const now = new Date();
  const dia = diaMadrid(now);
  const est = await credencials();
  const actius = est.destinataris.filter((d) => d.actiu);
  if (actius.length === 0) return { enviat: false, motiu: 'Cap número té el resum activat' };
  if (!forcar && horaMadrid(now) < HORA_RESUM) return { enviat: false, motiu: 'Encara no són les 9' };
  if (!forcar && est.whatsappResumDia === dia) return { enviat: false, motiu: 'Ja enviat avui' };

  const resum = await construeixResum(dia);
  const elements = resum.recordatoris.length + resum.cobraments.length + resum.sortides.length + resum.opinions.length;
  if (resumBuit(resum)) {
    await prisma.establiment.update({ where: { id: est.id }, data: { whatsappResumDia: dia, whatsappError: null } });
    return { enviat: false, motiu: 'Avui no hi ha res a dir', elements: 0 };
  }
  const { ok, errors } = await enviaATots(actius, textResum(resum, urlBase()));
  const error = errors.length ? errors.join(' · ') : null;
  // Si n'ha arribat almenys un, el dia queda fet (no es reenvia als que ja l'han rebut).
  await prisma.establiment.update({
    where: { id: est.id },
    data: { whatsappError: error, ...(ok > 0 ? { whatsappResumDia: dia } : {}) },
  });
  if (ok === 0) throw new Error(error ?? 'No s’ha pogut enviar');
  return { enviat: true, elements, ...(error ? { motiu: `Error en algun número: ${error}` } : {}) };
}

/** Missatge de prova a un número concret des de Configuració. */
export async function enviaProvaWhatsapp(telefon: string): Promise<void> {
  const est = await credencials();
  const tel = normalitzaTelefon(telefon);
  const d = est.destinataris.find((x) => x.telefon === tel);
  if (!d?.apikeyEnc) throw new Error('Desa primer aquest número amb la seva clau de CallMeBot.');
  const { errors } = await enviaATots([d], '*Hostal Coll*\nProva feta: a partir d’ara t’arribaran aquí els avisos del matí.');
  await prisma.establiment.update({ where: { id: est.id }, data: { whatsappError: errors[0] ?? null } });
  if (errors.length) throw new Error(errors[0]);
}
