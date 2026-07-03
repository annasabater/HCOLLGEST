import Anthropic from '@anthropic-ai/sdk';
import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { dniCheckLetter, type ViatgerOcr } from '@/lib/ocr/mrz';

// Claude pot trigar 10-20 s en imatges grans; ampliem el timeout de la funció.
export const maxDuration = 60;

const client = new Anthropic();

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

const SYSTEM_PROMPT = `Ets un sistema de TRANSCRIPCIÓ EXACTA de documents d'identitat espanyols i europeus.
La teva única feina és copiar, caràcter per caràcter, EL QUE REALMENT ES VEU a la imatge.

REGLES ABSOLUTES (molt importants):
- NO inventis, dedueixis, completis ni "arreglis" cap valor. Transcriu literalment.
- Si un caràcter és borrós, tapat o dubtós, NO l'endevinis: deixa el camp buit (null) i
  afegeix un warning explicant què no s'ha pogut llegir bé.
- Val MÉS deixar un camp buit que posar-hi un valor possiblement incorrecte.
- No corregeixis un número perquè "faci més sentit"; si el que veus no quadra amb el format
  esperat, transcriu el que veus TAL QUAL i afegeix un warning.
Respon SEMPRE en format JSON vàlid, sense cap text addicional fora del JSON.`;

const USER_PROMPT = `Extreu les dades d'aquest document d'identitat (DNI, NIE, passaport o carnet de conduir).

Retorna un objecte JSON amb exactament aquesta estructura (omite els camps que no puguis llegir):
{
  "nom": "string — nom de pila (en majúscules, sense accents si la MRZ no en porta)",
  "cognom1": "string — primer cognom",
  "cognom2": "string o null",
  "tipusDocument": "DNI_NIF | NIE | PASSAPORT | ALTRES",
  "numDocument": "string — número del document (DNI: 8 dígits + lletra; NIE: X/Y/Z + 7 dígits + lletra; passaport: alfanumèric)",
  "numSuport": "string o null — número de suport (IDESP al DNI: 3 lletres + 6 dígits; al NIE: és el número de suport)",
  "sexe": "HOME | DONA o null",
  "dataNaixement": "YYYY-MM-DD o null",
  "dataCaducitat": "YYYY-MM-DD o null",
  "nacionalitat": "codi ISO 3166-1 alfa-3 (ESP, FRA, GBR…) o null",
  "adreca": "string — carrer, número, pis (revers del DNI) o null",
  "codiPostal": "string — 5 dígits o null",
  "localitat": "string — municipi o null",
  "provinciaNom": "string — nom de la província o null",
  "valid": true,
  "warnings": ["array de strings — avisos sobre dades que semblen incorrectes, incompletes o dubtoses"]
}

Regles de lectura (transcripció fidel, sense inventar):
- Llegeix cada caràcter amb atenció. Distingeix bé 0/O, 1/I/L, 2/Z, 5/S, 8/B, 6/G. Si dubtes
  entre dos caràcters, NO tries a l'atzar: deixa el número buit i posa un warning.
- DNI espanyol: numDocument = 8 dígits + 1 lletra (p.ex. "12345678Z"). Si no en llegeixes
  exactament 8 dígits i una lletra clara, deixa'l buit i avisa. NO afegeixis ni treguis dígits.
- NIE: X/Y/Z + 7 dígits + lletra (p.ex. "X1234567L"). Mateixa norma: si no és nítid, buit + warning.
- Passaport: transcriu el número tal com apareix (no el completis a 9 caràcters si no els veus).
- numSuport del DNI (IDESP): 3 lletres + 6 dígits (p.ex. "ABC123456"). Si no és clar, buit + warning.
- Les dates: transcriu-les tal com surten; si una xifra és il·legible, deixa la data buida i avisa.
- Prioritza la zona MRZ (les línies de sota amb <<<) si hi és: és la més fiable per número, nom,
  nacionalitat, sexe i dates. Si la MRZ i la part visual no coincideixen, avisa-ho.
- Si la imatge és del revers del DNI, extreu adreça, codi postal, localitat i província; nom/cognom pot ser buit.
- Afegeix un warning CLAR per cada camp dubtós, dient exactament què no s'ha pogut llegir bé.
- Si no pots llegir cap dada amb prou seguretat, retorna { "nom": "", "cognom1": "", "valid": false, "warnings": ["No s'han pogut llegir dades fiables del document; fes una foto més nítida"] }.`;

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
      // Temperatura 0: transcripció determinista i fidel, sense "creativitat" que
      // faci inventar dígits. Clau perquè no s'inventi valors del document.
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

    let parsed: Partial<ViatgerOcr> & { warnings?: string[]; dataCaducitat?: string };
    try {
      const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(clean) as typeof parsed;
    } catch {
      return Response.json({ error: 'Resposta invàlida del model', raw: text }, { status: 502 });
    }

    const warnings = [...(parsed.warnings ?? [])];
    const numDoc = (parsed.numDocument ?? '').toUpperCase().trim();

    // Validació del dígit de control (mòdul 23): si la lletra del DNI/NIE no quadra
    // amb els dígits, l'OCR ha llegit malament algun caràcter → avisem clarament en
    // comptes de donar el número per bo. Així no es "cola" un número inventat.
    const dni = numDoc.match(/^(\d{8})([A-Z])$/);
    const nie = numDoc.match(/^([XYZ])(\d{7})([A-Z])$/);
    if (dni) {
      if (dniCheckLetter(dni[1]!) !== dni[2]!) {
        warnings.unshift(
          `El DNI llegit "${numDoc}" no supera el dígit de control: probablement s'ha llegit malament algun dígit. Revisa'l abans de desar.`,
        );
      }
    } else if (nie) {
      const pre: Record<string, string> = { X: '0', Y: '1', Z: '2' };
      if (dniCheckLetter(`${pre[nie[1]!]}${nie[2]!}`) !== nie[3]!) {
        warnings.unshift(
          `El NIE llegit "${numDoc}" no supera el dígit de control: probablement s'ha llegit malament algun caràcter. Revisa'l abans de desar.`,
        );
      }
    } else if (numDoc && parsed.tipusDocument === 'DNI_NIF') {
      warnings.unshift(
        `El DNI llegit "${numDoc}" no té el format esperat (8 dígits + lletra). Revisa'l abans de desar.`,
      );
    }

    const result: ViatgerOcr = {
      nom: parsed.nom ?? '',
      cognom1: parsed.cognom1 ?? '',
      cognom2: parsed.cognom2 ?? undefined,
      tipusDocument: parsed.tipusDocument,
      numDocument: parsed.numDocument ?? undefined,
      numSuport: parsed.numSuport ?? undefined,
      sexe: parsed.sexe,
      dataNaixement: parsed.dataNaixement ?? undefined,
      nacionalitat: parsed.nacionalitat ?? undefined,
      adreca: parsed.adreca ?? undefined,
      codiPostal: parsed.codiPostal ?? undefined,
      localitat: parsed.localitat ?? undefined,
      provinciaNom: parsed.provinciaNom ?? undefined,
      valid: parsed.valid ?? false,
      warnings,
    };

    return Response.json({ result, warnings: result.warnings });
  } catch (err) {
    return handleApiError(err);
  }
}
