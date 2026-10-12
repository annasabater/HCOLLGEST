/**
 * Redueix una foto al navegador abans d'enviar-la a l'OCR. Vercel talla les
 * peticions de més de 4,5 MB i les fotos de l'iPad/mòbil (sovint HEIC) les
 * superen. Els PDF i els fitxers que no són imatge es retornen tal qual; si el
 * navegador no pot decodificar la imatge, també.
 */
export async function redueixImatge(f: File, maxCostat = 2000, qualitat = 0.85): Promise<Blob> {
  if (!f.type.startsWith('image/') && !/\.(heic|heif)$/i.test(f.name)) return f;
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    const escala = Math.min(1, maxCostat / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return f;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualitat));
    return blob ?? f;
  } catch {
    return f;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Missatge d'error d'una pujada fallida: el motiu del servidor si n'hi ha, o
 * "massa gran" quan Vercel la talla (413, sense cos JSON).
 */
export async function motiuPujada(res: Response, base: string): Promise<string> {
  if (res.status === 413) return `${base}: el fitxer és massa gran (màx. 4 MB).`;
  const d = (await res.json().catch(() => null)) as { error?: string } | null;
  return d?.error ? `${base}: ${d.error}` : base;
}
