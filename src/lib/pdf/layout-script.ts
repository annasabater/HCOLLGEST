/**
 * Script (text) que injecta la pàgina del llibre de registre. Recorre cada `.sheet`
 * i en dibuixa la maquetació REAL del navegador (caixes, vores, paraules, imatges)
 * en punts d'una pàgina A4; el servidor la torna a pintar a `/api/imprimir/layout`.
 * Cada `.sheet` és una pàgina. Cal un botó amb id="printPdf".
 */
export const LAYOUT_CLIENT_SCRIPT = `
(function () {
  var PW = 595.28, PH = 841.89;

  function rgba(s) {
    var m = /rgba?\\(([^)]+)\\)/.exec(s || '');
    if (!m) return null;
    var p = m[1].split(',').map(function (x) { return parseFloat(x); });
    if (p.length > 3 && p[3] === 0) return null;
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + h(p[0]) + h(p[1]) + h(p[2]);
  }
  function r2(v) { return Math.round(v * 100) / 100; }

  function pageOf(sheet) {
    var sr = sheet.getBoundingClientRect();
    var s = Math.min(PW / sr.width, PH / sr.height);
    var items = [];
    function X(v) { return r2((v - sr.left) * s); }
    function Y(v) { return r2((v - sr.top) * s); }

    var els = sheet.querySelectorAll('*');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'BR') continue;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (r.width < 0.5 || r.height < 0.5) continue;

      if (tag === 'IMG') {
        if (String(el.src).indexOf('data:image/') === 0) {
          items.push({ k: 'i', x: X(r.left), y: Y(r.top), w: r2(r.width * s), h: r2(r.height * s), src: el.src });
        }
        continue;
      }
      var bg = rgba(cs.backgroundColor);
      if (bg && bg !== '#ffffff') {
        items.push({ k: 'b', x: X(r.left), y: Y(r.top), w: r2(r.width * s), h: r2(r.height * s), f: bg });
      }
      var sides = [
        ['Top', r.left, r.top, r.right, r.top],
        ['Bottom', r.left, r.bottom, r.right, r.bottom],
        ['Left', r.left, r.top, r.left, r.bottom],
        ['Right', r.right, r.top, r.right, r.bottom]
      ];
      for (var k = 0; k < sides.length; k++) {
        var sd = sides[k];
        var bw = parseFloat(cs['border' + sd[0] + 'Width']) || 0;
        if (bw > 0 && cs['border' + sd[0] + 'Style'] !== 'none') {
          items.push({
            k: 'l', x1: X(sd[1]), y1: Y(sd[2]), x2: X(sd[3]), y2: Y(sd[4]),
            lw: r2(Math.max(0.4, bw * s)), c: rgba(cs['border' + sd[0] + 'Color']) || '#2b2b2b'
          });
        }
      }
    }

    var tw = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = tw.nextNode())) {
      var txt = node.textContent;
      if (!txt || !/\\S/.test(txt)) continue;
      var pe = node.parentElement;
      if (!pe || pe.tagName === 'SCRIPT' || pe.tagName === 'STYLE') continue;
      var pcs = getComputedStyle(pe);
      if (pcs.display === 'none' || pcs.visibility === 'hidden') continue;
      var size = r2((parseFloat(pcs.fontSize) || 10) * s);
      var bold = parseInt(pcs.fontWeight, 10) >= 600 || pcs.fontWeight === 'bold';
      var col = rgba(pcs.color) || '#111111';
      var re = /\\S+/g, m;
      while ((m = re.exec(txt))) {
        var rg = document.createRange();
        rg.setStart(node, m.index);
        rg.setEnd(node, m.index + m[0].length);
        var rects = rg.getClientRects();
        if (rects.length === 1) {
          var q = rects[0];
          items.push({ k: 't', x: X(q.left), y: Y(q.top), w: r2(q.width * s), h: r2(q.height * s), t: m[0], sz: size, b: bold, c: col });
        } else {
          // paraula partida en vàries línies: lletra a lletra
          for (var ci = 0; ci < m[0].length; ci++) {
            var cr = document.createRange();
            cr.setStart(node, m.index + ci);
            cr.setEnd(node, m.index + ci + 1);
            var q2 = cr.getClientRects()[0];
            if (q2) items.push({ k: 't', x: X(q2.left), y: Y(q2.top), w: r2(q2.width * s), h: r2(q2.height * s), t: m[0].charAt(ci), sz: size, b: bold, c: col });
          }
        }
        if (pcs.textDecorationLine && pcs.textDecorationLine.indexOf('underline') >= 0 && rects.length) {
          var u = rects[0];
          items.push({ k: 'l', x1: X(u.left), y1: Y(u.bottom), x2: X(u.right), y2: Y(u.bottom), lw: 0.5, c: col });
        }
      }
    }
    return { items: items };
  }

  var btn = document.getElementById('printPdf');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var label = btn.textContent;
    var w = window.open('', '_blank');
    btn.disabled = true;
    btn.textContent = 'Generant…';
    var sheets = Array.prototype.slice.call(document.querySelectorAll('.sheet'));
    var body = {
      ref: window.__pdfRef || '',
      title: window.__pdfTitle || 'Document',
      pages: sheets.map(pageOf)
    };
    fetch('/api/imprimir/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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
