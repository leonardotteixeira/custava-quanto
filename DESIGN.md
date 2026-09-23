---
name: CUSTAVA QUANTO?
description: Jornalismo de dados sobre preços e indicadores econômicos no Brasil, 2019–hoje
colors:
  paper: "#F6F3EC"
  surface: "#ffffff"
  ink: "#12313A"
  ink-soft: "#55636A"
  ink-faint: "#5e6b71"
  line: "#d6d8d3"
  line-soft: "#e5e5df"
  accent-ochre: "#E2A33D"
  accent-ochre-deep: "#8c5c14"
  accent-ochre-wash: "#f4e9d6"
  period-bolsonaro: "#2b5c92"
  period-lula: "#b33a3a"
  chart-brent: "#16876a"
  chart-cambio: "#7a4fb0"
  chart-ipca: "#8a8883"
  bar-muted: "#cacdc9"
  status-up: "#8c5c14"
  status-down: "#0a5f8a"
  status-flat: "#55636A"
typography:
  display:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2rem, 1.1rem + 2.6vw, 3.3rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(1.9rem, 1.2rem + 2.2vw, 3.1rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  numeric-display:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(3rem, 1.3rem + 4.6vw, 6.2rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.74rem"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  sm: "3px"
  md: "4px"
  lg: "6px"
  pill: "999px"
  circle: "50%"
spacing:
  gutter: "48px"
  chapter-gap: "128px"
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "36px"
  xl: "48px"
components:
  product-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  product-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  segmented-btn-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "3px"
    padding: "8px 14px"
  snap-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "18px 22px"
  month-pill-active:
    backgroundColor: "{colors.accent-ochre-wash}"
    textColor: "{colors.accent-ochre-deep}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
---

# Design System: CUSTAVA QUANTO?

## Overview

**Creative North Star: "O Arquivo do Jornal"**

CUSTAVA QUANTO? se comporta como um arquivo de jornal editorial que virou
produto de dados: papel off-white, tinta petróleo, colunas com filete
superior grosso como manchete de recorte, e um único acento âmbar reservado
para "o valor que importa" em cada tela. A serifa (Fraunces) fala — faz
perguntas, título de capítulo, frase-resumo — enquanto a sem-serifa tabular
(Inter) mostra os números, porque algarismos alinhados sem floreio se leem
mais rápido que os de uma serifa de alto contraste. Nenhuma sombra dramática,
nenhuma cor de "bom/ruim": a identidade visual existe para deixar o dado
falar primeiro e a interface desaparecer.

Como o alcance é publicação pública ampla (não uso pessoal fechado), a
credibilidade visual precisa se estabelecer nos primeiros segundos para um
visitante que nunca ouviu falar do projeto — daí a rejeição confirmada de
qualquer estética "dashboard financeiro" (gradientes vibrantes, cards com
sombra pesada, paleta de marca saturada) ou "app político" (cores de
partido, ícones de bandeira, linguagem de campanha).

**Key Characteristics:**
- Papel + tinta petróleo, um único acento âmbar usado com raridade deliberada
- Serifa = voz editorial; sem-serifa tabular = todo número e toda interface
- Quase flat: bordas finas separam, sombra é exceção pontual (tooltip)
- Azul/vermelho identificam período de governo, nunca julgamento
- Ritmo de capítulo generoso (128px entre seções) — long-form, não dashboard denso

## Colors

Paleta de jornal: papel off-white e tinta petróleo dominam quase toda a tela; cor é reservada para sinalizar informação específica, nunca decoração. Petróleo e âmbar vêm do [Custava Quanto Brand Book](Custava%20Quanto%20-%20Brand%20Book.pdf) (v1, set/2026) — a direção "Índice", adotada aqui só na paleta e no símbolo (nome do produto, tipografia Fraunces/Inter e radius seguem decisões próprias do dashboard, ver Do's and Don'ts).

### Primary
- **Âmbar Editorial** (`#E2A33D`): o único acento de "isto importa" — barra "Agora", valores-chave, marca-texto em frases da lide. Reservado deliberadamente.
- **Âmbar Profundo** (`#8c5c14`): versão texto do acento — números de variação (+32,3%), links visitados, título ativo do capítulo.
- **Âmbar Claro / Wash** (`#f4e9d6`): fundo de destaque suave (marca-texto de lide, pill de atalho de mês selecionado).

### Secondary — Identificadores de Período
- **Azul Institucional** (`#2b5c92`): identifica o governo Bolsonaro. Sóbrio, validado para daltonismo e contraste em fundo claro.
- **Vermelho Institucional** (`#b33a3a`): identifica o governo Lula. Mesma sobriedade, mesmo peso visual do azul — nenhum dos dois é "mais forte".

### Tertiary — Séries de Gráfico (contexto econômico)
- **Verde Petróleo** (`#16876a`): série do Brent.
- **Roxo Câmbio** (`#7a4fb0`): série do câmbio USD/BRL.
- **Cinza Inflação** (`#8a8883`): série do IPCA — deliberadamente menos saturada que Brent/Câmbio, pois é o "pano de fundo" mais do que o destaque.
- **Ocre do Produto** (`#b7791f`): linha do produto selecionado no gráfico de contexto — nunca azul/vermelho, para não confundir com identificador de governo.

### Neutral
- **Papel** (`#F6F3EC`): fundo base de toda a página.
- **Superfície** (`#ffffff`): cards, popovers, inputs — um degrau acima do papel.
- **Tinta Petróleo** (`#12313A`): texto principal, títulos, números de destaque.
- **Texto Secundário** (`#55636A`): texto secundário, legendas, metadados.
- **Texto Terciário** (`#5e6b71`): texto de apoio (fontes, notas de rodapé) — mantém WCAG AA (4.5:1+) sobre `--paper`.
- **Linha** (`#d6d8d3`) / **Linha Suave** (`#e5e5df`): divisores; Linha Suave é o traço mais discreto (dentro de cards), Linha é o traço estrutural (entre seções).
- **Barra Neutra** (`#cacdc9`): valor "Era"/"então" em barras comparativas — deliberadamente sem cor, para que só o "Agora" (âmbar) chame atenção.

### Named Rules
**The Neutral Identifier Rule.** Azul (Bolsonaro) e vermelho (Lula) identificam qual período um dado pertence e nada mais. Nunca usar essas duas cores para indicar positivo/negativo, certo/errado, ou qualquer julgamento de valor — isso quebraria a neutralidade editorial que é o princípio central do produto (ver PRODUCT.md). Validado com `dataviz` skill: par `#2b5c92`/`#b33a3a` passa todos os checks (lightness, chroma, separação de daltonismo protan/deutan/tritan, contraste vs `--paper`) — revalidado contra o novo `--paper` do brand book, PASS mantido.

**The Rare Ochre Rule.** O acento âmbar aparece em no máximo ~10% de qualquer tela. Sua raridade é o que faz "Agora" e os valores-chave saltarem aos olhos sem competir com dado nenhum. Se um novo componente "precisa" de mais âmbar, o problema é a composição, não a regra. Alinhado com o Brand Book: "âmbar com moderação — um ponto de decisão por composição". `--accent` (`#E2A33D`) tem contraste ~2:1 sobre `--paper` — abaixo do piso de texto — por isso nunca é usado como cor de texto direta, só como preenchimento de barra/área grande com o número em `--ink`/`--accent-ink` ao lado.

**The Status Pair Rule.** O par alta/baixa do `chip-delta` usa âmbar (`#8c5c14`, alta) e azul-petróleo (`#0a5f8a`, baixa) — não verde. Testado com `dataviz` skill: o par âmbar/verde-escuro falha separação de daltonismo (ΔE 3.9–5.5, abaixo do piso de 6.0 mesmo com o sinal +/− como reforço textual); âmbar/azul-petróleo passa todos os checks. "Estável" usa cinza neutro (`#55636A`) deliberadamente sem cor — ausência de sinal é a mensagem.

**The Dash-Pattern Backup Rule.** No gráfico de Contexto Econômico, o IPCA (`--c-ipca`, `#8a8883`) é deliberadamente dessaturado — falha o piso de chroma isolado (0.008, abaixo de 0.10), mas nunca depende só da cor: usa traço pontilhado (`dash: "dot"`) contra produto sólido, Brent tracejado e Câmbio traço-ponto, e aparece sempre com legenda visível. Qualquer nova série do gráfico de contexto precisa de um padrão de traço próprio, não só uma cor nova.

## Typography

**Display/Headline Font:** Fraunces (com "Iowan Old Style", Georgia, serif)
**Body/Numeric Font:** Inter (com system-ui, -apple-system, "Segoe UI", sans-serif) — algarismos tabulares (`font-variant-numeric: tabular-nums`)

**Character:** Fraunces é a voz do "Analista Neutro e Rigoroso" — uma serifa contemporânea com personalidade, usada só onde o produto está "falando" (perguntas de capítulo, frases-resumo, manchetes de notícia). Inter é o instrumento neutro que mostra o dado em si: nunca decorativo, sempre legível em qualquer tamanho, dos R$ 6,57 gigantes do hero às legendas de gráfico.

### Hierarquia
- **Display** (Fraunces, 600, `clamp(2rem, 1.1rem + 2.6vw, 3.3rem)`, lh 1.05): a frase de abertura "Quanto custava. Quanto custa. O que mudou."
- **Headline** (Fraunces, 600, `clamp(1.9rem, 1.2rem + 2.2vw, 3.1rem)`, lh 1.08): título de cada capítulo numerado (ex. "Como o preço chegou até aqui?").
- **Numeric Display** (Inter, 700, `clamp(3rem, 1.3rem + 4.6vw, 6.2rem)`, lh 0.95, tabular): os números-protagonista — preço Era/Agora, valor do interlúdio. Maior elemento tipográfico da página, sempre em Inter, nunca em Fraunces.
- **Body** (Inter, 400, 16px, lh 1.5): parágrafos, texto de interface. Medida de leitura máxima ~62ch (`--measure`).
- **Label** (Inter, 700, 0.74rem, letter-spacing 0.1–0.12em, uppercase): kickers de seção, rótulos de categoria ("ERA", "AGORA", "COMBUSTÍVEIS").

### Named Rules
**The Fixed-Role Rule.** Fraunces é voz editorial (perguntas, títulos, frases de resumo); Inter é todo número e toda interface, sem exceção. Um preço nunca aparece em Fraunces; um título de capítulo nunca aparece em Inter. Trocar os papéis quebra a distinção "isto é o analista falando" vs. "isto é o dado".

## Layout

Container principal com `max-width: 1240px` (`.wrap.narrow` reduz para 920px em blocos de leitura). Gutter lateral de 48px no desktop, reduzindo para 32px (≤1100px) e 20px (≤760px) — sincronizado com o breakpoint de JS `estreito()` corrigido em Phase 1.

Ritmo vertical generoso entre capítulos (`--chapter-gap: 128px`, caindo para 104px/80px nos breakpoints menores) — o produto se comporta como uma matéria longa de jornal, não como um dashboard denso de widgets lado a lado. Dentro de um capítulo, grids específicos (ex. `.answer-grid` 2 colunas, `.snapshot-grid` 2×N, `.gov-cols` 2 colunas) colapsam para coluna única em mobile.

Texto de prosa é limitado a ~60–72ch (`--measure: 62ch`) para manter legibilidade de artigo; números-protagonista e barras não têm limite de medida, pois são visuais, não texto corrido.

## Elevation & Depth

Sistema quase inteiramente flat: separação entre blocos vem de bordas finas de 1px (`--line`, `--line-soft`), nunca de sombra. A única sombra do sistema é utilitária, não decorativa: o popover de termo técnico (`.term-pop`) usa `box-shadow: 0 8px 28px -12px rgba(20, 16, 8, 0.28)` porque é um elemento flutuante que precisa se destacar fisicamente do conteúdo atrás dele.

### Shadow Vocabulary
- **Floating popover** (`box-shadow: 0 8px 28px -12px rgba(20, 16, 8, 0.28)`): único uso — tooltip de termo técnico sobre o conteúdo.

### Named Rules
**The Flat-by-Default Rule.** Nenhum card, chip ou botão recebe sombra em repouso. Sombra só aparece em elementos que fisicamente flutuam sobre o conteúdo (popovers), nunca como decoração de superfície de repouso.

## Shapes

Raios pequenos e consistentes em controles interativos: 3px (chips, segmented control), 4px (inputs, popover), 6px (cards, month-selector). Nenhum raio grande tipo "card de app" (12px+) — o objetivo é parecer recorte impresso, não componente de mobile app.

Círculo completo (`50%`) reservado para elementos redondos por natureza: retratos de presidentes, dots de identificação de período, números de marcador de notícia no gráfico. Pill (`999px`) só para controles de filtro/atalho horizontal (month-pill, news-track item).

Elementos estruturais (stat-strip, barras de comparação, filetes de capítulo) são retos, sem raio — reforçam a régua/tabela de jornal em vez do cartão de app.

## Components

### Wordmark / Símbolo
- **Símbolo:** arco de 270° com tick radial na abertura (lê-se como mostrador/lupa/fração de %, sem ser nenhum literalmente) — do Custava Quanto Brand Book, direção "Índice". `stroke: currentColor`, `stroke-width: 5.5` num viewBox de 64×64, herda `--ink` no masthead.
- **Regra de construção:** nunca girar, espelhar ou fechar o arco em círculo completo — a mesma restrição do brand book se aplica aqui.
- **Uso atual:** símbolo inline no `.wordmark` do masthead (18×18px, ao lado do texto "Custava quanto?"); `favicon.svg` na aba do navegador. Assets em `dashboard/assets/brand/`.
- **Nome do produto:** o dashboard mantém "CUSTAVA QUANTO?" como nome confirmado (ver PRODUCT.md) — só a paleta e o símbolo foram adotados do Brand Book, não a tipografia (Piazzolla/Space Grotesk), que fica fora de escopo por decisão do produto.

### Chips (seletor de produto)
- **Estilo:** borda 1px `--line`, fundo `--surface`, radius 3px, padding `7px 13px`.
- **Estado ativo:** fundo `--ink`, texto `--paper` — inversão total, não apenas troca de borda.
- **Badge de variação** (`.chip-delta`): pill pequeno dentro do chip, cor por direção (alta = âmbar `#8c5c14` sobre wash âmbar, baixa = azul-petróleo `#0a5f8a` sobre wash azul, estável = cinza `#55636A`) — paleta própria (The Status Pair Rule), deliberadamente distinta de azul/vermelho de governo para não confundir "subiu/desceu" com "período". O sinal `+`/`−` no próprio texto do badge é reforço textual sempre presente, não decorativo.

### Segmented Control (alternador de métrica: nominal/real/% salário)
- **Estilo:** trilho com borda 1px, padding 3px, fundo `--surface`.
- **Ativo:** fundo `--ink`, texto `--paper`, peso 600 — mesmo padrão de inversão dos chips, para consistência de "isto está selecionado" em todo o produto.

### Cards / Snapshot (Cápsula do Tempo)
- **Estilo:** borda 1px `--line`, radius 6px, fundo `--surface`, padding `18px 22px`.
- **Cabeçalho interno:** separado por `--line-soft` (mais discreto que a borda externa do card).

### Month Selector / Pills (Cápsula do Tempo)
- **Trilho de controles:** fundo `--surface`, borda 1px, radius 6px.
- **Pill de atalho:** radius total (999px), inativo em `--paper`/borda `--line`; ativo em `--accent-wash`/texto `--accent-ink` — único lugar onde o wash âmbar aparece em fundo de botão, reforçando "isto é um atalho especial", não um filtro comum.

### News Clips (recortes de notícia)
- **Filete superior:** 3px sólido `--ink` — a assinatura visual de "isto é uma matéria real", reaproveitada em `.clip` e no cabeçalho de cada card de governo.
- **Metadados:** uppercase, letter-spacing largo, `--ink-soft` — veículo em negrito `--ink`.
- **Título:** sempre Fraunces, nunca Inter (é "fala" editorial, mesmo sendo um link).

### Accordion (Metodologia)
- **Summary:** uppercase, letter-spacing 0.12em, `--ink-soft`, com `+`/`–` como indicador (nunca chevron/seta) — reforça o vocabulário tipográfico em vez de ícone.

## Do's and Don'ts

### Do:
- **Do** reservar o acento âmbar para o valor "Agora" e números-chave — raridade é o que dá força (The Rare Ochre Rule).
- **Do** manter Fraunces só em títulos/perguntas/frases-resumo e Inter em todo número/interface (The Fixed-Role Rule).
- **Do** separar blocos com borda fina de 1px em vez de sombra (The Flat-by-Default Rule).
- **Do** usar azul/vermelho de governo só como identificador de período, com peso visual idêntico para os dois.
- **Do** declarar fonte e frequência de cada dado no mesmo tom visual do resto da interface (label uppercase, `--ink-faint`), nunca escondido em tooltip.

### Don't:
- **Don't** usar azul ou vermelho institucional para indicar positivo/negativo, certo/errado — isso é o que a paleta de chip-delta (âmbar/azul-petróleo/cinza) existe para fazer, separadamente.
- **Don't** adicionar sombra decorativa a cards, chips ou botões em repouso — sombra é reservada a elementos flutuantes.
- **Don't** usar Fraunces para exibir um número, nem Inter para uma manchete ou pergunta de capítulo.
- **Don't** introduzir radius grande (12px+) tipo "app card" — quebra a referência de recorte de jornal.
- **Don't** deixar o acento âmbar dominar mais de ~10% de uma tela — se parecer necessário, o problema é hierarquia/composição, não falta de cor.
