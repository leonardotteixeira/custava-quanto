// CUSTAVA QUANTO? — página "Apoie" (capítulo 09).
//
// >>> CONFIGURAÇÃO: preencha aqui a chave PIX pública do projeto. <<<
// Enquanto `pixKey` estiver vazio (ou com o texto de exemplo), a página mostra
// "Chave PIX ainda não configurada." e nenhum dado de pagamento é exibido.
// `pixName` (nome do recebedor, até 25 letras) e `pixCity` (até 15) só são
// usados para montar o "PIX copia e cola" com o valor escolhido; sem `pixName`
// a página mostra apenas a chave.
export const SUPPORT_CONFIG = {
  pixKey: "",
  pixName: "",
  pixCity: "CAMPINAS",
};
const PLACEHOLDER = "COLOQUE_SUA_CHAVE_PIX_AQUI";

// Outras formas de apoio (cartão, Mercado Pago, Stripe, Apoia.se…) entram aqui
// quando existirem de verdade: { id, label, url }. Só as configuradas aparecem.
export const OUTROS_METODOS = [];

const $ = (s, r = document) => r.querySelector(s);
const SUGESTOES = [10, 25, 50, 100];
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
const VALOR_MIN = 1, VALOR_MAX = 100000;

// ------------------------------------------------- PIX copia e cola (BR Code)
const tlv = (id, v) => `${id}${String(v.length).padStart(2, "0")}${v}`;
export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase();
export function pixPayload({ key, name, city }, valor) {
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  let p = tlv("00", "01") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986");
  if (valor) p += tlv("54", valor.toFixed(2));
  p += tlv("58", "BR") + tlv("59", semAcento(name).slice(0, 25)) + tlv("60", semAcento(city || "BRASIL").slice(0, 15)) + tlv("62", tlv("05", "***"));
  p += "6304";
  return p + crc16(p);
}

// ---------------------------------------------------------------- estado
const st = { valor: null, outro: false };
const chavePix = () => {
  const k = String(SUPPORT_CONFIG.pixKey || "").trim();
  return k && k !== PLACEHOLDER ? k : "";
};

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function renderValores() {
  const box = $("#ap-amounts");
  box.innerHTML = SUGESTOES.map((v) => `<button type="button" data-v="${v}" aria-pressed="${!st.outro && st.valor === v}">${brl.format(v).replace(",00", "")}</button>`).join("")
    + `<button type="button" data-v="outro" aria-pressed="${st.outro}">Outro valor</button>`;
}

function renderPix() {
  const key = chavePix();
  const body = $("#ap-pix-body");
  const cfg = SUPPORT_CONFIG;
  $("#ap-pix-amount").textContent = st.valor ? `Valor escolhido: ${brl.format(st.valor)} (você confirma o valor no app do seu banco).` : "";
  if (!key) {
    body.innerHTML = `<p class="ap-nokey">Chave PIX ainda não configurada.</p>`;
  } else {
    const nome = String(cfg.pixName || "").trim();
    const payload = nome ? pixPayload({ key, name: nome, city: cfg.pixCity }, st.valor) : "";
    body.innerHTML = `<p class="ap-keylabel">Chave PIX</p>
      <p class="ap-key" id="ap-key" tabindex="0">${esc(key)}</p>
      <div class="ap-actions">
        <button type="button" class="ap-btn" data-copy="key">Copiar chave</button>
        ${payload ? `<button type="button" class="ap-btn ap-btn--ghost" data-copy="payload">Copiar “PIX copia e cola”${st.valor ? ` de ${esc(brl.format(st.valor))}` : ""}</button>` : ""}
      </div>`;
    body.dataset.payload = payload;
  }
  // QR Code: nenhuma biblioteca de QR no projeto — nunca se desenha um QR inventado.
  $("#ap-qr").hidden = false;
  $("#ap-qr .ap-qr-txt").textContent = key
    ? "O QR Code ainda não foi implementado neste site; use a chave ou o “PIX copia e cola” acima."
    : "Será disponibilizado quando a chave PIX for configurada.";
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
  // plano B: seleciona um campo temporário e usa execCommand
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
    const texto = isPayload ? $("#ap-pix-body").dataset.payload : chavePix();
    if (await copiar(texto)) avisoCopiado(isPayload ? "PIX copia e cola copiado." : "Chave PIX copiada.");
    else {
      const k = $("#ap-key"); if (k) { k.focus(); selecionarTexto(k); }
      avisoCopiado("Não foi possível copiar automaticamente. A chave está selecionada: use Ctrl+C (ou toque e segure) para copiar.");
    }
  });
}
