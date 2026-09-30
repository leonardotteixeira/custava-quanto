// CUSTAVA QUANTO? — linha do tempo do período (capítulo Contexto).
//
// Só apresentação. Os marcos vêm de noticias.json (itens com o campo "marco"), curados em
// data/news/marcos.json e conferidos na página de origem por scripts/build_news.py. Contexto,
// não causa: cada item aparece pela data em que ocorreu, com a fonte original.
import { esc, dataNoticia } from "./util.js";

const $ = (s, r = document) => r.querySelector(s);

const DIM = { custo_vida: "Custo de vida", inflacao: "Inflação", renda: "Renda", trabalho: "Mercado de trabalho", atividade: "Atividade", mercados: "Mercados" };
const IND = {
  GASOLINA: "Gasolina", ETANOL: "Etanol", DIESEL: "Diesel", "DIESEL S10": "Diesel S10", GLP: "Gás de cozinha", Arroz: "Arroz", "Feijão carioca": "Feijão",
  "Carne bovina (patinho)": "Carne", "Leite longa vida": "Leite", "Óleo de soja": "Óleo de soja", "Café moído": "Café", IPCA: "IPCA", SALARIO_REAL: "Salário mínimo real",
  SM_GASOLINA: "Litros de gasolina por salário mínimo", SALARIO_NOMINAL: "Salário mínimo", DESOCUPACAO: "Taxa de desocupação", SUBUTILIZACAO: "Taxa de subutilização",
  RENDIMENTO: "Rendimento médio real", PIB: "PIB", DOLAR: "Dólar", SELIC: "Selic", IBOVESPA: "Ibovespa",
};
const TIPO = {
  choque_global: "Choque global", choque_externo: "Choque externo", choque_fiscal: "Reação a anúncio fiscal", politica_monetaria: "Política monetária",
  politica_fiscal: "Política fiscal", politica_tributaria: "Política tributária", politica_trabalhista: "Política trabalhista", politica_salarial: "Salário mínimo",
  politica_energetica: "Preço dos combustíveis", protecao_social: "Proteção social", regulatoria: "Regulação", comercio_exterior: "Comércio exterior",
  calamidade: "Calamidade", mercado: "Mercado", dado_oficial: "Dado oficial",
};

export function initLinhaDoTempo({ NEWS }) {
  const box = $("#ctx-tl");
  if (!box) return;
  const marcos = NEWS.filter((n) => n.marco).sort((a, b) => a.data.localeCompare(b.data));
  if (!marcos.length) { box.hidden = true; return; }
  const st = { dim: "todas", todos: false };
  const anos = [...new Set(marcos.map((m) => m.data.slice(0, 4)))];
  const veic = new Set(marcos.map((m) => m.veiculo)).size;

  const item = (n) => {
    const m = n.marco;
    const foto = n.imagem
      ? `<figure class="tl-fig"><img src="${esc(n.imagem)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"><figcaption>Foto: ${esc(n.credito_imagem || n.veiculo)}</figcaption></figure>`
      : "";
    return `<li class="tl-item" id="tl-${esc(n.id)}" tabindex="-1">
      ${foto}
      <div class="tl-body">
        <p class="tl-meta mono"><time datetime="${esc(n.data)}">${dataNoticia(n.data)}</time> · ${esc(TIPO[m.tipo] || m.tipo)} · ocorreu no período ${n.data < "2023-01-01" ? "Bolsonaro" : "Lula"}</p>
        <h4 class="tl-t"><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.titulo)}</a> <span class="tl-src mono">${esc(n.veiculo)}</span></h4>
        <p class="tl-s">${esc(m.resumo)}</p>
        <p class="tl-rel mono">Relacionado a: ${m.indicadores.map((i) => esc(IND[i] || i)).join(", ")}</p>
        <a class="tl-link" href="${esc(n.url)}" target="_blank" rel="noopener">Leia a fonte →<span class="sr-only"> (${esc(n.veiculo)}, abre em nova aba)</span></a> <a class="tl-arq" href="#arquivo" data-arq="${esc(n.id)}">Ver no Arquivo →</a>
      </div></li>`;
  };

  function desenhar() {
    const lista = marcos.filter((n) => (st.dim === "todas" || n.marco.dimensoes.includes(st.dim)) && (st.todos || n.marco.relevancia === "alta"));
    const total = marcos.filter((n) => st.dim === "todas" || n.marco.dimensoes.includes(st.dim)).length;
    $("#tl-count").textContent = `${lista.length} de ${total} marcos${st.dim === "todas" ? "" : ` em ${DIM[st.dim].toLowerCase()}`}${st.todos ? "" : " (só os de maior relevância)"}.`;
    $("#tl-more").textContent = st.todos ? "Mostrar só os de maior relevância" : `Mostrar todos os ${total}`;
    $("#tl-more").setAttribute("aria-pressed", String(st.todos));
    $$dim().forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dim === st.dim)));
    const porAno = new Map();
    lista.forEach((n) => { const y = n.data.slice(0, 4); (porAno.get(y) || porAno.set(y, []).get(y)).push(n); });
    $("#tl-years").innerHTML = anos.filter((y) => porAno.has(y)).map((y) => `<article class="tl-year" aria-label="${y}">
        <div class="tl-side"><p class="tl-y">${y}</p><span class="tl-per mono">Governo ${+y < 2023 ? "Bolsonaro" : "Lula"}</span><span class="tl-n mono">${porAno.get(y).length} ${porAno.get(y).length === 1 ? "marco" : "marcos"}</span></div>
        <ul class="tl-list">${porAno.get(y).map(item).join("")}</ul></article>`).join("") || `<p class="tl-vazio">Nenhum marco nesta seleção.</p>`;
  }
  const $$dim = () => [...box.querySelectorAll(".tl-dim")];

  box.innerHTML = `<header class="tl-head">
      <p class="ch-kicker mono">Linha do tempo</p>
      <h3 class="tl-title">O que estava acontecendo, ano a ano.</h3>
      <p class="tl-deck">${marcos.length} marcos verificados na fonte original, de ${anos[0]} a ${anos[anos.length - 1]}, de ${veic} veículos e órgãos oficiais. Cada um aparece pela data em que ocorreu. <strong>Proximidade no tempo não é evidência de causalidade.</strong> A densidade segue a relevância de cada época: não há uma notícia por mês.</p>
    </header>
    <div class="tl-ctl">
      <div class="tl-dims" role="group" aria-label="Filtrar por dimensão"><button type="button" class="tl-dim" data-dim="todas" aria-pressed="true">Todas</button>${Object.entries(DIM).map(([k, v]) => `<button type="button" class="tl-dim" data-dim="${k}" aria-pressed="false">${v}</button>`).join("")}</div>
      <button type="button" class="tl-more" id="tl-more" aria-pressed="false"></button>
    </div>
    <p class="tl-count mono" id="tl-count" aria-live="polite"></p>
    <div class="tl-years" id="tl-years"></div>`;
  box.addEventListener("click", (e) => {
    const a = e.target.closest("[data-arq]");
    if (a) { e.preventDefault(); document.dispatchEvent(new CustomEvent("arq:abrir", { detail: { id: a.dataset.arq } })); return; }
    const d = e.target.closest(".tl-dim");
    if (d) { st.dim = d.dataset.dim; desenhar(); return; }
    if (e.target.closest("#tl-more")) { st.todos = !st.todos; desenhar(); }
  });
  desenhar();

  // Arquivo → Contexto: mostra o marco na linha do tempo (zera o filtro e, se for de relevância média, mostra todos)
  document.addEventListener("ctx:mostrar", (e) => {
    const n = marcos.find((m) => m.id === e.detail.id);
    if (!n) return;
    st.dim = "todas";
    if (n.marco.relevancia !== "alta") st.todos = true;
    desenhar();
    const alvo = document.getElementById(`tl-${n.id}`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    alvo.classList.add("tl-item--foco");
    alvo.focus({ preventScroll: true });
    setTimeout(() => alvo.classList.remove("tl-item--foco"), 2600);
  });
}
