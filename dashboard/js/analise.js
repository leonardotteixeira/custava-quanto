// CUSTAVA QUANTO? — capítulo "Análise" (metodologia v1.1).
//
// Só apresentação. A metodologia (analysis_methodology.json) e os resultados
// (analysis_results.json) vêm prontos de scripts/build_analise.py. Aqui se
// escolhe a janela, formata e desenha. A única conta feita no navegador é a soma
// ponderada dos SENTIDOS já calculados (+1, 0, -1) quando o leitor mexe nas
// prioridades — a mesma fórmula escrita na metodologia. Nenhum número econômico
// é calculado aqui.
import { esc, fmtNum, mesAno, dataCurta, dataNoticia, monthIdx } from "./util.js";
import { spark } from "./charts.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let M = null; // metodologia
let R = null; // resultados
let modo = "completo"; // janela principal; "mesmo_tempo" é a visão secundária
let pesos = null; // prioridades do leitor (dimensão -> 0..100)
let MARCOS = []; // marcos históricos (noticias.json, itens com "marco"): contexto, nunca causa
const ctxSel = {}; // dimensão -> indicador escolhido no gráfico de contexto

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
  const jt = janela("DESOCUPACAO");
  if (jt) {
    $("#an-ruler").insertAdjacentHTML("beforeend", `<p class="an-ruler-note">Mercado de trabalho (PNAD Contínua): cada ponto é um trimestre móvel, identificado pelo mês em que termina, e só entram os trimestres inteiros dentro de cada período: de ${quando(jt.b.inicio)} a ${quando(jt.b.fim)} e de ${quando(jt.l.inicio)} a ${quando(jt.l.fim)}. Último resultado publicado: ${esc(R.mercado_trabalho.series.DESOCUPACAO.ultima_observacao_rotulo)}.</p>`);
  }
  const jm = R.janela_muda;
  $("#an-control-note").textContent = jm?.dimensoes?.length ? jm.texto : "A leitura de cada dimensão é a mesma nas duas janelas.";
}

// ------------------------------------------------------------ em 1 minuto
function linhaDim(d) {
  const r = dimRes(d.id);
  if (d.tipo !== "A") return `<span class="an-min-res">descritos, sem direção definida</span><span class="an-min-leit">fora da síntese</span>`;
  if (r.por_serie) {
    const nomes = { DESOCUPACAO: "desocupação, média", SUBUTILIZACAO: "subutilização, média", RENDIMENTO: "rendimento real, variação" };
    const linhas = r.por_serie.map((l) => `<span class="an-min-line"><span class="an-pair">${nomes[l.id] || esc(l.nome)}</span> <span class="an-pair">${tag("Bolsonaro")} <b>${fmtValor(l.id, l.Bolsonaro)}</b></span><span class="an-pair">${tag("Lula")} <b>${fmtValor(l.id, l.Lula)}</b></span></span>`).join("");
    return `<span class="an-min-res an-min-multi">${linhas}</span><span class="an-min-leit">${chipLado(r.leitura)}<small>${r.votos.lula} de ${r.por_serie.length} séries pelo período Lula</small></span>`;
  }
  const pb = r.por_periodo.Bolsonaro, pl = r.por_periodo.Lula;
  const unidade = { custo_vida: "variação real mediana", inflacao: "inflação média em 12 meses", renda: "variação mediana do poder de compra", atividade: "crescimento médio anual" }[d.id] || "mediana";
  return `<span class="an-min-res"><span class="an-pair">${unidade}</span> <span class="an-pair">${tag("Bolsonaro")} <b>${valDim(r, pb.mediana_valor)}</b></span><span class="an-pair">${tag("Lula")} <b>${valDim(r, pl.mediana_valor)}</b></span></span>
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
  trabalho: "E o mercado de trabalho?",
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

// ------------------------------------------------------------ contexto histórico (marcos)
const TIPO_ROTULO = {
  choque_global: "Choque global", choque_externo: "Choque externo", choque_fiscal: "Reação a anúncio fiscal", politica_monetaria: "Política monetária",
  politica_fiscal: "Política fiscal", politica_tributaria: "Política tributária", politica_trabalhista: "Política trabalhista", politica_salarial: "Salário mínimo",
  politica_energetica: "Preço dos combustíveis", protecao_social: "Proteção social", regulatoria: "Regulação", comercio_exterior: "Comércio exterior",
  calamidade: "Calamidade", mercado: "Mercado", dado_oficial: "Dado oficial",
};
const CTX_SERIES = {
  custo_vida: ["GASOLINA", "DIESEL", "Arroz"], inflacao: ["IPCA"], renda: ["SALARIO_REAL", "SM_GASOLINA"],
  trabalho: ["DESOCUPACAO", "SUBUTILIZACAO", "RENDIMENTO"], atividade: ["PIB"], mercados: ["DOLAR", "SELIC", "IBOVESPA"],
};
const periodoDe = (iso) => (iso < "2023-01-01" ? "Bolsonaro" : "Lula");

function fmtSerie(id, v) {
  if (v == null) return "—";
  if (["DESOCUPACAO", "SUBUTILIZACAO", "IPCA", "PIB"].includes(id)) return `${fmtNum(v, 1)}%`;
  if (id === "SELIC") return `${fmtNum(v, 2)}%`;
  if (id === "RENDIMENTO" || id === "SALARIO_REAL") return `R$ ${fmtNum(v, 0)}`;
  if (["DOLAR", "GASOLINA", "DIESEL"].includes(id)) return `R$ ${fmtNum(v, 2)}`;
  if (id === "IBOVESPA") return `${fmtNum(v / 1000, 1)} mil`;
  if (id === "SM_GASOLINA") return `${fmtNum(v, 0)} litros`;
  return fmtNum(v, 0);
}

// Marcos de uma dimensão: os de maior relevância primeiro, espalhados pelos anos (no máximo n).
function marcosDim(dimId, n = 7) {
  const cand = MARCOS.filter((m) => m.marco.dimensoes.includes(dimId));
  // relevância alta primeiro; entre elas, os eventos (choques, decisões) antes das divulgações de dado, que já aparecem nos números da própria dimensão
  const chave = (m) => (m.marco.relevancia === "alta" ? 0 : 2) + (m.marco.tipo === "dado_oficial" ? 1 : 0);
  const rank = [...cand].sort((a, b) => chave(a) - chave(b) || a.data.localeCompare(b.data));
  const esc_ = new Set(), anos = new Map();
  rank.forEach((m) => { const y = m.data.slice(0, 4); if (esc_.size < n && (anos.get(y) || 0) < 1) { esc_.add(m); anos.set(y, 1); } });
  rank.forEach((m) => { const y = m.data.slice(0, 4); if (esc_.size < n && (anos.get(y) || 0) < 2) { esc_.add(m); anos.set(y, (anos.get(y) || 0) + 1); } });
  return [...esc_].sort((a, b) => a.data.localeCompare(b.data));
}

function valorNoMes(id, iso) {
  const m = meta(id), rows = ind(id).serie;
  const r = m.anual ? rows.find((x) => x.iso.slice(0, 4) === iso.slice(0, 4)) : rows.find((x) => x.iso.slice(0, 7) === iso.slice(0, 7));
  return r ? r.v : null;
}

function graficoContexto(id, evs) {
  const m = meta(id), rows = ind(id).serie.filter((r) => r.iso >= "2019-01-01");
  const compacto = innerWidth <= 760; // no celular o desenho é feito na largura real, para o texto do gráfico não encolher
  const W = compacto ? 360 : 1000, H = compacto ? 330 : 350, Lm = compacto ? 54 : 64, Rm = compacto ? 12 : 18, Tm = 34, Bm = 100;
  const t0 = monthIdx("2019-01-01"), t1 = monthIdx(rows[rows.length - 1].iso);
  const X = (iso) => Lm + ((Math.min(Math.max(monthIdx(iso), t0), t1) - t0) / (t1 - t0)) * (W - Lm - Rm);
  const vals = rows.map((r) => r.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  const Y = (v) => Tm + (1 - (v - lo) / (hi - lo)) * (H - Tm - Bm);
  const path = (rs) => rs.map((r, k) => `${k ? "L" : "M"}${X(r.iso).toFixed(1)},${Y(r.v).toFixed(1)}`).join("");
  const antes = rows.filter((r) => r.iso < "2023-01-01"), depois = rows.filter((r) => r.iso >= "2023-01-01");
  const ponte = antes.length && depois.length ? [antes[antes.length - 1], ...depois] : depois;
  const yt = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const anos = [];
  for (let a = 2019; a <= Number(rows[rows.length - 1].iso.slice(0, 4)); a++) anos.push(a);
  const xc = X("2023-01-01");
  const fila = [-99, -99];
  const marcas = evs.map((e, k) => {
    const x = X(e.data), lin = x - fila[0] >= 24 ? 0 : x - fila[1] >= 24 ? 1 : 0;
    fila[lin] = x;
    const v = valorNoMes(id, e.data), yy = v == null ? Tm : Y(v), yb = H - Bm + 44 + lin * 28;
    return `<g class="ctx-ev"><line x1="${x}" y1="${yy}" x2="${x}" y2="${yb - 10}" /><circle cx="${x}" cy="${yb}" r="10" /><text x="${x}" y="${yb + 4}" text-anchor="middle">${k + 1}</text></g>`;
  }).join("");
  const ptsAnual = m.anual ? rows.map((r) => `<circle class="ctx-pt" cx="${X(r.iso)}" cy="${Y(r.v)}" r="3.5" />`).join("") : "";
  return `<svg class="ctx-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.nome)} de ${mesAno(rows[0].iso)} a ${mesAno(rows[rows.length - 1].iso)}, com ${evs.length} eventos marcados; a lista logo abaixo descreve cada evento.">
    ${yt.map((v) => `<g class="ctx-grid"><line x1="${Lm}" x2="${W - Rm}" y1="${Y(v)}" y2="${Y(v)}" /><text x="${Lm - 8}" y="${Y(v) + 4}" text-anchor="end">${fmtSerie(id, v)}</text></g>`).join("")}
    ${anos.map((a) => `<text class="ctx-x" x="${X(`${a}-01-01`)}" y="${H - Bm + 16}" text-anchor="middle">${a}</text>`).join("")}
    <line class="ctx-cut" x1="${xc}" x2="${xc}" y1="${Tm - 8}" y2="${H - Bm}" />
    <text class="ctx-per" x="${xc - 8}" y="${Tm - 14}" text-anchor="end">${compacto ? "Bolsonaro" : "Período Bolsonaro"}</text>
    <text class="ctx-per" x="${xc + 8}" y="${Tm - 14}">${compacto ? "Lula" : "Período Lula · em curso"}</text>
    <path class="ctx-line ctx-line--b" d="${path(antes)}" /><path class="ctx-line ctx-line--l" d="${path(ponte)}" />
    ${ptsAnual}
    ${marcas}
  </svg>`;
}

function cartaoEvento(e, k, id) {
  const m = e.marco, v = valorNoMes(id, e.data), sm = meta(id);
  const mes = sm.trimestre_movel ? `trimestre encerrado em ${mesAno(e.data)}` : mesAno(e.data);
  return `<li class="an-ev"><span class="an-ev-n mono" aria-hidden="true">${k + 1}</span>
    <div class="an-ev-body">
      <p class="an-ev-meta mono"><time datetime="${e.data}">${dataNoticia(e.data)}</time> · ${esc(TIPO_ROTULO[m.tipo] || m.tipo)} · ocorreu no período ${periodoDe(e.data)}</p>
      <p class="an-ev-t"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.titulo)}</a> <span class="an-ev-src">${esc(e.veiculo)}</span></p>
      <p class="an-ev-s">${esc(m.resumo)}</p>
      ${v != null ? `<p class="an-ev-v mono">${esc(sm.nome)} no mês do evento: <b>${fmtSerie(id, v)}</b>${sm.trimestre_movel ? ` (${mes})` : ""}</p>` : ""}
    </div></li>`;
}

// No celular só os 3 primeiros eventos de cada dimensão ficam abertos; o botão mostra o resto (no computador o botão some e a lista é inteira).
const EV_VISIVEIS = 3;
const evAbertos = new Set();
// No celular cada dimensão mostra primeiro o essencial (pergunta, números, gráfico, leitura, o que não mede);
// contexto do período, robustez, maiores movimentos e a tabela por série ficam atrás de um botão. Nada é removido.
const deepAbertos = new Set();
const CELULAR = matchMedia("(max-width: 760px)");
function blocoContexto(dimId) {
  const ids = (CTX_SERIES[dimId] || []).filter((id) => ind(id) && !ind(id).excluido);
  if (!ids.length) return "";
  const sel = ids.includes(ctxSel[dimId]) ? ctxSel[dimId] : ids[0];
  ctxSel[dimId] = sel;
  const evs = marcosDim(dimId);
  if (!evs.length) return "";
  const botoes = ids.length > 1 ? `<div class="an-ctx-btns" role="group" aria-label="Série exibida no gráfico">${ids.map((id) => `<button type="button" class="an-ctx-btn" data-dim="${dimId}" data-ind="${esc(id)}" aria-pressed="${id === sel}">${esc(meta(id).nome)}</button>`).join("")}</div>` : "";
  return `<div class="an-ctx-block" id="an-ctx-${dimId}">
    <h4 class="an-kick mono">Contexto do período</h4>
    <p class="an-ctx-lead">O que estava acontecendo em torno dos movimentos desta série. Os eventos aparecem pela data em que ocorreram, não por terem causado a mudança.</p>
    ${botoes}
    <figure class="an-ctx-fig">${graficoContexto(sel, evs)}<figcaption class="mono">${esc(meta(sel).nome)} · ${esc(meta(sel).unidade)}${meta(sel).trimestre_movel ? " · trimestre móvel, no mês em que termina" : ""} · fonte: ${esc(meta(sel).fonte)}</figcaption></figure>
    <ol class="an-ev-list${evAbertos.has(dimId) ? " is-open" : ""}" id="an-evl-${dimId}">${evs.map((e, k) => cartaoEvento(e, k, sel)).join("")}</ol>
    ${evs.length > EV_VISIVEIS ? `<button type="button" class="an-ev-mais" data-dim="${dimId}" aria-expanded="${evAbertos.has(dimId)}" aria-controls="an-evl-${dimId}">${evAbertos.has(dimId) ? "Mostrar menos eventos" : `Mostrar os outros ${evs.length - EV_VISIVEIS} eventos (${EV_VISIVEIS + 1} a ${evs.length})`}</button>` : ""}
  </div>`;
}

// Mercado de trabalho: cada série na sua unidade, com o seu voto.
function trabalhoBlock(d, r) {
  const rot = { DESOCUPACAO: "média da taxa no período", SUBUTILIZACAO: "média da taxa no período", RENDIMENTO: "variação do início ao fim" };
  const cards = r.por_serie.map((l) => {
    const m = meta(l.id), i = ind(l.id), f = i.fonte_ultima;
    const ini = (p) => l.metrica === "media" ? `${fmtSerie(l.id, l.valor_inicio[p])} → ${fmtSerie(l.id, l.valor_fim[p])}` : `${fmtSerie(l.id, l.valor_inicio[p])} → ${fmtSerie(l.id, l.valor_fim[p])}`;
    const alt = l.alternativa;
    const altTxt = l.metrica === "media"
      ? `Do início ao fim da janela, a taxa variou ${pp(alt.Bolsonaro, 1)} no período Bolsonaro e ${pp(alt.Lula, 1)} no período Lula.`
      : `Média do rendimento real na janela: ${fmtSerie(l.id, alt.Bolsonaro)} no período Bolsonaro e ${fmtSerie(l.id, alt.Lula)} no período Lula.`;
    return `<article class="an-tb">
      <h4>${esc(m.nome)}</h4>
      <p class="an-tb-rot mono">${rot[l.id]} · ${esc(m.unidade)}</p>
      <div class="an-tb-vals">
        <div data-gov="b"><span class="an-big-v">${fmtValor(l.id, l.Bolsonaro)}</span>${tag("Bolsonaro")}<small>${ini("Bolsonaro")}</small></div>
        <div data-gov="l"><span class="an-big-v">${fmtValor(l.id, l.Lula)}</span>${tag("Lula")}<small>${ini("Lula")}</small></div>
      </div>
      <p class="an-tb-voto">${chipLado(l.leitura)}</p>
      <p class="an-tb-alt">${altTxt}</p>
      <p class="an-tb-src mono">${esc(m.fonte)} · ${esc(m.frequencia)} · último resultado: ${esc(f.rotulo)}</p>
    </article>`;
  }).join("");
  return `<div class="an-trab">${cards}</div>`;
}

function evidencia(d) {
  const r = dimRes(d.id);
  const ids = M.indicadores.filter((i) => i.dimensao === d.id).map((i) => i.id);
  const idsA = ids.filter((id) => meta(id).tipo === "A");
  let visual = "", numero = "";
  if (d.tipo === "A" && r.por_serie) {
    visual = trabalhoBlock(d, r);
  } else if (d.tipo === "A") {
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
  const leitura = d.tipo === "A" ? `<p>${esc(res().textos.por_dimensao[d.id])}</p><p class="an-read-lado">${chipLado(r.leitura)}</p>${r.por_serie ? `<p class="an-read-alt">Com a métrica alternativa (variação do início ao fim para as taxas; média da janela para o rendimento), a dimensão ${r.leitura_alternativa === 0 ? "ficaria praticamente igual entre os períodos" : `apontaria para o período ${r.leitura_alternativa > 0 ? "Lula" : "Bolsonaro"}`}. A métrica principal foi fixada antes do cálculo (regra da métrica na metodologia).</p>` : ""}` : `<p>${esc(res().textos.por_dimensao[d.id])}</p>`;
  const aberto = deepAbertos.has(d.id);
  const temDeep = [blocoContexto(d.id), robustezDim(r), movimentos(d), numeros(ids)].some(Boolean);
  return `<section class="an-part an-dim${aberto ? " is-deep" : ""}" id="an-dim-${d.id}" aria-labelledby="an-dt-${d.id}">
    <p class="an-part-n mono">Parte ${d.ordem + 2} · ${esc(d.titulo)}</p>
    <h3 class="an-part-title" id="an-dt-${d.id}">${TITULOS[d.id] || esc(d.titulo)}</h3>
    <div class="an-q"><span class="mono">A pergunta</span><p>${esc(d.pergunta)}</p><span class="an-dim-type">${badgeEvid(r.nivel_evidencia)}<span class="mono">${n}</span></span></div>
    <p class="an-part-lead">${esc(d.explicacao)}</p>
    <dl class="an-scope"><div><dt class="mono">Mede</dt><dd>${esc(fim(d.mede))}</dd></div><div><dt class="mono">Não mede</dt><dd>${esc(fim(d.nao_mede))}</dd></div></dl>
    <div class="an-evid${r.por_serie ? " an-evid--serie" : ""}">${numero}${visual}</div>
    ${ctx}
    ${blocoContexto(d.id)}
    <div class="an-read"><h4 class="an-kick mono">Leitura dos dados</h4><div>${leitura}</div></div>
    ${infos}
    ${temDeep ? `<button type="button" class="an-deep-btn" data-dim="${d.id}" aria-expanded="${aberto}">${aberto ? "Recolher o detalhe" : "Ver o detalhe: contexto do período, robustez e números por série"}</button>` : ""}
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
    <p class="an-mv-nota">Entram só séries em variação real (custo de vida, poder de compra do salário mínimo e rendimento do trabalho). ${dimRes("custo_vida").sem_uma_serie ? `Tirando uma série de cada vez, a leitura de Custo de vida se mantém em ${dimRes("custo_vida").sem_uma_serie.iguais} de ${dimRes("custo_vida").sem_uma_serie.n} testes.` : ""}</p>`;
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
      if (r.por_serie) return `<tr><th scope="row">${esc(d.titulo)}</th><td data-label="Evidência">${badgeEvid(r.nivel_evidencia)}</td><td class="num" colspan="2" data-label="Valores">${r.por_serie.length} séries, cada uma na sua unidade: ${r.votos.lula} pelo período Lula, ${r.votos.bolsonaro} pelo Bolsonaro, ${r.votos.iguais} iguais</td><td data-label="Leitura">${chipLado(r.leitura)}</td></tr>`;
      return `<tr><th scope="row">${esc(d.titulo)}</th><td data-label="Evidência">${badgeEvid(r.nivel_evidencia)}</td><td class="num" data-label="Período Bolsonaro">${valDim(r, r.por_periodo.Bolsonaro.mediana_valor)}</td><td class="num" data-label="Período Lula">${valDim(r, r.por_periodo.Lula.mediana_valor)}</td><td data-label="Leitura">${chipLado(r.leitura)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  const t = res().textos;
  $("#an-geral").innerHTML = `<p>${esc(t.geral)}</p><p>${esc(t.robustez)}</p>
    <p class="an-geral-fim">Leitura descritiva das séries do projeto, sob a metodologia v${esc(M.versao)}, na janela “${esc(M.regras.modos_nomes[modo].toLowerCase())}”. Não mede causa e muda com os pesos.</p>`;
}

// ------------------------------------------------------------ contexto e auditoria
function renderContexto() {
  const alta = MARCOS.filter((m) => m.marco.relevancia === "alta");
  // no máximo dois por ano, para a lista não virar um noticiário
  const porAno = new Map();
  const escolhidos = alta.filter((m) => { const y = m.data.slice(0, 4), n = porAno.get(y) || 0; porAno.set(y, n + 1); return n < 2; });
  $("#an-timeline").innerHTML = escolhidos.length
    ? escolhidos.map((e) => `<li><time datetime="${e.data}">${mesAno(e.data)}</time><span class="an-tl-cat mono">${esc(TIPO_ROTULO[e.marco.tipo] || e.marco.tipo)}</span><span class="an-tl-txt"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.titulo)}</a> <span class="an-ev-src">${esc(e.veiculo)}</span></span><span class="an-tl-rel">${esc(e.marco.resumo)}</span></li>`).join("")
    : `<li><span class="an-tl-txt">Sem marcos de contexto carregados (data/processed/noticias.json).</span></li>`;
  const tlb = $("#an-tl-mais");
  if (tlb) { tlb.hidden = escolhidos.length <= 4; tlb.textContent = `Mostrar os outros ${escolhidos.length - 4} marcos`; }
  const todos = $("#an-ctx-todos");
  if (todos) todos.textContent = `${MARCOS.length} marcos verificados na fonte, de ${new Set(MARCOS.map((m) => m.data.slice(0, 4))).size} anos. Linha do tempo completa em Contexto.`;
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
    <h3 class="an-kick mono">Mercado de trabalho: séries do IBGE</h3>
    <div class="table-scroll"><table class="an-table"><thead><tr><th scope="col">Série</th><th scope="col">Tabela e variável (SIDRA)</th><th scope="col">Unidade</th><th scope="col">Escopo</th><th scope="col">Último resultado</th><th scope="col">Endereço da tabela</th></tr></thead><tbody>${Object.values(R.mercado_trabalho.series).map((x) => `<tr><th scope="row">${esc(x.nome_oficial)}</th><td>tabela ${x.tabela_sidra}, variável ${x.variavel_sidra}</td><td>${esc(x.unidade)}</td><td>${esc(x.escopo_geografico)}; ${esc(x.populacao)}</td><td>${esc(x.ultima_observacao_rotulo)}: ${fmtNum(x.ultimo_valor, x.unidade === "%" ? 1 : 0)}</td><td><a href="${esc(x.url_tabela)}" target="_blank" rel="noopener">${esc(x.url_tabela.replace("https://", ""))}</a></td></tr>`).join("")}</tbody></table></div>
    <p class="an-files">${esc(R.mercado_trabalho.nota)} Dados coletados em ${dataCurta(R.mercado_trabalho.coletado_em.slice(0, 10))}.</p>
    <h3 class="an-kick mono">Contexto histórico (notícias e eventos)</h3>
    <dl class="an-dl an-dl--wide">${Object.entries(M.regras.contexto_historico).map(([k, v]) => `<dt>${esc({ papel: "Papel", arquivo: "Arquivo", o_que_entra: "O que entra", fontes: "Fontes", datas: "Datas", ligacao_com_indicadores: "Ligação com os indicadores", causalidade: "Causalidade", resumos: "Resumos" }[k] || k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <h3 class="an-kick mono">Fórmulas</h3><dl class="an-dl an-dl--wide">${form}</dl>
    <h3 class="an-kick mono">Arquivos para conferir</h3>
    <p class="an-files"><a href="../data/processed/analysis_methodology.json" download>analysis_methodology.json</a> (metodologia) · <a href="../data/processed/analysis_results.json" download>analysis_results.json</a> (resultados) · <a href="../data/processed/dashboard_data.json" download>dashboard_data.json</a> (séries de origem) · <a href="https://github.com/leonardotteixeira/custava-quanto/blob/master/scripts/build_analise.py" target="_blank" rel="noopener">build_analise.py</a> (cálculo) · <a href="https://github.com/leonardotteixeira/custava-quanto/blob/master/docs/AUDITORIA_ANALISE_GOVERNOS.md" target="_blank" rel="noopener">auditoria</a></p>
    <p class="an-files">Para refazer o cálculo: <code>python scripts/build_analise.py</code> e depois <code>python scripts/test_analise.py</code>.</p>`;
  if (CELULAR.matches) sanfonar(alvo);
}

// Cada subtítulo (h3.an-kick) vira um <details> com o que vem depois dele, até o próximo subtítulo.
function sanfonar(raiz) {
  $$("h3.an-kick", raiz).forEach((h) => {
    const det = document.createElement("details");
    det.className = "an-acc";
    const sum = document.createElement("summary");
    h.replaceWith(det);
    sum.appendChild(h);
    det.appendChild(sum);
    let n = det.nextSibling;
    while (n && !(n.nodeType === 1 && n.matches("h3.an-kick"))) { const nx = n.nextSibling; det.appendChild(n); n = nx; }
  });
}

// Sumário da análise (celular): as partes em ordem, para pular direto para uma delas.
function renderSumario() {
  const nav = $("#an-toc");
  if (!nav) return;
  const itens = $$("#an-body h3.an-part-title[id], #an-body .an-rule h3[id], #an-body .an-minute h3[id]");
  nav.innerHTML = `<details><summary><span class="mono">Nesta análise</span> ${itens.length} partes</summary><ol>${itens.map((h) => {
    const n = h.closest("section")?.querySelector(".an-part-n")?.textContent.split("·")[0].trim();
    return `<li><a href="#${h.id}">${n ? `<span class="mono">${esc(n)}</span>` : ""}${esc(h.textContent.trim())}</a></li>`;
  }).join("")}</ol></details>`;
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
  const [nj, mj, rj] = await Promise.all([getJSON("../data/processed/noticias.json"), getJSON("../data/processed/analysis_methodology.json"), getJSON("../data/processed/analysis_results.json")]);
  [M, R] = [mj, rj];
  MARCOS = (nj?.itens || []).filter((n) => n.marco && /^https:\/\//.test(n.url)).sort((a, b) => a.data.localeCompare(b.data));
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
  renderSumario();
  $("#an-toc")?.addEventListener("click", (e) => { if (e.target.closest("a")) e.target.closest("details").open = false; });
  $("#an-tl-mais")?.addEventListener("click", (e) => {
    const ul = $("#an-timeline"), aberto = ul.classList.toggle("is-open");
    e.currentTarget.setAttribute("aria-expanded", String(aberto));
    e.currentTarget.textContent = aberto ? "Mostrar menos marcos" : `Mostrar os outros ${ul.children.length - 4} marcos`;
  });
  $("#an-dims").addEventListener("click", (e) => {
    const deep = e.target.closest(".an-deep-btn");
    if (deep) {
      const dim = deep.dataset.dim, sec = deep.closest(".an-dim"), aberto = sec.classList.toggle("is-deep");
      if (aberto) deepAbertos.add(dim); else deepAbertos.delete(dim);
      deep.setAttribute("aria-expanded", String(aberto));
      deep.textContent = aberto ? "Recolher o detalhe" : "Ver o detalhe: contexto do período, robustez e números por série";
      return;
    }
    const mais = e.target.closest(".an-ev-mais");
    if (mais) {
      const dim = mais.dataset.dim;
      if (evAbertos.has(dim)) evAbertos.delete(dim); else evAbertos.add(dim);
      $(`#an-ctx-${dim}`).outerHTML = blocoContexto(dim);
      $(`#an-ctx-${dim} .an-ev-mais`)?.focus();
      return;
    }
    const b = e.target.closest(".an-ctx-btn");
    if (!b) return;
    ctxSel[b.dataset.dim] = b.dataset.ind;
    const bloco = $(`#an-ctx-${b.dataset.dim}`);
    bloco.outerHTML = blocoContexto(b.dataset.dim);
    $(`#an-ctx-${b.dataset.dim} .an-ctx-btn[aria-pressed="true"]`)?.focus();
  });
  matchMedia("(max-width: 760px)").addEventListener("change", () => renderModo());
  // links diretos (#an-dim-trabalho etc.): as seções nascem depois do carregamento, então o salto do navegador falha
  if (/^#an-/.test(location.hash)) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  $("#an-igual").addEventListener("change", (e) => {
    modo = e.target.checked ? "mesmo_tempo" : M.regras.modo_principal;
    renderModo();
  });
}
