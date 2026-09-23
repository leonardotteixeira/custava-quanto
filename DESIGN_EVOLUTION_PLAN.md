# 📖 Plano de Evolução da Experiência — CUSTAVA QUANTO?

## Visão do Produto

**CUSTAVA QUANTO?** é uma experiência visual e interativa de dados econômicos que permite ao usuário voltar no tempo, comparar preços e indicadores, entender mudanças ao longo dos anos e descobrir o contexto histórico/econômico por trás desses números.

Não é um dashboard financeiro genérico. É **data journalism interativo**. Uma publicação de dados que conta histórias.

A experiência segue a progressão:

**MOSTRAR → COMPARAR → EXPLICAR → CONTEXTUALIZAR → EXPLORAR**

---

## 🎯 Product Design Principles

### 1. **Data First**
Os dados são o protagonista. Tudo mais suporta o dado, não o contrário.

### 2. **Show Before Explain**
Mostrar o número antes de apresentar explicações longas. Visualização antes de prosa.

### 3. **Progressive Disclosure**
Informação simples primeiro; detalhes para quem quiser aprofundar.

### 4. **Editorial, Not Dashboard**
A experiência deve parecer uma publicação interativa de dados, não um painel administrativo genérico.

### 5. **Context Matters**
Um número isolado não conta toda a história. Sempre fornecer contexto: período anterior, indicadores relacionados, eventos contemporâneos.

### 6. **No Invented Data**
Nenhum número, notícia, fonte ou evento pode ser inventado. Se o dado não existe, o campo não existe.

### 7. **No Implied Causality**
Correlação temporal não deve ser apresentada como causalidade. Notícias próximas a um preço não causaram aquele preço.

### 8. **Neutral Visual Language**
A interface não deve induzir uma conclusão política através de cores, hierarquia ou linguagem visual. Períodos presidenciais são identificados (azul/vermelho), mas nunca como positivo/negativo.

### 9. **Consistency**
Mesmo tipo de informação tem comportamento visual consistente em toda a experiência.

### 10. **Mobile Clarity**
A experiência continua compreensível e útil em telas pequenas.

---

## FASE 0: Product Experience & Editorial Direction

**Quando:** Antes de qualquer auditoria visual detalhada

**Objetivo:** Definir a experiência do produto antes de decidir como cada componente ficará.

### 0.1 — Product Experience Audit

Avaliar conceitualmente como o usuário navega pela narrativa.

**Perguntas a responder:**

- Qual é a proposta central do CUSTAVA QUANTO?
- O que o usuário deve entender nos primeiros 5 segundos?
- O que deve entender nos primeiros 30 segundos?
- O que deve conseguir explorar em 2 minutos?
- Qual é a narrativa principal da página?
- Qual é o "hero moment"?
- Qual é a principal pergunta que a página responde?
- Como o usuário passa de um número para contexto?
- Como produtos, indicadores econômicos, notícias e timeline se conectam?
- Como transformar a página em uma experiência contínua em vez de uma coleção de cards?
- O que atualmente parece um dashboard genérico que deveria parecer editorial?
- O que deveria ser eliminado, simplificado ou reorganizado?

**Output esperado:**

Uma análise de arquitetura de experiência documentando:
- A narrativa primária da página
- Os 3 "momentos" principais de compreensão (5s, 30s, 2min)
- Fluxo conceitual do usuário
- Pontos de atrito atuais
- Oportunidades de storytelling

**Não implementar nada nesta etapa.**

---

### 0.2 — Information Architecture

Planejar a arquitetura editorial da experiência.

**Contexto:** O produto trabalha com múltiplas categorias:

- **Preços de Produtos**: combustíveis (gasolina, diesel, etanol), alimentos (arroz, feijão, carne, leite, óleo, café)
- **Indicadores Econômicos**: Dólar (R$/USD), IPCA (inflação acumulada 12m), Salário Mínimo (R$)
- **Indicadores de Mercado**: Selic Meta (% a.a.), Ibovespa (pontos)
- **Contexto Histórico**: notícias contemporâneas, eventos econômicos, timeline
- **Comparação**: periódico (Era × Agora)

**Tarefas:**

1. Distinguir corretamente entre:
   - **Preço** (valor nominal de um bem): gasolina, alimentos
   - **Indicador de taxa** (percentual): Selic, IPCA
   - **Indicador de índice** (pontos): Ibovespa
   - **Indicador de câmbio** (paridade): Dólar
   - **Contexto histórico** (notícia, evento): para entender o "porquê"
   - **Indicador de renda / referência de poder de compra**: Salário Mínimo (R$)

2. Definir conceitualmente como essas categorias se relacionam.

3. Planejar uma estrutura que permita:
   - Buscar por produto específico
   - Navegar por período de tempo
   - Entender como indicadores se relacionam (ex: Selic × Dólar × Ibovespa)
   - Descobrir o contexto histórico de um período

**Output esperado:**

Um diagrama conceitual ou documento descrevendo:
- Tipos de informação e suas características
- Como o usuário navega entre tipos
- Relações primárias entre categorias
- Padrões de acesso esperados (buscar um produto, explorar um período, comparar indicadores)

---

### 0.3 — Editorial Storytelling

Planejar como a interface conta uma história com dados.

**Progressão esperada no usuário:**

1. **O que estamos olhando?** (título + contexto)
2. **Quanto custava?** (preço/taxa histórica)
3. **Quanto custa?** (preço/taxa atual)
4. **Quanto mudou?** (comparação visual + percentual)
5. **Como isso evoluiu?** (série temporal)
6. **O que estava acontecendo?** (contexto histórico + notícias)
7. **Qual indicador ajuda a entender?** (Dólar afetava preço? Selic subiu?)
8. **Qual notícia estava relacionada?** (eventos no período)
9. **O que você quer explorar em seguida?** (navegação intuitiva)

**Regras críticas:**

- **Notícias são contexto, nunca prova.** Nunca dizer "preço subiu porque X aconteceu" sem uma relação causal bem estabelecida.
- **Não inventar relações.** Correlação temporal não implica causalidade.
- **Integrar editorial à visualização.** A narrativa deve estar nas cores, posicionamento, hierarquia — não em blocos de texto separados.

**Output esperado:**

Um documento com wireframes conceituais (ou texto descritivo) mostrando:
- Fluxo de informação na página
- Onde narrativa é visual (gráfico, comparação)
- Onde narrativa é textual (contexto, metodologia)
- Como transições mantêm o foco
- Oportunidades para "descoberta" (o que convida o usuário a explorar mais)

---

### 0.4 — Máquina do Tempo (Conceitual)

Planeja uma experiência em que o usuário seleciona um período/data e visualiza, de forma coerente:

- Preços nominais
- Indicadores econômicos (Dólar, Selic, Ibovespa, IPCA)
- Salário mínimo
- Notícias/eventos relevantes daquele período

**Conceitual apenas.** Não implementar.

**Desafios a resolver no planejamento:**

- Indicadores possuem frequências diferentes (diário, mensal). Como visualizar isso de forma coerente?
- Qual é a "fotografia" ideal de um período?
- Como evitar que a interface fica confusa com muitos dados ao mesmo tempo?
- Como essa "máquina do tempo" se integra ao fluxo principal (não é um painel separado)?

**Output esperado:**

Conceitualmente, uma descrição de:
- Quando e como o usuário acessa a "Máquina do Tempo"
- O que é mostrado quando seleciona um período
- Como dados de diferentes frequências são harmonizados visualmente
- Integração com o fluxo principal (não quebra a narrativa)

---

## FASE 1: Auditoria & Análise

**Quando:** Após aprovação da Fase 0

**Objetivo:** Identificar todos os gaps de experiência e design

### 1.1 — Experience Audit com `@impeccable`

**Skill:** `@impeccable`

```
@impeccable Audit the current CUSTAVA QUANTO? experience (not just the design):

EXPERIENCE ARCHITECTURE:
1. Does the first screen communicate "what is this?" clearly?
2. Is there a clear narrative flow from first number to context?
3. Do cards feel like isolated elements or part of a story?
4. How well does the interface guide discovery?
5. Are products/indicators/context presented in a logical order?
6. Is the "Era vs Agora" comparison immediately understandable?
7. Does the timeline/news feel integrated or tacked-on?
8. Can the user understand what happened around the period in which this changed?

CONTENT CLARITY:
1. Are data sources clear and consistent?
2. Is the update frequency obvious?
3. Is the time period always clear?
4. Are units (R$, %, pontos) always explicit?
5. Is the methodology understandable to a first-time user?

VISUAL HIERARCHY:
1. What's the most prominent element? Is it the right one?
2. Does visual weight match importance?
3. Are different types of information visually distinguished?
4. Is the color usage neutral or does it imply judgment?

PROVIDE: An experience audit scoring 1-10 on narrative clarity, 
and top issues preventing this from feeling like "data journalism" 
vs. "financial dashboard."
```

**Output esperado:**

- Experience score (1-10)
- Top 10 issues de narrativa/experiência
- Recomendações de arquitetura
- Diferença entre gaps de design vs. gaps de experiência

---

### 1.2 — Visual & Accessibility Audit

**Skill:** `@impeccable`

```
@impeccable Audit the visual design and accessibility:

VISUAL CONSISTENCY:
1. Color palette - is it defined? neutral in political context?
2. Typography - scale, weights, hierarchy consistent?
3. Spacing - grid system? alignment?
4. Components - buttons, cards, badges, reusable?
5. Icons - style consistent?

ACCESSIBILITY (WCAG AA):
1. Color contrast ratios
2. Focus indicators visibility
3. Form labels and error messages
4. Keyboard navigation completeness
5. Screen reader friendliness
6. Touch targets (44x44px minimum)
7. Reduced motion preferences respected
8. Mobile readability

PROVIDE: scored report, top visual issues, accessibility gaps, 
priority fixes vs. nice-to-haves.
```

**Output esperado:**

- Scored report (colors, spacing, typography, components, accessibility)
- Top 10 visual/accessibility issues
- Quick wins vs. deep refactors
- Mobile-specific findings

---

## FASE 2: Design Direction & Editorial Voice

**Quando:** Após aprovação da Fase 1

**Objetivo:** Definir o "look & feel" editorial

### 2.1 — Editorial Design Direction

**Skills:** `@design-taste-frontend` + `@impeccable` (second pass)

```
@design-taste-frontend Define the editorial design direction for 
CUSTAVA QUANTO?, based on audit findings:

CURRENT STATE: 
Functional but feels like a template. Not distinctly editorial or data-journalistic.

TARGET STATE:
A visual experience that says "this is a publication about data" not "this is a finance tool."

CONSIDER:
- Minimalist approach (less is more) or rich editorial design?
- Color story: neutral, with accents only for data clarity
- Typography: should enhance reading, not compete with data
- Data viz refinement: sparks work, but need to feel integrated
- Layout: how can whitespace tell a story?
- Overall tone: light, editorial, sophisticated, data-driven, jornalistic, clear

Avoid: looks like Bloomberg, looks like TradingView, looks like Finviz.
Aspire to: feels like FT, Economist, or NYT data section.

CONSTRAINTS:
- Already have frequently updated market data, with the latest available quote clearly timestamped
- Need notícias/timeline integrated (not separate section)
- Mobile-first responsive
- No dark mode requirement (light/editorial is the direction)
- Must work across all product types (prices, indicators, markets)

PROVIDE: 
- Design direction statement (2-3 sentences)
- Color palette (primary, secondary, accents, grays, status)
- Typography scale (H1-H6, body, labels, metadata)
- Editorial character (what does this visual language say?)
```

**Output esperado:**

- Design direction statement
- Color palette with rationale
- Typography scale
- Visual examples or references
- How to apply to different content types (price, indicator, market, context)

---

### 2.2 — Design Tokens & System Foundation

**Skills:** `@impeccable` + `@design-taste-frontend`

```
@impeccable Create a design system foundation for CUSTAVA QUANTO? 
based on the editorial direction:

DESIGN TOKENS:
1. Color system (primary, secondary, accent, grays, status + political period colors)
2. Typography scale (font sizes, weights, line heights)
3. Spacing scale (4px, 8px, 16px, 24px, 32px...)
4. Shadows / elevation (if used)
5. Border radius (buttons, cards, inputs)
6. Component variants (button sizes/states, card types, badge variants)

COMPONENT DEFINITIONS:
- Buttons (primary, secondary, ghost)
- Cards (price card, indicator card, news card, comparison card)
- Badges (status, period, source)
- Inputs & selectors (dropdown, date picker, search)
- Tables (if needed for data comparison)
- Typography (headline, subheading, body, label, caption)
- Charts/graphs (sparklines, comparison bars)

NEUTRALITY REQUIREMENTS:
- Período presidencial: azul (PL) / vermelho (PT) for identification ONLY
- No automatic green=good, red=bad coloring on price changes
- Status indicators (up/down): use symbols (+/-) + arrow + number
- Always provide context before color interpretation

PROVIDE: JSON structure or detailed token spec we can reference during implementation
```

**Output esperado:**

- Complete design token system (JSON or similar)
- Component library spec
- Usage guidelines for each component
- How to maintain neutrality in data visualization

---

## FASE 3: Component Architecture & Information Design

**Quando:** Após aprovação da Fase 2

**Objetivo:** Definir como a informação se organiza visualmente

### 3.1 — Information Layout Architecture

**Skills:** `@impeccable` + `@design-taste-frontend`

Planejar como as seções da página se relacionam visualmente. Não desenhar ainda, apenas planejar.

**Estrutura conceitual (a refinar):**

```
┌─────────────────────────────────────────────────┐
│ HERO: "O que estamos olhando?"                  │
│ Título, contexto, seletor de produto            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ SÉRIE TEMPORAL: gráfico com 4-5 anos            │
│ + sparklines de indicadores relacionados        │
│ + timeline de eventos visível no fundo          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ COMPARAÇÃO: "Era" vs "Agora"                    │
│ Visual dominante, números grandes               │
│ % de mudança, contexto de salário mínimo        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ CONTEXTO: "Como estava o Brasil?"               │
│ Fotografia mensal de múltiplos indicadores      │
│ Dólar, Selic, Ibovespa, IPCA, Salário Mínimo   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ NARRATIVA: Notícias recentes + Eventos históricos
│ Integrada temporalmente com gráfico             │
│ Não um bloco separado                           │
└─────────────────────────────────────────────────┘
```

**⚠️ Importante:** Esta estrutura é uma hipótese inicial de arquitetura, não uma decisão final de layout. A Fase 3 deve explorar e comparar alternativas antes de definir a estrutura final da experiência.

**Tarefas:**

1. Validar que a progressão MOSTRAR → COMPARAR → EXPLICAR → CONTEXTUALIZAR → EXPLORAR está clara
2. Planejar como notícias se integram (não separadas)
3. Definir oportunidades para descoberta (links entre indicadores)
4. Planejar a "Máquina do Tempo" conceitualmente (integrada, não painel)

**Output esperado:**

- Mapa conceitual da página com fluxo de informação
- Hierarquia de importância de cada seção
- Oportunidades de integração (notícia × gráfico, indicador × câmbio, etc.)
- Solução para múltiplas frequências de dados

---

### 3.2 — Comparison Section (Era × Agora)

**Skills:** `@impeccable` + `@design-taste-frontend`

A comparação "Era vs Agora" é uma das narrativas principais. Deve comunicar rapidamente:

```
ERA (último período fechado)
R$ X

AGORA (última cotação disponível)
R$ Y

VARIAÇÃO
+X%
```

E quando apropriado:

```
"Isso representava X% do salário mínimo"
```

**Tarefas:**

1. Definir visualmente como essa comparação é mais clara que barras lado-a-lado
2. Planejar animações quando usuário muda produto
3. Estratégia mobile (menos espaço, como não perder clareza?)
4. Como representar tipos diferentes: preços (R$), taxas (%), índices (pontos), câmbio (paridade)

**Output esperado:**

- Definição visual clara da comparação
- Especificação de animações (não implementar)
- Mobile strategy
- Como adaptar para diferentes tipos de dados

---

### 3.3 — Market Indicators Redesign

**Skills:** `@design-taste-frontend` + `@impeccable`

Dólar, Selic, Ibovespa, IPCA não são "produtos" — são **indicadores econômicos**.

**Desafios:**

- Dólar: cotação diária (R$/USD)
- Selic: taxa oficial (%, frequência de mudança irregular)
- Ibovespa: índice de bolsa (pontos, dias úteis)
- IPCA: índice de inflação (%, mensal)
- Salário Mínimo: política pública (R$, anual com reajustes ocasionais)

Cada um possui frequência, fonte e significado diferentes.

**Tarefas:**

1. Definir como visualizar "Como estava o Brasil?" (fotografia mensal):
   - Mostra Dólar, Selic, Ibovespa, IPCA, Salário Mínimo ao mesmo tempo
   - Para um período específico
   - Permite comparação "Era vs Agora" em múltiplos indicadores

2. Respeitar frequências diferentes sem confundir o usuário
3. Deixar claro qual é a fonte, qual é a atualização mais recente
4. Planejar "cotação ao vivo" (selo de "atualizado em")

**Output esperado:**

- Visual spec de como cada indicador é apresentado
- "Como estava o Brasil?" (fotografia mensal de múltiplos indicadores)
- Estratégia para "cotação ao vivo" sem parecer propaganda
- Como integrar com timeline

---

### 3.4 — Editorial Timeline & News Integration

**Skills:** `@impeccable` + `@design-taste-frontend`

Notícias e eventos históricos não devem ser um bloco separado. Devem estar integrados à narrativa.

**Conceitualmente, explorar:**

1. **Notícias próximas ao gráfico:**
   - Quando usuário passa mouse em um período, aparecem notícias/eventos relevantes?
   - Como não fica confuso?

2. **Timeline como elemento visual:**
   - Trilho horizontal com marcadores de eventos?
   - Como navegar por período via timeline?

3. **"Arquivo da época":**
   - Ao selecionar um período, mostra notícias contemporâneas?
   - Contexto histórico do "que estava acontecendo naquele mês"?

4. **Notícias como cards editoriais:**
   - Se notícia vem recente, onde mora na página?
   - Como se integra com comparação/gráfico?

**Regras críticas:**

- **Sem causalidade inventada:** correlação temporal ≠ causa
- **Fonte sempre visível:** veículo, data, link
- **Recentes vs. históricas:** diferenciação clara
- **Verificáveis:** nunca inventado, sempre com fonte real
- **Temporal proximity ≠ causality:** A presença de uma notícia na timeline não significa que ela tenha relação causal com o indicador exibido. A proximidade temporal deve ser apresentada como contexto, não como explicação causal.

**Output esperado:**

- Especificação conceitual de como notícias se integram
- Múltiplas alternativas exploradas (não decidir ainda qual é a "certa")
- Design sketches (conceitual, não polido)
- Como garantir não parecer "news aggregation" mas "contexto editorial"

---

### 3.5 — Header & Navigation Redesign

**Skills:** `@impeccable` + `@design-taste-frontend`

Refinar o cabeçalho e navegação para refletir editorial, não dashboard.

**Tarefas:**

1. Título/subtítulo comunica "data journalism"?
2. Navegação entre categorias (combustíveis, alimentos, mercados) é intuitiva?
3. Seletor de produto mobile-friendly?
4. Breadcrumb/contexto claro de onde o usuário está?

**Output esperado:**

- Header redesign spec
- Navigation patterns
- Mobile treatment
- Micro-interactions spec (não implementar)

---

## FASE 4: Editorial Experience & Data Visualization

**Quando:** Após aprovação da Fase 3

**Objetivo:** Definir visualizações e padrões específicos

### 4.1 — Graph & Data Visualization Spec

**Skills:** `@design-taste-frontend` + `@impeccable`

Como cada tipo de dado é visualizado:

- **Séries de preço/taxa:** linhas, barras, sparklines?
- **Comparação Era/Agora:** barras, números grandes, outros padrões?
- **Múltiplos indicadores:** como não fica caótico?
- **Timeline visual:** como inserir eventos no gráfico?

**Output esperado:**

- Spec de como cada tipo de dado é visualizado
- Color coding guide (manter neutralidade)
- Quando usar qual visualização

---

### 4.2 — Typography & Readability

**Skills:** `@impeccable` + `@design-taste-frontend`

Garantir que a leitura de dados + narrativa seja fluida:

- Font sizes para diferentes contextos (headline, body, label, metadata)
- Line heights para legibilidade
- Contrast ratios WCAG AA
- Hierarquia clara

**Output esperado:**

- Typography spec refinada
- Test en diferentes tamanhos de tela
- Line height/spacing for readability

---

## FASE 5: Interactions, Accessibility & Mobile

**Quando:** Após aprovação da Fase 4

**Objetivo:** Garantir experiência fluida e acessível

### 5.1 — Micro-interactions

**Skills:** `@improve-animations` + `@review-animations`

Onde adicionar movimento sem distrair:

- Produto selector → smooth transition
- Comparison bar animation → value changes
- Number counters → animação suave
- Hover states → buttons, links, cards
- Timeline navigation → reveal events

**Restrições:**

- Subtle (150-300ms)
- Consistent easing
- Mobile: respeitar `prefers-reduced-motion`
- 60fps (não travar)

**Output esperado:**

- Animation spec por elemento
- Performance guardrails
- Accessibility checklist

---

### 5.2 — Accessibility Deep Dive

**Skills:** `@impeccable` (accessibility focus)

- WCAG AA compliance completo
- Focus indicators visibility
- Keyboard navigation end-to-end
- Screen reader testing
- Touch targets 44x44px
- Color contrast
- Form labels
- Error messages

**Output esperado:**

- Accessibility checklist
- Fixes needed
- Testing protocol

---

### 5.3 — Mobile Experience

**Skills:** `@mobile-native` + `@impeccable`

- Touch-friendly interaction sizes
- Readable at 375px width
- Gesture interactions where appropriate
- Stacked layout clarity
- Tap-to-reveal strategy

**Output esperado:**

- Mobile design spec
- Testing protocol

---

## FASE 6: Implementation

**Quando:** Após aprovação de Fases 1-5

**Objetivo:** Converter designs em código

### 6.1 — Component Library Decision

**Antes de codificar:**

Não assumir que todo o produto será shadcn/ui. Diferenciar:

**COMPONENTES DE UI (candidatos a shadcn/ui):**
- Buttons
- Inputs & Selects
- Tabs
- Accordion
- Dialogs
- Badges
- Tables

**COMPONENTES EDITORIAIS/DATA VIZ (provavelmente custom):**
- Hero section
- Comparação Era/Agora
- Gráficos/sparklines
- Timeline
- Indicadores
- News cards
- Visualizações customizadas

**Decisão:** Qual biblioteca usar para quê?

**Output esperado:**

- Recomendação: shadcn/ui para UI, custom para data viz
- Path de implementação
- Dependency choices

---

### 6.2 — Code Implementation

**Tarefas:**

- [ ] Update CSS com nova paleta de cores
- [ ] Update typography scales
- [ ] Update spacing/grid
- [ ] Add transitions/animations
- [ ] Implement component designs
- [ ] Update responsive breakpoints
- [ ] Mobile/tablet/desktop test

**Por componente:**

1. Header & Navigation
2. Market Indicators
3. Comparison Section
4. Timeline & News
5. Supporting sections

---

## FASE 7: Review & QA

**Quando:** Após implementação

### 7.1 — Final Visual Review

**Skills:** `@impeccable` + `@design-taste-frontend`

- Feels cohesive?
- No jarring transitions?
- Spacing/sizing consistent?
- Hierarchy works?
- Accessibility still 100%?
- Neutral visual language maintained?

---

### 7.2 — Performance & Animation QA

**Skills:** `@review-animations`

- All animations smooth (60fps)?
- Transitions consistent?
- `prefers-reduced-motion` respected?
- Mobile performance good?

---

### 7.3 — Cross-browser & Device Testing

- [ ] Chrome, Firefox, Safari, Edge
- [ ] iPhone SE, iPhone 14, iPad, Android
- [ ] Tablet landscape/portrait
- [ ] Desktop (1440px, 1920px)
- [ ] Keyboard navigation
- [ ] Touch interaction
- [ ] Screen reader (NVDA, JAWS)

---

## Success Criteria

### Editorial & Narrative
✅ User understands "what is this?" in first 5 seconds
✅ Page has clear narrative flow (Mostrar → Comparar → Explicar → Contextualizar → Explorar)
✅ Data, gráficos, contexto parecem partes da mesma experiência
✅ Notícias não parecem um bloco genérico
✅ Timeline integrada, não separada
✅ Sente como "data journalism", não "financial dashboard"

### Comprehension & Data Literacy
✅ 5-second comprehension test passes
✅ 30-second comprehension test passes
✅ 2-minute exploration test passes
✅ Units always clear (R$, %, pontos)
✅ Time periods clearly identified
✅ Data frequency/source understandable
✅ Nominal vs real distinguido quando relevante
✅ Índices não confundidos com preços

### Visual Design
✅ No templated feeling
✅ Clear visual hierarchy
✅ Consistent spacing/colors
✅ Professional, editorial appearance
✅ Visual language is neutral (no implicit judgment through color)

### Accessibility
✅ WCAG AA compliant
✅ 100% keyboard navigable
✅ Screen reader friendly
✅ Touch targets 44x44px
✅ Color contrast OK

### Performance & Interaction
✅ 60fps animations
✅ Mobile-optimized
✅ Fast load times
✅ Smooth transitions
✅ Reduced motion respected

### Functionality
✅ All existing features work
✅ Daily data updates work
✅ Timeline/news integration works
✅ All products render correctly
✅ Mobile/tablet/desktop responsive

---

## Skills Usage Matrix

| Skill | Primary Purpose | Used in Phases | Output |
|-------|-----------------|---|--------|
| `@impeccable` | Audit, review, design guidance, accessibility | 1, 2, 3, 4, 5, 7 | Scored findings, recommendations |
| `@design-taste-frontend` | Editorial direction, refinement, polish | 2, 3, 4, 7 | Design direction, visual guidelines |
| `@21st-ui` | UI component ideas (optional) | 3 (if needed) | Component mockups |
| `@improve-animations` | Micro-interactions spec | 5 | Animation specs |
| `@review-animations` | Animation QA | 7 | Animation audit |
| `@mobile-native` | Mobile UX optimization | 5 | Mobile-specific recommendations |
| `@minimalist-ui` | Editorial design direction (optional) | 2 (if needed) | Minimalist direction |

**Important:**

- Skills should **guide**, not **dictate**. Final decisions remain with the project.
- `@impeccable` audits and validates, doesn't impose aesthetics.
- `@design-taste-frontend` works within editorial direction, doesn't set it alone.
- `@21st-ui` is for UI components only, not the entire product look/feel.

---

## Timeline Overview

```
Phase 0:  📖 PRODUCT EXPERIENCE
          └─ Editorial direction & narrative arc

Phase 1:  📊 AUDIT
          └─ Experience + Visual + Accessibility

Phase 2:  🎨 DESIGN DIRECTION
          └─ Editorial voice + Design tokens

Phase 3:  🏗️ COMPONENT ARCHITECTURE
          └─ Information layout + Specific components

Phase 4:  📈 EDITORIAL & DATA VIZ
          └─ Graphs, typography, readability

Phase 5:  ✨ INTERACTIONS & ACCESSIBILITY
          └─ Animations, WCAG, mobile

Phase 6:  💻 IMPLEMENTATION
          └─ Code conversion

Phase 7:  🎯 REVIEW & QA
          └─ Final testing
```

**Estimated:** 10-12 weeks for full evolution

**Or:** Adopt incremental sprint approach (2 weeks per phase)

---

## Sprint-Based Alternative (Incremental)

If full redesign is too much, do 2-week sprints per phase:

### Sprint 0: Product Experience (1 sprint)
- Audit experience
- Define narrative
- Sketch information architecture

### Sprint 1: Audit (1 sprint)
- Experience audit
- Visual + accessibility audit

### Sprint 2: Direction (1 sprint)
- Editorial design direction
- Design tokens

### Sprint 3-4: Architecture & Components (2 sprints)
- Information layout
- Component specs (comparison, indicators, header, timeline, news)

### Sprint 5: Data Viz & Editorial (1 sprint)
- Graph specs
- Typography

### Sprint 6: Interactions (1 sprint)
- Animations
- Accessibility
- Mobile

### Sprint 7: Implementation (1 sprint)
- Code

### Sprint 8: QA (1 sprint)
- Testing

---

## Current Status

### ⏹️ PLANNING ONLY

No visual changes, no code changes, no skills executed.

**Next step:** Review and approve this plan before moving to Phase 0.

Once approved:
1. Execute Phase 0 (Product Experience & Editorial Direction)
2. Share findings
3. Proceed with Phase 1 (Audit) if direction is clear

**This plan is a blueprint, not a checklist to execute immediately.**

Each phase requires approval before proceeding to the next.

---

## Key Differences from Previous Plan

- **Focus shifted:** From "redesign dashboard components" to "create data journalism experience"
- **Phase 0 added:** Product experience BEFORE visual audit
- **Narrative emphasis:** Explicit storytelling progression built in
- **Information architecture:** How data relates, not just how it looks
- **Editorial integration:** News/timeline not separate, integral to narrative
- **Principles first:** Design principles guide all decisions
- **Skills reorganized:** For supporting editorial vision, not imposing aesthetics
- **Neutrality explicit:** Visual language must not imply political judgment
- **Component architecture:** Distinguish UI components from editorial/data viz
- **Success criteria:** Now include narrative, data literacy, editorial quality
- **Timeline:** Longer, more thoughtful, emphasizes planning over execution

---

**Última atualização:** 23/09/2026
**Status:** Aguardando aprovação do plano
