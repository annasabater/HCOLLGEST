import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { botoTornar } from '@/lib/imprimir-tornar';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { getBalanc, getBalancDetall, parseCriteri } from '@/lib/services/dashboard';
import { METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';

export const dynamic = 'force-dynamic';

type Mode = 'sense' | 'amb' | 'tot';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number, dec = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true });
const eur = (n: number) => `${fmt(r2(n), Number.isInteger(r2(n)) ? 0 : 2)} €`;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : '—');
const dllarg = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const iso = (v: string | null, def: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : def);
const MESOS = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];

const C = { ing: '#1f8a5b', des: '#d1495b', ben: '#7a1f2b', reb: '#0f766e', pag: '#b45309', tot: '#0f5f5a' };
const rallat = (c: string) => `background:repeating-linear-gradient(135deg,${c} 0 3px,${c}33 3px 6px)`;

interface Mes { label: string; ing: number; des: number; ben: number; reb: number; pag: number }

/** Barres mes a mes amb els imports escrits; amb fiances, la part de fiança va rallada a sobre. */
function graficMesos(mesos: Mes[], ambFiances: boolean): string {
  const H = 170;
  const max = Math.max(1, ...mesos.map((m) => Math.max(m.ing + (ambFiances ? m.reb : 0), m.des + (ambFiances ? m.pag : 0))));
  const alt = (v: number) => Math.round((v / max) * H);
  const k = (v: number) => (v >= 10000 ? `${fmt(v / 1000, 1)}k` : fmt(Math.round(v)));
  const cols = mesos
    .map((m) => {
      const barra = (v: number, f: number, cSol: string, cF: string) => {
        const nums = `<div class="eti" style="color:${cSol}">${v > 0 ? k(v) : ''}</div>`;
        const fi = ambFiances && f > 0 ? `<div style="height:${alt(f)}px;${rallat(cF)}"></div>` : '';
        const etiFi = ambFiances && f > 0 ? `<div class="eti" style="color:${cF}">+${k(f)}</div>` : '';
        return `<div class="b"><div class="stack">${etiFi}${nums}${fi}<div style="height:${alt(v)}px;background:${cSol}"></div></div></div>`;
      };
      const marcaBen = `<div class="pt" style="bottom:${Math.max(0, alt(Math.max(0, m.ben)))}px"></div>`;
      return `<div class="m"><div class="bars">${barra(m.ing, m.reb, C.ing, C.reb)}${barra(m.des, m.pag, C.des, C.pag)}${marcaBen}</div><div class="ml">${esc(m.label)}</div></div>`;
    })
    .join('');
  return `<div class="grafic" style="height:${H + 34}px">${cols}</div>`;
}

function barresLlista(items: { nom: string; v: number; f?: number }[], color: string): string {
  const total = items.reduce((a, i) => a + i.v, 0);
  const max = Math.max(1, ...items.map((i) => i.v));
  return items
    .map(
      (i) =>
        `<div class="bl"><div class="blr"><span>${esc(i.nom)}</span><span><strong>${eur(i.v)}</strong> <em>${pct(i.v, total)}</em>${i.f ? ` <em class="fi">+${eur(i.f)} fiança</em>` : ''}</span></div><div class="pis"><div style="width:${Math.round((i.v / max) * 100)}%;background:${color}"></div></div></div>`,
    )
    .join('');
}

function kpi(titol: string, valor: string, sota: string, color: string): string {
  return `<div class="kpi" style="border-top:4px solid ${color}"><div class="kt" style="color:${color}">${titol}</div><div class="kv">${valor}</div><div class="ks">${sota}</div></div>`;
}

function cascada(ing: number, des: number, reb: number, pag: number): string {
  const ben = ing - des;
  const tot = ben + reb;
  const caixa = tot - pag;
  const passos = [
    { l: 'Ingressos', a: 0, b: ing, v: ing, c: C.ing },
    { l: 'Despeses', a: ing, b: ben, v: -des, c: C.des, s: true },
    { l: 'Benefici real', a: 0, b: ben, v: ben, c: C.ben },
    { l: '+ Fiances rebudes', a: ben, b: tot, v: reb, c: C.reb, s: true, r: true },
    { l: 'Benefici total', a: 0, b: tot, v: tot, c: C.tot },
    { l: '− Fiances pagades', a: tot, b: caixa, v: -pag, c: C.pag, s: true, r: true },
    { l: 'Moviment de caixa', a: 0, b: caixa, v: caixa, c: caixa >= 0 ? C.ing : C.des },
  ];
  const H = 140;
  const max = Math.max(1, ...passos.flatMap((p) => [p.a, p.b]));
  const y = (v: number) => Math.round((Math.max(0, v) / max) * H);
  const cols = passos
    .map((p, i) => {
      const lo = Math.min(p.a, p.b), hi = Math.max(p.a, p.b);
      const bottom = y(lo), h = Math.max(2, y(hi) - y(lo));
      const estil = p.r ? rallat(p.c) : `background:${p.c}`;
      const signe = p.s && p.v > 0 ? '+' : p.v < 0 ? '−' : '';
      return `<div class="cc"><div class="ccb"><div class="cbar" style="bottom:${bottom}px;height:${h}px;${estil}"></div><div class="cn" style="bottom:${bottom + h + 3}px;color:${p.r ? p.c : '#111'}">${signe}${fmt(Math.abs(Math.round(p.v)))}</div></div><div class="cl${i === passos.length - 1 ? ' bold' : ''}">${esc(p.l)}</div></div>`;
    })
    .join('');
  return `<div class="cascada" style="height:${H + 22}px">${cols}</div>`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const p = new URL(req.url).searchParams;
  const avui = new Date().toISOString().slice(0, 10);
  const desde = iso(p.get('desde'), `${avui.slice(0, 4)}-01-01`);
  const fins = iso(p.get('fins'), avui);
  const restr = teVistaRestringida(user);
  // Els comptes de propietat no veuen fiances.
  const mode: Mode = restr ? 'sense' : p.get('fiances') === 'amb' ? 'amb' : p.get('fiances') === 'tot' ? 'tot' : 'sense';
  const auto = p.get('auto') === '1';
  const opts = { excloureMetodeAltres: restr, criteri: parseCriteri(p.get('criteri')) };

  const start = new Date(`${desde}T00:00:00`);
  const end = new Date(`${fins}T23:59:59.999`);
  if (end < start) return new Response('La data final ha de ser posterior a la inicial', { status: 400 });
  const nMesos = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  if (nMesos > 24) return new Response('Període massa llarg (màxim 24 mesos)', { status: 400 });

  const d = await getBalancDetall(start, end, opts);

  const mesos: Mes[] = [];
  for (let i = 0; i < nMesos; i++) {
    const y = start.getFullYear() + Math.floor((start.getMonth() + i) / 12);
    const m = (start.getMonth() + i) % 12;
    const ini = i === 0 ? start : new Date(y, m, 1);
    const fi = i === nMesos - 1 ? end : new Date(y, m + 1, 0, 23, 59, 59, 999);
    const b = await getBalanc(ini, fi, opts);
    const des = r2(b.despeses + b.personal);
    mesos.push({
      label: nMesos > 12 || start.getFullYear() !== end.getFullYear() ? `${MESOS[m]} ${String(y).slice(2)}` : MESOS[m]!,
      ing: b.ingressos, des, ben: r2(b.ingressos - des), reb: b.retencions, pag: b.despesesFianca,
    });
  }

  const ing = d.ingressos;
  const des = r2(d.despeses + d.personal);
  const ben = r2(ing - des);
  const reb = d.retencions;
  const pag = d.despesesFianca;
  const caixa = r2(ben + reb - pag);
  const ind = d.indicadors;

  const cats = [
    ...d.despesesPerCategoria.map((c) => ({ nom: c.categoria, v: c.import, f: d.fiancesPerCategoria.find((x) => x.categoria === c.categoria)?.import })),
    ...(d.personal > 0 ? [{ nom: 'Personal', v: d.personal, f: undefined as number | undefined }] : []),
  ].sort((a, b) => b.v - a.v);
  const metodes = Object.entries(d.ingressosPerMetode)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ nom: METODE_COBRAMENT_LABELS[k as keyof typeof METODE_COBRAMENT_LABELS] ?? k, v, f: d.retencionsPerMetode[k] }))
    .sort((a, b) => b.v - a.v);

  const millor = [...mesos].sort((a, b) => b.ing - a.ing)[0];
  const capcalera = (sub: string) =>
    `<div class="cap"><div><div class="marca">HOSTAL COLL</div><div class="titol">Balanç</div></div><div class="per">${dllarg(desde)} – ${dllarg(fins)}<br><span>${sub}</span><br><span>Imprès el ${dllarg(avui)}</span></div></div>`;
  const peu = (n: number, t: number) => `<div class="peu"><span>Hostal Coll · informe comptable</span><span>Pàgina ${n} de ${t}</span></div>`;

  // ── Pàgina «sense fiances»: el resultat real
  const pSense = (n: number, t: number) => `<section class="pag">${capcalera(mode === 'tot' ? 'Sense fiances · el resultat real' : 'Sense fiances')}
    <div class="kpis">${kpi('INGRESSOS', eur(ing), `${mesos.length} ${mesos.length === 1 ? 'mes' : 'mesos'}`, C.ing)}${kpi('DESPESES', eur(des), 'personal inclòs', C.des)}${kpi('BENEFICI', eur(ben), 'ingressos − despeses', C.ben)}${kpi('MARGE', pct(ben, ing), 'del que ingresses, et queda', '#444')}</div>
    <div class="caixa"><div class="ct"><span>MES A MES</span><span class="lg"><b style="color:${C.ing}">■</b> ingressos &nbsp;<b style="color:${C.des}">■</b> despeses &nbsp;<b style="color:${C.ben}">●</b> benefici</span></div>${graficMesos(mesos, false)}${millor && millor.ing > 0 ? `<div class="nota">Millor mes: <strong>${esc(millor.label)}</strong> (${eur(millor.ing)} d'ingressos).</div>` : ''}</div>
    <div class="dues"><div class="caixa"><div class="ct"><span>EN QUÈ ES VAN LES DESPESES</span></div>${barresLlista(cats, C.des) || '<div class="nota">Cap despesa.</div>'}</div>
    <div class="caixa"><div class="ct"><span>COM T'HAN PAGAT</span></div>${barresLlista(metodes, C.ing) || '<div class="nota">Cap ingrés.</div>'}</div></div>
    ${peu(n, t)}</section>`;

  // ── Pàgina «amb fiances»: el que ha entrat i sortit de veritat
  const pAmb = (n: number, t: number) => `<section class="pag">${capcalera(mode === 'tot' ? 'Amb fiances · el que ha entrat i sortit' : 'Amb fiances')}
    <div class="kpis kpis7">${kpi('INGRESSOS', eur(ing), 'cobrat', C.ing)}${kpi('DESPESES', eur(-des), 'personal inclòs', C.des)}${kpi('BENEFICI REAL', eur(ben), `marge ${pct(ben, ing)}`, C.ben)}${kpi('+ FIANCES REBUDES', eur(reb), 'en custòdia, recuperables', C.reb)}${kpi('BENEFICI TOTAL', eur(ben + reb), 'benefici real + fiances', C.tot)}${kpi('− FIANCES PAGADES', eur(-pag), 'a proveïdors, recuperables', C.pag)}${kpi('MOVIMENT DE CAIXA', eur(caixa), 'entrat − sortit', caixa >= 0 ? C.ing : C.des)}</div>
    <div class="caixa"><div class="ct"><span>MES A MES, AMB LES FIANCES</span><span class="lg"><b style="color:${C.ing}">■</b> ingressos &nbsp;<b style="color:${C.des}">■</b> despeses &nbsp;<b style="color:${C.reb}">▨</b> fiança rebuda &nbsp;<b style="color:${C.pag}">▨</b> fiança pagada &nbsp;<b style="color:${C.ben}">●</b> benefici</span></div>${graficMesos(mesos, true)}</div>
    <div class="caixa"><div class="ct"><span>DEL BENEFICI A LA CAIXA</span><span class="lg">les fiances no compten com a ingrés ni despesa</span></div>${cascada(ing, des, reb, pag)}</div>
    ${mode === 'amb' ? `<div class="dues"><div class="caixa"><div class="ct"><span>EN QUÈ ES VAN LES DESPESES</span></div>${barresLlista(cats, C.des)}</div><div class="caixa"><div class="ct"><span>COM T'HAN PAGAT</span></div>${barresLlista(metodes, C.ing)}</div></div>` : ''}
    ${peu(n, t)}</section>`;

  // ── Pàgina de detall: taula mes a mes i indicadors
  const amb = mode !== 'sense';
  const cap = `<tr><th>Mes</th><th>Ingressos</th><th>Despeses</th><th>Benefici</th><th class="mg">Marge</th>${amb ? '<th>Fiances rebudes</th><th>Fiances pagades</th><th>Mov. caixa</th>' : ''}</tr>`;
  const files = mesos
    .map((m) => {
      const mg = m.ing > 0 ? Math.round((m.ben / m.ing) * 100) : null;
      return `<tr><td class="l">${esc(m.label)}</td><td>${eur(m.ing)}</td><td>${eur(m.des)}</td><td class="b">${eur(m.ben)}</td><td class="mg">${mg == null ? '—' : `<i style="width:${Math.max(0, Math.min(100, mg)) * 0.5}px"></i> ${mg} %`}</td>${amb ? `<td>${m.reb ? eur(m.reb) : '—'}</td><td>${m.pag ? eur(m.pag) : '—'}</td><td class="b">${eur(m.ben + m.reb - m.pag)}</td>` : ''}</tr>`;
    })
    .join('');
  const totalFila = `<tr class="tot"><td class="l">TOTAL</td><td>${eur(ing)}</td><td>${eur(des)}</td><td>${eur(ben)}</td><td class="mg">${pct(ben, ing)}</td>${amb ? `<td>${eur(reb)}</td><td>${eur(pag)}</td><td>${eur(caixa)}</td>` : ''}</tr>`;
  const pDetall = (n: number, t: number) => `<section class="pag">${capcalera('Detall')}
    <div class="caixa"><div class="ct"><span>DETALL MENSUAL</span></div><table class="tb"><thead>${cap}</thead><tbody>${files}${totalFila}</tbody></table></div>
    <div class="caixa"><div class="ct"><span>L'HOSTAL EN XIFRES</span></div><div class="ind">
      <div><b>OCUPACIÓ</b><span>${fmt(ind.ocupacio, 0)} %</span><i>${fmt(ind.nitsOcupades)} de ${fmt(ind.nitsDisponibles)} nits</i></div>
      <div><b>PREU MITJÀ / NIT</b><span>${eur(ind.preuMitjaNit)}</span><i>ingressos d'allotjament ÷ nits</i></div>
      <div><b>COST / NIT</b><span>${eur(ind.costPerNit)}</span><i>despeses ÷ nits ocupades</i></div>
      <div><b>BENEFICI / NIT</b><span>${eur(ind.beneficiPerNit)}</span><i>per nit ocupada</i></div>
      <div><b>ESTADA MITJANA</b><span>${fmt(ind.duradaMitjana, 0)} nits</span><i>durada mitjana</i></div></div></div>
    ${peu(n, t)}</section>`;

  const pagines = mode === 'sense' ? [pSense, pDetall] : mode === 'amb' ? [pAmb, pDetall] : [pSense, pAmb, pDetall];
  const cos = pagines.map((f, i) => f(i + 1, pagines.length)).join('');

  const html = `<!doctype html><html lang="ca"><head><meta charset="utf-8"><title>Balanç ${dllarg(desde)} – ${dllarg(fins)}</title>
<style>
@page { size: A4 portrait; margin: 11mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 11px/1.35 Arial, Helvetica, sans-serif; color: #111; }
.pag { page-break-after: always; display: flex; flex-direction: column; gap: 12px; min-height: 270mm; }
.pag:last-child { page-break-after: auto; }
.cap { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #7a1f2b; padding-bottom: 9px; }
.marca { font-size: 10px; font-weight: 700; letter-spacing: .28em; color: #7a1f2b; }
.titol { font-size: 28px; font-weight: 700; }
.per { text-align: right; font-size: 11px; color: #444; } .per span { color: #888; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.kpi { border: 1px solid #ddd; padding: 9px 11px; }
.kpis7 { grid-template-columns: repeat(7, 1fr); gap: 5px; }
.kpis7 .kpi { padding: 7px 7px; }
.kpis7 .kt { font-size: 7px; letter-spacing: .06em; }
.kpis7 .kv { font-size: 12.5px; white-space: nowrap; }
.kpis7 .ks { font-size: 7.5px; }
.kt { font-size: 8.5px; font-weight: 700; letter-spacing: .13em; }
.kv { font-size: 19px; font-weight: 700; margin-top: 2px; }
.ks { font-size: 9px; color: #777; margin-top: 1px; }
.caixa { border: 1px solid #ddd; padding: 11px 13px; break-inside: avoid; }
.ct { display: flex; justify-content: space-between; align-items: baseline; font-size: 9.5px; font-weight: 700; letter-spacing: .15em; color: #7a1f2b; margin-bottom: 8px; }
.lg { font-weight: 400; letter-spacing: 0; color: #666; font-size: 9px; }
.nota { font-size: 10px; color: #555; margin-top: 6px; }
.dues { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grafic { display: flex; align-items: flex-end; gap: 6px; border-bottom: 1px solid #999; padding: 0 2px; margin-bottom: 26px; }
.m { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; height: 100%; }
.bars { position: relative; display: flex; align-items: flex-end; justify-content: center; gap: 2px; flex: 1; }
.b { width: 44%; display: flex; flex-direction: column; justify-content: flex-end; }
.stack { display: flex; flex-direction: column; justify-content: flex-end; }
.eti { font-size: 7px; font-weight: 700; text-align: center; white-space: nowrap; margin-bottom: 1px; letter-spacing: -.2px; }
.pt { position: absolute; left: 50%; margin-left: -4px; width: 8px; height: 8px; border-radius: 50%; background: #7a1f2b; border: 2px solid #fff; transform: translateY(50%); }
.ml { text-align: center; font-size: 8.5px; color: #666; padding-top: 3px; position: relative; bottom: -16px; height: 0; }
.bl { margin-bottom: 7px; } .blr { display: flex; justify-content: space-between; font-size: 10px; }
.blr em { color: #888; font-style: normal; } .blr em.fi { color: #b45309; }
.pis { height: 7px; background: #eee; margin-top: 2px; } .pis div { height: 7px; }
.cascada { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid #999; margin-bottom: 34px; }
.cc { display: flex; flex-direction: column; } .ccb { position: relative; flex: 1; }
.cbar { position: absolute; left: 20%; right: 20%; } .cn { position: absolute; left: 0; right: 0; text-align: center; font-size: 8.5px; font-weight: 700; }
.cl { text-align: center; font-size: 8px; color: #555; padding-top: 4px; position: relative; bottom: -22px; height: 0; } .cl.bold { font-weight: 700; color: #111; }
.tb { width: 100%; border-collapse: collapse; font-size: 10px; }
.tb th { text-align: right; color: #666; font-size: 8.5px; letter-spacing: .06em; border-bottom: 1px solid #111; padding: 4px 4px; }
.tb td { text-align: right; padding: 3px 4px; border-bottom: 1px solid #eee; }
.tb th:first-child, .tb td.l { text-align: left; } .tb td.b { font-weight: 700; }
.tb .mg { text-align: left; } .tb .mg i { display: inline-block; height: 6px; background: #7a1f2b; vertical-align: middle; }
.tb tr.tot td { border-top: 2px solid #111; font-weight: 700; padding-top: 5px; }
.ind { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.ind div { border: 1px solid #ddd; padding: 7px 9px; display: flex; flex-direction: column; }
.ind b { font-size: 7.5px; letter-spacing: .1em; color: #666; } .ind span { font-size: 15px; font-weight: 700; margin-top: 2px; } .ind i { font-style: normal; font-size: 8px; color: #888; }
.peu { margin-top: auto; display: flex; justify-content: space-between; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 5px; }
</style></head><body>${botoTornar('/balanc', { flotant: true })}${cos}${auto ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})</script>' : ''}</body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
