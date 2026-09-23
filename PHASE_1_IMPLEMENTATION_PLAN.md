# PHASE 1: Implementação & Ajustes Técnicos — Plano Detalhado

**Data de Início:** 23/09/2026
**Duração Estimada:** 6 dias (P0+P1+P2+P3)
**Status:** 🚀 **INICIANDO AGORA**

---

## 📋 Sumário Executivo

Phase 1 transforma o planejamento (Phase 0) em código real. Dividida em 4 sub-fases:

- **[P0] Critical Path** (hoje, ~2 horas): Fixes de acessibilidade + sincronização de breakpoint
- **[P1] Core Reordering** (amanhã/dia 2, ~4 horas): Reordenar DOM 9 seções
- **[P2] Enhancement** (dia 3-4, ~6 horas): Badges nos chips, preload Hero, Cápsula do Tempo
- **[P3] QA & Polish** (dia 5-6, ~3 horas): Testes e validação

**Total de Esforço:** ~15 horas de desenvolvimento

---

## 📂 Arquivos Afetados

```
dashboard/
├── index.html          [P1+P2] — Reordenação + Cápsula UI
├── app.js              [P0+P1+P2] — Numeração, badges, preload
├── styles.css          [P0+P2] — WCAG AA fix + grid responsivo
├── news.js             [P1] — Interlúdio repositioning
└── (novo) capsula.js   [P2] — Lógica da Cápsula do Tempo

data/
└── processed/
    └── dashboard_data.json [Já existe, sem mudanças]
```

---

## 🎯 [P0] CRITICAL PATH — Hoje (2 horas)

### Objetivo
Corrigir 2 bloqueadores críticos:
1. Contraste WCAG AA (`--ink-faint`)
2. Sincronização de breakpoint (760px)

### P0.1 — Corrigir Contraste em `styles.css`

**Arquivo:** `dashboard/styles.css`
**Linha aproximada:** ~19 (variáveis CSS)

**Mudança:**
```css
/* ANTES */
--ink-faint: #8a8883;  /* 3.34:1 ratio — FAILS WCAG AA */

/* DEPOIS */
--ink-faint: #65635e;  /* 4.9:1 ratio — PASSES WCAG AA */
```

**Impacto:**
- ✅ Disclaimers e metodologia ficam legíveis
- ✅ Legendas do gráfico mais claras
- ✅ Créditos de foto visíveis
- ✅ Afeta: `.vr-kicker`, `.methodology`, `.live-dot-label`

**Validação:**
```
Antes: lighthouse audit → color-contrast FAIL
Depois: lighthouse audit → color-contrast PASS
```

---

### P0.2 — Sincronizar Breakpoint em `app.js`

**Arquivo:** `dashboard/app.js`
**Linha aproximada:** ~654

**Mudança:**
```javascript
/* ANTES */
const estreito = () => window.innerWidth < 640;
/* Breakpoint mismatch: CSS @ 760px, JS @ 640px */

/* DEPOIS */
const estreito = () => window.innerWidth <= 760;
/* Sincronizado com CSS media query max-width: 760px */
```

**Impacto:**
- ✅ Plotly charts não truncam em tablet landscape (640-760px)
- ✅ Breakpoint mismatch eliminado
- ✅ Afeta: `renderGraph()`, `Plotly.relayout()`

**Validação:**
```
Teste em viewport: 640px, 760px, 768px
Antes: Chart margin breaks at 640-760px
Depois: Chart margins consistent
```

---

### P0 Checklist
- [ ] `styles.css` linha ~19: `--ink-faint: #65635e`
- [ ] `app.js` linha ~654: `const estreito = () => window.innerWidth <= 760`
- [ ] Testar em mobile (375px) e tablet (768px)
- [ ] Lighthouse audit PASS color-contrast
- [ ] Commit: `Fix WCAG AA contrast and breakpoint sync`

---

## 🏗️ [P1] CORE REORDERING — Amanhã/Dia 2 (4 horas)

### Objetivo
Reordenar DOM em `index.html` para novo fluxo de 9 seções (Phase 0.2)

### Novo Fluxo (Ordem de Seções)

```
SEÇÃO 00: Hero + Seletor [EXISTING]
SEÇÃO 01: Série Temporal (Gráfico) [EXISTING]
SEÇÃO 02: Interlúdio (Notícia) [MOVE AFTER GRAPH]
SEÇÃO 03: Poder de Compra [EXISTING → RENUMBER]
SEÇÃO 04: Contexto Econômico [MOVE UP FROM 05]
SEÇÃO 05: "Como estava o Brasil?" [EXTRACT & PROMOTE]
SEÇÃO 06: Governos (Veredicto) [MOVE DOWN FROM 04]
SEÇÃO 07: Arquivo de Notícias [MOVE DOWN FROM 06]
SEÇÃO 08: Metodologia [MOVE DOWN FROM 07]
```

### P1.1 — Mover Interlúdio APÓS Gráfico

**Arquivo:** `dashboard/index.html`
**Elementos a mover:**
```html
<!-- Encontre: -->
<section id="interlude">
  <article class="interlude-item">
    ...
  </article>
</section>

<!-- Localização ATUAL (aproximada, linha ~500): -->
<!-- Antes de <section id="evolucao"> -->

<!-- Mover PARA: -->
<!-- Depois de </section> (fecha evolucao, aproximada linha ~600) -->
```

**Ordem Segura:**
1. Copie TODO o `<section id="interlude">` (completo, com closing tag)
2. Encontre `</section>` que fecha `#evolucao`
3. Cole `#interlude` logo após esse `</section>`
4. Delete o `#interlude` original
5. Validar que não quebrou HTML (fechar todas as tags)

---

### P1.2 — Extrair `#brasil-snapshot` como Section Própria

**Arquivo:** `dashboard/index.html`
**Elemento a extrair:**
```html
<!-- Encontre (dentro de #context-section): -->
<div id="brasil-snapshot">
  <article class="snapshot-item">
    ...
  </article>
</div>

<!-- Transforme em: -->
<section id="brasil-snapshot">
  <article class="snapshot-item">
    ...
  </article>
</section>

<!-- E mova para: APÓS </section> que fecha #context-section -->
```

---

### P1.3 — Mover Governos APÓS Brasil Snapshot

**Arquivo:** `dashboard/index.html`
**Elemento a mover:**
```html
<!-- Encontre: -->
<section id="governos">
  <article class="compare-item">
    ...
  </article>
</section>

<!-- Localização ATUAL: Após #context-section (aproximada linha ~750) -->
<!-- Mover PARA: Após #brasil-snapshot -->
```

---

### P1.4 — Atualizar `renderStepNumbers()` em `app.js`

**Arquivo:** `dashboard/app.js`
**Função:** `renderStepNumbers()` (aproximada linha ~800-850)

**Mudança:**
```javascript
/* ANTES (hardcoded): */
function renderStepNumbers() {
  document.getElementById("step-01").textContent = "01";
  document.getElementById("step-02").textContent = "02";
  document.getElementById("step-03").textContent = "03";
  // ... hardcoded até 08
}

/* DEPOIS (dinâmico, evita saltos): */
function renderStepNumbers() {
  const sections = document.querySelectorAll("main > section");
  const visibleSections = Array.from(sections).filter(s => {
    return s.offsetParent !== null; // visible
  });
  
  visibleSections.forEach((section, index) => {
    const stepEl = section.querySelector("[data-step]");
    if (stepEl) {
      stepEl.textContent = String(index + 1).padStart(2, "0");
    }
  });
}
```

**Impacto:**
- ✅ Selic/IPCA/Ibovespa não causam salto 02→04
- ✅ Numeração sempre contínua 01-08 (ou 01-09 se incluir Cápsula)

---

### P1 Checklist
- [ ] Copiar `#interlude` completo
- [ ] Colar após `#evolucao` (closing tag)
- [ ] Deletar `#interlude` original
- [ ] Extrair `#brasil-snapshot` de div → section
- [ ] Mover `#brasil-snapshot` após `#context-section`
- [ ] Mover `#governos` após `#brasil-snapshot`
- [ ] Validar HTML (sem tags abertas)
- [ ] Atualizar `renderStepNumbers()` dinâmico em app.js
- [ ] Testar todos os produtos (Gasolina, Selic, Ibovespa)
- [ ] Verificar numeração: 01-08 sem saltos
- [ ] Commit: `Reorder DOM to 9-section narrative flow`

---

## ✨ [P2] ENHANCEMENT — Dia 3-4 (6 horas)

### Objetivo
Implementar melhorias visuais e nova feature (Cápsula)

### P2.1 — Badges de Variação nos Chips

**Arquivo:** `dashboard/app.js`
**Função:** `renderProductChips()` ou `renderSelector()`

**Implementação:**
```javascript
// Em renderProductChips(), para cada chip:
const produto = produtos[id];
const eraValue = produto.precos_normalizados?.[0]?.valor || produto.era_value;
const agoraValue = produto.agora_value;
const delta = agoraValue - eraValue;
const deltaPercent = Math.round((delta / eraValue) * 100);
const arrow = delta >= 0 ? '↑' : '↓';

chip.innerHTML = `
  <span class="chip-name">${produto.nome}</span>
  <span class="chip-delta ${delta >= 0 ? 'positive' : 'negative'}">
    ${delta >= 0 ? '+' : ''}${deltaPercent}% ${arrow}
  </span>
`;
```

**CSS (novo):**
```css
.chip-delta {
  font-size: 0.75rem;
  font-weight: 500;
  margin-left: 4px;
}
.chip-delta.positive {
  color: var(--status-warning, #ff6b35);
}
.chip-delta.negative {
  color: var(--status-info, #4a90e2);
}
```

---

### P2.2 — Pré-renderizar Gasolina no Hero

**Arquivo:** `dashboard/index.html`
**Localização:** Na `<section class="opening">`, antes do JSON ser carregado

**Adicionar:**
```html
<!-- No <head> ou antes de </main>: -->
<script type="application/json" id="bootstrap-gasolina">
{
  "nome": "Gasolina",
  "unidade": "R$/L",
  "era_date": "2022-12-31",
  "era_value": 5.48,
  "agora_date": "2026-09-22",
  "agora_value": 7.20,
  "delta_percent": 31.4
}
</script>

<!-- Em app.js, antes do fetch do JSON: -->
// Se offline ou JS hidrata rápido, renderizar com bootstrap data
const bootstrapData = JSON.parse(document.getElementById("bootstrap-gasolina").textContent);
if (bootstrapData && !window.DATA_LOADED) {
  renderAnswer(bootstrapData, "combustivel");
}
```

**Impacto:**
- ✅ Hero renderiza SEM dashes `—` (0ms latência)
- ✅ 5-second test PASSA mesmo em conexão lenta
- ✅ JS hidrata + substitui quando JSON carrega

---

### P2.3 — Implementar Toggle "Por Produto | Cápsula"

**Arquivo:** `dashboard/index.html`
**Localização:** Em `<div class="selector">`, novo controle

**HTML:**
```html
<div class="selector-mode">
  <label>
    <input type="radio" name="view-mode" value="produto" checked>
    Por Produto (1D)
  </label>
  <label>
    <input type="radio" name="view-mode" value="capsula">
    Cápsula por Mês (nD)
  </label>
</div>
```

**JS (novo arquivo `dashboard/capsula.js`):**
```javascript
function toggleViewMode(mode) {
  if (mode === "capsula") {
    document.getElementById("brasil-snapshot").classList.add("expanded");
    // Mostra seletor de mês
    renderMesSelector();
  } else {
    document.getElementById("brasil-snapshot").classList.remove("expanded");
  }
}
```

---

### P2.4 — Grid 2×4 com 8 Indicadores (Cápsula)

**Arquivo:** `dashboard/styles.css` (novo)

```css
#brasil-snapshot.expanded {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 24px;
}

#brasil-snapshot.expanded .snapshot-item {
  background: var(--paper);
  border: 1px solid var(--border-light);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

#brasil-snapshot.expanded .snapshot-value {
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

#brasil-snapshot.expanded .snapshot-label {
  font-size: 0.75rem;
  color: var(--ink-faint);
  margin-top: 4px;
}

@media (max-width: 760px) {
  #brasil-snapshot.expanded {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px;
  }
}
```

---

### P2.5 — Seletor de Mês

**Arquivo:** `dashboard/capsula.js` (novo)

```javascript
function renderMesSelector() {
  const selector = document.createElement("div");
  selector.className = "mes-selector";
  selector.innerHTML = `
    <select id="mes-select" onchange="loadCapsula(this.value)">
      <option value="2026-09">Setembro 2026 (Hoje)</option>
      <option value="2022-06">Junho 2022 (Pico Gasolina)</option>
      <option value="2022-12">Dezembro 2022 (Transição)</option>
      <option value="2020-05">Maio 2020 (Pandemia)</option>
      <!-- ... mais meses -->
    </select>
  `;
  document.getElementById("brasil-snapshot").insertBefore(selector, 
    document.getElementById("brasil-snapshot").firstChild);
}

function loadCapsula(mesAno) {
  // Extrai dados de dashboard_data.json para esse mês
  // Renderiza grid 2×4 com 8 indicadores
  const mes = dashboard_data.fotografia_mensal[mesAno];
  renderCapsulaGrid(mes);
}
```

---

### P2 Checklist
- [ ] Implementar badges nos chips (`+32% ↑`)
- [ ] Adicionar CSS para badges (positive/negative colors)
- [ ] Pré-renderizar Gasolina no `<head>` (bootstrap data)
- [ ] Testar cold-start (sem dashes em <5s)
- [ ] Adicionar toggle "Por Produto | Cápsula" no Hero
- [ ] Implementar `capsula.js` com `renderMesSelector()`
- [ ] CSS grid 2×4 responsivo (375px, 768px, desktop)
- [ ] Atalhos rápidos (Pandemia, Pico Gasolina, etc.)
- [ ] Validar que todos 8 indicadores aparecem
- [ ] Testar Cápsula em todos os produtos
- [ ] Commit: `Add chip badges and Economic Time Capsule feature`

---

## 🧪 [P3] QA & POLISH — Dia 5-6 (3 horas)

### Objetivo
Validação completa antes de deploy

### P3.1 — 5-Second Comprehension Test

**Teste:** Abrir página sem cache
- [ ] Hero mostra Gasolina + delta em < 5s (sem dashes)
- [ ] Usuário entende "ficou mais caro" imediatamente
- [ ] Chips mostram badges de variação

### P3.2 — Personas Validation

**Jordan (First-Timer):**
- [ ] Entende tagline em 5s
- [ ] Vê números sem esperar JS
- [ ] Descobre produto via chips com badges

**Casey (Mobile):**
- [ ] Grid 2×4 funciona em 375px
- [ ] Fade affordance mostra scroll horizontal
- [ ] Cápsula é explorável em mobile

**Riley (Pesquisador):**
- [ ] Numeração sem saltos (01-08)
- [ ] Metodologia clara e acessível
- [ ] Pode explorar múltiplos meses via Cápsula

### P3.3 — Responsive Testing

**Viewports:**
- [ ] Mobile: 375px (iPhone SE)
- [ ] Tablet: 768px (iPad)
- [ ] Desktop: 1440px
- [ ] Desktop: 1920px

**Checklist:**
- [ ] Sem horizontal scroll em nenhum viewport
- [ ] Tipografia legível
- [ ] Contraste WCAG AA PASS
- [ ] Touch targets ≥ 44px (mobile)

### P3.4 — WCAG AA Audit

**Ferramenta:** Lighthouse ou WAVE
- [ ] Color contrast: PASS
- [ ] Focus indicators: PASS
- [ ] Keyboard navigation: PASS
- [ ] Alt text: PASS
- [ ] Labels: PASS

### P3.5 — Causal Integrity Check

**Validar:**
- [ ] Usuário não pode concluir "governo X causou preço Y"
- [ ] Contexto sempre vem antes de veredicto
- [ ] Disclaimers em 3 camadas visíveis
- [ ] Cápsula mostra correlação, não causação

### P3 Checklist
- [ ] 5-second cold-start test ✓
- [ ] Personas paths tested ✓
- [ ] Mobile 375px tested ✓
- [ ] Tablet 768px tested ✓
- [ ] Desktop 1440px/1920px tested ✓
- [ ] Lighthouse WCAG AA PASS ✓
- [ ] Causal integrity validated ✓
- [ ] No console errors ✓
- [ ] Cross-browser (Chrome, Firefox, Safari) ✓
- [ ] Commit: `Phase 1 complete: QA passed, ready for Phase 2`

---

## 🎯 Ordem de Execução (Segura, Low Risk)

```
DIA 1 (Hoje):
  [P0.1] Corrigir contraste CSS (5 min)
  [P0.2] Sincronizar breakpoint JS (5 min)
  [P0] Test & Commit (15 min)

DIA 2:
  [P1.1] Mover interlúdio (30 min)
  [P1.2] Extrair brasil-snapshot (20 min)
  [P1.3] Mover governos (20 min)
  [P1.4] Dinâmica numeração (30 min)
  [P1] Test & Commit (20 min)

DIA 3-4:
  [P2.1] Badges chips (1h)
  [P2.2] Preload Gasolina (45 min)
  [P2.3] Toggle view mode (1h)
  [P2.4] Grid 2×4 CSS (45 min)
  [P2.5] Seletor de mês (1h)
  [P2] Test & Commit (1h)

DIA 5-6:
  [P3] QA completo (3h)
  [P3] Final commit & ready for Phase 2

TOTAL: ~15 horas (pode ser paralelo em equipe)
```

---

## ✅ Definition of Done (Phase 1)

- ✅ WCAG AA audit PASS
- ✅ 5-second cold-start test PASS
- ✅ Numeração dinâmica (sem saltos)
- ✅ Badges nos chips
- ✅ Preload Gasolina
- ✅ Cápsula do Tempo funcional
- ✅ Personas validation PASS
- ✅ Responsive 375px/768px/1440px PASS
- ✅ Causal integrity maintained
- ✅ All commits pushed to GitHub
- ✅ Ready for Phase 2 (Design Direction)

---

**Status:** 🚀 Pronto para iniciar [P0]

**Próximo passo:** Começar [P0.1] agora?

**1** → Sim, começar agora
**2** → Revisar antes de começar
**3** → Criar script ainda mais detalhado
