// CUSTAVA QUANTO? — capítulo "Análise".
//
// Só apresentação. A metodologia (analysis_methodology.json) e os resultados
// (analysis_results.json) vêm prontos de scripts/build_analise.py. Aqui se
// escolhe o modo, formata e desenha. A única conta feita no navegador é a soma
// ponderada dos SENTIDOS já calculados (+1, 0, -1) quando o leitor muda os
// pesos — a mesma fórmula escrita na metodologia.
import { esc, fmtNum, mesAno, dataCurta, monthIdx } from "./util.js";
import { spark } from "./charts.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let M = null; // metodologia
let R = null; // resultados
let modo = "mesmo_tempo";

async function getJSON(url) {
  try { const r = await fetch(url, { cache: "no-cache" }); return r.ok ? await r.json() : null; } catch { return null; }
}

// ------------------------------------------------------------ formatação
const sgn = (v) => (v > 0 ? "+" : v < 0 ? "−" : "");
const pct = (v, d = 1) => (v == null ? "—" : `${sgn(v)}${fmtNum(Math.abs(v), d)}%`);
const pp = (v, d = 2) => (v == null ? "—" : `${sgn(v)}${fmtNum(Math.abs(v), d)} p.p.`);
const PER = { Bolsonaro: "Bolsonaro", Lula: "Lula" };
const LEIT = { 1: "Lula", "-1": "Bolsonaro", 0: "sem diferença relevante" };
const meta = (id) => M.indicadores.find((i) => i.id === id);
const dimMeta = (id) => M.dimensoes.find((d) => d.id === id);
const ind = (id) => R.indicadores.find((i) => i.id === id);
const res = () => R.modos[modo];
const dimRes = (id) => res().dimensoes.find((d) => d.id === id);

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
const tag = (p) => `<span class="an-tag" data-gov="${p === "Bolsonaro" ? "b" : "l"}">${p}${p === "Lula" && modo === "completo" ? " · em curso" : ""}</span>`;

// ------------------------------------------------------------ régua
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
  const barra = (n, p) => `<span class="an-bar" data-gov="${p}" style="width:${(n / total) * 100}%"></span>`;
  const card = (p, w, n, extra) => `<div class="an-pcard" data-gov="${p === "Bolsonaro" ? "b" : "l"}">
      ${tag(p)}
      <span class="an-pcard-when">${quando(w.inicio)} → ${quando(w.fim)}</span>
      <span class="an-pcard-dur"><b>${n} meses</b> · dado mensal${extra || ""}</span>
      <div class="an-bar-track">${barra(n, p === "Bolsonaro" ? "b" : "l")}</div>
    </div>`;
  const tri = R.pib_ultimo_trimestre;
  $("#an-ruler").innerHTML = `
    <div class="an-pcards">
      ${card("Bolsonaro", g.b, g.nb, modo === "completo" ? " · mandato completo" : ` · meses 1 a ${g.nb} do mandato`)}
      ${card("Lula", g.l, g.nl, modo === "completo" ? " · período em curso" : ` · meses 1 a ${g.nl} do mandato`)}
    </div>
    <p class="an-ruler-note">${modo === "mesmo_tempo"
      ? `Comparação com o mesmo tempo de mandato: <b>${g.nb} meses de cada período</b>. Indicadores com série mais curta usam só os meses em que os dois lados têm dado: IPCA em 12 meses, de ${quando(ipca.b.inicio)} a ${quando(ipca.b.fim)} contra ${quando(ipca.l.inicio)} a ${quando(ipca.l.fim)} (${ipca.nb} meses); PIB, ${pib.nb} anos fechados de cada período (${quando(pib.b.inicio, { anual: true })}-${quando(pib.b.fim, { anual: true })} e ${quando(pib.l.inicio, { anual: true })}-${quando(pib.l.fim, { anual: true })}).`
      : `Períodos de tamanhos diferentes: ${g.nb} meses contra ${g.nl} meses, com o governo Lula em curso. Dólar, Selic e Ibovespa usam o primeiro e o último dado diário: ${dataCurta(dol.Bolsonaro.inicio)} a ${dataCurta(dol.Bolsonaro.fim)} e ${dataCurta(dol.Lula.inicio)} a ${dataCurta(dol.Lula.fim)}.`}
      Último dado disponível: ${quando(g.l.fim)} (mensal)${tri ? `, ${tri.trimestre.replace("-T", "º tri/").replace(/^(\d{4})º tri\/(\d)$/, "$2º tri/$1")} (PIB trimestral)` : ""}, ${dataCurta(dol.Lula.fim)} (diário).</p>`;
}

// ------------------------------------------------------------ em 1 minuto
function linhaDim(d) {
  const dm = dimMeta(d.id), r = dimRes(d.id);
  if (dm.tipo !== "A") return `<span class="an-min-res">descritos, sem direção boa ou ruim</span>`;
  const pb = r.por_periodo.Bolsonaro, pl = r.por_periodo.Lula;
  const unidade = { custo_vida: "variação real mediana", inflacao: "inflação média em 12 meses", renda: "variação mediana do poder de compra", atividade: "crescimento médio anual" }[d.id] || "mediana";
  const vb = r.metrica === "media" ? `${fmtNum(pb.mediana_valor, 1)}%` : pct(pb.mediana_valor);
  const vl = r.metrica === "media" ? `${fmtNum(pl.mediana_valor, 1)}%` : pct(pl.mediana_valor);
  return `<span class="an-min-res">${unidade} ${tag("Bolsonaro")} <b>${vb}</b> · ${tag("Lula")} <b>${vl}</b></span>
    <span class="an-min-leit">${r.leitura === 0 ? "sem diferença relevante" : `mais favorável no período <b>${LEIT[r.leitura]}</b>`}</span>`;
}
function renderMinuto() {
  $("#an-min-list").innerHTML = M.dimensoes.map((d) => `<li><a href="#an-dim-${d.id}" class="an-min-dim">${esc(d.titulo)}</a>${linhaDim(d)}</li>`).join("");
}

// ------------------------------------------------------------ dimensões
function renderEscopo() {
  $("#an-escopo").textContent = `${M.regras.fora_do_escopo_nota} Ficam de fora: ${M.regras.fora_do_escopo.join(", ").toLowerCase()}.`;
  $("#an-dimgrid").innerHTML = M.dimensoes.map((d) => {
    const n = M.indicadores.filter((i) => i.dimensao === d.id).length;
    return `<a class="an-dimcard" href="#an-dim-${d.id}"><span class="an-dimcard-n mono">${String(d.ordem).padStart(2, "0")}</span><b>${esc(d.titulo)}</b><span class="an-dimcard-q">${esc(d.pergunta)}</span><span class="an-dimcard-meta mono">${n} série${n > 1 ? "s" : ""} · ${d.tipo === "A" ? "direção definida" : "só descrição"}</span></a>`;
  }).join("");
}

const TITULOS = {
  custo_vida: "Começamos pelo que chega ao bolso.",
  inflacao: "Depois, olhamos para a inflação.",
  renda: "Renda e poder de compra.",
  atividade: "A economia cresceu quanto?",
  mercados: "E os mercados?",
};

// Gráfico de pontos pareados: uma linha por série, um ponto por período.
function dotplot(ids) {
  const linhas = ids.map((id) => ({ id, b: ind(id)[modo]?.Bolsonaro?.valor, l: ind(id)[modo]?.Lula?.valor })).filter((x) => x.b != null && x.l != null);
  const vals = linhas.flatMap((x) => [x.b, x.l, 0]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
  const X = (v) => ((v - lo) / (hi - lo)) * 100;
  const m = meta(ids[0]);
  const dirTxt = m.direcao === "menor" ? "← preço real menor: favorável ao consumidor" : m.direcao === "maior" ? "mais poder de compra →" : "";
  const passo = [5, 10, 20, 25, 50, 100].find((s) => (hi - lo) / s <= 6) || 100;
  const ticks = [];
  for (let t = Math.ceil(lo / passo) * passo; t <= hi; t += passo) ticks.push(t);
  return `<figure class="an-dot">
    <div class="an-dot-axis" aria-hidden="true">${ticks.map((t) => `<span style="left:${X(t)}%">${t > 0 ? "+" : ""}${t}%</span>`).join("")}</div>
    ${linhas.map((x) => `<div class="an-dot-row">
      <span class="an-dot-name">${esc(meta(x.id).nome)}</span>
      <span class="an-dot-track" aria-hidden="true">
        <i class="an-dot-zero" style="left:${X(0)}%"></i>
        <i class="an-dot-link" style="left:${Math.min(X(x.b), X(x.l))}%;width:${Math.abs(X(x.b) - X(x.l))}%"></i>
        <i class="an-dot-pt" data-gov="b" style="left:${X(x.b)}%"></i>
        <i class="an-dot-pt" data-gov="l" style="left:${X(x.l)}%"></i>
      </span>
      <span class="an-dot-vals"><span data-gov="b">${pct(x.b)}</span><span data-gov="l">${pct(x.l)}</span></span>
    </div>`).join("")}
    <figcaption>${dirTxt ? `<span class="an-dot-dir">${dirTxt}</span>` : ""}<span class="an-dot-key"><i data-gov="b"></i>Bolsonaro <i data-gov="l"></i>Lula${modo === "completo" ? " (em curso)" : ""}</span></figcaption>
  </figure>`;
}

function mini(id, { anual = false } = {}) {
  const i = ind(id);
  const rows = i.serie.map((r) => ({ iso: r.iso, v: r.v }));
  if (!rows.length) return "";
  const m0 = monthIdx(rows[0].iso), m1 = monthIdx(rows[rows.length - 1].iso);
  return `<div class="an-mini-chart">${spark(rows, { m0, m1, cutLine: true, maxGap: anual ? 12 : 1, width: 1.75, pad: 8 })}</div>`;
}

function pibBars() {
  const i = ind("PIB");
  const rows = i.serie.filter((r) => r.iso >= "2019-01-01");
  const lo = Math.min(0, ...rows.map((r) => r.v)), hi = Math.max(0, ...rows.map((r) => r.v));
  const H = (v) => (Math.abs(v) / (hi - lo)) * 100;
  const z = (hi / (hi - lo)) * 100;
  return `<figure class="an-pib"><div class="an-pib-bars" style="--z:${z}%">${rows.map((r) => `<div class="an-pib-col"><span class="an-pib-bar" data-gov="${r.iso < "2023-01-01" ? "b" : "l"}" style="height:${H(r.v)}%;${r.v >= 0 ? `bottom:${100 - z}%` : `top:${z}%`}"></span><span class="an-pib-v" style="${r.v >= 0 ? `bottom:calc(${100 - z + H(r.v)}% + 3px)` : `top:calc(${z + H(r.v)}% + 3px)`}">${pct(r.v)}</span><span class="an-pib-y mono">${r.iso.slice(0, 4)}</span></div>`).join("")}</div>
    <figcaption>Crescimento real do PIB em cada ano fechado. ${R.pib_ultimo_trimestre ? `${R.pib_ultimo_trimestre.trimestre.slice(0, 4)} ainda não tem resultado anual: há dados até o ${R.pib_ultimo_trimestre.trimestre.slice(-1)}º trimestre (${pct(R.pib_ultimo_trimestre.variacao_interanual)} contra o mesmo trimestre do ano anterior), que não entram na média.` : ""} Fonte: IBGE, Contas Nacionais Trimestrais.</figcaption></figure>`;
}

function numeros(ids) {
  return `<details class="an-nums"><summary>Ver os números de cada série</summary><div class="table-scroll"><table class="an-table">
    <thead><tr><th scope="col">Série</th><th scope="col">Métrica</th><th scope="col">Bolsonaro · janela</th><th scope="col">Bolsonaro</th><th scope="col">Lula · janela</th><th scope="col">Lula</th><th scope="col">Fonte</th></tr></thead>
    <tbody>${ids.map((id) => {
      const i = ind(id), m = meta(id), s = i[modo];
      if (!s) return "";
      const an = !!m.anual, di = modo === "completo" && m.diario;
      return `<tr><th scope="row">${esc(m.nome)}${m.tipo === "C" ? ' <span class="an-tipo">informativo</span>' : ""}</th><td>${metricaLabel(id)}</td>
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
  const out = [
    `<li><span class="mono">Maior movimento favorável</span>${nome(r.maior_favoravel.id)}, período ${r.maior_favoravel.periodo}: ${fmtValor(r.maior_favoravel.id, ind(r.maior_favoravel.id)[modo][r.maior_favoravel.periodo].valor)}</li>`,
    `<li><span class="mono">Maior movimento desfavorável</span>${nome(r.maior_desfavoravel.id)}, período ${r.maior_desfavoravel.periodo}: ${fmtValor(r.maior_desfavoravel.id, ind(r.maior_desfavoravel.id)[modo][r.maior_desfavoravel.periodo].valor)}</li>`,
  ];
  if (r.maior_divergencia && d.id !== "inflacao" && d.id !== "atividade") {
    const i = ind(r.maior_divergencia)[modo];
    out.push(`<li><span class="mono">Maior diferença entre os períodos</span>${nome(r.maior_divergencia)}: ${fmtValor(r.maior_divergencia, i.Bolsonaro.valor)} contra ${fmtValor(r.maior_divergencia, i.Lula.valor)}</li>`);
  }
  const outl = (r.outliers || []).map((o) => `${nome(o.id)} no período ${o.periodo} (${fmtValor(o.id, ind(o.id)[modo][o.periodo].valor)})`);
  return `<div class="an-moves"><h4 class="an-kick mono">Os maiores movimentos</h4><ul>${out.join("")}</ul>
    ${outl.length ? `<p class="an-outl"><b>Fora do padrão:</b> ${outl.join("; ")}. Estas séries se afastam muito da mediana da dimensão; a mediana existe justamente para que um caso extremo não decida a leitura sozinho. Isso não é, por si, evidência a favor de nenhum período.</p>` : ""}</div>`;
}

function evidencia(d) {
  const r = dimRes(d.id);
  const ids = M.indicadores.filter((i) => i.dimensao === d.id).map((i) => i.id);
  const idsA = ids.filter((id) => meta(id).tipo === "A");
  let visual = "", numero = "";
  if (d.tipo === "A") {
    const pb = r.por_periodo.Bolsonaro, pl = r.por_periodo.Lula;
    const f = (v) => (r.metrica === "media" ? `${fmtNum(v, 1)}%` : pct(v));
    const rot = r.metrica === "media" ? (d.id === "atividade" ? "crescimento médio anual do PIB" : "inflação média em 12 meses") : `${idsA.length > 1 ? "mediana da " : ""}variação real${idsA.length > 1 ? ` de ${idsA.length} séries` : ""}`;
    numero = `<div class="an-big">
      <div data-gov="b"><span class="an-big-v">${f(pb.mediana_valor)}</span>${tag("Bolsonaro")}</div>
      <div data-gov="l"><span class="an-big-v">${f(pl.mediana_valor)}</span>${tag("Lula")}</div>
      <p class="an-big-lab">${rot}</p></div>`;
  }
  if (d.id === "custo_vida" || d.id === "renda") visual = dotplot(idsA);
  if (d.id === "inflacao") {
    const s = ind("IPCA")[modo];
    visual = `<figure class="an-mini">${mini("IPCA")}<figcaption>IPCA acumulado em 12 meses, mês a mês. Mínimo e máximo na janela: ${tag("Bolsonaro")} ${fmtNum(s.Bolsonaro.min, 1)}% a ${fmtNum(s.Bolsonaro.max, 1)}% · ${tag("Lula")} ${fmtNum(s.Lula.min, 1)}% a ${fmtNum(s.Lula.max, 1)}%. Fonte: IBGE.</figcaption></figure>`;
  }
  if (d.id === "atividade") visual = pibBars();
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
  const aviso = d.id === "custo_vida" ? `<p class="an-warn"><b>Atenção:</b> nos seis alimentos, os números são variação de um <b>índice de preço encadeado</b> (IBGE), não o preço em reais de cada produto. “+24%” quer dizer que o índice subiu 24% descontada a inflação, não que o quilo passou a custar 24% a mais em reais.</p>` : "";
  const ctxComb = d.id === "custo_vida" && modo === "completo" ? (() => {
    const c = ind("GASOLINA").contexto_completo;
    if (!c) return "";
    return `<p class="an-ctx">No mesmo intervalo, o dólar variou ${pct(c.Bolsonaro.cambio_variacao_pct)} no período Bolsonaro e ${pct(c.Lula.cambio_variacao_pct)} no Lula${c.Bolsonaro.brent_usd_variacao_pct != null ? `; o petróleo Brent, em dólares, ${pct(c.Bolsonaro.brent_usd_variacao_pct)} no período Bolsonaro${c.Lula.brent_usd_variacao_pct != null ? ` e ${pct(c.Lula.brent_usd_variacao_pct)} no Lula` : ""} (FRED)` : ""}. Combustíveis dependem dos dois; isso é contexto, não explicação.</p>`;
  })() : "";
  const infos = ids.filter((id) => meta(id).tipo === "C").map((id) => {
    const s = ind(id)[modo];
    return `<p class="an-info"><b>${esc(meta(id).nome)}</b> (informativo, fora da leitura): ${fmtValor(id, s.Bolsonaro.valor)} no período Bolsonaro e ${fmtValor(id, s.Lula.valor)} no Lula. ${esc(meta(id).interpretacao)}</p>`;
  }).join("");
  const n = d.tipo === "A" ? `<span class="an-dim-type mono">direção definida · ${idsA.length} série${idsA.length > 1 ? "s" : ""}</span>` : `<span class="an-dim-type mono">só descrição · ${ids.length} séries</span>`;
  return `<section class="an-part an-dim" id="an-dim-${d.id}" aria-labelledby="an-dt-${d.id}">
    <p class="an-part-n mono">Parte ${d.ordem + 2} · ${esc(d.titulo)}</p>
    <h3 class="an-part-title" id="an-dt-${d.id}">${TITULOS[d.id] || esc(d.titulo)}</h3>
    <div class="an-q"><span class="mono">A pergunta</span><p>${esc(d.pergunta)}</p>${n}</div>
    <p class="an-part-lead">${esc(d.explicacao)}</p>
    ${aviso}
    <div class="an-evid">${numero}${visual}</div>
    ${ctxComb}
    <div class="an-read"><h4 class="an-kick mono">Leitura dos dados</h4><p>${esc(res().textos.por_dimensao[d.id])}</p></div>
    ${infos}
    ${movimentos(d)}
    ${numeros(ids)}
  </section>`;
}

// ------------------------------------------------------------ síntese e sensibilidade
function sentidoTxt(s) { return s === 0 ? "sem sentido predominante" : `leitura mais favorável no período <b>${s > 0 ? "Lula" : "Bolsonaro"}</b>`; }

function renderSintese() {
  const dims = M.dimensoes.map((d) => ({ d, r: dimRes(d.id) }));
  $("#an-sintese").innerHTML = `<div class="table-scroll an-scroll"><table class="an-table an-synth">
    <thead><tr><th scope="col">Dimensão</th><th scope="col">Pergunta</th><th scope="col">Leitura</th></tr></thead>
    <tbody>${dims.map(({ d, r }) => `<tr><th scope="row">${esc(d.titulo)}</th><td>${esc(d.pergunta)}</td><td>${d.tipo !== "A" ? "descrição, fora da síntese" : r.leitura === 0 ? "sem diferença relevante" : `mais favorável no período <b>${LEIT[r.leitura]}</b>`}</td></tr>`).join("")}</tbody></table></div>
    <p class="an-synth-txt">${esc(res().textos.geral)}</p>`;
}

function renderSens() {
  const sint = res().sintese;
  $("#an-sens").innerHTML = `<div class="table-scroll an-scroll"><table class="an-table an-sens-t">
    <thead><tr><th scope="col">Cenário (definido antes do cálculo)</th>${M.dimensoes.filter((d) => d.tipo === "A").map((d) => `<th scope="col" class="num">${esc(d.titulo)}</th>`).join("")}<th scope="col">Resultado</th></tr></thead>
    <tbody>${M.cenarios.map((c, j) => `<tr><th scope="row">${esc(c.nome)}<span class="an-cen-j">${esc(c.justificativa)}</span></th>${M.dimensoes.filter((d) => d.tipo === "A").map((d) => `<td class="num">${c.pesos[d.id]}%</td>`).join("")}<td>${sentidoTxt(sint[j].sentido)}</td></tr>`).join("")}</tbody></table></div>
    <p class="an-robust">${esc(res().textos.robustez)}</p>`;
  const dimsA = M.dimensoes.filter((d) => d.tipo === "A");
  const box = $("#an-weights");
  if (!box.dataset.ready) {
    box.innerHTML = `<h4 class="an-kick mono">Teste seus próprios pesos</h4>
      <div class="an-w-grid">${dimsA.map((d) => `<label class="an-w"><span>${esc(d.titulo)}</span><input type="number" min="0" max="100" step="5" value="25" data-dim="${d.id}" inputmode="numeric"></label>`).join("")}</div>
      <p class="an-w-out" id="an-w-out" aria-live="polite"></p>
      <p class="an-w-note">Soma ponderada do sentido de cada dimensão (+1 Lula, −1 Bolsonaro, 0 sem diferença). O peso muda quanto cada dimensão conta, nunca o número de cada série.</p>`;
    box.addEventListener("input", calcPesos);
    box.dataset.ready = "1";
  }
  calcPesos();
}

function calcPesos() {
  const ins = $$("#an-weights input");
  const pesos = Object.fromEntries(ins.map((i) => [i.dataset.dim, Math.max(0, Number(i.value) || 0)]));
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  const soma = M.dimensoes.filter((d) => d.tipo === "A").reduce((a, d) => a + pesos[d.id] * (dimRes(d.id).leitura || 0), 0);
  const cont = { 1: 0, "-1": 0, 0: 0 };
  M.dimensoes.filter((d) => d.tipo === "A").forEach((d) => { cont[dimRes(d.id).leitura]++; });
  $("#an-w-out").innerHTML = total === 0
    ? "Todos os pesos estão em zero: não há síntese."
    : `Com estes pesos: ${sentidoTxt(Math.sign(soma))}. Sem ponderação (uma dimensão, um voto): ${cont[1]} Lula, ${cont[-1]} Bolsonaro, ${cont[0]} sem diferença.`;
}

// ------------------------------------------------------------ contexto, conclusão, auditoria
function renderContexto() {
  $("#an-timeline").innerHTML = M.contexto_externo.map((e) => `<li><time datetime="${e.iso}">${mesAno(e.iso)}</time><span class="an-tl-cat mono">${esc(e.categoria)}</span><span class="an-tl-txt">${esc(e.texto)}</span><span class="an-tl-rel">Coincide no tempo: ${esc(e.relacao.replace(/^coincide no tempo com /, ""))}.</span><span class="an-tl-src">Fonte: ${esc(e.fonte)}</span></li>`).join("");
}

function renderConclusao() {
  const t = res().textos;
  $("#an-conc-list").innerHTML = M.dimensoes.map((d) => `<div><dt>${esc(d.titulo)}</dt><dd>${esc(t.por_dimensao[d.id])}</dd></div>`).join("");
  $("#an-conc-geral").innerHTML = `<h4 class="an-kick mono">Leitura geral</h4><p>${esc(t.geral)}</p><p>${esc(t.robustez)}</p>
    <p>Isso descreve o que as séries disponíveis mostram sob a metodologia v${esc(M.versao)}, na janela escolhida (${modo === "mesmo_tempo" ? "mesmo tempo de governo" : "período completo disponível, com o governo Lula em curso"}). Não é uma avaliação dos governos: não mede causa, deixa de fora emprego, contas públicas e investimento, e muda se você der pesos diferentes às dimensões.</p>`;
}

function renderAuditoria() {
  const linhas = M.indicadores.map((m) => `<tr><th scope="row">${esc(m.nome)}</th><td>${esc(dimMeta(m.dimensao).titulo)}</td><td class="num">${m.tipo}</td><td>${m.direcao === "menor" ? "menor é favorável" : m.direcao === "maior" ? "maior é favorável" : "sem direção"}</td><td>${esc(m.metrica === "variacao_pct" ? "variação %" : m.metrica === "media" ? "média" : "nível (p.p.)")} · ${esc(m.campo)}</td><td>${esc(m.fonte)}</td><td>${esc(m.frequencia)}</td><td>${esc(m.confianca)}</td></tr>`).join("");
  const form = Object.entries(M.regras.formulas).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
  $("#an-audit").innerHTML = `
    <div class="an-aud-grid">
      <div><h4 class="an-kick mono">Versão</h4><p>Metodologia <b>v${esc(M.versao)}</b> de ${esc(M.data.split("-").reverse().join("/"))}. Resultados gerados em ${dataCurta(R.gerado_em.slice(0, 10))} a partir dos dados de ${dataCurta(R.dados_gerados_em.slice(0, 10))}.</p><p class="an-hash mono">SHA-256 da metodologia: ${esc(R.metodologia_sha256)}</p></div>
      <div><h4 class="an-kick mono">Períodos</h4><dl class="an-dl">${Object.entries(M.regras.modos).map(([k, v]) => `<dt>${k === "mesmo_tempo" ? "Mesmo tempo de governo" : "Período completo disponível"}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
      <div><h4 class="an-kick mono">Tipos de indicador</h4><dl class="an-dl">${Object.entries(M.tipos).map(([k, v]) => `<dt>Tipo ${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
      <div><h4 class="an-kick mono">Exclusões e escopo</h4><p>${M.regras.exclusoes.length ? esc(M.regras.exclusoes.join("; ")) : "Nenhuma série do projeto foi excluída."} ${esc(M.regras.fora_do_escopo_nota)}</p><p>Tolerância para “sem diferença relevante”: ${fmtNum(M.regras.tolerancia.variacao_pct, 1)} ponto em variações e ${fmtNum(M.regras.tolerancia.media, 1)} ponto em médias.</p></div>
    </div>
    <h4 class="an-kick mono">Indicadores, direção e fonte</h4>
    <div class="table-scroll"><table class="an-table"><thead><tr><th scope="col">Série</th><th scope="col">Dimensão</th><th scope="col">Tipo</th><th scope="col">Direção</th><th scope="col">Métrica · campo</th><th scope="col">Fonte</th><th scope="col">Frequência</th><th scope="col">Confiança</th></tr></thead><tbody>${linhas}</tbody></table></div>
    <h4 class="an-kick mono">Fórmulas</h4><dl class="an-dl an-dl--wide">${form}</dl>
    <h4 class="an-kick mono">Arquivos para conferir</h4>
    <p class="an-files"><a href="../data/processed/analysis_methodology.json" download>analysis_methodology.json</a> (metodologia) · <a href="../data/processed/analysis_results.json" download>analysis_results.json</a> (resultados) · <a href="../data/processed/dashboard_data.json" download>dashboard_data.json</a> (séries de origem) · <a href="https://github.com/leonardotteixeira/custava-quanto/blob/master/scripts/build_analise.py" target="_blank" rel="noopener">build_analise.py</a> (cálculo) · <a href="https://github.com/leonardotteixeira/custava-quanto/blob/master/docs/AUDITORIA_ANALISE_GOVERNOS.md" target="_blank" rel="noopener">auditoria</a></p>
    <p class="an-files">Para refazer o cálculo: <code>python scripts/build_analise.py</code> e depois <code>python scripts/test_analise.py</code>.</p>`;
}

// ------------------------------------------------------------ montagem
function renderModo() {
  $$("#an-mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === modo)));
  renderRegua();
  renderMinuto();
  $("#an-dims").innerHTML = M.dimensoes.map(evidencia).join("");
  renderSintese();
  renderSens();
  renderConclusao();
}

export async function initAnalise() {
  if (!$("#analise")) return;
  [M, R] = await Promise.all([getJSON("../data/processed/analysis_methodology.json"), getJSON("../data/processed/analysis_results.json")]);
  if (!M || !R) {
    $("#an-body").innerHTML = `<p class="an-part-lead">Não foi possível carregar a análise (<code>data/processed/analysis_methodology.json</code> e <code>analysis_results.json</code>). Rode <code>scripts/build_analise.py</code>.</p>`;
    return;
  }
  modo = M.regras.modo_principal || "mesmo_tempo";
  $("#an-version").textContent = `Metodologia v${M.versao} · dados de ${dataCurta(R.dados_gerados_em.slice(0, 10))}`;
  renderEscopo();
  renderContexto();
  renderAuditoria();
  renderModo();
  $("#an-mode").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-modo]");
    if (!b || b.dataset.modo === modo) return;
    modo = b.dataset.modo;
    renderModo();
  });
}
