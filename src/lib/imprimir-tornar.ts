/**
 * Botó «← Tornar» dels fulls d'/imprimir (HTML sol, sense el menú de l'app).
 *
 * En clicar-lo:
 *  - si el full s'ha obert a la MATEIXA pestanya des de l'app → enrere (history.back);
 *  - si s'ha obert en una PESTANYA NOVA (target=_blank / window.open, historial d'1) →
 *    la tanca i tornes a la pestanya de l'app on eres;
 *  - si no es pot (p. ex. s'ha obert l'enllaç a mà) → va a `fallback` (la pàgina de l'app
 *    relacionada: l'estada, la factura…).
 * No surt mai al paper ni quan el full es mostra dins d'una vista prèvia (iframe).
 * Hereta el color del lloc on va (blanc a la barra granate, fosc a la barra blanca).
 */
export function botoTornar(fallback: string, opts: { flotant?: boolean } = {}): string {
  const href = fallback.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<a href="${href}" id="hc-tornar" class="hc-tornar${opts.flotant ? ' hc-tornar-flota' : ''}">← Tornar</a>
<style>
  .hc-tornar{display:inline-flex;align-items:center;gap:4px;margin-right:14px;padding:5px 12px;border:1px solid currentColor;
    border-radius:6px;font:600 14px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:0;color:inherit;
    text-decoration:none;white-space:nowrap;vertical-align:middle;opacity:.9;cursor:pointer}
  .hc-tornar:hover{opacity:1;text-decoration:none}
  .hc-tornar-flota{position:fixed;top:12px;left:12px;z-index:100;margin:0;background:#fff;color:#7A1F2B;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  @media print{.hc-tornar{display:none!important}}
</style>
<script>
(function () {
  var a = document.getElementById('hc-tornar');
  if (!a) return;
  if (window.self !== window.top) { a.style.display = 'none'; return; }
  a.addEventListener('click', function (e) {
    var ref = document.referrer;
    var desDeLApp = !ref || ref.indexOf(location.origin) === 0;
    if (history.length > 1 && desDeLApp) { e.preventDefault(); history.back(); return; }
    if (history.length <= 1) {
      e.preventDefault();
      var desti = a.href;
      window.close();
      setTimeout(function () { location.href = desti; }, 250);
    }
  });
})();
</script>`;
}
