import Anthropic from '@anthropic-ai/sdk';
import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';

// Claude pot trigar 10-20 s en imatges grans; ampliem el timeout de la funció.
export const maxDuration = 60;

const client = new Anthropic();

const SUPPORTED_IMG = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);

// Resultat de l'escàner d'un tiquet/factura de compra (despesa).
export interface GastoOcr {
  data?: string; // YYYY-MM-DD
  proveidorNom?: string;
  proveidorNif?: string;
  // Dades de contacte del proveïdor (per crear-ne la fitxa), si es llegeixen.
  proveidorActivitat?: string;
  proveidorTelefon?: string;
  proveidorEmail?: string;
  proveidorAdreca?: string;
  proveidorWeb?: string;
  numFactura?: string;
  baseImposable?: number;
  ivaPercent?: number;
  irpfPercent?: number;
  import?: number; // total pagat (IVA inclòs)
  descripcio?: string;
  categoria?: string; // categoria triada de la llista (o "Altres")
  warnings: string[];
}

const SYSTEM_PROMPT = `Ets un sistema de TRANSCRIPCIÓ EXACTA de tiquets i factures de compra espanyols.
La teva única feina és copiar, xifra a xifra, EL QUE REALMENT ES VEU a la imatge.

REGLES ABSOLUTES (molt importants):
- NO inventis, dedueixis ni "arreglis" cap valor. Transcriu literalment el que veus.
- Si una xifra és borrosa o dubtosa, NO l'endevinis: deixa el camp buit (null) i afegeix un warning.
- Val MÉS deixar un camp buit que posar-hi un valor possiblement incorrecte.
- Els imports espanyols usen coma decimal (31,10). Retorna'ls SEMPRE com a número JSON amb punt decimal (31.10).
Respon SEMPRE en format JSON vàlid, sense cap text addicional fora del JSON.`;

function buildUserPrompt(categories: string[]): string {
  const catList = categories.length > 0 ? categories.join(', ') : 'Altres';
  return `Extreu les dades d'aquesta factura o tiquet de COMPRA (una despesa del negoci).

MOLT IMPORTANT sobre el proveïdor:
- El "proveïdor" és qui EMET la factura (l'emissor/venedor), normalment a la capçalera de dalt.
- NO és el client/destinatari (a qui va dirigida). Sovint el client és "FAICOM PACKAGING INDUSTRIAL S.L." amb NIF B61183158 o similar: aquest NO és el proveïdor, ignora'l com a proveïdor.
- El NIF/CIF del proveïdor és el de l'emissor (p.ex. B70955505, B60514650, ESA82037292…). Si a la factura només hi ha el NIF del client, deixa proveidorNif buit i posa un warning.
- Les dades de contacte (telèfon, e-mail, adreça, web, activitat) han de ser les de l'EMISSOR/proveïdor, no les del client.

Retorna un objecte JSON amb exactament aquesta estructura (posa null als camps que no puguis llegir amb seguretat):
{
  "data": "YYYY-MM-DD o null — data de la factura/tiquet",
  "proveidorNom": "string o null — nom de l'empresa que EMET la factura",
  "proveidorNif": "string o null — NIF/CIF de l'emissor (majúscules, sense espais)",
  "proveidorActivitat": "string o null — activitat/sector del proveïdor (p.ex. 'Electrònica', 'Ferreteria', 'Assegurances') si es dedueix",
  "proveidorTelefon": "string o null — telèfon del proveïdor",
  "proveidorEmail": "string o null — e-mail del proveïdor",
  "proveidorAdreca": "string o null — adreça (carrer, població) del proveïdor",
  "proveidorWeb": "string o null — pàgina web del proveïdor",
  "numFactura": "string o null — número de factura o de tiquet",
  "baseImposable": "número o null — base imposable (sense IVA)",
  "ivaPercent": "número o null — percentatge d'IVA aplicat (21, 10 o 4). Si la factura mostra base i total però no el %, calcula'l: round((total-base)/base*100)",
  "irpfPercent": "número o null — percentatge de retenció d'IRPF si n'hi ha (sovint no n'hi ha; deixa null)",
  "import": "número o null — TOTAL a pagar amb IVA inclòs",
  "descripcio": "string o null — descripció breu del que s'ha comprat (p.ex. 'Material de pintura', 'Llits i matalassos', 'Ferreteria')",
  "categoria": "string — tria la categoria MÉS adient d'aquesta llista EXACTA: [${catList}]. Copia el nom tal qual. Si cap encaixa clarament, posa 'Altres'.",
  "warnings": ["array de strings — avisos sobre dades dubtoses o que no s'han pogut llegir"]
}

Regles de lectura (transcripció fidel, sense inventar):
- Llegeix cada xifra amb atenció. Distingeix bé 0/O, 1/I, 5/S, 8/B. Si dubtes, deixa el camp buit + warning.
- El TOTAL és l'import final amb IVA inclòs ("Total", "Importe total", "Total factura"). És el més important: no el confonguis amb la base.
- Si només veus el total (tiquet simple sense desglossament), omple només "import" i deixa base/ivaPercent a null (o, si el tiquet indica "IVA 21%", posa ivaPercent=21).
- Si hi ha diverses línies de producte, NO les detallis totes: resumeix a "descripcio" en poques paraules.
- La "categoria" NO és transcripció: és una classificació teva. Tria SEMPRE un nom de la llista (o 'Altres'); no te'l pots inventar fora de la llista.
- Les dades de contacte del proveïdor només si es veuen clarament; si no, null.
- Si no pots llegir cap dada fiable, retorna { "categoria": "Altres", "warnings": ["No s'han pogut llegir dades fiables; fes una foto més nítida"] }.`;
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  return undefined;
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

    // Llista de categories disponibles (per triar-ne la més adient). El client
    // l'envia com a JSON; si no ve, es fa servir només "Altres".
    let categories: string[] = [];
    const catsRaw = formData.get('categories');
    if (typeof catsRaw === 'string' && catsRaw.trim()) {
      try {
        const arr = JSON.parse(catsRaw) as unknown;
        if (Array.isArray(arr)) categories = arr.map(String).filter(Boolean);
      } catch { /* ignore */ }
    }

    const rawType = file.type || 'image/jpeg';
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Bloc de contingut: PDF com a document; imatge (o qualsevol altre) com a imatge.
    const isPdf = rawType === 'application/pdf';
    const mediaType = (
      rawType === 'image/jpg' || !SUPPORTED_IMG.has(rawType) ? 'image/jpeg' : rawType
    ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const contentBlock: Anthropic.ContentBlockParam = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    const message = await client.messages.create({
      // Model que la clau d'API de producció té disponible (opus 4.8 no hi és).
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      // Temperatura 0: transcripció determinista, sense inventar imports.
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: buildUserPrompt(categories) }] }],
    });

    const text = message.content.find((b) => b.type === 'text')?.text ?? '';

    let parsed: Record<string, unknown>;
    try {
      const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(clean) as Record<string, unknown>;
    } catch {
      return Response.json({ error: 'Resposta invàlida del model', raw: text }, { status: 502 });
    }

    const warnings = Array.isArray(parsed.warnings) ? (parsed.warnings as unknown[]).map(String) : [];

    // La categoria que retorna el model ha de ser una de la llista; si no ho és,
    // caiem a "Altres" (o al text tal qual si no tenim llista).
    const catRaw = toStr(parsed.categoria);
    const catMatch = catRaw
      ? categories.find((c) => c.toLowerCase() === catRaw.toLowerCase())
      : undefined;
    const categoria = catMatch ?? (categories.length > 0 ? 'Altres' : catRaw);

    const result: GastoOcr = {
      data: toStr(parsed.data),
      proveidorNom: toStr(parsed.proveidorNom),
      proveidorNif: toStr(parsed.proveidorNif)?.toUpperCase().replace(/\s+/g, ''),
      proveidorActivitat: toStr(parsed.proveidorActivitat),
      proveidorTelefon: toStr(parsed.proveidorTelefon),
      proveidorEmail: toStr(parsed.proveidorEmail),
      proveidorAdreca: toStr(parsed.proveidorAdreca),
      proveidorWeb: toStr(parsed.proveidorWeb),
      numFactura: toStr(parsed.numFactura),
      baseImposable: toNum(parsed.baseImposable),
      ivaPercent: toNum(parsed.ivaPercent),
      irpfPercent: toNum(parsed.irpfPercent),
      import: toNum(parsed.import),
      descripcio: toStr(parsed.descripcio),
      categoria,
      warnings,
    };

    if (result.import === undefined) {
      result.warnings.unshift('No s’ha pogut llegir el TOTAL de la factura. Comprova’l a mà abans de desar.');
    }

    return Response.json({ result, warnings: result.warnings });
  } catch (err) {
    return handleApiError(err);
  }
}
