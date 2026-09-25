---
name: CUSTAVA QUANTO?
description: Publicação de dados sobre preços, economia e poder de compra no Brasil, 2019–hoje
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
  chart-product: "#b7791f"
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
    fontSize: "clamp(3rem, 0.9rem + 6.4vw, 6rem)"
    fontWeight: 600
    lineHeight: 0.97
    letterSpacing: "-0.03em"
  nameplate:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2rem, 1rem + 3.6vw, 3.9rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.005em"
  story-headline:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2.7rem, 1.1rem + 4.8vw, 5.6rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2.1rem, 1.2rem + 2.8vw, 3.7rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  lede:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(1.22rem, 1rem + 0.7vw, 1.55rem)"
    fontWeight: 500
    lineHeight: 1.5
  clip-headline:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.32
  numeric-display:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(3.4rem, 1.2rem + 6.4vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  numeric:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  meta:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.74rem"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  hairline: "2px"
  sm: "3px"
  md: "4px"
  circle: "50%"
spacing:
  gutter: "48px"
  column-gap: "32px"
  chapter-gap: "152px"
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "56px"
components:
  index-row:
    textColor: "{colors.ink}"
    padding: "10px 0"
  index-row-active:
    textColor: "{colors.ink}"
    backgroundColor: "{colors.accent-ochre-wash}"
  tab-active:
    textColor: "{colors.ink}"
    padding: "8px 0 9px"
  month-thumb:
    backgroundColor: "{colors.accent-ochre}"
    rounded: "{rounded.hairline}"
  footnote-number:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
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
- Ritmo de capítulo generoso (152px entre seções) — long-form, não dashboard denso
- Composição de publicação: nome com filete duplo, capa, índice tipográfico, matéria principal, página dupla do gráfico, arquivo. Sem cartões, sem pílulas

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
- **Display** (Fraunces 600, até 6rem, lh 0.97): manchete da capa, uma frase por linha, "O que mudou." em itálico âmbar.
- **Nameplate** (Fraunces 700, caixa-alta, até 3.9rem): o nome da publicação.
- **Story headline** (Fraunces 700, até 5.6rem): o nome do produto na matéria principal.
- **Headline** (Fraunces 700, até 3.7rem, máx. 18ch): a pergunta de cada capítulo, sem numeração e sem rótulo acima.
- **Lede** (Fraunces 500, até 1.55rem, lh 1.5): primeiro parágrafo e frases de leitura; capitular na matéria.
- **Numeric display** (Inter 700, até 6rem, -0.04em): Agora e variação principal.
- **Numeric** (Inter 700, ~1.8rem): Era, variação secundária, valores da Cápsula e dos governos.
- **Body** (Inter 400, 16px, lh 1.55), **Meta** (Inter 600, 0.8rem), **Label** (Inter 700, 0.74rem, caixa-alta, 0.1em): rótulo só para cabeçalho de coluna do índice, metadados de recorte e legendas, nunca acima de um título.

### Named Rules
**The Fixed-Role Rule.** Fraunces é voz editorial (perguntas, títulos, frases de resumo); Inter é todo número e toda interface, sem exceção. Um preço nunca aparece em Fraunces; um título de capítulo nunca aparece em Inter. Trocar os papéis quebra a distinção "isto é o analista falando" vs. "isto é o dado".

## Layout

Grade editorial de 12 colunas (`--col-gap: 32px`) dentro de `max-width: 1240px`; o gráfico principal sai para `1440px` (`.wrap.wide`) como página dupla. Gutter de 48px (desktop), 32px (≤1100px) e 20px (≤760px), sincronizado com `estreito()` no JS.

Cada seção escolhe sua proporção, nunca 50/50 por padrão: capa 8/4 (manchete / linha fina), matéria 7/5 (números / variação), "no bolso" 5/7, gráfico em largura total, notas do arquivo 4/8, contexto 8/4 (gráfico / legenda-tabela), Cápsula 8/4 (números / notícias da época), arquivo 200px + resto, notas 4/8.

Ritmo vertical: `--chapter-gap: 152px` (120px ≤1100px, 88px ≤760px). Cada capítulo abre com um filete de 1px na largura do texto; a matéria principal e o índice abrem com filete de 3px. Prosa limitada a ~60–64ch (`--measure: 64ch`).

## Elevation & Depth

Sistema quase inteiramente flat: separação entre blocos vem de bordas finas de 1px (`--line`, `--line-soft`), nunca de sombra. A única sombra do sistema é utilitária, não decorativa: o popover de termo técnico (`.term-pop`) usa `box-shadow: 0 8px 28px -12px rgba(20, 16, 8, 0.28)` porque é um elemento flutuante que precisa se destacar fisicamente do conteúdo atrás dele.

### Shadow Vocabulary
- **Floating popover** (`box-shadow: 0 8px 28px -12px rgba(20, 16, 8, 0.28)`): único uso — tooltip de termo técnico sobre o conteúdo.

### Named Rules
**The Flat-by-Default Rule.** Nenhum card, chip ou botão recebe sombra em repouso. Sombra só aparece em elementos que fisicamente flutuam sobre o conteúdo (popovers), nunca como decoração de superfície de repouso.

## Shapes

Quase tudo é reto: filetes, colunas, tabelas, barras da régua. Raio só onde o elemento é um controle pequeno ou um dado físico: 2px (quadradinhos do pictograma, cursor da régua de meses, tampas das colunas anuais), 3px (botões de mês, select, link de pular), 4px (popover de termo). Círculo (`50%`) para o que é redondo por natureza: retratos, pontos de período, números de nota que espelham os marcadores do gráfico. Nenhuma pílula (999px) e nenhum raio de "card de app".

## Components

### Cabeçalho da publicação
- **Faixa de edição:** "Dados até {último mês}" (lido dos dados), linha fina em Fraunces itálico no centro, links Fontes/Metodologia à direita.
- **Nome:** "CUSTAVA QUANTO?" em Fraunces 700 caixa-alta com o símbolo (arco de 270° com tick, do Brand Book, em `--accent-ink`), fechado por filete de 3px; logo abaixo, a linha de seções (âncoras) fechada por filete de 1px. Nunca girar, espelhar ou fechar o arco.
- **Cabeço corrido:** depois do índice, uma faixa fixa repete o nome, o produto lido e "Índice ↑".

### Índice ("Neste número") — seleção do produto
- Sumário tipográfico em três colunas (Combustíveis, Alimentos, Mercados) separadas por filete vertical de 1px. Cada linha: nome em Fraunces, pontos guia, variação em Inter 700.
- **Ativo:** nome em negrito com grifo `--accent-wash` na metade de baixo e guia sólida. Nunca preenchimento de botão.
- **Variação:** só cor de texto (The Status Pair Rule), sem fundo.
- No celular, cada categoria vira uma grade de duas colunas, alvo mínimo de 44px.

### Matéria principal (Era × Agora)
- Nome do produto como manchete, unidade como etiqueta sublinhada.
- Coluna 7/12: Era (número menor, `--ink-soft`), régua única (base neutra, trecho âmbar da diferença, chave e marcador tracejado da inflação) e Agora (numeric-display).
- Coluna 5/12, depois de um filete vertical: a variação principal em numeric-display `--accent-ink`, a secundária menor. Preço em R$: a % é a principal; alimento, taxa e pontos: a primeira medida.
- Lide em Fraunces com capitular âmbar; nota metodológica como coluna lateral.

### Abas tipográficas (métrica, recorte de governo)
- Texto sublinhado: ativo com traço inferior de 3px `--accent`, hover com traço `--line`. Sem trilho, sem fundo.

### Notas do arquivo (sob o gráfico)
- Lista numerada como nota de rodapé: círculo com o número (espelha o marcador do gráfico), mês como rótulo, manchete em Fraunces (duas linhas). Selecionada: círculo em `--accent`. O painel abaixo abre a matéria com o valor daquele mês.

### Legenda-tabela (Contexto)
- A coluna ao lado do gráfico é a legenda: traço da série (mesmo padrão da linha), nome, variação desde a Era, descrição.

### Cápsula do Tempo
- **Régua de meses:** `input type="range"` nativo (teclado e leitor de tela, `aria-valuetext` com o mês), trilho de 3px preenchido em tinta até o mês, cursor âmbar de 8×26px, anos marcados embaixo, atalhos editoriais como bandeirinhas presas à régua em três alturas. No celular os atalhos viram uma linha de botões sublinhados. Select e anterior/próximo continuam.
- **Página:** mês e ano como manchete gigante (ano em itálico âmbar), período e mês de comparação ao lado, filete de 3px. Gasolina e Dólar em destaque; salário mínimo, Selic, inflação e Ibovespa menores. Cada valor traz o do mês mais recente logo abaixo.
- **"Na mesma época":** até três matérias do arquivo publicadas a até 2 meses do mês escolhido, cada uma com a data visível, e aviso de que é contexto. Sem matéria perto, uma frase dizendo isso.

### Recortes de notícia
- **Destaque** (primeira do ano com foto, ou a primeira específica do produto): foto grande (7/12), manchete grande e resumo ao lado.
- **Nota menor:** filete de 1px, manchete em Fraunces 1.04rem.
- Metadados em caixa-alta espaçada, veículo em negrito. Foto só com licença (Agência Brasil CC BY 4.0) e crédito.

### Cronologia temática (guerra no Irã e combustíveis)
- Seção só para combustíveis, alimentada pelo campo `tema` das matérias verificadas. Coluna 4/12 fixa com a pergunta e o resumo; coluna 8/12 com lista ordenada: dia em Fraunces grande, veículo, manchete-link, resumo e, à direita, o preço do produto no mês da matéria (dado da série). Filete de 3px no topo da lista. Sempre com aviso de que é contexto, não causa.

### Tabela de números (Governos)
- Tabela de jornal: cabeçalho em caixa-alta com filete de 2px, linhas com filete suave, números tabulares à direita, `th scope` em linha e coluna.

### Notas (metodologia)
- Coluna 4/12 com uma frase sobre a origem dos números; coluna 8/12 com `<details>` nativos (Definições, Fontes, Limitações), título em Fraunces e `+`/`–` como indicador.

## Do's and Don'ts

### Do:
- **Do** reservar o acento âmbar para o valor "Agora" e números-chave — raridade é o que dá força (The Rare Ochre Rule).
- **Do** manter Fraunces só em títulos/perguntas/frases-resumo e Inter em todo número/interface (The Fixed-Role Rule).
- **Do** separar blocos com borda fina de 1px em vez de sombra (The Flat-by-Default Rule).
- **Do** usar azul/vermelho de governo só como identificador de período, com peso visual idêntico para os dois.
- **Do** declarar fonte e frequência de cada dado no mesmo tom visual do resto da interface (`--ink-faint`), nunca escondido em tooltip.
- **Do** deixar cada seção escolher sua proporção de grade; número como tipografia, sem caixa em volta.

### Don't:
- **Don't** usar azul ou vermelho institucional para indicar positivo/negativo, certo/errado — isso é o que a paleta de chip-delta (âmbar/azul-petróleo/cinza) existe para fazer, separadamente.
- **Don't** adicionar sombra decorativa a cards, chips ou botões em repouso — sombra é reservada a elementos flutuantes.
- **Don't** usar Fraunces para exibir um número, nem Inter para uma manchete ou pergunta de capítulo.
- **Don't** introduzir radius grande (12px+) tipo "app card" — quebra a referência de recorte de jornal.
- **Don't** deixar o acento âmbar dominar mais de ~10% de uma tela — se parecer necessário, o problema é hierarquia/composição, não falta de cor.
- **Don't** voltar a cartões, pílulas, trilhos de chips, rótulo acima de título ou numeração de capítulo: são o vocabulário de painel que esta publicação substituiu.
- **Don't** tingir o fundo do gráfico por período: o período fica na faixa fina do topo e no corte.

