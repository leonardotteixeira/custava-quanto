// CUSTAVA QUANTO? — capítulo "Análise: o que os dados mostram?"
//
// Regra deste módulo: nenhum número é digitado aqui. Tudo vem pronto de
// data/processed/analise.json (gerado por scripts/build_analise.py a partir
// dos mesmos resumo_periodos que a página "Períodos" já usa). O JS só
// escolhe, formata e soma CONTAGENS descritivas (quantos indicadores subiram,
// por exemplo) — nunca uma nota, pontuação ou "vencedor".
import { esc, fmtNum, mesAno, dataCurta } from "./util.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let A = null;
let lente = "todos";

async function getJSON(url) {
  try { const r = await fetch(url, { cache: "no-cache" }); return r.ok ? await r.json() : null; } catch { return null; }
}

const pct = (v, d = 1) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtNum(v, d)}%`);
const pp = (v, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtNum(v, d)} p.p.`);
// PIB é anual (resultado do ano, lido no 4º trimestre): "jan/2022" confundiria com um mês
// específico. Os demais indicadores usam mesAno normalmente.
const dataFmt = (iso, diario, anual) => (iso ? (diario ? dataCurta(iso) : anual ? iso.slice(0, 4) : mesAno(iso)) : "—");

// leitura única do "resultado" de um indicador, qualquer que seja o tipo de variação
function leitura(campo) {
  if (!campo) return { texto: "sem dado", v: null };
  if (campo.variacao_pp != null) return { texto: pp(campo.variacao_pp), v: campo.variacao_pp, tipo: "pp" };
  if (campo.variacao_real_pct != null) return { texto: `${pct(campo.variacao_real_pct)} reais`, v: campo.variacao_real_pct, tipo: "real" };
  if (campo.variacao_nominal_pct != null) return { texto: `${pct(campo.variacao_nominal_pct)} nominal`, v: campo.variacao_nominal_pct, tipo: "nominal" };
  if (campo.variacao_pct != null) return { texto: pct(campo.variacao_pct), v: campo.variacao_pct, tipo: "pct" };
  return { texto: "sem dado", v: null };
}

function cardIndicador(ind) {
  if (ind.excluido) {
    return `<article class="an-card an-card--excluido"><h4>${esc(ind.codigo)}</h4><p class="an-excl">Não incluído nesta análise: ${esc(ind.motivo)}.</p></article>`;
  }
  const lb = leitura(ind.bolsonaro), ll = leitura(ind.lula);
  return `<article class="an-card" data-codigo="${esc(ind.codigo)}">
    <h4 class="an-card-h">${esc(ind.nome || ind.codigo)}</h4>
    <div class="an-card-per">
      <div class="an-per"><span class="an-per-tag" data-gov="b">Bolsonaro</span><span class="an-per-when">${dataFmt(ind.bolsonaro?.inicio, ind.bolsonaro?.diario, ind.codigo === "PIB")} → ${dataFmt(ind.bolsonaro?.fim, ind.bolsonaro?.diario, ind.codigo === "PIB")}</span><span class="an-per-val">${esc(lb.texto)}</span></div>
      <div class="an-per"><span class="an-per-tag" data-gov="l">Lula${ind.lula?.periodo_incompleto ? " · em curso" : ""}</span><span class="an-per-when">${dataFmt(ind.lula?.inicio, ind.lula?.diario, ind.codigo === "PIB")} → ${dataFmt(ind.lula?.fim, ind.lula?.diario, ind.codigo === "PIB")}</span><span class="an-per-val">${esc(ll.texto)}</span></div>
    </div>
    <p class="an-card-meta">Fonte: ${esc(ind.fonte)} · frequência: ${esc(ind.frequencia)}</p>
  </article>`;
}

function renderDimensao(dim) {
  const ativos = dim.indicadores.filter((i) => !i.excluido);
  const n_alta_b = ativos.filter((i) => (leitura(i.bolsonaro).v ?? 0) > 0).length;
  const n_alta_l = ativos.filter((i) => (leitura(i.lula).v ?? 0) > 0).length;
  const resumo = ativos.length
    ? `Dos ${ativos.length} indicadores desta dimensão, ${n_alta_b} tiveram variação positiva no período Bolsonaro e ${n_alta_l} no período Lula (${ativos.length - n_alta_b} e ${ativos.length - n_alta_l}, respectivamente, tiveram variação negativa ou nula). Isso descreve a direção dos números — não diz se um resultado é bom ou ruim para quem lê.`
    : "Nenhum indicador desta dimensão pôde ser comparado nos dois períodos.";
  return `<section class="an-dim" id="an-${dim.id}" data-dim="${dim.id}">
    <h3 class="an-dim-title">${esc(dim.titulo)}</h3>
    <p class="an-dim-exp">${esc(dim.explicacao)}</p>
    <div class="an-cards">${dim.indicadores.map(cardIndicador).join("")}</div>
    <p class="an-dim-resumo">${resumo}</p>
  </section>`;
}

function renderMatriz() {
  const linhas = A.dimensoes.map((dim) => {
    const ativos = dim.indicadores.filter((i) => !i.excluido);
    const nomes = ativos.map((i) => i.nome || i.codigo).join(", ") || "—";
    const altaB = ativos.filter((i) => (leitura(i.bolsonaro).v ?? 0) > 0).length;
    const altaL = ativos.filter((i) => (leitura(i.lula).v ?? 0) > 0).length;
    const resultado = ativos.length
      ? `${altaB}/${ativos.length} em alta no período Bolsonaro · ${altaL}/${ativos.length} em alta no período Lula`
      : "sem dado comparável";
    return `<tr><th scope="row">${esc(dim.titulo)}</th><td>${esc(nomes)}</td><td>${resultado}</td></tr>`;
  }).join("");
  return `<table class="an-matriz"><caption class="sr-only">Síntese dos indicadores por dimensão</caption>
    <thead><tr><th scope="col">Dimensão</th><th scope="col">Indicadores observados</th><th scope="col">Resultado observado</th></tr></thead>
    <tbody>${linhas}</tbody></table>`;
}

function renderSintese() {
  const todos = A.dimensoes.flatMap((d) => d.indicadores.filter((i) => !i.excluido));
  const positivosB = todos.filter((i) => (leitura(i.bolsonaro).v ?? 0) > 0).length;
  const positivosL = todos.filter((i) => (leitura(i.lula).v ?? 0) > 0).length;
  return `<p>Ao todo, ${todos.length} indicadores foram comparados nos dois períodos. ${positivosB} deles tiveram variação positiva durante o governo Bolsonaro e ${positivosL} durante o governo Lula (até o momento, já que esse período segue em curso). Os dados não apontam para uma única direção em todos os indicadores: eles se movem de formas diferentes conforme a dimensão observada — custo de vida, inflação, renda, atividade econômica ou mercados — e conforme a métrica usada (nominal, real, ou em pontos percentuais).</p>
  <p>Quem quiser uma leitura de "qual governo foi melhor" precisa decidir, por conta própria, quais indicadores pesam mais para essa pergunta — o que é uma escolha de valores, não um fato que os dados produzam sozinhos.</p>`;
}

function renderLinhaTempo() {
  const evs = A.contexto_externo;
  return `<ul class="an-timeline">${evs.map((e) => `<li><time datetime="${e.iso}">${mesAno(e.iso)}</time><span>${esc(e.texto)}</span><span class="an-tl-src">${esc(e.fonte)}</span></li>`).join("")}</ul>`;
}

function renderAuditoria() {
  const linhas = A.dimensoes.flatMap((d) => d.indicadores.filter((i) => !i.excluido).map((i) => ({ ...i, dim: d.titulo })));
  return `<div class="table-scroll"><table class="an-audit">
    <caption class="sr-only">Auditoria: fonte, período e frequência de cada indicador</caption>
    <thead><tr><th scope="col">Indicador</th><th scope="col">Dimensão</th><th scope="col">Fonte</th><th scope="col">Frequência</th><th scope="col">Bolsonaro (período)</th><th scope="col">Lula (período)</th></tr></thead>
    <tbody>${linhas.map((i) => `<tr><th scope="row">${esc(i.nome || i.codigo)}</th><td>${esc(i.dim)}</td><td>${esc(i.fonte)}</td><td>${esc(i.frequencia)}</td><td>${dataFmt(i.bolsonaro?.inicio, i.bolsonaro?.diario, i.codigo === "PIB")} → ${dataFmt(i.bolsonaro?.fim, i.bolsonaro?.diario, i.codigo === "PIB")}</td><td>${dataFmt(i.lula?.inicio, i.lula?.diario, i.codigo === "PIB")} → ${dataFmt(i.lula?.fim, i.lula?.diario, i.codigo === "PIB")}</td></tr>`).join("")}</tbody>
  </table></div>`;
}

function aplicarLente() {
  $$(".an-dim").forEach((el) => { el.hidden = lente !== "todos" && el.dataset.dim !== lente; });
  $$("#an-lente button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lente === lente)));
}

export async function initAnalise() {
  const sec = $("#analise");
  if (!sec) return;
  A = await getJSON("../data/processed/analise.json");
  if (!A) {
    $("#an-body").innerHTML = `<p class="story-lede">Não foi possível carregar a análise (<code>data/processed/analise.json</code>). Rode <code>scripts/build_analise.py</code>.</p>`;
    return;
  }
  $("#an-periodos-b").textContent = A.periodos.bolsonaro.label;
  $("#an-periodos-l").textContent = A.periodos.lula.label;
  $("#an-pb-when").textContent = `${mesAno(A.periodos.bolsonaro.inicio)} – ${mesAno(A.periodos.bolsonaro.fim)}`;
  $("#an-pl-when").textContent = `${mesAno(A.periodos.lula.inicio)} – último dado disponível`;
  $("#an-dimensoes").innerHTML = A.dimensoes.map(renderDimensao).join("");
  $("#an-matriz").innerHTML = renderMatriz();
  $("#an-sintese").innerHTML = renderSintese();
  $("#an-timeline").innerHTML = renderLinhaTempo();
  $("#an-audit").innerHTML = renderAuditoria();
  $("#an-pesos").innerHTML = `<p class="an-pesos-nota">${esc(A.metodologia.pesos_nota)}</p>
    <ul class="an-pesos-list">${A.metodologia.pesos.map((p) => `<li><span>${esc(A.dimensoes.find((d) => d.id === p.id)?.titulo || p.id)}</span><b>${Math.round(p.peso * 100)}%</b></li>`).join("")}</ul>`;
  $("#an-passos").innerHTML = A.metodologia.passos.map((p, i) => `<li><span class="an-passo-n mono">${String(i + 1).padStart(2, "0")}</span>${esc(p)}</li>`).join("");
  const lensBox = $("#an-lente");
  lensBox.innerHTML = ["todos", ...A.dimensoes.map((d) => d.id)].map((id) => {
    const label = id === "todos" ? "Todos os indicadores" : A.dimensoes.find((d) => d.id === id).titulo;
    return `<button type="button" data-lente="${id}" aria-pressed="${id === "todos"}">${esc(label)}</button>`;
  }).join("");
  lensBox.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    lente = b.dataset.lente; aplicarLente();
  });
  aplicarLente();
}
