/**
 * Script (text) per a pàgines de taules (p. ex. el llibre d'IVA). Recull cada
 * `.sheet` tal com es veu a pantalla — títol, columnes visibles, valors (també els
 * editats), fila de totals i resum — i l'envia a `/api/imprimir/taules`, que torna
 * un PDF en A4 horitzontal amb la taula a tot l'ample del full.
 * Cal un botó amb id="printPdf" i `window.__pdfTitle`. Sense "${" ni accents greus.
 */
export const TAULES_CLIENT_SCRIPT = `
(function () {
  function net(s) { return String(s || '').replace(/[\\u200B\\u00D7]/g, '').replace(/\\s+/g, ' ').trim(); }
  function visible(el) { return !!el && getComputedStyle(el).display !== 'none'; }
  function valor(td) {
    if (!td) return '';
    var f = td.querySelector('input, textarea, select');
    return net(f ? f.value : td.textContent);
  }

  function full(sheet) {
    var taula = sheet.querySelector('table');
    if (!taula || !taula.tHead) return null;
    var ths = Array.prototype.slice.call(taula.tHead.rows[0].cells);
    var idx = [];
    var cols = [];
    ths.forEach(function (th, i) {
      if (th.classList.contains('c-del') || !visible(th)) return;
      idx.push(i);
      cols.push({ label: net(th.textContent), num: th.classList.contains('n'), w: Math.max(20, th.getBoundingClientRect().width) });
    });
    if (!cols.length) return null;

    var files = [];
    Array.prototype.forEach.call(taula.tBodies[0] ? taula.tBodies[0].rows : [], function (tr) {
      if (!visible(tr)) return;
      var fila = idx.map(function (i) { return valor(tr.cells[i]); });
      if (fila.some(function (v) { return v; })) files.push(fila);
    });

    var peu = [];
    var tf = taula.tFoot && taula.tFoot.rows[0];
    if (tf) {
      var c = 0;
      Array.prototype.forEach.call(tf.cells, function (td) {
        var span = td.colSpan || 1;
        var vis = idx.filter(function (i) { return i >= c && i < c + span; }).length;
        c += span;
        if (!vis || !visible(td)) return;
        peu.push({ t: valor(td), span: vis, num: td.classList.contains('c-n') || td.classList.contains('roN') });
      });
    }

    var resum = [];
    sheet.querySelectorAll('.resum .resum-row').forEach(function (r) {
      if (!visible(r)) return;
      var s = r.querySelectorAll('span');
      if (s.length >= 2) resum.push({ k: net(s[0].textContent), v: net(s[s.length - 1].textContent), grand: r.classList.contains('grand') });
    });

    var t = sheet.querySelector('.doc-title');
    var p = sheet.querySelector('.period');
    return { titol: net(t ? t.textContent : 'Document'), periode: net(p ? p.textContent : ''), cols: cols, files: files, peu: peu, resum: resum };
  }

  var btn = document.getElementById('printPdf');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var label = btn.textContent;
    // Obre la pestanya ara (dins del clic) perquè el navegador no la bloquegi.
    var w = window.open('', '_blank');
    btn.disabled = true;
    btn.textContent = 'Generant…';
    var fulls = Array.prototype.map.call(document.querySelectorAll('.sheet'), full).filter(Boolean);
    fetch('/api/imprimir/taules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titol: window.__pdfTitle || 'Document', fulls: fulls })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          throw new Error(d.error || 'No s\\'ha pogut generar el PDF');
        });
      }
      return res.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (w) w.location.href = url; else window.location.href = url;
    }).catch(function (e) {
      if (w) w.close();
      alert(e && e.message ? e.message : 'No s\\'ha pogut generar el PDF');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = label;
    });
  });
})();
`;
