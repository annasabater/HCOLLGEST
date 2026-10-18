/**
 * Prepara la foto per enviar-la a /api/ocr/document (NOMÉS la còpia per llegir;
 * la foto que es desa és l'original).
 *
 * Les fotos de tauleta/mòbil poden fer molts MB i Vercel rebutja qualsevol
 * petició de més de 4,5 MB abans d'arribar al servidor (413, sense resposta
 * JSON), que és el «no s'ha pogut llegir el text» sense cap motiu. El servidor
 * tampoc aprofita més de ~3000 px, així que la reduïm aquí a JPEG.
 */
const MAX_COSTAT = 3000;
const MAX_BYTES = 3.5 * 1024 * 1024;

export async function redueixPerOcr(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  let bmp: ImageBitmap;
  try {
    // `from-image`: aplica l'orientació EXIF (fotos de l'iPad/iPhone de costat).
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // format que el navegador no sap descodificar: s'envia tal qual
  }
  try {
    const escala = Math.min(1, MAX_COSTAT / Math.max(bmp.width, bmp.height));
    if (escala === 1 && file.size <= MAX_BYTES) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
    return blob && blob.size < file.size ? blob : file;
  } finally {
    bmp.close();
  }
}
