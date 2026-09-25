---
name: CUSTAVA QUANTO?
description: Jornalismo de dados sobre preços e indicadores econômicos no Brasil, 2019–hoje (v2, "Arquivo noturno")
colors:
  paper: "#F3EFE6"
  paper-2: "#E9E3D5"
  paper-3: "#DDD5C3"
  ink: "#121719"
  ink-2: "#3F484C"
  ink-3: "#5F676A"
  night: "#101A1D"
  night-2: "#172327"
  night-3: "#203034"
  on-night: "#EEE8DC"
  on-night-2: "#B5BAB5"
  on-night-3: "#8D9591"
  signal: "#E2A33D"
  signal-ink: "#8A5A10"
  period-bolsonaro: "#2B5C92"
  period-lula: "#B33A3A"
  period-bolsonaro-dark: "#5B8FD6"
  period-lula-dark: "#DD6356"
typography:
  nameplate:
    fontFamily: "Archivo"
    fontWeight: 900
    fontStretch: "62%"
    fontSize: "fit to width (JS mede e ajusta)"
  headline:
    fontFamily: "Newsreader"
    fontWeight: 500
    fontSize: "clamp(2.3rem, 5.6vw, 5.4rem)"
    letterSpacing: "-0.025em"
  numeric-hero:
    fontFamily: "Archivo"
    fontWeight: 800
    fontStretch: "66–72%"
    fontSize: "clamp(5.5rem, 17vw, 15.5rem)"
  body:
    fontFamily: "Archivo"
    fontSize: "17px"
    lineHeight: 1.5
  meta:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.72rem"
    textTransform: uppercase
rounded:
  all: "0 (cantos retos; só pontos de dado e marcadores de notícia são redondos)"
---

# Design System: CUSTAVA QUANTO? (v2)

## Direção: "Arquivo noturno"

Uma publicação, não um painel. Papel de jornal quente para a leitura longa,
interrompido por blocos escuros de "evidência" — a abertura, o Bolso, a
Máquina do tempo e o rodapé — que funcionam como as páginas duplas de uma
revista. Um único acento âmbar marca "o valor que importa". Azul e vermelho
só identificam período.

Três direções foram avaliadas antes desta:

| Direção | Por que não |
|---|---|
| **A. Papel e tinta** (evolução da v1: creme + petróleo + âmbar, tudo claro) | Continuidade segura, mas mantinha a sensação de "relatório vertical": toda seção com o mesmo fundo, sem ritmo. |
| **B. Branco e grafite** (jornalismo econômico contemporâneo) | Neutro demais; com azul/vermelho de período em fundo branco, lê como site de governo ou de banco. |
| **C. Revista de alto contraste** (off-white + preto + um acento forte) | Forte, mas o acento competiria com o âmbar da marca e com as cores de período. |
| **D. Híbrido papel + blocos escuros** ✔ | Mantém a marca (papel, petróleo, âmbar), cria ritmo claro/escuro entre capítulos e dá às experiências-assinatura (Bolso, Máquina do tempo) um palco próprio. |

## Cor

- **Papel** `#F3EFE6` e **tinta** `#121719`: leitura. `paper-2` para o capítulo
  Períodos (um degrau abaixo, para separar sem linha).
- **Noite** `#101A1D` (petróleo quase preto): abertura, Bolso, Máquina do tempo,
  cabeçalho fixo e rodapé.
- **Âmbar** `#E2A33D`: o número que importa (último dado, mês escolhido, o
  "?" da marca). Em texto sobre papel usa-se `#8A5A10` (5,15:1). Âmbar **nunca**
  entra como série de dado ao lado do vermelho de período — o validador reprova
  o par no piso de visão normal (ΔE 11,3).
- **Períodos** — só identificador, nunca bom/ruim, sempre acompanhados de texto
  ("Bolsonaro", "Lula") e de forma (quadrado / círculo no `.pmark`):
  - papel: `#2B5C92` / `#B33A3A` — PASS em todos os checks do
    `validate_palette.js` (skill dataviz) sobre `#F3EFE6`.
  - noite: `#5B8FD6` / `#DD6356` — PASS em todos os checks sobre `#101A1D`.
    (Os tons claros da v1 falhavam faixa de luminosidade e croma no escuro.)
- **Contraste de texto** (WCAG): ink 15,7 · ink-2 8,2 · ink-3 5,0 (papel) /
  4,5 (paper-2) · on-night 14,5 · on-night-2 9,0 · on-night-3 5,8. Anel de foco:
  tinta no papel, âmbar no escuro (≥ 3:1 nos dois).

## Tipografia

- **Newsreader** (serifa editorial com tamanho óptico): a voz — títulos de
  capítulo, frases-resumo, manchetes das matérias, o mês da Máquina do tempo.
- **Archivo** (grotesca com eixo de largura): todo número e toda interface.
  Condensada (62–72%) e pesada nos números-protagonista e no nome; largura
  normal no texto de interface. Números grandes usam algarismos proporcionais;
  `tabular-nums` só em colunas e tabelas.
- **IBM Plex Mono**: metadados, fontes, datas, rótulos de eixo e de capítulo —
  o "caderno do repórter".
- **Nome (nameplate)**: "CUSTAVA QUANTO?" em uma linha, de margem a margem, com
  o "?" em âmbar — o motivo recorrente da marca (cabeçalho, rodapé). O tamanho
  é medido em JS depois que as fontes carregam, então nunca transborda mesmo
  com a fonte reserva.

## Grade e ritmo

- Contêiner de até 1680px, calha `clamp(16px, 4vw, 56px)`, grade de 12 colunas.
- Capítulos alternam composição de propósito: cabeçalho dividido (Índice,
  Contexto), largo (Preço), empilhado no escuro (Bolso), título-mês gigante
  (Máquina do tempo), faixa de título inteira (Períodos), "flag" em caixa-alta
  condensada (Arquivo) e título discreto (Método — final calmo).
- Elementos de sangria total: a textura da abertura e os blocos escuros.

## Gráficos (SVG próprio — `dashboard/js/charts.js`)

- Sem Plotly: ~3,5 MB a menos e nenhuma dependência de CDN para renderizar.
- Linha principal em tinta, 2,25px; referência pontilhada; grade em hairline
  sólida; rótulos do eixo y numa calha à esquerda; eixo x por ano.
- **Faixas de período**: fundo com 5,5% da cor do período + barra fina no topo
  com texto ("Governo Bolsonaro · jan/2019–dez/2022"). A cor nunca está sozinha.
- **Rótulos diretos seletivos**: início, fim (âmbar), máxima e mínima — nunca
  um número em cada ponto. Rótulos se afastam de marcadores de notícia vizinhos.
- **Marcos de contexto**: letras em caixa (A, B, C…) no topo + legenda embaixo.
  Só datas públicas e documentadas; não implicam causa.
- **Notícias**: círculos numerados sobre a linha, clicáveis, espelhados numa
  lista acessível ao lado.
- **Interação**: crosshair com tooltip (valor primeiro, rótulo depois); setas do
  teclado percorrem os meses e o texto vai para uma região `aria-live`; nos
  pequenos múltiplos, o crosshair é sincronizado entre os quadros.
- **Pequenos múltiplos**: mesma escala vertical para todos (base 100 no ponto de
  partida) — nunca eixo duplo.
- **Alternativa acessível**: cada gráfico tem `aria-label` com o resumo e o
  gráfico principal tem tabela completa.
- **Meses ausentes**: a linha é interrompida (não interpolada) e os meses são
  listados na fonte do gráfico, detectados a partir dos próprios dados.

## Movimento

Curto e com função: contagem dos números-protagonista, linha principal se
desenhando ao trocar de história, textura da abertura se desenhando uma vez,
troca do mês na Máquina do tempo, quadrados do Bolso enchendo. Tudo desligado
com `prefers-reduced-motion`.

## Faça / não faça

- **Faça** usar azul/vermelho só como identificador de período, com texto e forma.
- **Faça** declarar fonte, unidade, frequência e data de todo número.
- **Faça** usar a mesma escala quando dois períodos ou duas séries são comparados.
- **Não** use âmbar para "melhor", nem verde/vermelho para bom/ruim.
- **Não** use sombra decorativa (só o tooltip flutua), gradiente, vidro ou cantos
  arredondados em cartões.
- **Não** escreva "vencedor", "melhor", "pior", "placar".
