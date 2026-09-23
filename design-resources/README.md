# Design Resources Repository

Referências de design e componentes para evolução visual futura do CUSTAVA QUANTO?.

## 📁 O que tem aqui

```
design-resources/
├── web-interface-guidelines/    # Guia de UI/UX (Vercel)
└── shadcn-ui-mcp-server/        # Componentes React modernos
```

## 🚀 Como usar

### 1. Explorar web-interface-guidelines
```bash
cd web-interface-guidelines
# Ver documentação de design principles, colors, spacing, typography
```

**Checklist para design audit:**
- [ ] Colors: palette definida? consistente?
- [ ] Typography: font scale? line heights?
- [ ] Spacing: grid 4px/8px? consistent?
- [ ] Shadows: depth hierarchy?
- [ ] Borders: radius patterns?
- [ ] Components: nomeação consistente?

### 2. Estudar shadcn/ui
```bash
cd shadcn-ui-mcp-server
# Ver componentes disponíveis
# Exemplos: Button, Card, Dialog, Form, Table, etc.
```

**Componentes úteis para o dashboard:**
- `Button` - botões de seleção (combustível, alimentos, mercados)
- `Card` - cards de comparação (Era vs Agora)
- `Dialog` - modals de detalhes
- `Table` - tabelas de dados
- `Select` - dropdowns
- `Tabs` - abas de navegação

### 3. Usar 21st-ui Skill
No Claude Code, use a skill `21st-ui` para:
- Gerar layouts novos
- Inspiração de design
- Prototipagem rápida

```
@21st-ui Generate a modern dashboard header with navigation, 
showing Dólar, Selic, and Ibovespa indicators
```

## 📋 Design Audit Checklist

Antes de começar redesign:

### Visual Consistency
- [ ] Cores: todas as cores vêm de um palette definido?
- [ ] Tipografia: font-family, tamanhos, weights consistentes?
- [ ] Spacing: múltiplos de 4px ou 8px?
- [ ] Ícones: style consistente (outline vs filled)?

### Accessibility
- [ ] Contrast: texto vs fundo atende WCAG AA?
- [ ] Focus states: elementos interativos têm focus visível?
- [ ] Labels: inputs têm labels associadas?
- [ ] Keyboard nav: tudo funciona com teclado?

### Layout
- [ ] Breakpoints: responsive em mobile/tablet/desktop?
- [ ] Padding: margens consistentes?
- [ ] Alignment: elementos alinhados em grid?
- [ ] Shadows: hierarquia de profundidade clara?

### Components
- [ ] Buttons: estados (default, hover, active, disabled)?
- [ ] Cards: padding, shadows, borders consistentes?
- [ ] Forms: layout, validation, errors claros?
- [ ] Charts: cores legíveis, labels claros?

## 🗓️ Timeline Sugerida

| Fase | Timeline | Foco |
|------|----------|------|
| **1. Auditoria** | Q4 2026 | Documentar gaps atuais |
| **2. Componentes** | Q1 2027 | Integrar shadcn/ui |
| **3. Redesign** | Q2 2027 | Visual overhaul |
| **4. Polish** | Q3 2027 | Testes e refinements |

## 📚 Documentação Externa

- [shadcn/ui](https://ui.shadcn.com) - Componentes React
- [Radix UI](https://www.radix-ui.com) - Primitivos de UI acessíveis
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [Vercel Design](https://vercel.com/design) - Design principles

## 💡 Dicas

1. **Não remodelar tudo de uma vez** - Evolua gradualmente
2. **Manter dados funcionando** - Design não deve quebrar funcionalidade
3. **Mobile first** - Começar pelo menor breakpoint
4. **Acessibilidade no core** - Não é "extra", é obrigatório
5. **Component library** - Criar design tokens primeiro (cores, spacing, typography)

---

**Última atualização:** 22/09/2026

Ver `../DESIGN_RESOURCES.md` para roadmap completo.
