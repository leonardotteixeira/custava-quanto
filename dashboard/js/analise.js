// CUSTAVA QUANTO? — capítulo "Análise" (metodologia v1.1).
//
// Só apresentação. A metodologia (analysis_methodology.json) e os resultados
// (analysis_results.json) vêm prontos de scripts/build_analise.py. Aqui se
// escolhe a janela, formata e desenha. A única conta feita no navegador é a soma
// ponderada dos SENTIDOS já calculados (+1, 0, -1) quando o leitor mexe nas
// prioridades — a mesma fórmula escrita na metodologia. Nenhum número econômico
// é calculado aqui.
import { esc, fmtNum, mesAno, dataCurta, monthIdx } from "./util.js";
import { spark } from "./charts.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let M = null; // metodologia
let R = null; // resultados
let modo = "completo"; // janela principal; "mesmo_tempo" é a visão secundária
let pesos = null; // prioridades do leitor (dimensão -> 0..100)

async function getJSON(url) {
  try { const r = await fetch(url, { cache: "no-cache" }); return r.ok ? await r.json() : null; } catch { return null; }
}

// ------------------------------------------------------------ formatação
const sgn = (v) => (v > 0 ? "+" : v < 0 ? "−" : "");
const pct = (v, d = 1) => (v == null ? "—" : `${sgn(v)}${fmtNum(Math.abs(v), d)}%`);
const pp = (v, d = 2) => (v == null ? "—" : `${sgn(v)}${fmtNum(Math.abs(v), d)} p.p.`);
const meta = (id) => M.indicadores.find((i) => i.id === id);
const dimMeta = (id) => M.dimensoes.find((d) => d.id === id);
const ind = (id) => R.indicadores.find((i) => i.id === id);
const res = () => R.modos[modo];
const dimRes = (id) => res().dimensoes.find((d) => d.id === id);
const dimsA = () => M.dimensoes.filter((d) => d.tipo === "A");
const fim = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);
const milhar = (n) => Number(n).toLocaleString("pt-BR");
const triRot = (t) => t.replace(/^(\d{4})-T(\d)$/, "$2º tri/$1");

function quando(iso, { anual = false, diario = false } = {}) {
  if (!iso) return "—";
  if (anual) return iso.slice(0, 4);
  if (diario) return dataCurta(iso);
  return mesAno(iso);
}
function fmtValor(id, v) {
  const m = meta(id);
  if (v == null) return "—";
  if (m.metrica === "nivel") return pp(v);
  if (m.metrica === "media") return `${fmtNum(v, 1)}%`;
  return pct(v);
}
const metricaLabel = (id) => {
  const m = meta(id);
  if (m.metrica === "media") return m.anual ? "crescimento médio anual" : "média no período";
  if (m.metrica === "nivel") return "variação em p.p.";
  return m.dimensao === "custo_vida" || m.campo === "salario_minimo_real" ? "variação real" : "variação";
};
const tag = (p) => `<span class="an-tag" data-gov="${p === "Bolsonaro" ? "b" : "l"}">${p}${p === "Lula" ? " · em curso" : ""}</span>`;

// Rótulos de leitura e de evidência (o que a dimensão indica, sem juízo de valor).
const LADO = { 1: ["l", "Período Lula"], "-1": ["b", "Período Bolsonaro"], 0: ["0", "Praticamente iguais"] };
const chipLado = (l) => `<span class="an-lado" data-l="${LADO[l][0]}">${LADO[l][1]}</span>`;
const fraseLado = (l) => (l === 0 ? "os dois períodos ficam praticamente iguais" : `a leitura aponta para o período ${l > 0 ? "Lula" : "Bolsonaro"}`);
const EVID = { alta: ["alta", "ALTA"], média: ["media", "MÉDIA"], informativa: ["info", "INFORMATIVA"] };
const badgeEvid = (n) => `<span class="an-evid-badge" data-n="${EVID[n][0]}" title="${esc(M.regras.nivel_evidencia[n] || "")}">Evidência ${EVID[n][1]}</span>`;
const valDim = (r, v) => (r.metrica === "media" ? `${fmtNum(v, 1)}%` : pct(v));

// ------------------------------------------------------------ Parte 1 — régua
function janela(id) {
  const i = ind(id), s = i?.[modo];
  if (!s) return null;
  const kb = modo === "mesmo_tempo" ? i.k_comum : i.k_bolsonaro;
  const kl = modo === "mesmo_tempo" ? i.k_comum : i.k_lula;
  return { b: s.Bolsonaro, l: s.Lula, nb: kb[1] - kb[0] + 1, nl: kl[1] - kl[0] + 1 };
}

function renderRegua() {
  const g = janela("GASOLINA"), dol = ind("DOLAR").completo, ipca = janela("IPCA"), pib = janela("PIB");
  const total = Math.max(g.nb, g.nl, 48);
  const dur = R.duracao;
  const igual = modo === "mesmo_tempo";
  const card = (p, w, n, extra) => `<div class="an-pcard" data-gov="${p === "Bolsonaro" ? "b" : "l"}">
      ${tag(p)}
      <span class="an-pcard-when">${quando(w.inicio)} → ${quando(w.fim)}</span>
      <span class="an-pcard-dur"><b>${n} meses</b> · dado mensal${w.n < n ? ` (${w.n} com dado)` : ""}${extra || ""}</span>
      <div class="an-bar-track"><span class="an-bar" data-gov="${p === "Bolsonaro" ? "b" : "l"}" style="width:${(n / total) * 100}%"></span></div>
    </div>`;
  const tri = R.pib_ultimo_trimestre;
  const ultimos = `Último dado: ${quando(g.l.fim)} (mensal)${tri ? `, ${triRot(tri.trimestre)} (PIB trimestral)` : ""}, ${dataCurta(dol.Lula.fim)} (diário).`;
  $("#an-p2-lead").textContent = `O período Bolsonaro tem ${dur.bolsonaro_meses} meses e o período Lula está em curso, com ${dur.lula_meses_disponiveis} meses de dados. A comparação principal usa cada período inteiro, como o projeto os define. Como as durações diferem, um acumulado tem mais tempo para crescer no período mais longo: por isso existe também a visão por igual duração.`;
  $("#an-ruler").innerHTML = `
    <p class="an-visao mono">${esc(M.regras.modos_nomes[modo])}${igual ? " · visão secundária" : " · comparação principal"}</p>
    <div class="an-pcards">
      ${card("Bolsonaro", g.b, g.nb, igual ? ` · meses 1 a ${g.nb} do mandato` : " · mandato completo")}
      ${card("Lula", g.l, g.nl, igual ? ` · meses 1 a ${g.nl} do mandato` : " · período em curso")}
    </div>
    <p class="an-ruler-note">${igual
      ? `Os primeiros <b>${g.nb} meses</b> de cada mandato. Séries mais curtas usam só os meses em que os dois lados têm dado: IPCA em 12 meses, de ${quando(ipca.b.inicio)} a ${quando(ipca.b.fim)} contra ${quando(ipca.l.inicio)} a ${quando(ipca.l.fim)} (${ipca.nb} meses); PIB, ${pib.nb} anos fechados de cada período (${quando(pib.b.inicio, { anual: true })}–${quando(pib.b.fim, { anual: true })} e ${quando(pib.l.inicio, { anual: true })}–${quando(pib.l.fim, { anual: true })}). Dólar, Selic e Ibovespa usam a média mensal.`
      : `Séries mais curtas usam só os meses com dado: IPCA em 12 meses, de ${quando(ipca.b.inicio)} a ${quando(ipca.b.fim)} contra ${quando(ipca.l.inicio)} a ${quando(ipca.l.fim)}; PIB, anos fechados (${quando(pib.b.inicio, { anual: true })}–${quando(pib.b.fim, { anual: true })} e ${quando(pib.l.inicio, { anual: true })}–${quando(pib.l.fim, { anual: true })}). Dólar, Selic e Ibovespa usam o primeiro e o último dado diário: ${dataCurta(dol.Bolsonaro.inicio)} a ${dataCurta(dol.Bolsonaro.fim)} e ${dataCurta(dol.Lula.inicio)} a ${dataCurta(dol.Lula.fim)}.`}
      ${ultimos}</p>`;
  const jm = R.janela_muda;
  $("#an-control-note").textContent = jm?.dimensoes?.length ? jm.texto : "A leitura de cada dimensão é a mesma nas duas janelas.";
}

// ------------------------------------------------------------ em 1 minuto
function linhaDim(d) {
  const r = dimRes(d.id);
  if (d.tipo !== "A") return `<span class="an-min-res">descritos, sem direção definida</span><span class="an-min-leit">fora da síntese</span>`;
  const pb = r.por_periodo.Bolsonaro, pl = r.por_periodo.Lula;
  const unidade = { custo_vida: "variação real mediana", inflacao: "inflação média em 12 meses", renda: "variação mediana do poder de compra", atividade: "crescimento médio anual" }[d.id] || "mediana";
  return `<span class="an-min-res">${unidade} ${tag("Bolsonaro")} <b>${valDim(r, pb.mediana_valor)}</b> · ${tag("Lula")} <b>${valDim(r, pl.mediana_valor)}</b></span>
    <span class="an-min-leit">${chipLado(r.leitura)}</span>`;
}
function renderMinuto() {
  $("#an-min-list").innerHTML = M.dimensoes.map((d) => `<li><a href="#an-dim-${d.id}" class="an-min-dim">${esc(d.titulo)}</a>${linhaDim(d)}</li>`).join("");
}

// ------------------------------------------------------------ Parte 2 — o que medimos
function renderEscopo() {
  $("#an-escopo").textContent = `${M.regras.fora_do_escopo_nota} Sem série no projeto, e por isso fora desta análise: ${M.regras.fora_do_escopo.join(", ").toLowerCase()}.`;
  $("#an-dimgrid").innerHTML = M.dimensoes.map((d) => {
    const n = M.indicadores.filter((i) => i.dimensao === d.id).length;
    return `<a class="an-dimcard" href="#an-dim-${d.id}"><span class="an-dimcard-n mono">${String(d.ordem).padStart(2, "0")}</span><b>${esc(d.titulo)}</b><span class="an-dimcard-q">${esc(d.pergunta)}</span><span class="an-dimcard-meta mono">${n} série${n > 1 ? "s" : ""} · ${d.tipo === "A" ? "entra na síntese" : "só descrição"}</span></a>`;
  }).join("");
  const niv = M.regras.nivel_evidencia;
  $("#an-legenda").innerHTML = `<h4 class="an-kick mono">Nível de evidência de cada dimensão</h4><ul>${["alta", "média", "informativa"].map((k) => `<li>${badgeEvid(k)}<span>${esc(niv[k])}</span></li>`).join("")}</ul>`;
  $("#an-evid-nota").textContent = niv.regra;
}

// ------------------------------------------------------------ gráficos
const TITULOS = {
  custo_vida: "Começamos pelo que chega ao bolso.",
  inflacao: "Depois, olhamos para a inflação.",
  renda: "Renda e poder de compra.",
  atividade: "A economia cresceu quanto?",
  mercados: "E os mercados?",
};

// Pontos pareados: uma linha por série, um ponto por período. Vários grupos
// dividem o mesmo eixo, para que as distâncias sejam comparáveis.
function dotplot(grupos, dirTxt) {
  const linhasDe = (ids) => ids.map((id) => ({ id, b: ind(id)[modo]?.Bolsonaro?.valor, l: ind(id)[modo]?.Lula?.valor })).filter((x) => x.b != null && x.l != null);
  const todas = grupos.flatMap((g) => linhasDe(g.ids));
  const vals = todas.flatMap((x) => [x.b, x.l, 0]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  const passo = [5, 10, 20, 25, 50, 100].find((s) => (hi - lo) / s <= 6) || 100;
  const ticks = [];
  for (let t = Math.ceil(lo / passo) * passo; t <= hi; t += passo) ticks.push(t);
  const linha = (x) => `<div class="an-dot-row">
      <span class="an-dot-name">${esc(meta(x.id).nome)}</span>
      <span class="an-dot-track" aria-hidden="true">
        <i class="an-dot-zero" style="left:${X(0)}%"></i>
        <i class="an-dot-link" style="left:${Math.min(X(x.b), X(x.l))}%;width:${Math.abs(X(x.b) - X(x.l))}%"></i>
        <i class="an-dot-pt" data-gov="b" style="left:${X(x.b)}%"></i>
        <i class="an-dot-pt" data-gov="l" style="left:${X(x.l)}%"></i>
      </span>
      <span class="an-dot-vals"><span data-gov="b">${pct(x.b)}</span><span data-gov="l">${pct(x.l)}</span></span>
    </div>`;
  return `<figure class="an-dot">
    <div class="an-dot-axis" aria-hidden="true">${ticks.map((t) => `<span style="left:${X(t)}%">${t > 0 ? "+" : ""}${t}%</span>`).join("")}</div>
    ${grupos.map((g) => `<div class="an-dot-grupo">
      ${g.titulo ? `<div class="an-dot-ghead"><b>${esc(g.titulo)}</b>${g.selo ? `<span class="an-selo mono">${esc(g.selo)}</span>` : ""}${g.med ? `<span class="an-dot-med">Mediana do grupo: <span data-gov="b">${pct(g.med.Bolsonaro)}</span> · <span data-gov="l">${pct(g.med.Lula)}</span></span>` : ""}</div>${g.nota ? `<p class="an-dot-gnota">${esc(g.nota)}</p>` : ""}` : ""}
      ${linhasDe(g.ids).map(linha).join("")}
    </div>`).join("")}
    <figcaption>${dirTxt ? `<span class="an-dot-dir">${dirTxt}</span>` : ""}<span class="an-dot-key"><i data-gov="b"></i>Bolsonaro <i data-gov="l"></i>Lula (em curso)</span></figcaption>
  </figure>`;
}

function mini(id) {
  const rows = ind(id).serie.map((r) => ({ iso: r.iso, v: r.v }));
  if (!rows.length) return "";
  const m0 = monthIdx(rows[0].iso), m1 = monthIdx(rows[rows.length - 1].iso);
  return `<div class="an-mini-chart">${spark(rows, { m0, m1, cutLine: true, maxGap: 1, width: 1.75, pad: 8 })}</div>`;
}

// PIB: anos fechados em barras (só o que veio do JSON); os trimestres de 2026 ficam num bloco à parte.
function pibBlock() {
  const P = R.pib, w = ind("PIB")[modo];
  const y0 = (iso) => Number(iso.slice(0, 4));
  const dentro = (a) => (a.periodo === "Bolsonaro" ? a.ano >= y0(w.Bolsonaro.inicio) && a.ano <= y0(w.Bolsonaro.fim) : a.ano >= y0(w.Lula.inicio) && a.ano <= y0(w.Lula.fim));
  let lo = Math.min(0, ...P.anos.map((a) => a.taxa)), hi = Math.max(0, ...P.anos.map((a) => a.taxa));
  const folga = hi - lo; lo -= folga * 0.2; hi += folga * 0.08;
  const H = (v) => (Math.abs(v) / (hi - lo)) * 100;
  const z = (hi / (hi - lo)) * 100;
  const barras = `<figure class="an-pib"><div class="an-pib-bars" style="--z:${z}%">${P.anos.map((a) => `<div class="an-pib-col"${dentro(a) ? "" : ' data-fora="1"'}><span class="an-pib-bar" data-gov="${a.periodo === "Bolsonaro" ? "b" : "l"}" style="height:${H(a.taxa)}%;${a.taxa >= 0 ? `bottom:${100 - z}%` : `top:${z}%`}"></span><span class="an-pib-v" style="${a.taxa >= 0 ? `bottom:calc(${100 - z + H(a.taxa)}% + 3px)` : `top:calc(${z + H(a.taxa)}% + 3px)`}">${pct(a.taxa)}</span><span class="an-pib-y mono">${a.ano}</span></div>`).join("")}</div>
    <figcaption>Crescimento real do PIB em cada <b>ano fechado</b>, ${P.anos[0].ano} a ${P.ultimo_ano_fechado}. ${modo === "mesmo_tempo" ? "Nesta janela, os anos esmaecidos ficam de fora da média. " : ""}Fonte: IBGE, Contas Nacionais Trimestrais.</figcaption></figure>`;
  const q = P.trimestres_sem_resultado_anual || [];
  const trim = q.length ? `<div class="an-pibq">
      <h4 class="an-kick mono">${q[0].trimestre.slice(0, 4)}: trimestres sem resultado anual</h4>
      <div class="an-pibq-grid">${q.map((t) => `<article><b class="mono">${triRot(t.trimestre)}</b>
        <dl><div><dt>Contra o mesmo trimestre do ano anterior</dt><dd>${pct(t.interanual)}</dd></div>
        <div><dt>Contra o trimestre anterior, com ajuste sazonal</dt><dd>${pct(t.dessazonalizada)}</dd></div>
        <div><dt>Acumulado em 4 trimestres</dt><dd>${pct(t.acumulado_4tri)}</dd></div></dl></article>`).join("")}</div>
      <p class="an-pibq-nota">São três medidas diferentes, e nenhuma é o resultado anual: por isso ${q[0].trimestre.slice(0, 4)} não entra nas barras nem na média.</p>
    </div>` : "";
  return `<div class="an-pibwrap">${barras}${trim}</div>`;
}

function numeros(ids) {
  return `<details class="an-nums"><summary>Ver os números de cada série</summary><div class="table-scroll"><table class="an-table">
    <thead><tr><th scope="col">Série</th><th scope="col">Métrica</th><th scope="col">Bolsonaro · janela</th><th scope="col">Bolsonaro</th><th scope="col">Lula · janela</th><th scope="col">Lula</th><th scope="col">Fonte</th></tr></thead>
    <tbody>${ids.map((id) => {
      const i = ind(id), m = meta(id), s = i[modo];
      if (!s) return "";
      const an = !!m.anual, di = modo === "completo" && m.diario;
      return `<tr><th scope="row">${esc(m.nome)}${m.tipo === "C" ? ' <span class="an-tipo">informativo</span>' : ""}${m.indice ? ' <span class="an-tipo">índice</span>' : ""}</th><td>${metricaLabel(id)}</td>
        <td>${quando(s.Bolsonaro.inicio, { anual: an, diario: di })} → ${quando(s.Bolsonaro.fim, { anual: an, diario: di })}</td><td class="num">${fmtValor(id, s.Bolsonaro.valor)}</td>
        <td>${quando(s.Lula.inicio, { anual: an, diario: di })} → ${quando(s.Lula.fim, { anual: an, diario: di })}</td><td class="num">${fmtValor(id, s.Lula.valor)}</td>
        <td>${esc(m.fonte)}</td></tr>`;
    }).join("")}</tbody></table></div></details>`;
}

function movimentos(d) {
  const r = dimRes(d.id);
  const nA = M.indicadores.filter((i) => i.dimensao === d.id && i.tipo === "A").length;
  if (!r.maior_favoravel || d.tipo !== "A" || nA < 2) return "";
  const nome = (id) => esc(meta(id).nome);
  const v = (o) => fmtValor(o.id, ind(o.id)[modo][o.periodo].valor);
  const out = [`<li><span class="mono">Maior alta na direção do critério</span>${nome(r.maior_favoravel.id)}, período ${r.maior_favoravel.periodo}: ${v(r.maior_favoravel)}</li>`,
    `<li><span class="mono">Maior movimento contra o critério</span>${nome(r.maior_desfavoravel.id)}, período ${r.maior_desfavoravel.periodo}: ${v(r.maior_desfavoravel)}</li>`];
  if (r.maior_divergencia) {
    const i = ind(r.maior_divergencia)[modo];
    out.push(`<li><span class="mono">Maior diferença entre os períodos</span>${nome(r.maior_divergencia)}: ${fmtValor(r.maior_divergencia, i.Bolsonaro.valor)} contra ${fmtValor(r.maior_divergencia, i.Lula.valor)}</li>`);
  }
  const outl = (r.outliers || []).map((o) => `${nome(o.id)} no período ${o.periodo} (${fmtValor(o.id, ind(o.id)[modo][o.periodo].valor)})`);
  return `<div class="an-moves"><h4 class="an-kick mono">Os maiores movimentos</h4><ul>${out.join("")}</ul>
    ${outl.length ? `<p class="an-outl"><b>Fora do padrão da dimensão:</b> ${outl.join("; ")}. A mediana existe para que um caso extremo não decida a leitura sozinho.</p>` : ""}</div>`;
}

function robustezDim(r) {
  const s = r.sem_uma_serie;
  if (!s) return "";
  return `<div class="an-robdim"><h4 class="an-kick mono">A leitura depende de uma série só?</h4>
    <p>Refazendo o cálculo sem uma série de cada vez (${s.n} testes), a leitura se mantém em <b>${s.iguais} de ${s.n}</b>${s.iguais === s.n ? ": nenhuma série sozinha muda o resultado." : "; nos demais, muda."}</p></div>`;
}

function evidencia(d) {
  const r = dimRes(d.id);
  const ids = M.indicadores.filter((i) => i.dimensao === d.id).map((i) => i.id);
  const idsA = ids.filter((id) => meta(id).tipo === "A");
  let visual = "", numero = "";
  if (d.tipo === "A") {
    const pb = r.por_periodo.Bolsonaro, pl = r.por_periodo.Lula;
    const rot = r.metrica === "media" ? (d.id === "atividade" ? "crescimento médio anual do PIB" : "inflação média em 12 meses") : `${idsA.length > 1 ? "mediana da " : ""}variação real${idsA.length > 1 ? ` de ${idsA.length} séries` : ""}`;
    numero = `<div class="an-big">
      <div data-gov="b"><span class="an-big-v">${valDim(r, pb.mediana_valor)}</span>${tag("Bolsonaro")}</div>
      <div data-gov="l"><span class="an-big-v">${valDim(r, pl.mediana_valor)}</span>${tag("Lula")}</div>
      <p class="an-big-lab">${rot}</p></div>`;
  }
  if (d.id === "custo_vida") {
    const g = r.grupos;
    const comb = idsA.filter((id) => !meta(id).indice), alim = idsA.filter((id) => meta(id).indice);
    visual = dotplot([
      { titulo: "Combustíveis", selo: "Preço médio em R$ (ANP)", ids: comb, med: g?.combustiveis },
      { titulo: "Alimentos", selo: "Índice de preço — não R$/kg", ids: alim, med: g?.alimentos,
        nota: "Índice encadeado do IBGE, descontada a inflação. “+35%” quer dizer que o índice subiu 35% acima da inflação; não é o preço do quilo em reais." },
    ], "← variação real menor: menos pressão sobre o consumidor");
  }
  if (d.id === "renda") visual = dotplot([{ ids: idsA }], "→ variação maior: mais poder de compra");
  if (d.id === "inflacao") {
    const s = ind("IPCA")[modo];
    visual = `<figure class="an-mini">${mini("IPCA")}<figcaption>IPCA acumulado em 12 meses, mês a mês. Mínimo e máximo na janela: ${tag("Bolsonaro")} ${fmtNum(s.Bolsonaro.min, 1)}% a ${fmtNum(s.Bolsonaro.max, 1)}% · ${tag("Lula")} ${fmtNum(s.Lula.min, 1)}% a ${fmtNum(s.Lula.max, 1)}%. Fonte: IBGE.</figcaption></figure>`;
  }
  if (d.id === "atividade") visual = pibBlock();
  if (d.id === "mercados") {
    visual = `<div class="an-markets">${ids.map((id) => {
      const m = meta(id), s = ind(id)[modo], di = modo === "completo" && m.diario;
      const u = (v) => (id === "SELIC" ? `${fmtNum(v, 2)}%` : id === "DOLAR" ? `R$ ${fmtNum(v, 2)}` : `${fmtNum(v / 1000, 1)} mil`);
      return `<article class="an-mkt"><h4>${esc(m.nome)}</h4>${mini(id)}
        <dl class="an-mkt-stats">
          ${["Bolsonaro", "Lula"].map((p) => `<div><dt>${tag(p)}</dt><dd>${u(s[p].valor_inicio)} → ${u(s[p].valor_fim)} <b>${fmtValor(id, s[p].valor)}</b><br><span>médias mensais: ${u(s[p].media)} · mín. ${u(s[p].min)} · máx. ${u(s[p].max)}</span><br><span>${quando(s[p].inicio, { diario: di })} → ${quando(s[p].fim, { diario: di })}</span></dd></div>`).join("")}
        </dl>
        <p class="an-mkt-int">${esc(m.interpretacao)}</p>
        <p class="an-mkt-src mono">Fonte: ${esc(m.fonte)} · ${esc(m.frequencia)}</p></article>`;
    }).join("")}</div>`;
  }
  const ctx = d.id === "custo_vida" && modo === "completo" ? (() => {
    const c = ind("GASOLINA").contexto_completo;
    if (!c) return "";
    const brent = c.Bolsonaro.brent_usd_variacao_pct != null;
    return `<p class="an-ctx"><b>Coincide no tempo:</b> no mesmo intervalo, o dólar variou ${pct(c.Bolsonaro.cambio_variacao_pct)} no período Bolsonaro e ${pct(c.Lula.cambio_variacao_pct)} no Lula${brent ? `; o petróleo Brent, em dólares, ${pct(c.Bolsonaro.brent_usd_variacao_pct)} no período Bolsonaro${c.Lula.brent_usd_variacao_pct != null ? ` e ${pct(c.Lula.brent_usd_variacao_pct)} no Lula` : ""} (FRED)` : ""}. Combustíveis dependem dos dois.</p>`;
  })() : "";
  const infos = ids.filter((id) => meta(id).tipo === "C").map((id) => {
    const s = ind(id)[modo];
    return `<p class="an-info"><b>${esc(meta(id).nome)}</b> (informativo, fora da leitura): ${fmtValor(id, s.Bolsonaro.valor)} no período Bolsonaro e ${fmtValor(id, s.Lula.valor)} no Lula. ${esc(meta(id).interpretacao)}</p>`;
  }).join("");
  const n = d.tipo === "A" ? `${idsA.length} série${idsA.length > 1 ? "s" : ""} · entra na síntese` : `${ids.length} séries · só descrição`;
  const leitura = d.tipo === "A" ? `<p>${esc(res().textos.por_dimensao[d.id])}</p><p class="an-read-lado">${chipLado(r.leitura)}</p>` : `<p>${esc(res().textos.por_dimensao[d.id])}</p>`;
  return `<section class="an-part an-dim" id="an-dim-${d.id}" aria-labelledby="an-dt-${d.id}">
    <p class="an-part-n mono">Parte ${d.ordem + 2} · ${esc(d.titulo)}</p>
    <h3 class="an-part-title" id="an-dt-${d.id}">${TITULOS[d.id] || esc(d.titulo)}</h3>
    <div class="an-q"><span class="mono">A pergunta</span><p>${esc(d.pergunta)}</p><span class="an-dim-type">${badgeEvid(r.nivel_evidencia)}<span class="mono">${n}</span></span></div>
    <p class="an-part-lead">${esc(d.explicacao)}</p>
    <dl class="an-scope"><div><dt class="mono">Mede</dt><dd>${esc(fim(d.mede))}</dd></div><div><dt class="mono">Não mede</dt><dd>${esc(fim(d.nao_mede))}</dd></div></dl>
    <div class="an-evid">${numero}${visual}</div>
    ${ctx}
    <div class="an-read"><h4 class="an-kick mono">Leitura dos dados</h4><div>${leitura}</div></div>
    ${infos}
    ${robustezDim(r)}
    ${movimentos(d)}
    ${numeros(ids)}
  </section>`;
}

// ------------------------------------------------------------ Parte 8 — o que mais pesou
function renderPesou() {
  const mm = res().maiores_movimentos;
  if (!mm?.top_alta) { $("#an-pesou").innerHTML = ""; return; }
  const item = (c) => `<li><span class="an-mv-nome">${esc(c.nome)}${c.indice ? ' <span class="an-selo mono">índice</span>' : ""}</span><span class="an-mv-per">${tag(c.periodo)}</span><span class="an-mv-v">${pct(c.valor)}</span></li>`;
  const dif = mm.diferenca;
  $("#an-pesou").innerHTML = `<div class="an-mv-grid">
      <div><h4 class="an-kick mono">Maiores altas reais</h4><ol class="an-mv-list">${mm.top_alta.map(item).join("")}</ol></div>
      <div><h4 class="an-kick mono">Maiores quedas reais</h4><ol class="an-mv-list">${mm.top_queda.map(item).join("")}</ol></div>
    </div>
    ${dif ? `<p class="an-mv-dif"><span class="mono">Maior diferença entre os períodos</span><b>${esc(dif.nome)}</b>${dif.indice ? " (índice de preço)" : ""}: ${pct(dif.bolsonaro)} no período Bolsonaro e ${pct(dif.lula)} no período Lula.</p>` : ""}
    <p class="an-mv-nota">Entram só séries em variação real (custo de vida e poder de compra). ${dimRes("custo_vida").sem_uma_serie ? `Tirando uma série de cada vez, a leitura de Custo de vida se mantém em ${dimRes("custo_vida").sem_uma_serie.iguais} de ${dimRes("custo_vida").sem_uma_serie.n} testes.` : ""}</p>`;
}

// ------------------------------------------------------------ Parte 9 — prioridades
function pesosPadrao() {
  const c = M.cenarios.find((x) => x.id === M.cenario_padrao) || M.cenarios[0];
  return Object.fromEntries(dimsA().map((d) => [d.id, c.pesos[d.id]]));
}

function renderSliders() {
  const box = $("#an-sliders");
  box.innerHTML = dimsA().map((d) => `<div class="an-sl">
      <label for="an-w-${d.id}"><span class="an-sl-nome">${esc(d.titulo)}</span><output id="an-wo-${d.id}" class="an-sl-val" for="an-w-${d.id}"></output></label>
      <input type="range" id="an-w-${d.id}" data-dim="${d.id}" min="0" max="100" step="5" value="${pesos[d.id]}">
      <span class="an-sl-lado" id="an-wl-${d.id}"></span>
    </div>`).join("");
  box.oninput = (e) => {
    const i = e.target.closest("input[data-dim]");
    if (!i) return;
    pesos[i.dataset.dim] = Number(i.value);
    calcPrioridades();
  };
  $("#an-prio-reset").onclick = () => {
    pesos = pesosPadrao();
    $$("#an-sliders input").forEach((i) => { i.value = pesos[i.dataset.dim]; });
    calcPrioridades();
  };
}

// Única conta do navegador: soma ponderada dos sentidos (+1, 0, −1) já calculados.
function calcPrioridades() {
  const A = dimsA();
  const total = A.reduce((a, d) => a + pesos[d.id], 0);
  const share = (id) => (total ? (pesos[id] / total) * 100 : 0);
  A.forEach((d) => {
    const r = dimRes(d.id);
    $(`#an-wo-${d.id}`).textContent = total ? `${fmtNum(share(d.id), 0)}% do total` : "sem peso";
    $(`#an-wl-${d.id}`).innerHTML = chipLado(r.leitura);
    $(`#an-w-${d.id}`).setAttribute("aria-valuetext", total ? `${fmtNum(share(d.id), 0)} por cento do total` : "sem peso");
  });
  const soma = A.reduce((a, d) => a + pesos[d.id] * dimRes(d.id).leitura, 0);
  const lado = Math.sign(soma);
  const base = res().sintese.find((s) => s.id === M.cenario_padrao)?.sentido ?? 0;
  const parte = (l) => A.filter((d) => dimRes(d.id).leitura === l).reduce((a, d) => a + share(d.id), 0);
  let msg;
  if (!total) msg = `<p class="an-prio-main">Todos os pesos estão em zero: não há síntese.</p>`;
  else {
    const igual = 100 / A.length;
    const nomes = A.filter((d) => dimRes(d.id).leitura === lado && share(d.id) > igual + 0.5).map((d) => d.titulo);
    const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : nomes[0];
    const so = lado === 0 ? "a síntese fica empatada" : `a síntese aponta para o período ${lado > 0 ? "Lula" : "Bolsonaro"}`;
    msg = `<p class="an-prio-main">Com estes pesos, ${so}.</p>
      <p class="an-prio-sub">${lado === base
        ? "A leitura permanece a mesma nos cenários testados."
        : `Com este conjunto de prioridades, a síntese muda${nomes.length ? ` porque ${lista} ${nomes.length > 1 ? "passaram" : "passou"} a ter mais peso` : ""}.`}</p>
      <div class="an-prio-bar" aria-hidden="true"><span data-l="b" style="width:${parte(-1)}%"></span><span data-l="0" style="width:${parte(0)}%"></span><span data-l="l" style="width:${parte(1)}%"></span></div>
      <ul class="an-prio-leg mono"><li data-l="b">Período Bolsonaro <b>${fmtNum(parte(-1), 0)}%</b></li><li data-l="0">Praticamente iguais <b>${fmtNum(parte(0), 0)}%</b></li><li data-l="l">Período Lula <b>${fmtNum(parte(1), 0)}%</b></li></ul>
      <p class="an-prio-nota">As barras mostram quanto do peso total está em dimensões que apontam para cada lado. Não é nota nem placar.</p>`;
  }
  $("#an-prio-leitura").innerHTML = msg;
}

function renderPrioridades() {
  if (!pesos) pesos = pesosPadrao();
  renderSliders();
  calcPrioridades();
}

function renderSens() {
  const sint = res().sintese, g = res().grade;
  const A = dimsA();
  const t = g.combinacoes;
  const pc = (n) => `${(n / t) * 100}%`;
  $("#an-sens").innerHTML = `<div class="table-scroll an-scroll"><table class="an-table an-sens-t an-stack">
    <thead><tr><th scope="col">Cenário (definido antes do cálculo)</th>${A.map((d) => `<th scope="col" class="num">${esc(d.titulo)}</th>`).join("")}<th scope="col">Síntese</th></tr></thead>
    <tbody>${M.cenarios.map((c, j) => `<tr><th scope="row">${esc(c.nome)}<span class="an-cen-j">${esc(c.justificativa)}</span></th>${A.map((d) => `<td class="num" data-label="${esc(d.titulo)}">${c.pesos[d.id]}%</td>`).join("")}<td data-label="Síntese">${chipLado(sint[j].sentido)}</td></tr>`).join("")}</tbody></table></div>
    <div class="an-grade">
      <h4 class="an-kick mono">Todas as ${milhar(t)} combinações de pesos (de ${g.passo} em ${g.passo} pontos)</h4>
      <div class="an-prio-bar an-prio-bar--grade" role="img" aria-label="${milhar(g.bolsonaro)} combinações apontam para o período Bolsonaro, ${milhar(g.empate)} empatam e ${milhar(g.lula)} apontam para o período Lula"><span data-l="b" style="width:${pc(g.bolsonaro)}"></span><span data-l="0" style="width:${pc(g.empate)}"></span><span data-l="l" style="width:${pc(g.lula)}"></span></div>
      <ul class="an-prio-leg mono"><li data-l="b">Período Bolsonaro <b>${milhar(g.bolsonaro)}</b></li><li data-l="0">Empate <b>${milhar(g.empate)}</b></li><li data-l="l">Período Lula <b>${milhar(g.lula)}</b></li></ul>
    </div>
    <p class="an-robust">${esc(res().textos.robustez)}</p>`;
}

// ------------------------------------------------------------ Parte 10 — em resumo
function renderResumo() {
  $("#an-resumo").innerHTML = `<div class="table-scroll an-scroll"><table class="an-table an-synth an-stack">
    <thead><tr><th scope="col">Dimensão</th><th scope="col">Evidência</th><th scope="col" class="num">Período Bolsonaro</th><th scope="col" class="num">Período Lula</th><th scope="col">Leitura</th></tr></thead>
    <tbody>${M.dimensoes.map((d) => {
      const r = dimRes(d.id);
      if (d.tipo !== "A") return `<tr><th scope="row">${esc(d.titulo)}</th><td data-label="Evidência">${badgeEvid(r.nivel_evidencia)}</td><td class="num" colspan="2" data-label="Valores">descritivo, sem direção</td><td data-label="Leitura">fora da síntese</td></tr>`;
      return `<tr><th scope="row">${esc(d.titulo)}</th><td data-label="Evidência">${badgeEvid(r.nivel_evidencia)}</td><td class="num" data-label="Período Bolsonaro">${valDim(r, r.por_periodo.Bolsonaro.mediana_valor)}</td><td class="num" data-label="Período Lula">${valDim(r, r.por_periodo.Lula.mediana_valor)}</td><td data-label="Leitura">${chipLado(r.leitura)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  const t = res().textos;
  $("#an-geral").innerHTML = `<p>${esc(t.geral)}</p><p>${esc(t.robustez)}</p>
    <p class="an-geral-fim">Leitura descritiva das séries do projeto, sob a metodologia v${esc(M.versao)}, na janela “${esc(M.regras.modos_nomes[modo].toLowerCase())}”. Não mede causa e muda com os pesos.</p>`;
}

// ------------------------------------------------------------ contexto e auditoria
function renderContexto() {
  $("#an-timeline").innerHTML = M.contexto_externo.map((e) => `<li><time datetime="${e.iso}">${mesAno(e.iso)}</time><span class="an-tl-cat mono">${esc(e.categoria)}</span><span class="an-tl-txt">${esc(e.texto)}</span><span class="an-tl-rel">Coincide no tempo com ${esc(e.relacao.replace(/^coincide no tempo com /, ""))}.</span><span class="an-tl-src">Fonte: ${esc(e.fonte)}</span></li>`).join("");
}

function renderAuditoria() {
  const alvo = $("#an-audit");
  if (!alvo) return;
  const nm = M.regras.modos_nomes;
  const linhas = M.indicadores.map((m) => `<tr><th scope="row">${esc(m.nome)}</th><td>${esc(dimMeta(m.dimensao).titulo)}</td><td class="num">${m.tipo}</td><td>${m.direcao === "menor" ? "menor é a direção definida" : m.direcao === "maior" ? "maior é a direção definida" : "sem direção"}</td><td>${esc(m.metrica === "variacao_pct" ? "variação %" : m.metrica === "media" ? "média" : "nível (p.p.)")} · ${esc(m.campo)}</td><td>${esc(m.fonte)}</td><td>${esc(m.frequencia)}</td><td>${esc(m.confianca)}</td></tr>`).join("");
  const form = Object.entries(M.regras.formulas).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
  const niv = M.regras.nivel_evidencia;
  alvo.innerHTML = `
    <div class="an-aud-grid">
      <div><h3 class="an-kick mono">Versão</h3><p>Metodologia <b>v${esc(M.versao)}</b> de ${esc(M.data.split("-").reverse().join("/"))}. Resultados gerados em ${dataCurta(R.gerado_em.slice(0, 10))} a partir dos dados de ${dataCurta(R.dados_gerados_em.slice(0, 10))}.</p><p class="an-hash mono">SHA-256 da metodologia: ${esc(R.metodologia_sha256)}</p></div>
      <div><h3 class="an-kick mono">Janelas de comparação</h3><dl class="an-dl">${Object.entries(M.regras.modos).map(([k, v]) => `<dt>${esc(nm[k])}${k === M.regras.modo_principal ? " (principal)" : " (secundária)"}</dt><dd>${esc(v)}</dd>`).join("")}</dl><p>${esc(M.regras.modo_principal_nota || "")}</p></div>
      <div><h3 class="an-kick mono">Tipos de indicador</h3><dl class="an-dl">${Object.entries(M.tipos).map(([k, v]) => `<dt>Tipo ${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
      <div><h3 class="an-kick mono">Nível de evidência</h3><dl class="an-dl">${["alta", "média", "informativa"].map((k) => `<dt>${k.toUpperCase()}</dt><dd>${esc(niv[k])}</dd>`).join("")}</dl><p>${esc(niv.regra)}</p></div>
      <div><h3 class="an-kick mono">Sensibilidade</h3><p>${esc(M.regras.sensibilidade.descricao)}</p><dl class="an-dl">${M.cenarios.map((c) => `<dt>${esc(c.nome)}</dt><dd>${dimsA().map((d) => `${esc(d.titulo)} ${c.pesos[d.id]}%`).join(" · ")}. ${esc(c.justificativa)}</dd>`).join("")}</dl></div>
      <div><h3 class="an-kick mono">Exclusões e escopo</h3><p>${M.regras.exclusoes.length ? esc(M.regras.exclusoes.join("; ")) : "Nenhuma série do projeto foi excluída."} ${esc(M.regras.fora_do_escopo_nota)}</p><p>Tolerância para “praticamente iguais”: ${fmtNum(M.regras.tolerancia.variacao_pct, 1)} ponto em variações e ${fmtNum(M.regras.tolerancia.media, 1)} ponto em médias.</p></div>
    </div>
    <h3 class="an-kick mono">Indicadores, direção e fonte</h3>
    <div class="table-scroll"><table class="an-table"><thead><tr><th scope="col">Série</th><th scope="col">Dimensão</th><th scope="col">Tipo</th><th scope="col">Direção</th><th scope="col">Métrica · campo</th><th scope="col">Fonte</th><th scope="col">Frequência</th><th scope="col">Confiança</th></tr></thead><tbody>${linhas}</tbody></table></div>
    <h3 class="an-kick mono">Fórmulas</h3><dl class="an-dl an-dl--wide">${form}</dl>
    <h3 class="an-kick mono">Arquivos para conferir</h3>
    <p class="an-files"><a href="../data/processed/analysis_methodology.json" download>analysis_methodology.json</a> (metodologia) · <a href="../data/processed/analysis_results.json" download>analysis_results.json</a> (resultados) · <a href="../data/processed/dashboard_data.json" download>dashboard_data.json</a> (séries de origem) · <a href="https://github.com/leonardotteixeira/custava-quanto/blob/master/scripts/build_analise.py" target="_blank" rel="noopener">build_analise.py</a> (cálculo) · <a href="https://github.com/leonardotteixeira/custava-quanto/blob/master/docs/AUDITORIA_ANALISE_GOVERNOS.md" target="_blank" rel="noopener">auditoria</a></p>
    <p class="an-files">Para refazer o cálculo: <code>python scripts/build_analise.py</code> e depois <code>python scripts/test_analise.py</code>.</p>`;
}

// ------------------------------------------------------------ montagem
function renderModo() {
  $("#an-igual").checked = modo === "mesmo_tempo";
  renderRegua();
  renderMinuto();
  $("#an-dims").innerHTML = M.dimensoes.map(evidencia).join("");
  renderPesou();
  renderPrioridades();
  renderSens();
  renderResumo();
}

// Vídeo decorativo da abertura: só toca com o bloco visível; nada toca com
// movimento reduzido ou economia de dados (fica o pôster); o botão pausa/retoma.
function initHeroVideo() {
  const v = $("#an-video"), btn = $("#an-video-btn");
  if (!v || !btn) return;
  const economia = navigator.connection?.saveData === true;
  let pausadoPeloLeitor = matchMedia("(prefers-reduced-motion: reduce)").matches || economia;
  let visivel = false;
  const rotulo = () => { btn.textContent = pausadoPeloLeitor ? "Reproduzir animação" : "Pausar animação"; btn.setAttribute("aria-pressed", String(pausadoPeloLeitor)); };
  rotulo();
  btn.addEventListener("click", () => {
    pausadoPeloLeitor = !pausadoPeloLeitor; rotulo();
    if (pausadoPeloLeitor) v.pause(); else if (visivel) v.play().catch(() => {});
  });
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting && e.intersectionRatio >= 0.35;
    if (visivel && !pausadoPeloLeitor) v.play().catch(() => {}); else v.pause();
  }, { threshold: [0, 0.35] }).observe(v);
}

export async function initAnalise() {
  if (!$("#analise")) return;
  initHeroVideo();
  [M, R] = await Promise.all([getJSON("../data/processed/analysis_methodology.json"), getJSON("../data/processed/analysis_results.json")]);
  if (!M || !R) {
    $("#an-body").innerHTML = `<p class="an-part-lead">Não foi possível carregar a análise (<code>data/processed/analysis_methodology.json</code> e <code>analysis_results.json</code>). Rode <code>scripts/build_analise.py</code>.</p>`;
    return;
  }
  modo = M.regras.modo_principal || "completo";
  $("#an-version").textContent = `Metodologia v${M.versao} · dados de ${dataCurta(R.dados_gerados_em.slice(0, 10))}`;
  renderEscopo();
  renderContexto();
  renderAuditoria();
  renderModo();
  $("#an-igual").addEventListener("change", (e) => {
    modo = e.target.checked ? "mesmo_tempo" : M.regras.modo_principal;
    renderModo();
  });
}
