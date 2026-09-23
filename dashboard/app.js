// CUSTAVA QUANTO? — toda a lógica de preço/deflação/índice já foi calculada
// em Python (scripts/build_dashboard_data.py). Este arquivo só lê
// dashboard_data.json e renderiza — nenhum cálculo econômico acontece aqui
// (apenas razões de exibição entre valores já prontos: diferença entre o
// primeiro e o último mês, largura de barras, escala dos minigráficos etc.).

const DATA_URL = "../data/processed/dashboard_data.json";

const PRODUCT_ORDER = [
  "GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP",
  "Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído",
  "DOLAR", "SELIC", "IBOVESPA", "IPCA",
];
const PRODUCT_CHIP_LABEL = {
  "GASOLINA": "Gasolina", "ETANOL": "Etanol", "DIESEL": "Diesel", "DIESEL S10": "Diesel S10", "GLP": "Gás (GLP)",
  "Arroz": "Arroz", "Feijão carioca": "Feijão", "Carne bovina (patinho)": "Carne",
  "Leite longa vida": "Leite", "Óleo de soja": "Óleo de soja", "Café moído": "Café",
  "DOLAR": "💵 Dólar", "SELIC": "🏦 Selic", "IBOVESPA": "📈 Ibovespa", "IPCA": "📊 IPCA",
};
// Nome de exibição (título), forma usada no meio de frases ("do arroz") e sem artigo ("de arroz").
const PRODUCT_TEXT = {
  "GASOLINA": { titulo: "Gasolina comum", de: "da gasolina comum", sem: "de gasolina comum" },
  "ETANOL": { titulo: "Etanol hidratado", de: "do etanol", sem: "de etanol" },
  "DIESEL": { titulo: "Diesel comum (S500)", de: "do diesel comum", sem: "de diesel comum" },
  "DIESEL S10": { titulo: "Diesel S10", de: "do diesel S10", sem: "de diesel S10" },
  "GLP": { titulo: "Gás de cozinha (GLP)", de: "do gás de cozinha", sem: "de gás de cozinha" },
  "Arroz": { titulo: "Arroz", de: "do arroz", sem: "de arroz" },
  "Feijão carioca": { titulo: "Feijão carioca", de: "do feijão carioca", sem: "de feijão carioca" },
  "Carne bovina (patinho)": { titulo: "Carne bovina (patinho)", de: "da carne (patinho)", sem: "de carne (patinho)" },
  "Leite longa vida": { titulo: "Leite longa vida", de: "do leite longa vida", sem: "de leite longa vida" },
  "Óleo de soja": { titulo: "Óleo de soja", de: "do óleo de soja", sem: "de óleo de soja" },
  "Café moído": { titulo: "Café moído", de: "do café moído", sem: "de café moído" },
  // "sem" fica vazio de propósito: para o dólar a "unidade" já É o produto
  // (1 dólar), então "1 dólar de dólar" ficaria redundante — o espaço duplo
  // que isso gera em algumas frases é inofensivo (HTML colapsa espaços).
  "DOLAR": { titulo: "Dólar comercial", de: "do dólar", sem: "" },
  "SELIC": { titulo: "Taxa Selic", de: "da Selic", sem: "da Selic" },
  "IBOVESPA": { titulo: "Ibovespa", de: "do Ibovespa", sem: "do Ibovespa" },
  "IPCA": { titulo: "Inflação (IPCA)", de: "da inflação (IPCA)", sem: "da inflação (IPCA)" },
};

// Selic e IPCA (ambos tipo "taxa") mostram um ao outro como comparador no
// Contexto — cada um precisa saber o nome/campo do "outro lado" e um texto
// de sujeito com o gênero certo ("a Selic", "a inflação"), para nenhum
// texto ficar hardcoded assumindo que o produto é sempre a Selic.
const TAXA_INFO = {
  SELIC: {
    medida: "Taxa básica de juros, definida pelo Copom",
    subtitulo: "Taxa básica de juros definida pelo Copom em cada reunião.",
    ajuda: `<strong>Selic:</strong> a taxa básica de juros da economia. Aqui é o valor nominal — para comparar com a inflação, veja "Contexto" mais abaixo.`,
    sujeito: "Selic",
    curto: "Selic",
    comparador: { campo: "ipca_var_12m", nome: "IPCA 12 meses", termo: "ipca", desc: "inflação acumulada nos últimos 12 meses" },
  },
  IPCA: {
    medida: "Inflação acumulada nos últimos 12 meses (IBGE)",
    subtitulo: "Variação do IPCA acumulada nos últimos 12 meses, calculada pelo IBGE.",
    ajuda: `<strong>IPCA em 12 meses:</strong> quanto os preços, em média, subiram nos últimos 12 meses até cada mês. Para comparar com a Selic, veja "Contexto" mais abaixo.`,
    sujeito: "inflação em 12 meses (IPCA)",
    curto: "IPCA 12m",
    comparador: { campo: "selic_meta_aa", nome: "Selic", termo: null, desc: "taxa básica de juros definida pelo Copom" },
  },
};
// Categoria de cada produto no seletor — combustível/alimento vêm do próprio
// tipo; Dólar e Selic são "indicadores", uma categoria à parte.
const PRODUCT_CATEGORIA = (codigo) => {
  const tipo = DATA.produtos[codigo]?.tipo;
  return tipo === "combustivel" ? "combustivel" : tipo === "alimento_indice" ? "alimento_indice" : "indicador";
};
const COHORT_LABEL = {
  governo_inteiro: "governo inteiro",
  primeiros_12m: "primeiros 12 meses",
  primeiros_24m: "primeiros 24 meses",
  primeiros_36m: "primeiros 36 meses",
};

// Explicações curtas dos termos técnicos — aparecem ao tocar/passar o mouse.
const TERMS = {
  inflacao: ["Inflação", "É quando os preços em geral sobem. Com inflação, o mesmo dinheiro compra menos coisas com o passar do tempo."],
  ipca: ["IPCA", "O índice oficial de inflação do Brasil, calculado pelo IBGE. Mede quanto subiu, em média, o custo de vida das famílias."],
  real: ["Corrigido pela inflação", "O preço antigo convertido para dinheiro de hoje. Serve para comparar épocas diferentes de forma justa: se o preço corrigido sobe, o produto ficou mais caro de verdade."],
  indice: ["Índice", "Mostra a variação, não o preço. Começa em 100 em jan/2019: 150 quer dizer 50% mais caro que no início. Não é um valor em reais."],
  brent: ["Brent", "O preço internacional do barril de petróleo, referência para o preço dos combustíveis. Aqui, convertido para reais."],
  cambio: ["Dólar (câmbio)", "Quantos reais é preciso para comprar 1 dólar. Quando o dólar sobe, o que é cotado em dólar — como o petróleo — fica mais caro no Brasil."],
  salario: ["Salário mínimo", "O piso salarial nacional vigente em cada mês (dados do Banco Central). Não inclui pisos estaduais mais altos."],
};
const term = (key, label) => `<button type="button" class="term" data-term="${key}" aria-expanded="false">${label}</button>`;

let DATA = null;
const state = { categoria: "combustivel", product: "GASOLINA", metric: "nominal", cohort: "governo_inteiro" };

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const isNil = (v) => v === null || v === undefined || Number.isNaN(v);
const fmtNum = (v, digits = 1) => isNil(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtPct = (v, digits = 1) => isNil(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNum(Math.abs(v), digits)}%`;
const fmtSignedBRL = (v) => isNil(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtBRL.format(Math.abs(v))}`;
const fmtMesAno = (isoDate) => {
  const [y, m] = isoDate.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
};
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDataCurta = (isoDate) => {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

// Combustível e câmbio (Dólar) têm preço em R$ de verdade; alimento é índice
// e taxa (Selic) é uma taxa — nenhum dos dois é "preço" no mesmo sentido.
const temPreco = (produto) => produto.tipo === "combustivel" || produto.tipo === "cambio";

function valorFormatado(produto, valor) {
  if (isNil(valor)) return "dado não disponível";
  return temPreco(produto) ? fmtBRL.format(valor) : fmtNum(valor, 1);
}
// Preço-herói: "R$" pequeno, número em destaque.
const precoHeroi = (v) => isNil(v) ? "—" : `<span class="cur">R$</span>${fmtNum(v, 2)}`;

// Unidade física do produto, para nunca deixar a pessoa adivinhar.
function unidadeInfo(produto) {
  if (produto.unidade === "R$/13kg") return { por: "por botijão de 13 kg", um: "1 botijão", plural: "botijões", singular: "botijão", curta: "R$ por botijão" };
  if (produto.unidade === "R$/US$") return { por: "por dólar", um: "1 dólar", plural: "dólares", singular: "dólar", curta: "R$ por dólar" };
  return { por: "por litro", um: "1 litro", plural: "litros", singular: "litro", curta: "R$ por litro" };
}
const txt = (codigo) => PRODUCT_TEXT[codigo] || { titulo: DATA.produtos[codigo].nome, de: DATA.produtos[codigo].nome.toLowerCase(), sem: DATA.produtos[codigo].nome.toLowerCase() };
const primeiroUltimo = (serie) => [serie[0], serie[serie.length - 1]];
const ultimoValido = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (!isNil(arr[i])) return arr[i]; return null; };

function cssVar(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }
function hexAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}
const reduzMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Número que "conta" até o novo valor (curto, só nos números-herói).
function animateNumber(el, to, render) {
  const from = parseFloat(el.dataset.v);
  el.dataset.v = to;
  if (isNil(to) || Number.isNaN(from) || reduzMovimento()) { el.innerHTML = render(to); return; }
  const t0 = performance.now(), dur = 520;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.innerHTML = render(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Classificação em linguagem simples da variação real (descontada a inflação).
function leituraReal(realPct) {
  if (Math.abs(realPct) < 3) return "igual";
  return realPct > 0 ? "acima" : "abaixo";
}

async function init() {
  const resp = await fetch(DATA_URL, { cache: "no-cache" });
  DATA = await resp.json();
  NEWS = await carregarNoticias();
  renderSelector();
  bindNewsInteractions();
  bindToggles();
  bindHeaderLinks();
  bindStickyBar();
  bindTerms();
  // primeira carga: os números-herói contam a partir de zero
  ["era-value", "agora-value"].forEach((id) => { document.getElementById(id).dataset.v = 0; });
  selectProduct(state.product);
  let eraEstreito = estreito();
  window.addEventListener("resize", () => {
    if (estreito() === eraEstreito) return;
    eraEstreito = estreito();
    renderChart();
    renderContext(DATA.produtos[state.product]);
  });
}

function renderSelector() {
  ["combustivel", "alimento_indice", "indicador"].forEach((categoria) => {
    const el = document.getElementById(`rail-${categoria}`);
    el.innerHTML = "";
    PRODUCT_ORDER
      .filter((p) => DATA.produtos[p] && PRODUCT_CATEGORIA(p) === categoria)
      .forEach((codigo) => {
        const btn = document.createElement("button");
        btn.className = "product-chip" + (codigo === state.product ? " active" : "");
        btn.dataset.produto = codigo;
        btn.textContent = PRODUCT_CHIP_LABEL[codigo] || codigo;
        btn.addEventListener("click", () => selectProduct(codigo));
        el.appendChild(btn);
      });
  });
}

function bindToggles() {
  document.getElementById("metric-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn || btn.disabled) return;
    state.metric = btn.dataset.metric;
    updateToggleActive("metric-toggle", btn);
    renderChart();
  });
  document.getElementById("cohort-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    state.cohort = btn.dataset.cohort;
    updateToggleActive("cohort-toggle", btn);
    renderGovernos(DATA.produtos[state.product]);
  });
}

function updateToggleActive(groupId, activeBtn) {
  document.querySelectorAll(`#${groupId} .segmented-btn`).forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

// Links "Fontes" / "Metodologia" do cabeçalho abrem o accordion correspondente.
function bindHeaderLinks() {
  document.querySelectorAll("[data-open]").forEach((a) => {
    a.addEventListener("click", () => {
      const det = document.getElementById(a.dataset.open);
      if (det) det.open = true;
    });
  });
}

// Barra compacta: aparece quando o seletor sai da tela.
function bindStickyBar() {
  const bar = document.getElementById("sticky-bar");
  const alvo = document.getElementById("seletor");
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(([entry]) => {
    const passou = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    bar.classList.toggle("visible", passou);
    bar.setAttribute("aria-hidden", passou ? "false" : "true");
  }).observe(alvo);
}

// Popover de termos: hover no desktop, toque no celular, foco no teclado.
function bindTerms() {
  const pop = document.getElementById("term-pop");
  let atual = null, abertoEm = 0;
  const mostrar = (btn) => {
    const def = TERMS[btn.dataset.term];
    if (!def) return;
    if (atual && atual !== btn) atual.setAttribute("aria-expanded", "false");
    if (atual !== btn || pop.hidden) abertoEm = performance.now();
    atual = btn;
    btn.setAttribute("aria-expanded", "true");
    pop.innerHTML = `<strong>${def[0]}</strong>${def[1]}`;
    pop.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth;
    const left = Math.max(12, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - w - 12));
    pop.style.left = `${left}px`;
    pop.style.top = `${window.scrollY + r.bottom + 8}px`;
  };
  const esconder = () => {
    if (atual) atual.setAttribute("aria-expanded", "false");
    atual = null;
    pop.hidden = true;
  };
  document.addEventListener("mouseover", (e) => { const b = e.target.closest(".term"); if (b) mostrar(b); });
  document.addEventListener("mouseout", (e) => { const b = e.target.closest(".term"); if (b && !b.contains(e.relatedTarget)) esconder(); });
  document.addEventListener("focusin", (e) => { const b = e.target.closest(".term"); if (b) mostrar(b); });
  document.addEventListener("focusout", (e) => { if (e.target.closest(".term")) esconder(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".term");
    // no toque, mouseover/foco já abriram o popover: o clique só fecha se ele já estava aberto antes
    if (b) { e.preventDefault(); atual === b && !pop.hidden && performance.now() - abertoEm > 400 ? esconder() : mostrar(b); }
    else if (!e.target.closest("#term-pop")) esconder();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") esconder(); });
  window.addEventListener("scroll", () => { if (!pop.hidden && atual && !atual.matches(":focus")) esconder(); }, { passive: true });
}

function selectProduct(codigo) {
  state.product = codigo;
  state.metric = "nominal";
  const produto = DATA.produtos[codigo];
  state.categoria = PRODUCT_CATEGORIA(codigo);
  const isComb = temPreco(produto);
  const isTaxa = produto.tipo === "taxa";
  const isPontos = produto.tipo === "pontos";
  document.querySelectorAll(".product-chip").forEach((c) => c.classList.toggle("active", c.dataset.produto === codigo));
  document.querySelectorAll("#metric-toggle .segmented-btn").forEach((b) => b.classList.toggle("active", b.dataset.metric === "nominal"));

  // Selic (taxa) e Ibovespa (pontos) não têm "preço real" nem "% do
  // salário" — o controle de métrica inteiro não se aplica, então some com ele.
  document.getElementById("metric-toggle").hidden = isTaxa || isPontos;
  document.getElementById("metric-help").hidden = isTaxa || isPontos;
  if (!isTaxa && !isPontos) {
    // Alimentos são índice: os rótulos da métrica mudam e "% do salário" não se aplica.
    document.querySelector('#metric-toggle [data-metric="nominal"]').textContent = isComb ? "Preço na época" : "Índice";
    document.querySelector('#metric-toggle [data-metric="real"]').textContent = isComb ? "Corrigido pela inflação" : "Índice corrigido pela inflação";
    const pctBtn = document.querySelector('#metric-toggle [data-metric="pct_sm"]');
    pctBtn.disabled = !isComb;
    pctBtn.hidden = !isComb;
  }

  state.newsId = null;
  renderAnswer(produto);
  renderLiveQuote(produto);
  renderInterlude(produto);
  renderChart();
  renderYears(produto);
  renderPurchasingPower(produto);
  renderGovernos(produto);
  renderContext(produto);
  renderSnapshot(produto);
  renderArchive(produto);
  renderStepNumbers();
  renderStickyBar(produto);
}

// Dólar e Selic são publicados todo dia útil pelo BCB — bem mais rápido que
// o IPCA, que fecha a série mensal usada no resto do dashboard. Por isso
// mostramos a cotação/taxa mais recente à parte, deixando claro que é um
// valor "de hoje" (um dia específico), não a média do mês que aparece no
// gráfico e nas comparações abaixo.
function renderLiveQuote(produto) {
  const el = document.getElementById("live-quote");
  const cot = produto.cotacao_hoje;
  if (!cot) {
    el.hidden = true;
    return;
  }
  el.hidden = false;

  if (produto.tipo === "pontos") {
    // Ibovespa vem de outra fonte (Yahoo Finance): pontos + data/hora de
    // Brasília, com a própria fonte já avisando que pode não ser tempo real.
    const dataHora = cot.data_hora ? cot.data_hora.slice(0, 16).replace("T", " ") : "";
    const [data, hora] = dataHora.split(" ");
    el.innerHTML = `<span class="live-dot" aria-hidden="true"></span> Cotação mais recente (${data ? fmtDataCurta(data) : "—"}${hora ? `, ${hora}` : ""}): <strong>${fmtNum(cot.pontos, 0)} pontos</strong> <span class="live-note">— ${cot.fonte ? `fonte: ${cot.fonte}. ` : ""}${cot.nota || ""}</span>`;
    return;
  }

  if (produto.tipo === "taxa") {
    const vigente = cot.vigente_desde ? ` · <strong>vigente desde ${fmtDataCurta(cot.vigente_desde)}</strong> (última decisão do Copom)` : "";
    el.innerHTML = `<span class="live-dot" aria-hidden="true"></span> Taxa Selic hoje (${fmtDataCurta(cot.data)}): <strong>${fmtNum(cot.valor, 2)}% ao ano</strong>${vigente} <span class="live-note">— é a meta definida pelo Copom (Selic-meta), não a taxa efetiva diária do mercado</span>`;
    return;
  }

  el.innerHTML = `<span class="live-dot" aria-hidden="true"></span> Cotação de hoje (${fmtDataCurta(cot.data)}): <strong>${fmtBRL.format(cot.valor)}</strong> <span class="live-note">— valor do dia, não é a média mensal usada no restante da página</span>`;
}

function renderStepNumbers() {
  // "Poder de compra" (03) agora aparece para todo produto, então a
  // numeração das seções seguintes é sempre a mesma.
  document.getElementById("step-comparison").textContent = "04";
  document.getElementById("step-context").textContent = "05";
  document.getElementById("step-archive").textContent = "06";
  document.getElementById("step-method").textContent = "07";
}

function renderStickyBar(produto) {
  const ultimo = produto.serie_mensal[produto.serie_mensal.length - 1];
  const eraRef = eraReferencia(produto.serie_mensal);
  document.getElementById("sticky-product").textContent = txt(state.product).titulo;
  document.getElementById("sticky-value").textContent =
    produto.tipo === "taxa" ? `${fmtNum(eraRef.taxa_aa, 2)}% → ${fmtNum(ultimo.taxa_aa, 2)}% ao ano (${eraRef.taxa_aa <= ultimo.taxa_aa ? "+" : "−"}${fmtNum(Math.abs(ultimo.taxa_aa - eraRef.taxa_aa), 2)} p.p.)`
      : produto.tipo === "pontos" ? `${fmtNum(eraRef.pontos, 0)} → ${fmtNum(ultimo.pontos, 0)} pts (${fmtPct((ultimo.pontos / eraRef.pontos - 1) * 100)})`
      : temPreco(produto) ? `${fmtBRL.format(eraRef.preco_nominal)} → ${fmtBRL.format(ultimo.preco_nominal)} ${unidadeInfo(produto).por} (${fmtPct((ultimo.preco_nominal / eraRef.preco_nominal - 1) * 100)})`
      : `índice ${fmtNum(eraRef.indice_relativo, 1)} → ${fmtNum(ultimo.indice_relativo, 1)} (${fmtPct((ultimo.indice_relativo / eraRef.indice_relativo - 1) * 100)})`;
}

// Último mês do governo Bolsonaro na série deste produto — é a referência
// de "Era" na abertura (ver renderAnswer) e no eco da barra fixa
// (renderStickyBar). Comparar direto jan/2019 → hoje misturaria a variação
// dos dois governos numa única manchete; usando o fim do governo anterior,
// a manchete mostra o que mudou já sob o governo atual. É achado pelo campo
// `periodo`, que já vem pronto do Python — não por comparação de datas.
function eraReferencia(serie) {
  let idx = serie.findIndex((r) => r.periodo === "Lula") - 1;
  return serie[Math.max(0, idx)];
}

// Para indicadores de mercado com cotacao_hoje, cria um objeto "agora" com
// dados de hoje (em vez do último mês fechado)
function agoraComCotacaoHoje(produto, tipo) {
  if (!produto.cotacao_hoje) {
    return null;  // usar último mês fechado
  }
  const hoje = new Date();
  const ano_mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  if (tipo === "taxa") {
    return {
      ano_mes,
      taxa_aa: produto.cotacao_hoje.valor,
      ipca_indice: produto.serie_mensal[produto.serie_mensal.length - 1]?.ipca_indice || 1,
    };
  } else if (tipo === "pontos") {
    return {
      ano_mes,
      pontos: produto.cotacao_hoje.pontos,
      ipca_indice: produto.serie_mensal[produto.serie_mensal.length - 1]?.ipca_indice || 1,
    };
  } else if (tipo === "cambio") {
    return {
      ano_mes,
      preco_nominal: produto.cotacao_hoje.valor,
      preco_real: produto.cotacao_hoje.valor,
      indice_relativo: produto.cotacao_hoje.valor,
      pct_salario_minimo: 0,  // placeholder
      ipca_indice: produto.serie_mensal[produto.serie_mensal.length - 1]?.ipca_indice || 1,
    };
  }
  return null;
}

// =====================================================================
// ABERTURA — Era × Agora com barras proporcionais + frase-resumo
// =====================================================================
function renderAnswer(produto) {
  const t = txt(state.product);

  // Selic e IPCA (taxa) não são preço: nada de R$, índice ou "poder de
  // compra" — manchete própria, bem mais simples. Generalizada por
  // TAXA_INFO para não hardcodar "Selic" quando o produto é o IPCA.
  if (produto.tipo === "taxa") {
    const info = TAXA_INFO[state.product];
    let ultimo = produto.serie_mensal[produto.serie_mensal.length - 1];
    const agoraHoje = agoraComCotacaoHoje(produto, "taxa");
    if (agoraHoje) {
      ultimo = agoraHoje;
    }
    const eraRef = eraReferencia(produto.serie_mensal);
    const mEra = fmtMesAno(eraRef.ano_mes), mFim = agoraHoje ? "hoje" : fmtMesAno(ultimo.ano_mes);

    document.getElementById("product-name").textContent = t.titulo;
    const tag = document.getElementById("unit-tag");
    tag.textContent = produto.unidade;
    tag.classList.remove("is-index");
    document.getElementById("product-measure").innerHTML = `${info.medida} · ${mEra} → ${mFim}`;
    document.getElementById("era-date").textContent = mEra;
    document.getElementById("agora-date").textContent = mFim;

    const vIni = eraRef.taxa_aa, vFim = ultimo.taxa_aa;
    const render = (v) => `${fmtNum(v, 2)}%`;
    animateNumber(document.getElementById("era-value"), vIni, render);
    animateNumber(document.getElementById("agora-value"), vFim, render);

    const max = Math.max(vIni, vFim, 1);
    document.getElementById("era-bar").style.width = `${(vIni / max * 100).toFixed(1)}%`;
    document.getElementById("agora-bar").style.width = `${(vFim / max * 100).toFixed(1)}%`;
    document.getElementById("infl-marker").hidden = true;

    // "Inflação acumulada desde a Era" (ponta a ponta) é uma leitura
    // diferente de "inflação em 12 meses" (a métrica usada como taxa_aa do
    // IPCA-produto) — mostrar as duas juntas não é redundante, é honesto
    // sobre serem medidas diferentes da mesma série de preços.
    const diffPP = vFim - vIni;
    const inflacaoPeriodo = (ultimo.ipca_indice / eraRef.ipca_indice - 1) * 100;
    document.getElementById("diff-a").textContent = `${diffPP >= 0 ? "+" : "−"}${fmtNum(Math.abs(diffPP), 2)} p.p.`;
    document.getElementById("diff-a-cap").textContent = `desde ${mEra}`;
    document.getElementById("diff-b").textContent = fmtPct(inflacaoPeriodo);
    document.getElementById("diff-b-cap").textContent = state.product === "IPCA"
      ? "foi a inflação acumulada, ponta a ponta, no mesmo período"
      : "foi a inflação (IPCA) no mesmo período";

    const subiu = diffPP >= 0 ? "subiu" : "caiu";
    const infl2 = state.product === "IPCA" ? "a inflação acumulada, ponta a ponta," : `a ${term("ipca", "inflação (IPCA)")} acumulada`;
    document.getElementById("lede").innerHTML =
      `Desde ${mEra}, a ${info.sujeito} ${subiu} <strong>${fmtNum(Math.abs(diffPP), 2)} pontos percentuais</strong> — foi de ${fmtNum(vIni, 2)}% para ${fmtNum(vFim, 2)}% ao ano. No mesmo período, ${infl2} foi de <strong>${fmtPct(inflacaoPeriodo)}</strong>.`;

    const notaTaxa = document.getElementById("index-note");
    notaTaxa.hidden = false;
    notaTaxa.innerHTML = `<strong>Por que não "poder de compra"?</strong> ${produto.nota}`;
    return;
  }

  // Ibovespa é medido em pontos: não é preço nem taxa, então tem manchete
  // própria — sem R$, sem "poder de compra", comparando com uma referência
  // de "se tivesse só acompanhado a inflação" (mesma técnica do marcador
  // usado para combustível/alimento, aplicada aos pontos).
  if (produto.tipo === "pontos") {
    let ultimo = produto.serie_mensal[produto.serie_mensal.length - 1];
    const agoraHoje = agoraComCotacaoHoje(produto, "pontos");
    if (agoraHoje) {
      ultimo = agoraHoje;
    }
    const eraRef = eraReferencia(produto.serie_mensal);
    const mEra = fmtMesAno(eraRef.ano_mes), mFim = agoraHoje ? "hoje" : fmtMesAno(ultimo.ano_mes);

    document.getElementById("product-name").textContent = t.titulo;
    const tag = document.getElementById("unit-tag");
    tag.textContent = "PONTOS · NÃO É R$";
    tag.classList.add("is-index");
    document.getElementById("product-measure").innerHTML = `Fechamento mensal do índice Ibovespa (B3) · ${mEra} → ${mFim}`;
    document.getElementById("era-date").textContent = mEra;
    document.getElementById("agora-date").textContent = mFim;
    document.getElementById("infl-marker").hidden = false;

    const vIni = eraRef.pontos, vFim = ultimo.pontos;
    const vRef = eraRef.pontos * (ultimo.ipca_indice / eraRef.ipca_indice);
    const render = (v) => `${fmtNum(v, 0)}<span class="unit-suffix">pts</span>`;
    animateNumber(document.getElementById("era-value"), vIni, render);
    animateNumber(document.getElementById("agora-value"), vFim, render);

    const max = Math.max(vIni, vFim, vRef);
    document.getElementById("era-bar").style.width = `${(vIni / max * 100).toFixed(1)}%`;
    document.getElementById("agora-bar").style.width = `${(vFim / max * 100).toFixed(1)}%`;
    const marker = document.getElementById("infl-marker");
    const posRef = vRef / max * 100;
    marker.style.left = `${posRef.toFixed(1)}%`;
    marker.classList.toggle("flip", posRef > 55);
    document.getElementById("infl-marker-label").innerHTML =
      `<b>${fmtNum(vRef, 0)} pts</b> se tivesse subido igual à ${term("inflacao", "inflação")}`;

    const pct = (vFim / vIni - 1) * 100;
    const inflacaoPeriodo = (ultimo.ipca_indice / eraRef.ipca_indice - 1) * 100;
    const diffPts = vFim - vIni;
    document.getElementById("diff-a").textContent = `${diffPts >= 0 ? "+" : "−"}${fmtNum(Math.abs(diffPts), 0)} pts`;
    document.getElementById("diff-a-cap").textContent = `desde ${mEra}`;
    document.getElementById("diff-b").textContent = fmtPct(inflacaoPeriodo);
    document.getElementById("diff-b-cap").textContent = "foi a inflação (IPCA) no mesmo período";

    const subiu = pct >= 0 ? "subiu" : "caiu";
    const leitura = leituraReal(pct - inflacaoPeriodo);
    let fraseReal;
    if (leitura === "igual") fraseReal = `praticamente acompanhando a ${term("inflacao", "inflação")} do período (${fmtPct(inflacaoPeriodo)}).`;
    else if (leitura === "acima") fraseReal = `bem acima da ${term("inflacao", "inflação")} do período (${fmtPct(inflacaoPeriodo)}).`;
    else fraseReal = `abaixo da ${term("inflacao", "inflação")} do período (${fmtPct(inflacaoPeriodo)}).`;
    document.getElementById("lede").innerHTML =
      `Desde ${mEra}, o Ibovespa ${subiu} <strong>${fmtNum(Math.abs(pct), 1)}%</strong> — foi de ${fmtNum(vIni, 0)} para ${fmtNum(vFim, 0)} pontos, ${fraseReal}`;

    const notaIbov = document.getElementById("index-note");
    notaIbov.hidden = false;
    notaIbov.innerHTML = `<strong>Por que "pontos" e não R$?</strong> ${produto.nota}`;
    return;
  }

  const isComb = temPreco(produto);
  const [primeiro, ultimoMessal] = primeiroUltimo(produto.serie_mensal);
  let ultimo = ultimoMessal;
  const agoraHoje = state.product === "DOLAR" && agoraComCotacaoHoje(produto, "cambio");
  if (agoraHoje) {
    ultimo = agoraHoje;
  }
  const eraRef = eraReferencia(produto.serie_mensal);
  const u = unidadeInfo(produto);
  const mIni = fmtMesAno(primeiro.ano_mes), mFim = agoraHoje ? "hoje" : fmtMesAno(ultimo.ano_mes), mEra = fmtMesAno(eraRef.ano_mes);

  document.getElementById("product-name").textContent = t.titulo;
  const tag = document.getElementById("unit-tag");
  tag.textContent = isComb ? u.curta : "Índice · não é R$";
  tag.classList.toggle("is-index", !isComb);
  document.getElementById("product-measure").innerHTML = isComb
    ? `Preço médio nacional · ${mEra} → ${mFim}`
    : `${term("indice", "Índice de preço")} (${mIni} = 100) · ${mEra} → ${mFim}`;
  document.getElementById("era-date").textContent = mEra;
  document.getElementById("agora-date").textContent = mFim;
  document.getElementById("infl-marker").hidden = false;

  // valores: preço em R$ (combustível/dólar) ou índice (alimento) — nunca misturar
  const vIni = isComb ? eraRef.preco_nominal : eraRef.indice_relativo;
  const vFim = isComb ? ultimo.preco_nominal : ultimo.indice_relativo;
  // referência "se tivesse seguido a inflação", a partir de "Era" (não de
  // jan/2019): preço de dez/2022 corrigido, ou o índice reescalado pela
  // inflação (IPCA) acumulada desde então.
  const vRef = isComb ? eraRef.preco_real : eraRef.indice_relativo * (ultimo.ipca_indice / eraRef.ipca_indice);
  const render = isComb ? precoHeroi : (v) => fmtNum(v, 1);
  animateNumber(document.getElementById("era-value"), vIni, render);
  animateNumber(document.getElementById("agora-value"), vFim, render);

  const max = Math.max(vIni, vFim, vRef || 0);
  document.getElementById("era-bar").style.width = `${(vIni / max * 100).toFixed(1)}%`;
  document.getElementById("agora-bar").style.width = `${(vFim / max * 100).toFixed(1)}%`;
  const marker = document.getElementById("infl-marker");
  const posRef = vRef / max * 100;
  marker.style.left = `${posRef.toFixed(1)}%`;
  marker.classList.toggle("flip", posRef > 55);
  document.getElementById("infl-marker-label").innerHTML =
    `<b>${isComb ? fmtBRL.format(vRef) : fmtNum(vRef, 1)}</b> se tivesse subido igual à ${term("inflacao", "inflação")}`;

  const pct = (vFim / vIni - 1) * 100;
  const realPct = isComb
    ? (ultimo.preco_real / eraRef.preco_real - 1) * 100
    : (ultimo.indice_relativo_real / eraRef.indice_relativo_real - 1) * 100;

  if (isComb) {
    const diff = vFim - vIni;
    document.getElementById("diff-a").textContent = fmtSignedBRL(diff);
    document.getElementById("diff-a-cap").textContent = `${diff >= 0 ? "a mais" : "a menos"} ${u.por}`;
    document.getElementById("diff-b").textContent = fmtPct(pct);
    document.getElementById("diff-b-cap").textContent = `no preço desde ${mEra}`;
  } else {
    document.getElementById("diff-a").textContent = fmtPct(pct);
    document.getElementById("diff-a-cap").textContent = `no preço desde ${mEra}`;
    document.getElementById("diff-b").textContent = fmtPct(vRef / vIni * 100 - 100);
    document.getElementById("diff-b-cap").textContent = "foi a inflação geral no mesmo período";
  }

  // Frase-resumo: responde "ficou mais caro de verdade?" em português simples.
  const subiu = pct >= 0 ? "subiu" : "caiu";
  const infl = term("inflacao", "inflação");
  const leitura = leituraReal(realPct);
  let fraseReal;
  if (leitura === "igual") fraseReal = `Mas os preços em geral subiram quase o mesmo: <span class="hl">descontada a ${infl}, ficou praticamente igual (${fmtPct(realPct)})</span>.`;
  else if (leitura === "acima") fraseReal = `Mesmo <span class="hl">descontando a ${infl}, ficou ${fmtNum(Math.abs(realPct), 1)}% mais caro</span> — subiu mais que os preços em geral.`;
  else fraseReal = pct >= 0
    ? `Mas os preços em geral subiram mais: <span class="hl">descontada a ${infl}, ficou ${fmtNum(Math.abs(realPct), 1)}% mais barato</span>.`
    : `<span class="hl">Descontada a ${infl}, ficou ${fmtNum(Math.abs(realPct), 1)}% mais barato</span>.`;
  const fraseSalario = isComb
    ? ` Hoje, ${u.um} custa <strong>${fmtNum(ultimo.pct_salario_minimo, 2)}%</strong> do ${term("salario", "salário mínimo")}.`
    : "";
  // alimentos: traduz o índice para uma situação concreta, sem apresentá-lo como preço
  const fraseIndice = isComb ? ""
    : ` Na prática: quem gastava R$ 100 com esse item em ${mEra} precisa de cerca de ${fmtBRL.format(100 * vFim / vIni)} para levar a mesma quantidade hoje.`;
  document.getElementById("lede").innerHTML =
    `Desde ${mEra}, o preço ${t.de} ${subiu} <strong>${fmtNum(Math.abs(pct), 1)}%</strong>. ${fraseReal}${fraseSalario}${fraseIndice}`;

  const nota = document.getElementById("index-note");
  nota.hidden = isComb;
  if (!isComb) nota.innerHTML = `<strong>Por que índice e não R$?</strong> ${produto.nota}`;
}

// =====================================================================
// 02 — Gráfico principal
// =====================================================================
function baseLayout() {
  const soft = cssVar("--ink-soft"), line = cssVar("--line"), ink = cssVar("--ink");
  return {
    font: { family: "Inter, sans-serif", size: 12, color: soft },
    separators: ",.",
    plot_bgcolor: "rgba(0,0,0,0)", paper_bgcolor: "rgba(0,0,0,0)",
    hovermode: "x",
    hoverlabel: { bgcolor: "#ffffff", bordercolor: line, align: "left", font: { color: ink, size: 13, family: "Inter, sans-serif" } },
    xaxis: {
      type: "date", showgrid: false, showline: true, linecolor: ink, linewidth: 1,
      ticks: "outside", ticklen: 5, tickcolor: line, tickformat: "%Y", dtick: "M12",
      tickfont: { size: 12, color: soft },
      showspikes: true, spikemode: "across", spikesnap: "cursor", spikecolor: cssVar("--ink-faint"), spikethickness: 1, spikedash: "solid",
      fixedrange: true,
    },
    yaxis: { gridcolor: cssVar("--line-soft"), zeroline: false, showline: false, ticks: "", tickfont: { size: 12, color: soft }, fixedrange: true, automargin: true },
  };
}
function periodShapes(xIni, xFim, cutoff) {
  return [
    { type: "rect", xref: "x", yref: "paper", x0: xIni, x1: cutoff, y0: 0, y1: 1, fillcolor: cssVar("--p-bolsonaro-wash"), line: { width: 0 }, layer: "below" },
    { type: "rect", xref: "x", yref: "paper", x0: cutoff, x1: xFim, y0: 0, y1: 1, fillcolor: cssVar("--p-lula-wash"), line: { width: 0 }, layer: "below" },
    { type: "line", xref: "x", yref: "paper", x0: cutoff, x1: cutoff, y0: 0, y1: 1, line: { color: cssVar("--ink"), width: 1 } },
    // faixa fina no topo: identifica o período pela cor sem tingir o gráfico
    { type: "rect", xref: "x", yref: "paper", x0: xIni, x1: cutoff, y0: 1, y1: 1.012, fillcolor: cssVar("--p-bolsonaro"), line: { width: 0 } },
    { type: "rect", xref: "x", yref: "paper", x0: cutoff, x1: xFim, y0: 1, y1: 1.012, fillcolor: cssVar("--p-lula"), line: { width: 0 } },
  ];
}
// Telas estreitas: rótulos curtos, embaixo, e sem rótulos na ponta das linhas.
const estreito = () => window.innerWidth < 640;
function periodAnnotations(xIni, cutoff) {
  const f = { size: 11, color: cssVar("--ink-soft"), family: "Inter, sans-serif" };
  const e = estreito();
  const pos = e ? { y: 0, yanchor: "bottom", yshift: 6 } : { y: 1, yanchor: "top", yshift: -6 };
  return [
    { x: xIni, xref: "x", yref: "paper", text: `<span style="color:${cssVar("--p-bolsonaro")}">●</span> <b>${e ? "BOLSONARO" : "GOVERNO BOLSONARO"}</b>`, showarrow: false, xanchor: "left", xshift: 6, font: f, ...pos },
    { x: cutoff, xref: "x", yref: "paper", text: `<span style="color:${cssVar("--p-lula")}">●</span> <b>${e ? "LULA" : "GOVERNO LULA"}</b>`, showarrow: false, xanchor: "left", xshift: 6, font: f, ...pos },
  ];
}
function endLabel(x, y, texto, lado) {
  return {
    x, y, xref: "x", yref: "y", text: `<b>${texto}</b>`, showarrow: false,
    xanchor: lado === "left" ? "left" : "right", yanchor: "bottom", yshift: 10,
    font: { size: 14, color: cssVar("--ink"), family: "Inter, sans-serif" }, bgcolor: "rgba(255,255,255,0.88)", borderpad: 2,
  };
}

function renderChart() {
  const produto = DATA.produtos[state.product];
  const serie = produto.serie_mensal;
  const x = serie.map((r) => r.ano_mes);
  const isComb = temPreco(produto);
  const isCambio = produto.tipo === "cambio";
  const u = unidadeInfo(produto);
  const t = txt(state.product);
  const [primeiro, ultimo] = primeiroUltimo(serie);
  const mIni = fmtMesAno(primeiro.ano_mes), mFim = fmtMesAno(ultimo.ano_mes);
  const infl = term("inflacao", "inflação");
  const comoEstava = isCambio ? "como estava cotado" : "como estava na bomba";

  let y, yRef = null, refNome = "", hovertext, fmtY, unidadeEixo, titulo, subtitulo, ajuda, yaxisExtra = {};
  if (produto.tipo === "taxa") {
    const info = TAXA_INFO[state.product];
    y = serie.map((r) => r.taxa_aa);
    fmtY = (v) => `${fmtNum(v, 2)}%`;
    yaxisExtra = { ticksuffix: "%", tickformat: ",.2f" };
    unidadeEixo = produto.unidade;
    titulo = `${t.titulo}, mês a mês`;
    subtitulo = info.subtitulo;
    ajuda = info.ajuda;
    hovertext = serie.map((r, i) => (isNil(y[i]) ? "" : `<b>${fmtMesAno(r.ano_mes)}</b><br>${info.curto}: <b>${fmtNum(y[i], 2)}%</b> ao ano`));
  } else if (produto.tipo === "pontos") {
    y = serie.map((r) => r.pontos);
    fmtY = (v) => `${fmtNum(v, 0)} pts`;
    yaxisExtra = { tickformat: ",.0f" };
    unidadeEixo = "pontos";
    titulo = "Ibovespa, fechamento mensal";
    subtitulo = `Índice da bolsa brasileira (B3), ${mIni}–${mFim}.`;
    ajuda = `<strong>Pontos:</strong> unidade própria do índice Ibovespa, não é dinheiro. Mostra a variação média de preço das ações mais negociadas na B3.`;
    hovertext = serie.map((r, i) => (isNil(y[i]) ? "" : `<b>${fmtMesAno(r.ano_mes)}</b><br>Ibovespa: <b>${fmtNum(y[i], 0)} pts</b>`));
  } else if (isComb) {
    const brl = { tickprefix: "R$ ", tickformat: ",.2f" };
    if (state.metric === "nominal") {
      y = serie.map((r) => r.preco_nominal); fmtY = (v) => fmtBRL.format(v); yaxisExtra = brl;
      unidadeEixo = `R$ ${u.por}`;
      titulo = `Preço médio ${t.de}, ${u.por}, mês a mês`;
      subtitulo = `Média nacional, ${mIni}–${mFim}, ${comoEstava}.`;
      ajuda = `<strong>Preço na época:</strong> o valor cobrado em cada mês, sem nenhum ajuste. Para comparar épocas de forma justa, use “Corrigido pela ${infl}”.`;
    } else if (state.metric === "real") {
      y = serie.map((r) => r.preco_real); fmtY = (v) => fmtBRL.format(v); yaxisExtra = brl;
      yRef = serie.map((r) => r.preco_nominal); refNome = "Preço na época";
      unidadeEixo = `R$ de ${mFim} ${u.por}`;
      titulo = `Preço ${t.de} em dinheiro de hoje`;
      subtitulo = `Todos os meses convertidos para reais de ${mFim}. Se a linha sobe, o produto ficou mais caro de verdade — não só por causa da inflação.`;
      ajuda = `<strong>${term("real", "Corrigido pela inflação")}:</strong> quanto o preço de cada mês valeria em dinheiro de hoje. A linha pontilhada é o preço como estava na época, para comparar.`;
    } else {
      y = serie.map((r) => r.pct_salario_minimo); fmtY = (v) => `${fmtNum(v, 2)}%`; yaxisExtra = { ticksuffix: "%", tickformat: ",.2f" };
      unidadeEixo = `% do salário mínimo (${u.um})`;
      titulo = `Quanto ${u.um} ${t.sem} pesava no salário mínimo`;
      subtitulo = "Quanto mais alta a linha, mais o produto pesa no bolso de quem ganha o mínimo.";
      ajuda = `<strong>% do ${term("salario", "salário mínimo")}:</strong> preço do produto dividido pelo salário mínimo vigente naquele mês.`;
    }
    hovertext = serie.map((r, i) => {
      if (isNil(y[i])) return "";
      const l = [`<b>${fmtMesAno(r.ano_mes)}</b>`];
      if (state.metric === "real") l.push(`<b>${fmtBRL.format(r.preco_real)}</b> ${u.por} em reais de ${mFim}`, `<span style="color:#8a8883">na época: ${fmtBRL.format(r.preco_nominal)}</span>`);
      else l.push(`<b>${fmtBRL.format(r.preco_nominal)}</b> ${u.por}`);
      if (!isNil(r.pct_salario_minimo)) l.push(`${u.um} = ${fmtNum(r.pct_salario_minimo, 2)}% do salário mínimo (${fmtBRL.format(r.salario_minimo)})`);
      if (!isNil(r.unidades_por_salario_minimo)) l.push(`1 salário mínimo comprava ${fmtNum(r.unidades_por_salario_minimo, 0)} ${u.plural}`);
      return l.join("<br>");
    });
  } else {
    fmtY = (v) => fmtNum(v, 1);
    if (state.metric === "real") {
      y = serie.map((r) => r.indice_relativo_real);
      yRef = serie.map((r) => r.indice_relativo); refNome = "Índice na época";
      unidadeEixo = `índice em valores de ${mFim}`;
      titulo = `Evolução do preço ${t.de}, descontada a inflação`;
      subtitulo = `Índice convertido para valores de ${mFim}. Se a linha cai, o item ficou mais barato de verdade; se sobe, mais caro.`;
      ajuda = `<strong>${term("real", "Índice corrigido pela inflação")}:</strong> o índice em valores de hoje. A linha pontilhada é o índice como estava na época. Não representa preço em reais.`;
    } else {
      y = serie.map((r) => r.indice_relativo);
      unidadeEixo = `índice (${mIni} = 100)`;
      titulo = `Evolução do preço ${t.de} — ${mIni} = 100`;
      subtitulo = `Índice mensal oficial (IBGE). 150 significa 50% mais caro que em ${mIni}.`;
      ajuda = `<strong>${term("indice", "Índice")}:</strong> mostra quanto o preço variou em relação a ${mIni} = 100. Não representa preço em reais.`;
    }
    hovertext = serie.map((r, i) => {
      if (isNil(y[i])) return "";
      const l = [`<b>${fmtMesAno(r.ano_mes)}</b>`, `Índice: <b>${fmtNum(y[i], 1)}</b> <span style="color:#8a8883">(não é R$)</span>`];
      if (state.metric !== "real") l.push(`${fmtPct(r.indice_relativo - 100)} em relação a ${mIni}`);
      return l.join("<br>");
    });
  }

  document.getElementById("chart-title").textContent = titulo;
  document.getElementById("chart-subtitle").textContent = subtitulo;
  document.getElementById("metric-help").innerHTML = ajuda;
  document.getElementById("chart-source").textContent =
    produto.tipo === "taxa" ? "Fonte: Banco Central (Selic), IBGE (IPCA)."
      : produto.tipo === "pontos" ? "Fonte: B3/Yahoo Finance (fechamento mensal do Ibovespa)."
      : isCambio ? "Fonte: Banco Central (câmbio, salário mínimo), IBGE (IPCA)."
      : isComb ? "Fonte: ANP (preços), Banco Central (salário mínimo), IBGE (IPCA). Set/2020 ausente na fonte."
      : "Fonte: IBGE/SIDRA — variação mensal do IPCA por item, encadeada em índice.";

  const accent = cssVar("--c-product");
  const cutoff = DATA.periodo_corte;
  const idxIni = y.findIndex((v) => !isNil(v));
  let idxFim = y.length - 1;
  while (idxFim > 0 && isNil(y[idxFim])) idxFim--;
  // pico da série, anotado quando não é o primeiro nem o último mês
  let idxPico = idxIni;
  y.forEach((v, i) => { if (!isNil(v) && v > y[idxPico]) idxPico = i; });

  const traces = [];
  if (yRef) {
    traces.push({ x, y: yRef, type: "scatter", mode: "lines", line: { color: cssVar("--ink-faint"), width: 1.75, dash: "dot" }, hoverinfo: "skip", name: refNome });
  }
  traces.push(
    { x, y, type: "scatter", mode: "lines", line: { color: accent, width: 2.75 }, fill: "tozeroy", fillcolor: hexAlpha(cssVar("--accent"), 0.1), hovertext, hoverinfo: "text", name: "" },
    { x: [x[idxIni], x[idxFim]], y: [y[idxIni], y[idxFim]], type: "scatter", mode: "markers", marker: { size: 10, color: accent, line: { color: "#ffffff", width: 2 } }, hoverinfo: "skip" },
  );

  // contexto para o painel de notícias: valor do gráfico no mês da matéria
  const capMetrica = produto.tipo === "taxa" ? produto.unidade
    : produto.tipo === "pontos" ? "fechamento do mês"
    : isComb ? (state.metric === "real" ? `em reais de ${mFim}, ${u.por}` : state.metric === "pct_sm" ? `do salário mínimo naquele mês (${u.um})` : isCambio ? "cotação média do mês" : `preço médio no mês, ${u.por}`)
    : state.metric === "real" ? "índice corrigido pela inflação (não é R$)" : "índice no mês (não é R$)";
  chartCtx = { x, y, fmtY, cap: capMetrica };
  const marcadores = newsMarkerTrace(x, y);
  if (marcadores) traces.push(marcadores);

  document.getElementById("chart-legend").innerHTML = yRef
    ? `<span class="lg-item"><span class="lg-swatch" style="border-color:${accent}"></span>${isComb ? "Em dinheiro de hoje" : "Índice corrigido"}</span>
       <span class="lg-item"><span class="lg-swatch dotted" style="border-color:${cssVar("--ink-faint")}"></span>${refNome}</span>`
    : "";

  const layout = baseLayout();
  layout.showlegend = false;
  layout.margin = { l: 8, r: 24, t: 44, b: 40 };
  layout.xaxis.range = [x[0], x[x.length - 1]];
  if (estreito()) layout.xaxis.dtick = "M24";
  Object.assign(layout.yaxis, yaxisExtra, { rangemode: "tozero" });
  layout.shapes = periodShapes(x[0], x[x.length - 1], cutoff);
  layout.annotations = [
    ...periodAnnotations(x[0], cutoff),
    { x: 0, y: 1, xref: "paper", yref: "paper", text: unidadeEixo, showarrow: false, xanchor: "left", yanchor: "bottom", yshift: 14, font: { size: 12, color: cssVar("--ink-soft") } },
    endLabel(x[idxIni], y[idxIni], fmtY(y[idxIni]), "left"),
    endLabel(x[idxFim], y[idxFim], fmtY(y[idxFim]), "right"),
  ];
  if (idxPico !== idxIni && idxPico !== idxFim) {
    layout.annotations.push({
      x: x[idxPico], y: y[idxPico], xref: "x", yref: "y", showarrow: true, arrowhead: 0, arrowwidth: 1, arrowcolor: cssVar("--ink-soft"),
      ax: 0, ay: -28, text: `pico: <b>${fmtY(y[idxPico])}</b> · ${fmtMesAno(serie[idxPico].ano_mes)}`,
      font: { size: 12, color: cssVar("--ink") }, bgcolor: "rgba(255,255,255,0.9)", borderpad: 3,
    });
  }
  Plotly.react("main-chart", traces, layout, { responsive: true, displayModeBar: false });
  bindChartClicks();
  renderNewsTrack();
}

// ---------- 02 · Média de cada ano (colunas) ----------
function renderYears(produto) {
  const isTaxa = produto.tipo === "taxa";
  const isPontos = produto.tipo === "pontos";
  const isComb = temPreco(produto);
  const u = unidadeInfo(produto);
  const t = txt(state.product);
  document.getElementById("annual-title").textContent = isTaxa ? `${t.titulo} — média de cada ano` : isPontos ? "Ibovespa médio de cada ano" : isComb ? "Preço médio de cada ano" : "Índice médio de cada ano";
  document.getElementById("annual-sub").textContent = isTaxa
    ? "Média mensal, % ao ano, em cada ano."
    : isPontos
      ? "Média mensal do fechamento, em pontos, em cada ano. Não é dinheiro."
      : isComb
      ? `Em ${u.curta}, preço na época (média dos meses de cada ano).`
      : "Índice (jan/2019 = 100), média dos meses de cada ano. Não é preço em R$.";
  const corteAno = parseInt(DATA.periodo_corte.slice(0, 4), 10);
  const valores = produto.serie_anual.map((r) => (isTaxa ? r.taxa_media : isPontos ? r.pontos_medio : isComb ? r.preco_nominal_medio : r.indice_nominal_medio));
  const max = Math.max(...valores.filter((v) => !isNil(v)));
  const fmtValor = (v) => (isTaxa ? `${fmtNum(v, 1)}%` : isPontos ? `${fmtNum(v, 0)} pts` : valorFormatado(produto, v));
  const cols = produto.serie_anual.map((r, i) => {
    const v = valores[i];
    const cls = `${r.ano < corteAno ? "bolsonaro" : "lula"} ${r.n_meses < 12 ? "partial" : ""}`;
    return `<div class="yr ${cls}" title="${r.ano}: ${fmtValor(v)}${r.n_meses < 12 ? ` (${r.n_meses} de 12 meses)` : ""}">
      <span class="yr-val tnum">${isNil(v) ? "—" : fmtNum(v, isComb ? 2 : isTaxa ? 1 : 0)}</span>
      <div class="yr-col"><div class="yr-fill" style="height:${isNil(v) ? 0 : (v / max * 100).toFixed(1)}%"></div></div>
    </div>`;
  }).join("");
  const eixo = produto.serie_anual.map((r) => `<span>${r.ano}${r.n_meses < 12 ? `<small>${r.n_meses} meses</small>` : ""}</span>`).join("");
  document.getElementById("annual-grid").innerHTML = cols;
  let axis = document.getElementById("year-axis");
  if (!axis) {
    axis = document.createElement("div");
    axis.id = "year-axis";
    axis.className = "year-axis";
    document.getElementById("annual-grid").after(axis);
  }
  axis.innerHTML = eixo;
}

// =====================================================================
// 03 — Poder de compra
// Combustível: pictograma (quantidade real, R$ existe). Alimento: índice
// (não existe preço absoluto em R$ na fonte, então não dá para fingir uma
// quantidade em kg — mostramos um índice de poder de compra, deixando
// isso explícito).
// =====================================================================
function renderPurchasingPower(produto) {
  const section = document.getElementById("purchasing-power-section");
  // Selic (taxa) e Ibovespa (pontos): "quanto o salário mínimo compra"
  // não significa nada para nenhum dos dois — a seção inteira não se aplica.
  if (produto.tipo === "taxa" || produto.tipo === "pontos") { section.style.display = "none"; return; }
  section.style.display = "";
  const isComb = temPreco(produto);
  const t = txt(state.product);
  const ultimo = produto.serie_mensal[produto.serie_mensal.length - 1];
  const eraRef = eraReferencia(produto.serie_mensal);

  if (!isComb) {
    const pcIni = eraRef.indice_poder_compra, pcFim = ultimo.indice_poder_compra;
    document.getElementById("pp-sub").innerHTML =
      `Índice de quanto um ${term("salario", "salário mínimo")} rende ${t.sem} — não é uma quantidade em kg/litros, porque não há preço absoluto em R$ para este item (ver nota na abertura).`;

    const max = Math.max(pcIni, pcFim, 0);
    const linha = (r, valor, cls) => `
      <div class="pp-row ${cls}">
        <div><div class="pp-when">${fmtMesAno(r.ano_mes)}</div><div class="pp-wage">salário mínimo: ${fmtBRL.format(r.salario_minimo)}</div></div>
        <div class="pp-index-track"><div class="pp-index-fill" style="width:${(valor / max * 100).toFixed(1)}%"></div></div>
        <div class="pp-result"><span class="pp-value tnum">${fmtNum(valor, 1)}</span><span class="pp-unitname">índice</span><span class="pp-share">base 100 = jan/2019</span></div>
      </div>`;

    const variacao = (pcFim / pcIni - 1) * 100;
    const leitura = Math.abs(variacao) < 1 ? "quantidade" : variacao > 0 ? "mais" : "menos";
    const veredito = leitura === "quantidade"
      ? `Em termos relativos, seu salário mínimo hoje rende <strong>praticamente o mesmo</strong> ${t.sem} do que em ${fmtMesAno(eraRef.ano_mes)}.`
      : `Em termos relativos, seu salário mínimo hoje rende <strong>${fmtNum(Math.abs(variacao), 1)}% ${leitura}</strong> ${t.sem} do que em ${fmtMesAno(eraRef.ano_mes)}.`;

    document.getElementById("pp-card").innerHTML =
      linha(eraRef, pcIni, "") + linha(ultimo, pcFim, "now") +
      `<div class="pp-footer"><p class="pp-verdict">${veredito}</p></div>`;
    return;
  }

  const u = unidadeInfo(produto);
  const uIni = eraRef.unidades_por_salario_minimo, uFim = ultimo.unidades_por_salario_minimo;

  document.getElementById("pp-sub").innerHTML =
    `Quantos ${u.plural} ${t.sem} dava para comprar gastando um ${term("salario", "salário mínimo")} inteiro.`;

  // Cada quadradinho vale um número redondo de unidades, para caber numa linha.
  const passo = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => Math.max(uIni, uFim) / s <= 40) || 100;
  const quadrados = (n) => {
    const cheios = Math.floor(n / passo);
    const resto = n / passo - cheios;
    return '<span class="pp-unit"></span>'.repeat(cheios) + (resto >= 0.25 ? '<span class="pp-unit partial"></span>' : "");
  };
  const linha = (r, unidades, cls) => `
    <div class="pp-row ${cls}">
      <div><div class="pp-when">${fmtMesAno(r.ano_mes)}</div><div class="pp-wage">salário mínimo: ${fmtBRL.format(r.salario_minimo)}</div></div>
      <div class="pp-units" role="img" aria-label="${fmtNum(unidades, 0)} ${u.plural}">${quadrados(unidades)}</div>
      <div class="pp-result"><span class="pp-value tnum">${fmtNum(unidades, 0)}</span><span class="pp-unitname">${u.plural}</span><span class="pp-share">${u.um} = ${fmtNum(r.pct_salario_minimo, 2)}% do salário</span></div>
    </div>`;

  const diff = Math.round(uFim) - Math.round(uIni);
  const veredito = diff === 0
    ? `Hoje um salário mínimo compra <strong>a mesma quantidade</strong> que em ${fmtMesAno(eraRef.ano_mes)}.`
    : `Hoje um salário mínimo compra <strong>${fmtNum(Math.abs(diff), 0)} ${Math.abs(diff) === 1 ? u.singular : u.plural} a ${diff > 0 ? "mais" : "menos"}</strong> do que em ${fmtMesAno(eraRef.ano_mes)}.`;

  document.getElementById("pp-card").innerHTML =
    linha(eraRef, uIni, "") + linha(ultimo, uFim, "now") +
    `<div class="pp-footer"><p class="pp-verdict">${veredito}</p><span class="pp-legend"><span class="pp-unit"></span> = ${passo} ${passo === 1 ? u.singular : u.plural}</span></div>`;
}

// =====================================================================
// 04 — Governos: minigráfico na mesma escala + barras de variação + tabela
// =====================================================================
function renderGovernos(produto) {
  const isTaxa = produto.tipo === "taxa";
  const isPontos = produto.tipo === "pontos";
  const isComb = temPreco(produto);
  const u = unidadeInfo(produto);
  const periodos = ["Bolsonaro", "Lula"];
  const resumos = periodos.map((p) => produto.resumo_periodos[p]?.[state.cohort]);
  const rL = resumos[1];
  // Formatação do valor "bruto" de cada governo — Selic é sempre "%" e
  // Ibovespa sempre "pts", nunca R$/índice (reusar valorFormatado exigiria
  // ensinar ele sobre taxas/pontos).
  const fmtGov = (v) => (isTaxa ? (isNil(v) ? "—" : `${fmtNum(v, 2)}%`) : isPontos ? (isNil(v) ? "—" : `${fmtNum(v, 0)} pts`) : valorFormatado(produto, v));

  document.getElementById("cohort-note").textContent = !rL || rL.completo === false
    ? `O governo Lula ainda não completou ${COHORT_LABEL[state.cohort]}; o recorte usa os meses disponíveis até agora.`
    : state.cohort === "governo_inteiro"
      ? "Comparando o governo inteiro de cada período, do primeiro ao último mês."
      : `Comparando os ${COHORT_LABEL[state.cohort]} de cada período.`;

  // --- minigráficos: mesma escala vertical e mesma largura por mês nos dois ---
  const valorDe = (r) => (isTaxa ? r.taxa_aa : isPontos ? r.pontos : isComb ? r.preco_nominal : r.indice_relativo);
  const janelas = resumos.map((r) => r ? produto.serie_mensal.filter((m) => m.ano_mes >= r.mes_inicio && m.ano_mes <= r.mes_fim) : []);
  const todos = janelas.flat().map(valorDe).filter((v) => !isNil(v));
  const yMin = Math.min(...todos), yMax = Math.max(...todos);
  const nMax = Math.max(...janelas.map((j) => j.length), 2);
  const W = 300, H = 100, PAD = 8;
  const sx = (i) => (i / (nMax - 1)) * W;
  const sy = (v) => PAD + (1 - (v - yMin) / ((yMax - yMin) || 1)) * (H - 2 * PAD);

  function spark(janela, periodo) {
    if (!janela.length) return "";
    const cor = cssVar(periodo === "Bolsonaro" ? "--p-bolsonaro" : "--p-lula");
    let d = "", aberto = false;
    janela.forEach((m, i) => {
      const v = valorDe(m);
      if (isNil(v)) { aberto = false; return; }
      d += `${aberto ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)} `;
      aberto = true;
    });
    const v0 = valorDe(janela[0]);
    const ultimoI = janela.length - 1;
    const v1 = ultimoValido(janela.map(valorDe));
    const dot = (x, y, fill) => `<path d="M${x.toFixed(1)},${y.toFixed(1)} l0,0" stroke="${fill}" stroke-width="9" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="${W}" y1="${sy(v0).toFixed(1)}" y2="${sy(v0).toFixed(1)}" stroke="${cssVar("--ink-faint")}" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
      <path d="${d}" fill="none" stroke="${cor}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      ${dot(sx(0), sy(v0), cor)}${dot(sx(ultimoI), sy(v1), cor)}
    </svg>`;
  }

  // Identificação dos períodos: mesma área, mesmo retrato, mesma hierarquia
  // para os dois. A cor (azul/vermelho) é só um identificador do período.
  const anos = (r, p) => `${r.mes_inicio.slice(0, 4)}–${p === "Lula" ? "atual" : r.mes_fim.slice(0, 4)}`;
  const idHtml = (p, r) => {
    const pres = DATA.presidentes[p];
    return `<header class="gov-id">
      <figure class="portrait"><img src="${pres.foto}" alt="Retrato oficial de ${pres.nome}" width="720" height="720" loading="lazy" decoding="async" /></figure>
      <div class="gov-id-text">
        <span class="gov-label"><span class="gov-mark" aria-hidden="true"></span>${p}</span>
        <span class="gov-years tnum">${r ? anos(r, p) : "—"}</span>
        <span class="gov-fullname">${pres.nome}</span>
        <span class="gov-dates">${r ? `${fmtMesAno(r.mes_inicio)} – ${fmtMesAno(r.mes_fim)}${p === "Lula" ? " · em curso" : ""}` : "dado não disponível"}</span>
      </div>
    </header>`;
  };

  document.getElementById("gov-cols").innerHTML = periodos.map((p, k) => {
    const r = resumos[k];
    const cls = p.toLowerCase();
    if (!r) return `<div class="gov ${cls}">${idHtml(p, null)}</div>`;
    const vIni = isTaxa ? r.taxa_inicio : isPontos ? r.pontos_inicio : isComb ? r.preco_nominal_inicio : r.indice_nominal_inicio;
    const vFim = isTaxa ? r.taxa_fim : isPontos ? r.pontos_fim : isComb ? r.preco_nominal_fim : r.indice_nominal_fim;
    const suf = isTaxa || isPontos || isComb ? "" : "<small>índice</small>";
    return `<div class="gov ${cls}">
      ${idHtml(p, r)}
      ${spark(janelas[k], p)}
      <div class="gov-ends">
        <div class="gov-end"><span class="when">início · ${fmtMesAno(r.mes_inicio)}</span><span class="val tnum">${fmtGov(vIni)}${suf}</span></div>
        <span class="gov-arrow" aria-hidden="true">→</span>
        <div class="gov-end"><span class="when">fim · ${fmtMesAno(r.mes_fim)}</span><span class="val tnum">${fmtGov(vFim)}${suf}</span></div>
      </div>
    </div>`;
  }).join("");

  // --- barras de variação: mesma escala para os quatro valores ---
  // Selic não tem "variação real" (isso exigiria uma conta de juro real que
  // este projeto não faz) — só a variação em pontos percentuais.
  const grupos = isTaxa
    ? [{ titulo: "Variação", ajuda: "diferença entre o fim e o início do período, em pontos percentuais", campo: "variacao_pp", fmt: (v) => (isNil(v) ? "—" : `${v >= 0 ? "+" : "−"}${fmtNum(Math.abs(v), 2)} p.p.`) }]
    : isPontos
    ? [{ titulo: "Variação", ajuda: "variação do fechamento, do início ao fim do período", campo: "variacao_pct", fmt: fmtPct }]
    : [
        { titulo: isComb ? "Na bomba" : "Variação do índice", ajuda: isComb ? "variação do preço na época, do primeiro ao último mês" : "do primeiro ao último mês do recorte", campo: "variacao_nominal_pct", fmt: fmtPct },
        { titulo: "Descontada a inflação", ajuda: `variação ${term("real", "corrigida pela inflação")} — mostra se ficou mais caro de verdade`, campo: "variacao_real_pct", fmt: fmtPct },
      ];
  const vals = grupos.flatMap((g) => resumos.map((r) => r?.[g.campo])).filter((v) => !isNil(v));
  const posMax = Math.max(0, ...vals), negMax = Math.max(0, ...vals.map((v) => -v));
  const span = (posMax + negMax) || 1;
  const zero = negMax / span * 100;
  document.getElementById("variation").innerHTML = grupos.map((g) => `
    <div class="var-group">
      <div class="var-title">${g.titulo}<span class="var-title-help">${g.ajuda}</span></div>
      <div class="var-rows">
        ${periodos.map((p, k) => {
          const v = resumos[k]?.[g.campo];
          const w = isNil(v) ? 0 : Math.abs(v) / span * 100;
          const left = isNil(v) || v >= 0 ? zero : zero - w;
          return `<div class="var-row">
            <span class="var-name"><span class="dot ${p.toLowerCase()}"></span>${p}</span>
            <div class="var-track"><div class="var-zero" style="left:${zero.toFixed(1)}%"></div><div class="var-bar ${p.toLowerCase()} ${v < 0 ? "neg" : "pos"}" style="left:${left.toFixed(1)}%;width:${w.toFixed(1)}%"></div></div>
            <span class="var-val tnum">${g.fmt(v)}</span>
          </div>`;
        }).join("")}
      </div>
    </div>`).join("");

  // --- tabela completa (camada de aprofundamento) ---
  const [rB] = resumos;
  const linhas = isTaxa
    ? [
        ["Variação", "em pontos percentuais, do início ao fim do recorte", (r) => (r ? `${r.variacao_pp >= 0 ? "+" : "−"}${fmtNum(Math.abs(r.variacao_pp), 2)} p.p.` : "—")],
        ["Taxa no início", "", (r) => fmtGov(r?.taxa_inicio)],
        ["Taxa no fim", "", (r) => fmtGov(r?.taxa_fim)],
        ["Taxa média", "média de todos os meses do recorte", (r) => fmtGov(r?.taxa_media)],
        ["Menor taxa", "mês mais baixo do recorte", (r) => fmtGov(r?.taxa_min)],
        ["Maior taxa", "mês mais alto do recorte", (r) => fmtGov(r?.taxa_max)],
      ]
    : isPontos
    ? [
        ["Variação", "do fechamento, do início ao fim do recorte", (r) => fmtPct(r?.variacao_pct)],
        ["Pontos no início", "", (r) => fmtGov(r?.pontos_inicio)],
        ["Pontos no fim", "", (r) => fmtGov(r?.pontos_fim)],
        ["Pontos, média", "média de todos os meses do recorte", (r) => fmtGov(r?.pontos_medio)],
        ["Menor fechamento", "mês mais baixo do recorte", (r) => fmtGov(r?.pontos_min)],
        ["Maior fechamento", "mês mais alto do recorte", (r) => fmtGov(r?.pontos_max)],
      ]
    : isComb
    ? [
        ["Variação do preço", "preço na época, do primeiro ao último mês", (r) => fmtPct(r?.variacao_nominal_pct)],
        ["Descontada a inflação", "variação real, corrigida pelo IPCA", (r) => fmtPct(r?.variacao_real_pct)],
        ["Preço no início", u.por, (r) => valorFormatado(produto, r?.preco_nominal_inicio)],
        ["Preço no fim", u.por, (r) => valorFormatado(produto, r?.preco_nominal_fim)],
        ["Preço médio", "média de todos os meses do recorte", (r) => valorFormatado(produto, r?.preco_nominal_medio)],
        ["Menor preço", "mês mais barato do recorte", (r) => valorFormatado(produto, r?.preco_nominal_min)],
        ["Maior preço", "mês mais caro do recorte", (r) => valorFormatado(produto, r?.preco_nominal_max)],
        ["Peso no salário mínimo", `quanto ${u.um} representava do salário, início → fim`, (r) => (r ? `${fmtNum(r.pct_salario_minimo_inicio, 2)}% → ${fmtNum(r.pct_salario_minimo_fim, 2)}%` : "—")],
      ]
    : [
        ["Variação do índice", "do primeiro ao último mês do recorte", (r) => fmtPct(r?.variacao_nominal_pct)],
        ["Descontada a inflação", "variação real, corrigida pelo IPCA", (r) => fmtPct(r?.variacao_real_pct)],
        ["Índice no início", "jan/2019 = 100 · não é R$", (r) => valorFormatado(produto, r?.indice_nominal_inicio)],
        ["Índice no fim", "jan/2019 = 100 · não é R$", (r) => valorFormatado(produto, r?.indice_nominal_fim)],
        ["Índice médio", "média de todos os meses do recorte", (r) => valorFormatado(produto, r?.indice_nominal_medio)],
      ];
  document.getElementById("comparison-table").innerHTML = `
    <thead><tr><th></th><th>Bolsonaro</th><th>Lula</th></tr></thead>
    <tbody>${linhas.map(([label, help, fn]) => `<tr><td>${label}<span class="row-help">${help}</span></td><td>${fn(rB)}</td><td>${fn(rL)}</td></tr>`).join("")}</tbody>`;

  // CC BY 2.0 pede que alterações sejam indicadas (ver scripts/process_portraits.py)
  document.getElementById("photo-credit").textContent =
    `Retratos: ${DATA.presidentes.Bolsonaro.fonte_foto} · ${DATA.presidentes.Lula.fonte_foto}. Imagens recortadas e convertidas para preto e branco, com o mesmo tratamento para as duas.`;
}

// =====================================================================
// 05 — Contexto econômico
// =====================================================================
function renderContext(produto) {
  const isTaxa = produto.tipo === "taxa";
  const isComb = temPreco(produto);
  const serie = produto.serie_mensal;
  const x = serie.map((r) => r.ano_mes);
  const [primeiro, ultimo] = primeiroUltimo(serie);
  const t = txt(state.product);
  const u = unidadeInfo(produto);
  const eraRef = eraReferencia(serie);
  const eraIdx = serie.findIndex((r) => r.ano_mes === eraRef.ano_mes);
  const desde = fmtMesAno(eraRef.ano_mes);

  // Selic já é uma taxa (% ao ano): não faz sentido reescalar pra "100 no
  // início" como as outras séries. Comparamos direto com a inflação
  // acumulada em 12 meses — mesma escala, a comparação padrão de "juro
  // nominal vs. inflação" que qualquer noticiário econômico usa.
  if (isTaxa) {
    const info = TAXA_INFO[state.product];
    const comp = info.comparador;
    const series = [
      { key: "produto", nome: t.titulo, y: serie.map((r) => r.taxa_aa), cor: cssVar("--c-product"), dash: "solid", largura: 2.75, desc: `${info.curto}, % ao ano` },
      { key: "comparador", nome: comp.nome, termo: comp.termo, y: serie.map((r) => r[comp.campo]), cor: cssVar("--c-ipca"), dash: "dot", largura: 2, desc: comp.desc },
    ];
    const vProd = ultimoValido(series[0].y);
    const vComp = ultimoValido(series[1].y);
    const diffPP = isNil(vProd) || isNil(vComp) ? null : vProd - vComp;
    const compLabel = comp.termo ? term(comp.termo, comp.nome) : `a ${comp.nome}`;
    document.getElementById("context-answer").innerHTML = isNil(diffPP)
      ? `Em ${fmtMesAno(ultimo.ano_mes)}, a ${info.sujeito} estava em <strong>${fmtNum(vProd, 2)}%</strong> ao ano.`
      : `Em ${fmtMesAno(ultimo.ano_mes)}, a ${info.sujeito} estava em <strong>${fmtNum(vProd, 2)}%</strong> ao ano e ${compLabel} estava em <strong>${fmtNum(vComp, 2)}%</strong> — uma diferença de <strong>${diffPP >= 0 ? "+" : "−"}${fmtNum(Math.abs(diffPP), 2)} p.p.</strong> entre Selic e IPCA em 12 meses (uma aproximação do juro real).`;

    const swClass = { solid: "", dot: "dotted", dash: "dashed", dashdot: "dashed" };
    const strip = document.getElementById("stat-strip");
    strip.classList.add("two");
    strip.innerHTML = series.map((s) => {
      const v = ultimoValido(s.y);
      return `<div class="stat-item ${s.key === "produto" ? "is-product" : ""}">
        <div class="stat-label"><span class="ln ${swClass[s.dash]}" style="border-color:${s.cor}"></span>${s.termo ? term(s.termo, s.nome) : s.nome}</div>
        <div class="stat-value tnum">${isNil(v) ? "—" : `${fmtNum(v, 2)}%`}</div>
        <div class="stat-desc">${s.desc}, em ${fmtMesAno(ultimo.ano_mes)}</div>
      </div>`;
    }).join("");

    document.getElementById("context-chart-title").textContent = `${info.curto} vs. ${comp.nome}, lado a lado`;
    document.getElementById("context-chart-sub").textContent =
      "As duas na mesma escala (% ao ano) — dá para ver quando uma supera a outra.";
    document.getElementById("context-legend").innerHTML = series.map((s) =>
      `<span class="lg-item"><span class="lg-swatch ${swClass[s.dash]}" style="border-color:${s.cor}"></span>${s.nome}</span>`).join("");
    document.getElementById("context-intro").textContent = state.product === "SELIC"
      ? "Isto é contexto, não prova de causa: a Selic é definida pelo Copom considerando várias expectativas, não só a inflação passada."
      : "Isto é contexto, não prova de causa: a inflação reflete oferta e demanda, câmbio, safra e outros fatores — a Selic definida pelo Copom é só uma peça.";

    const traces = series.map((s) => ({
      x, y: s.y, name: s.nome, type: "scatter", mode: "lines",
      line: { color: s.cor, width: s.largura, dash: s.dash },
      hovertemplate: `${s.nome}: <b>%{y:,.2f}%</b><extra></extra>`,
    }));
    const layout = baseLayout();
    layout.hovermode = "x unified";
    layout.showlegend = false;
    layout.margin = { l: 8, r: estreito() ? 12 : 130, t: 40, b: 40 };
    if (estreito()) layout.xaxis.dtick = "M24";
    layout.xaxis.hoverformat = "%m/%Y";
    layout.xaxis.range = [x[0], x[x.length - 1]];
    layout.yaxis.ticksuffix = "%";
    layout.shapes = periodShapes(x[0], x[x.length - 1], DATA.periodo_corte);
    const fimProd = ultimoValido(series[0].y), fimComp = ultimoValido(series[1].y);
    layout.annotations = [
      ...periodAnnotations(x[0], DATA.periodo_corte),
      { x: 0, y: 1, xref: "paper", yref: "paper", text: "% ao ano", showarrow: false, xanchor: "left", yanchor: "bottom", yshift: 14, font: { size: 12, color: cssVar("--ink-soft") } },
      ...(estreito() ? [] : [
        !isNil(fimProd) && { x: x[x.length - 1], y: fimProd, xref: "x", yref: "y", xanchor: "left", xshift: 8, showarrow: false, text: `<b>${info.curto}</b> ${fmtNum(fimProd, 1)}%`, font: { size: 12, color: cssVar("--ink"), family: "Inter, sans-serif" } },
        !isNil(fimComp) && { x: x[x.length - 1], y: fimComp, xref: "x", yref: "y", xanchor: "left", xshift: 8, showarrow: false, text: `<b>${comp.nome}</b> ${fmtNum(fimComp, 1)}%`, font: { size: 12, color: cssVar("--ink"), family: "Inter, sans-serif" } },
      ].filter(Boolean)),
    ];
    Plotly.react("context-chart", traces, layout, { responsive: true, displayModeBar: false });
    return;
  }

  // Rebaseia cada série para "Era" = 100 (razão simples sobre valores já
  // prontos): assim a régua do gráfico bate com a manchete e o poder de
  // compra, todos comparando a partir do fim do governo Bolsonaro — em vez
  // de misturar os dois governos numa variação só desde jan/2019.
  const rebase = (y) => {
    const base = y[eraIdx];
    return isNil(base) || base === 0 ? y.map(() => null) : y.map((v) => (isNil(v) ? null : (v / base) * 100));
  };

  const isPontos = produto.tipo === "pontos";
  const series = [
    { key: "produto", nome: t.titulo, y: rebase(serie.map((r) => (isPontos ? r.pontos_indice100 : isComb ? r.preco_indice100 : r.indice_relativo))), cor: cssVar("--c-product"), dash: "solid", largura: 2.75,
      desc: isPontos ? "pontos do Ibovespa (fechamento mensal)" : isComb ? `preço ${u.por}` : "índice de preço" },
  ];
  // Dólar é o próprio câmbio: não faz sentido comparar câmbio contra si
  // mesmo. Em vez de Brent/câmbio, mostramos Selic como contexto (custo do
  // dinheiro em reais é parte do que move o câmbio).
  if (produto.tipo === "combustivel") {
    series.push(
      { key: "brent", nome: "Brent", termo: "brent", y: rebase(serie.map((r) => r.brent_brl_indice100)), cor: cssVar("--c-brent"), dash: "dash", largura: 2, desc: "petróleo internacional, em reais" },
      { key: "cambio", nome: "Dólar", termo: "cambio", y: rebase(serie.map((r) => r.cambio_indice100)), cor: cssVar("--c-cambio"), dash: "dashdot", largura: 2, desc: "quantos reais valia 1 dólar" });
  } else if (produto.tipo === "cambio") {
    series.push({ key: "selic", nome: "Selic", y: rebase(serie.map((r) => r.selic_indice100)), cor: cssVar("--c-brent"), dash: "dash", largura: 2, desc: "taxa básica de juros" });
  } else if (isPontos) {
    series.push(
      { key: "cambio", nome: "Dólar", termo: "cambio", y: rebase(serie.map((r) => r.cambio_indice100)), cor: cssVar("--c-cambio"), dash: "dashdot", largura: 2, desc: "quantos reais valia 1 dólar" },
      { key: "selic", nome: "Selic", y: rebase(serie.map((r) => r.selic_indice100)), cor: cssVar("--c-brent"), dash: "dash", largura: 2, desc: "taxa básica de juros" });
  }
  series.push({ key: "ipca", nome: "IPCA", termo: "ipca", y: rebase(serie.map((r) => r.ipca_indice100)), cor: cssVar("--c-ipca"), dash: "dot", largura: 2, desc: "inflação: média de todos os preços" });

  const varDe = (s) => { const v = ultimoValido(s.y); return isNil(v) ? null : v - 100; };
  const vProd = varDe(series[0]);
  const vIpca = varDe(series.find((s) => s.key === "ipca"));

  // Resposta direta: subiu mais ou menos que a inflação? (mesma régua da abertura)
  const realPct = ((100 + vProd) / (100 + vIpca) - 1) * 100;
  const leitura = leituraReal(realPct);
  const veredito = leitura === "igual" ? "ou seja, acompanhou a inflação"
    : leitura === "acima" ? "ou seja, subiu mais que os preços em geral"
    : vProd >= 0 ? "ou seja, subiu menos que os preços em geral" : "ou seja, caiu enquanto os preços em geral subiram";
  const prodLabel = isPontos ? "o Ibovespa" : `o preço ${t.de}`;
  let resposta = `Desde ${desde}, ${prodLabel} variou <strong>${fmtPct(vProd)}</strong> e a ${term("ipca", "inflação geral (IPCA)")}, <strong>${fmtPct(vIpca)}</strong> — ${veredito}.`;
  if (produto.tipo === "combustivel") {
    const vBrent = varDe(series.find((s) => s.key === "brent"));
    const vDolar = varDe(series.find((s) => s.key === "cambio"));
    resposta += ` No mesmo período, o petróleo (${term("brent", "Brent")}, em reais) variou <strong>${fmtPct(vBrent)}</strong> e o ${term("cambio", "dólar")}, <strong>${fmtPct(vDolar)}</strong>.`;
  } else if (produto.tipo === "cambio") {
    const vSelic = varDe(series.find((s) => s.key === "selic"));
    resposta += ` No mesmo período, a taxa Selic variou <strong>${fmtPct(vSelic)}</strong>.`;
  } else if (isPontos) {
    const vDolar = varDe(series.find((s) => s.key === "cambio"));
    const vSelic = varDe(series.find((s) => s.key === "selic"));
    resposta += ` No mesmo período, o ${term("cambio", "dólar")} variou <strong>${fmtPct(vDolar)}</strong> e a taxa Selic, <strong>${fmtPct(vSelic)}</strong>.`;
  }
  document.getElementById("context-answer").innerHTML = resposta;

  const swClass = { solid: "", dot: "dotted", dash: "dashed", dashdot: "dashed" };
  const strip = document.getElementById("stat-strip");
  strip.classList.toggle("two", series.length <= 2);
  strip.innerHTML = series.map((s) => `
    <div class="stat-item ${s.key === "produto" ? "is-product" : ""}">
      <div class="stat-label"><span class="ln ${swClass[s.dash]}" style="border-color:${s.cor}"></span>${s.termo ? term(s.termo, s.nome) : s.nome}</div>
      <div class="stat-value tnum">${fmtPct(varDe(s))}</div>
      <div class="stat-desc">${s.desc}, desde ${desde}</div>
    </div>`).join("");

  document.getElementById("context-chart-title").textContent = `Tudo começa em 100 em ${desde}`;
  document.getElementById("context-chart-sub").textContent =
    "Se uma linha chega a 150, aquilo subiu 50% desde o início. Assim dá para comparar coisas de unidades diferentes na mesma régua.";
  document.getElementById("context-legend").innerHTML = series.map((s) =>
    `<span class="lg-item"><span class="lg-swatch ${swClass[s.dash]}" style="border-color:${s.cor}"></span>${s.nome}</span>`).join("");
  document.getElementById("context-intro").textContent =
    produto.tipo === "combustivel" ? "Isto é contexto, não prova de causa: a política de preços da Petrobras, os impostos e a oferta e demanda internas também pesam no preço final."
      : produto.tipo === "cambio" ? "Isto é contexto, não prova de causa: o câmbio reage a juros, fluxo de capital estrangeiro, resultado comercial e expectativas — a Selic é só uma peça."
      : isPontos ? "Isto é contexto, não prova de causa: o Ibovespa reflete expectativas sobre lucros das empresas, juros, câmbio e cenário internacional — não é resultado automático desses fatores."
      : "Isto é contexto, não prova de causa: safra, clima, exportações e demanda interna também pesam no preço de cada alimento.";

  const traces = series.map((s) => ({
    x, y: s.y, name: s.nome, type: "scatter", mode: "lines",
    line: { color: s.cor, width: s.largura, dash: s.dash },
    hovertemplate: `${s.nome}: <b>%{y:,.1f}</b><extra></extra>`,
  }));

  // Rótulos diretos no fim de cada linha, afastados para não se sobreporem.
  const todos = series.flatMap((s) => s.y.filter((v) => !isNil(v)));
  const yMin = Math.min(...todos, 100), yMax = Math.max(...todos);
  const gap = (yMax - yMin) * 0.075;
  const rotulos = series.map((s) => ({ s, y: ultimoValido(s.y) })).filter((r) => !isNil(r.y)).sort((a, b) => a.y - b.y);
  for (let i = 1; i < rotulos.length; i++) if (rotulos[i].y - rotulos[i - 1].y < gap) rotulos[i].y = rotulos[i - 1].y + gap;

  const layout = baseLayout();
  layout.hovermode = "x unified";
  layout.showlegend = false;
  layout.margin = { l: 8, r: estreito() ? 12 : 150, t: 40, b: 40 };
  if (estreito()) layout.xaxis.dtick = "M24";
  layout.xaxis.hoverformat = "%m/%Y";
  layout.xaxis.range = [x[0], x[x.length - 1]];
  layout.shapes = [
    ...periodShapes(x[0], x[x.length - 1], DATA.periodo_corte),
    { type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: 100, y1: 100, line: { color: cssVar("--ink-faint"), width: 1 } },
  ];
  layout.annotations = [
    ...periodAnnotations(x[0], DATA.periodo_corte),
    { x: 0, y: 1, xref: "paper", yref: "paper", text: `índice (${desde} = 100)`, showarrow: false, xanchor: "left", yanchor: "bottom", yshift: 14, font: { size: 12, color: cssVar("--ink-soft") } },
    ...(estreito() ? [] : rotulos).map((r) => ({
      x: x[x.length - 1], y: r.y, xref: "x", yref: "y", xanchor: "left", xshift: 8, showarrow: false,
      text: `<b>${r.s.nome.length > 16 ? r.s.nome.split(" ")[0] : r.s.nome}</b> ${fmtPct(ultimoValido(r.s.y) - 100, 0)}`,
      font: { size: 12, color: cssVar("--ink"), family: "Inter, sans-serif" },
    })),
  ];
  Plotly.react("context-chart", traces, layout, { responsive: true, displayModeBar: false });
}

// =====================================================================
// "Como estava o Brasil?" — fotografia cross-indicador dos meses Era/Agora
// do produto selecionado. Só lê DATA.fotografia_mensal (já pronto em
// Python, a partir dos outros produtos) — nenhuma conta nova aqui.
// =====================================================================
const SNAPSHOT_CAMPOS = [
  { chave: "dolar", label: "Dólar", fmt: (v) => fmtBRL.format(v) },
  { chave: "ibovespa", label: "Ibovespa", fmt: (v) => `${fmtNum(v, 0)} pts` },
  { chave: "selic", label: "Selic", fmt: (v) => `${fmtNum(v, 2)}% a.a.` },
  { chave: "ipca", label: "Inflação (12m)", fmt: (v) => `${fmtNum(v, 2)}%` },
  { chave: "salario_minimo", label: "Salário mínimo", fmt: (v) => fmtBRL.format(v) },
  { chave: "gasolina", label: "Gasolina", fmt: (v) => `${fmtBRL.format(v)}/L` },
];

function renderSnapshot(produto) {
  const grid = document.getElementById("snapshot-grid");
  const eraRef = eraReferencia(produto.serie_mensal);
  const ultimo = produto.serie_mensal[produto.serie_mensal.length - 1];
  const momentos = [
    { label: "Era", sub: fmtMesAno(eraRef.ano_mes), dados: DATA.fotografia_mensal[eraRef.ano_mes] },
    { label: "Agora", sub: fmtMesAno(ultimo.ano_mes), dados: DATA.fotografia_mensal[ultimo.ano_mes] },
  ];
  grid.innerHTML = momentos.map((m) => `
    <div class="snap-card">
      <div class="snap-head"><span class="snap-kicker">${m.label}</span><span class="snap-when">${m.sub}</span></div>
      <div class="snap-rows">
        ${SNAPSHOT_CAMPOS.map((c) => {
          const v = m.dados ? m.dados[c.chave] : null;
          return `<div class="snap-row"><span class="snap-label">${c.label}</span><span class="snap-value tnum">${isNil(v) ? "—" : c.fmt(v)}</span></div>`;
        }).join("")}
      </div>
    </div>`).join("");
}

init();
