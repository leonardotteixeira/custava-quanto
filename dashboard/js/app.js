// CUSTAVA QUANTO? — aplicação (v2).
//
// Lê data/processed/dashboard_data.json (tudo já calculado em Python) e
// noticias.json (matérias reais conferidas na fonte) e monta a publicação.
// Nenhum cálculo econômico novo acontece aqui: só formatação, escolha de
// meses e razões de exibição entre valores prontos (variação entre dois
// meses, base 100 num mês escolhido, largura de barras).

import {
  PERIODO_CORTE, PERIODOS, configurarPeriodos, getGovernmentComparison, comparisonPoints, pointLabel, PRODUCT_ORDER, META, familia, kind, nativeValue, isTaxaLike,
  isNil, fmtNum, fmtInt, fmtBRL, fmtPct, fmtPP, fmtValue, fmtValueHTML, change, fmtChange, sign,
  mesAno, mesAnoCurto, mesAnoLongo, dataCurta, dataNoticia, mesKey, monthIdx,
  lastValid, firstValid, rowAt, rowAtYear, cadenceGap, baseRow, temPrecoAbsoluto, $, $$, esc, reduceMotion, pmark, setPressed, countTo,
} from "./util.js";
import { lineChart, spark, texture, scrubViz } from "./charts.js";
import { renderPibIntro, renderPibExtra, renderPibContext, hidePibBlocks, bindPibControls, anoDaNoticia, triLabel } from "./pib.js";

const DATA_URL = "../data/processed/dashboard_data.json";
const NEWS_URL = "../data/processed/noticias.json";
const STATUS_URL = "../data/processed/mercados_status.json";

let D = null;
let NEWS = [];
let NEWS_META = null;
let STATUS = null;
let MONTHS = [];
let heroChart = null; // API do gráfico-textura da abertura (ver charts.js:texture) — sincronizado com S.product
const S = { pibYear: null, product: "GASOLINA", base: "troca", metric: "nominal", cohort: "governo_inteiro", newsId: null, ppIdx: null, tmIso: null, archive: "produto" };
const P = (code) => D.produtos[code];

// Datas públicas e amplamente documentadas, só como referência de
// calendário nos gráficos. Não implicam causa (ver Método > E).
const EVENTS = [
  { iso: "2020-03-01", text: "OMS declara pandemia de covid-19", fam: null },
  { iso: "2022-02-01", text: "Rússia invade a Ucrânia", fam: null },
  { iso: "2022-06-01", text: "Lei Complementar 194 limita o ICMS sobre combustíveis", fam: "comb" },
  { iso: "2023-03-01", text: "Volta parcial da cobrança de PIS/Cofins sobre a gasolina", fam: "comb" },
  { iso: "2026-02-01", text: "EUA e Israel iniciam a ofensiva contra o Irã (28/fev)", fam: "comb" },
];
const eventsFor = (prod) => EVENTS.filter((e) => !e.fam || e.fam === familia(prod)).map((e, i) => ({ ...e, key: "ABCDEFG"[i] }));

const FAMS = [
  { key: "comb", title: "Combustíveis", unit: "R$ · média nacional" },
  { key: "alim", title: "Alimentos", unit: "índice · não é R$" },
  { key: "merc", title: "Economia", unit: "unidade de cada um" }, // inclui mercados e PIB
];

// ------------------------------------------------------------ unidades
function unidade(code) {
  if (code === "GLP") return { por: "por botijão de 13 kg", um: "1 botijão", plural: "botijões", singular: "botijão" };
  if (code === "DOLAR") return { por: "por dólar", um: "1 dólar", plural: "dólares", singular: "dólar" };
  return { por: "por litro", um: "1 litro", plural: "litros", singular: "litro" };
}
function unitLong(code) {
  const prod = P(code);
  if (prod.tipo === "combustivel") return `R$ ${unidade(code).por} · média nacional · ANP`;
  if (code === "DOLAR") return "R$ por dólar · PTAX venda, média do mês · Banco Central";
  if (prod.tipo === "alimento_indice") return "Índice de preço, jan/2019 = 100 · IBGE · não é valor em reais";
  if (code === "SELIC") return "% ao ano · meta definida pelo Copom · Banco Central";
  if (code === "IPCA") return "% acumulado em 12 meses · IBGE";
  if (prod.tipo === "pib") return "Variação real acumulada no ano (%) · Contas Nacionais · IBGE";
  return "Pontos · fechamento do último pregão do mês · B3";
}
// Meses sem dado na fonte, dentro do intervalo da série (declarados na página).
function missingMonths(prod) {
  const get = nativeValue(prod);
  const have = new Set(prod.serie_mensal.filter((r) => !isNil(get(r))).map((r) => monthIdx(r.ano_mes)));
  const ms = [...have];
  const out = [];
  for (let m = Math.min(...ms); m <= Math.max(...ms); m++) if (!have.has(m)) out.push(mesAno(`${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`));
  return out;
}
// Fato documentado pela própria ANP (página "Informações sobre o levantamento de
// preços de combustíveis"): a pesquisa ficou suspensa por troca de contrato.
const ANP_SEM_PESQUISA = { mes: "2020-09", texto: "A ANP não fez pesquisa de preços entre 23/08 e 17/10/2020 (troca do contrato de coleta)." };
const famTitle = (prod) => FAMS.find((f) => f.key === familia(prod)).title;
const nativeRows = (prod, get = nativeValue(prod)) => prod.serie_mensal.map((r) => ({ iso: r.ano_mes, v: get(r) }));
const lastRow = (prod) => lastValid(prod.serie_mensal, nativeValue(prod));

// ------------------------------------------------------------ notícias
const GRUPO_TAG = { comb: "combustiveis", alim: "alimentos" };
function noticiasDo(code) {
  const tag = GRUPO_TAG[familia(P(code))];
  return NEWS
    .filter((n) => n.produtos.includes(code) || (tag && n.produtos.includes(tag)))
    .map((n) => ({ ...n, especifica: n.produtos.includes(code) }))
    .sort((a, b) => a.data.localeCompare(b.data));
}
function noticiasParaGrafico(code, max = 8) {
  const todas = noticiasDo(code);
  if (todas.length <= max) return todas;
  // Entre as matérias do mesmo ano, a mais próxima do pico da série vem primeiro:
  // assim o marcador do ano do pico aponta para a notícia daquele mês.
  const prod = P(code), get = nativeValue(prod);
  const pico = prod.serie_mensal.filter((r) => !isNil(get(r))).reduce((x, r) => (get(r) > get(x) ? r : x));
  const dPico = (n) => Math.abs(monthIdx(n.data) - monthIdx(pico.ano_mes));
  const prio = [...todas].sort((a, b) => Number(b.especifica) - Number(a.especifica) || Number(b.tema === "ormuz-ira") - Number(a.tema === "ormuz-ira") || dPico(a) - dPico(b));
  const escolhidas = new Set(), anos = new Set();
  prio.forEach((n) => { const a = n.data.slice(0, 4); if (escolhidas.size < max && !anos.has(a)) { escolhidas.add(n); anos.add(a); } });
  prio.forEach((n) => { if (escolhidas.size < max) escolhidas.add(n); });
  return [...escolhidas].sort((a, b) => a.data.localeCompare(b.data));
}
// Linha da série no mês da matéria (ou vizinha, se aquele mês faltar).
function linhaDoMes(prod, iso, get) {
  const rows = prod.serie_mensal;
  const i = rows.findIndex((r) => mesKey(r.ano_mes) === mesKey(iso));
  if (i < 0) return null;
  for (const k of [i, i - 1, i + 1]) if (rows[k] && !isNil(get(rows[k]))) return rows[k];
  return null;
}
function clip(n, { lead = false, sum = true, value = "" } = {}) {
  const img = n.imagem
    ? `<figure class="clip-fig"><img src="${esc(n.imagem)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>Foto: ${esc(n.credito_imagem || n.veiculo)}</figcaption></figure>`
    : "";
  // matérias do tema "guerra no Irã": sempre com a informação de contexto, para
  // ninguém ler a manchete sem saber a que ela se refere
  const tag = n.tema === "ormuz-ira" ? `<p class="clip-tag">Guerra no Irã e Estreito de Ormuz · contexto do período</p>` : "";
  return `<article class="clip${lead ? " clip--lead" : ""}">
    ${img}${tag}
    <p class="clip-meta"><b>${esc(n.veiculo)}</b><time datetime="${esc(n.data)}">${dataNoticia(n.data)}</time></p>
    <h3 class="clip-title"><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
    ${sum && n.resumo ? `<p class="clip-sum">${esc(n.resumo)}</p>` : ""}
    ${value}
    <a class="clip-link" href="${esc(n.url)}" target="_blank" rel="noopener">Leia a matéria original →<span class="sr-only"> (${esc(n.veiculo)}, abre em nova aba)</span></a>
  </article>`;
}

// ------------------------------------------------------------ carga
async function getJSON(url) {
  try { const r = await fetch(url, { cache: "no-cache" }); return r.ok ? await r.json() : null; } catch { return null; }
}

async function init() {
  if (!reduceMotion()) document.documentElement.classList.add("js-reveal");
  D = await getJSON(DATA_URL);
  if (!D) {
    $("#historia .shell").innerHTML = `<p class="story-lede">Não foi possível carregar os dados (<code>${DATA_URL}</code>). Sirva o projeto por HTTP a partir da raiz: <code>python -m http.server</code>.</p>`;
    return;
  }
  const nj = await getJSON(NEWS_URL);
  NEWS = (nj?.itens || []).filter((n) => /^https?:\/\//.test(n.url));
  NEWS_META = nj;
  STATUS = await getJSON(STATUS_URL);
  MONTHS = Object.keys(D.fotografia_mensal).sort();
  configurarPeriodos(D.periodo_corte, MONTHS);
  labelBaseToggle();

  const q = new URLSearchParams(location.search);
  const slug = q.get("historia");
  const found = PRODUCT_ORDER.find((c) => META[c].slug === slug && D.produtos[c]);
  if (found) S.product = found;
  if (q.get("desde") === "2019") S.base = "inicio";
  setPressed($("#baseline-toggle"), $(`#baseline-toggle [data-base="${S.base}"]`));

  renderHero();
  fitNameplate();
  document.fonts?.ready.then(fitNameplate);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fitNameplate, 120); });
  initMachine();
  bindControls();
  bindPibControls(() => P("PIB"));
  selectProduct(S.product, { initial: true });
  renderMethod();
  bindScroll();
  bindReveal();
}

// =====================================================================
// ABERTURA
// =====================================================================
// Rótulos do seletor de ponto de partida, vindos dos marcos centralizados.
function labelBaseToggle() {
  const t = $('#baseline-toggle [data-base="troca"]'), i = $('#baseline-toggle [data-base="inicio"]');
  t.innerHTML = `<b>${mesAno(PERIODOS.trocaGoverno)}</b><span>último dado antes da troca de governo</span>`;
  i.innerHTML = `<b>${mesAno(PERIODOS.serieInicio)}</b><span>início da série histórica</span>`;
}

function renderHero() {
  const first = MONTHS[0], last = MONTHS[MONTHS.length - 1];
  const veiculos = new Set(NEWS.map((n) => n.veiculo)).size;
  $("#hero-dateline").innerHTML = ["Investigação em dados", "Brasil", `${mesAno(first)} → ${mesAno(last)}`, `Dados até ${mesAnoLongo(last)}`].map((s) => `<span>${s}</span>`).join("");
  $("#hero-facts").innerHTML = [
    `<span><b>${PRODUCT_ORDER.filter((c) => D.produtos[c]).length}</b> séries</span>`,
    `<span><b>${MONTHS.length}</b> meses</span>`,
    `<span><b>${NEWS.length}</b> matérias de <b>${veiculos}</b> veículos</span>`,
    `<span>ANP · IBGE · Banco Central · B3 · FRED</span>`,
  ].join("");

  // Fundo curado: só os indicadores de referência (cada um na SUA frequência) + a história
  // selecionada, que pode ser qualquer uma. Nada é preenchido entre observações.
  const HERO_SET = ["GASOLINA", "ETANOL", "DOLAR", "SELIC", "IPCA", "IBOVESPA", "PIB"];
  const heroCodes = [...new Set([...HERO_SET, S.product])].filter((c) => D.produtos[c]);
  const heroSeries = heroCodes.map((c) => ({ key: c, rows: heroRows(P(c)), maxGap: cadenceGap(P(c)) }));
  const Fh = D.fotografia_mensal;
  heroSeries.push({ key: "SALARIO_MINIMO", rows: MONTHS.filter((m) => !isNil(Fh[m]?.salario_minimo)).map((m) => ({ iso: m, v: Fh[m].salario_minimo })), maxGap: 1 });
  heroChart = texture($("#hero-texture"), heroSeries, { cutoff: PERIODO_CORTE, highlight: S.product, window: [monthIdx(MONTHS[0]), monthIdx(MONTHS[MONTHS.length - 1])] });
  updateHeroHighlight(S.product);

  // Faixa "da troca de governo ao último dado": seis indicadores. Dólar,
  // Selic e Ibovespa usam o último dado DIÁRIO de dez/2022 e o último dado
  // diário disponível; os demais, o mês da troca e o último mês com dado.
  const F = D.fotografia_mensal;
  const items = [
    { k: "gasolina", label: "Gasolina · R$/litro", freq: "preço médio · mensal", fmt: (v) => fmtBRL(v), taxa: false },
    { k: "etanol", label: "Etanol · R$/litro", freq: "preço médio · mensal", fmt: (v) => fmtBRL(v), taxa: false, prod: "ETANOL" },
    { k: "dolar", label: "Dólar · R$", freq: "PTAX venda · diário", fmt: (v) => fmtBRL(v), taxa: false, diario: "DOLAR" },
    { k: "salario_minimo", label: "Salário mínimo", freq: "valor nominal · mensal", fmt: (v) => fmtBRL(v, 0), taxa: false },
    { k: "selic", label: "Selic · % ao ano", freq: "meta · % a.a.", fmt: (v) => `${fmtNum(v, 2)}%`, taxa: true, diario: "SELIC" },
    { k: "ipca", label: "Inflação · 12 meses", freq: "variação acumulada em 12 meses", fmt: (v) => `${fmtNum(v, 2)}%`, taxa: true },
    { k: "ibovespa", label: "Ibovespa · pontos", freq: "fechamento · diário", fmt: (v) => fmtInt(v), taxa: false, diario: "IBOVESPA" },
    { k: "pib", label: "PIB · variação real", freq: "variação real · anual", fmt: (v) => `${fmtNum(v, 1)}%`, taxa: true, pib: true },
  ];
  $("#ribbon-from").textContent = mesAno(PERIODOS.trocaGoverno);
  $("#hero-ribbon").innerHTML = items.map((it) => {
    const d = it.diario && P(it.diario)?.diario;
    let va, vb, la, lb;
    const pp = it.pib ? P("PIB") : null;
    if (pp) {
      // PIB é anual: compara o último ano fechado com o ano da troca de governo (2022).
      const an = pp.serie_mensal.filter((r) => !isNil(nativeValue(pp)(r)));
      const ra = an.filter((r) => `${r.ano}-12-01` <= PERIODO_CORTE).pop() || an[0], rb = an[an.length - 1];
      va = nativeValue(pp)(ra); vb = nativeValue(pp)(rb); la = String(ra.ano); lb = String(rb.ano);
    } else if (it.prod && P(it.prod)) {
      const rs = nativeRows(P(it.prod)).filter((r) => !isNil(r.v));
      const ra = rs.filter((r) => r.iso < PERIODO_CORTE).pop() || rs[0], rb = rs[rs.length - 1];
      va = ra.v; vb = rb.v; la = mesAno(ra.iso); lb = mesAno(rb.iso);
    } else if (d?.troca && d?.ultimo) { va = d.troca.valor; vb = d.ultimo.valor; la = dataCurta(d.troca.data); lb = dataCurta(d.ultimo.data); }
    else {
      const ms = MONTHS.filter((m) => !isNil(F[m]?.[it.k]));
      const a = ms.filter((m) => m < PERIODO_CORTE).pop() || ms[0], b = ms[ms.length - 1];
      va = F[a][it.k]; vb = F[b][it.k]; la = mesAno(a); lb = mesAno(b);
    }
    const dl = it.taxa ? fmtPP(vb - va) : fmtPct((vb / va - 1) * 100);
    return `<li>
      <span class="rb-label">${it.label}</span>
      <span class="rb-freq">${it.freq}${it.pib && P("PIB").ultimo_trimestre ? ` · último dado disponível: ${triLabel(P("PIB").ultimo_trimestre.trimestre)}` : ""}</span>
      <span class="rb-now">${it.fmt(vb)}</span>
      <span class="rb-from">em ${lb} · era <b>${it.fmt(va)}</b> em ${la}</span>
      <span class="rb-delta">${dl}</span>
    </li>`;
  }).join("");
}

// Mantém a linha em destaque no gráfico-textura da abertura sincronizada com
// a história selecionada — chamado no load inicial e sempre que S.product
// muda (ver selectProduct). Reusa a mesma API para qualquer uma das 15
// séries, nada específico de gasolina.
// Observações de cada série na textura da abertura, cada uma com a SUA data.
// Séries mensais: o mês. PIB é anual (um resultado por ano, "acumulado no ano"):
// o ponto entra no fim do ano a que se refere (dez), não em jan, para não
// parecer que o resultado de um ano termina onde ele começa. Os dados em si
// não mudam; é só a posição do ponto no eixo.
function heroRows(prod) {
  if (prod.tipo === "pib") return prod.serie_mensal.map((r) => ({ iso: `${r.ano}-12-01`, v: nativeValue(prod)(r) }));
  return nativeRows(prod);
}

function updateHeroHighlight(code) {
  heroChart?.setHighlight(code);
  const label = $("#texture-highlight");
  if (label) label.textContent = META[code].curto;
  const nota = $("#texture-note");
  if (nota) nota.textContent = P(code).tipo === "pib" ? " O PIB é anual: cada ponto é o resultado do ano, no fim dele; a linha para no último ano fechado." : "";
}

// O nome ocupa a largura toda. O CSS acerta o tamanho com a fonte da casa;
// se ela não carregar (rede lenta), a fonte reserva é mais larga — então
// medimos e reduzimos até caber, nunca cortando o "?".
function fitNameplate() {
  const h = $(".nameplate");
  if (!h) return;
  h.style.fontSize = "";
  const avail = h.clientWidth;
  const need = Math.max(h.scrollWidth, ...$$(".np-word", h).map((w) => w.scrollWidth));
  if (need > avail + 1) h.style.fontSize = `${(parseFloat(getComputedStyle(h).fontSize) * avail / need) * 0.985}px`;
}

// =====================================================================
// 01 · ÍNDICE
// =====================================================================
function renderTOC() {
  const html = FAMS.map((f) => {
    const codes = PRODUCT_ORDER.filter((c) => D.produtos[c] && familia(P(c)) === f.key);
    return `<div class="toc-col"><h3><span>${f.title}</span><span class="mono">${f.unit}</span></h3><ol class="toc-list">${codes.map(tocRow).join("")}</ol></div>`;
  }).join("");
  $("#toc").innerHTML = html;
  $("#toc-note").textContent = `Variação entre o ponto de partida escolhido (${S.base === "troca" ? `${mesAno(PERIODOS.trocaGoverno)}, último dado antes da troca de governo` : "o primeiro dado de cada série"}) e o último dado disponível. Dólar, Selic e Ibovespa usam o dado diário (com a data real de cada ponto); os demais, o mês. Taxas (Selic, inflação, PIB) variam em pontos percentuais. A série de inflação em 12 meses começa em jan/2020. Alimentos são índice de preço, não valor em reais. O PIB é anual, não mensal.`;
}
function tocRow(code) {
  const prod = P(code), get = nativeValue(prod), k = kind(prod);
  const { a: pa, b: pb } = comparisonPoints(prod, S.base);
  const a = pa.row, b = pb.row, va = pa.v, vb = pb.v;
  const c = change(prod, va, vb);
  const vals = k === "pontos"
    ? `${fmtNum(va / 1000, 1)} → ${fmtNum(vb / 1000, 1)} mil pts`
    : k === "indice" ? `índice ${fmtNum(va, 1)} → ${fmtNum(vb, 1)}`
    : `${fmtValue(prod, va)} → ${fmtValue(prod, vb)}`;
  const sp = spark(nativeRows(prod), { dots: [{ iso: a.ano_mes, size: 6, color: "var(--fg-3)" }, { iso: b.ano_mes, size: 7, color: "var(--fg)" }], width: 1.5, maxGap: cadenceGap(prod) });
  const label = `${META[code].titulo}: ${vals.replace("→", "em " + pointLabel(pa) + ", para")} em ${pointLabel(pb)}; variação ${fmtChange(c)}.`;
  const active = code === S.product;
  return `<li><button type="button" class="toc-row" data-code="${esc(code)}" aria-pressed="${active}" aria-label="${esc(label)}">
    <span class="toc-name">${META[code].curto}</span>
    <span class="toc-vals">${vals}</span>
    <span class="toc-spark">${sp}</span>
    <span class="toc-change">${fmtChange(c, c.unit === "p.p." ? 1 : 1)}<small>desde ${pa.label ?? (pa.daily ? dataCurta(pa.iso) : mesAnoCurto(pa.iso))}</small></span>
  </button></li>`;
}

// =====================================================================
// HISTÓRIA — era → agora
// =====================================================================
function renderStory() {
  const code = S.product, prod = P(code), m = META[code], k = kind(prod), get = nativeValue(prod);
  // Pontos da comparação: dez/2022 → último dado disponível. `a` e `b` são as
  // linhas mensais (usadas só para inflação, poder de compra e período);
  // `va`/`vb` são os valores do ponto — diários para Dólar, Selic e Ibovespa.
  const { a: pa, b: pb } = comparisonPoints(prod, S.base);
  const a = pa.row, b = pb.row, va = pa.v, vb = pb.v, daily = pa.daily;
  const mA = pointLabel(pa), mB = pointLabel(pb);
  const c = change(prod, va, vb);

  // Alimentos com preço CONAB (R$/kg) validado (ver preco_absoluto no JSON,
  // gerado por scripts/download_conab.py): o preço observado vira a métrica
  // PRINCIPAL do herói e o índice IBGE vira uma métrica SECUNDÁRIA — nunca
  // os dois no mesmo número. Se faltar dado da CONAB num dos dois extremos
  // (dez/2022 ou último dado), o índice continua sendo a principal e a
  // secundária mostra "sem dado" nesse mês específico, sem trocar de mês
  // nem de fonte para preencher a lacuna.
  let heroVa = va, heroVb = vb, heroC = c, heroFmt = (v) => fmtValueHTML(prod, v), heroFmtPlain = (v) => fmtValue(prod, v), heroUnit = unitLong(code);
  let secondary = null, usandoPrecoConab = false;
  if (k === "indice" && temPrecoAbsoluto(prod) && !daily) {
    const meta = prod.preco_absoluto;
    const caA = a.preco_conab_brl_kg, caB = b.preco_conab_brl_kg;
    const rotuloCalculo = meta.oficial_nacional ? "CONAB · Varejo" : `CONAB · Varejo · média calculada pelo projeto entre as UFs pesquisadas naquele mês (não é preço nacional oficial da CONAB)`;
    if (!isNil(caA) && !isNil(caB)) {
      usandoPrecoConab = true;
      heroVa = caA; heroVb = caB; heroC = change(prod, caA, caB);
      heroFmt = (v) => `<span class="cur">R$</span>${fmtNum(v, 2)}<span class="suf">/kg</span>`;
      heroFmtPlain = (v) => `${fmtBRL(v)}/kg`;
      heroUnit = `${meta.produto_conab} · ${rotuloCalculo}`;
      secondary = { kicker: "Índice de preço (IBGE)", val: `${fmtNum(va, 1)} → ${fmtNum(vb, 1)}`, src: "IBGE · série encadeada, jan/2019 = 100 · não é R$" };
    } else {
      secondary = { kicker: `${meta.produto_conab} · ${meta.nivel_comercializacao}`, val: "Sem dado da CONAB para este mês", src: rotuloCalculo };
    }
  }

  $("#story-kicker").innerHTML = `<b>${famTitle(prod)}</b> · ${heroUnit}`;
  $("#story-name").textContent = m.titulo;
  const i = PRODUCT_ORDER.indexOf(code), n = PRODUCT_ORDER.length;
  const prev = PRODUCT_ORDER[(i - 1 + n) % n], next = PRODUCT_ORDER[(i + 1) % n];
  $("#story-prev-name").textContent = META[prev].curto; $("#story-prev").dataset.code = prev;
  $("#story-next-name").textContent = META[next].curto; $("#story-next").dataset.code = next;

  // o número dominante: a variação
  const bigEl = $("#story-change");
  const d = heroC.unit === "p.p." ? 2 : 1;
  // PIB: o número principal é o ÚLTIMO dado oficial (trimestre), com a base
  // de comparação escrita; a comparação entre governos (anual) vem logo abaixo.
  const ultTri = k === "pib" ? prod.ultimo_trimestre : null;
  if (ultTri && !isNil(ultTri.variacao_dessazonalizada)) { heroC = { v: ultTri.variacao_dessazonalizada, unit: "%" }; }
  countTo(bigEl, heroC.v, (v) => `${sign(Math.round(v * 10 ** d) / 10 ** d)}${fmtNum(Math.abs(v), d)}<small>${heroC.unit === "p.p." ? " p.p." : "%"}</small>`);
  const what = k === "taxa" ? (code === "SELIC" ? "na taxa Selic, em pontos percentuais," : "na inflação em 12 meses, em pontos percentuais,")
    : k === "pib" ? "no PIB (variação real acumulada no ano), em pontos percentuais,"
    : k === "pontos" ? "no Ibovespa"
    : k === "indice" ? (usandoPrecoConab ? `no preço médio ${m.de}` : `no índice de preço ${m.de}`)
    : code === "DOLAR" ? "na cotação média do dólar" : `no preço médio ${m.de}`;
  $("#story-change-cap").textContent = ultTri && !isNil(ultTri.variacao_dessazonalizada)
    ? `última variação disponível: ${triLabel(ultTri.trimestre)}, contra o trimestre anterior (dessazonalizado). Periodicidade: trimestral.`
    : `${what} entre ${mA} e ${mB}.`;

  // era → agora
  $("#tn-then-when").textContent = daily ? dataCurta(pa.iso) : mesAnoLongo(a.ano_mes);
  $("#tn-now-when").textContent = daily ? dataCurta(pb.iso) : mesAnoLongo(b.ano_mes);
  const grain = daily ? "dado" : "mês";
  const tag = (row, isNow) => `${pmark(row.periodo)}${isNow ? "último dado · " : S.base === "troca" ? `último ${grain} antes da troca · ` : "início da série · "}governo ${row.periodo}`;
  $("#tn-then-tag").innerHTML = tag(a, false);
  $("#tn-now-tag").innerHTML = tag(b, true);
  countTo($("#tn-then-val"), heroVa, heroFmt);
  countTo($("#tn-now-val"), heroVb, heroFmt);

  // barras proporcionais + "se tivesse acompanhado a inflação"
  const ipcaRatio = !isNil(a.ipca_indice) && !isNil(b.ipca_indice) ? b.ipca_indice / a.ipca_indice : null;
  const inflPct = ipcaRatio ? (ipcaRatio - 1) * 100 : null;
  let vRef = null;
  if (usandoPrecoConab) vRef = a.preco_conab_real_brl_kg;
  else if (k === "preco" && !daily) vRef = a.preco_real;
  else if ((k === "preco" || k === "indice" || k === "pontos") && ipcaRatio) vRef = va * ipcaRatio;
  const max = Math.max(heroVa, heroVb, vRef ?? 0) || 1;
  const refPos = vRef ? (vRef / max) * 100 : null;
  const refCls = refPos > 70 ? "flip" : refPos < 18 ? "flip0" : "";
  $("#tn-bars").innerHTML = `
    <div class="tnb"><span>${mesAnoCurto(a.ano_mes)}</span><div class="tnb-track"><div class="tnb-fill" style="transform:scaleX(${(heroVa / max).toFixed(4)})"></div></div></div>
    <div class="tnb tnb--now"><span>${mesAnoCurto(b.ano_mes)}</span><div class="tnb-track"><div class="tnb-fill" style="transform:scaleX(${(heroVb / max).toFixed(4)})"></div>
      ${vRef ? `<i class="tnb-ref" style="left:${refPos.toFixed(2)}%"></i><span class="tnb-ref-label ${refCls}" style="left:${refPos.toFixed(2)}%"><b>${heroFmtPlain(vRef)}</b> se tivesse acompanhado a inflação</span>` : ""}
    </div></div>`;
  $("#tn-bars").style.marginBottom = vRef ? "28px" : "";

  const secEl = $("#story-secondary");
  secEl.hidden = !secondary;
  if (secondary) {
    $("#ss-kicker").textContent = secondary.kicker;
    $("#ss-val").innerHTML = secondary.val;
    $("#ss-src").textContent = secondary.src;
  }

  // frase-resumo + fatos de apoio
  const facts = [];
  let lede = "";
  if (k === "preco" || k === "indice") {
    const real = k === "indice" ? (b.indice_relativo_real / a.indice_relativo_real - 1) * 100
      : daily && ipcaRatio ? ((vb / va) / ipcaRatio - 1) * 100
      : (b.preco_real / a.preco_real - 1) * 100;
    const subiu = c.v >= 0 ? "subiu" : "caiu";
    const sujeito = k === "indice" ? `o índice de preço ${m.de}` : code === "DOLAR" ? "a cotação do dólar" : `o preço médio ${m.de}`;
    let fr;
    if (Math.abs(real) < 3) fr = `Descontada a inflação, ficou <strong>praticamente igual</strong> (${fmtPct(real)}).`;
    else if (real > 0) fr = `Descontada a inflação, ficou <strong>${fmtNum(real, 1)}% mais caro</strong>: subiu mais que os preços em geral.`;
    else fr = `Descontada a inflação, ficou <strong>${fmtNum(Math.abs(real), 1)}% mais barato</strong>${c.v >= 0 ? ": subiu menos que os preços em geral" : ""}.`;
    lede = `Entre ${mA} e ${mB}, ${sujeito} ${subiu} <strong>${fmtNum(Math.abs(c.v), 1)}%</strong>. ${fr}`;
    if (k === "indice") lede += ` Na prática: quem gastava R$ 100 com esse item em ${mA} precisa de cerca de ${fmtBRL(100 * vb / va)} para levar a mesma quantidade em ${mB}.`;
    facts.push(["Descontada a inflação", fmtPct(real), daily ? `IPCA de ${mesAno(a.ano_mes)} a ${mesAno(b.ano_mes)}` : `variação real, em valores de ${mB}`]);
    if (k === "preco") {
      const u = unidade(code);
      facts.push(["Se tivesse acompanhado a inflação", fmtBRL(vRef), `em vez de ${fmtBRL(vb)} ${u.por}`]);
      if (prod.tipo === "combustivel") facts.push([`Peso de ${u.um} no salário mínimo`, `${fmtNum(b.pct_salario_minimo, 2)}%`, `era ${fmtNum(a.pct_salario_minimo, 2)}% em ${mesAno(a.ano_mes)}`]);
      facts.push(["Um salário mínimo comprava", `${fmtInt(b.unidades_por_salario_minimo)} ${u.plural}`, `eram ${fmtInt(a.unidades_por_salario_minimo)} em ${mesAno(a.ano_mes)}`]);
    } else {
      facts.push(["Inflação geral no período", fmtPct(inflPct), "IPCA acumulado, ponta a ponta"]);
      const pc = change(prod, a.indice_poder_compra, b.indice_poder_compra);
      facts.push(["Poder de compra do salário mínimo", fmtPct(pc.v), `frente a este item · índice ${fmtNum(a.indice_poder_compra, 1)} → ${fmtNum(b.indice_poder_compra, 1)}`]);
    }
  } else if (k === "taxa") {
    const rows = prod.serie_mensal.filter((r) => r.ano_mes >= a.ano_mes && r.ano_mes <= b.ano_mes && !isNil(r.taxa_aa));
    const lo = rows.reduce((x, r) => (r.taxa_aa < x.taxa_aa ? r : x), rows[0]);
    const hi = rows.reduce((x, r) => (r.taxa_aa > x.taxa_aa ? r : x), rows[0]);
    const dir = c.v > 0 ? `${fmtNum(c.v, 2)} p.p. acima` : c.v < 0 ? `${fmtNum(-c.v, 2)} p.p. abaixo` : "no mesmo nível";
    if (code === "SELIC") {
      const ipca12 = lastValid(prod.serie_mensal, (r) => r.ipca_var_12m);
      lede = `Em ${mB}, a Selic estava em <strong>${fmtNum(vb, 2)}% ao ano</strong>, ${dir} de ${mA} (${fmtNum(va, 2)}%). No mesmo intervalo (IPCA de ${mesAno(a.ano_mes)} a ${mesAno(b.ano_mes)}), a inflação acumulada foi de <strong>${fmtPct(inflPct)}</strong>.`;
      facts.push(["Inflação em 12 meses", `${fmtNum(ipca12.ipca_var_12m, 2)}%`, `IPCA em ${mesAno(ipca12.ano_mes)}`]);
      facts.push(["Selic menos inflação", fmtPP(vb - ipca12.ipca_var_12m), "aproximação simples do juro real"]);
    } else {
      const sel = lastValid(prod.serie_mensal, (r) => r.selic_meta_aa);
      lede = `Em ${mB}, a inflação acumulada em 12 meses estava em <strong>${fmtNum(vb, 2)}%</strong>, ${dir} de ${mA} (${fmtNum(va, 2)}%). É a métrica que se compara com a Selic, porque as duas ficam em % ao ano.`;
      facts.push(["Selic no mesmo mês", `${fmtNum(sel.selic_meta_aa, 2)}%`, `meta do Copom, média de ${mesAno(sel.ano_mes)}`]);
      facts.push(["Inflação acumulada no intervalo", fmtPct(inflPct), `de ${mA} a ${mB}, ponta a ponta`]);
    }
    facts.push(["Mínima e máxima no intervalo", `${fmtNum(lo.taxa_aa, 2)}% · ${fmtNum(hi.taxa_aa, 2)}%`, `${mesAno(lo.ano_mes)} · ${mesAno(hi.ano_mes)}`]);
  } else if (k === "pib") {
    const rows = prod.serie_mensal.filter((r) => r.ano_mes >= a.ano_mes && r.ano_mes <= b.ano_mes && !isNil(r.taxa_aa));
    const dir = c.v > 0 ? `${fmtNum(c.v, 2)} p.p. acima` : c.v < 0 ? `${fmtNum(-c.v, 2)} p.p. abaixo` : "no mesmo nível";
    lede = `Em ${mB}, o PIB fechou o ano com variação real de <strong>${fmtNum(vb, 2)}%</strong>, ${dir} do resultado de ${mA} (${fmtNum(va, 2)}%). Eventos próximos no tempo ajudam a contextualizar a série, mas proximidade temporal não demonstra causalidade.`;
    if (rows.length) {
      const lo = rows.reduce((x, r) => (r.taxa_aa < x.taxa_aa ? r : x), rows[0]);
      const hi = rows.reduce((x, r) => (r.taxa_aa > x.taxa_aa ? r : x), rows[0]);
      facts.push(["Mínima e máxima no intervalo", `${fmtNum(lo.taxa_aa, 2)}% · ${fmtNum(hi.taxa_aa, 2)}%`, `${lo.ano} · ${hi.ano}`]);
    }
    if (!isNil(b.pib_nominal_bilhoes)) facts.push(["PIB nominal — valores correntes", `${fmtBRL(b.pib_nominal_bilhoes)} bi`, `ano de ${b.ano} · não é o crescimento real acima`]);
    if (!isNil(b.pib_per_capita_rs)) facts.push(["PIB per capita — valores correntes", fmtBRL(b.pib_per_capita_rs), `ano de ${b.ano}`]);
    if (prod.ultimo_trimestre) facts.push(["Último trimestre disponível", prod.ultimo_trimestre.trimestre, isNil(prod.ultimo_trimestre.variacao_interanual) ? "sem variação interanual publicada" : `variação interanual: ${fmtNum(prod.ultimo_trimestre.variacao_interanual, 2)}%`]);
  } else {
    const real = ipcaRatio ? ((vb / va) / ipcaRatio - 1) * 100 : null;
    const rows = prod.serie_mensal.filter((r) => r.ano_mes >= a.ano_mes && r.ano_mes <= b.ano_mes && !isNil(r.pontos));
    const hi = rows.reduce((x, r) => (r.pontos > x.pontos ? r : x), rows[0]);
    lede = `Entre ${mA} e ${mB}, o Ibovespa ${c.v >= 0 ? "subiu" : "caiu"} <strong>${fmtNum(Math.abs(c.v), 1)}%</strong>, de ${fmtInt(va)} para ${fmtInt(vb)} pontos. A inflação do intervalo (IPCA de ${mesAno(a.ano_mes)} a ${mesAno(b.ano_mes)}) foi de ${fmtPct(inflPct)}.`;
    facts.push(["Descontada a inflação", fmtPct(real), "variação dos pontos acima ou abaixo do IPCA"]);
    facts.push(["Inflação no intervalo", fmtPct(inflPct), "IPCA acumulado, ponta a ponta"]);
    facts.push(["Maior fechamento mensal", `${fmtInt(hi.pontos)} pts`, mesAno(hi.ano_mes)]);
  }
  $("#story-lede").innerHTML = lede;
  $("#story-facts").innerHTML = facts.map(([dt, dd, fx]) => `<div><dt>${dt}<span class="fx">${fx}</span></dt><dd>${dd}</dd></div>`).join("");

  // último dado diário (Dólar, Selic, Ibovespa) — sempre com data e fonte
  const cot = prod.cotacao_hoje;
  const live = $("#story-live");
  if (cot) {
    const val = code === "IBOVESPA" ? `${fmtInt(cot.pontos)} pts` : code === "SELIC" ? `${fmtNum(cot.valor, 2)}% ao ano` : fmtBRL(cot.valor, 4);
    live.hidden = false;
    live.innerHTML = `<span>Último dado disponível: <b>${val}</b> em ${dataCurta(cot.data)} · ${esc(cot.fonte)}. ${code === "IBOVESPA" ? "Não é tempo real garantido. " : ""}Este é o ponto final da comparação acima; os gráficos abaixo usam médias mensais.</span>`;
  } else live.hidden = true;

  const note = $("#story-note");
  if (prod.nota) { note.hidden = false; note.textContent = prod.nota; } else note.hidden = true;
}

// =====================================================================
// 02 · PREÇO
// =====================================================================
function metricOptions(prod) {
  const k = kind(prod);
  if (k === "taxa" || k === "pontos" || k === "pib") return [];
  if (k === "indice") return temPrecoAbsoluto(prod) ? ["nominal", "real", "conab"] : ["nominal", "real"];
  return prod.tipo === "combustivel" ? ["nominal", "real", "pct_sm"] : ["nominal", "real"];
}

function priceConfig(code) {
  const prod = P(code), k = kind(prod), m = META[code];
  const lastIso = lastRow(prod).ano_mes, mL = mesAno(lastIso);
  const u = unidade(code);
  let get, ref = null, yFmt, vFmt, help, deck;
  const brlTick = (t, step) => `R$ ${fmtNum(t, step < 1 ? 2 : 0)}`;
  if (k === "taxa") {
    get = (r) => r.taxa_aa; yFmt = (t, s) => `${fmtNum(t, s < 1 ? 1 : 0)}%`; vFmt = (v) => `${fmtNum(v, 2)}%`;
    help = code === "SELIC" ? "Meta da taxa básica de juros definida pelo Copom, média de cada mês." : "Inflação acumulada em 12 meses até cada mês (IPCA).";
    deck = code === "SELIC" ? "A taxa básica de juros mês a mês, com os mesmos marcos e notícias das outras histórias." : "A inflação acumulada em 12 meses, mês a mês. A série começa em jan/2020, porque precisa de 12 meses anteriores.";
  } else if (k === "pontos") {
    get = (r) => r.pontos; yFmt = (t) => `${fmtNum(t / 1000, 0)} mil`; vFmt = (v) => `${fmtInt(v)} pts`;
    help = "Fechamento do último pregão de cada mês, em pontos. Pontos não são reais.";
    deck = "O principal índice da bolsa brasileira, fechamento de cada mês.";
  } else if (k === "pib") {
    get = (r) => r.taxa_aa; yFmt = (t, s) => `${fmtNum(t, s < 1 ? 1 : 0)}%`; vFmt = (v) => `${fmtNum(v, 2)}%`;
    help = "Variação real do PIB acumulada no ano (resultado do 4º trimestre). Um ano sem essa linha ainda não teve o resultado fechado pelo IBGE — aparece em branco, não estimado.";
    deck = "PIB real (crescimento), ano a ano. Não é o PIB em reais — isso aparece nos fatos ao lado.";
  } else if (k === "indice" && S.metric === "conab" && temPrecoAbsoluto(prod)) {
    const meta = prod.preco_absoluto;
    get = (r) => r.preco_conab_brl_kg; ref = (r) => r.preco_conab_real_brl_kg;
    yFmt = (t) => `R$ ${fmtNum(t, 2)}`; vFmt = (v) => `${fmtBRL(v)}/kg`;
    help = `Preço observado, ${meta.produto_conab}, nível ${meta.nivel_comercializacao} — ${meta.oficial_nacional ? "número nacional oficial da CONAB" : "média calculada pelo projeto entre as UFs que a CONAB pesquisou naquele mês, não um número nacional oficial"}. A linha pontilhada é o mesmo preço corrigido pela inflação (IPCA), em reais de ${mL}.${meta.definicao_compativel_indice_ibge ? "" : ` Atenção: a CONAB nomeia este produto como "${meta.produto_conab}", que pode não ser exatamente o mesmo corte/variedade do índice IBGE ao lado.`}`;
    deck = `O preço observado ${m.de} no varejo, em R$/kg, além do índice. ${meta.cobertura}`;
  } else if (k === "indice") {
    if (S.metric === "real") { get = (r) => r.indice_relativo_real; ref = (r) => r.indice_relativo; help = `Índice em valores de ${mL}: se a linha sobe, o item ficou mais caro de verdade. A linha pontilhada é o índice como estava na época.`; }
    else { get = (r) => r.indice_relativo; help = "Índice de preço com jan/2019 = 100: 150 quer dizer 50% mais caro que no início. Não é valor em reais."; }
    yFmt = (t) => fmtNum(t, 0); vFmt = (v) => `índice ${fmtNum(v, 1)}`;
    deck = `Como o preço ${m.de} variou, em índice. O IBGE não publica preço médio em reais por item, só a variação oficial de cada mês.`;
  } else if (S.metric === "real") {
    get = (r) => r.preco_real; ref = (r) => r.preco_nominal; yFmt = brlTick; vFmt = (v) => fmtBRL(v);
    help = `Cada mês convertido para reais de ${mL}. Se a linha sobe, ficou mais caro de verdade, não só por causa da inflação. A linha pontilhada é o valor como estava na época.`;
  } else if (S.metric === "pct_sm") {
    get = (r) => r.pct_salario_minimo; yFmt = (t, s) => `${fmtNum(t, s < 0.1 ? 2 : 1)}%`; vFmt = (v) => `${fmtNum(v, 2)}%`;
    help = `Quanto ${u.um} pesava no salário mínimo vigente em cada mês. Quanto mais alta a linha, mais pesa no bolso.`;
  } else {
    get = (r) => r.preco_nominal; yFmt = brlTick; vFmt = (v) => fmtBRL(v);
    help = "O valor cobrado em cada mês, sem ajuste. Para comparar épocas de forma justa, use “Corrigido pela inflação”.";
  }
  if (k === "preco") deck = code === "DOLAR" ? "Quantos reais valia um dólar em cada mês, na média da cotação oficial." : `O preço médio nacional ${m.de} em cada mês, ${u.por}.`;
  return { prod, k, get, ref, yFmt, vFmt, help, deck };
}

function renderPrice(animate = true) {
  const code = S.product;
  const pc = priceConfig(code);
  const { prod, get, ref, yFmt, vFmt, help } = pc;
  const rows = prod.serie_mensal;

  // controle de métrica
  const opts = metricOptions(prod);
  const tg = $("#metric-toggle");
  tg.hidden = !opts.length;
  $$("button", tg).forEach((b) => {
    b.hidden = !opts.includes(b.dataset.metric);
    b.setAttribute("aria-pressed", String(b.dataset.metric === S.metric));
  });
  $('#metric-toggle [data-metric="nominal"]').textContent = pc.k === "indice" ? "Índice" : "Na época";
  $('#metric-toggle [data-metric="real"]').textContent = pc.k === "indice" ? "Índice corrigido pela inflação" : "Corrigido pela inflação";
  $("#metric-help").innerHTML = ref ? `${help} <span class="legend" style="display:inline-flex;margin:0 0 0 8px"><span><i class="k"></i>corrigido</span><span><i class="k k--dot" style="border-color:var(--fg-3)"></i>na época</span></span>` : help;
  $("#preco-title").textContent = pc.k === "pib" ? "Ano a ano, desde o início da série." : "Mês a mês, desde 2019.";
  $("#preco-deck").textContent = `${pc.deck} O fundo muda de cor na troca de governo. Letras marcam datas de contexto; números marcam notícias da época.`;

  // anotações seletivas: início, fim, máxima e mínima (sem repetir meses próximos)
  const valid = rows.filter((r) => !isNil(get(r)));
  const first = valid[0], last = valid[valid.length - 1];
  const hi = valid.reduce((x, r) => (get(r) > get(x) ? r : x), valid[0]);
  const lo = valid.reduce((x, r) => (get(r) < get(x) ? r : x), valid[0]);
  const pLabel = (iso) => (pc.k === "pib" ? iso.slice(0, 4) : mesAnoCurto(iso));
  const anns = [
    { r: first, sub: pLabel(first.ano_mes), place: "above" },
    { r: last, sub: pLabel(last.ano_mes), signal: true },
  ];
  const far = (r) => anns.every((a) => Math.abs(monthIdx(a.r.ano_mes) - monthIdx(r.ano_mes)) > 5);
  if (far(hi)) anns.push({ r: hi, sub: `máxima · ${pLabel(hi.ano_mes)}` });
  if (far(lo)) anns.push({ r: lo, sub: `mínima · ${pLabel(lo.ano_mes)}`, place: "below" });

  // notícias no gráfico
  const nl = noticiasParaGrafico(code).map((n, i) => {
    // PIB é anual: o release/reportagem de março de Y+1 fala do resultado de Y
    const r = pc.k === "pib" ? rows.find((q) => q.ano === anoDaNoticia(n) && !isNil(get(q))) : linhaDoMes(prod, n.data, get);
    return r ? { ...n, n: i + 1, iso: r.ano_mes, v: get(r) } : null;
  }).filter(Boolean);
  if (!nl.some((n) => n.id === S.newsId)) S.newsId = (nl.find((n) => mesKey(n.iso) === mesKey(hi.ano_mes)) || nl[nl.length - 1])?.id ?? null;

  const evs = eventsFor(prod);
  const u = unidade(code);
  if (pc.k === "pib") {
    if (S.pibYear == null) S.pibYear = hi.ano;
    const sel = valid.find((r) => r.ano === S.pibYear);
    if (sel && !anns.some((a) => a.r === sel)) anns.push({ r: sel, sub: `selecionado · ${sel.ano}`, signal: true, place: "below" });
  }
  lineChart($("#main-chart"), {
    series: [
      { rows: rows.map((r) => ({ iso: r.ano_mes, v: get(r) })), area: true, maxGap: cadenceGap(prod) },
      ...(ref ? [{ rows: rows.map((r) => ({ iso: r.ano_mes, v: ref(r) })), cls: "c-line c-line--ref", maxGap: cadenceGap(prod) }] : []),
    ],
    cutoff: PERIODO_CORTE, bands: "full", includeZero: true, headroom: 0.18, yFmt, animate,
    annotations: anns.map((a) => ({ iso: a.r.ano_mes, v: get(a.r), text: vFmt(get(a.r)), sub: a.sub, place: a.place, signal: a.signal })),
    events: pc.k === "pib" ? [] : evs,
    onSelect: pc.k === "pib" ? (mi) => { const r = rows.find((q) => monthIdx(q.ano_mes) === mi && !isNil(get(q))); if (r) { S.pibYear = r.ano; renderPrice(false); renderPibExtra(prod, { S, NEWS, clip }); } } : undefined,
    news: nl.map((n) => ({ id: n.id, n: n.n, iso: n.iso, v: n.v })),
    activeNews: S.newsId,
    onNews: (id) => selectNews(id, true),
    newsTip: (n) => { const full = nl.find((q) => q.id === n.id); return `<div class="t-when">${dataNoticia(full.data)} · ${esc(full.veiculo)}</div><div style="margin-top:4px;font-family:var(--serif);font-size:1rem;line-height:1.25">${esc(full.titulo)}</div><div class="t-row" style="margin-top:6px"><span>clique para ler ao lado</span></div>`; },
    tooltip: (mi) => {
      const r = rows.find((q) => monthIdx(q.ano_mes) === mi);
      if (!r) return "";
      const lines = [`<div class="t-when">${pc.k === "pib" ? r.ano : mesAno(r.ano_mes)} · governo ${r.periodo}</div><div class="t-val">${vFmt(get(r))}</div>`];
      if (ref && !isNil(ref(r))) lines.push(`<div class="t-row"><span>na época</span><b>${vFmt(ref(r))}</b></div>`);
      if (pc.k === "preco" && S.metric !== "real" && !isNil(r.preco_real)) lines.push(`<div class="t-row"><span>em reais de ${mesAno(last.ano_mes)}</span><b>${fmtBRL(r.preco_real)}</b></div>`);
      if (pc.k === "preco" && !isNil(r.unidades_por_salario_minimo)) lines.push(`<div class="t-row"><span>1 salário mínimo comprava</span><b>${fmtInt(r.unidades_por_salario_minimo)} ${u.plural}</b></div>`);
      if (pc.k === "taxa" && code === "SELIC" && !isNil(r.ipca_var_12m)) lines.push(`<div class="t-row"><span>inflação 12 meses</span><b>${fmtNum(r.ipca_var_12m, 2)}%</b></div>`);
      if (pc.k === "pib" && !isNil(r.pib_nominal_bilhoes)) lines.push(`<div class="t-row"><span>PIB nominal</span><b>${fmtBRL(r.pib_nominal_bilhoes)} bi</b></div>`);
      if (pc.k === "pib" && !isNil(r.pib_per_capita_rs)) lines.push(`<div class="t-row"><span>PIB per capita</span><b>${fmtBRL(r.pib_per_capita_rs)}</b></div>`);
      return lines.join("");
    },
  });
  const chartEl = $("#main-chart");
  chartEl.setAttribute("aria-label", `Gráfico: ${META[code].titulo}, ${help} De ${vFmt(get(first))} em ${pLabel(first.ano_mes)} a ${vFmt(get(last))} em ${pLabel(last.ano_mes)}; máxima de ${vFmt(get(hi))} em ${pLabel(hi.ano_mes)}. Use as setas para ler ${pc.k === "pib" ? "ano a ano" : "mês a mês"}; a tabela abaixo traz todos os valores.`);

  $("#chart-events").innerHTML = evs.map((e) => `<li><span class="ev-key">${e.key}</span><span><time>${mesAno(e.iso)}</time> ${e.text}</span></li>`).join("");
  $("#chart-source").textContent = S.metric === "conab" ? `Fonte: CONAB (Sistema de Informações de Mercado, Preços Agropecuários, nível Varejo). ${pc.prod.preco_absoluto.oficial_nacional ? "" : "Média entre UFs calculada pelo projeto, não um número nacional oficial da CONAB. "}IBGE (IPCA, usado para a linha corrigida pela inflação).` : sourceFor(code);

  // tabela equivalente (acessível e verificável)
  const cols = [pc.k === "pib" ? ["Ano", (r) => String(r.ano)] : ["Mês", (r) => mesAno(r.ano_mes)], ["Período", (r) => r.periodo]];
  if (pc.k === "preco") {
    cols.push(["Na época", (r) => fmtBRL(r.preco_nominal)], [`Em reais de ${mesAno(last.ano_mes)}`, (r) => fmtBRL(r.preco_real)]);
    if (prod.tipo === "combustivel") cols.push(["% do salário mínimo", (r) => isNil(r.pct_salario_minimo) ? "—" : `${fmtNum(r.pct_salario_minimo, 2)}%`]);
  } else if (pc.k === "indice") cols.push(["Índice", (r) => fmtNum(r.indice_relativo, 1)], ["Índice corrigido", (r) => fmtNum(r.indice_relativo_real, 1)]);
  else if (pc.k === "taxa") cols.push([code === "SELIC" ? "Selic (% a.a.)" : "IPCA 12 meses (%)", (r) => fmtNum(r.taxa_aa, 2)]);
  else if (pc.k === "pib") cols.push(["PIB real, variação no ano (%)", (r) => isNil(r.taxa_aa) ? "sem resultado fechado" : fmtNum(r.taxa_aa, 2)], ["PIB nominal (R$ bi)", (r) => isNil(r.pib_nominal_bilhoes) ? "—" : fmtBRL(r.pib_nominal_bilhoes)], ["PIB per capita (R$)", (r) => isNil(r.pib_per_capita_rs) ? "—" : fmtBRL(r.pib_per_capita_rs)]);
  else cols.push(["Pontos", (r) => fmtInt(r.pontos)]);
  $("#main-table").innerHTML = `<caption class="sr-only">${esc(META[code].titulo)}, valores mensais</caption><thead><tr>${cols.map(([h]) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${[...rows].reverse().map((r) => `<tr>${cols.map(([, f], i) => (i ? `<td>${f(r)}</td>` : `<th scope="row">${f(r)}</th>`)).join("")}</tr>`).join("")}</tbody>`;

  renderNewsRail(nl, pc);
}

function sourceFor(code) {
  const prod = P(code);
  if (prod.tipo === "combustivel") { const miss = missingMonths(prod); return `Fontes: ANP (preços), Banco Central (salário mínimo), IBGE (IPCA).${miss.length ? ` Sem dado na ANP: ${miss.join(", ")} (a linha fica interrompida).` : ""}`; }
  if (prod.tipo === "alimento_indice") return "Fonte: IBGE/SIDRA, variação mensal do IPCA por item, encadeada em índice (jan/2019 = 100).";
  if (code === "DOLAR") return "Fontes: Banco Central (PTAX venda, média mensal; salário mínimo), IBGE (IPCA).";
  if (code === "SELIC") return "Fontes: Banco Central (Meta Selic, série 432), IBGE (IPCA).";
  if (code === "IPCA") return "Fonte: IBGE (IPCA, acumulado em 12 meses).";
  if (prod.tipo === "pib") return "Fonte: IBGE — Sistema de Contas Nacionais (Contas Nacionais Trimestrais e Anuais). Dados sujeitos a revisão em divulgações seguintes.";
  return "Fonte: B3 (fechamento do último pregão de cada mês).";
}

function renderNewsRail(nl, pc) {
  const rail = $("#newsrail");
  if (!nl.length) {
    $("#nr-feature").innerHTML = `<p class="tm-empty">O arquivo ainda não tem matérias ligadas a esta história. Veja a <a href="#maquina">máquina do tempo</a> para o noticiário de cada mês.</p>`;
    $("#nr-list").innerHTML = "";
    return;
  }
  rail.dataset.pc = "";
  const cur = nl.find((n) => n.id === S.newsId) || nl[0];
  const value = `<p class="clip-value">${esc(META[S.product].titulo)} em ${mesAno(cur.iso)}: <b>${pc.vFmt(cur.v)}</b></p>`;
  $("#nr-feature").innerHTML = `<div class="fade-swap">${clip(cur, { lead: true, value })}</div>`;
  $("#nr-list").innerHTML = nl.map((n) => `<li><button type="button" class="nr-item" data-news="${n.id}" aria-current="${n.id === cur.id}"><span class="nr-num">${n.n}</span><span class="nr-t"><time datetime="${n.data}">${dataNoticia(n.data)} · ${esc(n.veiculo)}</time>${esc(n.titulo)}</span></button></li>`).join("");
  S._nl = nl; S._pc = pc;
}

function selectNews(id, fromChart = false) {
  S.newsId = id;
  $$("#main-chart .c-news").forEach((g) => g.classList.toggle("is-active", g.dataset.id === id));
  if (S._nl) renderNewsRail(S._nl, S._pc);
  if (fromChart && window.innerWidth <= 1180) $("#newsrail").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
}

// =====================================================================
// 03 · BOLSO — poder de compra
// =====================================================================
function bolsoApplies(prod) { return kind(prod) === "preco" || kind(prod) === "indice"; }

function renderBolso() {
  const code = S.product, prod = P(code), m = META[code];
  const sec = $("#bolso");
  const applies = bolsoApplies(prod);
  sec.hidden = !applies;
  $('[data-nav="bolso"]').hidden = !applies;
  if (!applies) return;
  const isIdx = kind(prod) === "indice";
  const get = isIdx ? (r) => r.indice_poder_compra : (r) => r.unidades_por_salario_minimo;
  const rows = prod.serie_mensal.filter((r) => !isNil(get(r)));
  const u = unidade(code);
  const base = baseRow(prod, S.base);
  if (S.ppIdx == null || S.ppIdx >= rows.length - 1) S.ppIdx = Math.max(0, rows.findIndex((r) => r.ano_mes === base.ano_mes));

  $("#bolso-title").textContent = isIdx ? "Quanto o salário mínimo rendia?" : code === "DOLAR" ? "Quantos dólares um salário mínimo comprava?" : `Quantos ${u.plural} um salário mínimo comprava?`;
  $("#bolso-deck").textContent = isIdx
    ? `O IBGE não publica preço em reais para alimentos, então não dá para contar quilos. Dá para medir quanto o salário mínimo rende frente ao preço ${m.de}, em índice (jan/2019 = 100). Arraste para comparar qualquer mês com o último dado.`
    : `Quantos ${u.plural} ${code === "DOLAR" ? "" : m.sem + " "}dava para comprar gastando um salário mínimo inteiro, no mês que você escolher e no último dado disponível.`;

  const cav = $("#pp-caveat");
  cav.hidden = !isIdx;
  if (isIdx) cav.innerHTML = `<strong>Índice, não reais nem quilos.</strong> 100 é quanto o salário mínimo rendia ${m.sem} em ${mesAno(PERIODOS.serieInicio)}. Acima de 100, rende mais que naquele mês; abaixo, menos. Serve para comparar meses entre si, não para dizer quanto se compra.`;

  const last = rows[rows.length - 1];
  const maxV = Math.max(...rows.map(get));
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => Math.ceil(maxV / s) <= 60) || 100;
  const nCells = isIdx ? 0 : Math.ceil(maxV / step / 10) * 10; // linhas inteiras de 10
  const col = (id, isNow) => {
    const inner = isIdx
      ? `<div class="pp-index"><div class="pp-index-track"><div class="pp-index-fill"></div><span class="pp-index-100"></span></div></div>`
      : `<div class="pp-grid" role="presentation">${"<span class=\"pp-cell\"><b></b><i></i></span>".repeat(nCells)}</div>`;
    $(id).innerHTML = `<p class="pp-when"></p><p class="pp-num" data-v="0">—</p><p class="pp-unit">${isIdx ? "índice de poder de compra" : `${u.plural}${code === "DOLAR" ? "" : " " + m.sem}`}</p><p class="pp-wage"></p>${inner}`;
    $(id).classList.toggle("pp-col--now", isNow);
  };
  col("#pp-a", false);
  col("#pp-b", true);

  const range = $("#pp-range");
  range.max = String(rows.length - 1);
  range.value = String(S.ppIdx);
  const maxRow = rows.reduce((x, r) => (get(r) > get(x) ? r : x), rows[0]);
  S._pp = { rows, get, isIdx, step, nCells, last, u, code, maxV, maxRow };
  updateBolso(true);
}

function updateBolso(first = false) {
  const { rows, get, isIdx, step, nCells, last, u, code } = S._pp; // eslint-disable-line no-unused-vars
  const a = rows[S.ppIdx], b = last;
  const va = get(a), vb = get(b);
  const fill = (id, row, v, other) => {
    const el = $(id);
    el.querySelector(".pp-when").innerHTML = `${pmark(row.periodo)}<b>${mesAnoLongo(row.ano_mes)}</b>${row === b ? " · último dado" : ""}`;
    countTo(el.querySelector(".pp-num"), v, (x) => (isIdx ? fmtNum(x, 1) : fmtInt(x)), first ? 900 : 380);
    el.querySelector(".pp-wage").textContent = isIdx
      ? `${v >= 100 ? "rende " + fmtNum(v - 100, 1) + "% mais" : "rende " + fmtNum(100 - v, 1) + "% menos"} que em ${mesAno(PERIODOS.serieInicio)} · salário mínimo de ${fmtBRL(row.salario_minimo, 0)}`
      : `gastando o salário mínimo de ${fmtBRL(row.salario_minimo, 0)} · ${u.um} = ${fmtBRL(row.preco_nominal)}`;
    if (isIdx) {
      const max = Math.max(...rows.map(get), 100) * 1.05;
      el.querySelector(".pp-index-fill").style.transform = `scaleX(${(v / max).toFixed(4)})`;
      el.querySelector(".pp-index-100").style.left = `${(100 / max) * 100}%`;
    } else {
      // camada base até o menor dos dois valores; a sobra (só na coluna maior)
      // aparece em outra cor — a diferença exata, em litros/dólares.
      const clamp = (x) => Math.max(0, Math.min(1, x)).toFixed(3);
      const baseTo = Math.min(v, other) / step, ownTo = v / step;
      el.querySelectorAll(".pp-cell").forEach((c, i) => {
        c.querySelector("i").style.transform = `scaleY(${clamp(baseTo - i)})`;
        c.querySelector("b").style.transform = `scaleY(${clamp(ownTo - i)})`;
      });
    }
  };
  fill("#pp-a", a, va, vb);
  fill("#pp-b", b, vb, va);

  const mA = mesAno(a.ano_mes), mB = mesAno(b.ano_mes);
  let verdict;
  if (isIdx) {
    const d = (vb / va - 1) * 100;
    verdict = Math.abs(d) < 1
      ? `Em ${mB}, o salário mínimo rende <strong>praticamente o mesmo</strong> ${META[code].sem} que em ${mA}.`
      : `Em ${mB}, o salário mínimo rende <strong>${fmtNum(Math.abs(d), 1)}% ${d > 0 ? "mais" : "menos"}</strong> ${META[code].sem} do que em ${mA}.`;
  } else {
    const d = Math.round(vb) - Math.round(va);
    const what = code === "DOLAR" ? "" : ` ${META[code].sem}`;
    verdict = d === 0
      ? `Em ${mB}, um salário mínimo compra <strong>a mesma quantidade</strong>${what} que em ${mA}.`
      : `Em ${mB}, um salário mínimo compra <strong>${fmtInt(Math.abs(d))} ${Math.abs(d) === 1 ? u.singular : u.plural} a ${d > 0 ? "mais" : "menos"}</strong>${what} do que em ${mA}.`;
  }
  if (a === b) verdict = `Este já é o último mês disponível. Arraste para trás para comparar.`;
  $("#pp-verdict").innerHTML = verdict;
  $("#pp-legend").innerHTML = isIdx
    ? `<span class="sw"></span> mês escolhido <span class="sw sw--now"></span> último dado · a linha vertical marca 100 (jan/2019)`
    : `Cada quadrado = ${step} ${step === 1 ? u.singular : u.plural}. <span class="sw"></span> mês escolhido <span class="sw sw--now"></span> último dado <span class="sw sw--diff"></span> diferença entre os dois <span class="sw sw--cap"></span> grade inteira = ${fmtInt(nCells * step)} ${u.plural} · o máximo da série foi ${fmtInt(S._pp.maxV)} (${mesAno(S._pp.maxRow.ano_mes)})`;

  const range = $("#pp-range");
  range.setAttribute("aria-valuetext", `${mesAnoLongo(a.ano_mes)}: ${isIdx ? "índice " + fmtNum(va, 1) : fmtInt(va) + " " + u.plural}`);
  scrubViz($("#pp-scrub-viz"), {
    months: rows.map((r) => r.ano_mes), values: rows.map(get), cutoff: PERIODO_CORTE,
    fixedIdx: rows.length - 1, fixedLabel: "último dado", handleIdx: S.ppIdx, handleLabel: mesAnoCurto(a.ano_mes),
  });
}

// =====================================================================
// 04 · CONTEXTO
// =====================================================================
let multCharts = [];
function renderContext() {
  const code = S.product, prod = P(code), k = kind(prod), m = META[code];
  if (prod.tipo === "pib") { renderPibContext(prod); return; }
  const box = $("#multiples");
  multCharts = [];
  const caveats = {
    comb: "A política de preços da Petrobras, os impostos e a oferta e demanda internas também pesam no preço final.",
    alim: "Safra, clima, exportações e demanda interna também pesam no preço de cada alimento.",
    DOLAR: "O câmbio reage a juros, fluxo de capital, comércio exterior e expectativas.",
    IBOVESPA: "O Ibovespa reflete expectativas sobre lucros, juros, câmbio e cenário internacional.",
    SELIC: "O Copom define a Selic olhando expectativas de inflação, não só a inflação passada.",
    IPCA: "A inflação reflete oferta e demanda, câmbio, safra e muitos outros fatores; a Selic é só uma peça.",
    PIB: "O PIB reflete consumo, investimento, gasto público e comércio exterior somados; nenhum fator isolado o explica.",
  };
  $("#context-caveat").textContent = `Estas séries aparecem juntas porque andam no mesmo calendário. Isso não prova que uma explique a outra. ${caveats[familia(prod) === "merc" ? code : familia(prod)]}`;

  if (isTaxaLike(prod)) {
    const isSelic = code === "SELIC", isIpca = code === "IPCA", hasComp = isSelic || isIpca;
    const compGet = isSelic ? (r) => r.ipca_var_12m : isIpca ? (r) => r.selic_meta_aa : () => null;
    const compName = isSelic ? "Inflação em 12 meses (IPCA)" : "Selic";
    const primaryName = isSelic ? "Selic" : isIpca ? "Inflação em 12 meses (IPCA)" : m.curto;
    const rows = prod.serie_mensal;
    $("#context-deck").textContent = hasComp
      ? "Selic e inflação em 12 meses usam a mesma unidade (% ao ano), então dividem o mesmo eixo, sem precisar de base 100. Quando a linha da Selic está acima da outra, os juros superam a inflação."
      : "A variação do PIB é mostrada na própria unidade (% ao ano) — sem base 100, que faria pouco sentido para uma taxa.";
    box.style.setProperty("--cols", 1);
    box.innerHTML = `<div class="mult overlay"><div class="legend"><span><i class="k"></i>${primaryName}</span>${hasComp ? `<span><i class="k k--dot" style="border-color:var(--fg-3)"></i>${compName}</span>` : ""}</div><div class="chart" id="ctx-overlay" tabindex="0" role="img"></div></div>`;
    const lp = lastValid(rows, (r) => r.taxa_aa), lc = hasComp ? lastValid(rows, compGet) : null;
    lineChart($("#ctx-overlay"), {
      series: [
        { rows: rows.map((r) => ({ iso: r.ano_mes, v: r.taxa_aa })), maxGap: cadenceGap(prod) },
        ...(hasComp ? [{ rows: rows.map((r) => ({ iso: r.ano_mes, v: compGet(r) })), cls: "c-line c-line--ref" }] : []),
      ],
      cutoff: PERIODO_CORTE, bands: "full", includeZero: true, yFmt: (t) => `${fmtNum(t, 0)}%`, marginRight: 8,
      annotations: [
        { iso: lp.ano_mes, v: lp.taxa_aa, text: `${primaryName} ${fmtNum(lp.taxa_aa, 2)}%`, signal: true },
        ...(lc ? [{ iso: lc.ano_mes, v: compGet(lc), text: `${compName} ${fmtNum(compGet(lc), 2)}%`, place: "below" }] : []),
      ],
      tooltip: (mi) => {
        const r = rows.find((q) => monthIdx(q.ano_mes) === mi);
        if (!r) return "";
        const compHtml = hasComp ? `<div class="t-row"><span><i class="t-key" style="border-color:var(--on-night-3);border-top-style:dotted"></i>${compName}</span><b>${isNil(compGet(r)) ? "—" : fmtNum(compGet(r), 2) + "%"}</b></div>` : "";
        return `<div class="t-when">${mesAno(r.ano_mes)}</div><div class="t-row"><span><i class="t-key" style="border-color:var(--on-night)"></i>${primaryName}</span><b>${isNil(r.taxa_aa) ? "—" : fmtNum(r.taxa_aa, 2) + "%"}</b></div>${compHtml}`;
      },
    });
    $("#ctx-overlay").setAttribute("aria-label", `${m.titulo}${lc ? ` e ${compName}` : ""}, em % ao ano. ${primaryName}: ${isNil(lp.taxa_aa) ? "sem dado" : fmtNum(lp.taxa_aa, 2) + "%"}${lc ? ` e ${compName}: ${fmtNum(compGet(lc), 2)}%` : ""}.`);
    $("#context-source").textContent = sourceFor(code);
    return;
  }

  // demais: pequenos múltiplos, base 100 no ponto de partida, mesma escala vertical
  const base = baseRow(prod, S.base);
  const byMonth = (c, get) => { const map = new Map(P(c).serie_mensal.map((r) => [mesKey(r.ano_mes), get(r)])); return (r) => map.get(mesKey(r.ano_mes)); };
  const tracks = [{ key: "prod", name: m.curto, desc: k === "indice" ? "índice de preço (IBGE)" : k === "pontos" ? "pontos, fechamento mensal" : code === "DOLAR" ? "R$ por dólar" : `preço ${unidade(code).por}`, get: nativeValue(prod), raw: (v) => fmtValue(prod, v), product: true }];
  // IPCA, dólar e salário vêm da série completa do Dólar (92 meses): assim
  // não herdam os meses que faltam na ANP (set/2020, abr/2026).
  const ipcaT = { key: "ipca", name: "Inflação (IPCA)", desc: "média de todos os preços ao consumidor", get: byMonth("DOLAR", (r) => r.ipca_indice), raw: (v) => `índice ${fmtNum(v, 0)}` };
  const dolarT = { key: "dolar", name: "Dólar", desc: "quantos reais valia 1 dólar", get: byMonth("DOLAR", (r) => r.preco_nominal), raw: (v) => fmtBRL(v) };
  if (prod.tipo === "combustivel") {
    tracks.push({ key: "brent", name: "Petróleo (Brent)", desc: "barril internacional, convertido para reais", get: byMonth(code, (r) => r.brent_brl_bbl), raw: (v) => `${fmtBRL(v, 0)}/barril` }, dolarT, ipcaT);
  } else if (prod.tipo === "alimento_indice") {
    tracks.push(ipcaT, dolarT, { key: "sm", name: "Salário mínimo", desc: "piso nacional vigente", get: byMonth("DOLAR", (r) => r.salario_minimo), raw: (v) => fmtBRL(v, 0) });
  } else if (code === "DOLAR") {
    tracks.push(ipcaT, { key: "ibov", name: "Ibovespa", desc: "pontos, fechamento mensal", get: byMonth("IBOVESPA", (r) => r.pontos), raw: (v) => `${fmtInt(v)} pts` }, { key: "brent", name: "Petróleo (Brent)", desc: "barril, em dólares", get: byMonth("GASOLINA", (r) => r.brent_usd_bbl), raw: (v) => `US$ ${fmtNum(v, 0)}` });
  } else {
    tracks.push(dolarT, ipcaT);
  }
  // eixo de meses completo (a série do próprio produto pode ter buracos)
  const rows = MONTHS.map((iso) => ({ ano_mes: iso }));
  tracks[0].get = byMonth(code, nativeValue(prod));
  const series = tracks.map((t) => {
    const bv = t.get(base) ?? t.get(firstValid(rows.filter((r) => r.ano_mes >= base.ano_mes), t.get) || base);
    return { ...t, bv, rows: rows.map((r) => ({ iso: r.ano_mes, v: isNil(t.get(r)) || !bv ? null : (t.get(r) / bv) * 100, raw: t.get(r) })) };
  });
  const all = series.flatMap((s) => s.rows.map((r) => r.v)).filter((v) => !isNil(v));
  const yDomain = [Math.min(...all, 100), Math.max(...all, 100)];
  const bL = mesAno(base.ano_mes);
  $("#context-deck").textContent = `Todas as linhas começam em 100 em ${bL} e dividem a mesma escala vertical: uma linha em 130 subiu 30% desde então. Aqui tudo é média mensal, por isso Dólar e Ibovespa podem diferir um pouco da comparação diária do Índice. Troque o ponto de partida no Índice.`;
  box.style.setProperty("--cols", series.length);
  box.innerHTML = series.map((s, i) => {
    const lv = lastValid(s.rows, (r) => r.v);
    return `<div class="mult${s.product ? " is-product" : ""}"><div class="mult-head"><span class="mult-name">${esc(s.name)}</span><span class="mult-val">${lv ? fmtPct(lv.v - 100) : "—"}</span></div><p class="mult-desc">${s.desc} · desde ${bL}</p><div class="chart" id="mult-${i}" role="img" aria-label="${esc(s.name)}: ${lv ? fmtPct(lv.v - 100) : "—"} desde ${bL}, em base 100."></div></div>`;
  }).join("");
  series.forEach((s, i) => {
    const ch = lineChart($(`#mult-${i}`), {
      series: [{ rows: s.rows, cls: s.product ? "c-line" : "c-line c-line--ctx", area: false }],
      cutoff: PERIODO_CORTE, bands: "short", refY: 100, yDomain, yTickCount: 3, yFmt: (t) => fmtNum(t, 0), baseIso: base.ano_mes,
      inlineLabel: (v) => fmtNum(v, 0),
      tooltip: (mi) => {
        const r = s.rows.find((q) => monthIdx(q.iso) === mi);
        return r && !isNil(r.v) ? `<div class="t-when">${mesAno(r.iso)} · ${esc(s.name)}</div><div class="t-val">${fmtNum(r.v, 1)}</div><div class="t-row"><span>base 100 em ${bL}</span></div><div class="t-row"><span>valor</span><b>${s.raw(r.raw)}</b></div>` : "";
      },
      onHover: (mi) => multCharts.forEach((c, j) => { if (j !== i) c.setHover(mi, false); }),
    });
    multCharts.push(ch);
  });
  const keys = tracks.map((t) => t.key);
  $("#context-source").textContent = [sourceFor(code), keys.includes("brent") && "Brent: FRED (St. Louis Fed).", keys.includes("dolar") && code !== "DOLAR" && "Dólar: Banco Central (PTAX).", keys.includes("ibov") && "Ibovespa: B3.", keys.includes("ipca") && !/IPCA/.test(sourceFor(code)) && "IPCA: IBGE."].filter(Boolean).join(" ");
}

// =====================================================================
// 05 · MÁQUINA DO TEMPO
// =====================================================================
const TM_FIXED = ["GASOLINA", "DIESEL", "DOLAR", "SALARIO", "SELIC", "IPCA", "IBOVESPA"];
let TM_MOMENTS = [];
function initMachine() {
  const F = D.fotografia_mensal;
  const argBy = (key, cmp) => MONTHS.filter((m) => !isNil(F[m][key])).reduce((x, m) => (cmp(F[m][key], F[x][key]) ? m : x), MONTHS.find((m) => !isNil(F[m][key])));
  const gasPeak = argBy("gasolina", (a, b) => a > b);
  const selicMin = argBy("selic", (a, b) => a < b);
  const selicMax = argBy("selic", (a, b) => a > b);
  const cand = [
    { iso: PERIODOS.serieInicio, label: "Início da série" },
    { iso: "2020-03-01", label: "Pandemia declarada" },
    { iso: selicMin, label: "Selic na mínima" },
    { iso: gasPeak, label: "Gasolina no pico" },
    { iso: PERIODOS.trocaGoverno, label: "Antes da troca de governo" },
    { iso: selicMax, label: "Selic na máxima" },
    { iso: PERIODOS.ultimoDisponivel, label: "Último dado" },
  ];
  const seen = new Set();
  TM_MOMENTS = cand.filter((c) => MONTHS.includes(c.iso) && !seen.has(c.iso) && seen.add(c.iso)).sort((a, b) => a.iso.localeCompare(b.iso));
  S.tmIso = gasPeak;
  $("#tm-moments").innerHTML = TM_MOMENTS.map((mo) => `<button type="button" class="tm-moment" data-iso="${mo.iso}" aria-pressed="false"><time>${mesAnoCurto(mo.iso)}</time>${mo.label}</button>`).join("");
  const range = $("#tm-range");
  range.max = String(MONTHS.length - 1);
  range.value = String(MONTHS.indexOf(S.tmIso));
}

function tmInstruments() {
  const slot = TM_FIXED.includes(S.product) ? "GLP" : S.product;
  return [...TM_FIXED.slice(0, 3), "SALARIO", ...TM_FIXED.slice(4), slot].map((c) => {
    if (c === "SALARIO") {
      const g = P("DOLAR"); // série completa: a de combustíveis tem meses sem coleta da ANP
      return { code: c, label: "Salário mínimo · R$", prod: g, get: (r) => r.salario_minimo, fmt: (v) => fmtBRL(v, 0), html: (v) => `<span class="cur">R$</span>${fmtInt(v)}`, rowLookup: rowAt };
    }
    const prod = P(c), k = kind(prod);
    const label = c === "IPCA" ? "Inflação · 12 meses" : c === "SELIC" ? "Selic · % ao ano" : c === "IBOVESPA" ? "Ibovespa · pontos" : c === "DOLAR" ? "Dólar · R$" : prod.tipo === "pib" ? "PIB · variação real anual" : k === "indice" ? `${META[c].curto} · índice` : `${META[c].curto} · R$${c === "GLP" ? "/botijão" : "/litro"}`;
    const html = k === "pontos" ? (v) => `${fmtNum(v / 1000, 1)}<span class="suf">mil</span>` : (v) => fmtValueHTML(prod, v);
    const rowLookup = prod.tipo === "pib" ? rowAtYear : rowAt;
    return { code: c, label, prod, get: nativeValue(prod), fmt: (v) => fmtValue(prod, v), html, rowLookup, product: c === S.product };
  });
}

function renderMachine(rebuild = false) {
  const box = $("#tm-instruments");
  const insts = tmInstruments();
  const sig = insts.map((i) => i.code).join("|");
  if (rebuild || box.dataset.sig !== sig) {
    box.dataset.sig = sig;
    box.innerHTML = insts.map((it) => `<div class="inst${it.product ? " is-product" : ""}" data-code="${esc(it.code)}"><span class="inst-label">${it.label}${it.product ? " · sua história" : ""}</span><span class="inst-val" data-v="NaN">—</span><span class="inst-now"></span><span class="inst-extra"></span><div class="inst-spark"></div></div>`).join("");
  }
  const iso = S.tmIso;
  insts.forEach((it) => {
    const el = box.querySelector(`[data-code="${CSS.escape(it.code)}"]`);
    const isPib = it.prod.tipo === "pib";
    const r = it.rowLookup(it.prod.serie_mensal, iso);
    const v = r ? it.get(r) : null;
    const lr = lastValid(it.prod.serie_mensal, it.get);
    // mês sem coleta da ANP: se o pipeline calculou uma ESTIMATIVA, ela aparece
    // com "≈" e estilo próprio, nunca igual a um dado oficial.
    const est = isNil(v) && !isPib ? (it.prod.estimativas || []).find((e) => mesKey(e.ano_mes) === mesKey(iso)) : null;
    countTo(el.querySelector(".inst-val"), v, (x) => (isNil(x) ? (est ? `<span class="est" title="Estimativa, não é dado da ANP">≈ ${it.html(est.valor)}</span>` : `<span class="nodata">sem dado</span>`) : it.html(x)), 420);
    const qual = it.code === "SALARIO" ? "vigente em" : it.code === "IBOVESPA" ? "fechamento de" : it.code === "IPCA" ? "12 meses até" : isPib ? "resultado fechado de" : kind(it.prod) === "indice" ? "índice em" : "média de";
    el.querySelector(".inst-now").innerHTML = lr ? `${!isPib && iso === lr.ano_mes ? "é o último mês com dado" : `${qual} ${isPib ? lr.ano.toString() : mesAno(lr.ano_mes)}: <b>${it.fmt(it.get(lr))}</b>`}` : "";
    let extra = isPib
      ? (r && !r.resultado_anual ? "ano ainda sem resultado fechado (só trimestres parciais)" : !r ? "sem série de PIB para este ano" : "")
      : r && it.code !== "SALARIO" && kind(it.prod) === "preco" && !isNil(r.preco_real) && iso !== lr?.ano_mes ? `em reais de ${mesAno(lr.ano_mes)}: ${fmtBRL(r.preco_real)}` : "";
    if (!isPib && isNil(v)) {
      // mês sem coleta: mostra o último dado antes e o primeiro depois, sem estimar nada
      const rows = it.prod.serie_mensal.filter((q) => !isNil(it.get(q)));
      const antes = [...rows].reverse().find((q) => q.ano_mes < iso), depois = rows.find((q) => q.ano_mes > iso);
      const viz = [antes && `${mesAno(antes.ano_mes)}: ${it.fmt(it.get(antes))}`, depois && `${mesAno(depois.ano_mes)}: ${it.fmt(it.get(depois))}`].filter(Boolean).join(" · ");
      const motivo = mesKey(iso) === ANP_SEM_PESQUISA.mes && it.prod.tipo === "combustivel" ? ANP_SEM_PESQUISA.texto : "a ANP não tem coleta neste mês";
      extra = est
        ? `Estimativa nossa, não é dado da ANP. ${motivo} Faixa provável: ${it.fmt(est.intervalo[0])} a ${it.fmt(est.intervalo[1])}.`
        : `${motivo}${viz ? ` Antes e depois: ${viz}.` : ""}`;
    }
    el.querySelector(".inst-extra").textContent = extra;
    el.querySelector(".inst-spark").innerHTML = spark(it.prod.serie_mensal.map((q) => ({ iso: q.ano_mes, v: it.get(q) })), {
      m0: monthIdx(MONTHS[0]), m1: monthIdx(MONTHS[MONTHS.length - 1]), cutLine: true, width: 1.5, maxGap: cadenceGap(it.prod),
      dots: r && !isNil(v) ? [{ iso: r.ano_mes, size: 9, color: "var(--signal)" }] : [],
    });
  });

  // Mês escolhido ≠ dado disponível: se algum combustível não tem coleta no mês,
  // o painel diz isso de forma explícita, com o motivo e o que continua valendo.
  const semDado = insts.filter((it) => kind(it.prod) === "preco" && it.prod.tipo === "combustivel" && isNil(it.get(rowAt(it.prod.serie_mensal, iso) || {})));
  const gap = $("#tm-gap");
  gap.hidden = !semDado.length;
  if (semDado.length) {
    const motivo = mesKey(iso) === ANP_SEM_PESQUISA.mes ? ANP_SEM_PESQUISA.texto : "A ANP não tem coleta de preços neste mês.";
    const ests = semDado.map((it) => ({ it, e: (it.prod.estimativas || []).find((x) => mesKey(x.ano_mes) === mesKey(iso)) })).filter((x) => x.e);
    gap.innerHTML = `<strong>${mesAnoLongo(iso)}: combustíveis sem dado oficial.</strong> ${motivo} ${ests.length ? "Os valores com “≈” são estimativas nossas, não dados da ANP." : ""} Os demais indicadores (dólar, salário mínimo, Selic, inflação e Ibovespa) têm dado normal neste mês.${ests.length ? estimativaDetalhes(ests) : ""}`;
  }

  // cabeçalho: mês + período
  const mt = $("#tm-month");
  mt.textContent = mesAnoLongo(iso);
  mt.classList.remove("swap"); void mt.offsetWidth; mt.classList.add("swap");
  const per = iso < PERIODO_CORTE ? "Bolsonaro" : "Lula";
  const gp = getGovernmentComparison(per);
  const k = monthIdx(iso) - monthIdx(gp.inicio) + 1;
  const tot = monthIdx(gp.fim) - monthIdx(gp.inicio) + 1;
  $("#tm-period").innerHTML = `${pmark(per)}Governo ${per} · mês ${k} de ${tot}${per === "Lula" ? " (em curso)" : ""}`;

  // controles
  const i = MONTHS.indexOf(iso);
  const range = $("#tm-range");
  range.value = String(i);
  range.setAttribute("aria-valuetext", mesAnoLongo(iso));
  $("#tm-prev").disabled = i <= 0;
  $("#tm-next").disabled = i >= MONTHS.length - 1;
  $$("#tm-moments .tm-moment").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.iso === iso)));
  scrubViz($("#tm-scrub-viz"), {
    months: MONTHS, values: MONTHS.map((m) => D.fotografia_mensal[m].gasolina), cutoff: PERIODO_CORTE,
    handleIdx: i, handleLabel: mesAnoCurto(iso),
  });

  // noticiário do mês (±1 mês), com foto quando a licença permite
  const mi = monthIdx(iso);
  const perto = NEWS.map((n) => ({ n, d: Math.abs(monthIdx(n.data) - mi) })).filter((x) => x.d <= 1)
    .sort((a, b) => a.d - b.d || Number(b.n.produtos.includes(S.product)) - Number(a.n.produtos.includes(S.product)) || Number(!!b.n.imagem) - Number(!!a.n.imagem)).slice(0, 3).map((x) => x.n);
  const nb = $("#tm-news");
  if (perto.length) {
    nb.innerHTML = `<div class="fade-swap">${perto.map((n, j) => clip(n, { lead: j === 0, sum: j === 0 })).join("")}</div>`;
  } else {
    const near = NEWS.map((n) => ({ n, d: Math.abs(monthIdx(n.data) - mi) })).sort((a, b) => a.d - b.d)[0];
    nb.innerHTML = `<div class="fade-swap"><p class="tm-empty">Nenhuma matéria do arquivo entre ${mesAno(MONTHS[Math.max(0, i - 1)])} e ${mesAno(MONTHS[Math.min(MONTHS.length - 1, i + 1)])}.${near ? " A mais próxima:" : ""}</p>${near ? `<div style="margin-top:14px">${clip(near.n, { sum: false })}</div>` : ""}</div>`;
  }
  $("#tm-foot").textContent = "Médias mensais (salário mínimo: valor vigente; Ibovespa: fechamento do mês). No trilho, a linha é o preço da gasolina. Nos quadros, o ponto âmbar marca o mês escolhido e a linha vertical, a troca de governo.";
}

// Como chegamos a cada estimativa: valores de entrada, fórmula, testes e fontes.
// Tudo vem pronto do pipeline (dashboard_data.json); aqui só se escreve.
function estimativaDetalhes(ests) {
  const linhas = ests.map(({ it, e }) => {
    const t = e.teste_de_volta;
    return `<li><b>${esc(it.label.split(" · ")[0])}: ≈ ${it.fmt(e.valor)}</b> = ${it.fmt(e.base_valor)} (média ANP, ${mesAno(e.base_ano_mes)}) × (1 + ${fmtNum(e.ipca_var_pct, 2)}%, variação do item “${esc(e.ipca_item)}” no IPCA de ${mesAno(e.ano_mes)}). Interpolação linear entre o último e o primeiro mês com dado: ${it.fmt(e.interpolacao_linear)}.${t ? ` Teste de volta: aplicando a variação do IPCA de ${mesAno(t.ano_mes)}, a estimativa prevê ${it.fmt(t.previsto)}; a ANP observou ${it.fmt(t.observado_anp)} (${fmtPct(t.erro_pct, 1)}).` : ""}</li>`;
  }).join("");
  return `<details class="est-how"><summary>Como chegamos a estas estimativas</summary>
    <p>A ANP não pesquisou preços nesse período, então <strong>não existe valor oficial</strong>. Estimamos partindo do último preço médio da própria ANP e aplicando a variação oficial do IBGE para o mesmo item. A estimativa não entra em nenhuma variação, média, período ou comparação da página.</p>
    <ul>${linhas}</ul>
    <p>Limites: os meses vizinhos da ANP têm coleta parcial (agosto vai só até 17/08 e outubro começa em 19/10), e o IPCA mede o mês inteiro. Por isso mostramos uma faixa e o teste de volta; para etanol, diesel e gás o erro no teste é maior que o da gasolina.</p>
    <p class="est-src">Fontes: <a href="https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis" target="_blank" rel="noopener">ANP, informações sobre o levantamento (sem pesquisa entre 23/08 e 17/10/2020)</a> · <a href="https://sidra.ibge.gov.br/tabela/7060" target="_blank" rel="noopener">IBGE/SIDRA, IPCA, tabela 7060 (variação mensal por item)</a> · <a href="https://agenciabrasil.ebc.com.br/economia/noticia/2020-09/gasolina-sobe-4-nas-refinarias-anuncia-petrobras" target="_blank" rel="noopener">Agência Brasil, 22/09/2020: reajuste de 4% da gasolina nas refinarias, com o último preço médio da ANP</a>.</p>
  </details>`;
}

function setMachine(iso) {
  if (iso === S.tmIso) return;
  S.tmIso = iso;
  renderMachine();
}

// =====================================================================
// 06 · PERÍODOS
// =====================================================================
const SPREAD_FIXED = ["GASOLINA", "DIESEL", "Arroz", "Café moído", "DOLAR", "SELIC", "IPCA", "IBOVESPA"];
function renderPeriods() {
  const codes = [S.product, ...SPREAD_FIXED.filter((c) => c !== S.product && D.produtos[c])];
  const m0 = monthIdx(MONTHS[0]), m1 = monthIdx(MONTHS[MONTHS.length - 1]);
  const gB = getGovernmentComparison("Bolsonaro"), gL = getGovernmentComparison("Lula");
  const bolsoMeses = monthIdx(gB.fim) - monthIdx(gB.inicio) + 1;
  const lulaMeses = monthIdx(gL.fim) - monthIdx(gL.inicio) + 1;
  const pres = D.presidentes;
  const gov = (p, meses) => `<div class="sp-gov"><img src="${esc(pres[p].foto)}" alt="Retrato oficial de ${esc(pres[p].nome)}" width="56" height="70" loading="lazy" decoding="async"><div><span class="sp-gov-name">${pmark(p)}${p}</span><span class="sp-gov-full">${esc(pres[p].nome)}</span><span class="sp-gov-dates">${p === "Bolsonaro" ? `${mesAno(gB.inicio)} – ${mesAno(gB.fim)}` : `${mesAno(gL.inicio)} – ${mesAno(gL.fim)}`}<br>${meses} meses${p === "Lula" ? " · em curso" : ""}</span></div></div>`;
  const cutX = ((monthIdx(PERIODO_CORTE) - 0.5 - m0) / (m1 - m0)) * 100;
  const axis = `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="24" width="${cutX}" height="3" fill="var(--pb)"/><rect x="${cutX + 0.2}" y="24" width="${100 - cutX - 0.2}" height="3" fill="var(--pl)"/></svg><span style="position:absolute;left:0;top:4px">${gB.inicio.slice(0, 4)}</span><span style="position:absolute;left:${cutX}%;top:4px;padding-left:6px">${gL.inicio.slice(0, 4)}</span><span style="position:absolute;right:0;top:4px">${MONTHS[MONTHS.length - 1].slice(0, 4)}</span>`;

  const head = `<div class="sp-head"><span class="sp-label-col">Indicador · variação no recorte</span><div class="sp-axis">${axis}</div>${gov("Bolsonaro", bolsoMeses)}${gov("Lula", lulaMeses)}</div>`;

  const rowsHtml = codes.map((code) => {
    const prod = P(code), k = kind(prod), get = nativeValue(prod);
    let rs = ["Bolsonaro", "Lula"].map((p) => prod.resumo_periodos?.[p]?.[S.cohort]);
    // Governo inteiro em Dólar, Selic e Ibovespa: primeiro e último dado DIÁRIO
    // de cada período (Bolsonaro: primeiro dado → último de dez/2022; Lula:
    // primeiro dado de jan/2023 → último dado disponível).
    const dd = S.cohort === "governo_inteiro" ? prod.diario : null;
    if (dd) rs = [[dd.inicio, dd.troca], [dd.inicio_lula, dd.ultimo]].map(([ini, fim]) => (ini && fim ? { daily: true, ini, fim } : null));
    const main = (r) => !r ? null : r.daily ? (isTaxaLike(prod) ? r.fim.valor - r.ini.valor : (r.fim.valor / r.ini.valor - 1) * 100)
      : isTaxaLike(prod) ? r.variacao_pp : k === "pontos" ? r.variacao_pct : r.variacao_nominal_pct;
    const fmtMain = (v) => (isTaxaLike(prod) ? fmtPP(v) : fmtPct(v));
    const conabResumo = (j) => temPrecoAbsoluto(prod) ? prod.preco_absoluto.resumo_periodos?.[j ? "Lula" : "Bolsonaro"]?.[S.cohort] : null;
    const sub = (r, j) => {
      if (!r) return "dado não disponível";
      if (r.daily) {
        const f = (x) => (isTaxaLike(prod) ? `${fmtNum(x, 2)}%` : k === "pontos" ? `${fmtNum(x / 1000, 1)} mil pts` : fmtValue(prod, x));
        return `${f(r.ini.valor)} → ${f(r.fim.valor)}<br>${dataCurta(r.ini.data)} → ${dataCurta(r.fim.data)}`;
      }
      if (isTaxaLike(prod)) return `${fmtNum(r.taxa_inicio, 2)}% → ${fmtNum(r.taxa_fim, 2)}%`;
      if (k === "pontos") return `${fmtNum(r.pontos_inicio / 1000, 1)} → ${fmtNum(r.pontos_fim / 1000, 1)} mil pts`;
      const ini = k === "preco" ? fmtValue(prod, r.preco_nominal_inicio) : fmtNum(r.indice_nominal_inicio, 1);
      const fim = k === "preco" ? fmtValue(prod, r.preco_nominal_fim) : fmtNum(r.indice_nominal_fim, 1);
      const cr = j !== undefined ? conabResumo(j) : null;
      const linhaConab = cr ? `<br><span class="sp-conab">${fmtBRL(cr.preco_brl_kg_inicio)}/kg → ${fmtBRL(cr.preco_brl_kg_fim)}/kg <i>CONAB</i></span>` : "";
      return `${ini} → ${fim}<br>descontada a inflação: ${fmtPct(r.variacao_real_pct)}${linhaConab}`;
    };
    const vals = rs.map(main);
    const span = Math.max(...vals.filter((v) => !isNil(v)).map(Math.abs), 0.0001);
    const bar = (v, cls) => {
      if (isNil(v)) return "";
      const w = (Math.abs(v) / span) * 50;
      return `<span class="sp-bar" aria-hidden="true"><i class="${cls}" style="left:${v >= 0 ? 50 : 50 - w}%;width:${w}%"></i></span>`;
    };
    const windows = S.cohort === "governo_inteiro" ? null : rs.filter(Boolean).map((r) => [monthIdx(r.mes_inicio), monthIdx(r.mes_fim)]);
    const track = spark(nativeRows(prod), { m0, m1, cutLine: true, width: code === S.product ? 2 : 1.5, windows, pad: 8, maxGap: cadenceGap(prod) });
    const unit = isTaxaLike(prod) ? "em pontos percentuais" : k === "pontos" ? "pontos" : k === "indice" ? "índice de preço" : code === "DOLAR" ? "cotação" : "preço na época";
    return `<div class="sp-row${code === S.product ? " is-product" : ""}">
      <div class="sp-name">${META[code].curto}<small>${unit}</small></div>
      <div class="sp-track">${track}</div>
      ${rs.map((r, j) => `<div class="sp-cell"><span class="sp-mobile-lab">${pmark(j ? "Lula" : "Bolsonaro")}${j ? "Lula" : "Bolsonaro"}</span><span class="sp-val">${isNil(vals[j]) ? "—" : fmtMain(vals[j])}<small>${sub(r, j)}</small></span>${bar(vals[j], j ? "l" : "b")}</div>`).join("")}
    </div>`;
  }).join("");
  $("#spread").innerHTML = head + rowsHtml;

  const rL = P("GASOLINA").resumo_periodos?.Lula?.[S.cohort];
  const n = { primeiros_12m: 12, primeiros_24m: 24, primeiros_36m: 36 }[S.cohort];
  $("#cohort-note").textContent = S.cohort === "governo_inteiro"
    ? `Períodos de durações diferentes: ${bolsoMeses} meses e ${lulaMeses} meses (ainda em curso). Dólar, Selic e Ibovespa usam o primeiro e o último dado diário de cada período; os demais, o primeiro e o último mês. Para comparar janelas iguais, use os recortes de 1, 2 ou 3 anos. Nas linhas, o trecho azul é o primeiro período e o vermelho, o segundo.`
    : rL && rL.completo === false
      ? `O segundo período ainda não completou ${n} meses; o recorte usa os meses disponíveis. Nas linhas, o trecho destacado é a janela comparada.`
      : `Os primeiros ${n} meses de cada período, lado a lado. Nas linhas, o trecho destacado é a janela comparada; o resto fica apagado.`;
  $("#photo-credit").textContent = `Retratos: ${pres.Bolsonaro.fonte_foto} · ${pres.Lula.fonte_foto}. Mesmo recorte e mesmo tratamento de cor para os dois.`;
}

// =====================================================================
// 07 · ARQUIVO
// =====================================================================
function renderArchive() {
  const code = S.product, prod = P(code), k = kind(prod), m = META[code];
  const list = S.archive === "todas" ? [...NEWS].sort((a, b) => a.data.localeCompare(b.data)) : noticiasDo(code);
  $("#archive-filter-produto").textContent = `Sobre ${m.curto.toLowerCase() === m.curto ? m.curto : m.curto}`;
  $("#archive-filter-todas").textContent = `Todas (${NEWS.length})`;
  const veic = new Set(list.map((n) => n.veiculo)).size;
  const annual = new Map(prod.serie_anual.map((r) => [String(r.ano), r]));
  const anVal = (r) => (!r ? null : k === "preco" ? r.preco_nominal_medio : k === "indice" ? r.indice_nominal_medio : isTaxaLike(prod) ? r.taxa_media : r.pontos_medio);
  // PIB: só os anos com reportagem/release verificado (uma linha por ano vazio não ajudaria)
  const years = prod.tipo === "pib"
    ? [...new Set(list.map((n) => n.data.slice(0, 4)))].sort()
    : [...new Set([...prod.serie_anual.map((r) => String(r.ano)), ...list.map((n) => n.data.slice(0, 4))])].sort();
  $("#arquivo-title").textContent = prod.tipo === "pib" ? "O que estava acontecendo quando o PIB mudou?" : "O noticiário, ano a ano";
  $("#archive-deck").textContent = list.length
    ? `${list.length} ${list.length === 1 ? "matéria real" : "matérias reais"} de ${veic} ${veic === 1 ? "veículo" : "veículos"}${S.archive === "produto" ? `, sobre ${m.titulo.toLowerCase()} e o contexto em volta` : ""}. Ao lado de cada ano, a média ${m.de} naquele ano.`
    : "O arquivo ainda não tem matérias para esta história. Mude para “Todas”.";
  $("#archive").innerHTML = years.map((y, yi) => {
    const per = +y < 2023 ? "Bolsonaro" : "Lula";
    const r = annual.get(y), prevR = annual.get(String(+y - 1));
    const v = anVal(r), pv = anVal(prevR);
    const yoy = !isNil(v) && !isNil(pv) ? fmtChange(change(prod, pv, v)) : null;
    const items = list.filter((n) => n.data.startsWith(y));
    const leadN = [...items].sort((a, b) => Number(!!b.imagem) - Number(!!a.imagem) || Number(!!b.especifica) - Number(!!a.especifica))[0];
    const rest = items.filter((n) => n !== leadN);
    const get = nativeValue(prod);
    const valueFor = (n) => { const row = linhaDoMes(prod, n.data, get); return row ? `<p class="clip-value">${esc(m.curto)} em ${mesAno(row.ano_mes)}: <b>${fmtValue(prod, get(row))}</b></p>` : ""; };
    const side = `<div class="ay-side">
      <p class="ay-year">${y}</p>
      <span class="ay-period">${pmark(per)}Governo ${per}</span>
      ${!isNil(v) ? `<div class="ay-stat"><span class="ay-stat-label">${esc(m.curto)} · média do ano</span><span class="ay-stat-val">${fmtValue(prod, v, { compact: true })}</span>${yoy ? `<span class="ay-stat-yoy">${yoy} sobre ${+y - 1}</span>` : ""}${r.n_meses < 12 ? `<span class="ay-stat-partial">média de ${r.n_meses} ${r.n_meses === 1 ? "mês" : "meses"}</span>` : ""}</div>` : ""}
    </div>`;
    if (!leadN) return `<article class="ay" aria-label="${y}">${side}<p class="ay-empty">Nenhuma matéria deste ano no arquivo${S.archive === "produto" ? " desta história" : ""}.</p></article>`;
    return `<article class="ay${leadN.imagem ? "" : " ay--noimg"}" aria-label="${y}">${side}
      <div class="ay-lead">${clip(leadN, { lead: true, value: valueFor(leadN) })}</div>
      <ul class="ay-rest">${rest.map((n) => `<li>${clip(n, { sum: false })}</li>`).join("")}</ul>
    </article>`;
  }).join("");
}

// =====================================================================
// 08 · MÉTODO
// =====================================================================
function renderMethod() {
  const last = MONTHS[MONTHS.length - 1];
  const miss = missingMonths(P("GASOLINA"));
  if (miss.length) $("#lim-anp").textContent = `A ANP não tem dado de ${miss.join(" e ")}, por isso as linhas de combustíveis ficam interrompidas nesses meses.${miss.includes(mesAno(`${ANP_SEM_PESQUISA.mes}-01`)) ? ` ${ANP_SEM_PESQUISA.texto} Não estimamos valores para esse período; agosto e outubro de 2020 também têm coleta parcial.` : ""}`;
  $("#updated").innerHTML = `Dados consolidados em ${dataCurta(D.gerado_em.slice(0, 10))} · séries mensais até ${mesAno(last)}${NEWS_META?.gerado_em ? ` · notícias conferidas em ${dataCurta(NEWS_META.gerado_em.slice(0, 10))}` : ""}.`;
  const rows = STATUS ? Object.values(STATUS).map((s) => `<tr><td><strong>${esc(s.nome)}</strong><br>${esc(s.fonte)}</td><td>${esc(s.frequencia)}</td><td>${s.ultimo_dado ? dataCurta(s.ultimo_dado) : "—"}</td><td>${s.ok ? "ok" : "falhou — mantido o último histórico salvo"}</td></tr>`).join("") : "";
  $("#freshness").innerHTML = `<p>As séries mensais vão até ${mesAnoLongo(last)} (o IPCA fecha o mês depois dos outros indicadores). Dólar, Selic e Ibovespa também têm o último valor diário, mostrado à parte e sempre com data.</p>${rows ? `<div class="table-scroll" style="max-height:none;border:0"><table class="fresh"><thead><tr><th>Série diária</th><th>Frequência</th><th>Último dado</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}`;
  $("#foot-meta").textContent = `Dados até ${mesAno(last)} · consolidados em ${dataCurta(D.gerado_em.slice(0, 10))} · fontes: ANP, IBGE, Banco Central, B3, FRED · notícias com link para o original.`;
}

// =====================================================================
// NAVEGAÇÃO, ESTADO E ROLAGEM
// =====================================================================
function selectProduct(code, { initial = false, scroll = false } = {}) {
  const changed = code !== S.product;
  S.product = code;
  if (changed || initial) { S.newsId = null; S.metric = "nominal"; S.ppIdx = null; S.pibYear = null; }
  const q = new URLSearchParams(location.search);
  q.set("historia", META[code].slug);
  if (S.base === "inicio") q.set("desde", "2019"); else q.delete("desde");
  history.replaceState(null, "", `${location.pathname}?${q}${location.hash}`);

  renderTOC();
  renderStory();
  renderPrice(true);
  renderBolso();
  renderContext();
  renderMachine();
  renderPeriods();
  renderArchive();
  if (P(code).tipo === "pib") { renderPibIntro(P(code)); renderPibExtra(P(code), { S, NEWS, clip }); } else hidePibBlocks();
  renumber();
  renderNextLinks();
  updateMast();
  updateHeroHighlight(code);
  if (scroll) $("#historia").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
}

function setBase(base) {
  S.base = base;
  S.ppIdx = null;
  setPressed($("#baseline-toggle"), $(`#baseline-toggle [data-base="${base}"]`));
  selectProduct(S.product);
}

function updateMast() {
  const prod = P(S.product), get = nativeValue(prod);
  const cp = comparisonPoints(prod, S.base), c = change(prod, cp.a.v, cp.b.v);
  $("#mast-product-name").textContent = META[S.product].curto;
  $("#mast-product-delta").textContent = fmtChange(c, c.unit === "p.p." ? 1 : 1);
}

// Numeração dos capítulos segue os visíveis (Bolso some para taxa/pontos).
function renumber() {
  const secs = $$("[data-chapter]").filter((s) => !s.hidden);
  secs.forEach((s, i) => {
    const n = String(i + 1).padStart(2, "0");
    const k = s.querySelector(".ch-kicker span");
    if (k) k.textContent = n;
    const a = $(`.mast-nav a[data-ch="${s.id}"] i`);
    if (a) a.textContent = n;
  });
}

function bindControls() {
  $("#baseline-toggle").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && b.dataset.base !== S.base) setBase(b.dataset.base); });
  $("#toc").addEventListener("click", (e) => { const b = e.target.closest(".toc-row"); if (b) selectProduct(b.dataset.code, { scroll: true }); });
  ["#story-prev", "#story-next"].forEach((id) => $(id).addEventListener("click", (e) => selectProduct(e.currentTarget.dataset.code)));
  $("#metric-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.metric === S.metric) return;
    S.metric = b.dataset.metric;
    renderPrice(true);
  });
  $("#nr-list").addEventListener("click", (e) => { const b = e.target.closest(".nr-item"); if (b) selectNews(b.dataset.news); });
  $("#pp-range").addEventListener("input", (e) => { S.ppIdx = +e.target.value; updateBolso(); });
  $("#cohort-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    S.cohort = b.dataset.cohort;
    setPressed($("#cohort-toggle"), b);
    renderPeriods();
  });
  $("#archive-filter").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    S.archive = b.dataset.filter;
    setPressed($("#archive-filter"), b);
    renderArchive();
  });
  $("#tm-range").addEventListener("input", (e) => setMachine(MONTHS[+e.target.value]));
  $("#tm-prev").addEventListener("click", () => { const i = MONTHS.indexOf(S.tmIso); if (i > 0) setMachine(MONTHS[i - 1]); });
  $("#tm-next").addEventListener("click", () => { const i = MONTHS.indexOf(S.tmIso); if (i < MONTHS.length - 1) setMachine(MONTHS[i + 1]); });
  $("#tm-moments").addEventListener("click", (e) => { const b = e.target.closest(".tm-moment"); if (b) setMachine(b.dataset.iso); });
  // links do cabeçalho abrem o capítulo do caderno correspondente
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", () => { const t = document.getElementById(a.getAttribute("href").slice(1)); if (t?.tagName === "DETAILS") t.open = true; }));
}

function bindScroll() {
  const bar = $("#progress"), mast = $("#mast"), idx = $("#indice");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
    mast.classList.toggle("show-product", idx.getBoundingClientRect().bottom < 80);
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (!("IntersectionObserver" in window)) return;
  const links = new Map($$(".mast-nav a").map((a) => [a.dataset.ch, a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.removeAttribute("aria-current"));
      const a = links.get(en.target.id);
      if (a) {
        a.setAttribute("aria-current", "true");
        const nav = a.closest("ol");
        if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - 24, behavior: reduceMotion() ? "auto" : "smooth" });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  $$("[data-chapter]").forEach((s) => io.observe(s));
}

// Fim de cada capítulo: uma linha dizendo para onde a leitura segue, com a
// pergunta do próximo capítulo (o título dele). Pula capítulos ocultos.
function renderNextLinks() {
  $$(".ch-next").forEach((a) => a.remove());
  const chs = $$("section.chapter[data-chapter]").filter((c) => !c.hidden);
  chs.forEach((c, i) => {
    const nx = chs[i + 1];
    if (!nx || c.id === "indice") return; // o Índice já leva à história ao escolher
    const n = nx.querySelector(".ch-kicker span")?.textContent || "";
    const name = nx.querySelector(".ch-kicker")?.textContent.replace(n, "").trim() || "";
    const title = nx.id === "maquina" ? "Como estava o Brasil no mês que você escolher"
      : (nx.querySelector("h2")?.textContent || "").replace(/\s+/g, " ").trim();
    const a = document.createElement("a");
    a.className = "ch-next";
    a.href = `#${nx.id}`;
    a.innerHTML = `<span class="mono">A seguir · ${esc(n)} ${esc(name)}</span><b>${esc(title)}</b><i aria-hidden="true">↓</i>`;
    c.querySelector(".shell").appendChild(a);
  });
}

function bindReveal() {
  if (reduceMotion() || !("IntersectionObserver" in window)) return;
  const els = $$(".ch-head, .toc, .story-grid, .price-grid, .pp, .multiples, .tm-grid, .spread, .archive, .notebook");
  els.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));
}

init();
