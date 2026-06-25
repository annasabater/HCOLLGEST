import Anthropic from '@anthropic-ai/sdk';
import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import type { ViatgerOcr } from '@/lib/ocr/mrz';

const client = new Anthropic();

const SYSTEM_PROMPT = `Ets un sistema d'extracció de dades de documents d'identitat espanyols i europeus.
Analitza la imatge i extreu totes les dades disponibles.
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

Regles:
- DNI espanyol: el numDocument han de ser 8 dígits seguits d'una lletra (p.ex. "12345678Z"). Avisa si no quadra.
- NIE: comença per X, Y o Z seguida de 7 dígits i una lletra (p.ex. "X1234567L"). Avisa si no quadra.
- Passaport espanyol: el numSuport sol ser el número de sèrie (alfanumèric, 9 caràcters). Avisa si sembla incomplet.
- El numSuport del DNI (IDESP) té format 3 lletres + 6 dígits (p.ex. "AAA111222"). Avisa si no quadra.
- Afegeix un warning per cada camp que hagis deduït amb poca certesa o que sembli erroni.
- Si la imatge és del revers del DNI, extreu l'adreça, codi postal, localitat i província; el nom/cognom pot ser buit.
- Si no pots llegir cap dada útil, retorna { "nom": "", "cognom1": "", "valid": false, "warnings": ["No s'han pogut llegir dades del document"] }.`;

export async function POST(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const formData = await req.formData();
    const file = formData.get('image');
    if (!file || !(file instanceof Blob)) {
      return Response.json({ error: 'Cal enviar un camp "image"' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
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
      // Strip markdown code fences if Claude wraps in ```json ... ```
      const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(clean) as typeof parsed;
    } catch {
      return Response.json(
        { error: 'Resposta invàlida del model', raw: text },
        { status: 502 },
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
      warnings: parsed.warnings ?? [],
    };

    return Response.json({ result, warnings: result.warnings });
  } catch (err) {
    return handleApiError(err);
  }
}
