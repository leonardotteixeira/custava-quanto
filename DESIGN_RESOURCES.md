# Design Resources & Roadmap

## Recursos Instalados

Este projeto tem referências de design e componentes para uma eventual reformulação visual. Todos os recursos estão em `/design-resources/`.

### 1. **web-interface-guidelines** (Vercel Labs)
📁 `design-resources/web-interface-guidelines/`

**O que é:**
- Guia de boas práticas para interfaces web modernas
- Princípios de design da Vercel
- Padrões de UI, accessibility, typography, spacing, cores
- Documentação educacional sobre design system

**Quando usar:**
- Reformular o design do dashboard
- Definir tokens de design (cores, spacing, tipografia)
- Revisar padrões de UI atuais vs. boas práticas
- Melhorar consistency visual

**Links úteis:**
- https://vercel.com/design/web-interface-guidelines

---

### 2. **shadcn-ui-mcp-server** (Jpisnice)
📁 `design-resources/shadcn-ui-mcp-server/`

**O que é:**
- MCP server que fornece acesso a componentes shadcn/ui
- Biblioteca de componentes React reutilizáveis
- Construída com Tailwind CSS + Radix UI
- Componentes modernos: buttons, cards, dialogs, forms, tables, etc.

**Quando usar:**
- Substituir componentes HTML/CSS customizados por shadcn/ui
- Acelerar desenvolvimento de novas seções
- Garantir consistency com padrões de UI estabelecidos
- Integração com Tailwind (já usado no projeto?)

**Links úteis:**
- https://ui.shadcn.com
- https://github.com/shadcn-ui/ui

---

### 3. **21st-ui Skill** (Instalado)
Skill do 21st.dev para gerar componentes UI via prompt

**Quando usar:**
- Prototipagem rápida de layouts
- Inspiração de design para novas seções
- Geração de componentes decorativos

---

## Roadmap de Evolução de Design

### Fase 1: Auditoria & Planejamento
- [ ] Revisar current design vs. vercel web-interface-guidelines
- [ ] Documentar gaps e inconsistências visuais
- [ ] Definir design tokens (colors, spacing, typography, shadows)
- [ ] Criar design system checklist

**Timeline:** Q4 2026 (quando tiver mais contexto visual pronto)

### Fase 2: Componentização com shadcn/ui
- [ ] Mapear componentes atuais que podem ser substituídos
- [ ] Integrar shadcn/ui ao projeto
- [ ] Converter componentes customizados gradualmente
- [ ] Testes de compatibilidade com dados atuais

**Timeline:** Q1 2027

### Fase 3: Redesign Visual
- [ ] Atualizar layout principal do dashboard
- [ ] Reformular seções (breadcrumbs, cards, charts, comparações)
- [ ] Melhorar palette de cores
- [ ] Revisar tipografia e spacing
- [ ] Acessibilidade em primeiro lugar

**Timeline:** Q2 2027

### Fase 4: Polish & Release
- [ ] Testes cross-browser & mobile
- [ ] Testes de acessibilidade (WCAG)
- [ ] Performance review
- [ ] Deploy gradual com feature flags

**Timeline:** Q3 2027

---

## Estrutura Atual do Projeto

```
.
├── dashboard/                    # Frontend atual (HTML/CSS/JS)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── design-resources/             # Novos recursos de design
│   ├── web-interface-guidelines/
│   └── shadcn-ui-mcp-server/
├── scripts/                      # Backend (Python)
├── data/                         # Dados
└── DESIGN_RESOURCES.md          # Este arquivo
```

---

## Próximos Passos

1. **Agora (Set 2026):**
   - Explorar web-interface-guidelines
   - Revisar componentes shadcn/ui disponíveis
   - Notar inconsistências visuais atuais

2. **Depois (quando arquivos estiverem estáveis):**
   - Criar design tokens baseado em Vercel guidelines
   - Planear integração gradual de shadcn/ui
   - Atualizar CSS/HTML com padrões melhores

---

## Referências Externas

- [shadcn/ui docs](https://ui.shadcn.com)
- [Radix UI primitives](https://www.radix-ui.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel Design](https://vercel.com/design)

---

**Última atualização:** 22/09/2026
**Próxima revisão:** Quando começar Fase 1 (planejado para Q4 2026)
