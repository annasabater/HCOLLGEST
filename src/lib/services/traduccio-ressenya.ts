/**
 * Traducció automàtica d'una ressenya als 4 idiomes de hostalcoll.com amb Claude.
 * La traducció és fidel: no s'hi afegeix ni s'hi treu res (la ressenya original
 * no es modifica mai; aquí només se'n fa la versió en cada idioma).
 */
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { IDIOMES_WEB, type Traduccions } from '@/lib/ressenyes';

const client = new Anthropic();

// El primer és el preferit; si la clau de producció no hi té accés, es prova el següent
// (claude-sonnet-4-6 és el que ja fa servir l'OCR i se sap que funciona).
const MODELS = ['claude-opus-5-5', 'claude-sonnet-4-6'] as const;

const SYSTEM = `Tradueixes ressenyes de clients d'un hostal familiar de Calella (Barcelona) per mostrar-les a la seva web.
Regles:
- Traducció fidel i natural: mateix sentit, to i registre. No afegeixis, no treguis ni suavitzis res, no corregeixis opinions.
- Conserva els noms propis (persones, llocs, "Hostal Coll") tal com són.
- "ca" és català, "es" castellà, "en" anglès, "fr" francès.
- Per a l'idioma en què ja està escrita, torna el text original exactament igual.
- "idioma_original" és el codi ISO 639-1 de l'idioma de la ressenya (p. ex. "es", "ca", "en", "fr", "de", "it", "nl").`;

const SCHEMA = {
  type: 'object',
  properties: {
    idioma_original: { type: 'string' },
    es: { type: 'string' },
    ca: { type: 'string' },
    en: { type: 'string' },
    fr: { type: 'string' },
  },
  required: ['idioma_original', 'es', 'ca', 'en', 'fr'],
  additionalProperties: false,
} as const;

const RespostaSchema = z.object({
  idioma_original: z.string().trim().min(2).max(5),
  es: z.string(),
  ca: z.string(),
  en: z.string(),
  fr: z.string(),
});

async function crida(model: string, text: string): Promise<Anthropic.Message> {
  return client.messages.create({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Ressenya:\n"""\n${text}\n"""` }],
  });
}

/** Tradueix un text. Llança si cap model no ho aconsegueix. */
export async function traduirText(text: string): Promise<{ idiomaOriginal: string; traduccions: Traduccions }> {
  let message: Anthropic.Message | null = null;
  let darrerError: unknown = null;
  for (const model of MODELS) {
    try {
      message = await crida(model, text);
      break;
    } catch (err) {
      // Model no disponible per a aquesta clau → prova el següent. La resta d'errors, amunt.
      if (err instanceof Anthropic.NotFoundError || err instanceof Anthropic.PermissionDeniedError) {
        darrerError = err;
        continue;
      }
      throw err;
    }
  }
  if (!message) throw darrerError ?? new Error('Cap model de traducció disponible');
  if (message.stop_reason === 'refusal') throw new Error('El model no ha volgut traduir aquesta ressenya');
  if (message.stop_reason === 'max_tokens') throw new Error('Traducció tallada (massa llarga)');

  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) throw new Error('Resposta de traducció buida');
  const r = RespostaSchema.parse(JSON.parse(textBlock.text));

  const idiomaOriginal = r.idioma_original.toLowerCase().slice(0, 2);
  const traduccions = Object.fromEntries(IDIOMES_WEB.map((l) => [l, r[l].trim()])) as Traduccions;
  // L'idioma original mostra SEMPRE l'original exacte, no una "traducció".
  if ((IDIOMES_WEB as readonly string[]).includes(idiomaOriginal)) {
    traduccions[idiomaOriginal as keyof Traduccions] = text;
  }
  return { idiomaOriginal, traduccions };
}

/**
 * Tradueix i desa les traduccions d'una ressenya. Si no tenia idioma, desa el detectat.
 * Retorna false si no té text o si la traducció falla (no bloqueja res: es pot reintentar).
 */
export async function traduirRessenya(id: string): Promise<boolean> {
  const r = await prisma.ressenya.findUniqueOrThrow({ where: { id } });
  if (!r.text?.trim()) return false;
  try {
    const { idiomaOriginal, traduccions } = await traduirText(r.text);
    // Si l'idioma l'ha indicat qui l'ha entrada, mana sobre el detectat.
    if (r.idioma && (IDIOMES_WEB as readonly string[]).includes(r.idioma)) {
      traduccions[r.idioma as keyof Traduccions] = r.text;
    }
    await prisma.ressenya.update({
      where: { id },
      data: { traduccions, idioma: r.idioma ?? idiomaOriginal },
    });
    return true;
  } catch (err) {
    console.error('[ressenyes] traducció fallida', id, err instanceof Error ? err.message : err);
    return false;
  }
}
