// CUSTAVA QUANTO? — motor de gráficos em SVG (substitui o Plotly).
//
// Por que próprio: ~3,5 MB a menos de JavaScript, nenhuma dependência de
// CDN (antes, se o Plotly falhasse, a página inteira parava de renderizar)
// e controle editorial total: rótulos diretos, faixas de período com texto,
// marcos de contexto, marcadores de notícia e leitura por teclado.
//
// Regras visuais (skill dataviz): grade em hairline sólida e recessiva,
// linha de 2px, marcadores ≥ 8px com anel na cor do fundo, rótulo seletivo
// (início, fim, extremos), tooltip nunca é o único jeito de ler o valor
// (cada gráfico tem tabela ou texto equivalente).

import { isNil, monthIdx, idxToIso, reduceMotion, $ } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
const tip = () => $("#tip");
const live = () => $("#sr-live");

// ------------------------------------------------------------ escalas
export function niceTicks(min, max, count = 5) {
  if (min === max) { const d = Math.abs(min) || 1; min -= d * 0.5; max += d * 0.5; }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  // passos 1–2–5: todo rótulo sai exato com a casa decimal do passo (nada de 12,5 virar "13")
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step * 0.001; v += step) ticks.push(+v.toFixed(10));
  return { ticks, lo, hi, step };
}

// Quebra a linha onde falta um ponto esperado (ex.: set/2020 ausente na
// ANP) ou valor nulo. `maxGap` é o maior intervalo, em meses, que ainda
// conta como "sem buraco" — 1 para séries mensais (o padrão: qualquer mês
// pulado é um buraco real). Séries anuais/trimestrais (PIB) não têm ponto
// todo mês por natureza, então passam maxGap=12/3: só quebra se um ano ou
// trimestre INTEIRO ficar sem dado, nunca pela distância normal entre dois
// pontos consecutivos da própria frequência.
function segments(points, maxGap = 1) {
  const segs = [];
  let cur = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (isNil(p.v) || (prev && p.m - prev.m > maxGap)) { if (cur.length) segs.push(cur); cur = []; }
    if (!isNil(p.v)) cur.push(p);
  });
  if (cur.length) segs.push(cur);
  return segs;
}
const pathOf = (seg, X, Y) => seg.map((p, i) => `${i ? "L" : "M"}${X(p.m).toFixed(1)},${Y(p.v).toFixed(1)}`).join("");

// Re-render ao mudar a largura (um observer para todos os gráficos).
const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    const w = Math.round(e.contentRect.width);
    if (el._chart && el._w !== w) { el._w = w; el._chart.render(false); }
  }
}) : null;

// ------------------------------------------------------------ gráfico de linha
export function lineChart(el, cfg) {
  const api = { cfg, hover: null };
  const series = cfg.series.map((s) => ({ ...s, pts: s.rows.map((r) => ({ m: monthIdx(r.iso), v: r.v, iso: r.iso })) }));
  const primary = series[0];
  const allM = series.flatMap((s) => s.pts.map((p) => p.m));
  const m0 = cfg.m0 ?? Math.min(...allM);
  const m1 = cfg.m1 ?? Math.max(...allM);
  const validMs = primary.pts.filter((p) => !isNil(p.v)).map((p) => p.m);
  let geo = null;

  api.render = (animate = cfg.animate) => {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const narrow = W < 560;
    const bandsOn = cfg.bands !== false;
    const top = (bandsOn ? 30 : 8) + (cfg.events?.length ? 22 : 0) + (cfg.padTop ?? 0);

    // domínio vertical
    let vals = series.flatMap((s) => s.pts.map((p) => p.v)).filter((v) => !isNil(v));
    if (cfg.refY != null) vals.push(cfg.refY);
    let lo = cfg.yDomain ? cfg.yDomain[0] : Math.min(...vals);
    let hi = cfg.yDomain ? cfg.yDomain[1] : Math.max(...vals);
    if (cfg.includeZero && lo > 0) lo = 0;
    const nt = niceTicks(lo, hi + (hi - lo) * (cfg.headroom ?? 0.06), cfg.yTickCount ?? (H < 260 ? 3 : 5));
    const yLo = cfg.includeZero ? Math.min(0, nt.lo) : nt.lo;
    const yHi = nt.hi;
    const tickLabels = nt.ticks.filter((t) => t >= yLo && t <= yHi).map((t) => [t, cfg.yFmt ? cfg.yFmt(t, nt.step) : String(t)]);
    // calha à esquerda para os rótulos do eixo y (não disputam espaço com os dados)
    const gutter = Math.ceil(Math.max(...tickLabels.map(([, l]) => l.length)) * 6.6) + 10;
    const mg = { t: top, r: cfg.marginRight ?? 6, b: 26, l: gutter, ...cfg.margin };
    const x0 = mg.l, x1 = W - mg.r, y0 = mg.t, y1 = H - mg.b;
    const X = (m) => x0 + ((m - m0) / Math.max(1, m1 - m0)) * (x1 - x0);
    const Y = (v) => y1 - ((v - yLo) / (yHi - yLo || 1)) * (y1 - y0);
    geo = { X, Y, x0, x1, y0, y1, W, H, m0, m1 };

    const parts = [];
    // faixas de período
    const cutM = cfg.cutoff ? monthIdx(cfg.cutoff) : null;
    if (bandsOn && cutM != null && cutM > m0 && cutM <= m1) {
      const xc = X(cutM - 0.5);
      parts.push(`<rect class="c-band-b" x="${x0}" y="${y0}" width="${Math.max(0, xc - x0)}" height="${y1 - y0}"/>`);
      parts.push(`<rect class="c-band-l" x="${xc}" y="${y0}" width="${Math.max(0, x1 - xc)}" height="${y1 - y0}"/>`);
      const by = (cfg.events?.length ? y0 - 22 : y0) - 20;
      parts.push(`<rect class="c-bandbar-b" x="${x0}" y="${by + 14}" width="${Math.max(0, xc - x0 - 1)}" height="3"/>`);
      parts.push(`<rect class="c-bandbar-l" x="${xc + 1}" y="${by + 14}" width="${Math.max(0, x1 - xc - 1)}" height="3"/>`);
      const full = cfg.bands === "full" && !narrow;
      parts.push(`<text class="c-band-label" x="${x0}" y="${by + 8}">${full ? "Governo Bolsonaro · jan/2019–dez/2022" : "Bolsonaro"}</text>`);
      parts.push(`<text class="c-band-label" x="${xc + 6}" y="${by + 8}">${full ? "Governo Lula · jan/2023–" : "Lula"}</text>`);
      parts.push(`<line class="c-cut" x1="${xc}" x2="${xc}" y1="${y0}" y2="${y1}"/>`);
    }
    // grade horizontal + rótulos do eixo y (sobre a linha, à esquerda)
    tickLabels.forEach(([t, label]) => {
      const y = Y(t);
      parts.push(`<line class="c-grid" x1="${x0}" x2="${x1}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
      parts.push(`<text class="c-ylab" x="${x0 - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${label}</text>`);
    });
    if (cfg.refY != null) parts.push(`<line class="c-axis" x1="${x0}" x2="${x1}" y1="${Y(cfg.refY).toFixed(1)}" y2="${Y(cfg.refY).toFixed(1)}" opacity="0.5"/>`);
    // eixo x: anos
    parts.push(`<line class="c-axis" x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}"/>`);
    const yStart = Math.ceil(m0 / 12) * 12;
    const every = W < 380 ? 2 : 1;
    for (let m = yStart, k = 0; m <= m1; m += 12, k++) {
      const x = X(m);
      parts.push(`<line class="c-axis" x1="${x}" x2="${x}" y1="${y1}" y2="${y1 + 5}"/>`);
      if (k % every === 0 && x < x1 - 18) parts.push(`<text class="c-tick" x="${x + 3}" y="${y1 + 18}">${narrow ? "’" + String(m / 12).slice(2) : m / 12}</text>`);
    }
    // marcos de contexto
    (cfg.events || []).forEach((ev, i, arr) => {
      const m = monthIdx(ev.iso);
      if (m < m0 || m > m1) return;
      const x = X(m);
      const prevX = i ? X(monthIdx(arr[i - 1].iso)) : -99;
      const ky = y0 - 20 + (x - prevX < 20 ? -0 : 0);
      parts.push(`<line class="c-event" x1="${x}" x2="${x}" y1="${ky + 16}" y2="${y1}"/>`);
      parts.push(`<g class="c-event-key"><rect x="${x - 8}" y="${ky}" width="16" height="16"/><text x="${x}" y="${ky + 11.5}">${ev.key}</text></g>`);
    });
    // séries
    series.forEach((s, si) => {
      const segs = segments(s.pts, s.maxGap ?? cfg.maxGap ?? 1);
      if (s.area) {
        const base = Y(Math.max(yLo, cfg.areaBase ?? yLo));
        segs.forEach((seg) => {
          parts.push(`<path class="c-area" d="${pathOf(seg, X, Y)}L${X(seg[seg.length - 1].m).toFixed(1)},${base.toFixed(1)}L${X(seg[0].m).toFixed(1)},${base.toFixed(1)}Z"/>`);
        });
      }
      segs.forEach((seg) => {
        parts.push(`<path class="${s.cls || "c-line"}${si === 0 && animate ? " js-draw" : ""}" d="${pathOf(seg, X, Y)}"${si === 0 && animate ? ' pathLength="1"' : ""}${s.style ? ` style="${s.style}"` : ""}/>`);
      });
    });
    // marcador do ponto de partida (contexto)
    if (cfg.baseIso) {
      const m = monthIdx(cfg.baseIso);
      const p = primary.pts.find((q) => q.m === m);
      if (p && !isNil(p.v)) parts.push(`<circle class="c-dot" cx="${X(m)}" cy="${Y(p.v)}" r="3.5"/>`);
    }
    // anotações (rótulos diretos seletivos)
    (cfg.annotations || []).forEach((a) => {
      const m = monthIdx(a.iso);
      if (isNil(a.v) || m < m0 || m > m1) return;
      const x = X(m), y = Y(a.v);
      let anchor = "middle";
      if (x < x0 + 70) anchor = "start";
      else if (x > x1 - 70) anchor = "end";
      const above = a.place !== "below" && y - 34 > y0;
      // se há marcador de notícia no mesmo trecho, o rótulo se afasta dele
      const crowded = (cfg.news || []).some((n) => Math.abs(monthIdx(n.iso) - m) <= 3);
      const ty = above ? y - 12 - (crowded ? 20 : 0) : y + 22 + (crowded ? 16 : 0);
      const tx = anchor === "start" ? x - 4 : anchor === "end" ? x + 4 : x;
      parts.push(`<circle class="${a.signal ? "c-dot--signal" : "c-dot"}" cx="${x}" cy="${y}" r="${a.signal ? 5 : 4}"/>`);
      if (a.sub) parts.push(`<text class="c-ann-sub" x="${tx}" y="${above ? ty - 16 : ty + 14}" text-anchor="${anchor}">${a.sub}</text>`);
      parts.push(`<text class="c-ann" x="${tx}" y="${ty}" text-anchor="${anchor}">${a.text}</text>`);
    });
    // camada de interação + crosshair
    parts.push(`<g class="c-hover" pointer-events="none"></g>`);
    parts.push(`<rect class="c-hit" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0 + mg.b}"/>`);
    // notícias (clicáveis, acima da camada de interação)
    (cfg.news || []).forEach((n) => {
      const m = monthIdx(n.iso);
      if (isNil(n.v) || m < m0 || m > m1) return;
      const x = X(m), y = Y(n.v);
      const r = narrow ? 9 : 10.5;
      parts.push(`<g class="c-news${n.id === cfg.activeNews ? " is-active" : ""}" data-id="${n.id}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" aria-hidden="true"><circle r="${r}"/><text y="3.8">${n.n}</text></g>`);
    });

    el.innerHTML = `<svg xmlns="${NS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${parts.join("")}</svg>`;
    el._w = Math.round(W);

    if (animate && !reduceMotion()) {
      el.querySelectorAll(".js-draw").forEach((p) => {
        p.style.strokeDasharray = "1 1"; p.style.strokeDashoffset = "1";
        requestAnimationFrame(() => requestAnimationFrame(() => { p.classList.add("draw-path"); p.style.strokeDashoffset = "0"; }));
      });
    }
    bind();
    if (api.hover != null) drawHover(api.hover, api.hoverTip);
  };

  function nearestValid(m) {
    if (!validMs.length) return null;
    let best = validMs[0];
    for (const v of validMs) if (Math.abs(v - m) < Math.abs(best - m)) best = v;
    return best;
  }

  function drawHover(m, withTip, evt) {
    const g = el.querySelector(".c-hover");
    if (!g || !geo) return;
    if (m == null) { g.innerHTML = ""; hideTip(); return; }
    const { X, Y, y0, y1 } = geo;
    const x = X(m);
    let h = `<line class="c-cross" x1="${x}" x2="${x}" y1="${y0}" y2="${y1}"/>`;
    series.forEach((s, si) => {
      const p = s.pts.find((q) => q.m === m);
      if (p && !isNil(p.v)) h += `<circle class="${si === 0 ? "c-dot--signal" : "c-dot"}" cx="${x}" cy="${Y(p.v)}" r="${si === 0 ? 5 : 3.5}"/>`;
    });
    if (!withTip && cfg.inlineLabel) {
      const p = primary.pts.find((q) => q.m === m);
      if (p && !isNil(p.v)) {
        const anchor = x > geo.x1 - 60 ? "end" : "start";
        h += `<text class="c-ann" x="${x + (anchor === "end" ? -8 : 8)}" y="${Y(p.v) - 8}" text-anchor="${anchor}">${cfg.inlineLabel(p.v)}</text>`;
      }
    }
    g.innerHTML = h;
    if (withTip && cfg.tooltip) showTip(cfg.tooltip(m), evt, x, Y(primary.pts.find((q) => q.m === m)?.v ?? 0));
  }

  function showTip(html, evt, x, y) {
    const t = tip();
    t.innerHTML = html;
    t.hidden = false;
    const r = el.getBoundingClientRect();
    const px = evt ? evt.clientX : r.left + x;
    const py = evt ? evt.clientY : r.top + y;
    const w = t.offsetWidth, hgt = t.offsetHeight;
    let left = px + 16;
    if (left + w > window.innerWidth - 8) left = px - w - 16;
    let topY = py - hgt - 14;
    if (topY < 60) topY = py + 18;
    t.style.left = `${Math.max(8, left)}px`;
    t.style.top = `${topY}px`;
  }
  function hideTip() { const t = tip(); if (t) t.hidden = true; }

  api.setHover = (m, withTip = false, evt = null) => {
    api.hover = m; api.hoverTip = withTip;
    drawHover(m, withTip, evt);
  };

  function bind() {
    const hit = el.querySelector(".c-hit");
    const svg = el.querySelector("svg");
    if (!hit || !svg) return;
    const toM = (evt) => {
      const r = svg.getBoundingClientRect();
      const px = evt.clientX - r.left;
      const m = m0 + ((px - geo.x0) / (geo.x1 - geo.x0)) * (m1 - m0);
      return nearestValid(Math.round(Math.max(m0, Math.min(m1, m))));
    };
    const move = (evt) => {
      const m = toM(evt);
      api.setHover(m, true, evt);
      cfg.onHover?.(m);
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", (evt) => { move(evt); if (cfg.onSelect && api.hover != null) cfg.onSelect(api.hover); });
    hit.addEventListener("pointerleave", () => { api.setHover(null); cfg.onHover?.(null); });
    el.querySelectorAll(".c-news").forEach((g) => {
      g.addEventListener("click", () => cfg.onNews?.(g.dataset.id));
      g.addEventListener("pointerenter", (evt) => {
        const n = cfg.news.find((q) => q.id === g.dataset.id);
        if (n && cfg.newsTip) showTip(cfg.newsTip(n), evt);
      });
      g.addEventListener("pointerleave", hideTip);
    });
  }

  // teclado: setas percorrem os meses; o texto do tooltip vai para a região viva
  if (!el._kbd && el.hasAttribute("tabindex")) {
    el._kbd = true;
    el.addEventListener("keydown", (e) => {
      const c = el._chart;
      if (!c) return;
      const ms = c.validMs;
      if (!ms.length) return;
      let i = ms.indexOf(c.hover);
      if (e.key === "ArrowRight") i = Math.min(ms.length - 1, (i < 0 ? ms.length - 1 : i + 1));
      else if (e.key === "ArrowLeft") i = Math.max(0, (i < 0 ? ms.length - 1 : i - 1));
      else if (e.key === "Home") i = 0;
      else if (e.key === "End") i = ms.length - 1;
      else if (e.key === "Escape") { c.setHover(null); return; }
      else if ((e.key === "Enter" || e.key === " ") && c.cfg.onSelect && c.hover != null) { e.preventDefault(); c.cfg.onSelect(c.hover); return; }
      else return;
      e.preventDefault();
      c.setHover(ms[i], true);
      c.cfg.onHover?.(ms[i]);
      const lr = live();
      // uma frase por linha do tooltip, para o leitor de tela não emendar valores
      if (lr) lr.textContent = [...tip().children].map((c) => (c.children.length ? [...c.children].map((k) => k.textContent.trim()).filter(Boolean).join(": ") : c.textContent.trim())).filter(Boolean).join(". ");
    });
    el.addEventListener("blur", () => { el._chart?.setHover(null); el._chart?.cfg.onHover?.(null); });
  }
  api.validMs = validMs;
  el._chart = api;
  ro?.observe(el);
  api.render(cfg.animate);
  return api;
}

// ------------------------------------------------------------ sparkline (string SVG, estica com o contêiner)
// rows: [{iso, v}]. Divide a linha na troca de governo (cor = período).
export function spark(rows, o = {}) {
  // Janela explícita: pontos fora dela (ex.: PIB anual desde 1996) são cortados
  // ANTES de calcular escala e traço, senão a linha sai do quadro e distorce o eixo Y.
  const inWin = (m) => (o.m0 == null || m >= o.m0) && (o.m1 == null || m <= o.m1);
  rows = rows.filter((r) => inWin(monthIdx(r.iso)));
  const pts = rows.map((r) => ({ m: monthIdx(r.iso), v: r.v, iso: r.iso })).filter((p) => !isNil(p.v) && Number.isFinite(p.v) && Number.isFinite(p.m));
  if (!pts.length) return "";
  const W = 1000, H = 100, pad = o.pad ?? 10;
  const m0 = o.m0 ?? pts[0].m, m1 = o.m1 ?? pts[pts.length - 1].m;
  const lo = o.lo ?? Math.min(...pts.map((p) => p.v)), hi = o.hi ?? Math.max(...pts.map((p) => p.v));
  const X = (m) => ((m - m0) / Math.max(1, m1 - m0)) * W;
  const Y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad);
  const cut = monthIdx(o.cutoff || "2023-01-01");
  const allPts = rows.map((r) => ({ m: monthIdx(r.iso), v: r.v }));
  const gap = o.maxGap ?? 1;
  const segs = segments(allPts, gap);
  const out = [];
  const sw = o.width ?? 1.75;
  const line = (seg, color, extra = "") => `<path d="${pathOf(seg, X, Y)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"${extra}/>`;
  if (o.baseline != null) out.push(`<line x1="0" x2="${W}" y1="${Y(o.baseline)}" y2="${Y(o.baseline)}" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
  if (o.cutLine) out.push(`<line x1="${X(cut - 0.5)}" x2="${X(cut - 0.5)}" y1="0" y2="${H}" stroke="var(--fg-3)" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.6"/>`);
  segs.forEach((seg) => {
    if (o.split === false) { out.push(line(seg, o.color || "var(--fg)")); return; }
    const a = seg.filter((p) => p.m < cut);
    const b = seg.filter((p) => p.m >= cut);
    if (a.length && b.length) b.unshift(a[a.length - 1]);
    // janela destacada (recortes de mesma duração): fora dela, linha apagada
    if (o.windows) {
      const inW = (p) => o.windows.some(([w0, w1]) => p.m >= w0 && p.m <= w1);
      if (a.length > 1) out.push(line(a, "var(--pb)", ' opacity="0.22"'));
      if (b.length > 1) out.push(line(b, "var(--pl)", ' opacity="0.22"'));
      segments(allPts.map((p) => ({ ...p, v: inW(p) && p.m < cut ? p.v : null })), gap).forEach((s) => s.length > 1 && out.push(line(s, "var(--pb)")));
      segments(allPts.map((p) => ({ ...p, v: inW(p) && p.m >= cut ? p.v : null })), gap).forEach((s) => s.length > 1 && out.push(line(s, "var(--pl)")));
      return;
    }
    if (a.length > 1) out.push(line(a, o.colorB || "var(--pb)"));
    if (b.length > 1) out.push(line(b, o.colorL || "var(--pl)"));
  });
  const dot = (p, color, size) => `<path d="M${X(p.m).toFixed(1)},${Y(p.v).toFixed(1)} l0,0" stroke="${color}" stroke-width="${size}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  (o.dots || []).forEach((d) => {
    const p = pts.find((q) => q.m === monthIdx(d.iso));
    if (p) { out.push(dot(p, "var(--bg)", (d.size ?? 7) + 4)); out.push(dot(p, d.color || "var(--fg)", d.size ?? 7)); }
  });
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${out.join("")}</svg>`;
}

// ------------------------------------------------------------ textura da abertura (todas as séries, só o formato)
export function texture(el, seriesList, { cutoff, highlight, window: janela }) {
  // `hl` é mutável (ver setHighlight): a série em destaque é um estado da
  // instância do gráfico, não algo fixo escolhido na criação — qualquer uma
  // das séries de seriesList pode assumir o destaque, a qualquer momento.
  let hl = highlight;
  const render = () => {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    // Eixo comum: a janela do projeto (jan/2019 → último mês). Séries que
    // começam antes (PIB desde 1996) só são CORTADAS na borda; séries que
    // terminam antes (PIB anual) simplesmente param onde a observação real
    // termina — nada é estendido, repetido ou interpolado.
    const all = seriesList.flatMap((s) => s.rows.map((r) => monthIdx(r.iso)));
    const m0 = janela ? janela[0] : Math.min(...all), m1 = janela ? janela[1] : Math.max(...all);
    const X = (m) => ((m - m0) / (m1 - m0)) * W;
    const cutX = X(monthIdx(cutoff) - 0.5);
    const out = [];
    out.push(`<line x1="${cutX}" x2="${cutX}" y1="0" y2="${H}" stroke="rgba(238,232,220,.35)" stroke-width="1"/>`);
    out.push(`<text x="${cutX - 8}" y="14" text-anchor="end" class="s-year" fill="var(--on-night-3)">2019–2022</text>`);
    out.push(`<text x="${cutX + 8}" y="14" class="s-year" fill="var(--on-night-3)">2023–</text>`);
    // a série em destaque é desenhada por último (fica por cima das outras)
    const ordered = [...seriesList].sort((a, b) => (a.key === hl) - (b.key === hl));
    ordered.forEach((s) => {
      // cada série usa as PRÓPRIAS observações (data real de cada uma); a
      // única operação é ignorar as que caem fora da janela visível.
      const rows = s.rows.filter((r) => { const m = monthIdx(r.iso); return m >= m0 && m <= m1; });
      const vals = rows.map((r) => r.v).filter((v) => !isNil(v));
      if (!vals.length) return;
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const Y = (v) => H - 8 - ((v - lo) / (hi - lo || 1)) * (H - 30);
      const pts = rows.map((r) => ({ m: monthIdx(r.iso), v: r.v }));
      const isHl = s.key === hl;
      segments(pts, s.maxGap ?? 1).forEach((seg) => {
        out.push(`<path d="${pathOf(seg, X, Y)}" fill="none" stroke="${isHl ? "var(--signal)" : "var(--on-night-3)"}" stroke-width="${isHl ? 2.5 : 0.75}" stroke-opacity="${isHl ? 1 : 0.16}" stroke-linejoin="round" class="js-draw" pathLength="1"/>`);
      });
    });
    [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].forEach((y) => {
      const m = y * 12;
      if (m < m0 || m > m1) return;
      out.push(`<text x="${X(m) + 3}" y="${H - 1}" class="s-year" fill="var(--on-night-3)">${W < 520 ? "’" + String(y).slice(2) : y}</text>`);
    });
    const first = !el.dataset.drawn;
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${out.join("")}</svg>`;
    // a animação de "desenhar a linha" é só da primeira carga — trocar o
    // destaque depois disso deve ser instantâneo, não redesenhar tudo nos
    // ~2s da entrada.
    if (first && !reduceMotion()) {
      el.dataset.drawn = "1";
      el.querySelectorAll(".js-draw").forEach((p, i) => {
        p.style.strokeDasharray = "1 1"; p.style.strokeDashoffset = "1";
        p.style.transition = `stroke-dashoffset 1.8s cubic-bezier(.2,.7,.1,1) ${Math.min(i * 0.03, 0.6)}s`;
        requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = "0"; }));
      });
    }
  };
  const api = {
    render,
    // Troca a série em destaque (chamada pela seção "História" ao mudar de
    // produto — ver updateHeroHighlight em app.js). `key` é o mesmo código
    // usado em seriesList (ex.: "GASOLINA", "Arroz", "DOLAR"); qualquer
    // série da lista serve, nada aqui é específico de um produto.
    setHighlight(key) {
      if (key === hl) return;
      hl = key;
      render();
    },
  };
  el._chart = api;
  ro?.observe(el);
  render();
  return api;
}

// ------------------------------------------------------------ trilho do scrubber (alinhado ao polegar do <input type=range>)
// O polegar de 22px vai de 11px a (W − 11px): o desenho usa a mesma régua.
export function scrubViz(el, { months, values, cutoff, fixedIdx, fixedLabel, handleIdx, handleLabel, sparkOn = true }) {
  const render = () => {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const n = months.length;
    const X = (i) => 11 + (i / Math.max(1, n - 1)) * (W - 22);
    const out = [];
    const cutI = months.findIndex((iso) => iso >= cutoff);
    const barY = H - 4;
    out.push(`<rect class="s-band-b" x="${X(0)}" y="${barY}" width="${Math.max(0, X(cutI - 0.5) - X(0))}" height="3"/>`);
    out.push(`<rect class="s-band-l" x="${X(cutI - 0.5) + 1}" y="${barY}" width="${Math.max(0, X(n - 1) - X(cutI - 0.5) - 1)}" height="3"/>`);
    if (sparkOn && values) {
      const vs = values.filter((v) => !isNil(v));
      const lo = Math.min(...vs), hi = Math.max(...vs);
      const Y = (v) => barY - 8 - ((v - lo) / (hi - lo || 1)) * (barY - 22);
      const pts = values.map((v, i) => ({ m: i, v }));
      segments(pts).forEach((seg) => out.push(`<path class="s-spark" d="${pathOf(seg, X, Y)}"/>`));
    }
    months.forEach((iso, i) => {
      if (iso.slice(5, 7) === "01") {
        out.push(`<line class="s-yeartick" x1="${X(i)}" x2="${X(i)}" y1="${barY - 6}" y2="${barY}"/>`);
        if (X(i) < W - 24) out.push(`<text class="s-year" x="${X(i) + 3}" y="${H + 14}">${W < 480 ? "’" + iso.slice(2, 4) : iso.slice(0, 4)}</text>`);
      }
    });
    if (fixedIdx != null) {
      out.push(`<g class="s-fixed"><line x1="${X(fixedIdx)}" x2="${X(fixedIdx)}" y1="0" y2="${barY}"/><text x="${X(fixedIdx) - 4}" y="9" text-anchor="end">${fixedLabel || ""}</text></g>`);
    }
    if (handleIdx != null) {
      const hx = X(handleIdx);
      const lw = Math.max(46, (handleLabel || "").length * 6.6 + 12);
      const lx = Math.max(lw / 2, Math.min(W - lw / 2, hx));
      out.push(`<g class="s-handle"><line x1="${hx}" x2="${hx}" y1="16" y2="${barY + 3}"/><rect x="${lx - lw / 2}" y="0" width="${lw}" height="16"/><text x="${lx}" y="11.5">${handleLabel || ""}</text></g>`);
    }
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${out.join("")}</svg>`;
  };
  el._chart = { render };
  ro?.observe(el);
  render();
}
