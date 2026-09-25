// CUSTAVA QUANTO? — página do PIB (v2).
//
// O PIB não é uma série mensal: o dado de origem é TRIMESTRAL (IBGE, Contas
// Nacionais Trimestrais) e o "resultado do ano" é a taxa acumulada no 4º
// trimestre. Este módulo desenha a história do PIB com a frequência real de
// cada série — nada é interpolado, repetido ou convertido para mensal — e
// só escreve o que já vem pronto de dashboard_data.json (calculado em Python)
// ou de fontes citadas na própria página.

import {
  isNil, fmtNum, fmtPct, fmtPP, sign, dataCurta, dataNoticia, mesKey, monthIdx, esc, PERIODO_CORTE, $,
} from "./util.js";
import { lineChart } from "./charts.js";

// Recorte editorial único de TODOS os gráficos de análise do PIB: jan/2019 -> último
// dado. A série completa (desde 1996) continua nos dados; só a apresentação filtra.
export const PIB_JANELA_INICIO = "2019-01-01";
export const noRecorte = (iso) => iso >= PIB_JANELA_INICIO;

// ---------------------------------------------------------------- rótulos
const TRI_ORD = { 1: "1º", 2: "2º", 3: "3º", 4: "4º" };
export const triLabel = (t) => { // "2026-T2" -> "2º trimestre de 2026"
  const [a, q] = String(t).split("-T");
  return `${TRI_ORD[q]} trimestre de ${a}`;
};
const pct = (v, d = 1) => (isNil(v) ? "—" : `${sign(v)}${fmtNum(Math.abs(v), d)}%`);
const pctSimples = (v, d = 1) => (isNil(v) ? "—" : `${fmtNum(v, d)}%`);

// ------------------------------------------------ fatos documentados (2010)
// Divulgação oficial de 03/03/2011 (IBGE) e Relatório Anual 2010 do Banco
// Central. Os números do release podem diferir da série ATUAL do IBGE, que é
// revisada com o tempo — a página mostra as duas colunas, com rótulo.
export const PIB_2010 = {
  release: {
    titulo: "Em 2010, PIB varia 7,5% e fica em R$ 3,675 trilhões",
    data: "03/03/2011",
    url: "https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/13983-asi-em-2010-pib-varia-75-e-fica-em-r-3675-trilhoes",
    valores: { "90707": 7.5, "90687": 6.5, "90691": 10.1, "90696": 5.4, "93404": 7.0, "93406": 21.8, "93407": 11.5, "93408": 36.2 },
    extras: [["Valor adicionado", 6.7]],
  },
  bcb: {
    titulo: "Banco Central do Brasil, Relatório Anual 2010 (cap. I, A Economia Brasileira)",
    url: "https://www.bcb.gov.br/pec/boletim/banual2010/rel2010cap1p.pdf",
  },
};

// Resultado divulgado na época (título das reportagens/releases verificados):
// serve para mostrar que o IBGE revisa a série.
const DIVULGADO = { 2010: 7.5, 2015: -3.8, 2020: -4.1, 2021: 4.6, 2022: 2.9, 2023: 2.9, 2024: 3.4, 2025: 2.3 };

// ---------------------------------------------------------- dados derivados
const anuais = (prod) => prod.serie_mensal.filter((r) => !isNil(r.taxa_aa) && noRecorte(r.ano_mes));
const comp = (prod, cod) => (prod.componentes || []).find((c) => c.codigo === cod);
const compAno = (c, ano) => c?.serie_anual.find((x) => x.ano === ano)?.taxa ?? null;

// notícia -> ano a que o resultado se refere. Os resultados anuais saem em
// março do ano seguinte; o trimestral sai no fim do trimestre seguinte.
export function anoDaNoticia(n) {
  const a = +n.data.slice(0, 4), m = +n.data.slice(5, 7);
  return m <= 4 ? a - 1 : a;
}
const noticiasDoAno = (NEWS, ano) => NEWS.filter((n) => n.produtos.includes("PIB") && n.tema === "pib" && anoDaNoticia(n) === ano);

// --------------------------------------------------------------- abertura
export function renderPibIntro(prod) {
  const box = $("#pib-intro");
  box.hidden = false;
  const ul = prod.ultimo_trimestre;
  const an = anuais(prod);
  const hi = an.reduce((x, r) => (r.taxa_aa > x.taxa_aa ? r : x), an[0]);
  const lo = an.reduce((x, r) => (r.taxa_aa < x.taxa_aa ? r : x), an[0]);
  const ultimoAno = an[an.length - 1];
  $("#pib-intro-text").textContent = "O PIB mede o valor dos bens e serviços finais produzidos pela economia. Nesta página, acompanhamos sua evolução e os principais componentes da atividade econômica.";
  $("#pib-glance").innerHTML = [
    ["Último dado disponível", ul ? triLabel(ul.trimestre) : "—", ul ? [
      `${pct(ul.variacao_dessazonalizada)} contra o trimestre anterior (dessazonalizado)`,
      `${pct(ul.variacao_interanual)} contra o mesmo trimestre do ano anterior`,
      isNil(ul.acumulado_ano) ? "" : `${pct(ul.acumulado_ano)} acumulado no ano`,
    ].filter(Boolean).join(" · ") : ""],
    ["Periodicidade", "Trimestral", "O resultado do ano é a taxa acumulada no 4º trimestre."],
    ["Maior crescimento anual do recorte", pct(hi.taxa_aa), `em ${hi.ano} · variação real contra o ano anterior · recorte 2019 em diante`],
    ["Maior retração anual do recorte", pct(lo.taxa_aa), `em ${lo.ano} · variação real contra o ano anterior · recorte 2019 em diante`],
    ["Último ano completo", String(ultimoAno.ano), `${pct(ultimoAno.taxa_aa)} · resultado do 4º trimestre`],
  ].map(([t, v, s]) => `<div><dt>${t}</dt><dd>${v}</dd><dd class="pg-sub">${s}</dd></div>`).join("");
  $("#pib-intro-note").innerHTML = `Os valores históricos do PIB podem ser revistos pelo IBGE. "Maior" e "menor" descrevem o recorte exibido (2019 até o último dado); não são avaliação. <a href="${esc(prod.fonte.explica_url)}" target="_blank" rel="noopener">O que é o PIB (IBGE Explica)</a>.`;
}

// "Uma referência histórica": o +7,5% de 2010 fica fora do recorte principal.
function renderReferencia(prod) {
  const box = $("#pib-ref");
  if (!box) return;
  const c = PIB_2010, atual = compAno(comp(prod, "90707"), 2010);
  const a2009 = compAno(comp(prod, "90707"), 2009);
  box.innerHTML = `<p class="ref-kicker mono">Uma referência histórica · fora do recorte principal</p>
    <div class="ref-grid">
      <p class="ref-big" aria-label="+7,5% em 2010"><span class="ref-year mono">2010</span><span class="tnum">+${fmtNum(c.release.valores["90707"], 1)}%</span></p>
      <div class="ref-body">
        <p>Em 2010, o PIB cresceu ${fmtNum(c.release.valores["90707"], 1)}% frente a 2009, segundo o IBGE, o maior resultado anual da série que o projeto guarda desde 1996. O resultado veio depois de um 2009 fraco${isNil(a2009) ? "" : ` (${pct(a2009)} na série atual)`}, então parte do avanço reflete a comparação com uma base menor. O crescimento apareceu nos três grandes setores: agropecuária ${pct(c.release.valores["90687"])}, indústria ${pct(c.release.valores["90691"])} e serviços ${pct(c.release.valores["90696"])}; na demanda, consumo das famílias ${pct(c.release.valores["93404"])} e investimento (FBCF) ${pct(c.release.valores["93406"])}.</p>
        <p class="ref-src">Fontes: <a href="${esc(c.release.url)}" target="_blank" rel="noopener">IBGE, ${c.release.data}: ${esc(c.release.titulo)}</a> · <a href="${esc(c.bcb.url)}" target="_blank" rel="noopener">Banco Central, Relatório Anual 2010</a>.${isNil(atual) ? "" : ` Na série atual do IBGE, revisada, o resultado de 2010 é ${pct(atual)}.`} Contexto, não causa.</p>
      </div>
    </div>`;
}

export function hidePibBlocks() {
  ["#pib-intro", "#pib-extra", "#pib-metodo"].forEach((s) => { const e = $(s); if (e) e.hidden = true; });
}

// ------------------------------------------- cartão do ano + trimestral + fonte
let quarterMeasure = "interanual";
let quarterChart = null;

export function renderPibExtra(prod, ctx) {
  $("#pib-extra").hidden = false;
  $("#pib-metodo").hidden = false;
  renderYearCard(prod, ctx);
  renderReferencia(prod);
  renderQuarterly(prod);
  const f = prod.fonte;
  $("#pib-source").innerHTML = `<div><dt>Fonte</dt><dd>${esc(f.nome)}</dd></div>
    <div><dt>Periodicidade</dt><dd>${esc(f.periodicidade)}</dd></div>
    <div><dt>Última atualização dos dados</dt><dd>${f.atualizado_em ? dataCurta(f.atualizado_em.slice(0, 10)) : "não registrada"}${prod.ultimo_trimestre ? ` · último trimestre: ${triLabel(prod.ultimo_trimestre.trimestre)}` : ""}</dd></div>
    <div><dt>Metodologia</dt><dd><a href="${esc(f.url)}" target="_blank" rel="noopener">Contas Nacionais Trimestrais (IBGE)</a> · <a href="${esc(f.explica_url)}" target="_blank" rel="noopener">IBGE Explica: PIB</a></dd></div>`;
}

const LINHAS_COMP = [
  ["90687", "Agropecuária"], ["90691", "Indústria"], ["90696", "Serviços"],
  ["93404", "Consumo das famílias"], ["93405", "Consumo do governo"], ["93406", "Formação bruta de capital fixo"],
  ["93407", "Exportações"], ["93408", "Importações"],
];

function renderYearCard(prod, ctx) {
  const ano = ctx.S.pibYear;
  const an = anuais(prod);
  const r = an.find((x) => x.ano === ano) || an[an.length - 1];
  const ant = an.find((x) => x.ano === r.ano - 1);
  const pibC = comp(prod, "90707");
  const hi = an.reduce((x, y) => (y.taxa_aa > x.taxa_aa ? y : x), an[0]);
  const lo = an.reduce((x, y) => (y.taxa_aa < x.taxa_aa ? y : x), an[0]);
  const titulo = r.ano === hi.ano ? `${r.ano}: o maior crescimento anual do recorte`
    : r.ano === lo.ano ? `${r.ano}: a maior retração anual do recorte`
    : `${r.ano}: variação real do PIB no ano`;
  const periodo = r.ano >= 2023 ? "Governo Lula · em curso" : "Governo Bolsonaro";
  const divulgado = DIVULGADO[r.ano];
  const noticias = noticiasDoAno(ctx.NEWS, r.ano);
  const eh2010 = false;

  const linhas = LINHAS_COMP.map(([cod, nome]) => {
    const atual = compAno(comp(prod, cod), r.ano);
    const rel = eh2010 ? PIB_2010.release.valores[cod] : undefined;
    if (isNil(atual) && rel === undefined) return "";
    return `<tr><th scope="row">${nome}</th><td>${pct(atual)}</td>${eh2010 ? `<td>${rel === undefined ? "—" : pct(rel)}</td>` : ""}</tr>`;
  }).join("");

  const baixa = ant && ant.taxa_aa < 0
    ? `O ano anterior (${ant.ano}) teve variação de ${pct(ant.taxa_aa)}: parte do avanço de ${r.ano} reflete a comparação com uma base mais baixa.` : "";

  let corpo = "";
  if (eh2010) {
    const c = PIB_2010;
    corpo = `<p>Segundo o IBGE, o PIB cresceu ${pctSimples(c.release.valores["90707"])} em 2010 frente a 2009. O resultado veio após a contração observada em 2009 e foi acompanhado por crescimento nos três grandes setores da economia: agropecuária, indústria e serviços.</p>
      <h4 class="yc-why">Por que foi tão alto?</h4>
      <p>Foi um ano de forte recuperação após a contração de 2009, acompanhado por expansão em diferentes componentes da economia; nenhum fator isolado explica o resultado. ${baixa}</p>
      <ul class="yc-list">
        <li>O Banco Central descreve um cenário de recuperação do emprego e da renda e de ampliação do crédito, e o crescimento anual mais acentuado desde 1986.</li>
        <li>Na demanda, o IBGE registrou alta de ${pctSimples(c.release.valores["93404"])} no consumo das famílias e de ${pctSimples(c.release.valores["93406"])} na formação bruta de capital fixo; exportações ${pct(c.release.valores["93407"])} e importações ${pct(c.release.valores["93408"])}.</li>
        <li>Na oferta: agropecuária ${pct(c.release.valores["90687"])}, indústria ${pct(c.release.valores["90691"])} e serviços ${pct(c.release.valores["90696"])}.</li>
      </ul>
      <p class="yc-src">Fontes: <a href="${esc(c.release.url)}" target="_blank" rel="noopener">IBGE, ${c.release.data}: ${esc(c.release.titulo)}</a> · <a href="${esc(c.bcb.url)}" target="_blank" rel="noopener">${esc(c.bcb.titulo)}</a>.</p>`;
  } else {
    corpo = `<p>${r.taxa_aa >= 0 ? "O PIB cresceu" : "O PIB recuou"} ${fmtNum(Math.abs(r.taxa_aa), 1)}% em ${r.ano} contra ${r.ano - 1}, na série atual do IBGE.${divulgado !== undefined && divulgado !== r.taxa_aa ? ` Na divulgação da época, o resultado foi de ${pct(divulgado)}: o IBGE revisa a série.` : ""} ${baixa}</p>
      ${noticias.length ? "" : `<p class="yc-empty">Ainda não temos uma reportagem verificada sobre este ano; mostramos só os números do IBGE.</p>`}`;
  }
  const noticiasHtml = noticias.length
    ? `<div class="yc-news"><p class="yc-kicker mono">O que se noticiava</p>${noticias.map((n) => ctx.clip(n, { sum: true })).join("")}</div>` : "";

  $("#pib-year-card").innerHTML = `<header class="yc-head">
      <p class="yc-period mono">${periodo}${r.ano === new Date(PERIODO_CORTE).getFullYear() ? "" : ""}</p>
      <h3 class="yc-title">${titulo}</h3>
      <p class="yc-big" aria-label="${pct(r.taxa_aa, 2)} em ${r.ano}"><span class="tnum">${pct(r.taxa_aa, 2)}</span><small>em ${r.ano}</small></p>
      <p class="yc-what">Crescimento real do PIB em relação a ${r.ano - 1} (resultado do ano, série atual do IBGE).</p>
    </header>
    <div class="yc-body">${corpo}
      <table class="yc-table"><caption class="sr-only">Componentes do PIB em ${r.ano}, variação real anual</caption>
        <thead><tr><th scope="col">Componente (variação real no ano)</th><th scope="col">Série atual do IBGE</th>${eh2010 ? `<th scope="col">Release de ${PIB_2010.release.data}</th>` : ""}</tr></thead>
        <tbody>${linhas}</tbody></table>
      ${eh2010 ? `<p class="yc-rev">As duas colunas diferem porque o IBGE revisa as Contas Nacionais; o release traz o que foi divulgado na época.</p>` : ""}
      <aside class="caveat yc-caveat"><strong>Contexto, não causa.</strong> Indicadores que aparecem próximos no tempo ajudam a contextualizar um período, mas a coincidência entre movimentos não prova que um indicador tenha causado o outro.</aside>
    </div>
    ${noticiasHtml}`;
  $("#pib-year-hint").textContent = `Ano selecionado: ${r.ano}. Clique ou use as setas e Enter no gráfico acima para trocar.`;
}

function renderQuarterly(prod) {
  const box = $("#pib-quarter-chart");
  const serie = prod.serie_trimestral;
  const medidas = {
    interanual: { campo: "variacao_interanual", base: "contra o mesmo trimestre do ano anterior", nota: "Compara cada trimestre com o mesmo trimestre do ano anterior, sem ajuste sazonal." },
    dessazonalizada: { campo: "variacao_dessazonalizada", base: "contra o trimestre imediatamente anterior, com ajuste sazonal", nota: "Compara cada trimestre com o anterior, depois de retirar o efeito sazonal (dessazonalizado)." },
  };
  const m = medidas[quarterMeasure];
  const rows = serie.filter((q) => noRecorte(q.ano_mes)).map((q) => ({ iso: q.ano_mes, v: q[m.campo] })).filter((r) => !isNil(r.v));
  const ult0 = rows[rows.length - 1];
  const sub = $("#pib-quarter-sub");
  if (sub && ult0) sub.textContent = `De 2019 ao ${triLabel(serie.find((q) => q.ano_mes === ult0.iso).trimestre)} · dados trimestrais, sem interpolação`;
  $("#pib-quarter-basis").innerHTML = `<strong>Trimestral · ${m.base}.</strong> ${m.nota}`;
  const ultimo = rows[rows.length - 1];
  quarterChart = lineChart(box, {
    series: [{ rows, area: false, maxGap: 3 }],
    cutoff: PERIODO_CORTE, bands: "full", includeZero: true, headroom: 0.15, refY: 0, m0: monthIdx(PIB_JANELA_INICIO), m1: monthIdx(rows[rows.length - 1].iso),
    yFmt: (t, s) => `${fmtNum(t, s < 1 ? 1 : 0)}%`,
    annotations: ultimo ? [{ iso: ultimo.iso, v: ultimo.v, text: pct(ultimo.v), sub: triLabel(serie.find((q) => q.ano_mes === ultimo.iso).trimestre), signal: true }] : [],
    tooltip: (mi) => {
      const q = serie.find((s) => monthIdx(s.ano_mes) === mi);
      if (!q || isNil(q[m.campo])) return "";
      return `<div class="t-when">${triLabel(q.trimestre)} · trimestral</div><div class="t-val">${pct(q[m.campo], 1)}</div><div class="t-row"><span>base</span><b>${m.base.split(",")[0]}</b></div><div class="t-row"><span>fonte</span><b>IBGE, Contas Nacionais Trimestrais</b></div>`;
    },
    animate: false,
  });
  box.setAttribute("aria-label", `PIB trimestral, ${m.base}. Último dado: ${ultimo ? `${triLabel(serie.find((q) => q.ano_mes === ultimo.iso).trimestre)}, ${pct(ultimo.v)}` : "indisponível"}. Use as setas para ler trimestre a trimestre.`);
  document.querySelectorAll("#pib-quarter-toggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.q === quarterMeasure)));
}

export function bindPibControls(getProd) {
  $("#pib-quarter-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.dataset.q === quarterMeasure) return;
    quarterMeasure = b.dataset.q;
    renderQuarterly(getProd());
  });
}

// --------------------------------------------- "O que se movia dentro do PIB"
// Mesmo recorte (2019 -> ultimo ano) e mesmo eixo em todos os quadros. PIB e o
// quadro-lider; oferta em tres quadros iguais; demanda em 3 + 2 (larguras 2/6 e 3/6).
export function renderPibContext(prod) {
  const box = $("#multiples");
  const GRUPOS = [
    ["Produção / oferta", ["90707", "90687", "90691", "90696"]],
    ["Demanda", ["93404", "93405", "93406", "93407", "93408"]],
  ];
  box.classList.add("multiples--pib");
  const noJanela = (c) => c.serie_anual.filter((a) => noRecorte(`${a.ano}-01-01`));
  const cs = GRUPOS.flatMap(([, cods]) => cods).map((c) => comp(prod, c)).filter(Boolean);
  const anos = cs.flatMap((c) => noJanela(c).map((a) => a.ano));
  const ultAno = Math.max(...anos);
  const m0 = monthIdx(PIB_JANELA_INICIO), m1 = monthIdx(`${ultAno}-01-01`);
  $("#context-deck").textContent = `Cada quadro mostra a variação real anual (resultado do 4º trimestre) de uma parte do PIB, de 2019 a ${ultAno}, na escala do próprio quadro. Frequência anual; todos usam os dados reais do IBGE, sem valores estimados, repetidos ou convertidos para mensal.`;
  $("#context-caveat").innerHTML = `Indicadores que aparecem próximos no tempo ajudam a contextualizar um período, mas a coincidência entre movimentos não prova que um indicador tenha causado o outro. O PIB reflete consumo, investimento, gasto público e comércio exterior somados; nenhum fator isolado o explica.`;
  let html = "";
  let idx = 0;
  const charts = [];
  GRUPOS.forEach(([titulo, cods], gi) => {
    html += `<h3 class="mult-group">${titulo}</h3>`;
    cods.forEach((cod, ci) => {
      const c = comp(prod, cod);
      if (!c) return;
      const serie = noJanela(c);
      const ult = serie[serie.length - 1];
      const larg = cod === "90707" ? "mult--lead" : gi === 0 ? "mult--w2" : ci < 3 ? "mult--w2" : "mult--w3";
      html += `<div class="mult ${larg}${cod === "90707" ? " is-product" : ""}"><div class="mult-head"><span class="mult-name">${esc(c.nome)}</span><span class="mult-val">${pct(ult.taxa)}</span></div><p class="mult-desc">variação real · anual · contra o ano anterior · último: ${ult.ano}</p><div class="chart" id="pibc-${idx}" role="img" tabindex="0" aria-label="${esc(c.nome)}: variação real anual de 2019 a ${ult.ano}; ${ult.ano}: ${pct(ult.taxa)}."></div></div>`;
      charts.push({ id: `pibc-${idx}`, c, serie });
      idx++;
    });
  });
  box.innerHTML = html;
  charts.forEach(({ id, serie }) => {
    lineChart($(`#${id}`), {
      series: [{ rows: serie.map((a) => ({ iso: `${a.ano}-01-01`, v: a.taxa })), maxGap: 12 }],
      cutoff: PERIODO_CORTE, bands: "short", includeZero: true, refY: 0, yTickCount: 3, m0, m1,
      yFmt: (t) => `${fmtNum(t, 0)}%`,
      tooltip: (mi) => {
        const a = serie.find((x) => monthIdx(`${x.ano}-01-01`) === mi);
        return a ? `<div class="t-when">${a.ano} · anual</div><div class="t-val">${pct(a.taxa, 1)}</div><div class="t-row"><span>base</span><b>contra ${a.ano - 1}, real</b></div><div class="t-row"><span>fonte</span><b>IBGE</b></div>` : "";
      },
    });
  });
  $("#context-source").textContent = "Fonte: IBGE, Contas Nacionais Trimestrais (tabela 5932 do SIDRA); resultado anual = taxa acumulada no 4º trimestre. A série é atualizada e revista pelo IBGE; o ano em curso não tem resultado anual fechado e por isso não aparece.";
}
