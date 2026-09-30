// CUSTAVA QUANTO? — capítulo "Arquivo": a biblioteca de fontes por trás dos números.
//
// Só apresentação. Lê os mesmos itens de noticias.json que o resto do site usa (nenhum conjunto
// paralelo): cada item é uma fonte real, conferida na página original por scripts/build_news.py.
// Os filtros nascem dos dados; contagens e resultados são calculados na hora, nada é fixo no código.
// O Arquivo guarda a EVIDÊNCIA (de onde veio cada informação); a história em ordem cronológica
// fica no capítulo Contexto, e os dois se ligam por "Ver no Contexto" / "Ver no Arquivo".
import { esc, dataNoticia } from "./util.js";

const $ = (s, r = document) => r.querySelector(s);

const IND_ROTULO = {
  GASOLINA: "Gasolina", ETANOL: "Etanol", DIESEL: "Diesel", "DIESEL S10": "Diesel S10", GLP: "GLP", Arroz: "Arroz", "Feijão carioca": "Feijão",
  "Carne bovina (patinho)": "Carne", "Leite longa vida": "Leite", "Óleo de soja": "Óleo de soja", "Café moído": "Café", IPCA: "IPCA",
  SALARIO_REAL: "Salário mínimo", SM_GASOLINA: "Salário mínimo", SALARIO_NOMINAL: "Salário mínimo", DESOCUPACAO: "Desemprego", SUBUTILIZACAO: "Subutilização",
  RENDIMENTO: "Rendimento", PIB: "PIB", DOLAR: "Dólar", SELIC: "Selic", IBOVESPA: "Ibovespa",
};
const IND_ORDEM = ["Gasolina", "Etanol", "Diesel", "Diesel S10", "GLP", "Arroz", "Feijão", "Carne", "Leite", "Óleo de soja", "Café", "IPCA", "Salário mínimo", "Desemprego",
  "Subutilização", "Rendimento", "PIB", "Dólar", "Selic", "Ibovespa", "Combustíveis (geral)", "Alimentos (geral)", "Outros"];
const GRUPO_ROTULO = { combustiveis: "Combustíveis (geral)", alimentos: "Alimentos (geral)" };
const DIM_ROTULO = { custo_vida: "Custo de vida", inflacao: "Inflação", renda: "Renda", trabalho: "Mercado de trabalho", atividade: "Atividade", mercados: "Mercados" };
const TIPO_ROTULO = {
  choque_global: "Choque global", choque_externo: "Choque externo", choque_fiscal: "Reação a anúncio fiscal", politica_monetaria: "Política monetária",
  politica_fiscal: "Política fiscal", politica_tributaria: "Política tributária", politica_trabalhista: "Política trabalhista", politica_salarial: "Salário mínimo",
  politica_energetica: "Preço dos combustíveis", protecao_social: "Proteção social", regulatoria: "Regulação", comercio_exterior: "Comércio exterior",
  calamidade: "Calamidade", mercado: "Mercado", dado_oficial: "Dado oficial",
};
// No celular a lista vem em lotes menores: cada matéria ocupa a largura toda, com imagem.
const CELULAR = matchMedia("(max-width: 760px)");
const PAGINA = CELULAR.matches ? 8 : 24;

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function initArquivo({ NEWS }) {
  const raiz = $("#archive");
  if (!raiz) return;

  // ------------------------------------------------------------ registros (derivados dos mesmos itens)
  const itens = NEWS.map((n) => {
    const chips = [...new Set((n.indicadores || []).map((i) => IND_ROTULO[i]).filter(Boolean))];
    if (!chips.length) (n.produtos || []).forEach((t) => { if (GRUPO_ROTULO[t] && !chips.includes(GRUPO_ROTULO[t])) chips.push(GRUPO_ROTULO[t]); });
    if (!chips.length) chips.push("Outros");
    const dims = (n.dimensoes || []).map((d) => DIM_ROTULO[d]).filter(Boolean);
    const tipo = n.marco ? TIPO_ROTULO[n.marco.tipo] || "" : "";
    const resumo = (n.marco?.resumo || n.resumo || "").trim();
    return {
      n, chips, dims, tipo, resumo, ano: n.data.slice(0, 4),
      titN: norm(n.titulo), resN: norm(resumo),
      metaN: norm([n.veiculo, ...chips, ...dims, tipo, n.data.slice(0, 4), n.tema || "", (n.produtos || []).join(" ")].join(" ")),
    };
  });
  const total = itens.length;
  if (!total) { raiz.innerHTML = `<p class="arq-vazio">O arquivo ainda não foi carregado (data/processed/noticias.json).</p>`; return; }

  const contar = (fn) => { const m = new Map(); itens.forEach((it) => fn(it).forEach((v) => m.set(v, (m.get(v) || 0) + 1))); return m; };
  const porAno = contar((it) => [it.ano]);
  const porInd = contar((it) => it.chips);
  const porFonte = contar((it) => [it.n.veiculo]);
  const porDim = contar((it) => it.dims);
  const opcoes = (mapa, ordem) => (ordem || [...mapa.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"))).filter((k) => mapa.has(k))
    .map((k) => `<option value="${esc(k)}">${esc(k)} (${mapa.get(k)})</option>`).join("");

  const st = { q: "", ano: "", ind: "", fonte: "", dim: "", ordem: "recentes", mostrar: PAGINA };

  raiz.classList.add("arq");
  raiz.innerHTML = `
    <form class="arq-bar" role="search" aria-label="Pesquisar e filtrar o arquivo" autocomplete="off">
      <div class="arq-busca">
        <label for="arq-q" class="arq-lab mono">Pesquisar</label>
        <input id="arq-q" class="arq-input" type="search" placeholder="Pesquisar no arquivo..." enterkeyhint="search" spellcheck="false">
      </div>
      <details class="arq-fdet"${CELULAR.matches ? "" : " open"}><summary>Filtrar por ano, indicador, fonte ou dimensão</summary>
      <div class="arq-filtros">
        <div class="arq-f"><label for="arq-ano" class="arq-lab mono">Ano</label><select id="arq-ano"><option value="">Todos</option>${opcoes(porAno, [...porAno.keys()].sort())}</select></div>
        <div class="arq-f"><label for="arq-ind" class="arq-lab mono">Indicador</label><select id="arq-ind"><option value="">Todos</option>${opcoes(porInd, IND_ORDEM)}</select></div>
        <div class="arq-f"><label for="arq-fonte" class="arq-lab mono">Fonte</label><select id="arq-fonte"><option value="">Todas</option>${opcoes(porFonte)}</select></div>
        <div class="arq-f"><label for="arq-dim" class="arq-lab mono">Dimensão</label><select id="arq-dim"><option value="">Todas</option>${opcoes(porDim, Object.values(DIM_ROTULO))}</select></div>
        <div class="arq-f"><label for="arq-ordem" class="arq-lab mono">Ordenar</label><select id="arq-ordem"><option value="recentes">Mais recentes</option><option value="antigas">Mais antigas</option><option value="relevantes" disabled>Mais relevantes (com pesquisa)</option></select></div>
      </div>
      </details>
      <button type="button" class="arq-limpar" id="arq-limpar" hidden>Limpar pesquisa e filtros</button>
    </form>
    <p class="arq-count" id="arq-count" role="status" aria-live="polite"></p>
    <ul class="arq-list" id="arq-list"></ul>
    <button type="button" class="arq-mais" id="arq-mais" hidden></button>`;

  // ------------------------------------------------------------ filtro, pontuação e ordem
  function filtrar() {
    const toks = norm(st.q).split(/\s+/).filter(Boolean);
    let lista = itens.filter((it) =>
      (!st.ano || it.ano === st.ano) && (!st.ind || it.chips.includes(st.ind)) && (!st.fonte || it.n.veiculo === st.fonte) && (!st.dim || it.dims.includes(st.dim)));
    if (toks.length) {
      lista = lista.map((it) => {
        let pontos = 0;
        for (const t of toks) {
          const t1 = it.titN.includes(t), t2 = it.metaN.includes(t), t3 = it.resN.includes(t);
          if (!t1 && !t2 && !t3) return null; // todas as palavras precisam aparecer
          pontos += (t1 ? 3 : 0) + (t2 ? 2 : 0) + (t3 ? 1 : 0);
        }
        return { ...it, pontos };
      }).filter(Boolean);
    }
    const dt = (a, b) => a.n.data.localeCompare(b.n.data) || a.n.id.localeCompare(b.n.id);
    if (st.ordem === "antigas") lista.sort(dt);
    else if (st.ordem === "relevantes" && toks.length) lista.sort((a, b) => b.pontos - a.pontos || dt(b, a));
    else lista.sort((a, b) => dt(b, a));
    return lista;
  }

  const cartao = (it) => {
    const n = it.n;
    const foto = n.imagem
      ? `<figure class="arq-fig"><img src="${esc(n.imagem)}" alt="" width="96" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>Foto: ${esc(n.credito_imagem || n.veiculo)}</figcaption></figure>`
      : "";
    return `<li class="arq-item" id="arq-${esc(n.id)}" tabindex="-1">
      <div class="arq-main">
        <p class="arq-meta mono"><time datetime="${esc(n.data)}">${dataNoticia(n.data)}</time> · ${esc(n.veiculo)}${n.verificacao === "manual" ? " · conferida à mão" : ""}</p>
        <h3 class="arq-t"><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
        ${it.resumo ? `<p class="arq-s">${esc(it.resumo)}</p>` : ""}
        <ul class="arq-tags" aria-label="Indicadores relacionados">${it.chips.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
        <p class="arq-links"><a class="arq-src" href="${esc(n.url)}" target="_blank" rel="noopener">Leia a fonte →<span class="sr-only"> (${esc(n.veiculo)}, abre em nova aba)</span></a>${n.marco ? `<a class="arq-ctx" href="#contexto" data-ctx="${esc(n.id)}">Também aparece no Contexto · Ver no Contexto →</a>` : ""}</p>
      </div>
      ${foto}
    </li>`;
  };

  function desenhar() {
    const lista = filtrar();
    const ativos = !!(st.ano || st.ind || st.fonte || st.dim), busca = !!st.q.trim();
    const n = lista.length;
    $("#arq-count").textContent = busca
      ? `${n} ${n === 1 ? "resultado" : "resultados"} para “${st.q.trim()}”${ativos ? ", com os filtros aplicados" : ""}`
      : ativos ? `${n} ${n === 1 ? "fonte encontrada" : "fontes encontradas"}` : `${total} fontes no arquivo`;
    const rel = $("#arq-ordem option[value=relevantes]");
    rel.disabled = !busca;
    if (!busca && st.ordem === "relevantes") { st.ordem = "recentes"; $("#arq-ordem").value = "recentes"; }
    $("#arq-limpar").hidden = !(busca || ativos);
    const parte = lista.slice(0, st.mostrar);
    $("#arq-list").innerHTML = parte.length ? parte.map(cartao).join("") : `<li class="arq-vazio">Nenhuma fonte encontrada. Mude a pesquisa ou limpe os filtros.</li>`;
    const resto = n - parte.length;
    const mais = $("#arq-mais");
    mais.hidden = resto <= 0;
    mais.textContent = `Mostrar mais (${Math.min(PAGINA, resto)} de ${resto} restantes)`;
    return lista;
  }

  // ------------------------------------------------------------ eventos
  const reiniciar = () => { st.mostrar = PAGINA; desenhar(); };
  let atraso;
  $("#arq-q").addEventListener("input", (e) => { st.q = e.target.value; clearTimeout(atraso); atraso = setTimeout(reiniciar, 120); });
  raiz.querySelector("form").addEventListener("submit", (e) => e.preventDefault());
  [["ano", "#arq-ano"], ["ind", "#arq-ind"], ["fonte", "#arq-fonte"], ["dim", "#arq-dim"], ["ordem", "#arq-ordem"]].forEach(([k, sel]) =>
    $(sel).addEventListener("change", (e) => { st[k] = e.target.value; reiniciar(); }));
  CELULAR.addEventListener("change", () => { if (!CELULAR.matches) raiz.querySelector(".arq-fdet").open = true; });
  $("#arq-limpar").addEventListener("click", () => {
    Object.assign(st, { q: "", ano: "", ind: "", fonte: "", dim: "", ordem: "recentes" });
    $("#arq-q").value = ""; ["#arq-ano", "#arq-ind", "#arq-fonte", "#arq-dim"].forEach((s) => { $(s).value = ""; }); $("#arq-ordem").value = "recentes";
    reiniciar();
    $("#arq-q").focus();
  });
  $("#arq-mais").addEventListener("click", () => { st.mostrar += PAGINA; const antes = $("#arq-list").children.length; desenhar(); $("#arq-list").children[antes]?.querySelector("a")?.focus(); });
  raiz.addEventListener("click", (e) => {
    const c = e.target.closest("[data-ctx]");
    if (!c) return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent("ctx:mostrar", { detail: { id: c.dataset.ctx } }));
  });

  // Contexto → Arquivo: abre o registro daquela fonte (zera a busca e os filtros e garante que o item apareça)
  document.addEventListener("arq:abrir", (e) => {
    Object.assign(st, { q: "", ano: "", ind: "", fonte: "", dim: "", ordem: "recentes" });
    $("#arq-q").value = ""; ["#arq-ano", "#arq-ind", "#arq-fonte", "#arq-dim"].forEach((s) => { $(s).value = ""; }); $("#arq-ordem").value = "recentes";
    const lista = filtrar();
    const i = lista.findIndex((it) => it.n.id === e.detail.id);
    st.mostrar = Math.max(PAGINA, i < 0 ? PAGINA : Math.ceil((i + 1) / PAGINA) * PAGINA);
    desenhar();
    const alvo = document.getElementById(`arq-${e.detail.id}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    alvo.classList.add("arq-item--foco");
    alvo.focus({ preventScroll: true });
    setTimeout(() => alvo.classList.remove("arq-item--foco"), 2600);
  });

  desenhar();
}
