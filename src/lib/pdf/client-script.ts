/**
 * Script (text) que injecten les pàgines d'impressió. Llegeix el document tal com
 * està A PANTALLA (inclosos els canvis sense desar), l'envia a `/api/imprimir/pdf`
 * i obre el PDF net. Es defineix com a text i cada pàgina l'incrusta tal qual amb ${PDF_CLIENT_SCRIPT} (no
 * es torna a escapar). No hi pot haver cap "${" ni accent greu dins.
 *
 * Cada pàgina ha de tenir un botó amb id="printPdf" i cridar-hi `window.__pdfRef`/
 * `window.__pdfTitle` (definits just abans) per al nom i la referència.
 */
export const PDF_CLIENT_SCRIPT = `
(function () {
  function val(el) {
    if (!el) return '';
    var v = typeof el.value === 'string' ? el.value : el.textContent;
    return String(v || '').replace(/\\s+/g, ' ').trim();
  }
  // Text visible d'un contenidor en ordre: cada input/textarea i cada tros de text.
  function items(root) {
    var out = [];
    if (!root) return out;
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) {
          var t = c.textContent.replace(/\\s+/g, ' ').trim();
          if (t) out.push(t);
        } else if (c.nodeType === 1) {
          var tag = c.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') {
            var v = String(c.value || '').replace(/\\s+/g, ' ').trim();
            if (v) out.push(v);
          } else if (tag !== 'SCRIPT' && tag !== 'STYLE' && tag !== 'BUTTON' && tag !== 'IMG') {
            walk(c);
          }
        }
      }
    })(root);
    return out;
  }
  function first(root) { return items(root)[0] || ''; }

  function collect() {
    var cs = getComputedStyle(document.documentElement);
    var accent = cs.getPropertyValue('--accent').trim();
    var ink = cs.getPropertyValue('--ink').trim();
    var q = function (s, r) { return (r || document).querySelector(s); };
    var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    var doc = {
      ref: window.__pdfRef || '',
      title: window.__pdfTitle || 'Document',
      accent: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#7A1F2B',
      ink: /^#[0-9a-fA-F]{6}$/.test(ink) ? ink : '#2C1810',
      brand: first(q('.brand')) || 'HOSTAL COLL',
      brandSub: first(q('.brand-sub')),
      issuer: items(q('.issuer')),
      billLabel: '',
      bill: [],
      docTitle: first(q('.meta-title')),
      badge: items(q('.meta-badge')).join(' '),
      meta: qa('.meta-row').map(function (r) {
        return { k: first(q('.k', r)), v: first(q('.v', r)) };
      }).filter(function (m) { return m.k || m.v; }),
      cols: [],
      rows: [],
      summary: []
    };

    var bill = items(q('.bill-to'));
    doc.billLabel = bill[0] || '';
    doc.bill = bill.slice(1);

    var ths = qa('#items thead th').filter(function (th) { return th.getAttribute('aria-hidden') !== 'true'; });
    doc.cols = ths.map(function (th) {
      var cls = th.className || '';
      return {
        label: th.textContent.replace(/\\s+/g, ' ').trim(),
        kind: cls.indexOf('c-qty') >= 0 ? 'qty' : cls.indexOf('c-amt') >= 0 ? 'amt' : 'text'
      };
    });
    qa('#items tbody tr.item').forEach(function (tr) {
      var tds = qa('td', tr).filter(function (td) { return !td.classList.contains('it-del'); });
      var cells = [];
      var detail = '';
      tds.forEach(function (td) {
        var fields = qa('input, textarea', td);
        cells.push(fields.length ? val(fields[0]) : val(td));
        if (fields.length > 1) detail = val(fields[1]);
      });
      if (cells.some(function (c) { return c; })) doc.rows.push({ cells: cells, detail: detail || undefined });
    });

    qa('.summary .sum-row').forEach(function (r) {
      doc.summary.push({
        label: items(q('.lab', r)).join(''),
        value: val(q('.val', r)),
        grand: r.classList.contains('grand')
      });
    });

    var cb = q('.custodia-block');
    if (cb) {
      var tot = q('.custodia-total', cb);
      var tspans = tot ? qa('span', tot) : [];
      doc.extra = {
        title: val(q('.custodia-title', cb)),
        rows: qa('.custodia-row', cb).map(function (r) {
          return { k: val(q('.custodia-lab', r)), v: val(q('.custodia-val', r)) };
        }),
        total: tspans.length >= 2 ? { k: val(tspans[0]), v: val(tspans[1]) } : undefined
      };
    }

    var nw = q('.notes-wrap');
    if (nw) {
      var nf = q('textarea, input', nw);
      if (nf && val(nf)) doc.notes = { label: val(q('.notes-lab', nw)), text: String(nf.value || '').trim() };
    }

    // Nota sota els totals (p. ex. "Dipòsit en custòdia, sense IVA…").
    var ivn = q('.summary .iva-note');
    if (!doc.notes && ivn && val(ivn)) doc.notes = { label: 'Nota', text: val(ivn) };

    var pay = q('.footer .pay');
    if (pay) doc.pay = { label: val(q('.pay-lab', pay)), value: items(pay).slice(1).join(' ') };

    var qr = q('.qr-block');
    if (qr) {
      var img = q('img', qr);
      if (img && String(img.src).indexOf("data:image/png") === 0) {
        doc.qr = { png: img.src, lines: qa('p', qr).map(val).filter(Boolean) };
      }
    }
    return doc;
  }

  var btn = document.getElementById('printPdf');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var label = btn.textContent;
    // Obre la pestanya ara (dins del clic) perquè el navegador no la bloquegi.
    var w = window.open('', '_blank');
    btn.disabled = true;
    btn.textContent = 'Generant…';
    // Alguns documents (pressupost) es desen abans de generar el PDF.
    Promise.resolve().then(function () { return window.__beforePdf ? window.__beforePdf() : null; }).then(function () {
      return fetch('/api/imprimir/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collect())
    });
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
