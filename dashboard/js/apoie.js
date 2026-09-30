// CUSTAVA QUANTO? — capítulo "Apoie": valor sugerido, Pix Copia e Cola e QR Code.
//
// A chave, o nome e a cidade do recebedor ficam em `apoie.config.js` (é lá que se
// coloca a chave real). Este arquivo não guarda nenhum dado de pagamento.
//
// O que o site faz: monta o "Pix Copia e Cola" no padrão BR Code do Banco Central
// (EMV QRCPS, com CRC16/CCITT-FALSE) e desenha o QR Code desse mesmo texto. O que o
// site NÃO faz: processar, receber ou confirmar pagamento. A transferência acontece
// no aplicativo do banco de quem paga.
import { PIX_KEY, MERCHANT_NAME, MERCHANT_CITY } from "./apoie.config.js";

// Cópia mutável da configuração: é o que a página lê (permite testar sem editar o
// arquivo de configuração). Em produção, vale o que está em apoie.config.js.
export const PIX_CONFIG = { key: PIX_KEY, name: MERCHANT_NAME, city: MERCHANT_CITY };

// Outras formas de apoio (cartão, Mercado Pago, Stripe, Apoia.se…) entram aqui
// quando existirem de verdade: { id, label, url }. Só as configuradas aparecem.
export const OUTROS_METODOS = [];

const $ = (s, r = document) => r.querySelector(s);
const SUGESTOES = [10, 25, 50, 100];
const VALOR_MIN = 1, VALOR_MAX = 100000;
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// ---------------------------------------------------------------- valores
// "12,50" | "12.50" | "1.234,56" -> 12.5 | 12.5 | 1234.56 ; inválido -> NaN
export function parseValor(txt) {
  let t = String(txt).trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!t || /[^0-9.,]/.test(t)) return NaN;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1 || /^\d{1,3}\.\d{3}$/.test(t)) t = t.replace(/\./g, ""); // "1.500" = mil e quinhentos
  const v = Number(t);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}

// ------------------------------------------------- Pix Copia e Cola (BR Code)
// Estrutura do Manual do BR Code (Banco Central): cada campo é ID(2) + tamanho(2) + valor.
//   00 formato = 01 · 01 tipo de QR = 11 (estático) · 26 conta (00 = br.gov.bcb.pix, 01 = chave)
//   52 categoria = 0000 · 53 moeda = 986 (BRL) · 54 valor · 58 país = BR
//   59 nome do recebedor (≤ 25) · 60 cidade (≤ 15) · 62 dados adicionais (05 = "***")
//   63 CRC16 (polinômio 0x1021, valor inicial 0xFFFF) sobre todo o texto até "6304".
const tlv = (id, v) => `${id}${String(v.length).padStart(2, "0")}${v}`;
export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
export function pixPayload({ key, name, city }, valor) {
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  let p = tlv("00", "01") + tlv("01", "11") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986");
  if (valor) p += tlv("54", valor.toFixed(2));
  p += tlv("58", "BR") + tlv("59", semAcento(name).slice(0, 25)) + tlv("60", semAcento(city || "BRASIL").slice(0, 15)) + tlv("62", tlv("05", "***"));
  p += "6304";
  return p + crc16(p);
}

// ---------------------------------------------------------------- configuração
const ehPlaceholder = (v) => !String(v || "").trim() || /^COLOQUE_/i.test(String(v).trim());
export function estadoConfig(cfg = PIX_CONFIG) {
  const key = String(cfg.key || "").trim();
  const nome = semAcento(cfg.name || "").slice(0, 25);
  const faltam = [];
  if (ehPlaceholder(key)) faltam.push("PIX_KEY");
  else if (key.length > 77) faltam.push("PIX_KEY (mais de 77 caracteres)");
  if (ehPlaceholder(cfg.name) || !nome) faltam.push("MERCHANT_NAME");
  return { key: ehPlaceholder(key) ? "" : key, chaveOk: !faltam.some((f) => f.startsWith("PIX_KEY")), pronto: faltam.length === 0, faltam };
}

// ---------------------------------------------------------------- QR Code
// Biblioteca: qrcode-generator (Kazuhiko Arase, MIT), copiada para dashboard/vendor/.
// Só é carregada quando há um QR para desenhar.
let promessaQR = null;
function carregarQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!promessaQR) {
    promessaQR = new Promise((ok, erro) => {
      const s = document.createElement("script");
      s.src = "vendor/qrcode-generator.js";
      s.onload = () => (window.qrcode ? ok(window.qrcode) : erro(new Error("biblioteca de QR sem retorno")));
      s.onerror = () => { promessaQR = null; erro(new Error("não foi possível carregar a biblioteca de QR")); };
      document.head.appendChild(s);
    });
  }
  return promessaQR;
}
export function qrSvg(qrcode, texto, rotulo) {
  const qr = qrcode(0, "M");            // versão automática, correção de erro M
  qr.addData(texto, "Byte");
  qr.make();
  const n = qr.getModuleCount(), q = 4, lado = n + 2 * q; // 4 módulos de margem clara (padrão)
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  return `<svg viewBox="0 0 ${lado} ${lado}" role="img" aria-label="${rotulo}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${lado}" height="${lado}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

// ---------------------------------------------------------------- estado e tela
const st = { valor: null, outro: false, gen: 0 };
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function renderValores() {
  const box = $("#ap-amounts");
  box.innerHTML = SUGESTOES.map((v) => `<button type="button" data-v="${v}" aria-pressed="${!st.outro && st.valor === v}">${brl.format(v).replace(",00", "")}</button>`).join("")
    + `<button type="button" data-v="outro" aria-pressed="${st.outro}">Outro valor</button>`;
}

function qrBox(html, txt, vazio) {
  $("#ap-qr").classList.toggle("ap-qr--vazio", !!vazio);
  $("#ap-qr-img").innerHTML = html || "";
  $("#ap-qr-txt").textContent = txt || "";
}

async function renderPix() {
  const cfg = estadoConfig();
  const body = $("#ap-pix-body");
  const gen = ++st.gen;
  $("#ap-pix-amount").textContent = st.valor ? `Valor escolhido: ${brl.format(st.valor)}. O código e o QR Code já levam esse valor; confira-o no app do seu banco antes de confirmar.` : "";
  body.dataset.payload = "";

  if (!cfg.chaveOk) {
    body.innerHTML = `<p class="ap-nokey">Chave Pix ainda não configurada.</p>`;
    qrBox("", "O QR Code e o Pix Copia e Cola serão gerados quando a chave Pix for configurada.", true);
  } else if (!cfg.pronto) {
    body.innerHTML = `<p class="ap-keylabel">Chave Pix</p><p class="ap-key" id="ap-key" tabindex="0">${esc(cfg.key)}</p>
      <div class="ap-actions"><button type="button" class="ap-btn ap-btn--ghost" data-copy="key">Copiar chave</button></div>
      <p class="ap-nokey ap-nokey--s">O QR Code ainda não está disponível: falta configurar ${esc(cfg.faltam.join(", "))}.</p>`;
    qrBox("", "Falta configurar o nome do recebedor para gerar o QR Code.", true);
  } else if (!st.valor) {
    body.innerHTML = `<p class="ap-keylabel">Chave Pix</p><p class="ap-key" id="ap-key" tabindex="0">${esc(cfg.key)}</p>
      <div class="ap-actions"><button type="button" class="ap-btn ap-btn--ghost" data-copy="key">Copiar chave</button></div>
      <p class="ap-hint">Escolha um valor acima para gerar o QR Code e o Pix Copia e Cola.</p>`;
    qrBox("", "Escolha um valor para gerar o QR Code.", true);
  } else {
    const payload = pixPayload({ key: cfg.key, name: PIX_CONFIG.name, city: PIX_CONFIG.city }, st.valor);
    body.dataset.payload = payload;
    body.innerHTML = `<div class="ap-actions ap-actions--main">
        <button type="button" class="ap-btn" data-copy="payload">Copiar Pix Copia e Cola</button>
        <button type="button" class="ap-btn ap-btn--ghost" data-copy="key">Copiar chave</button>
      </div>
      <p class="ap-keylabel">Chave Pix</p><p class="ap-key" id="ap-key" tabindex="0">${esc(cfg.key)}</p>
      <details class="ap-payload"><summary>Ver o código Pix Copia e Cola</summary><p class="ap-payload-txt mono" tabindex="0">${esc(payload)}</p></details>`;
    qrBox("", "Gerando o QR Code…", false);
    try {
      const qrcode = await carregarQR();
      if (gen !== st.gen) return; // o valor mudou enquanto a biblioteca carregava
      qrBox(qrSvg(qrcode, payload, `QR Code Pix no valor de ${brl.format(st.valor)}`), `QR Code de ${brl.format(st.valor)}`, false);
    } catch (e) {
      if (gen === st.gen) qrBox("", "Não foi possível gerar o QR Code. Use o Pix Copia e Cola ao lado.", true);
    }
  }

  // outros métodos, só se realmente configurados
  const ativos = OUTROS_METODOS.filter((m) => m && m.url && /^https:\/\//.test(m.url));
  let extra = $("#ap-extra");
  if (!extra) { extra = document.createElement("div"); extra.id = "ap-extra"; extra.className = "ap-extra"; $("#ap-methods").appendChild(extra); }
  extra.innerHTML = ativos.length ? ativos.map((m) => `<a class="ap-btn ap-btn--ghost" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label)}</a>`).join("") : "";
}

function avisoCopiado(txt) {
  const el = $("#ap-copied");
  el.textContent = txt;
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
}

async function copiar(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; }
  } catch { /* cai no plano B */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (ok) return true;
  } catch { /* segue */ }
  return false;
}

function selecionarTexto(el) {
  const r = document.createRange(); r.selectNodeContents(el);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

function validarOutro() {
  const inp = $("#ap-custom-input"), msg = $("#ap-custom-msg");
  const raw = inp.value;
  if (!raw.trim()) { st.valor = null; msg.textContent = ""; inp.removeAttribute("aria-invalid"); renderPix(); return; }
  const v = parseValor(raw);
  if (Number.isNaN(v)) { st.valor = null; msg.textContent = "Digite um valor numérico, por exemplo 15 ou 15,50."; inp.setAttribute("aria-invalid", "true"); }
  else if (v < VALOR_MIN) { st.valor = null; msg.textContent = `O valor mínimo é ${brl.format(VALOR_MIN)}.`; inp.setAttribute("aria-invalid", "true"); }
  else if (v > VALOR_MAX) { st.valor = null; msg.textContent = `O valor máximo aceito aqui é ${brl.format(VALOR_MAX)}.`; inp.setAttribute("aria-invalid", "true"); }
  else { st.valor = v; msg.textContent = `Valor: ${brl.format(v)}`; inp.removeAttribute("aria-invalid"); }
  renderPix();
}

export function initApoie() {
  if (!$("#apoie")) return;
  renderValores();
  renderPix();

  $("#ap-amounts").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    if (b.dataset.v === "outro") {
      st.outro = true; st.valor = null;
      $("#ap-custom").hidden = false;
      validarOutro();
      renderValores();
      $("#ap-custom-input").focus();
    } else {
      st.outro = false; st.valor = Number(b.dataset.v);
      $("#ap-custom").hidden = true;
      renderValores(); renderPix();
      $(`#ap-amounts [data-v="${b.dataset.v}"]`)?.focus();
    }
  });
  const inp = $("#ap-custom-input");
  inp.addEventListener("input", validarOutro);
  inp.addEventListener("blur", () => { if (st.valor) inp.value = String(st.valor).replace(".", ","); });

  $("#ap-pix-body").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-copy]");
    if (!b) return;
    const isPayload = b.dataset.copy === "payload";
    const texto = isPayload ? $("#ap-pix-body").dataset.payload : estadoConfig().key;
    if (!texto) return;
    if (await copiar(texto)) avisoCopiado(isPayload ? "Pix copiado." : "Chave Pix copiada.");
    else {
      const alvo = isPayload ? $(".ap-payload-txt") : $("#ap-key");
      if (isPayload) $(".ap-payload")?.setAttribute("open", "");
      if (alvo) { alvo.focus(); selecionarTexto(alvo); }
      avisoCopiado("Não foi possível copiar automaticamente. O texto está selecionado: use Ctrl+C (ou toque e segure) para copiar.");
    }
  });
}
