/**
 * Edicions manuals dels documents imprimibles (/imprimir/*).
 *
 * Cada pàgina marca què es pot desar:
 *  - `data-k="clau"` en un input/textarea → es desa el seu valor.
 *  - `data-kr="clau"` en una fila generada pel servidor → si s'elimina, es recorda.
 *  - `data-files-k="clau"` en una taula → es desen TOTES les files `tr.item`
 *    (afegides, esborrades i editades), per a documents sense línies a la BD.
 *  - `data-k-auto` en un contenidor → es desen tots els seus camps (clau per posició).
 * En tornar a obrir el document, `EDICIONS_SCRIPT` hi aplica els valors desats.
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';

export const TIPUS_EDICIO = ['factura', 'factura-simple', 'fianca', 'ieet', 'trimestre'] as const;
export type TipusEdicio = (typeof TIPUS_EDICIO)[number];

const txt = z.string().max(5000);

export const EdicioDadesSchema = z.object({
  camps: z.record(z.string().max(200), txt).default({}),
  files: z
    .record(
      z.string().max(100),
      z.array(
        z.object({
          a: z.record(z.string().max(100), txt).default({}),
          s: z.string().max(500).default(''),
          v: z.array(txt).max(50),
        }),
      ).max(500),
    )
    .default({}),
  ocults: z.array(z.string().max(200)).max(500).default([]),
});
export type EdicioDades = z.infer<typeof EdicioDadesSchema>;

export async function carregaEdicions(tipus: TipusEdicio, ref: string): Promise<EdicioDades | null> {
  const e = await prisma.edicioDocument.findUnique({ where: { tipus_ref: { tipus, ref } } });
  if (!e) return null;
  const parsed = EdicioDadesSchema.safeParse(e.dades);
  return parsed.success ? parsed.data : null;
}

/** `<script>` amb la configuració que llegeix EDICIONS_SCRIPT (JSON segur dins HTML). */
export function edicionsBootstrap(tipus: TipusEdicio, ref: string, dades: EdicioDades | null): string {
  const json = JSON.stringify({ tipus, ref, dades }).replace(/</g, '\\u003c');
  return `<script>window.__edicions = ${json};</script>`;
}

/**
 * Script client (text, s'incrusta tal qual: sense "${" ni accents greus).
 * S'ha de posar DESPRÉS del contingut del document i ABANS dels scripts propis
 * de la pàgina, perquè els valors desats hi siguin quan aquests recalculen.
 * Exposa `window.desaEdicions()` (Promise) i, si hi ha un botó
 * `[data-desa-edicions]`, el connecta directament.
 */
export const EDICIONS_SCRIPT = `
(function () {
  var cfg = window.__edicions || {};
  var D = cfg.dades || null;
  var arr = function (x) { return Array.prototype.slice.call(x); };
  var camp = function (r) { return arr(r.querySelectorAll('input.in, textarea.in')); };
  var sig = function (r) {
    return camp(r).map(function (el) { return el.tagName + '.' + el.className.replace(/\\s+/g, '.'); }).join('|');
  };
  var perKr = function (k) {
    return arr(document.querySelectorAll('[data-kr]')).filter(function (r) { return r.getAttribute('data-kr') === k; })[0];
  };

  // [data-k-auto]: tots els camps del bloc (fora de les taules de files) es desen,
  // amb una clau per posició. Per a documents de capçalera fixa.
  arr(document.querySelectorAll('[data-k-auto]')).forEach(function (bloc, b) {
    var i = 0;
    arr(bloc.querySelectorAll('input.in, textarea.in')).forEach(function (el) {
      if (el.hasAttribute('data-k') || el.readOnly || el.closest('[data-files-k]')) return;
      el.setAttribute('data-k', 'auto' + b + '-' + i++);
    });
  });

  // Files generades pel servidor i plantilles de fila (per forma) de cada taula.
  var rowsIni = arr(document.querySelectorAll('[data-kr]')).map(function (r) { return r.getAttribute('data-kr'); });
  var plantilles = {};
  arr(document.querySelectorAll('[data-files-k]')).forEach(function (t) {
    var p = {};
    arr(t.querySelectorAll('tr.item')).forEach(function (r) { var s = sig(r); if (!p[s]) p[s] = r.cloneNode(true); });
    plantilles[t.getAttribute('data-files-k')] = p;
  });

  function restaura() {
    if (!D) return;
    var camps = D.camps || {};
    arr(document.querySelectorAll('[data-k]')).forEach(function (el) {
      var k = el.getAttribute('data-k');
      if (Object.prototype.hasOwnProperty.call(camps, k)) el.value = camps[k];
    });
    (D.ocults || []).forEach(function (k) { var r = perKr(k); if (r) r.remove(); });
    var files = D.files || {};
    Object.keys(files).forEach(function (k) {
      var t = arr(document.querySelectorAll('[data-files-k]')).filter(function (x) { return x.getAttribute('data-files-k') === k; })[0];
      var p = plantilles[k];
      if (!t || !p) return;
      var sigs = Object.keys(p);
      if (!sigs.length) return;
      var tb = t.tBodies[0] || t;
      arr(tb.querySelectorAll('tr.item')).forEach(function (r) { r.remove(); });
      files[k].forEach(function (f) {
        var r = (p[f.s] || p[sigs[0]]).cloneNode(true);
        arr(r.attributes).forEach(function (a) { if (a.name.indexOf('data-') === 0) r.removeAttribute(a.name); });
        Object.keys(f.a || {}).forEach(function (n) { if (n.indexOf('data-') === 0) r.setAttribute(n, f.a[n]); });
        var ins = camp(r);
        ins.forEach(function (el, i) { el.value = f.v && f.v[i] != null ? f.v[i] : ''; });
        tb.appendChild(r);
      });
    });
  }

  function recull() {
    var camps = {};
    arr(document.querySelectorAll('[data-k]')).forEach(function (el) { camps[el.getAttribute('data-k')] = el.value; });
    var ocults = rowsIni.filter(function (k) { return !perKr(k); });
    var files = {};
    arr(document.querySelectorAll('[data-files-k]')).forEach(function (t) {
      files[t.getAttribute('data-files-k')] = arr(t.querySelectorAll('tr.item')).map(function (r) {
        var a = {};
        arr(r.attributes).forEach(function (x) { if (x.name.indexOf('data-') === 0) a[x.name] = x.value; });
        return { a: a, s: sig(r), v: camp(r).map(function (el) { return el.value; }) };
      });
    });
    return { camps: camps, files: files, ocults: ocults };
  }

  window.desaEdicions = function () {
    return fetch('/api/edicions/' + encodeURIComponent(cfg.tipus) + '/' + encodeURIComponent(cfg.ref), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recull())
    }).then(function (res) {
      if (res.ok) return;
      return res.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || 'Error desant els canvis'); });
    });
  };

  restaura();

  var btn = document.querySelector('[data-desa-edicions]');
  if (btn) btn.addEventListener('click', function () {
    var orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Desant…';
    window.desaEdicions().then(function () {
      btn.textContent = 'Desat ✓';
      setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1600);
    }).catch(function (e) {
      alert(e && e.message ? e.message : "No s'ha pogut desar");
      btn.textContent = orig; btn.disabled = false;
    });
  });
})();
`;
