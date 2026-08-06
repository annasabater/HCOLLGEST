import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { findMrzLines, parseMrz, mrzToViatger, type ViatgerOcr } from '@/lib/ocr/mrz';

// Claude pot trigar 10-20 s en imatges grans; ampliem el timeout de la funció.
export const maxDuration = 60;

const client = new Anthropic();

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

// Estratègia anti-invenció: NO demanem al model que "entengui" el document i
// ompli camps (això és el que feia que s'inventés dígits). Li demanem NOMÉS que
// copiï, tal qual, les línies de la ZONA MRZ (les de sota amb `<<<`). La MRZ porta
// DÍGITS DE CONTROL, així que després la parsejem i validem nosaltres
// (`parseMrz`, testejada amb vectors ICAO): si els dígits no quadren, NO autoreplenem
// res (val més buit que inventat). L'adreça (que no és a la MRZ) es llegeix a part,
// best-effort, i sempre és revisable per l'usuari.
const SYSTEM_PROMPT = `Ets un sistema de TRANSCRIPCIÓ EXACTA de la zona MRZ de documents d'identitat.
La MRZ és el bloc de 2 o 3 línies de sota del document, escrites amb tipus monoespaiada i
plenes de caràcters "<" (chevrons). Apareix als passaports (2 línies de 44 caràcters) i al
revers dels DNI/NIE espanyols i targetes europees (3 línies de 30 caràcters).

REGLES ABSOLUTES:
- Copia les línies MRZ CARÀCTER PER CARÀCTER, incloent-hi TOTS els "<". No en treguis ni n'afegeixis.
- NO interpretis, NO reordenis, NO "arreglis" res. Transcripció literal.
- Distingeix bé 0/O, 1/I, 2/Z, 5/S, 8/B. Si un caràcter és dubtós, transcriu el que veus.
- Si NO hi ha zona MRZ visible (p.ex. és la cara del davant del DNI o un carnet de conduir), retorna mrzLines buit.
Respon SEMPRE en JSON vàlid, sense cap text fora del JSON.`;

const USER_PROMPT = `Mira aquesta imatge d'un document d'identitat i retorna EXACTAMENT aquest JSON:
{
  "mrzLines": ["array amb les línies de la zona MRZ, verbatim amb tots els '<'. Buit [] si no n'hi ha cap."],
  "adreca": "string o null — carrer, número i pis del domicili (només si es veu al revers)",
  "codiPostal": "string o null — 5 dígits",
  "localitat": "string o null — municipi",
  "provinciaNom": "string o null — nom de la província"
}

Instruccions:
- La teva feina PRINCIPAL és copiar les línies MRZ tal com són. No transcriguis els camps
  de la cara visual (nom, número…): d'aquests ja ens n'ocupem nosaltres a partir de la MRZ.
- Passaport: 2 línies de 44 caràcters. DNI/NIE/targeta europea: 3 línies de 30 caràcters.
- La imatge pot venir GIRADA o de costat: llegeix la MRZ igualment (posa-la horitzontal mentalment).
- Copia cada "<" que vegis; són significatius. No completis ni escurcis les línies.
- Si la imatge és el revers d'un DNI, a més de la MRZ omple adreça/CP/localitat/província si es veuen.
- Si no hi ha MRZ (cara del davant, carnet de conduir, foto borrosa), retorna "mrzLines": [].

Respon NOMÉS amb l'objecte JSON, començant per "{" i acabant per "}". Cap frase ni explicació abans o després.`;

interface ModelOut {
  mrzLines?: string[];
  adreca?: string | null;
  codiPostal?: string | null;
  localitat?: string | null;
  provinciaNom?: string | null;
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/** Una passada d'OCR: envia la imatge a Claude i intenta parsejar+validar la MRZ. */
async function transcriuMrz(base64: string, mediaType: MediaType) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
  });
  const text = message.content.find((b) => b.type === 'text')?.text ?? '';
  let parsed: ModelOut | null = null;
  const noFence = text.replace(/```(?:json)?/gi, '').trim();
  const candidates: string[] = [noFence];
  const first = noFence.indexOf('{');
  const last = noFence.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(noFence.slice(first, last + 1));
  for (const c of candidates) {
    try { parsed = JSON.parse(c) as ModelOut; break; } catch { /* prova la següent */ }
  }
  const mrzCandidates = findMrzLines([...(parsed?.mrzLines ?? []), text].join('\n'));
  const mrz = parseMrz(mrzCandidates);
  return { parsed, text, mrzCandidates, mrz };
}

export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const formData = await req.formData();
    const file = formData.get('image');
    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: 'Cal enviar un camp "image"' }, { status: 400 });
    }

    // Normalitza el tipus MIME: image/jpg → image/jpeg; formats no suportats → image/jpeg
    const rawType = file.type || 'image/jpeg';
    const mediaType = (
      rawType === 'image/jpg' || !SUPPORTED_TYPES.has(rawType) ? 'image/jpeg' : rawType
    ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const bytes = await file.arrayBuffer();

    // Normalitza la imatge amb sharp abans de llegir-la: aplica l'orientació EXIF,
    // converteix a JPEG (p. ex. HEIC de l'iPad → JPEG) i limita la mida (les fotos
    // de tablet són de molts megapíxels i poden superar el límit de l'OCR). Això fa
    // que funcioni igual des de qualsevol dispositiu. Si sharp falla, fem servir els
    // bytes originals.
    let baseBuf: Buffer;
    let baseType: MediaType = mediaType;
    try {
      baseBuf = await sharp(Buffer.from(bytes))
        .rotate() // orientació segons EXIF
        .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      baseType = 'image/jpeg';
    } catch {
      baseBuf = Buffer.from(bytes);
    }

    // Diagnòstic: mida REAL de la imatge rebuda. Serveix per detectar si un
    // dispositiu (p. ex. l'iPad) envia la foto molt reduïda i per això no es llegeix.
    let diagMida = `${Math.round(bytes.byteLength / 1024)} KB`;
    try {
      const meta = await sharp(Buffer.from(bytes)).metadata();
      if (meta.width && meta.height) diagMida = `${meta.width}×${meta.height} px · ${diagMida}`;
    } catch { /* ignora */ }

    // 1a passada amb la imatge tal com ve. Si la MRZ NO valida (sovint perquè la
    // foto està girada 90°, el DNI de costat), la rotem i reintentem fins que quadri.
    let best = await transcriuMrz(baseBuf.toString('base64'), baseType);
    if (!(best.mrz && best.mrz.valid)) {
      for (const angle of [90, 270, 180]) {
        let rotB64: string;
        try {
          const rot = await sharp(baseBuf).rotate(angle).jpeg({ quality: 90 }).toBuffer();
          rotB64 = rot.toString('base64');
        } catch {
          continue;
        }
        const att = await transcriuMrz(rotB64, 'image/jpeg');
        if (att.mrz && att.mrz.valid) { best = att; break; }
      }
    }

    const { parsed, text, mrzCandidates, mrz } = best;

    if (!parsed && !(mrz && mrz.valid)) {
      // Ni JSON ni MRZ vàlida en cap orientació: rendim (la foto ja s'ha desat al client).
      return Response.json(
        { error: 'Resposta invàlida del model', raw: text.slice(0, 300) },
        { status: 502 },
      );
    }

    // Adreça (best-effort, no és a la MRZ): sempre revisable per l'usuari.
    const adreca = parsed?.adreca?.trim() || undefined;
    const codiPostal = parsed?.codiPostal?.trim() || undefined;
    const localitat = parsed?.localitat?.trim() || undefined;
    const provinciaNom = parsed?.provinciaNom?.trim() || undefined;

    const warnings: string[] = [];
    let identitat: ViatgerOcr | null = null;

    if (mrz && mrz.valid) {
      // Tots els dígits de control quadren → dades FIABLES, autoreplenem.
      identitat = mrzToViatger(mrz);
    } else if (mrz && !mrz.valid) {
      // S'ha detectat MRZ però algun dígit de control NO quadra: el model ha llegit
      // malament algun caràcter. NO autoreplenem dades possiblement errònies.
      warnings.push(
        "S'ha detectat la zona MRZ però no supera els dígits de control (lectura poc nítida). " +
          'No s\'han autoreplenat les dades per no posar-hi valors incorrectes; fes una foto més nítida del ' +
          'revers del DNI o de la pàgina del passaport, o omple-ho a mà.',
      );
    } else {
      // Cap MRZ: cara del davant del DNI, carnet de conduir, o foto sense MRZ.
      warnings.push(
        "No s'ha detectat la zona MRZ (les línies amb «<<<»). Al DNI/NIE és al REVERS i al passaport a la " +
          'pàgina de la foto. La foto s\'ha desat igualment; escaneja el revers/passaport per autoreplenar, o omple-ho a mà.',
      );
    }

    const hasAddress = Boolean(adreca || codiPostal || localitat || provinciaNom);

    const result: ViatgerOcr = {
      nom: identitat?.nom ?? '',
      cognom1: identitat?.cognom1 ?? '',
      cognom2: identitat?.cognom2,
      tipusDocument: identitat?.tipusDocument,
      numDocument: identitat?.numDocument,
      numSuport: identitat?.numSuport,
      sexe: identitat?.sexe,
      dataNaixement: identitat?.dataNaixement,
      nacionalitat: identitat?.nacionalitat,
      adreca,
      codiPostal,
      localitat,
      provinciaNom,
      valid: identitat?.valid ?? false,
      warnings,
    };

    // Retornem també les línies MRZ llegides perquè l'usuari les pugui comparar
    // amb el document (el nom no porta dígit de control) i corregir el formulari.
    const mrzLines = mrzCandidates;

    // Si no hem tret res útil (ni identitat ni adreça), retornem 422 perquè el
    // client mostri "no s'ha pogut llegir, omple-ho a mà" (i la foto ja s'ha desat).
    if (!identitat && !hasAddress) {
      warnings.push(
        `Diagnòstic: imatge rebuda ${diagMida}. Si la mateixa foto va bé des d'un altre aparell, ` +
          "és que aquest l'envia més petita/reduïda (la MRZ queda massa petita). Puja la foto original " +
          'sencera (des del mòbil, o desactiva a l\'iPad «Optimitza l\'emmagatzematge» a Configuració → Fotos).',
      );
      return Response.json({ result, warnings, mrzLines }, { status: 422 });
    }

    return Response.json({ result, warnings, mrzLines });
  } catch (err) {
    return handleApiError(err);
  }
}
