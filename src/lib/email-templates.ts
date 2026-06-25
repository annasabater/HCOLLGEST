/**
 * Templates HTML d'email (gràcies/ressenya i benvinguda) en 4 idiomes.
 * Variables: {{nom}}, {{habitacio}}, {{entrada}}, {{sortida}}, {{enlacRessenya}}
 */

export type LangEmail = 'ca' | 'es' | 'en' | 'fr';

function fill(tpl: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), tpl);
}

// ---------------------------------------------------------------------------
// Email de GRÀCIES + RESSENYA (s'envia l'endemà de la sortida, a les 12:00)
// ---------------------------------------------------------------------------

const GRACIES_ASUMPTE: Record<LangEmail, string> = {
  ca: 'Gràcies per la teva estada a l\'Hostal Coll',
  es: 'Gracias por tu estancia en Hostal Coll',
  en: 'Thank you for your stay at Hostal Coll',
  fr: 'Merci pour votre séjour à l\'Hostal Coll',
};

const GRACIES_HTML: Record<LangEmail, string> = {
  ca: `<p>Hola {{nom}},</p>
<p>Ha estat un plaer tenir-te a l'Hostal Coll. Esperem que l'estada hagi estat del teu gust!</p>
<p>Si tens un moment, t'agrairíem molt que deixessis una ressenya a Google. Ens ajuda molt:</p>
<p><a href="{{enlacRessenya}}" style="background:#7A1F2B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Deixar una ressenya</a></p>
<p>Fins aviat!<br>L'equip de l'Hostal Coll</p>`,
  es: `<p>Hola {{nom}},</p>
<p>Ha sido un placer tenerte en el Hostal Coll. ¡Esperamos que la estancia haya sido de tu agrado!</p>
<p>Si tienes un momento, te agradeceríamos mucho que dejaras una reseña en Google. Nos ayuda mucho:</p>
<p><a href="{{enlacRessenya}}" style="background:#7A1F2B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Dejar una reseña</a></p>
<p>¡Hasta pronto!<br>El equipo del Hostal Coll</p>`,
  en: `<p>Hi {{nom}},</p>
<p>It was a pleasure having you at Hostal Coll. We hope you enjoyed your stay!</p>
<p>If you have a moment, we would really appreciate it if you left us a review on Google. It helps us a lot:</p>
<p><a href="{{enlacRessenya}}" style="background:#7A1F2B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Leave a review</a></p>
<p>Hope to see you again soon!<br>The Hostal Coll team</p>`,
  fr: `<p>Bonjour {{nom}},</p>
<p>C'était un plaisir de vous accueillir à l'Hostal Coll. Nous espérons que votre séjour vous a plu!</p>
<p>Si vous avez un moment, nous vous serions très reconnaissants de laisser un avis sur Google. Cela nous aide beaucoup:</p>
<p><a href="{{enlacRessenya}}" style="background:#7A1F2B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Laisser un avis</a></p>
<p>À bientôt!<br>L'équipe de l'Hostal Coll</p>`,
};

// ---------------------------------------------------------------------------
// Email de BENVINGUDA (s'envia el dia de l'entrada, a les 09:00 per defecte)
// ---------------------------------------------------------------------------

const BENVINGUDA_ASUMPTE: Record<LangEmail, string> = {
  ca: 'Benvingut/da a l\'Hostal Coll!',
  es: '¡Bienvenido/a al Hostal Coll!',
  en: 'Welcome to Hostal Coll!',
  fr: 'Bienvenue à l\'Hostal Coll!',
};

const BENVINGUDA_HTML: Record<LangEmail, string> = {
  ca: `<p>Hola {{nom}},</p>
<p>Estem encantats de tenir-te a l'Hostal Coll a partir d'avui!</p>
<p>La teva habitació és la <strong>{{habitacio}}</strong>. Si necessites qualsevol cosa, no dubtis en demanar-nos.</p>
<p>Bona estada!<br>L'equip de l'Hostal Coll</p>`,
  es: `<p>Hola {{nom}},</p>
<p>¡Estamos encantados de tenerte en el Hostal Coll a partir de hoy!</p>
<p>Tu habitación es la <strong>{{habitacio}}</strong>. Si necesitas cualquier cosa, no dudes en pedírnoslo.</p>
<p>¡Que disfrutes tu estancia!<br>El equipo del Hostal Coll</p>`,
  en: `<p>Hi {{nom}},</p>
<p>We are delighted to have you at Hostal Coll starting today!</p>
<p>Your room is <strong>{{habitacio}}</strong>. If you need anything at all, please don't hesitate to ask.</p>
<p>Enjoy your stay!<br>The Hostal Coll team</p>`,
  fr: `<p>Bonjour {{nom}},</p>
<p>Nous sommes ravis de vous accueillir à l'Hostal Coll à partir d'aujourd'hui!</p>
<p>Votre chambre est le <strong>{{habitacio}}</strong>. N'hésitez pas à nous demander si vous avez besoin de quoi que ce soit.</p>
<p>Bon séjour!<br>L'équipe de l'Hostal Coll</p>`,
};

const BASE_HTML = (cos: string) => `<!DOCTYPE html>
<html lang="ca">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#fdf8f3;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #e8ddd5">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:bold;color:#7A1F2B;letter-spacing:1px">HOSTAL COLL</span>
    </div>
    <div style="color:#333;line-height:1.7;font-size:15px">${cos}</div>
    <hr style="border:none;border-top:1px solid #e8ddd5;margin:24px 0">
    <p style="font-size:12px;color:#999;text-align:center">Hostal Coll · Calella de Mar</p>
  </div>
</body>
</html>`;

export function buildGraciesEmail(
  lang: LangEmail,
  vars: { nom: string; enlacRessenya: string },
): { asumpte: string; html: string } {
  return {
    asumpte: GRACIES_ASUMPTE[lang],
    html: BASE_HTML(fill(GRACIES_HTML[lang], vars)),
  };
}

export function buildBenvingudaEmail(
  lang: LangEmail,
  vars: { nom: string; habitacio: string },
): { asumpte: string; html: string } {
  return {
    asumpte: BENVINGUDA_ASUMPTE[lang],
    html: BASE_HTML(fill(BENVINGUDA_HTML[lang], vars)),
  };
}

// ---------------------------------------------------------------------------
// Text pla per WhatsApp (benvinguda)
// ---------------------------------------------------------------------------

const BENVINGUDA_WA: Record<LangEmail, string> = {
  ca: `Hola {{nom}}! 👋

Estem encantats de tenir-te a l'Hostal Coll a partir d'avui. La teva habitació és la {{habitacio}}.

Si necessites qualsevol cosa, estem aquí. Bona estada! 🏨

— L'equip de l'Hostal Coll`,
  es: `¡Hola {{nom}}! 👋

Estamos encantados de tenerte en el Hostal Coll a partir de hoy. Tu habitación es la {{habitacio}}.

Si necesitas cualquier cosa, aquí estamos. ¡Que disfrutes tu estancia! 🏨

— El equipo del Hostal Coll`,
  en: `Hi {{nom}}! 👋

We're delighted to have you at Hostal Coll starting today. Your room is {{habitacio}}.

If you need anything at all, we're here for you. Enjoy your stay! 🏨

— The Hostal Coll team`,
  fr: `Bonjour {{nom}} ! 👋

Nous sommes ravis de vous accueillir à l'Hostal Coll à partir d'aujourd'hui. Votre chambre est le {{habitacio}}.

N'hésitez pas si vous avez besoin de quoi que ce soit. Bon séjour ! 🏨

— L'équipe de l'Hostal Coll`,
};

export function buildBenvingudaWhatsApp(
  lang: LangEmail,
  vars: { nom: string; habitacio: string },
): string {
  return fill(BENVINGUDA_WA[lang], vars);
}
