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
const CATEGORY_DEFAULT = { combustivel: "GASOLINA", alimento_indice: "Arroz" };
const COHORT_LABEL = {
  governo_inteiro: "governo inteiro",
  primeiros_12m: "primeiros 12 meses",
  primeiros_24m: "primeiros 24 meses",
  primeiros_36m: "primeiros 36 meses",
};

let DATA = null;
const state = { categoria: "combustivel", product: "GASOLINA", metric: "nominal", cohort: "governo_inteiro" };

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

// Troca o conteúdo de um elemento com um pequeno "giro" (fade + deslocamento),
// o único momento de movimento orquestrado da página — reservado para o
// número mais importante da tela (o preço-herói).
function swapWithRoll(el, novoTexto) {
  el.classList.add("rolling");
  window.setTimeout(() => {
    el.textContent = novoTexto;
    el.classList.remove("rolling");
  }, 140);
}

async function init() {
  const resp = await fetch(DATA_URL);
  DATA = await resp.json();
  bindCategoryTabs();
  renderSelector();
  bindToggles();
  selectProduct(state.product);
}

function bindCategoryTabs() {
  document.getElementById("category-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".category-tab");
    if (!btn) return;
    const categoria = btn.dataset.categoria;
    if (categoria === state.categoria) return;
    state.categoria = categoria;
    document.querySelectorAll(".category-tab").forEach((t) => t.classList.toggle("active", t === btn));
    renderSelector();
    selectProduct(CATEGORY_DEFAULT[categoria]);
  });
}

function renderSelector() {
  const el = document.getElementById("product-selector");
  el.innerHTML = "";
  PRODUCT_ORDER
    .filter((p) => DATA.produtos[p] && DATA.produtos[p].tipo === state.categoria)
    .forEach((codigo) => {
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
    renderComparisonTable();
  });
}

function updateToggleActive(groupId, activeBtn) {
  document.querySelectorAll(`#${groupId} .segmented-btn`).forEach((b) => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

function selectProduct(codigo) {
  state.product = codigo;
  state.metric = "nominal";
  document.querySelectorAll(".product-chip").forEach((c) => c.classList.toggle("active", c.dataset.produto === codigo));
  document.querySelectorAll("#metric-toggle .segmented-btn").forEach((b) => b.classList.toggle("active", b.dataset.metric === "nominal"));

  const produto = DATA.produtos[codigo];
  document.getElementById("product-kicker").textContent = produto.nome;

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

// ---------- Presidentes + Era/Agora ----------
function renderHero(produto) {
  const wrap = document.getElementById("president-cards");
  wrap.innerHTML = "";
  const isComb = produto.tipo === "combustivel";
  ["Bolsonaro", "Lula"].forEach((periodo) => {
    const pres = DATA.presidentes[periodo];
    const resumo = produto.resumo_periodos[periodo]?.governo_inteiro;
    const card = document.createElement("div");
    card.className = `president-card ${periodo.toLowerCase()}`;
    let precos, datas;
    if (!resumo) {
      precos = "dado não disponível";
      datas = "";
    } else if (isComb) {
      precos = `${valorFormatado(produto, resumo.preco_nominal_inicio)}<span class="p-sep">→</span>${valorFormatado(produto, resumo.preco_nominal_fim)}`;
      datas = `${fmtMesAno(resumo.mes_inicio)} — ${fmtMesAno(resumo.mes_fim)}`;
    } else {
      precos = `${fmtPct(resumo.variacao_nominal_pct)} <span class="p-sep">·</span> índice, não R$`;
      datas = `${fmtMesAno(resumo.mes_inicio)} — ${fmtMesAno(resumo.mes_fim)}`;
    }
    card.innerHTML = `
      <img src="${pres.foto}" alt="${pres.nome}" loading="lazy" />
      <div>
        <div class="p-eyebrow"><span class="dot"></span>${periodo.toUpperCase()}</div>
        <div class="p-name">${pres.nome}</div>
        <div class="p-prices">${precos}</div>
        <div class="p-dates">${datas}</div>
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
    // Índice de cesta básica: o card Era/Agora foi desenhado para preço em
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

  const serie = produto.serie_mensal;
  const primeiro = serie[0];
  const ultimo = serie[serie.length - 1];
  const valorInicio = primeiro.preco_nominal;
  const valorFim = ultimo.preco_nominal;

  swapWithRoll(document.getElementById("era-value"), valorFormatado(produto, valorInicio));
  document.getElementById("era-date").textContent = fmtMesAno(primeiro.ano_mes);
  swapWithRoll(document.getElementById("agora-value"), valorFormatado(produto, valorFim));
  document.getElementById("agora-date").textContent = fmtMesAno(ultimo.ano_mes);

  const diffEl = document.getElementById("era-diff");
  const pct = (valorFim / valorInicio - 1) * 100;
  const diffRs = valorFim - valorInicio;
  diffEl.querySelector(".diff-pct").textContent = fmtPct(pct);
  diffEl.querySelector(".diff-rs").textContent = `${diffRs >= 0 ? "+" : ""}${fmtBRL.format(diffRs)}`;
}

// ---------- Gráfico principal ----------
function renderChart() {
  const produto = DATA.produtos[state.product];
  const serie = produto.serie_mensal;
  const x = serie.map((r) => r.ano_mes);

  const cores = getComputedStyle(document.documentElement);
  const inkColor = cores.getPropertyValue("--ink").trim();
  const goldColor = cores.getPropertyValue("--gold").trim();
  const softColor = cores.getPropertyValue("--ink-soft").trim();
  const lineColor = cores.getPropertyValue("--line").trim();
  const paperColor = cores.getPropertyValue("--paper").trim();
  const pBolsonaro = cores.getPropertyValue("--p-bolsonaro").trim();
  const pLula = cores.getPropertyValue("--p-lula").trim();

  let y, hovertext, yTitle;
  if (produto.tipo === "combustivel") {
    if (state.metric === "nominal") { y = serie.map((r) => r.preco_nominal); yTitle = produto.unidade; }
    else if (state.metric === "real") { y = serie.map((r) => r.preco_real); yTitle = `${produto.unidade} (real)`; }
    else { y = serie.map((r) => r.pct_salario_minimo); yTitle = "% do salário mínimo"; }

    hovertext = serie.map((r) => {
      const linhas = [`<b>${fmtMesAno(r.ano_mes)}</b>`, `${produto.nome}: <b>${r.preco_nominal !== null ? fmtBRL.format(r.preco_nominal) : "—"}</b>`];
      if (r.salario_minimo !== null) linhas.push(`Salário mínimo: ${fmtBRL.format(r.salario_minimo)}`);
      if (r.pct_salario_minimo !== null) linhas.push(`Preço = ${fmtNum(r.pct_salario_minimo, 2)}% do salário mínimo`);
      if (r.unidades_por_salario_minimo !== null) linhas.push(`Poder de compra: ${fmtNum(r.unidades_por_salario_minimo, 1)} unidades por salário mínimo`);
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
    x, y, type: "scatter", mode: "lines", line: { color: goldColor, width: 2.5, shape: "spline", smoothing: 0.3 },
    fill: "tozeroy", fillcolor: goldColor.startsWith("#") ? goldColor + "14" : goldColor,
    hovertext, hoverinfo: "text",
  };

  const layout = {
    margin: { l: 54, r: 16, t: 34, b: 40 },
    font: { family: "Space Grotesk, sans-serif", size: 12, color: softColor },
    xaxis: { showgrid: false, tickfont: { size: 11 }, linecolor: lineColor, showline: true, ticks: "outside", tickcolor: lineColor },
    yaxis: { title: yTitle, gridcolor: lineColor, zeroline: false, rangemode: "tozero" },
    shapes: [{ type: "line", x0: cutoff, x1: cutoff, y0: 0, y1: 1, yref: "paper", line: { color: softColor, width: 1, dash: "dot" } }],
    annotations: [
      { x: cutoff, y: 1.06, yref: "paper", text: "BOLSONARO", showarrow: false, xanchor: "right", xshift: -6, font: { size: 10.5, color: pBolsonaro, family: "Space Grotesk, sans-serif" } },
      { x: cutoff, y: 1.06, yref: "paper", text: "LULA", showarrow: false, xanchor: "left", xshift: 6, font: { size: 10.5, color: pLula, family: "Space Grotesk, sans-serif" } },
    ],
    plot_bgcolor: "rgba(0,0,0,0)", paper_bgcolor: "rgba(0,0,0,0)",
    hoverlabel: { bgcolor: inkColor, font: { color: paperColor, size: 12, family: "Space Grotesk, sans-serif" }, bordercolor: inkColor },
  };

  Plotly.react("main-chart", [trace], layout, { responsive: true, displayModeBar: false });

  document.getElementById("chart-subtitle").textContent =
    produto.tipo === "combustivel"
      ? `Preço médio nacional mensal, jan/2019–${fmtMesAno(serie[serie.length - 1].ano_mes)}.`
      : `Índice relativo (IBGE/IPCA por item), não é preço em R$ — ver nota acima.`;
}

// ---------- Poder de compra ----------
function renderPurchasingPower(produto) {
  const section = document.getElementById("purchasing-power-section");
  if (produto.tipo !== "combustivel") { section.style.display = "none"; return; }
  section.style.display = "";
  const serie = produto.serie_mensal;
  const primeiro = serie[0], ultimo = serie[serie.length - 1];
  const maxUnidades = Math.max(primeiro.unidades_por_salario_minimo, ultimo.unidades_por_salario_minimo);
  const card = document.getElementById("pp-card");
  card.innerHTML = `
    <div class="pp-col">
      <div class="pp-label">1 salário mínimo em ${fmtMesAno(primeiro.ano_mes)}</div>
      <div class="pp-value">${fmtNum(primeiro.unidades_por_salario_minimo, 0)}</div>
      <div class="pp-sub">unidades de ${produto.nome.toLowerCase()}</div>
      <div class="pp-bar"><div class="pp-bar-fill" style="width:${(primeiro.unidades_por_salario_minimo / maxUnidades * 100).toFixed(0)}%"></div></div>
    </div>
    <div class="pp-connector"><svg viewBox="0 0 40 24"><path d="M2 12 H32 M24 4 L34 12 L24 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="pp-col">
      <div class="pp-label">1 salário mínimo em ${fmtMesAno(ultimo.ano_mes)}</div>
      <div class="pp-value">${fmtNum(ultimo.unidades_por_salario_minimo, 0)}</div>
      <div class="pp-sub">unidades de ${produto.nome.toLowerCase()}</div>
      <div class="pp-bar"><div class="pp-bar-fill" style="width:${(ultimo.unidades_por_salario_minimo / maxUnidades * 100).toFixed(0)}%"></div></div>
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
  const ultimo = serie[serie.length - 1];
  const primeiro = serie[0];

  const cores = getComputedStyle(document.documentElement);
  const goldColor = cores.getPropertyValue("--gold").trim();
  const softColor = cores.getPropertyValue("--ink-soft").trim();
  const faintColor = cores.getPropertyValue("--ink-faint").trim();
  const lineColor = cores.getPropertyValue("--line").trim();
  const inkColor = cores.getPropertyValue("--ink").trim();
  const paperColor = cores.getPropertyValue("--paper").trim();
  const slateColor = cores.getPropertyValue("--p-bolsonaro").trim();
  const plumColor = cores.getPropertyValue("--p-lula").trim();

  const traces = [
    { x, y: serie.map((r) => (isComb ? r.preco_indice100 : r.indice_relativo)), name: produto.nome, type: "scatter", mode: "lines", line: { color: goldColor, width: 2.5 } },
    { x, y: serie.map((r) => r.ipca_indice100), name: "IPCA (inflação geral)", type: "scatter", mode: "lines", line: { color: faintColor, width: 1.5, dash: "dot" } },
  ];
  if (isComb) {
    traces.push({ x, y: serie.map((r) => r.brent_brl_indice100), name: "Brent (em R$)", type: "scatter", mode: "lines", line: { color: slateColor, width: 1.4, dash: "dash" } });
    traces.push({ x, y: serie.map((r) => r.cambio_indice100), name: "Câmbio USD/BRL", type: "scatter", mode: "lines", line: { color: plumColor, width: 1.4, dash: "dash" } });
  }

  const layout = {
    margin: { l: 46, r: 12, t: 10, b: 34 },
    font: { family: "Space Grotesk, sans-serif", size: 11, color: softColor },
    xaxis: { showgrid: false, linecolor: lineColor, showline: true, ticks: "outside", tickcolor: lineColor },
    yaxis: { title: "índice (mês inicial = 100)", gridcolor: lineColor },
    legend: { orientation: "h", y: -0.22, font: { size: 11 } },
    plot_bgcolor: "rgba(0,0,0,0)", paper_bgcolor: "rgba(0,0,0,0)",
    hoverlabel: { bgcolor: inkColor, font: { color: paperColor, family: "Space Grotesk, sans-serif" } },
  };
  Plotly.react("context-chart", traces, layout, { responsive: true, displayModeBar: false });

  const intro = document.getElementById("context-intro");
  const strip = document.getElementById("stat-strip");

  function statHtml(label, valorPct) {
    const cls = valorPct === null ? "" : valorPct >= 0 ? "stat-positive" : "stat-negative";
    return `<div class="stat-item"><div class="stat-label">${label}</div><div class="stat-value tnum ${cls}">${valorPct === null ? "—" : fmtNum(Math.abs(valorPct), 1) + "%"}</div></div>`;
  }

  if (isComb) {
    const varItem = (ultimo.preco_indice100 !== null) ? ultimo.preco_indice100 - 100 : null;
    const varBrent = ultimo.brent_brl_indice100 !== null ? ultimo.brent_brl_indice100 - 100 : null;
    const varCambio = ultimo.cambio_indice100 !== null ? ultimo.cambio_indice100 - 100 : null;
    const varIpca = ultimo.ipca_indice100 !== null ? ultimo.ipca_indice100 - 100 : null;
    strip.innerHTML =
      statHtml(produto.nome, varItem) +
      statHtml("Brent (em R$)", varBrent) +
      statHtml("Câmbio USD/BRL", varCambio) +
      statHtml("IPCA", varIpca);
    intro.textContent = `De ${fmtMesAno(primeiro.ano_mes)} a ${fmtMesAno(ultimo.ano_mes)}, estes indicadores variaram assim — contexto para entender o ambiente em que o preço se formou, não uma atribuição de causa: a política de preços da Petrobras, tributos e a dinâmica interna de oferta e demanda também têm peso.`;
  } else {
    const varItem = (ultimo.indice_relativo !== null) ? ultimo.indice_relativo - 100 : null;
    const varIpca = ultimo.ipca_indice100 !== null ? ultimo.ipca_indice100 - 100 : null;
    strip.innerHTML = statHtml(produto.nome, varItem) + statHtml("IPCA (inflação geral)", varIpca);
    intro.textContent = `Comparação entre a evolução do índice deste item e o IPCA geral, ambos na mesma base 100 (${fmtMesAno(primeiro.ano_mes)}). Quando a linha do item fica acima da linha pontilhada, o item subiu mais que a inflação média do país.`;
  }
}

// ---------- Histórico anual ----------
function renderAnnual(produto) {
  const grid = document.getElementById("annual-grid");
  grid.innerHTML = produto.serie_anual.map((r) => {
    const valor = produto.tipo === "combustivel" ? r.preco_nominal_medio : r.indice_nominal_medio;
    const parcial = r.n_meses < 12;
    return `<div class="annual-cell ${parcial ? "partial" : ""}">
      <div class="a-year">${r.ano}</div>
      <div class="a-value tnum">${valorFormatado(produto, valor)}</div>
    </div>`;
  }).join("");
}

init();
