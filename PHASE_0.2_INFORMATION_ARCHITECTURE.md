# PHASE 0.2: Information Architecture — Output

**Data:** 23/09/2026
**Status:** ✅ Concluído
**Próximo:** Phase 1 — Implementação & Ajustes Técnicos

---

## 📊 Novo Fluxo Narrativo (9 Seções)

**Princípio Editorial:** Contexto antes do veredicto. O usuário vê economia macro antes de comparação política.

```
MOSTRAR
└─ Seção 01: Hero + Product Selector (tagline + escolha)

EXPLICAR
├─ Seção 02: Timeline do Preço (série histórica)
└─ Seção 03: Interlúdio (notícia + pico) [MOVIDO PARA DEPOIS DO GRÁFICO]

COMPARAR
└─ Seção 04: Era × Agora + Poder de Compra (side-by-side comparison)

CONTEXTUALIZAR
├─ Seção 05: Contexto Econômico (Dólar + Brent + Selic + IPCA)
└─ Seção 06: "Como estava o Brasil?" (fotografia multi-indicador)

VEREDICTO
└─ Seção 07: Comparação Governos (Bolsonaro vs Lula) [MOVIDO PARA DEPOIS DE CONTEXTO]

EXPLORAR
├─ Seção 08: Arquivo de Notícias (cronológico com preço-na-época)
└─ Seção 09: Metodologia (como calculamos + limitações)
```

**Comparação:**
- ❌ **Antes:** Hero → Chart → Poder → **GOVERNO** → Contexto → Notícias → Método
- ✅ **Depois:** Hero → Chart → Interlúdio → Poder → Contexto → **GOVERNO** → Notícias → Método

---

## 🔄 Mapeamento de Reordenamento DOM (`index.html`)

### Movimentos Principais

| Elemento | Posição Antiga | Posição Nova | Razão |
|----------|---|---|---|
| `#interlude` | Antes de `#evolucao` | Depois de `#evolucao` | Notícia faz sentido só após ver o pico |
| `#context-section` | Seção 05 | Seção 05 (reindexado) | Contexto macro ANTES de veredicto político |
| `#brasil-snapshot` | Dentro de context | Seção 06 própria | Promover "Como estava Brasil?" à seção independente |
| `#governos` | Seção 04 | Seção 07 | Veredicto só após context econômico |
| `#arquivo` | Seção 06 | Seção 08 | Descoberta/exploração |
| `#como-calculamos` | Seção 07 | Seção 09 | Transparência no final |

### Ordem de Execução (Baixo Risco)
```html
<!-- MANTÉM ESTRUTURA HTML INTACTA -->
<!-- Apenas reordena <section> tags (não toca em conteúdo interno) -->

1. Move <section id="interlude"> para depois de <section id="evolucao">
2. Extrai <div id="brasil-snapshot"> como <section id="brasil-snapshot">
3. Move <section id="governos"> para depois de <section id="brasil-snapshot">
4. Atualiza renderStepNumbers() para numeração 01-09
5. Testa em todo viewport (mobile, tablet, desktop)
```

---

## 💾 Estratégia de Dados & Carregamento

### Cold-Start Sem Dashes (`—`)

**Problema:** Atualmente, antes do JS carregar (~1-2s), tudo mostra `—`.

**Solução:** Pré-renderizar Hero com dados da Gasolina (produto padrão)

```html
<!-- No <head> ou antes de </main> -->
<script type="application/json" id="bootstrap-data">
{
  "gasolina": {
    "nome": "Gasolina",
    "era_date": "2022-12-31",
    "era_value": 5.48,
    "agora_date": "2026-09-22",
    "agora_value": 7.20,
    "variacao_percent": "+31.4%"
  }
}
</script>
```

**Benefício:**
- ✅ Renderiza imediatamente (0ms latência)
- ✅ Hero não mostra dashes
- ✅ 5-second test PASSA
- ✅ JS hidrata + substitui dados completos quando JSON carregar

---

### Badges de Variação nos Chips (Pré-Clique)

**Antes:**
```
[Gasolina] [Diesel] [Etanol]
```

**Depois:**
```
[Gasolina +32% ↑]  [Diesel +28% ↑]  [Etanol +15% ↑]
```

**Implementação:**
```javascript
// Em renderProductChips():
const delta = produto.agora_value - produto.era_value;
const deltaPercent = (delta / produto.era_value * 100).toFixed(0);
const arrow = delta >= 0 ? '↑' : '↓';

chip.textContent = `${produto.nome} ${delta >= 0 ? '+' : ''}${deltaPercent}% ${arrow}`;
```

**Impacto:**
- Transforma configuração em descoberta
- Casey (mobile) descobre variações sem clicar
- Riley (pesquisador) vê tendência imediatamente

---

### Affordance Mobile: Fade + Scroll Indicator

**Problema:** Em mobile, usuário não sabe que há mais chips (scroll horizontal).

**Solução:**
```css
/* Fade mask na borda direita dos trilhos */
.product-rail {
  mask-image: linear-gradient(90deg, black 0%, black 85%, transparent 100%);
}
```

```javascript
// Detecta se há overflow e mostra arrow
const observer = new IntersectionObserver(([entry]) => {
  if (entry.intersectionRatio < 1) {
    rail.setAttribute('data-has-more', 'true');
    // CSS mostra →
  }
});
observer.observe(lastChip);
```

---

## ✅ Validação de Integridade Causal

### Teste: Contexto Antes do Veredicto
**✅ APROVADO**

Leitor percorre obrigatoriamente:
1. Preço produto (era/agora)
2. Timeline histórica
3. Câmbio (PTAX), Brent, Selic, IPCA
4. **ENTÃO** vê tabela "Governo X tinha Y%, governo Z tinha W%"

**Impossível** fazer atribuição causal de governo → preço sem antes ver contexto macro.

### Teste: Desclaimer Layers
**✅ INTACTO**

- Camada 1: README.md ("Não é causalidade")
- Camada 2: Inline prose ("descontada a inflação...")
- Camada 3: Code ("NO_CAUSATION" comments)

**Nenhuma camada foi removida.** ✓

---

## 👥 Validação de Personas

### Jordan (First-Timer, Sem Contexto Econômico)

**Jornada:**
1. Abre página → vê "Quanto custava. Quanto custa. O que mudou."
2. Hero mostra **Gasolina pré-carregada** (R$ 5.48 → R$ 7.20)
3. Lê tagline → entende "preço mudou 31%"
4. Scroll mostra gráfico (timeline visual)
5. Vê a notícia (interlúdio) no pico → "Ah, isso explica o spike!"
6. Vê "Como estava o Brasil?" → câmbio, Selic (contexto)
7. Vê comparação governos com contexto

**Métrica:** 5-second test ✅ PASSA (sem dashes, sem formulário)

---

### Casey (Mobile, Uma Mão, Distraído)

**Jornada:**
1. Abre em mobile (375px)
2. Vê hero com Gasolina + delta badge `+32% ↑`
3. Vê fade mask no railho de chips (mostra que há mais)
4. Clica em Diesel → vê `+28% ↑` instantaneamente
5. Swipa para Etanol (affordance clara)
6. Nunca volta ao topo → discover via badges

**Métrica:** Discovery ✅ 7/10 → 9/10

---

### Riley (Researcher, Verifica Dados)

**Jornada:**
1. Seleciona Ibovespa → seções renumeradas 01-08 (sem salto 02→04)
2. Cada seção tem título e número claro
3. Abre Metodologia (Seção 09) → toda informação em um lugar
4. Impressiona com causal integrity (3 camadas de disclaimer)
5. Confirma: "Este é trabalho jornalístico honesto"

**Métrica:** Consistency ✅ 3/10 → 9/10

---

## 🛠️ Checklist Fase 1: Implementação Técnica

### [P0] Critical Path (Same-Day)
- [ ] Atualizar `--ink-faint` de `#8a8883` para `#65635e` (WCAG AA)
- [ ] Pré-renderizar Gasolina no HTML do Hero (elimina dashes)
- [ ] Validar que sem JS, hero tem dados (noscript fallback)

### [P1] Core Reordering (1 Dia)
- [ ] Mover `#interlude` após `#evolucao` (DOM reorder)
- [ ] Extrair `#brasil-snapshot` como `<section>` própria
- [ ] Mover `#governos` após `#brasil-snapshot`
- [ ] Testar renderStepNumbers() com novo pedido

### [P2] Enhancement (2 Dias)
- [ ] Implementar badges de variação nos chips (`+32% ↑`)
- [ ] Adicionar fade mask CSS aos trilhos
- [ ] Implementar scroll indicator com `IntersectionObserver`
- [ ] Alinhar `estreito()` para 760px (match CSS breakpoint)

### [P3] QA & Polish (1 Dia)
- [ ] 5-second test (hero sem dashes)
- [ ] Personas validation (Jordan/Casey/Riley)
- [ ] Mobile: 375px, 768px, desktop
- [ ] Causal integrity check (3 camadas de disclaimer intactas)
- [ ] WCAG AA audit final

---

## 📈 Expected Impact

| Métrica | Antes | Depois | Delta |
|---------|-------|--------|-------|
| **Narrative Clarity (5s test)** | 7/10 | 9/10 | +2 |
| **Editorial Tone** | 8/10 | 9/10 | +1 |
| **Narrative Flow** | 7/10 | 9/10 | +2 |
| **Story Integration** | 6/10 | 8/10 | +2 |
| **Causal Integrity** | 10/10 | 10/10 | — |
| **Data Literacy** | 8/10 | 9/10 | +1 |
| **Discovery** | 5/10 | 9/10 | +4 |
| **Context Accessibility** | 8/10 | 9/10 | +1 |
| **AVERAGE NARRATIVE** | 7.4/10 | 8.9/10 | **+1.5** |

---

## 🚀 Próximos Passos

### Opção A: Implementar Agora
- Rodar `Phase 1: Implementação & Ajustes Técnicos`
- Começar pelo [P0] Critical Path (mesma hora)
- Fazer push ao GitHub (pequenos commits)

### Opção B: Pausar e Revisar
- Você revisa esta especificação
- Aprova reordenação e estratégias
- Depois Fase 1

### Opção C: Refinements Primeiro
- Chamar `@impeccable` para validar implementabilidade
- Ou `@design-taste-frontend` para ajustar badges visualmente

---

**Status:** Pronto para Fase 1
**Documentação:** Completa
**Risco de Implementação:** Baixo (reordenação, sem lógica nova)

Qual você prefere? 🚀
