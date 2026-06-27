import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// GET /api/guia — manual d'usuari complet en HTML (accés públic per facilitar l'ús)
export async function GET() {
  let md: string;
  try {
    md = readFileSync(join(process.cwd(), 'docs', 'MANUAL_USUARI.md'), 'utf-8');
  } catch {
    return new Response('Manual no trobat', { status: 404 });
  }

  const html = renderMarkdown(md);

  const page = `<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manual d'usuari — Hostal Coll</title>
  <style>
    :root {
      --brand: #7A1F2B;
      --brand-bg: #f5eced;
      --brand-mid: #9a2535;
      --cream: #faf8f5;
      --border: #e5e0d8;
      --text: #1a1612;
      --muted: #6b6560;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--cream); color: var(--text); line-height: 1.75; }
    .header { background: var(--brand); color: white; padding: 2.5rem 2rem; text-align: center; }
    .header h1 { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.02em; }
    .header p { font-size: 0.92rem; opacity: 0.75; margin-top: 0.4rem; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem 5rem; }
    h1 { font-size: 1.9rem; color: var(--brand); margin: 2.5rem 0 1rem; border-bottom: 2px solid var(--brand); padding-bottom: 0.4rem; }
    h2 { font-size: 1.3rem; color: var(--brand); margin: 2rem 0 0.65rem; }
    h3 { font-size: 1.05rem; color: var(--brand-mid); margin: 1.5rem 0 0.5rem; font-weight: 600; }
    h4 { font-size: 0.95rem; color: var(--muted); margin: 1.2rem 0 0.4rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    p { margin: 0.6rem 0; }
    ul, ol { margin: 0.6rem 0 0.6rem 1.6rem; }
    li { margin: 0.25rem 0; }
    strong { color: var(--brand); font-weight: 600; }
    em { font-style: italic; }
    a { color: var(--brand); text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #f0ebe3; border: 1px solid var(--border); border-radius: 4px; padding: 0.1em 0.4em; font-family: 'Consolas', monospace; font-size: 0.85em; color: var(--brand); }
    pre { background: #1e1612; color: #f0e8d8; border-radius: 8px; padding: 1.2rem 1.4rem; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; border: none; color: inherit; font-size: 0.83rem; padding: 0; }
    blockquote { border-left: 4px solid var(--brand); background: var(--brand-bg); padding: 0.8rem 1.1rem; border-radius: 0 6px 6px 0; margin: 1rem 0; color: #5a2530; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    th { background: var(--brand); color: white; padding: 0.6rem 0.9rem; text-align: left; font-weight: 600; }
    td { padding: 0.5rem 0.9rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    tr:nth-child(even) td { background: #f7f3ee; }
    @media (max-width: 600px) { .header { padding: 1.5rem 1rem; } .wrap { padding: 1.5rem 1rem 4rem; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Manual d'usuari — Gestió Hostal Coll</h1>
    <p>Guia completa per a nous usuaris &nbsp;·&nbsp; gestio.hostalcoll.com</p>
  </div>
  <div class="wrap">${html}</div>
</body>
</html>`;

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderMarkdown(md: string): string {
  // Extract and protect fenced code blocks
  const codeBlocks: string[] = [];
  md = md.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => {
    const i = codeBlocks.push(`<pre><code>${esc(code)}</code></pre>`) - 1;
    return `\x00CODE${i}\x00`;
  });

  // Extract and protect inline code
  const inlineCodes: string[] = [];
  md = md.replace(/`([^`\n]+)`/g, (_, code) => {
    const i = inlineCodes.push(`<code>${esc(code)}</code>`) - 1;
    return `\x00IC${i}\x00`;
  });

  // Process tables
  const lines = md.split('\n');
  const out: string[] = [];
  let inTable = false;
  let firstRow = true;

  for (const line of lines) {
    const isRow = /^\|/.test(line) && /\|$/.test(line);
    const isSep = /^\|[\s\-:|]+\|$/.test(line);
    if (isRow && !isSep) {
      if (!inTable) { out.push('<table>'); inTable = true; firstRow = true; }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (firstRow) {
        out.push('<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
        firstRow = false;
      } else {
        out.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
      }
    } else if (isSep) {
      // skip
    } else {
      if (inTable) { out.push('</tbody></table>'); inTable = false; }
      out.push(line);
    }
  }
  if (inTable) out.push('</tbody></table>');
  md = out.join('\n');

  // Headings
  md = md.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  md = md.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  md = md.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  md = md.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Inline formatting
  md = md.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // HR
  md = md.replace(/^---$/gm, '<hr>');

  // Blockquote
  md = md.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Links (strip anchor-only links)
  md = md.replace(/\[([^\]]+)\]\(#[^)]*\)/g, '$1');
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists
  md = md.replace(/^- (.+)$/gm, '<li>$1</li>');
  md = md.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
  md = md.replace(/(<li>[^\0]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  md = md.replace(/(<oli>[^\0]*?<\/oli>\n?)+/g, m => `<ol>${m.replace(/<\/?oli>/g, s => s === '<oli>' ? '<li>' : '</li>')}</ol>`);

  // Paragraphs
  md = md.split(/\n{2,}/).map(block => {
    const t = block.trim();
    if (!t) return '';
    if (/^<(h\d|ul|ol|blockquote|hr|table|pre)/.test(t) || /\x00CODE/.test(t)) return t;
    return `<p>${t.replace(/\n/g, ' ')}</p>`;
  }).join('\n');

  // Restore code blocks and inline codes
  codeBlocks.forEach((cb, i) => { md = md.replace(`\x00CODE${i}\x00`, cb); });
  inlineCodes.forEach((ic, i) => { md = md.replace(`\x00IC${i}\x00`, ic); });

  return md;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
