import Anthropic from '@anthropic-ai/sdk';
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
- Copia cada "<" que vegis; són significatius. No completis ni escurcis les línies.
- Si la imatge és el revers d'un DNI, a més de la MRZ omple adreça/CP/localitat/província si es veuen.
- Si no hi ha MRZ (cara del davant, carnet de conduir, foto borrosa), retorna "mrzLines": [].`;

interface ModelOut {
  mrzLines?: string[];
  adreca?: string | null;
  codiPostal?: string | null;
  localitat?: string | null;
  provinciaNom?: string | null;
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
    const base64 = Buffer.from(bytes).toString('base64');

    const message = await client.messages.create({
      // Model que la clau d'API de producció té disponible (opus 4.8 no hi és).
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      // Temperatura 0: transcripció determinista i fidel, sense "creativitat".
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    });

    const text = message.content.find((b) => b.type === 'text')?.text ?? '';

    let parsed: ModelOut;
    try {
      const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(clean) as ModelOut;
    } catch {
      return Response.json({ error: 'Resposta invàlida del model', raw: text }, { status: 502 });
    }

    // Adreça (best-effort, no és a la MRZ): sempre revisable per l'usuari.
    const adreca = parsed.adreca?.trim() || undefined;
    const codiPostal = parsed.codiPostal?.trim() || undefined;
    const localitat = parsed.localitat?.trim() || undefined;
    const provinciaNom = parsed.provinciaNom?.trim() || undefined;

    // --- Zona MRZ: parseig + validació de dígits de control (font fiable) ---
    // Reunim les línies que ens dona el model i les que puguem trobar al text
    // pla per si les ha embolicat en un altre format.
    const mrzCandidates = findMrzLines(
      [...(parsed.mrzLines ?? []), text].join('\n'),
    );
    const mrz = parseMrz(mrzCandidates);

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
      return Response.json({ result, warnings, mrzLines }, { status: 422 });
    }

    return Response.json({ result, warnings, mrzLines });
  } catch (err) {
    return handleApiError(err);
  }
}
