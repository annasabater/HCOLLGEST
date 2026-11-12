/**
 * Sincronització de ressenyes de Google → gestio (cron nocturn + botó).
 *  - Les noves entren PENDENTS (mai es publiquen soles: ho decideix l'Anna a
 *    /ressenyes) i es tradueixen a es/ca/en/fr.
 *  - Si és una de les 13 importades de la web (mateix autor i estrelles), s'hi
 *    enllaça (id de Google + data exacta) en lloc de duplicar-la; conserva estat,
 *    ordre i traduccions.
 *  - Si l'autor l'edita a Google, s'actualitza el text i es torna a traduir.
 *  - Si desapareix de Google (l'ha esborrada l'autor o Google), s'amaga de la web.
 *  - La nota mitjana i el total de la fitxa s'actualitzen sols.
 */
import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto';
import { getAccessToken } from '@/lib/drive';
import { llistaRessenyes, trobaUbicacio } from '@/lib/google-business';
import { aparellaAmbWeb, puntuacioGoogle, textOriginal } from '@/lib/google-ressenyes';
import { traduirRessenya } from './traduccio-ressenya';
import { avisAlMoment } from '@/lib/push';

export interface ResultatSync {
  llegides: number;
  noves: number;
  enllacades: number;
  actualitzades: number;
  amagades: number;
  traduides: number;
}

/** Temps màxim per traduir dins d'una execució (la resta, la nit següent o amb «Tradueix»). */
const PRESSUPOST_TRADUCCIO_MS = 200_000;

export async function sincronitzaRessenyesGoogle(): Promise<ResultatSync> {
  const est = await prisma.establiment.findFirst({
    select: { id: true, googleBusinessTokenEnc: true, googleBusinessLocation: true },
  });
  if (!est?.googleBusinessTokenEnc) {
    throw new Error('Google no està connectat (botó «Connecta amb Google» a /ressenyes).');
  }

  try {
    const token = await getAccessToken(decryptString(est.googleBusinessTokenEnc));
    // Si en connectar encara no es podia llegir la fitxa (API pendent d'aprovació), es busca ara.
    let location = est.googleBusinessLocation;
    if (!location) {
      location = (await trobaUbicacio(token)).location;
      await prisma.establiment.update({ where: { id: est.id }, data: { googleBusinessLocation: location } });
    }
    const { reviews, averageRating, totalReviewCount } = await llistaRessenyes(token, location);

    const existents = await prisma.ressenya.findMany({
      select: { id: true, googleId: true, font: true, autor: true, puntuacio: true, text: true, resposta: true, estat: true },
    });
    const perGoogleId = new Map(existents.filter((e) => e.googleId).map((e) => [e.googleId as string, e]));
    // Les 13 de la web encara sense enllaçar (googleId "web-rN").
    const webLliures = existents
      .filter((e) => e.font === 'WEB' && e.googleId?.startsWith('web-'))
      .map((e) => ({ id: e.id, autor: e.autor, puntuacio: e.puntuacio }));

    const res: ResultatSync = { llegides: reviews.length, noves: 0, enllacades: 0, actualitzades: 0, amagades: 0, traduides: 0 };
    const perTraduir: string[] = [];
    const vistes = new Set<string>();

    for (const g of reviews) {
      const puntuacio = puntuacioGoogle(g.starRating);
      if (!g.reviewId || !puntuacio) continue;
      vistes.add(g.reviewId);
      const anonim = g.reviewer?.isAnonymous || !g.reviewer?.displayName;
      const autor = anonim ? 'Usuari de Google' : (g.reviewer?.displayName ?? '').trim().slice(0, 80);
      const text = textOriginal(g.comment);
      const resposta = g.reviewReply?.comment?.trim() || null;
      const data = g.createTime ? new Date(g.createTime) : new Date();

      const ja = perGoogleId.get(g.reviewId);
      if (ja) {
        const textCanviat = (ja.text ?? null) !== text;
        if (textCanviat || ja.puntuacio !== puntuacio || (ja.resposta ?? null) !== resposta) {
          await prisma.ressenya.update({
            where: { id: ja.id },
            // Text editat per l'autor: les traduccions velles ja no valen.
            data: { puntuacio, text, resposta, ...(textCanviat ? { traduccions: Prisma.DbNull, idioma: null } : {}) },
          });
          if (textCanviat && text) perTraduir.push(ja.id);
          res.actualitzades++;
        }
        continue;
      }

      const web = !anonim ? aparellaAmbWeb(autor, puntuacio, webLliures) : null;
      if (web) {
        // És una de les 13: s'hi posa l'id real i la data exacta; la resta es conserva.
        await prisma.ressenya.update({
          where: { id: web.id },
          data: { googleId: g.reviewId, dataRessenya: data, dataPrecisio: 'DIA', resposta },
        });
        webLliures.splice(webLliures.indexOf(web), 1);
        res.enllacades++;
        continue;
      }

      const nova = await prisma.ressenya.create({
        data: {
          font: 'GOOGLE',
          googleId: g.reviewId,
          autor,
          puntuacio,
          text,
          dataRessenya: data,
          dataPrecisio: 'DIA',
          resposta,
          estat: 'PENDENT',
        },
      });
      res.noves++;
      if (text) perTraduir.push(nova.id);
    }

    // Esborrades de Google: fora de la web (només les que venien de Google).
    const desaparegudes = existents.filter(
      (e) => e.googleId && !e.googleId.startsWith('web-') && !vistes.has(e.googleId) && e.estat !== 'AMAGADA',
    );
    if (reviews.length > 0 && desaparegudes.length) {
      const r = await prisma.ressenya.updateMany({
        where: { id: { in: desaparegudes.map((d) => d.id) } },
        data: { estat: 'AMAGADA', destacada: false },
      });
      res.amagades = r.count;
    }

    // Resum real de la fitxa (nota i total), que la web mostra sempre.
    await prisma.establiment.update({
      where: { id: est.id },
      data: {
        ...(averageRating != null ? { googleNota: Math.round(averageRating * 10) / 10 } : {}),
        ...(totalReviewCount != null ? { googleTotal: totalReviewCount } : {}),
        ressenyesSyncAt: new Date(),
        ressenyesSyncError: null,
      },
    });

    // Avís al mòbil de les noves (com el pop-up del panell).
    if (res.noves > 0) {
      await avisAlMoment({
        title: res.noves === 1 ? 'Ressenya nova de Google' : `${res.noves} ressenyes noves de Google`,
        body: 'Toca per decidir si surten a la web.',
        url: '/ressenyes',
        tag: 'ressenyes',
      });
    }

    // Traduccions, amb límit de temps.
    const inici = Date.now();
    for (const id of perTraduir) {
      if (Date.now() - inici > PRESSUPOST_TRADUCCIO_MS) break;
      if (await traduirRessenya(id)) res.traduides++;
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.establiment.update({
      where: { id: est.id },
      data: { ressenyesSyncAt: new Date(), ressenyesSyncError: msg.slice(0, 500) },
    });
    throw err;
  }
}
