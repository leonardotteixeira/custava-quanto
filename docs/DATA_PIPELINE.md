# Pipeline de dados

Última atualização: 30/09/2026
Status: **CURRENT** — descreve o que o código faz hoje. Verificado lendo os
scripts em `scripts/` e os arquivos em `data/processed/`.

Regra de arquitetura: **nenhum cálculo econômico acontece no navegador**. O
Python calcula tudo e grava JSON; `dashboard/js/` só escolhe, formata e desenha.
(Exceção documentada: a soma ponderada dos *sentidos* já calculados quando o
leitor muda os pesos em Análise, e razões de exibição, como a variação entre dois
pontos já prontos.)

## Fluxo geral

```
FONTE PÚBLICA
   │  scripts/download_*.py            (cache local em data/raw/, não versionado)
   ▼
data/processed/*.csv | *.json          (séries limpas por fonte; versionadas)
   │  scripts/build_dataset.py         (deflaciona pelo IPCA, marca o período de governo)
   ▼
data/processed/combustiveis_final.csv, cesta_basica_final.csv,
               resumo_periodos_*.csv
   │  scripts/build_dashboard_data.py  (consolida tudo; calcula resumos por período)
   ▼
data/processed/dashboard_data.json     ← fonte única do dashboard
   │  scripts/build_analise.py         (metodologia → resultados; ver METHODOLOGY.md)
   ▼
data/processed/analysis_methodology.json + analysis_results.json
   │
   │  data/news/raw_*.json  →  scripts/build_news.py  →  data/processed/noticias.json
   ▼
dashboard/  (HTML + CSS + módulos JS; lê os 4 JSON acima via fetch)
```

## Quais scripts o `update_data.py` roda (e quais não)

`scripts/update_data.py` é o único orquestrador. Ordem real do código:

| Ordem | Script | Só no modo completo? | Crítico? |
|---|---|---|---|
| 1 | `download_anp.py` | sim (`--rapido` pula) | não |
| 2 | `download_ibge.py` | sim | não |
| 3 | `download_mercados.py` | não | **sim** |
| 4 | `download_salario_minimo.py` | não | não |
| 5 | `download_pnad.py` (mercado de trabalho, IBGE/SIDRA) | não | não |
| 6 | `download_brent.py` | não | não |
| 7 | `download_anp_oficial.py` (série mensal nacional **oficial** da ANP; arquivo pequeno, roda também em `--rapido`) | não | **sim** |
| 8 | `build_dataset.py` (roda nos dois modos; em `--rapido` uma falha não aborta) | não | **sim** no modo completo |
| 9 | `build_dashboard_data.py` | não | **sim** (aborta se falhar) |
| 10 | `build_news.py` | não | não |
| 11 | `build_analise.py`, depois `test_analise.py` | não | não |

**Rodam só à mão (não estão no `update_data.py`):**

| Script | Para quê | Consequência de esquecer |
|---|---|---|
| `download_pib.py` | PIB trimestral (tabela 5932) e anual (6784) | PIB fica na última data baixada; o build só avisa (`frescor` no JSON) |
| `download_pib_componentes.py` | Componentes do PIB e PIB nominal trimestral (tabela 1846) | idem |
| `download_ibge_combustiveis.py` | Variação mensal do IPCA dos combustíveis, insumo da estimativa da lacuna de set/2020 | a estimativa não é recalculada |
| `download_conab.py` | Preço de varejo de arroz/feijão (CONAB) | hoje falha; ver "CONAB" abaixo |
| `process_portraits.py` | Gera os retratos dos presidentes (140/210/280 px) | só precisa rodar se as fotos mudarem |

Scripts **legados/sobrepostos** (existem, não são chamados por nenhum outro script):
`download_bcb.py` e `download_ibovespa.py`. Escrevem os mesmos arquivos que
`download_mercados.py` (`bcb_contexto_mensal.csv`, `bcb_hoje.json`,
`ibovespa_mensal.csv`, `ibovespa_hoje.json`). O `download_ibovespa.py` usa o
Yahoo Finance, cujo histórico diverge do da B3. **Não rode**: sobrescreveriam a
fonte de produção. Ver [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Fontes e indicadores

Legenda: **PROD** = alimenta o dashboard hoje · **SEC** = validação/contexto
secundário · **PLAN** = planejada ou tentada, ainda não integrada.

| Indicador | Fonte | Dataset / API | Frequência | Unidade | Campo/métrica usado | Processamento | Limitações | Status |
|---|---|---|---|---|---|---|---|---|
| Gasolina, Etanol, Diesel, Diesel S10 | ANP | **Série mensal nacional oficial** (`download_anp_oficial.py`, arquivo `mensal-brasil-desde-jan2013.xlsx`); a série por posto (`download_anp.py`) segue como sensibilidade | mensal | R$/litro | `preco_nominal` (série oficial, ponderada por vendas, região `BR`); `preco_real`; `preco_simples_coletas` (média simples das coletas, só em `combustiveis_final.csv`) | Deflacionado pelo IPCA "a preços do último mês" | Amostra de postos da ANP; set/2020 sem dado; sem região mensal oficial | PROD |
| GLP | ANP | idem (arquivo semestral de GLP) | mensal | R$/botijão de 13 kg | idem | idem | idem | PROD |
| Estimativa set/2020 (combustíveis) | ANP + IBGE/SIDRA | último preço ANP × variação mensal do item no IPCA (tabela 7060; `download_ibge_combustiveis.py`) | pontual | R$ | `estimativas[]` no JSON | Só aparece na Máquina do tempo, marcada "≈"; não entra em variações, médias nem períodos | É estimativa, não dado oficial; erro de teste de volta: −0,2% (gasolina) a ~4% (etanol, diesel, gás) | PROD (exibição limitada) |
| Arroz, Feijão carioca, Carne (patinho), Leite longa vida, Óleo de soja, Café moído | IBGE/SIDRA | IPCA por subitem: tabela 1419 (2019) e 7060 (2020+), variável 63, classificação 315 (`download_ibge.py`) | mensal | **índice encadeado, base 100 = jan/2019** | `indice_relativo`; `indice_relativo_real` | Encadeia a variação mensal oficial; deflacionado pelo IPCA | **Não é preço em R$.** "Carne" é só o corte patinho; feijão é a variedade carioca | PROD |
| Preço de varejo (R$/kg) de arroz e feijão | CONAB | Sistema de Informações de Mercado, "Preços Agropecuários" (`download_conab.py`) | mensal por UF | R$/kg | `preco_absoluto` (opcional) | Média simples entre UFs, se integrado | **Não integrado**: `conab_precos_varejo.csv` não existe; a última tentativa (25/09/2026) falhou — o script não achou o link de download na página | **PLAN** |
| Cesta básica em R$ (DIEESE) | DIEESE | — | — | — | — | — | Sem acesso público em lote desde abril/2018; nenhum código a usa | **PLAN / só validação manual** |
| Preços de produtor (CEPEA/ESALQ) | CEPEA | — | — | — | — | — | Avaliado na auditoria e descartado (mede produtor, não consumidor); nenhum código a usa | não usado |
| IPCA (12 meses) | IBGE/SIDRA | tabela 1737, variável 2266 (número-índice; `download_ibge.py`) | mensal | % em 12 meses | `taxa_aa` | `índice do mês ÷ índice de 12 meses antes × 100 − 100`; a série começa em jan/2019 (o número-índice é baixado desde jan/2018 para os 12 meses anteriores) | Exige 12 meses anteriores | PROD |
| IPCA (deflator) | IBGE/SIDRA | idem | mensal | número-índice | `ipca_indice` | Deflator de todos os preços reais | IPCA geral, não específico do item | PROD |
| Salário mínimo | Banco Central (SGS 1619) | `download_salario_minimo.py` | mensal | R$ (nominal) | `salario_minimo`; % do salário e unidades por salário | Divide o preço do mês pelo salário vigente no mês | Piso nacional; não capta pisos regionais | PROD |
| Dólar | Banco Central (SGS 1, PTAX venda) | `download_mercados.py` | diária (dias úteis) + média mensal | R$/US$ | `preco_nominal` (média mensal); `diario.*` (pontas) | Média do mês nas séries; dado diário nas comparações entre dois pontos | Sem dado em fins de semana/feriados | PROD |
| Selic | Banco Central (SGS 432, **meta Selic**) | `download_mercados.py` | diária (valor vigente em cada dia corrido) | % ao ano | `taxa_aa` (média do mês); `diario.*` | Linhas com data futura descartadas (a série é publicada adiantada) | **Não** é a Selic efetiva (série 11) nem o CDI | PROD |
| Ibovespa | B3 | Página pública de estatísticas do índice (backend do site; `download_mercados.py`) | diária (pregões) + fechamento mensal | pontos | `pontos` (fechamento do mês); `diario.*` | Fechamento do último pregão de cada mês | Endpoint **não** é API contratual e pode mudar; não é tempo real; pontos, não R$ | PROD |
| Brent | FRED (DCOILBRENTEU) | `download_brent.py` | diária → média mensal | US$/barril | `brent_usd_bbl`; `brent_brl_bbl` (× câmbio do mês) | Só contexto dos combustíveis | Contexto, não causa | PROD (contexto) |
| PIB real (anual) | IBGE — Contas Nacionais Trimestrais | tabela 5932 (`download_pib.py`), setor 90707 | trimestral → 1 valor/ano | % de crescimento real | `taxa_aa` = "taxa acumulada ao longo do ano" lida no 4º trimestre | Um ponto por ano; ano sem 4º trimestre não tem resultado | O IBGE revisa a série; usamos a última revisão baixada | PROD |
| PIB (trimestral) | IBGE | tabela 5932 | trimestral | % | `variacao_interanual`, `variacao_dessazonalizada`, `acumulado_4tri`, `acumulado_ano` | Quatro leituras separadas, nunca misturadas | idem | PROD |
| PIB nominal e per capita | IBGE — Contas Nacionais Anuais + Trimestrais | tabelas 6784 (anual) e 1846 (trimestral) | anual | R$ | `pib_nominal_bilhoes`, `pib_per_capita_rs` | Anos que a 6784 ainda não fechou usam a **soma dos quatro trimestres** (marcado em `pib_nominal_fonte`) | per capita só vem da 6784 (até 2023) | PROD |
| Componentes do PIB | IBGE | tabela 5932, setores 90687, 90691, 90696, 93404–93408 (`download_pib_componentes.py`) | anual (resultado do 4º trimestre) | % | `componentes[].serie_anual` | idem PIB | idem | PROD |
| Taxa de desocupação | IBGE — PNAD Contínua | SIDRA tabela 6381, variável 4099 (`download_pnad.py`) | trimestre móvel (1 resultado por mês, no mês em que termina) | % | `taxa_desocupacao` | Nenhum: valor como o IBGE publica; nada preenchido | Só conta quem procurou trabalho; amostra com margem de erro | PROD |
| Taxa composta de subutilização | IBGE — PNAD Contínua | SIDRA tabela 6441, variável 4118 | idem | % | `taxa_subutilizacao` | idem | Mais ampla que a desocupação; correlacionada com ela | PROD |
| Rendimento médio real habitual | IBGE — PNAD Contínua | SIDRA tabela 6390, variável 5933 | idem | R$ mensais (reais do IBGE) | `rendimento_medio_real` | Já deflacionado pelo IBGE (IPCA, preços do mês do meio do trimestre mais recente); o projeto não aplica outro deflator. Só variação dentro da mesma coleta | O IBGE refaz o deflator a cada divulgação; média de quem tem rendimento de trabalho | PROD |
| Notícias e contexto | Veículos de imprensa e IBGE (curadoria manual) | `data/news/raw_*.json` → `build_news.py` | eventual | — | `noticias.json` | Verificação automática título/data contra a página | Ver "Notícias" abaixo | PROD |
| Fotos dos presidentes | Wikimedia Commons (CC BY 2.0) | `dashboard/assets/presidents/originais/` | — | — | — | `process_portraits.py` | Crédito no rodapé de Períodos | PROD |

## Arquivos em `data/processed/`

| Arquivo | Gerado por | Usado por |
|---|---|---|
| `anp_oficial_mensal.csv` | `download_anp_oficial.py` | `build_dataset.py` (preço nominal Brasil dos combustíveis) |
| `anp_precos_mensais.csv` | `download_anp.py` | `build_dataset.py` (linhas regionais e `preco_simples_coletas`) |
| `ibge_itens_cesta_mensal.csv`, `ipca_geral_mensal.csv` (número-índice **desde jan/2018**) | `download_ibge.py` | `build_dataset.py` |
| `ipca_pesos_itens.csv` (peso mensal dos 10 itens no IPCA, variável 66) | `download_ibge.py` | `montar_pesos_ipca()` → `ipca_pesos` (só a sensibilidade do Custo de vida) |
| `ibge_combustiveis_var_mensal.csv` | `download_ibge_combustiveis.py` | `estimar_lacunas_anp()` |
| `mercados_diario/{dolar_ptax,selic_meta,ibovespa}.csv`, `mercados_status.json` | `download_mercados.py` | `build_dashboard_data.py` (pontas diárias), selo de frescor |
| `bcb_contexto_mensal.csv`, `ibovespa_mensal.csv`, `bcb_hoje.json`, `ibovespa_hoje.json` | `download_mercados.py` | `build_dataset.py`, `build_dashboard_data.py` |
| `salario_minimo_mensal.csv` | `download_salario_minimo.py` | `build_dataset.py`, `build_dashboard_data.py` (inclui a série própria `salario_minimo_serie`, usada pela Análise) |
| `brent_mensal.csv` | `download_brent.py` | `build_dataset.py` |
| `pib_trimestral.csv`, `pib_anual.csv`, `pib_status.json` | `download_pib.py` | `montar_pib()` |
| `pib_componentes_trimestral.csv`, `pib_nominal_trimestral.csv` | `download_pib_componentes.py` | `montar_pib()`, `_componentes_pib()` |
| `conab_status.json` | `download_conab.py` | (registro da tentativa; `conab_precos_varejo.csv` não existe) |
| `combustiveis_final.csv`, `cesta_basica_final.csv`, `resumo_periodos_*.csv` | `build_dataset.py` | `build_dashboard_data.py` |
| `dashboard_data.json` | `build_dashboard_data.py` | `dashboard/js/app.js` |
| `analysis_methodology.json`, `analysis_results.json` | `build_analise.py` | `dashboard/js/analise.js`, `test_analise.py` |
| `pnad_mercado_trabalho.csv`, `pnad_status.json` | `download_pnad.py` | `montar_mercado_trabalho()` (bloco `mercado_trabalho` do `dashboard_data.json`) |
| `noticias.json` | `build_news.py` | `dashboard/js/app.js`, `analise.js`, `linhadotempo.js` |

`data/raw/` (cache dos arquivos baixados, ~1 GB da ANP, mais `data/raw/anp/oficial/` e `data/raw/anp/vendas/`) não é versionado
(`.gitignore`). Os agregados em `data/processed/` são versionados de propósito.

## O que `dashboard_data.json` contém

- `produtos`: 16 séries (5 combustíveis, 6 alimentos, Dólar, Selic, IPCA,
  Ibovespa, PIB). Cada uma tem `serie_mensal` (PIB: uma linha por ano),
  `resumo_periodos` (Bolsonaro/Lula × `governo_inteiro`, `primeiros_12m/24m/36m`)
  e, quando existem, `diario`, `cotacao_hoje`, `estimativas`, `componentes`,
  `serie_trimestral`, `frescor`, `ultimo_trimestre`, `fonte`.
- `fotografia_mensal`: por mês, Dólar, Ibovespa, Selic, IPCA (12 meses), salário
  mínimo e Gasolina (alimenta a Máquina do tempo e a faixa de abertura).
- `presidentes`: nome, rótulo do período, foto, `foto_srcset` e crédito.
- `periodo_corte` = `2023-01-01` (definido em `scripts/common.py`).

Marco de governo: Bolsonaro até 31/12/2022, Lula desde 01/01/2023. A série do
projeto começa em jan/2019. O PIB guarda histórico desde 1996, mas anos antes de
2019 **não** pertencem a nenhum dos dois períodos (correção de 28/09/2026 em
`montar_pib()`).

## Frescor dos dados

| Dado | Último dado no repositório (28/09/2026) | Como se atualiza |
|---|---|---|
| Séries mensais (ANP, IBGE, dólar, Selic, Ibovespa) | ago/2026 | `update_data.py` |
| Dólar, Selic, Ibovespa (diário) | 22/09/2026 (última execução de `download_mercados.py`) | `update_data.py --rapido` |
| Salário mínimo | set/2026 (vigente) | `update_data.py` |
| PIB trimestral | 2º trimestre de 2026 (baixado em 25/09/2026) | **manual**: `download_pib.py` |
| PIB anual | 2025 (2026 só tem trimestres) | manual |
| Mercado de trabalho (PNAD) | jun-jul-ago 2026 (baixado em 30/09/2026) | `update_data.py` (e `--rapido`) |
| Notícias | verificadas em 30/09/2026 (142 itens, 63 marcos) | `build_news.py` |
| Análise | calculada em 30/09/2026 (metodologia v1.2) | `build_analise.py` |

O build grava `produtos.PIB.frescor` (`desatualizado: true/false`, com o
trimestre esperado calculado pela data e folga de 100 dias) e escreve um aviso no
log; **não bloqueia** a publicação.

## Como cada dado chega ao navegador (verificado no código)

- **Cotação mais recente** (Dólar, Selic, Ibovespa): `cotacao_hoje` vem de
  `bcb_hoje.json`/`ibovespa_hoje.json`, gravados na última execução do script. É
  um arquivo estático: o site **não** consulta nenhuma API no navegador. Por isso
  o rótulo é "último dado disponível" e o Ibovespa traz "não é tempo real
  garantido".
- **Falha de fonte**: `download_mercados.py` mantém o histórico já salvo e grava a
  falha em `mercados_status.json`; a seção Método › Atualização mostra a data do
  último sucesso de cada fonte.
- **Fontes externas em tempo de leitura**: só as fontes tipográficas (Google Fonts:
  Archivo, Newsreader, IBM Plex Mono) e as imagens das matérias, carregadas
  direto do site de cada veículo.

## Notícias (`data/news/` → `noticias.json`)

- **Curadoria manual**: cada item em `data/news/raw_*.json` traz título, veículo,
  data, URL, resumo, tags de produto e, às vezes, `tema` (`pib`, `ormuz-ira`).
  Nenhuma notícia é buscada automaticamente.
- **Verificação automática** (`build_news.py`): abre a URL; só publica se a página
  responde (200) e o título curado tem similaridade ≥ 0,80 com o da página. A
  data da página prevalece sobre a curada. Item que reprova fica fora do JSON.
- **Bloqueio de robô** (ex.: `agenciadenoticias.ibge.gov.br` devolve 403): com
  `--manter-bloqueados`, itens com `confirmado: true` entram marcados
  `verificacao: "manual"` (4 hoje).
- **Fotos**: da Agência Brasil só quando o crédito é da própria EBC (CC BY 4.0).
  Fotos de outros veículos (CNN Brasil, Poder360, Exame, InfoMoney, Correio
  Braziliense, Seu Dinheiro) usam o `og:image` da matéria, com crédito
  "Reprodução · veículo" e o marcador `imagem_sem_licenca` — **decisão
  editorial assumida, sem licença de reprodução**, controlada por
  `IMAGENS_DE_OUTROS_VEICULOS` em `build_news.py`. Nas imagens da CNN Brasil o
  script pede `?w=1600` (foto inteira, sem o recorte do servidor). Créditos de
  Reuters, AFP, Getty, "Divulgação" e afins são recusados. Sem foto, o item
  aparece só com texto.
- **Marcos históricos (contexto)**: `data/news/marcos.json` marca matérias (existentes ou
  novas) como marcos, com `dimensoes`, `indicadores`, `tipo`, `relevancia`, `resumo` (escrito
  pelo projeto) e `causalidade: "contexto"`. `build_news.py` valida (vocabulário fechado,
  resumo de 20 a 420 caracteres, recusa "causou", "provocou", "foi responsável por"), recusa
  marco sem matéria aprovada e grava o campo `marco` e `verificado_em` no item. A curadoria
  das matérias novas de contexto está em `data/news/raw_trabalho_contexto.json`.
  O Agência Brasil desativa algumas páginas por legislação eleitoral (página "EBC - Página
  temporariamente indisponível", HTTP 200): a verificação por título as reprova, então esses
  itens não entram.
- **Hoje**: 142 itens, 97 com imagem (29 sem licença de reprodução), 118 sem tema,
  16 de PIB, 8 do conflito no Irã/Ormuz; 63 são marcos.
- **Metadados de filtro (Arquivo):** cada item de `noticias.json` recebe `indicadores` (ids da
  metodologia, derivados das tags de produto e, nos marcos, também de `marcos.json`) e
  `dimensoes`. Só se acrescentam campos: nada é removido. `build_news.py --so-metadados`
  reaplica `marcos.json` e a classificação sem verificar a rede nem mexer nas matérias.
- **Um só conjunto de dados, duas leituras:** o capítulo Contexto mostra os itens com `marco`
  em ordem cronológica (`js/linhadotempo.js`); o capítulo Arquivo lista todos os itens, com
  busca e filtros (`js/arquivo.js`). Não existe um segundo arquivo de fontes.
- **Regra editorial**: proximidade no tempo é contexto, não prova de causa.

## Estimativa da lacuna da ANP (set/2020)

A ANP informa que não pesquisou preços entre 23/08 e 17/10/2020. Não existe valor
oficial para setembro/2020; as linhas de combustíveis ficam **interrompidas**. Na
Máquina do tempo (e só nela), `estimar_lacunas_anp()` mostra uma estimativa "≈":

    estimativa = último preço médio da ANP antes da lacuna × (1 + variação mensal do item no IPCA)

acompanhada da interpolação linear e de um "teste de volta". Diesel S10 usa a
variação do "óleo diesel".
