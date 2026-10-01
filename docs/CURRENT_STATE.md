# Estado atual do projeto

Última atualização: 30/09/2026
Status: **CURRENT** — escrito lendo o código, os scripts e os dados do
repositório nesta data. Se este arquivo e o código discordarem, vale o código.

> **Capítulo Apoie desativado (01/10/2026).** O capítulo "10 Apoie", o item do menu e o link do rodapé
> estão com `hidden` em `dashboard/index.html`, e `app.js` não inicia o módulo. O código do Pix continua
> no repositório; para reativar, tire os três `hidden` e a condição em `app.js`. Enquanto isso o site tem
> nove capítulos (a numeração já se ajusta sozinha).
>
> **Atualização de 01/10/2026.** O endereço do site fica sempre `https://custavaquanto.me/`: a navegação
> por capítulos só rola (não usa `#capítulo`) e a série escolhida não vai para a URL (`?historia=` antigo
> ainda é lido). Na Análise, a Parte 1 virou régua do tempo com cartões e "Duas formas de olhar"; "Em 1
> minuto" virou cartões com diferença e classificação neutra; o contexto de cada dimensão tem abas por
> série, gráfico com dica ao passar o mouse, números clicáveis e acontecimentos recolhidos (acordeões).
> Detalhes e limites: [KNOWN_ISSUES.md](KNOWN_ISSUES.md) ("Refinamento da Análise").

## O que é

**CUSTAVA QUANTO?** é um projeto independente de jornalismo de dados. Permite
explorar como preços, inflação, poder de compra, atividade econômica e indicadores
financeiros do Brasil mudaram desde 2019, comparando dois períodos de governo
(Bolsonaro, jan/2019–dez/2022; Lula, jan/2023–último dado disponível, em curso) com
fontes públicas e metodologia aberta. Não é campanha, ranking de governos, nota nem
previsão. Tagline: "Quanto custava. Quanto custa. O que mudou."

É um **site estático** (HTML + CSS + módulos JS, gráficos em SVG próprio, sem
framework nem biblioteca de gráficos) alimentado por um **pipeline Python** que
gera JSON. Não há backend.

## Páginas (capítulos de uma página única)

O site é `dashboard/index.html`, uma publicação em capítulos. A numeração é
recalculada no navegador: o capítulo **Bolso** some nas histórias sem preço ou
índice (Selic, IPCA, Ibovespa, PIB) e os seguintes sobem um número.

| Parte | Pergunta do leitor | Principais elementos | Dados | Interação / limites |
|---|---|---|---|---|
| **Abertura** | O que é isto? | Nome, frase, textura de fundo (Gasolina, Etanol, Dólar, Selic, IPCA, Ibovespa, PIB e salário mínimo; qualquer outra série aparece quando é a história escolhida), faixa de 8 indicadores (Gasolina, Etanol, Dólar, Salário mínimo, Selic, Inflação, Ibovespa, PIB) de dez/2022 ao último dado | `dashboard_data.json` | A série da história escolhida fica em destaque na textura; cada série mantém a própria frequência |
| **01 Índice** | Qual história quero ler? | Sumário de 16 séries em 3 famílias com a variação de dez/2022 ao último dado | `produtos[*]` | Ponto de partida **fixo** em dez/2022 (a opção jan/2019 foi removida em 28/09/2026) |
| **História** (sem número) | Quanto custava e quanto custa? | Era → agora, variação, barras, lede | idem | Selo "último dado disponível" para Dólar/Selic/Ibovespa; PIB traz introdução, cartão do ano, gráfico trimestral e referência histórica de 2010 |
| **02 Preço** | Como evoluiu mês a mês? | Gráfico com faixas de período, marcos, notícias numeradas | `serie_mensal`, `noticias.json` | Nominal/real/% do salário; tabela completa; teclado por setas. PIB: 2019–2025, anual |
| **03 Bolso** | Quanto um salário mínimo comprava? | Poder de compra em litros/índice, seletor de mês | `unidades_por_salario_minimo`, `indice_poder_compra` | Só combustíveis, Dólar e alimentos; alimentos em **índice**, não em kg |
| **04 Contexto** | O que mais se movia? O que estava acontecendo? | Pequenos múltiplos na mesma escala (base 100); no PIB, componentes de oferta e demanda; **linha do tempo** dos marcos históricos por ano, filtrável por dimensão (`js/linhadotempo.js`) | séries de contexto; `componentes`; `noticias.json` (campo `marco`) | PIB: mesma janela 2019–2025 em todos os quadros. Marcos: contexto, não causa |
| **05 Máquina do tempo** | Como estava o Brasil em um mês qualquer? | Fotografia do mês, notícias de ±1 mês, atalhos (jan/19, mar/20, set/20, mai/22, dez/22, jul/25, ago/26) | `fotografia_mensal`, `estimativas` | Set/2020 sem dado da ANP: estimativa "≈" só aqui |
| **06 Períodos** | Como se comparam os dois períodos? | Mesma régua, recortes "governo inteiro" e primeiros 12/24/36 meses, retratos oficiais | `resumo_periodos`, `diario` | Bolsonaro 48 meses × Lula em curso; os recortes de mesma duração existem por isso |
| **07 Análise** | O que os dados mostram nos dois períodos, com que critério? | Abertura com vídeo decorativo (ilustração gerada por IA, 3 s em laço, sem áudio, `dashboard/assets/video/analise-ruido.mp4`; toca só quando visível, respeita movimento reduzido e tem botão de pausa), regra (com foto da urna eletrônica), Parte 1 régua (comparação principal por períodos inteiros; botão para "igual duração"), "Em 1 minuto", Parte 2 o que medimos (níveis de evidência), Partes 3 a 7 uma por dimensão (pergunta, mede/não mede, números, gráfico, leitura, robustez, maiores movimentos), Parte 8 "O que mais pesou?", Parte 9 "Como diferentes prioridades mudam a leitura?" (barras de prioridade, 5 cenários, 1.771 combinações), Parte 10 "Em resumo" (matriz), Parte 11 contexto ("coincide no tempo com"), limites em cartões (com foto de protesto, só como contexto) | `analysis_methodology.json`, `analysis_results.json` | Sem nota nem vencedor; pesos editáveis; arquivos para baixar |
| **08 Arquivo** | De onde vieram as informações? | **Biblioteca de fontes pesquisável** (`js/arquivo.js`): busca por título, veículo, resumo, indicador, dimensão, tipo e ano; filtros de ano, indicador, fonte e dimensão (só com opções que existem nos dados, com contagem); ordenação (mais recentes, mais antigas, mais relevantes durante uma busca); contagem calculada na hora; cartões compactos com miniatura e crédito quando existe; "Ver no Contexto" nos itens que são marcos | `noticias.json` (todos os itens, com `indicadores`, `dimensoes`, `marco`) | Não conta a história em ordem cronológica: é evidência. Fotos de outros veículos sem licença de reprodução (ver README) |
| **09 Método** | Como chegaram a estes números? | Fontes, cálculo, PIB, estimativa da ANP, limitações, definições, frescor, **Audite a análise** (versão e hash da metodologia, períodos, tipos, indicadores, fórmulas e arquivos para baixar) | texto + `mercados_status.json` | Contém textos **desatualizados** (ver KNOWN_ISSUES H1, H2, M4) |
| **10 Apoie** | Como ajudar a manter o projeto? | Valores sugeridos (R$ 10, 25, 50, 100 e outro valor), Pix Copia e Cola no padrão BR Code e QR Code com o valor escolhido, "para onde vai o apoio", transparência | `PIX_KEY`, `MERCHANT_NAME` e `MERCHANT_CITY` em `dashboard/js/apoie.config.js`; QR pela biblioteca `qrcode-generator` (MIT) em `dashboard/vendor/`, carregada só quando há QR | **Chave Pix e nome do recebedor ainda são "COLOQUE_…"**: sem eles a página não gera QR nem código; o site não processa nem confirma pagamentos |

## Dimensões da Análise (metodologia v1.2.1)

| Dimensão | Tipo | Séries |
|---|---|---|
| Custo de vida | A (direção definida) | 5 combustíveis + 6 alimentos, variação **real** |
| Inflação | A | IPCA em 12 meses (média) |
| Renda e poder de compra | A | Salário mínimo real; litros de gasolina por salário mínimo (+ salário nominal, tipo C, só informativo) |
| Mercado de trabalho | A (por série) | Taxa de desocupação, taxa composta de subutilização e rendimento médio real habitual (PNAD Contínua, trimestre móvel; cada série na sua unidade e com um voto) |
| Atividade econômica | A | PIB (média do crescimento real anual) |
| Mercados | B (só descrição) | Dólar, Selic, Ibovespa |

Janelas: **período completo disponível** (principal: Bolsonaro jan/2019–dez/2022,
48 meses × Lula jan/2023–último dado, em curso) e **comparação por igual duração**
(secundária; 44 meses de cada período nos dados de ago/2026). Níveis de evidência:
Custo de vida MÉDIA (alimentos são índice), Inflação, Renda, Mercado de trabalho e
Atividade ALTA, Mercados INFORMATIVA. Estado do resultado hoje (30/09/2026): no período
completo, quatro dimensões apontam para o período Lula e Renda fica "praticamente
igual"; por igual duração, as cinco apontam para o período Lula (a janela muda só a
leitura de Renda). No mercado de trabalho, as três séries votam pelo período Lula; com
a métrica alternativa (variação do início ao fim), a dimensão ficaria praticamente
igual no período completo. Nenhuma das 10.626 combinações de pesos leva a síntese ao
período Bolsonaro. Detalhes: [METHODOLOGY.md](METHODOLOGY.md).

## Séries e frescor

| Grupo | Séries | Último dado (28/09/2026) |
|---|---|---|
| Combustíveis | Gasolina, Etanol, Diesel, Diesel S10, GLP (ANP) | ago/2026 (set/2020 sem pesquisa) |
| Alimentos | Arroz, Feijão carioca, Carne (patinho), Leite longa vida, Óleo de soja, Café moído (IBGE/SIDRA, **índice**) | ago/2026 |
| Mercados | Dólar (BCB PTAX), Selic meta (BCB), IPCA (IBGE), Ibovespa (B3) | mensal ago/2026; diário até 22/09/2026 (última execução) |
| Atividade | PIB (IBGE): anual 1996–2025, trimestral até 2026-T2 | 2º trimestre de 2026 (baixado em 25/09/2026) |
| Mercado de trabalho | Desocupação, subutilização e rendimento médio real (IBGE, PNAD Contínua, trimestre móvel) | jun-jul-ago 2026 (baixado em 30/09/2026) |
| Apoio | Salário mínimo (BCB SGS 1619), Brent (FRED) | set/2026 |
| Notícias | 142 itens verificados, 63 deles marcos de contexto | 30/09/2026 |

## Arquitetura resumida

- `scripts/` — 12 scripts de download (inclui `download_pnad.py`), 1 de processamento de retratos, 4 de build
  (`build_dataset.py`, `build_dashboard_data.py`, `build_news.py`,
  `build_analise.py`), 1 orquestrador (`update_data.py`) e 1 teste
  (`test_analise.py`). Fluxo completo em [DATA_PIPELINE.md](DATA_PIPELINE.md).
- `data/processed/` — dados versionados; `data/news/` — curadoria manual de
  notícias; `data/raw/` — cache local, não versionado.
- `dashboard/` — `index.html`, `styles.css`, `js/app.js` (orquestra), `charts.js`
  (gráficos SVG), `pib.js`, `analise.js`, `apoie.js` e `apoie.config.js`, `util.js`; biblioteca de QR em `vendor/`; assets em
  `assets/`.
- `analysis/analysis.py` e `output/` — gráficos estáticos da primeira fase,
  **HISTÓRICO**, fora do pipeline.
- Dependências externas em tempo de leitura: Google Fonts e as imagens das matérias
  (servidas pelos veículos). Dependências Python: `requirements.txt`.
- Deploy: no ar em https://custavaquanto.me/ (GitHub Pages por branch, raiz redireciona para `/dashboard/`; ver [DEPLOY.md](DEPLOY.md)). Não há CI de testes nem licença.

## Problemas e lacunas conhecidos (resumo)

Lista completa e classificada em [KNOWN_ISSUES.md](KNOWN_ISSUES.md). Os que mais
importam:

1. O Método afirma que arroz e feijão têm preço em R$/kg da CONAB; **os dados não
   têm** (CONAB não integrada).
2. O Método diz que o projeto não pontua o PIB entre os períodos; a Análise dá ao
   PIB uma leitura de direção.
3. PIB e insumos da estimativa da ANP só atualizam com execução manual dos scripts.
4. Scripts legados (`download_bcb.py`, `download_ibovespa.py`) sobrescrevem a fonte
   de produção se rodados.
5. Nenhum teste automático do front-end ou de acessibilidade.

## Próximas prioridades

Ver [ROADMAP.md](ROADMAP.md). Em resumo: (1) alinhar os textos do Método à
realidade dos dados, (2) decidir a posição editorial sobre o PIB na Análise, (3)
colocar o PIB no fluxo de atualização e tornar o aviso de frescor visível, (4)
resolver a integração do preço absoluto de alimentos ou retirar a promessa, (5)
salvar as verificações de acessibilidade e layout como scripts.
