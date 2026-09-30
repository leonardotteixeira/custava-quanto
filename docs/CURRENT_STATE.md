# Estado atual do projeto

Última atualização: 28/09/2026
Status: **CURRENT** — escrito lendo o código, os scripts e os dados do
repositório nesta data. Se este arquivo e o código discordarem, vale o código.

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
| **04 Contexto** | O que mais se movia? | Pequenos múltiplos na mesma escala (base 100); no PIB, componentes de oferta e demanda | séries de contexto; `componentes` | PIB: mesma janela 2019–2025 em todos os quadros |
| **05 Máquina do tempo** | Como estava o Brasil em um mês qualquer? | Fotografia do mês, notícias de ±1 mês, atalhos (jan/19, mar/20, set/20, mai/22, dez/22, jul/25, ago/26) | `fotografia_mensal`, `estimativas` | Set/2020 sem dado da ANP: estimativa "≈" só aqui |
| **06 Períodos** | Como se comparam os dois períodos? | Mesma régua, recortes "governo inteiro" e primeiros 12/24/36 meses, retratos oficiais | `resumo_periodos`, `diario` | Bolsonaro 48 meses × Lula em curso; os recortes de mesma duração existem por isso |
| **07 Arquivo** | O que se noticiava, ano a ano? | Matérias por ano, com foto quando existe | `noticias.json` | Contexto, não causa; fotos de outros veículos sem licença de reprodução (ver README) |
| **08 Método** | Como chegaram a estes números? | Fontes, cálculo, PIB, estimativa da ANP, limitações, definições, frescor | texto + `mercados_status.json` | Contém textos **desatualizados** (ver KNOWN_ISSUES H1, H2, M4) |
| **09 Análise** | O que os dados mostram nos dois períodos, com que critério? | Abertura com vídeo decorativo (ilustração gerada por IA, 3 s em laço, sem áudio, `dashboard/assets/video/analise-ruido.mp4`; toca só quando visível, respeita movimento reduzido e tem botão de pausa), regra (com foto da urna eletrônica), régua (mesmo tempo × completo), "Em 1 minuto", uma seção por dimensão (pergunta, números, gráfico, leitura, maiores movimentos), síntese, sensibilidade a pesos, contexto, limites (com foto de protesto, só como contexto), conclusão, auditoria | `analysis_methodology.json`, `analysis_results.json` | Sem nota nem vencedor; pesos editáveis; arquivos para baixar |
| **10 Apoie** | Como ajudar a manter o projeto? | Valores sugeridos, PIX, "para onde vai o apoio", transparência | `SUPPORT_CONFIG` em `dashboard/js/apoie.js` | **Chave PIX não configurada**; sem QR Code; o site não processa nem confirma pagamentos |

## Dimensões da Análise (metodologia v1.0)

| Dimensão | Tipo | Séries |
|---|---|---|
| Custo de vida | A (direção definida) | 5 combustíveis + 6 alimentos, variação **real** |
| Inflação | A | IPCA em 12 meses (média) |
| Renda e poder de compra | A | Salário mínimo real; litros de gasolina por salário mínimo (+ salário nominal, tipo C, só informativo) |
| Atividade econômica | A | PIB (média do crescimento real anual) |
| Mercados | B (só descrição) | Dólar, Selic, Ibovespa |

Janelas: **mesmo tempo de governo** (principal; 44 meses de cada período nos dados
de ago/2026) e **período completo disponível** (Bolsonaro 48 meses × Lula em
curso). Estado do resultado hoje: as quatro dimensões Tipo A têm leitura "mais
favorável" no período Lula no modo principal; no modo completo, Renda fica "sem
diferença relevante". O sentido não muda nos quatro cenários de peso. Detalhes:
[METHODOLOGY.md](METHODOLOGY.md).

## Séries e frescor

| Grupo | Séries | Último dado (28/09/2026) |
|---|---|---|
| Combustíveis | Gasolina, Etanol, Diesel, Diesel S10, GLP (ANP) | ago/2026 (set/2020 sem pesquisa) |
| Alimentos | Arroz, Feijão carioca, Carne (patinho), Leite longa vida, Óleo de soja, Café moído (IBGE/SIDRA, **índice**) | ago/2026 |
| Mercados | Dólar (BCB PTAX), Selic meta (BCB), IPCA (IBGE), Ibovespa (B3) | mensal ago/2026; diário até 22/09/2026 (última execução) |
| Atividade | PIB (IBGE): anual 1996–2025, trimestral até 2026-T2 | 2º trimestre de 2026 (baixado em 25/09/2026) |
| Apoio | Salário mínimo (BCB SGS 1619), Brent (FRED) | set/2026 |
| Notícias | 111 itens verificados | 25/09/2026 |

## Arquitetura resumida

- `scripts/` — 11 scripts de download, 1 de processamento de retratos, 4 de build
  (`build_dataset.py`, `build_dashboard_data.py`, `build_news.py`,
  `build_analise.py`), 1 orquestrador (`update_data.py`) e 1 teste
  (`test_analise.py`). Fluxo completo em [DATA_PIPELINE.md](DATA_PIPELINE.md).
- `data/processed/` — dados versionados; `data/news/` — curadoria manual de
  notícias; `data/raw/` — cache local, não versionado.
- `dashboard/` — `index.html`, `styles.css`, `js/app.js` (orquestra), `charts.js`
  (gráficos SVG), `pib.js`, `analise.js`, `apoie.js`, `util.js`; assets em
  `assets/`.
- `analysis/analysis.py` e `output/` — gráficos estáticos da primeira fase,
  **HISTÓRICO**, fora do pipeline.
- Dependências externas em tempo de leitura: Google Fonts e as imagens das matérias
  (servidas pelos veículos). Dependências Python: `requirements.txt`.
- Não há configuração de deploy, CI nem licença no repositório.

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
