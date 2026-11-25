import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { movimentsCompte } from '@/lib/services/compte-treballador';
import { resumeixDies, agrupaPerMes, type DiaPagament, type TascaDia } from '@/lib/neteja-pagaments';

export const dynamic = 'force-dynamic';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dllarg = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dcurt = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
const dccurt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const RE = /^\d{4}-\d{2}-\d{2}$/;
const DIES = ['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds'];
const MESOS = ['GENER', 'FEBRER', 'MARÇ', 'ABRIL', 'MAIG', 'JUNY', 'JULIOL', 'AGOST', 'SETEMBRE', 'OCTUBRE', 'NOVEMBRE', 'DESEMBRE'];

/**
 * GET /imprimir/neteja-pagaments?treballador=<id>&mode=pendent|desde[&desde=YYYY-MM-DD][&auto=1]
 * Llistat en PDF del compte d'una treballadora de neteja (només ADMIN):
 *  - «pendent»: només els dies amb alguna cosa per pagar, amb el total pendent.
 *  - «desde»: tots els dies des de la data (o des del primer, si no se'n dóna), per mesos, amb
 *    el que ja s'ha pagat i el que falta. Només lectura: no canvia res.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') return new Response('Només l\'administrador pot veure els pagaments del personal.', { status: 403 });

  const p = new URL(req.url).searchParams;
  const treballadorId = p.get('treballador') ?? '';
  const mode = p.get('mode') === 'pendent' ? 'pendent' : 'desde';
  const desde = RE.test(p.get('desde') ?? '') ? p.get('desde')! : undefined;
  const fins = RE.test(p.get('fins') ?? '') ? p.get('fins')! : undefined;
  const auto = p.get('auto') === '1';
  const avui = new Date().toISOString().slice(0, 10);

  const treballador = treballadorId
    ? await prisma.treballador.findFirst({ where: { id: treballadorId, deletedAt: null }, select: { id: true, nom: true } })
    : null;
  if (!treballador) return new Response('Treballador no trobat', { status: 404 });

  const rang = mode === 'desde' ? { ...(desde ? { desde } : {}), ...(fins ? { fins } : {}) } : {};
  const dataFiltre =
    rang.desde || rang.fins
      ? {
          ...(rang.desde ? { gte: new Date(`${rang.desde}T00:00:00.000Z`) } : {}),
          ...(rang.fins ? { lt: new Date(new Date(`${rang.fins}T00:00:00.000Z`).getTime() + 86_400_000) } : {}),
        }
      : undefined;

  const [moviments, tasquesRaw, notesRaw] = await Promise.all([
    movimentsCompte(treballador.id, rang),
    tasques(treballador.id, dataFiltre),
    prisma.notaNeteja.findMany({ where: { ambit: 'DIA', ...(dataFiltre ? { data: dataFiltre } : {}) }, select: { data: true, text: true } }),
  ]);

  const notes = new Map(notesRaw.map((n) => [n.data.toISOString().slice(0, 10), n.text]));
  const dies = resumeixDies(moviments, tasquesRaw, notes, mode === 'pendent');
  const mesos = agrupaPerMes(dies);

  const tot = dies.reduce(
    (a, d) => ({ fet: a.fet + d.total, pagat: a.pagat + d.pagat, pendent: a.pendent + d.pendent, sortides: a.sortides + d.sortides, mant: a.mant + d.manteniments }),
    { fet: 0, pagat: 0, pendent: 0, sortides: 0, mant: 0 },
  );
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const primer = dies[0]?.dia ?? null; // dies ordenats de l'antic al recent

  const subtitol =
    mode === 'pendent'
      ? 'Pendent de pagament'
      : desde && fins
        ? `Del ${dllarg(desde)} al ${dllarg(fins)}`
        : desde
          ? `Des del ${dllarg(desde)}`
          : fins
            ? `Fins al ${dllarg(fins)}`
            : primer
              ? `Des del primer dia (${dllarg(primer)})`
              : 'Des del primer dia';

  const estat = (d: DiaPagament) =>
    d.pendent <= 0
      ? `<span class="ok">pagat${d.pagatEl ? ` ${dccurt(d.pagatEl)}` : ''}</span>`
      : d.pagat > 0
        ? `<span class="pp">parcial</span>`
        : `<span class="pp">per pagar</span>`;

  const fila = (d: DiaPagament, i: number) => {
    const dow = DIES[new Date(`${d.dia}T00:00:00Z`).getUTCDay()];
    const habs = d.detall.length
      ? d.detall
          .map((h) => `<span class="rh">${esc(h.etiqueta)}${h.id ? `<button type="button" class="lap no-print" data-id="${esc(h.id)}" data-nota="${esc(h.nota ?? '')}" title="${h.nota ? 'Canvia l’observació' : 'Afegeix una observació'}">✎</button>` : ''}</span>`)
          .join(' · ')
      : '<span class="g">—</span>';
    const nota = d.nota ? `<div class="nt">${esc(d.nota)}</div>` : '';
    const notesHab = d.detall.some((h) => h.nota)
      ? `<div class="nt">${d.detall
          .filter((h) => h.nota)
          .map((h) => `<span class="nn" data-id="${esc(h.id ?? '')}" data-nota="${esc(h.nota ?? '')}" title="Clica per canviar-la">${h.habitacio ? `Hab. ${esc(h.habitacio)}` : 'Zones'}: ${esc(h.nota)}</span>`)
          .join(' · ')}</div>`
      : '';
    const imp = mode === 'pendent' ? d.pendent : d.total;
    return `<div class="fila${i % 2 ? ' alt' : ''}"><span class="dia"><b>${dow} ${dcurt(d.dia)}</b></span><span class="hab">${habs}${notesHab}${nota}</span><span class="d">${d.bugaderia > 0 ? eur(d.bugaderia) : '—'}</span><span class="d b">${eur(imp)}</span>${mode === 'pendent' ? '' : `<span class="d">${estat(d)}</span>`}</div>`;
  };

  const cos = mesos.length
    ? mesos
        .map((m) => {
          const tm = m.dies.reduce((a, d) => a + (mode === 'pendent' ? d.pendent : d.total), 0);
          return `<div class="mes"><div class="mt">${MESOS[Number(m.mes.slice(5, 7)) - 1]} ${m.mes.slice(0, 4)}</div>${m.dies.map(fila).join('')}<div class="tm"><span>Total ${MESOS[Number(m.mes.slice(5, 7)) - 1]!.toLowerCase()} · ${m.dies.length} ${m.dies.length === 1 ? 'dia' : 'dies'}</span><b>${eur(r2(tm))}</b></div></div>`;
        })
        .join('')
    : `<p class="buit">${mode === 'pendent' ? 'No hi ha res pendent de pagament.' : 'Cap neteja en aquest període.'}</p>`;

  const resum =
    mode === 'pendent'
      ? `<div class="tots un"><div><div class="k pend">TOTAL PENDENT</div><div class="v pend">${eur(r2(tot.pendent))}</div><div class="s">${dies.length} ${dies.length === 1 ? 'dia' : 'dies'} · ${tot.sortides} ${tot.sortides === 1 ? 'sortida' : 'sortides'} · ${tot.mant} manteniments</div></div></div>`
      : `<div class="tots"><div><div class="k">TOTAL FET</div><div class="v">${eur(r2(tot.fet))}</div><div class="s">${dies.length} dies · ${tot.sortides} sortides · ${tot.mant} manteniments</div></div><div><div class="k okc">JA PAGAT</div><div class="v okc">${eur(r2(tot.pagat))}</div></div><div><div class="k pend">PENDENT</div><div class="v pend">${eur(r2(tot.pendent))}</div></div></div>`;

  const html = `<!doctype html>
<html lang="ca"><head><meta charset="utf-8"><title>Neteja · ${esc(treballador.nom)} · ${esc(subtitol)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 12px/1.4 Arial, Helvetica, sans-serif; color: #2b2b2b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #7a1f2b; padding-bottom: 10px; }
.marca { font-size: 9.5px; font-weight: 700; letter-spacing: .28em; color: #7a1f2b; }
h1 { margin: 2px 0 0; font-size: 22px; font-weight: 600; color: #222; }
.sub { font-size: 12px; color: #666; }
.per { text-align: right; font-size: 11px; color: #777; }
.cap, .fila { display: grid; grid-template-columns: 70px 1fr 78px 86px ${mode === 'pendent' ? '' : '86px'}; gap: 8px; align-items: baseline; }
.cap { padding: 14px 0 5px; font-size: 9px; font-weight: 700; letter-spacing: .12em; color: #777; border-bottom: 1px solid #ddd; }
.cap .d, .fila .d { text-align: right; }
.mes { break-inside: avoid-page; margin-top: 10px; }
.mt { font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #7a1f2b; padding-bottom: 3px; }
.fila { padding: 6px 4px; border-bottom: 1px solid #f0f0f0; break-inside: avoid; }
.fila.alt { background: #f9eff0; }
.dia b { color: #222; }
.g { color: #aaa; }
.nt { color: #777; font-style: italic; font-size: 10.5px; }
.b { font-weight: 700; }
.lap { margin-left: 3px; padding: 0 3px; font-size: 11px; color: #7a1f2b; background: none; border: 0; cursor: pointer; opacity: 0; }
.fila:hover .lap, .lap:focus { opacity: 1; }
.nn { cursor: pointer; }
.nn:hover { color: #7a1f2b; text-decoration: underline; }
.ni { font: 12px Arial, sans-serif; border: 1px solid #7a1f2b; padding: 3px 6px; width: 100%; max-width: 420px; outline: none; margin-top: 3px; }
.ok { color: #047857; font-weight: 700; font-size: 11px; }
.pp { color: #7a1f2b; font-weight: 700; font-size: 11px; }
.tm { display: flex; justify-content: space-between; padding: 6px 4px; font-size: 11px; color: #555; border-bottom: 1px solid #ddd; }
.tots { margin-top: 16px; border-top: 2px solid #1a1a1a; padding-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; break-inside: avoid; }
.tots.un { grid-template-columns: 1fr; }
.k { font-size: 9px; font-weight: 700; letter-spacing: .14em; color: #777; }
.v { font-size: 20px; font-weight: 700; }
.s { font-size: 11px; color: #777; }
.okc { color: #047857; } .pend { color: #7a1f2b; }
.buit { color: #888; padding: 20px 4px; }
footer { margin-top: 12px; font-size: 9.5px; color: #999; border-top: 1px solid #e4e4e4; padding-top: 6px; }
.barra { position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; gap: 10px; max-width: 210mm; margin: -18px auto 12px; padding: 10px 0; background: #e9e9e9; }
.barra a, .barra button { font: 600 14px Arial, sans-serif; padding: 9px 16px; border: 1px solid #7a1f2b; text-decoration: none; cursor: pointer; }
.barra a { color: #7a1f2b; background: #fff; }
.barra button { color: #fff; background: #7a1f2b; }
@media print { .no-print { display: none !important; } }
@media screen {
  body { background: #e9e9e9; padding: 18px 12px; }
  .full { max-width: 210mm; margin: 0 auto; background: #fff; padding: 14mm; min-height: 297mm; box-shadow: 0 2px 14px rgba(0,0,0,.18); }
}
</style></head>
<body>
<div class="barra no-print"><a href="/personal" id="torna">← Tornar</a><button type="button" onclick="window.print()">Imprimir / desar PDF</button></div>
<div class="full">
<header>
  <div><div class="marca">HOSTAL COLL</div><h1>Neteja · ${esc(treballador.nom)}</h1><div class="sub">${esc(subtitol)}</div></div>
  <div class="per">Imprès el ${dllarg(avui)}</div>
</header>
<div class="cap"><span>DIA</span><span>HABITACIONS</span><span class="d">BUGADERIA</span><span class="d">${mode === 'pendent' ? 'PENDENT' : 'IMPORT'}</span>${mode === 'pendent' ? '' : '<span class="d">ESTAT</span>'}</div>
${cos}
${resum}
<footer>Només lectura. L'import de cada dia és el de la jornada de neteja més la bugaderia. «Parcial» = una part pagada i una part per pagar.</footer>
</div>
<script>
(function(){
  // Editar les observacions de les neteges (les mateixes que a Neteja): ✎ o clic a l'observació.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var el = t.closest ? t.closest('.lap, .nn') : null;
    if (!el || document.querySelector('.ni')) return;
    var id = el.getAttribute('data-id');
    if (!id) return;
    var inp = document.createElement('input');
    inp.className = 'ni no-print'; inp.maxLength = 500; inp.placeholder = 'Observació (Enter per desar, buit per esborrar)';
    inp.value = el.getAttribute('data-nota') || '';
    var cel = el.closest('.hab');
    cel.appendChild(inp); inp.focus();
    var fet = false;
    function desa() {
      if (fet) return; fet = true;
      fetch('/api/tasques-neteja/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: inp.value.trim() || null }) })
        .then(function (r) { if (!r.ok) throw new Error(); location.reload(); })
        .catch(function () { alert('No s’ha pogut desar l’observació.'); inp.remove(); });
    }
    inp.addEventListener('blur', desa);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
      if (e.key === 'Escape') { fet = true; inp.remove(); }
    });
  });
  var a = document.getElementById('torna');
  a.addEventListener('click', function (e) {
    if (history.length > 1 && document.referrer.indexOf(location.origin) === 0) { e.preventDefault(); history.back(); }
  });
${auto ? '  window.addEventListener("load",function(){setTimeout(function(){window.print()},300)});' : ''}
})();
</script>
</body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/** Tasques FETES de la treballadora (per dir les habitacions de cada dia). */
async function tasques(treballadorId: string, data: { gte?: Date; lt?: Date } | undefined): Promise<TascaDia[]> {
  const rows = await prisma.tascaNeteja.findMany({
    where: { assignadaA: treballadorId, estat: 'FETA', ...(data ? { data } : {}) },
    select: { id: true, data: true, tipus: true, notes: true, habitacio: { select: { nom: true } } },
  });
  return rows.map((t) => ({ id: t.id, dia: t.data.toISOString().slice(0, 10), habitacio: t.habitacio?.nom ?? null, tipus: t.tipus, nota: t.notes }));
}
