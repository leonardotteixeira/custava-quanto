# PHASE 0: Product Experience Audit & Findings

**Data:** 23/09/2026
**Status:** ✅ Completo
**Próximo:** Phase 0.2 — Information Architecture

---

## 📊 Audit Scores

| Audit | Score | Classification |
|-------|-------|-----------------|
| **Product Experience** | 6.0/10 | Honest but narratively disconnected |
| **Design Health (Impeccable)** | 27/32 (84%) | Good |
| **Narrative Dimensions** | 7.4/10 | Strong editorial intent, weak sequencing |

---

## 🎯 Key Finding

**"Experience redesign before visual redesign. Without ambiguity."**

The product has genuine data journalism DNA but wrong architecture.

---

## 5 Core Problems (Phase 0.1 Audit)

### #1 — Opens with `—` (Dashes Everywhere)
- **Issue:** Hero tagline promises revelation; product delivers blank form
- **Impact:** Fails 5-second comprehension test on first load
- **Root:** JS hydration skeleton with no loading state
- **Solution (Phase 0.2):** Preload default product (Gasolina) in `<head>` or show skeleton shimmer

---

### #2 — Seven Isolated Sections, Not an Arc
- **Issue:** No section passes torch to next; user doesn't know why scrolling
- **Impact:** Narrative Clarity 6/10 → feels encyclopedic, not journalistic
- **Root:** DOM sectioning treats each finding as independent deliverable
- **Solution (Phase 0.2):** Define narrative flow as single through-line (MOSTRAR → COMPARAR → EXPLICAR → CONTEXTUALIZAR → EXPLORAR)

---

### #3 — Interlude (Number + Real News) in Wrong Place
- **Issue:** News clip appears BEFORE chart — before user has seen the peak that gives meaning
- **Impact:** Strong editorial moment wasted; lacks context
- **Root:** Linear scroll order doesn't match discovery logic
- **Solution (Phase 0.2):** Move interlude to AFTER graph, where price spikes provide emotional anchor

---

### #4 — Product Chips Are Mute
- **Issue:** No information before click; "Gasolina" vs "Diesel" equally uninformed
- **Impact:** Discovery friction (5/10); users don't explore variants
- **Root:** Product selector treats chips as pure navigation, not data introduction
- **Solution (Phase 0.2):** Show variation inline: `[Gasolina +14%↑]` transforms configuration into discovery

---

### #5 — Government Comparison (04) Before Economic Context (05)
- **Issue:** Verdict before jury; user sees "+X% no governo Y" before seeing Câmbio, Brent, Selic that explain it
- **Impact:** BIGGEST editorial integrity risk; reader can/will make false causal attribution
- **Root:** Section numbering reflects page construction order, not narrative logic
- **Solution (Phase 0.2):** Invert sections 04/05 (pure DOM reorder; no JS changes)

---

## 3 P1 Technical Issues (Impeccable Critique)

### [P1-A] Low Contrast on `--ink-faint`
- **What:** `#8a8883` = 3.34:1 ratio; fails WCAG AA (needs 4.5:1)
- **Why:** Affects disclaimers that explain product's honesty
- **Fix:** Change to `#65635e` (4.9:1, stays in palette)
- **Impact:** High — methodological transparency unreadable by low-vision users

### [P1-B] Section Numbering Skips 02→04
- **What:** Market indicators hide "Poder de compra" (section 03) but numbers stay hardcoded
- **Why:** Breaks consistency/navigation spine
- **Fix:** Dynamic numbering in `renderStepNumbers()`
- **Impact:** Signals carelessness, undermines editorial authority

### [P1-C] Empty Skeleton Before Hydration
- **What:** All fields render `—` before JS loads; no `<noscript>` fallback
- **Why:** First impression is broken form, not compelling story
- **Fix:** Preload or skeleton shimmer + noscript message
- **Impact:** Critical — fails 5-second test in production

---

## What's Exceptional ✨

### Causal Integrity is Weaponized, Not Performed
- Disclaimer appears in 3 layers (README, inline, code)
- Auto-generated phrases say "descontada a inflação" not "o governo fez"
- Real and rare — don't touch

### News-Clipping Integration Transforms Data into Memory
- Peak price + real headline + value-at-publication date
- Emotional peak of the journey
- Technically sound implementation

### Inline Glossary Tooltips
- Dotted-underline terms (IPCA, Brent, etc.)
- Contextual help without page leave
- Serves first-timers + researchers equally

---

## Editorial vs Dashboard Breakdown

| Section | Current | Target |
|---------|---------|--------|
| Abertura | Hybrid (60% editorial) | Editorial (90%) |
| Interlúdio | Editorial ⚡ | Editorial ⚡ |
| Evolução | Dashboard | Hybrid (chart + narrative voice) |
| Poder de compra | Hybrid | Editorial (pictogram clarity) |
| Governos | Dashboard | Hybrid (contextualized verdict) |
| Contexto económico | Dashboard | Editorial ⚡ |
| Como estava Brasil | Editorial ⚡ | Editorial ⚡ (prominence) |
| Arquivo de notícias | Editorial ⚡ | Editorial ⚡ |
| Metodologia | Transparency | Transparency |

**Goal:** Move from 60% editorial average to 80%+ editorial while keeping data integrity.

---

## Information Architecture Issues

### Current Order (Wrong)
```
1. Hero + selector
2. Chart + toggles (Evolução)
3. Poder de compra (context)
4. GOVERNOS (verdict) ← BEFORE economic context
5. CONTEXTO ECONÓMICO (jury) ← AFTER verdict
6. Como estava Brasil (snapshot)
7. Notícias (archive)
8. Metodologia
```

### Proposed Order (Phase 0.2)
```
1. HERO + SELECTOR (MOSTRAR)
   └─ Abertura: tagline + product choice

2. ERA × AGORA COMPARISON (COMPARAR)
   └─ Side-by-side: then/now with variation %

3. SÉRIE TEMPORAL (EXPLICAR)
   └─ Chart showing full evolution + interlúdio after graph peaks

4. CONTEXTO ECONÓMICO (CONTEXTUALIZAR)
   └─ Dólar + Selic + Ibovespa + IPCA snapshot
   └─ NOW user understands why price moved

5. GOVERNOS COMPARISON (with context)
   └─ "In Bolsonaro era, with this Câmbio context, price was X"
   └─ NOW the verdict makes sense

6. COMO ESTAVA BRASIL (archive state)
   └─ Multi-indicator snapshot for any month user wants

7. NOTÍCIAS (discovery)
   └─ Contemporaneous news for chosen period

8. METODOLOGIA (transparency)
   └─ How we calculated, limitations, caveats
```

**Key Inversion:** Context (jury) BEFORE verdict (judge). Cause BEFORE effect.

---

## Data Literacy Gaps (From Audit)

**Missing or Unclear:**
- [ ] What is an "índice" vs "preço em R$"? (Tooltip exists but not discovered)
- [ ] Why is Poder de compra in "litros/botijões"? (Makes sense post-explanation, not at first encounter)
- [ ] Câmbio: PTAX vs current market quote? (Methodological FAQ needed)
- [ ] Why Brent matters to gasolina? (One-line explainer in chart context)

**Working Well:**
- ✅ Era/Agora comparison language
- ✅ Unit tags clear (R$, %, pts, etc.)
- ✅ Inline glossary tooltips
- ✅ "Nominal vs Real" toggle explanation

---

## Personas at Risk

### Jordan (First-Timer)
**Current problem:** Sees `—` dashes. Doesn't know what to do.
**Phase 0.2 solution:** Default preloaded product + immediate hero comparison = instant clarity

### Casey (Mobile, One Hand)
**Current problem:** No scroll affordance on product chips; sticky link not identifiable as button
**Phase 0.2 solution:** Add fade/arrow to chip rails; style sticky link as button

### Riley (Researcher)
**Current problem:** Section numbering breaks (02→04). Questions if hidden section = bug or feature
**Phase 0.2 solution:** Fixed numbering + IA clarity shows no hidden sections

---

## Causal Integrity Red Flags (To Avoid in Redesign)

❌ Don't show news → price without explicit disclaimer
❌ Don't use colors implying "good" (green) vs "bad" (red)
❌ Don't say "preço subiu porque governo X"
❌ Don't hide Selic/Câmbio context before showing government verdict
❌ Don't imply temporal proximity = causality

✅ Do show: number → context → news → temporal context
✅ Do use: neutral colors + clear source attribution
✅ Do say: "durante o governo X, com Câmbio em Y, preço foi Z"

---

## Success Criteria for Phase 0.2

- [ ] New information architecture defined (9-section flow)
- [ ] Narrative order corrected (context before verdict)
- [ ] Data literacy gaps mapped (what needs UI explanation)
- [ ] Persona paths validated (Jordan/Casey/Riley can succeed)
- [ ] Causal integrity rules codified
- [ ] Chip variation strategy defined (how to show +14% pre-click)
- [ ] Interlude repositioning planned (after graph peaks)
- [ ] Skeletal loading strategy chosen (preload vs shimmer)

---

## Next Phase: 0.2 — Information Architecture

**When:** After Phase 0.1 approval ✅
**Skills needed:** `@impeccable` + `@design-taste-frontend` (conceitual discussion)
**Duration:** 2-3 days
**Output:** 
- Revised IA diagram
- DOM reordering map
- Data enrichment requirements
- Component behavior specs

---

**Status:** Ready for Phase 0.2 execution
**Reviewed by:** @impeccable (critique + audit)
**Approved by:** [Awaiting user approval]
