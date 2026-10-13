import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Versió «per imprimir» d'un PDF apaïsat: cada pàgina horitzontal es posa girada
 * 90° dins d'una pàgina A4 VERTICAL. L'iPad (i altres impressores que sempre
 * imprimeixen en vertical i no deixen triar l'orientació) així l'imprimeixen a
 * mida sencera en lloc d'encongir-la. En paper es llegeix girant el full.
 */
export async function giraPerImprimir(bytes: Uint8Array): Promise<Uint8Array> {
  const origen = await PDFDocument.load(bytes);
  const desti = await PDFDocument.create();
  desti.setTitle(origen.getTitle() ?? 'Document');
  const pagines = await desti.embedPages(origen.getPages());
  for (const p of pagines) {
    if (p.width <= p.height) {
      // Ja és vertical: tal qual.
      desti.addPage([p.width, p.height]).drawPage(p);
      continue;
    }
    // Pàgina vertical amb l'amplada = alçada de l'original; girada 90° (antihorari)
    // al voltant de l'origen i desplaçada a la dreta perquè quedi dins.
    const pag = desti.addPage([p.height, p.width]);
    pag.drawPage(p, { x: p.height, y: 0, rotate: degrees(90) });
  }
  return desti.save();
}
