// CUSTAVA QUANTO? — toda a lógica de preço/deflação/índice já foi calculada
// em Python (scripts/build_dashboard_data.py). Este arquivo só lê
// dashboard_data.json e renderiza — nenhum cálculo econômico acontece aqui.

const DATA_URL = "../data/processed/dashboard_data.json";

const PRODUCT_ORDER = [
  "GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP",
  "Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído",
];
const PRODUCT_EMOJI = {
  "GASOLINA": "⛽", "ETANOL": "🌱", "DIESEL": "🚛", "DIESEL S10": "🚚", "GLP": "🔥",
  "Arroz": "🍚", "Feijão carioca": "🫘", "Carne bovina (patinho)": "🥩",
  "Leite longa vida": "🥛", "Óleo de soja": "🛢️", "Café moído": "☕",
};
const PRODUCT_CHIP_LABEL = {
  "GASOLINA": "Gasolina", "ETANOL": "Etanol", "DIESEL": "Diesel", "DIESEL S10": "Diesel S10", "GLP": "GLP",
  "Arroz": "Arroz", "Feijão carioca": "Feijão", "Carne bovina (patinho)": "Carne",
  "Leite longa vida": "Leite", "Óleo de soja": "Óleo", "Café moído": "Café",
};
const COHORT_LABEL = {
  governo_inteiro: "governo inteiro",
  primeiros_12m: "primeiros 12 meses",
  primeiros_24m: "primeiros 24 meses",
  primeiros_36m: "primeiros 36 meses",
};

let DATA = null;
const state = { product: "GASOLINA", metric: "nominal", cohort: "governo_inteiro" };

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v, digits = 1) => (v === null || v === undefined || Number.isNaN(v)) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
const fmtNum = (v, digits = 1) => (v === null || v === undefined || Number.isNaN(v)) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtMesAno = (isoDate) => {
  const [y, m] = isoDate.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[parseInt(m, 10) - 1]}/${y}`;
};

function valorFormatado(produto, valor) {
  if (valor === null || valor === undefined) return "dado não disponível";
  return produto.tipo === "combustivel" ? fmtBRL.format(valor) : fmtNum(valor, 1);
}

async function init() {
  const resp = await fetch(DATA_URL);
  DATA = await resp.json();
  renderSelector();
  bindToggles();
  selectProduct(state.product);
}

function renderSelector() {
  const el = document.getElementById("product-selector");
  el.innerHTML = "";
  PRODUCT_ORDER.filter((p) => DATA.produtos[p]).forEach((codigo) => {
    const btn = document.createElement("button");
    btn.className = "product-chip" + (codigo === state.product ? " active" : "");
    btn.dataset.produto = codigo;
    btn.innerHTML = `<span class="emoji">${PRODUCT_EMOJI[codigo] || "📦"}</span><span>${PRODUCT_CHIP_LABEL[codigo] || codigo}</span>`;
    btn.addEventListener("click", () => selectProduct(codigo));
    el.appendChild(btn);
  });
}

function bindToggles() {
  document.getElementById("metric-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".toggle-btn");
    if (!btn || btn.disabled) return;
    state.metric = btn.dataset.metric;
    updateToggleActive("metric-toggle", btn);
    renderChart();
  });
  document.getElementById("cohort-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest(".toggle-btn");
    if (!btn) return;
    state.cohort = btn.dataset.cohort;
    updateToggleActive("cohort-toggle", btn);
    renderComparisonTable();
  });
}

function updateToggleActive(groupId, activeBtn) {
  document.querySelectorAll(`#${groupId} .toggle-btn`).forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

function selectProduct(codigo) {
  state.product = codigo;
  state.metric = "nominal";
  document.querySelectorAll(".product-chip").forEach((c) => c.classList.toggle("active", c.dataset.produto === codigo));
  document.querySelectorAll("#metric-toggle .toggle-btn").forEach((b) => b.classList.toggle("active", b.dataset.metric === "nominal"));

  const produto = DATA.produtos[codigo];
  const pctBtn = document.querySelector('#metric-toggle [data-metric="pct_sm"]');
  pctBtn.disabled = produto.tipo !== "combustivel";
  pctBtn.title = produto.tipo === "combustivel" ? "" : "Não aplicável: este item é um índice, não tem preço em R$.";

  renderHero(produto);
  renderChart();
  renderPurchasingPower(produto);
  renderComparisonTable();
  renderContext(produto);
  renderAnnual(produto);
}

// ---------- Hero: presidentes + Era/Agora ----------
function renderHero(produto) {
  const wrap = document.getElementById("president-cards");
  wrap.innerHTML = "";
  const isComb = produto.tipo === "combustivel";
  ["Bolsonaro", "Lula"].forEach((periodo) => {
    const pres = DATA.presidentes[periodo];
    const resumo = produto.resumo_periodos[periodo]?.governo_inteiro;
    const card = document.createElement("div");
    card.className = `president-card ${periodo.toLowerCase()}`;
    let corpo;
    if (!resumo) {
      corpo = "dado não disponível";
    } else if (isComb) {
      corpo = `${fmtMesAno(resumo.mes_inicio)}: <b>${valorFormatado(produto, resumo.preco_nominal_inicio)}</b><br/>${fmtMesAno(resumo.mes_fim)}: <b>${valorFormatado(produto, resumo.preco_nominal_fim)}</b>`;
    } else {
      corpo = `${fmtMesAno(resumo.mes_inicio)} a ${fmtMesAno(resumo.mes_fim)}<br/>Variação: <b>${fmtPct(resumo.variacao_nominal_pct)}</b> (índice, não R$)`;
    }
    card.innerHTML = `
      <img src="${pres.foto}" alt="${pres.nome}" loading="lazy" />
      <div>
        <div class="p-name">${pres.nome}</div>
        <div class="p-period">${pres.periodo_label}</div>
        <div class="p-prices">${corpo}</div>
      </div>`;
    wrap.appendChild(card);
  });
  const credit = document.createElement("div");
  credit.className = "p-credit";
  credit.innerHTML = `${DATA.presidentes.Bolsonaro.fonte_foto} · ${DATA.presidentes.Lula.fonte_foto}`;
  wrap.appendChild(credit);

  const eraCard = document.getElementById("era-card");
  const notaEl = document.getElementById("nota-alimento");

  if (!isComb) {
    // Índice de cesta básica: o card "Era/Agora" foi desenhado para preço em
    // R$ e confunde as pessoas com um alimento (parece preço, não é). Em vez
    // disso, mostramos só a variação % dentro da própria nota explicativa.
    eraCard.hidden = true;
    const serie = produto.serie_mensal;
    const variacaoTotal = (serie[serie.length - 1].indice_relativo / serie[0].indice_relativo - 1) * 100;
    notaEl.hidden = false;
    notaEl.innerHTML = `${produto.nota}<br/><br/><strong>Variação do índice de ${fmtMesAno(serie[0].ano_mes)} a ${fmtMesAno(serie[serie.length - 1].ano_mes)}: ${fmtPct(variacaoTotal)}</strong>`;
    return;
  }

  eraCard.hidden = false;
  notaEl.hidden = true;

  // Era / Agora: primeiro mês da série vs. mês mais recente disponível.
  const serie = produto.serie_mensal;
  const primeiro = serie[0];
  const ultimo = serie[serie.length - 1];
  const valorInicio = primeiro.preco_nominal;
  const valorFim = ultimo.preco_nominal;

  document.getElementById("era-value").textContent = valorFormatado(produto, valorInicio);
  document.getElementById("era-date").textContent = fmtMesAno(primeiro.ano_mes);
  document.getElementById("agora-value").textContent = valorFormatado(produto, valorFim);
  document.getElementById("agora-date").textContent = fmtMesAno(ultimo.ano_mes);

  const diffEl = document.getElementById("era-diff");
  const pct = (valorFim / valorInicio - 1) * 100;
  const up = pct >= 0;
  const diffRs = valorFim - valorInicio;
  diffEl.querySelector(".diff-rs").textContent = `${diffRs >= 0 ? "+" : ""}${fmtBRL.format(diffRs)}`;
  diffEl.querySelector(".diff-pct").textContent = fmtPct(pct);
  diffEl.querySelector(".diff-rs").className = `diff-rs ${up ? "diff-up" : "diff-down"}`;
  diffEl.querySelector(".diff-pct").className = `diff-pct ${up ? "diff-up" : "diff-down"}`;
}

// ---------- Gráfico principal ----------
function renderChart() {
  const produto = DATA.produtos[state.product];
  const serie = produto.serie_mensal;
  const x = serie.map((r) => r.ano_mes);

  let y, hovertext, yTitle;
  if (produto.tipo === "combustivel") {
    if (state.metric === "nominal") { y = serie.map((r) => r.preco_nominal); yTitle = produto.unidade; }
    else if (state.metric === "real") { y = serie.map((r) => r.preco_real); yTitle = `${produto.unidade} (real)`; }
    else { y = serie.map((r) => r.pct_salario_minimo); yTitle = "% do salário mínimo"; }

    hovertext = serie.map((r) => {
      const linhas = [`<b>${fmtMesAno(r.ano_mes)}</b>`, `${produto.nome}: <b>${r.preco_nominal !== null ? fmtBRL.format(r.preco_nominal) : "—"}</b>`];
      if (r.salario_minimo !== null) linhas.push(`Salário mínimo: ${fmtBRL.format(r.salario_minimo)}`);
      if (r.pct_salario_minimo !== null) linhas.push(`Preço = ${fmtNum(r.pct_salario_minimo, 2)}% do salário mínimo`);
      if (r.unidades_por_salario_minimo !== null) linhas.push(`Com 1 salário mínimo: ${fmtNum(r.unidades_por_salario_minimo, 1)} unidades`);
      return linhas.join("<br>");
    });
  } else {
    if (state.metric === "real") { y = serie.map((r) => r.indice_relativo_real); yTitle = "Índice real (base 100 = jan/2019)"; }
    else { y = serie.map((r) => r.indice_relativo); yTitle = "Índice (base 100 = jan/2019)"; }

    hovertext = serie.map((r) => [
      `<b>${fmtMesAno(r.ano_mes)}</b>`,
      `${produto.nome}: <b>${fmtNum(r.indice_relativo, 1)}</b> (índice, não R$)`,
    ].join("<br>"));
  }

  const cutoff = DATA.periodo_corte;
  const trace = {
    x, y, type: "scatter", mode: "lines", line: { color: "#0f6b4c", width: 2.5 },
    hovertext, hoverinfo: "text",
  };

  const layout = {
    margin: { l: 56, r: 20, t: 20, b: 40 },
    font: { family: "Inter, sans-serif", size: 12, color: "#55575f" },
    xaxis: { showgrid: false, tickfont: { size: 11 } },
    yaxis: { title: yTitle, gridcolor: "#e5e5e8", zeroline: false },
    shapes: [{ type: "line", x0: cutoff, x1: cutoff, y0: 0, y1: 1, yref: "paper", line: { color: "#8a8c94", width: 1.5, dash: "dash" } }],
    annotations: [
      { x: cutoff, y: 1.05, yref: "paper", text: "◄ BOLSONARO", showarrow: false, xanchor: "right", font: { size: 11, color: "#4a5568" } },
      { x: cutoff, y: 1.05, yref: "paper", text: "LULA ►", showarrow: false, xanchor: "left", font: { size: 11, color: "#0f6b4c" } },
    ],
    plot_bgcolor: "rgba(0,0,0,0)", paper_bgcolor: "rgba(0,0,0,0)",
    hoverlabel: { bgcolor: "#17181c", font: { color: "#fff", size: 12 } },
  };

  Plotly.react("main-chart", [trace], layout, { responsive: true, displayModeBar: false });

  document.getElementById("chart-subtitle").textContent =
    produto.tipo === "combustivel"
      ? `Preço médio nacional mensal, jan/2019–${fmtMesAno(serie[serie.length - 1].ano_mes)}.`
      : `Índice relativo (IBGE/IPCA por item), não é preço em R$. Ver nota acima.`;
}

// ---------- Poder de compra ----------
function renderPurchasingPower(produto) {
  const section = document.getElementById("purchasing-power-section");
  if (produto.tipo !== "combustivel") { section.style.display = "none"; return; }
  section.style.display = "";
  const serie = produto.serie_mensal;
  const primeiro = serie[0], ultimo = serie[serie.length - 1];
  const card = document.getElementById("pp-card");
  card.innerHTML = `
    <div class="pp-col">
      <div class="pp-label">1 SALÁRIO MÍNIMO EM ${fmtMesAno(primeiro.ano_mes).toUpperCase()}</div>
      <div class="pp-value">${fmtNum(primeiro.unidades_por_salario_minimo, 0)}</div>
      <div class="pp-sub">unidades de ${produto.nome.toLowerCase()}</div>
    </div>
    <div class="pp-arrow">→</div>
    <div class="pp-col">
      <div class="pp-label">1 SALÁRIO MÍNIMO EM ${fmtMesAno(ultimo.ano_mes).toUpperCase()}</div>
      <div class="pp-value">${fmtNum(ultimo.unidades_por_salario_minimo, 0)}</div>
      <div class="pp-sub">unidades de ${produto.nome.toLowerCase()}</div>
    </div>`;
}

// ---------- Tabela comparativa ----------
function renderComparisonTable() {
  const produto = DATA.produtos[state.product];
  const rB = produto.resumo_periodos.Bolsonaro[state.cohort];
  const rL = produto.resumo_periodos.Lula[state.cohort];

  document.getElementById("cohort-note").textContent = !rL || rL.completo === false
    ? `O governo Lula ainda não completou ${COHORT_LABEL[state.cohort]} neste momento; o recorte usa os meses disponíveis até agora.`
    : `Comparando os ${COHORT_LABEL[state.cohort]} de cada período.`;

  const isComb = produto.tipo === "combustivel";
  const linhas = isComb
    ? [
        ["Preço inicial", (r) => valorFormatado(produto, r?.preco_nominal_inicio)],
        ["Preço final", (r) => valorFormatado(produto, r?.preco_nominal_fim)],
        ["Variação nominal", (r) => fmtPct(r?.variacao_nominal_pct)],
        ["Variação real", (r) => fmtPct(r?.variacao_real_pct)],
        ["Preço médio", (r) => valorFormatado(produto, r?.preco_nominal_medio)],
        ["Mínimo", (r) => valorFormatado(produto, r?.preco_nominal_min)],
        ["Máximo", (r) => valorFormatado(produto, r?.preco_nominal_max)],
        ["% do salário mínimo (início → fim)", (r) => (r ? `${fmtNum(r.pct_salario_minimo_inicio, 2)}% → ${fmtNum(r.pct_salario_minimo_fim, 2)}%` : "—")],
      ]
    : [
        ["Índice inicial", (r) => valorFormatado(produto, r?.indice_nominal_inicio)],
        ["Índice final", (r) => valorFormatado(produto, r?.indice_nominal_fim)],
        ["Variação nominal", (r) => fmtPct(r?.variacao_nominal_pct)],
        ["Variação real", (r) => fmtPct(r?.variacao_real_pct)],
        ["Índice médio", (r) => valorFormatado(produto, r?.indice_nominal_medio)],
      ];

  const table = document.getElementById("comparison-table");
  table.innerHTML = `
    <thead><tr><th></th><th class="col-bolsonaro">Bolsonaro</th><th class="col-lula">Lula</th></tr></thead>
    <tbody>
      ${linhas.map(([label, fn]) => `<tr><td>${label}</td><td>${fn(rB)}</td><td>${fn(rL)}</td></tr>`).join("")}
    </tbody>`;
}

// ---------- Contexto ----------
function renderContext(produto) {
  const isComb = produto.tipo === "combustivel";
  const serie = produto.serie_mensal;
  const x = serie.map((r) => r.ano_mes);

  const traces = [
    { x, y: serie.map((r) => (isComb ? r.preco_indice100 : r.indice_relativo)), name: produto.nome, type: "scatter", mode: "lines", line: { color: "#0f6b4c", width: 2.5 } },
    { x, y: serie.map((r) => r.ipca_indice100), name: "IPCA (inflação geral)", type: "scatter", mode: "lines", line: { color: "#8a8c94", width: 2, dash: "dot" } },
  ];
  if (isComb) {
    traces.push({ x, y: serie.map((r) => r.brent_brl_indice100), name: "Brent (em R$)", type: "scatter", mode: "lines", line: { color: "#8e44ad", width: 1.5, dash: "dash" } });
    traces.push({ x, y: serie.map((r) => r.cambio_indice100), name: "Câmbio USD/BRL", type: "scatter", mode: "lines", line: { color: "#f39c12", width: 1.5, dash: "dash" } });
  }

  const layout = {
    margin: { l: 48, r: 16, t: 10, b: 36 },
    font: { family: "Inter, sans-serif", size: 11, color: "#55575f" },
    xaxis: { showgrid: false },
    yaxis: { title: "Índice (mês inicial = 100)", gridcolor: "#e5e5e8" },
    legend: { orientation: "h", y: -0.2 },
    plot_bgcolor: "rgba(0,0,0,0)", paper_bgcolor: "rgba(0,0,0,0)",
  };
  Plotly.react("context-chart", traces, layout, { responsive: true, displayModeBar: false });

  const ultimo = serie[serie.length - 1];
  const intro = document.getElementById("context-intro");
  if (isComb) {
    const varBrent = ultimo.brent_brl_indice100 !== null ? ultimo.brent_brl_indice100 - 100 : null;
    const varCambio = ultimo.cambio_indice100 !== null ? ultimo.cambio_indice100 - 100 : null;
    intro.textContent = `De ${fmtMesAno(serie[0].ano_mes)} a ${fmtMesAno(ultimo.ano_mes)}, o Brent em reais variou ${fmtPct(varBrent)} e o câmbio USD/BRL variou ${fmtPct(varCambio)} — fatores externos que fazem parte do contexto de formação do preço doméstico, ao lado de decisões domésticas (tributos, política de preços da Petrobras). Isto não é um modelo causal: mostra trajetória lado a lado, não atribui quanto cada fator "causou".`;
  } else {
    intro.textContent = `Comparação entre a evolução do índice deste item e o IPCA geral, ambos na mesma base 100 (${fmtMesAno(serie[0].ano_mes)}). Quando a linha do item fica acima da linha cinza, o item subiu mais que a inflação média do país.`;
  }
}

// ---------- Histórico anual ----------
function renderAnnual(produto) {
  const grid = document.getElementById("annual-grid");
  const anoAtual = new Date().getFullYear();
  grid.innerHTML = produto.serie_anual.map((r) => {
    const valor = produto.tipo === "combustivel" ? r.preco_nominal_medio : r.indice_nominal_medio;
    const parcial = r.n_meses < 12;
    return `<div class="annual-cell ${parcial ? "partial" : ""}">
      <div class="a-year">${r.ano}</div>
      <div class="a-value">${valorFormatado(produto, valor)}</div>
    </div>`;
  }).join("");
}

init();
