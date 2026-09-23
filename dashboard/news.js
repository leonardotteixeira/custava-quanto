// CUSTAVA QUANTO? — NOTÍCIAS DA ÉPOCA
// Matérias reais (data/processed/noticias.json), conferidas na fonte por
// scripts/build_news.py. Entram como contexto — "o que estava sendo
// noticiado" — nunca como prova de causa. Este arquivo é carregado antes do
// app.js e usa as funções/estado dele só na hora de renderizar.

const NEWS_URL = "../data/processed/noticias.json";
let NEWS = [];
const MAX_MARCADORES = 8;
const GRUPO_TAG = { combustivel: "combustiveis", alimento_indice: "alimentos" };

async function carregarNoticias() {
  try {
    const r = await fetch(NEWS_URL, { cache: "no-cache" });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.itens || []).filter((n) => /^https?:\/\//.test(n.url));
  } catch {
    return []; // sem notícias, o resto do painel funciona normalmente
  }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDataNoticia = (iso) => {
  const [y, m, d] = iso.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10) - 1]} ${y}`;
};
const mesDe = (iso) => iso.slice(0, 7);

// Notícias ligadas ao produto: a tag do próprio produto + a tag do grupo
// (ex.: "combustiveis" vale para gasolina, diesel...). Específicas primeiro.
function noticiasDo(codigo) {
  const grupo = GRUPO_TAG[PRODUCT_CATEGORIA(codigo)];
  return NEWS
    .filter((n) => n.produtos.includes(codigo) || (grupo && n.produtos.includes(grupo)))
    .map((n) => ({ ...n, especifica: n.produtos.includes(codigo) }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// No gráfico cabem poucos marcadores: prioriza as específicas e espalha no tempo.
function noticiasParaGrafico(codigo) {
  const todas = noticiasDo(codigo);
  if (todas.length <= MAX_MARCADORES) return todas;
  // 1ª passada: uma por ano (a específica, se houver); 2ª: completa com as demais
  const prioridade = [...todas].sort((a, b) => Number(b.especifica) - Number(a.especifica));
  const escolhidas = new Set();
  const anosCobertos = new Set();
  prioridade.forEach((n) => {
    const ano = n.data.slice(0, 4);
    if (escolhidas.size < MAX_MARCADORES && !anosCobertos.has(ano)) { escolhidas.add(n); anosCobertos.add(ano); }
  });
  prioridade.forEach((n) => { if (escolhidas.size < MAX_MARCADORES) escolhidas.add(n); });
  return [...escolhidas].sort((a, b) => a.data.localeCompare(b.data));
}

// Linha da série no mês da notícia (ou no mês vizinho, se aquele mês faltar).
function linhaDoMes(produto, iso, campo) {
  const serie = produto.serie_mensal;
  const i = serie.findIndex((r) => mesDe(r.ano_mes) === mesDe(iso));
  if (i < 0) return null;
  for (const k of [i, i - 1, i + 1]) {
    const r = serie[k];
    if (r && !isNil(campo(r))) return { r, i: k };
  }
  return null;
}

// Valor do produto no mês, na unidade nativa (R$, índice, % ao ano, pontos).
function valorNativo(produto) {
  const u = unidadeInfo(produto);
  if (produto.tipo === "taxa") return { campo: (r) => r.taxa_aa, fmt: (v) => `${fmtNum(v, 2)}%`, cap: produto.unidade };
  if (produto.tipo === "pontos") return { campo: (r) => r.pontos, fmt: (v) => `${fmtNum(v, 0)} pts`, cap: "fechamento do mês" };
  if (temPreco(produto)) return { campo: (r) => r.preco_nominal, fmt: (v) => fmtBRL.format(v), cap: produto.tipo === "cambio" ? "cotação média do mês" : `preço médio no mês, ${u.por}` };
  return { campo: (r) => r.indice_relativo, fmt: (v) => `índice ${fmtNum(v, 1)}`, cap: "índice no mês (não é R$)" };
}

function clipHtml(n, { resumo = false, extra = "", depois = "", classe = "" } = {}) {
  const img = n.imagem
    ? `<figure class="clip-fig"><img src="${esc(n.imagem)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>Foto: ${esc(n.credito_imagem || n.veiculo)}</figcaption></figure>`
    : "";
  return `<article class="clip ${classe} ${n.imagem ? "has-img" : ""}">
    ${extra}${img}
    <div class="clip-meta"><span class="clip-outlet">${esc(n.veiculo)}</span><time datetime="${esc(n.data)}">${fmtDataNoticia(n.data)}</time></div>
    <h3 class="clip-title"><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
    ${resumo && n.resumo ? `<p class="clip-summary">${esc(n.resumo)}</p>` : ""}
    <a class="clip-link" href="${esc(n.url)}" target="_blank" rel="noopener">Leia a matéria original →</a>
    ${depois}
  </article>`;
}

// ---------- Interlúdio: o número de um momento + a notícia daquele momento ----------
function renderInterlude(produto) {
  const sec = document.getElementById("interlude");
  const nat = valorNativo(produto);
  const candidatas = noticiasDo(state.product).filter((n) => linhaDoMes(produto, n.data, nat.campo));
  if (!candidatas.length) { sec.hidden = true; return; }
  const serie = produto.serie_mensal;
  let iPico = -1;
  serie.forEach((r, i) => { const v = nat.campo(r); if (!isNil(v) && (iPico < 0 || v > nat.campo(serie[iPico]))) iPico = i; });
  const [yP, mP] = mesDe(serie[iPico].ano_mes).split("-").map(Number);
  const dist = (iso) => { const [y, m] = mesDe(iso).split("-").map(Number); return Math.abs((y - yP) * 12 + (m - mP)); };

  // prefere a notícia mais próxima do pico (específica do produto, se houver);
  // se nenhuma estiver a até 3 meses do pico, usa a específica mais recente
  let n = [...candidatas].sort((a, b) => (dist(a.data) - dist(b.data)) || (Number(b.especifica) - Number(a.especifica)))[0];
  const pertoDoPico = dist(n.data) <= 3;
  if (!pertoDoPico) n = [...candidatas].sort((a, b) => (Number(b.especifica) - Number(a.especifica)) || b.data.localeCompare(a.data))[0];
  const alvo = linhaDoMes(produto, n.data, nat.campo);

  sec.hidden = false;
  document.getElementById("il-label").textContent = pertoDoPico ? "Perto do pico da série" : "Naquele momento";
  document.getElementById("il-number").textContent = nat.fmt(nat.campo(alvo.r));
  document.getElementById("il-date").textContent = `${txt(state.product).titulo} · ${nat.cap} · ${fmtMesAno(alvo.r.ano_mes)}`;
  document.getElementById("il-clip").innerHTML = clipHtml(n, { resumo: true, classe: "clip-feature" });
}

// ---------- Marcadores no gráfico + trilha clicável + painel ----------
let chartNews = [];   // notícias marcadas no gráfico atual
let chartCtx = null;  // { x, y, fmtY, cap } do gráfico atual

function newsMarkerTrace(x, y) {
  chartNews = noticiasParaGrafico(state.product).map((n) => {
    let k = x.findIndex((d) => mesDe(d) === mesDe(n.data));
    if (k >= 0 && isNil(y[k])) k = !isNil(y[k - 1]) ? k - 1 : !isNil(y[k + 1]) ? k + 1 : -1;
    return k >= 0 ? { ...n, xi: k } : null;
  }).filter(Boolean);
  if (!chartNews.length) return null;
  if (!chartNews.some((n) => n.id === state.newsId)) state.newsId = chartNews[0].id;
  return {
    x: chartNews.map((n) => x[n.xi]), y: chartNews.map((n) => y[n.xi]),
    type: "scatter", mode: "markers+text", name: "noticias",
    text: chartNews.map((_, k) => String(k + 1)), textposition: "middle center",
    textfont: { size: 11, color: cssVar("--ink"), family: "Inter, sans-serif" },
    marker: { size: 21, color: chartNews.map((n) => (n.id === state.newsId ? cssVar("--accent") : "#ffffff")), line: { color: cssVar("--ink"), width: 1.5 } },
    customdata: chartNews.map((n) => n.id),
    hovertemplate: chartNews.map((n) => `<b>${fmtDataNoticia(n.data)}</b> · ${esc(n.veiculo)}<br>${esc(n.titulo.length > 70 ? n.titulo.slice(0, 68) + "…" : n.titulo)}<br><i>clique para ler</i><extra></extra>`),
    cliponaxis: false,
  };
}

function renderNewsTrack() {
  const box = document.getElementById("news-track");
  if (!chartNews.length) { box.hidden = true; return; }
  box.hidden = false;
  document.getElementById("news-track-list").innerHTML = chartNews.map((n, k) => `
    <button type="button" class="nt-item" role="tab" data-news="${n.id}" aria-selected="${n.id === state.newsId}" title="${esc(n.titulo)}">
      <span class="nt-num">${k + 1}</span><span class="nt-when">${fmtMesAno(n.data)}</span>
    </button>`).join("");
  renderNewsPanel();
}

function renderNewsPanel() {
  const n = chartNews.find((c) => c.id === state.newsId);
  if (!n || !chartCtx) return;
  const v = chartCtx.y[n.xi];
  const extra = `<div class="np-when"><span class="d">${fmtMesAno(chartCtx.x[n.xi])}</span><span class="v tnum">${isNil(v) ? "—" : chartCtx.fmtY(v)}</span><span class="c">${esc(chartCtx.cap)}</span></div>`;
  document.getElementById("news-panel").innerHTML = clipHtml(n, { resumo: true, extra });
}

function selectNews(id) {
  state.newsId = id;
  document.querySelectorAll("#news-track-list .nt-item").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.news === id)));
  renderNewsPanel();
  const el = document.getElementById("main-chart");
  const idx = (el.data || []).findIndex((t) => t.name === "noticias");
  if (idx >= 0) Plotly.restyle(el, { "marker.color": [chartNews.map((n) => (n.id === id ? cssVar("--accent") : "#ffffff"))] }, [idx]);
}

function bindNewsInteractions() {
  document.getElementById("news-track-list").addEventListener("click", (e) => {
    const b = e.target.closest(".nt-item");
    if (b) selectNews(b.dataset.news);
  });
}

function bindChartClicks() {
  const el = document.getElementById("main-chart");
  if (el.dataset.newsBound || typeof el.on !== "function") return;
  el.dataset.newsBound = "1";
  el.on("plotly_click", (ev) => {
    const pt = ev.points.find((p) => p.data.name === "noticias");
    if (!pt) return;
    selectNews(pt.customdata);
    document.getElementById("news-panel").scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth", block: "nearest" });
  });
}

// ---------- Arquivo da época ----------
function renderArchive(produto) {
  const sec = document.getElementById("arquivo");
  const lista = noticiasDo(state.product);
  if (!lista.length) { sec.hidden = true; return; }
  sec.hidden = false;
  const t = txt(state.product);
  const anos = [...new Set(lista.map((n) => n.data.slice(0, 4)))];
  const veiculos = new Set(lista.map((n) => n.veiculo)).size;
  document.getElementById("archive-sub").textContent =
    `${lista.length} ${lista.length === 1 ? "matéria real" : "matérias reais"} sobre ${t.titulo} e o contexto em volta, de ${veiculos} ${veiculos === 1 ? "veículo" : "veículos"}, entre ${anos[0]} e ${anos[anos.length - 1]}. Toque no título para abrir a matéria original.`;
  const corteAno = parseInt(DATA.periodo_corte.slice(0, 4), 10);
  const nat = valorNativo(produto);
  document.getElementById("archive").innerHTML = anos.map((ano) => {
    const gov = parseInt(ano, 10) < corteAno ? "Bolsonaro" : "Lula";
    const clips = lista.filter((n) => n.data.startsWith(ano)).map((n) => {
      const l = linhaDoMes(produto, n.data, nat.campo);
      const val = l ? `<span class="clip-value">${esc(t.titulo)} em ${fmtMesAno(l.r.ano_mes)}: <b>${nat.fmt(nat.campo(l.r))}</b></span>` : "";
      return clipHtml(n, { depois: val });
    }).join("");
    return `<div class="arch-year">
      <div class="arch-year-label">${ano}<small><span class="dot ${gov.toLowerCase()}"></span>Governo ${gov}</small></div>
      <div class="arch-clips">${clips}</div>
    </div>`;
  }).join("");
}
