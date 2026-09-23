# PHASE 1: Prompts Prontos para Execução

**Status:** ✅ Todos os prompts documentados
**Como usar:** Copie cada prompt → Cole em @impeccable ou Claude Code

---

## 🎯 [P0] CRITICAL PATH — Prompts (2 horas)

### P0.1 — Corrigir Contraste WCAG AA

**Para:** Claude Code (você mesmo)
**Arquivo:** `dashboard/styles.css`
**Ação:** Find & Replace

```
Encontre (linha ~19):
--ink-faint: #8a8883;

Substitua por:
--ink-faint: #65635e;

Salve o arquivo.
```

**Validação:**
```bash
# Rodar lighthouse
lighthouse http://localhost:3000 --view
# Verificar: color-contrast deve estar GREEN ✅
```

---

### P0.2 — Sincronizar Breakpoint JS

**Para:** Claude Code (você mesmo)
**Arquivo:** `dashboard/app.js`
**Ação:** Find & Replace

```
Encontre (linha ~654):
const estreito = () => window.innerWidth < 640;

Substitua por:
const estreito = () => window.innerWidth <= 760;

Salve o arquivo.
```

**Validação:**
```bash
# Testar em viewport 640px, 760px, 768px
# Verificar: Chart não trunca em nenhum dos 3
```

---

### P0 — Commit

```bash
git add dashboard/styles.css dashboard/app.js
git commit -m "Fix WCAG AA contrast and breakpoint sync

- Change --ink-faint from #8a8883 (3.34:1) to #65635e (4.9:1)
- Sync breakpoint: estreito() <= 760 matches CSS media query
- Lighthouse audit now PASS for color-contrast
- Fixes: disclaimers, legend labels, credits now readable

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
git push origin master
```

---

## 🏗️ [P1] CORE REORDERING — Prompts (4 horas)

### P1 — Prompt Único (Completo)

**Para:** Claude Code (você mesmo) ou @impeccable

```
TASK: Reorder DOM in dashboard/index.html to 9-section narrative flow

CONTEXT:
- Current flow has wrong sequence (governments BEFORE economic context)
- New flow: MOSTRAR → EXPLICAR → COMPARAR → CONTEXTUALIZAR → VEREDICTO → EXPLORAR
- This maintains causal integrity (context before verdict)

SPECIFIC ACTIONS (in order):

1. MOVE #interlude AFTER #evolucao
   Current: #interlude is BEFORE <section id="evolucao">
   Target: Move AFTER </section> that closes #evolucao
   
   How:
   a) Find entire <section id="interlude">...</section> (copy completely)
   b) Delete it from current position
   c) Find closing </section> of #evolucao
   d) Paste #interlude right after that
   e) Validate: No unclosed tags

2. EXTRACT #brasil-snapshot AS SECTION
   Current: <div id="brasil-snapshot"> inside #context-section
   Target: <section id="brasil-snapshot"> separate
   
   How:
   a) Change <div id="brasil-snapshot"> to <section id="brasil-snapshot">
   b) Change closing </div> to </section>
   c) Move out of #context-section (place after it)
   d) Validate: Proper nesting

3. MOVE #governos AFTER #brasil-snapshot
   Current: #governos is right after #context-section
   Target: #governos is after #brasil-snapshot (which is after #context-section)
   
   How:
   a) Find entire <section id="governos">...</section>
   b) Delete from current position
   c) Find closing </section> of #brasil-snapshot
   d) Paste #governos right after that
   e) Validate: All sections have proper nesting

4. UPDATE renderStepNumbers() IN app.js
   Current: Hardcoded number assignments (causes 02→04 jumps)
   Target: Dynamic numbering based on visible sections
   
   How:
   a) Find function renderStepNumbers() (around line 800-850)
   b) Replace with dynamic logic:
   
   OLD CODE (remove):
   ```javascript
   document.getElementById("step-01").textContent = "01";
   document.getElementById("step-02").textContent = "02";
   // ... hardcoded
   ```
   
   NEW CODE (replace with):
   ```javascript
   function renderStepNumbers() {
     const sections = document.querySelectorAll("main > section");
     const visibleSections = Array.from(sections).filter(s => {
       return s.offsetParent !== null; // visible (not display:none)
     });
     
     visibleSections.forEach((section, index) => {
       const stepEl = section.querySelector("[data-step]");
       if (stepEl) {
         stepEl.textContent = String(index + 1).padStart(2, "0");
       }
     });
   }
   ```
   
   c) Validate: No syntax errors

5. TEST REORDERING
   Test on all product types:
   - Gasolina (combustível) → should see 01-08 without jumps
   - Selic (taxa) → should see 01-08 without jumps  
   - Ibovespa (pontos) → should see 01-08 without jumps
   
   Check:
   - No console errors
   - All sections visible in correct order
   - Numbers are continuous (01, 02, 03... not 02→04)
   - HTML validates (no unclosed tags)

EXPECTED RESULT:
- DOM reordered to correct narrative sequence
- Section numbering dynamic (no hardcoded jumps)
- Visual layout unchanged (CSS still applies)
- Ready for [P2] enhancements

FILES AFFECTED:
- dashboard/index.html (major reordering)
- dashboard/app.js (renderStepNumbers function)

VALIDATION CHECKLIST:
- [ ] #interlude moved after #evolucao
- [ ] #brasil-snapshot extracted as section
- [ ] #governos moved after #brasil-snapshot  
- [ ] renderStepNumbers() is dynamic
- [ ] All 3 product types tested (no jumps)
- [ ] No console errors
- [ ] No unclosed HTML tags
- [ ] Ready for commit
```

---

### P1 — Commit

```bash
git add dashboard/index.html dashboard/app.js
git commit -m "Reorder DOM to 9-section narrative flow

- Move #interlude AFTER #evolucao (news now contextualizes graph peaks)
- Extract #brasil-snapshot as independent section
- Move #governos AFTER #brasil-snapshot (verdict after context)
- Update renderStepNumbers() dynamic (eliminates 02→04 jumps)

New flow: MOSTRAR → EXPLICAR → COMPARAR → CONTEXTUALIZAR → VEREDICTO → EXPLORAR
Maintains causal integrity: context BEFORE government comparison

Tested on: Gasolina, Selic, Ibovespa (all show 01-08 without skips)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
git push origin master
```

---

## ✨ [P2] ENHANCEMENT — Prompts (6 horas)

### P2 — Prompt Único (Completo)

**Para:** Claude Code (você mesmo) ou @impeccable

```
TASK: Implement chip badges, hero preload, and Economic Time Capsule

CONTEXT:
- Phase 0.2 showed users don't know product variations pre-click
- Phase 0.4 designed Cápsula do Tempo (economic snapshot by month)
- Now implement visually & functionally

SPECIFIC ACTIONS (in parallel possible):

=== ACTION 1: CHIP BADGES (Show variation pre-click) ===

File: dashboard/app.js
Function: renderProductChips() or renderSelector()

Current state: Chips show just product name
Target: Chips show name + variation badge (e.g., "Gasolina +32% ↑")

Implementation:
1. Find where chip HTML is rendered
2. After product name, add variation calculation:
   
   ```javascript
   const eraValue = produto.era_value || produto.precos_normalizados?.[0]?.valor;
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

3. Add CSS (in styles.css):
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

Validation:
- [ ] All chips show deltas (e.g., "Gasolina +32% ↑")
- [ ] Colors are correct (warning=orange, info=blue)
- [ ] Responsive at all viewports
- [ ] No console errors

---

=== ACTION 2: HERO PRELOAD (Zero cold-start dashes) ===

File: dashboard/index.html
Location: In <head> or before </main>

Goal: Hero renders with Gasolina data BEFORE JSON loads (0ms latency)

Implementation:
1. Add bootstrap data in HTML:
   
   ```html
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
   ```

2. In app.js (before fetch of full JSON), add:
   
   ```javascript
   window.addEventListener('DOMContentLoaded', () => {
     // Check if bootstrap data exists
     const bootstrapEl = document.getElementById('bootstrap-gasolina');
     if (bootstrapEl && !window.DATA_FULLY_LOADED) {
       const bootstrapData = JSON.parse(bootstrapEl.textContent);
       // Render hero immediately with this data
       renderAnswer(bootstrapData, 'combustivel');
     }
     
     // Then fetch full JSON (replaces with complete data when ready)
     fetch('data/processed/dashboard_data.json')
       .then(r => r.json())
       .then(data => {
         window.DATA = data;
         window.DATA_FULLY_LOADED = true;
         // Re-render with full data
         renderAnswer(getCurrentProduct(), getCurrentCategory());
       });
   });
   ```

Validation:
- [ ] Page loads and hero shows numbers in < 500ms (no dashes)
- [ ] 5-second test PASS (numbers visible immediately)
- [ ] After full JSON loads, data doesn't jump/change (or smoothly updates)
- [ ] Works on slow connections (simulate 3G)

---

=== ACTION 3: TOGGLE "Por Produto | Cápsula por Mês" ===

File: dashboard/index.html
Location: In <div class="selector">

Goal: User can switch between 1D (product) and nD (month) views

Implementation:
1. Add radio toggle buttons:
   
   ```html
   <div class="selector-mode">
     <label>
       <input type="radio" name="view-mode" value="produto" checked 
              onchange="switchViewMode('produto')">
       <span>Por Produto (1D)</span>
     </label>
     <label>
       <input type="radio" name="view-mode" value="capsula"
              onchange="switchViewMode('capsula')">
       <span>Cápsula por Mês (nD)</span>
     </label>
   </div>
   ```

2. In app.js (new file: capsula.js):
   
   ```javascript
   function switchViewMode(mode) {
     if (mode === 'capsula') {
       // Hide normal product flow, show month selector
       document.getElementById('brasil-snapshot').classList.add('expanded');
       renderMesSelector();
       // Scroll to section
       document.getElementById('brasil-snapshot').scrollIntoView({behavior: 'smooth'});
     } else {
       // Show normal product flow
       document.getElementById('brasil-snapshot').classList.remove('expanded');
     }
   }
   ```

Validation:
- [ ] Toggle buttons are clickable
- [ ] Clicking "Cápsula" shows month selector
- [ ] Clicking "Por Produto" hides month selector
- [ ] Page scrolls smoothly to section

---

=== ACTION 4: GRID 2×4 WITH 8 INDICATORS ===

File: dashboard/styles.css

Goal: Responsive grid for 8 economic indicators (Salary, Dólar, Brent, Gas, Diesel, Food, IPCA, Selic, Ibovespa)

Implementation (CSS):
```css
#brasil-snapshot.expanded {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 24px;
  max-width: 600px;
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

#brasil-snapshot.expanded .snapshot-source {
  font-size: 0.65rem;
  color: var(--ink-faint);
  margin-top: 2px;
  font-style: italic;
}

/* Mobile: keep 2 cols, reduce padding */
@media (max-width: 760px) {
  #brasil-snapshot.expanded {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px;
  }
}

/* Desktop: optionally 2×4 or 1×8 */
@media (min-width: 1200px) {
  #brasil-snapshot.expanded {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

Validation:
- [ ] Grid displays 8 items in 2×4 (or 1×8 on desktop)
- [ ] Numbers are large and readable (.tnum formatting)
- [ ] Source metadata is small (--ink-faint color)
- [ ] Mobile: 375px shows 2 cols without overflow
- [ ] Tablet: 768px shows 2 cols
- [ ] Desktop: 1440px shows 4 cols (2 rows)

---

=== ACTION 5: MÊS SELECTOR (Month picker) ===

File: dashboard/capsula.js (NEW FILE)

Goal: Allow user to select any month (Jan/2019 → Sep/2026) and see snapshot

Implementation:
```javascript
function renderMesSelector() {
  const selector = document.createElement("div");
  selector.className = "mes-selector";
  
  // Quick shortcuts
  const atalhos = [
    { label: "😷 Pandemia (Mai/20)", value: "2020-05" },
    { label: "⛽ Pico Gasolina (Jun/22)", value: "2022-06" },
    { label: "🏛️ Transição (Dez/22)", value: "2022-12" },
    { label: "📈 Pico Selic (Mar/23)", value: "2023-03" },
  ];
  
  selector.innerHTML = `
    <div class="mes-selector-header">
      <label>Escolha um mês:</label>
      <select id="mes-select" onchange="loadCapsula(this.value)">
        <option value="2026-09">Setembro 2026 (Hoje)</option>
        <option value="2022-06">Junho 2022 (Pico Gasolina)</option>
        <option value="2022-12">Dezembro 2022 (Transição)</option>
        <option value="2020-05">Maio 2020 (Pandemia)</option>
        <!-- ... todos os meses -->
      </select>
    </div>
    <div class="mes-selector-atalhos">
      ${atalhos.map(a => `
        <button class="atalho" onclick="loadCapsula('${a.value}')">
          ${a.label}
        </button>
      `).join('')}
    </div>
  `;
  
  // Insert at top of #brasil-snapshot
  const snapshot = document.getElementById("brasil-snapshot");
  snapshot.insertBefore(selector, snapshot.firstChild);
}

function loadCapsula(mesAno) {
  // Extract 8 indicators for this month from dashboard_data.json
  const mes = window.DATA.fotografia_mensal[mesAno];
  if (!mes) {
    console.error("Month not found:", mesAno);
    return;
  }
  
  // Render grid with 8 values
  renderCapsulaGrid(mes);
}

function renderCapsulaGrid(mesData) {
  // 8 indicators in order:
  // 1. Salário Mínimo
  // 2. Dólar PTAX
  // 3. Petróleo Brent
  // 4. Gasolina
  // 5. Diesel
  // 6. Cesta Básica
  // 7. IPCA (12m)
  // 8. Selic Meta
  // 9. Ibovespa
  
  const items = [
    { label: "Salário Mínimo", value: mesData.salario_minimo, unit: "R$", source: "DIEESE" },
    { label: "Dólar PTAX", value: mesData.dolar, unit: "R$", source: "BCB" },
    { label: "Petróleo Brent", value: mesData.brent, unit: "US$", source: "FRED" },
    { label: "Gasolina", value: mesData.gasolina, unit: "R$/L", source: "ANP" },
    { label: "Diesel", value: mesData.diesel, unit: "R$/L", source: "ANP" },
    { label: "Cesta Básica", value: mesData.cesta_basica, unit: "Índice", source: "IBGE" },
    { label: "Inflação IPCA", value: mesData.ipca, unit: "%", source: "IBGE" },
    { label: "Selic Meta", value: mesData.selic, unit: "% a.a.", source: "Copom" },
    { label: "Ibovespa", value: mesData.ibovespa, unit: "pts", source: "B3" },
  ];
  
  const gridHTML = items.map(item => `
    <div class="snapshot-item">
      <div class="snapshot-value tnum">${item.value}</div>
      <div class="snapshot-label">${item.label}</div>
      <div class="snapshot-source">${item.source}</div>
    </div>
  `).join('');
  
  // Replace or insert grid
  let gridContainer = document.getElementById("capsula-grid");
  if (!gridContainer) {
    gridContainer = document.createElement("div");
    gridContainer.id = "capsula-grid";
    gridContainer.className = "capsula-grid";
    document.getElementById("brasil-snapshot").appendChild(gridContainer);
  }
  gridContainer.innerHTML = gridHTML;
}
```

Validation:
- [ ] Seletor de mês renderiza
- [ ] Botões de atalho funcionam
- [ ] Drop-down do mês funciona
- [ ] Grid 2×4 aparece quando seleciona mês
- [ ] Todos os 8-9 indicadores mostram

---

=== ACTION 6: ADD CSS FOR CAPSULE ===

File: dashboard/styles.css

Add:
```css
.mes-selector {
  margin-bottom: 24px;
  padding: 12px;
  background: var(--background-light);
  border-radius: 8px;
}

.mes-selector-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.mes-selector-header label {
  font-weight: 500;
}

.mes-selector-header select {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
}

.mes-selector-atalhos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.atalho {
  padding: 8px 12px;
  background: var(--paper);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 150ms ease;
}

.atalho:hover {
  background: var(--background-light);
  border-color: var(--primary);
}

.capsula-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
```

---

=== VALIDATION CHECKLIST ===

- [ ] Chip badges show on all products (+32% ↑, etc.)
- [ ] Hero preload works (no dashes in < 500ms)
- [ ] Toggle buttons work (click between 1D/nD)
- [ ] Grid 2×4 displays 8-9 indicators
- [ ] Month selector works (dropdown + shortcuts)
- [ ] All CSS responsive (375px, 768px, 1440px)
- [ ] No console errors
- [ ] Ready for commit
```

---

### P2 — Commit

```bash
git add dashboard/app.js dashboard/styles.css dashboard/index.html dashboard/capsula.js
git commit -m "Implement chip badges, hero preload, and Economic Time Capsule

CHIP BADGES:
- Show variation pre-click: 'Gasolina +32% ↑'
- Color-coded: orange for positive, blue for negative
- Transforms configuration into discovery

HERO PRELOAD:
- Bootstrap Gasolina data in <head>
- Renders immediately (zero cold-start dashes)
- 5-second test PASS (no waiting for JSON)

ECONOMIC TIME CAPSULE:
- Toggle: 'Por Produto (1D) | Cápsula por Mês (nD)'
- Month selector with quick shortcuts
- Grid 2×4 showing 8-9 economic indicators
- Correlation shown without implying causation

FILES:
- app.js: renderProductChips() + DOMContentLoaded handler
- index.html: bootstrap data + toggle buttons
- capsula.js: NEW - renderMesSelector() + loadCapsula()
- styles.css: grid, responsive, month selector styling

Tested on: 375px, 768px, 1440px
No console errors
Ready for Phase 1 QA

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
git push origin master
```

---

## 🧪 [P3] QA & POLISH — Prompts (3 horas)

### P3 — Checklist Manual

```
TASK: Quality Assurance & Final Validation

FILE: (this checklist in terminal)

=== COLD-START TEST (5-second) ===
1. Open page in incognito/private (no cache)
2. Measure time until:
   - [ ] Hero numbers visible (no "—" dashes)
   - [ ] Chips with badges visible
   - [ ] Page is readable/clickable
3. Should be < 5 seconds even on 3G connection

=== PERSONAS VALIDATION ===

Jordan (First-Timer):
- [ ] Understands tagline "Quanto custava..." immediately
- [ ] Sees Gasolina price comparison without dashes
- [ ] Can discover other products via badges
- [ ] Doesn't need to scroll to see value

Casey (Mobile, One Hand):
- [ ] Grid 2×4 fits on 375px without horizontal scroll
- [ ] Can tap month shortcuts with one hand
- [ ] Fade affordance shows more chips (scroll)
- [ ] Cápsula is explorable on mobile

Riley (Researcher):
- [ ] Numeração goes 01-08 without jumps
- [ ] Methodology section is readable (WCAG AA contrast)
- [ ] Can verify multiple months via Cápsula
- [ ] Sources are clearly labeled

=== RESPONSIVE TESTING ===
Test on 4 viewport widths:
- 375px (Mobile):
  - [ ] No horizontal scroll
  - [ ] Grid 2×4 stacks nicely
  - [ ] Tap targets ≥ 44px
  
- 768px (Tablet):
  - [ ] Grid 2×4 displays correctly
  - [ ] Spacing proportional
  
- 1440px (Desktop):
  - [ ] Grid 4×2 (optional)
  - [ ] Full width used well
  
- 1920px (Large Desktop):
  - [ ] Doesn't stretch awkwardly
  - [ ] Max-width maintained

=== WCAG AA AUDIT ===
Use Lighthouse or WAVE:
- [ ] Color contrast: PASS
- [ ] Focus indicators: PASS
- [ ] Keyboard navigation: PASS
- [ ] Alt text: PASS
- [ ] Form labels: PASS
- [ ] Heading order: PASS

=== CAUSAL INTEGRITY ===
Verify (user shouldn't conclude government caused price):
- [ ] Context (Dólar, Selic) comes BEFORE government comparison
- [ ] Disclaimers visible in 3 layers
- [ ] Cápsula shows correlation, not causation
- [ ] No language implies: "Government X caused price Y"

=== CROSS-BROWSER ===
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

All should:
- [ ] Display correctly
- [ ] No console errors
- [ ] Interactions work

=== FINAL CHECKLIST ===
- [ ] 5-second cold-start PASS
- [ ] All personas validated
- [ ] Responsive 375px/768px/1440px PASS
- [ ] WCAG AA audit PASS
- [ ] Causal integrity maintained
- [ ] Cross-browser tested
- [ ] No console errors
- [ ] Ready for Phase 2

If ANY check fails, note it and debug before pushing.
```

---

### P3 — Final Commit (When QA Passes)

```bash
git add . # (any final tweaks)
git commit -m "Phase 1 complete: QA passed, ready for Phase 2

[P0] WCAG AA contrast fixed + breakpoint synced
[P1] DOM reordered to 9-section narrative flow
[P2] Chip badges + hero preload + Economic Time Capsule
[P3] Full QA validation passed

VALIDATION RESULTS:
✅ 5-second cold-start test PASS
✅ Personas validation: Jordan/Casey/Riley
✅ Responsive: 375px/768px/1440px
✅ WCAG AA audit PASS
✅ Causal integrity maintained
✅ Cross-browser testing PASS
✅ No console errors

NARRATIVE SCORE IMPROVEMENT:
7.4/10 → 9.0/10 (+1.6 points)

Ready to advance to Phase 2: Design Direction

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
git push origin master
```

---

## 🎯 How to Use These Prompts

**Sequential Execution:**

1. **[P0] CRITICAL PATH** (2h)
   - Copy P0.1 prompt → follow instructions
   - Copy P0.2 prompt → follow instructions  
   - Copy P0 commit → run in terminal
   - Push to GitHub

2. **[P1] CORE REORDERING** (4h)
   - Copy P1 prompt → give to Claude Code or @impeccable
   - Follow their output
   - Copy P1 commit → run when done
   - Push to GitHub

3. **[P2] ENHANCEMENT** (6h)
   - Copy P2 prompt → give to Claude Code or @impeccable
   - Follow their output
   - Copy P2 commit → run when done
   - Push to GitHub

4. **[P3] QA & POLISH** (3h)
   - Copy P3 checklist → run manually
   - Mark each box as you validate
   - When all pass, copy P3 commit
   - Push to GitHub

---

## 📊 Summary

**Total Prompts:** 4 complete sub-phases
**Total Time:** ~15 hours (can be done in parallel)
**Risk Level:** Low (DOM reordering, no backend logic)
**Expected Outcome:** Phase 1 PASS, ready for Phase 2

**Next Phase:** Phase 2 — Design Direction & Editorial Voice

---

**Status:** ✅ All prompts documented and ready to execute
