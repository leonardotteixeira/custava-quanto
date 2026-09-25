// CUSTAVA QUANTO? — utilitários compartilhados.
//
// Regra do projeto: nenhum cálculo econômico acontece no navegador. Tudo
// (médias, deflação, índices, resumos por período) vem pronto de
// scripts/build_dashboard_data.py. Aqui só há formatação e razões de
// exibição entre valores já prontos (variação entre dois meses, rebase para
// 100 num mês escolhido, largura de barras).

export const PERIODO_CORTE = "2023-01-01";

// Ordem editorial e textos de cada história. `slug` vira ?historia= na URL.
export const PRODUCT_ORDER = [
  "GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP",
  "Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído",
  "DOLAR", "IBOVESPA", "SELIC", "IPCA",
];

export const META = {
  "GASOLINA": { slug: "gasolina", curto: "Gasolina", titulo: "Gasolina comum", de: "da gasolina comum", sem: "de gasolina comum" },
  "ETANOL": { slug: "etanol", curto: "Etanol", titulo: "Etanol hidratado", de: "do etanol", sem: "de etanol" },
  "DIESEL": { slug: "diesel", curto: "Diesel", titulo: "Diesel comum (S500)", de: "do diesel comum", sem: "de diesel comum" },
  "DIESEL S10": { slug: "diesel-s10", curto: "Diesel S10", titulo: "Diesel S10", de: "do diesel S10", sem: "de diesel S10" },
  "GLP": { slug: "gas", curto: "Gás de cozinha", titulo: "Gás de cozinha", de: "do botijão de gás", sem: "de gás de cozinha" },
  "Arroz": { slug: "arroz", curto: "Arroz", titulo: "Arroz", de: "do arroz", sem: "de arroz" },
  "Feijão carioca": { slug: "feijao", curto: "Feijão", titulo: "Feijão carioca", de: "do feijão carioca", sem: "de feijão" },
  "Carne bovina (patinho)": { slug: "carne", curto: "Carne", titulo: "Carne bovina", de: "da carne (patinho)", sem: "de carne" },
  "Leite longa vida": { slug: "leite", curto: "Leite", titulo: "Leite longa vida", de: "do leite longa vida", sem: "de leite" },
  "Óleo de soja": { slug: "oleo", curto: "Óleo de soja", titulo: "Óleo de soja", de: "do óleo de soja", sem: "de óleo de soja" },
  "Café moído": { slug: "cafe", curto: "Café", titulo: "Café moído", de: "do café moído", sem: "de café" },
  "DOLAR": { slug: "dolar", curto: "Dólar", titulo: "Dólar", de: "do dólar", sem: "dólares" },
  "IBOVESPA": { slug: "ibovespa", curto: "Ibovespa", titulo: "Ibovespa", de: "do Ibovespa", sem: "do Ibovespa" },
  "SELIC": { slug: "selic", curto: "Selic", titulo: "Taxa Selic", de: "da Selic", sem: "da Selic" },
  "IPCA": { slug: "ipca", curto: "Inflação (IPCA)", titulo: "Inflação", de: "da inflação", sem: "da inflação" },
};

// Família de cada história (índice e contexto).
export function familia(prod) {
  if (prod.tipo === "combustivel") return "comb";
  if (prod.tipo === "alimento_indice") return "alim";
  return "merc";
}

// Como ler o valor de cada tipo — nunca misturar R$, índice, taxa e pontos.
//   preco  : combustível e dólar (R$ de verdade)
//   indice : alimentos (índice relativo, NÃO é R$)
//   taxa   : Selic e IPCA 12 meses (% ao ano; variação em p.p.)
//   pontos : Ibovespa
export function kind(prod) {
  if (prod.tipo === "combustivel" || prod.tipo === "cambio") return "preco";
  if (prod.tipo === "alimento_indice") return "indice";
  return prod.tipo; // "taxa" | "pontos"
}
export function nativeValue(prod) {
  switch (kind(prod)) {
    case "preco": return (r) => r.preco_nominal;
    case "indice": return (r) => r.indice_relativo;
    case "taxa": return (r) => r.taxa_aa;
    default: return (r) => r.pontos;
  }
}

// ------------------------------------------------------------ formatação
export const isNil = (v) => v === null || v === undefined || Number.isNaN(v);
const MINUS = "−";
export const fmtNum = (v, d = 1) => isNil(v) ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtInt = (v) => isNil(v) ? "—" : Math.round(v).toLocaleString("pt-BR");
export const fmtBRL = (v, d = 2) => isNil(v) ? "—" : `R$ ${fmtNum(v, d)}`;
export const sign = (v) => (v > 0 ? "+" : v < 0 ? MINUS : "");
export const fmtPct = (v, d = 1) => isNil(v) ? "—" : `${sign(round(v, d))}${fmtNum(Math.abs(v), d)}%`;
export const fmtPP = (v, d = 2) => isNil(v) ? "—" : `${sign(round(v, d))}${fmtNum(Math.abs(v), d)} p.p.`;
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// Valor na unidade nativa do produto.
export function fmtValue(prod, v, { compact = false } = {}) {
  if (isNil(v)) return "—";
  switch (kind(prod)) {
    case "preco": return fmtBRL(v, 2);
    case "indice": return fmtNum(v, 1);
    case "taxa": return `${fmtNum(v, 2)}%`;
    default: return compact ? `${fmtNum(v / 1000, 1)} mil pts` : `${fmtInt(v)} pts`;
  }
}
// Mesmo valor, em HTML com unidade miúda (para números grandes).
export function fmtValueHTML(prod, v) {
  if (isNil(v)) return "—";
  switch (kind(prod)) {
    case "preco": return `<span class="cur">R$</span>${fmtNum(v, 2)}`;
    case "indice": return `${fmtNum(v, 1)}<span class="suf">índice</span>`;
    case "taxa": return `${fmtNum(v, 2)}<span class="suf">%</span>`;
    default: return `${fmtInt(v)}<span class="suf">pts</span>`;
  }
}

// Variação entre dois valores já prontos: taxa em p.p., o resto em %.
export function change(prod, a, b) {
  if (isNil(a) || isNil(b) || (kind(prod) !== "taxa" && a === 0)) return { v: null, unit: "%" };
  return kind(prod) === "taxa" ? { v: b - a, unit: "p.p." } : { v: (b / a - 1) * 100, unit: "%" };
}
export const fmtChange = (c, d) => (c.unit === "p.p." ? fmtPP(c.v, d ?? 2) : fmtPct(c.v, d ?? 1));

// ------------------------------------------------------------ datas
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const mesAno = (iso) => `${MESES[+iso.slice(5, 7) - 1]}/${iso.slice(0, 4)}`;
export const mesAnoCurto = (iso) => `${MESES[+iso.slice(5, 7) - 1]}/${iso.slice(2, 4)}`;
export const mesAnoLongo = (iso) => `${MESES_LONGO[+iso.slice(5, 7) - 1]} de ${iso.slice(0, 4)}`;
export const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const dataNoticia = (iso) => `${+iso.slice(8, 10)} ${MESES[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const mesKey = (iso) => iso.slice(0, 7);
// Índice absoluto do mês (para eixo temporal que respeita meses ausentes).
export const monthIdx = (iso) => (+iso.slice(0, 4)) * 12 + (+iso.slice(5, 7) - 1);
export const idxToIso = (m) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}-01`;
export const periodoDe = (iso) => (iso < PERIODO_CORTE ? "Bolsonaro" : "Lula");

// ------------------------------------------------------------ séries
export const lastValid = (rows, get) => { for (let i = rows.length - 1; i >= 0; i--) if (!isNil(get(rows[i]))) return rows[i]; return null; };
export const firstValid = (rows, get) => rows.find((r) => !isNil(get(r))) || null;
export const rowAt = (rows, iso) => rows.find((r) => mesKey(r.ano_mes) === mesKey(iso)) || null;

// Ponto de partida das comparações: "troca" = último mês do governo
// Bolsonaro com dado (dez/2022); "inicio" = primeiro mês da série.
export function baseRow(prod, base) {
  const get = nativeValue(prod);
  const rows = prod.serie_mensal;
  if (base === "inicio") return firstValid(rows, get);
  const antes = rows.filter((r) => r.periodo === "Bolsonaro" && !isNil(get(r)));
  return antes.length ? antes[antes.length - 1] : firstValid(rows, get);
}

// ------------------------------------------------------------ DOM
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const pmark = (periodo) => `<span class="pmark${periodo === "Lula" ? " pmark--l" : ""}" aria-hidden="true"></span>`;
export function setPressed(group, btn) {
  $$("button", group).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
}

// Número que conta até o valor final (só nos números-protagonista).
export function countTo(el, to, render, dur = 650) {
  const from = parseFloat(el.dataset.v);
  el.dataset.v = to;
  if (isNil(to) || Number.isNaN(from) || reduceMotion() || from === to) { el.innerHTML = render(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.innerHTML = render(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
