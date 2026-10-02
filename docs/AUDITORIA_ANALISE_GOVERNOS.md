# Auditoria da análise entre períodos de governo

Capítulo "Análise" do CUSTAVA QUANTO? · metodologia v1.4.0 · 01/10/2026

Este documento registra o que estava errado ou frágil na primeira versão do
capítulo (commit `9844300`), o que mudou, e as limitações que continuam.
Qualquer mudança futura na metodologia deve subir a versão em
`scripts/build_analise.py` (`METODOLOGIA_VERSAO`) e ganhar uma entrada aqui.

## Arquivos

| Arquivo | Papel |
|---|---|
| `scripts/build_analise.py` | Grava a metodologia, depois calcula a partir dela |
| `data/processed/analysis_methodology.json` | Metodologia congelada: dimensões, perguntas, indicadores, direção, tipo, pesos, cenários, regras |
| `data/processed/analysis_results.json` | Resultados, com o hash SHA-256 da metodologia usada |
| `scripts/test_analise.py` | Validações (roda no `update_data.py` depois do build) |
| `dashboard/js/analise.js` | Só apresentação: escolhe o modo e formata; não calcula nada econômico |

## Histórico de versões

### v1.4.0 · 01/10/2026 — fecha as pendências da auditoria (etapa 3)

Origem: itens em aberto da etapa 2 em [AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md). Metodologia regravada, novo hash.
Mudança de versão **minor** (1.3.0 → 1.4.0): a fonte de uma série da Análise mudou (combustíveis) e a origem de outra (salário mínimo), como em
v1.1 e v1.2; nenhuma regra de leitura mudou.

| Item | Tipo | O que mudou |
|---|---|---|
| Combustíveis (R6, etanol) | Correção de dados / fonte | A causa da diferença de +6,5% (etanol) entre a média simples das coletas e a série oficial é a **ponderação**: a amostra é a mesma (mesmo número de coletas), mas a ANP pesa as UFs e os municípios pelas vendas e a média simples os pesa pelo número de coletas. Reproduzida com dados oficiais (diferença média absoluta de 0,47% no etanol). O preço nacional passou a ser a **série mensal oficial da ANP** (`download_anp_oficial.py`); a média simples ficou em `preco_simples_coletas`. |
| Salário mínimo | Correção de arquitetura | `SALARIO_REAL` e `SALARIO_NOMINAL` leem a série própria `salario_minimo_serie` (BCB SGS 1619 e IPCA, jan/2019 a ago/2026, 92 meses), e não as linhas da gasolina, que não têm set/2020. Variação e leituras inalteradas; o número de meses passou de 47 para 48 (completo) e de 43 para 44 (igual duração). |
| Janela (E11) | Correção de regra | Os resumos "primeiros 12/24/36 meses" usam a janela de calendário (meses 1 a *n* do mandato) e não as *n* primeiras observações; a janela de 24 meses de combustíveis do período Bolsonaro termina em dez/2020 (antes, jan/2021). A Análise já usava calendário. |
| R3b | Avaliação + sensibilidade | Seis agregadores do Custo de vida recalculados em Python (`custo_vida_agregadores`), para a variação do início ao fim e para o nível real, com a grade de 10.626 combinações. Método principal mantido. |
| Leite (R10) | Verificação | Rótulo "Leite longa vida" correto nas duas estruturas do IPCA (BCB, Estudo Especial nº 69/2019). Sem mudança. |
| Links | Verificação | 142 links de notícias auditados; ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md). Sem mudança nos dados. |

Efeito nos resultados (período completo; antes = v1.3.0): Custo de vida, Lula −9,84% → −10,30% (Bolsonaro +34,80%, inalterado); variações reais
de combustíveis passam à série oficial (gasolina −9,17 / +11,02 → −7,96 / +10,25; etanol +2,56 / −11,07 → +7,93 / −13,64; diesel +46,30 / −11,26 → +46,25 / −12,45;
diesel S10 +44,80 / −8,28 → +44,78 / −8,65; GLP +23,49 / −9,84 → +24,59 / −10,30). Nenhuma leitura de dimensão, nenhum número da síntese e nenhuma das 10.626
combinações mudou (10.626 / 0 / 0). O nível real do Custo de vida (mediana) ficou em 98,8 / 101,3, e a grade alternativa em 9.625 / 715 / 286.

### v1.3.0 · 01/10/2026 — auditoria acadêmica e metodológica (etapa 2)

Origem: auditoria independente em [AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md), itens R1 a R10.
Cada mudança abaixo está classificada como **correção de dados**, **correção de síntese**, **correção de terminologia** ou
**documentação**. Metodologia regravada, novo hash.

| Item | Tipo | O que mudou |
|---|---|---|
| R1 | Correção de dados | `download_ibge.py` guardava o número-índice do IPCA só desde jan/2019, então o IPCA em 12 meses começava em jan/2020 e o período Bolsonaro tinha 36 meses (contra 44 de Lula). Agora o índice é baixado desde jan/2018 (`IPCA_INICIO_DOWNLOAD`) e a série de 12 meses começa em jan/2019 (jan/2019 = 3,78%; dez/2019 = 4,31%). Bolsonaro passa a ter 48 meses; na janela de igual duração, o IPCA passa de 32 para 44 meses de cada lado. Nada foi alterado à mão nos JSON: tudo foi regenerado pelo pipeline (`download_ibge.py` → `build_dataset.py` → `build_dashboard_data.py` → `build_analise.py`). |
| R2 (e R4) | Correção de síntese | "Litros de gasolina por salário mínimo" passou de Tipo A a Tipo C. Ele é matematicamente igual a salário real ÷ preço real da gasolina (diferença máxima de 0,008 litro em 91 meses, só arredondamento); entrava com voto próprio em Renda, contando duas vezes o salário real. Continua publicado e gráficado como indicador à parte. Renda passa a ter uma série com voto (salário mínimo real). |
| R3a | Documentação + leitura complementar | A leitura principal do Custo de vida continua sendo a variação do início ao fim. Foi adicionada, fora da síntese, a "outra forma de olhar": nível real médio e mediano de cada período (base 100 = média conjunta dos dois períodos), com a grade de pesos que resultaria se ela substituísse a principal. Regra declarada na metodologia (`formulas.nivel_real_custo_vida`) e calculada em Python (`custo_vida_nivel_real`). |
| R5 | Terminologia | O rótulo do dólar com correção pelo IPCA passou a "Dólar corrigido pelo IPCA", e a página diz que não é a taxa de câmbio real. O cálculo não mudou. |
| R6 | Terminologia | O preço mensal de combustíveis é rotulado "média simples das coletas da ANP". O cálculo não mudou e a série oficial não foi adotada **na v1.3.0**; na v1.4.0 a causa da diferença foi determinada e a série oficial passou a ser a principal (ver abaixo). A diferença para a série oficial foi medida (etanol +6,5% em média, causa não determinada). |
| R7 | Terminologia | A grade de 10.626 combinações chama-se "análise de sensibilidade aos pesos", com o raciocínio combinatório (`C(24,4)`), os limites (grade discreta, só estas dimensões) e o que ela não prova. Parte 10 reescrita; Parte 11 resumida, com remissão à Parte 10. A chave `textos.robustez` virou `textos.sensibilidade`. |
| R8, R9 | Documentação | Tolerâncias (1,0 e 0,1 ponto) e fórmula do salário mínimo real (IPCA, mês-base dinâmico) documentadas como escolhas do projeto, sem mudança de valor. |
| R10 | Verificação | Os seis subitens do IPCA foram conferidos contra a tabela de correspondência oficial do IBGE (POF 2017-2018 × SNIPC). Sem mudança; uma ressalva aberta sobre o nome do subitem do leite na estrutura da POF 2008-2009. |

Efeito nos resultados (de `docs/auditoria_antes_depois.py`):

| Item | Antes (v1.2.1) | Depois (v1.3.0) |
|---|---|---|
| IPCA 12 meses, média, Bolsonaro (completo) | 6,95% (36 meses) | 6,14% (48 meses) |
| IPCA 12 meses, média, Lula | 4,61% | 4,61% (inalterado) |
| IPCA, igual duração (Bolsonaro / Lula) | 7,02% / 4,61% (32 meses) | 6,13% / 4,61% (44 meses) |
| Inflação, leitura | Lula | Lula (diferença de 2,34 para 1,54 p.p.) |
| Renda, valor da dimensão, Bolsonaro / Lula (completo) | +0,83% / +0,89% (praticamente iguais) | −4,02% / +6,15% (Lula) |
| Renda, leitura (igual duração) | Lula | Lula |
| Custo de vida, Trabalho, Atividade | Lula | inalterados |
| Síntese, soma com pesos iguais (completo) | +80 | +100 |
| Grade de 10.626 (Lula / Bolsonaro / empate), completo | 10.625 / 0 / 1 | 10.626 / 0 / 0 |
| Grade, igual duração | 10.626 / 0 / 0 | 10.626 / 0 / 0 (inalterada) |
| Nível real do Custo de vida (novo), Bolsonaro / Lula | — | 98,8 / 101,3 (mediano 94,7 / 101,9) |
| Grade se o nível real substituísse a variação (novo) | — | 9.625 / 715 / 286 |

Nenhum resultado foi escolhido: todos saem do pipeline. O resultado qualitativo (cinco dimensões a favor do período Lula, nenhuma
a favor do Bolsonaro) é consequência dessas leituras sob estas regras; a "outra forma de olhar" mostra que ele depende da
pergunta feita ao Custo de vida.

Novos testes em `test_analise.py` (bloco "v1.3.0"): ver [TESTING_AND_QA.md](TESTING_AND_QA.md).

### v1.2.1 · 01/10/2026 — correção da escala do salário mínimo real

Achado (auditoria de 01/10/2026): o "Salário mínimo real" era `salário nominal / número-índice do
IPCA × 1000`. O número-índice do IBGE (base dez/1993 = 100, ~7.633 em ago/2026) não é uma data de
referência, então o resultado (~R$ 180–220) não era R$ de data nenhuma, apesar da unidade "R$
descontado o IPCA". Era o único valor real do projeto fora do padrão dos demais (nominal × IPCA do
último mês ÷ IPCA do mês).

Correção: `salário real = salário nominal × IPCA do último mês disponível ÷ IPCA do mês`, em R$ do
último mês com IPCA (ago/2026 hoje; nesse mês o valor real é igual ao nominal, R$ 1.621). A unidade
passou a "R$ do último mês com IPCA (descontado o IPCA)" e o mês-base vai em
`analysis_results.json` (`salario_real_referencia`).

O que **não** mudou: como a diferença entre as duas escalas é um fator constante (ipca_ref ÷ 1000),
a variação percentual, a leitura da dimensão Renda, a síntese, os pesos e as 10.626 combinações
ficaram idênticos (conferido campo a campo contra a geração anterior: só mudaram `valor_inicio`,
`valor_fim`, `media`, `min`, `max` e `serie[].v` do salário real). Metodologia regravada, novo hash.
Novos testes em `test_analise.py`: mês-base, recálculo independente de cada mês, igualdade com o
nominal no mês-base e ordem de grandeza.


### v1.2 · 30/09/2026 — dimensão Mercado de trabalho e contexto histórico

Mudanças (metodologia regravada, novo hash; nenhuma série anterior foi excluída e nenhuma
direção ou métrica de indicador existente mudou):

1. **Nova dimensão: Mercado de trabalho** (Tipo A, ordem 4), com três séries oficiais da PNAD
   Contínua (IBGE/SIDRA): taxa de desocupação (tabela 6381, var. 4099), taxa composta de
   subutilização (6441, var. 4118) e rendimento médio real habitual (6390, var. 5933). Dados
   baixados por `scripts/download_pnad.py`, gravados em `data/processed/pnad_mercado_trabalho.csv`
   e `pnad_status.json`, e consolidados em `dashboard_data.json` (bloco `mercado_trabalho`).
   Escopo: "emprego e desemprego" saiu da lista do que fica de fora.
2. **Agregação "por série" para dimensões de unidades diferentes.** Cada série vota na sua
   métrica e tolerância; a dimensão segue o sinal da soma. A dimensão continua valendo um só
   voto na síntese: o número de séries não dá peso extra.
3. **Regra da métrica**, escrita antes de calcular a dimensão: taxas pela média da janela,
   valores em R$ ou índices pela variação do início ao fim. A métrica alternativa é mostrada
   só como transparência. **Registro honesto:** a métrica alternativa muda a leitura de uma
   série (na desocupação, a queda do início ao fim, em p.p., foi maior no período Bolsonaro
   que no Lula, porque o período Bolsonaro começou de um nível mais alto); com ela, a dimensão
   ficaria "praticamente igual" no período completo. A regra da métrica não foi escolhida
   olhando esse resultado: segue a convenção que já valia para a Inflação (taxa pela média) e
   para o salário mínimo real (variação).
4. **Trimestres móveis inteiros.** Só entram trimestres inteiros dentro de um período (Bolsonaro:
   terminados de mar/2019 a dez/2022; Lula: a partir de mar/2023), para não misturar meses dos
   dois períodos; nada é rateado. A frequência oficial é preservada.
5. **Pesos e cenários:** cinco dimensões com peso igual de 20% (antes, quatro de 25%); seis
   cenários (uma ênfase por dimensão, 40% e 15% nas demais) e 10.626 combinações de pesos de
   5 em 5 pontos.
6. **Contexto histórico.** A lista de cinco marcos externos da metodologia foi retirada (sem
   link) e substituída por marcos verificados na fonte em `noticias.json` (`marco`), com
   dimensão, indicadores, tipo, relevância e resumo curto. O contexto não entra em nenhum
   cálculo. `build_news.py` valida a curadoria e recusa linguagem causal nos resumos.
7. **Testes:** `test_analise.py` confere as tabelas e variáveis do SIDRA, a série do dashboard
   contra a resposta bruta do IBGE (quando o cache existe), o período de cada trimestre, os
   votos recalculados de forma independente, a ordem das dimensões, o peso único da dimensão
   nos cenários e todos os marcos (fonte aceita, https, data, indicadores existentes,
   causalidade "contexto", sem linguagem causal).

### v1.1 · 29/09/2026 — reconstrução editorial e metodológica

Mudanças (a metodologia foi regravada e recebeu novo hash; nenhuma série foi
excluída, nenhuma direção de indicador mudou):

1. **Comparação principal.** O modo principal passou a ser "período completo
   disponível" (Bolsonaro jan/2019–dez/2022; Lula jan/2023–último dado, em curso); a
   comparação por igual duração virou controle secundário (botão na página).
   **Registro honesto:** a v1.0 tinha "igual duração" como principal, por causa do
   achado 2 abaixo. A mudança foi pedida pelo responsável pelo projeto **depois de os
   resultados da v1.0 já terem sido vistos**, porque os períodos inteiros são como o
   projeto os define em todo o site. Por isso a página informa, num texto gerado dos
   dados, quando trocar a janela muda a leitura de alguma dimensão (hoje: Renda). O
   achado 2 continua válido como limitação: as durações diferem (48 × 44 meses).
2. **Nível de evidência** (ALTA, MÉDIA, INFORMATIVA) por dimensão, por regra escrita na
   metodologia (menor nível de confiança entre as séries com direção); Custo de vida
   é MÉDIA porque alimentos são índice de preço, não R$/kg.
3. **Cinco cenários de peso** (iguais e uma ênfase por dimensão, em vez de quatro) e
   **grade completa** de 1.771 combinações de 5 em 5 pontos; o leitor mexe em barras
   de prioridade ("Como diferentes prioridades mudam a leitura?") em vez de digitar
   pesos. Pesos continuam sendo preferência do leitor, não dado.
4. **Robustez por dimensão**: refazer a leitura sem uma série de cada vez (Custo de
   vida); combustíveis e alimentos com medianas separadas; maiores altas e quedas
   reais e maior diferença entre períodos ("O que mais pesou?").
5. **PIB**: barras anuais de 2019 ao último ano fechado (nenhum ano anterior a 2019,
   nenhum resultado anual de 2026); trimestres de 2026 em bloco à parte, com três
   medidas rotuladas (interanual, contra o trimestre anterior dessazonalizado,
   acumulado em 4 trimestres), que não entram na média anual.
6. **Linguagem.** Saiu "favorável"/"mais favorável" dos textos gerados e do capítulo:
   a leitura agora diz "a leitura aponta para o período X" ou "praticamente iguais".
   O contexto externo é escrito como "coincide no tempo com…". Cada dimensão ganhou
   "o que mede" e "o que não mede", escritos na metodologia.
7. **Estrutura da página**: Partes 1 a 11 (régua, o que medimos, uma parte por
   dimensão, o que mais pesou, prioridades, em resumo, contexto), limites em cartões.
   O painel "Audite a análise" foi para a seção Método.
8. **Testes**: `test_analise.py` passou a recalcular de forma independente a soma da
   síntese, o total da grade, o nível de evidência, as variações percentuais e os
   maiores movimentos, e a conferir o PIB anual e a coerência da "janela que muda a
   leitura". Foi testado com resultado adulterado (soma, grade e período do PIB
   trocados): as três falhas foram detectadas.

Achado de dados registrado nesta rodada: a série de Gasolina tem 47 observações no
período Bolsonaro completo (48 meses; um mês sem dado), e a página informa "N com
dado" quando o número de observações é menor que o de meses.

### v1.0 · 28/09/2026 — primeira versão auditada

Os achados abaixo são os da auditoria que gerou a v1.0.

## Achados da auditoria (versão anterior)

1. **Períodos incorretos: PIB.** O recorte "governo inteiro" do PIB comparava
   1996-2022 contra 2023-2025: todos os anos antes de 2023 eram rotulados como
   "Bolsonaro". Corrigido em `build_dashboard_data.py` no commit `9844300`
   (anos antes de 2019 ficam sem período). Afetava também a página Períodos.
2. **Períodos de tamanhos diferentes.** Bolsonaro tinha 48 meses; Lula, 44 e em
   curso. Variações acumuladas crescem com o tempo, então a comparação favorecia
   o período mais longo. **Corrigido:** o modo principal agora é "mesmo tempo de
   governo" (mês k de cada mandato, só os meses em que os dois têm dado).
3. **Direção errada ou ausente.** A versão anterior contava "variação positiva"
   como um mesmo sinal para tudo: gasolina subindo (ruim para o consumidor), PIB
   subindo (atividade maior) e Selic subindo (nem bom nem ruim) caíam na mesma
   contagem. **Corrigido:** cada indicador tem direção preferida ("maior",
   "menor" ou nenhuma) definida na metodologia, antes do cálculo.
4. **Indicadores sem direção simples.** Dólar, Selic e Ibovespa entravam na
   contagem. **Corrigido:** são Tipo B (dependem do contexto) e só são descritos;
   a dimensão Mercados não entra na síntese.
5. **Nominal x real.** Custo de vida misturava variação real (combustíveis e
   alimentos) com nominal (salário mínimo). **Corrigido:** custo de vida usa só
   a série real; o salário mínimo entra pelo valor real (descontado o IPCA) e o
   nominal fica como informação (Tipo C).
6. **Porcentagem x ponto percentual.** A Selic chegou a ser tratada como
   variação percentual de uma taxa (corrigido já na v0). Agora é métrica
   "nível": início, fim, média, mínimo, máximo, e diferença em p.p.
7. **Frequências diferentes.** PIB é anual; os demais, mensais; Dólar, Selic e
   Ibovespa têm dado diário. **Tratado:** PIB compara ano k de cada mandato, só
   anos fechados; no modo completo, os três indicadores de mercado usam o dado
   diário nas pontas; no modo mesmo tempo, a média mensal (rotulado).
8. **Período Lula incompleto.** Agora marcado "em curso" em todo lugar, e o
   modo principal compara durações iguais.
9. **PIB anual x trimestral.** A média anual usa só anos fechados; o último
   trimestre disponível aparece separado, sem virar resultado anual.
10. **Índice de alimentos.** O aviso "índice encadeado, não é R$" agora é um
    bloco visível na dimensão, não só um rótulo de unidade.
11. **Mercado como bem-estar.** Ibovespa e dólar agora vêm com a explicação do
    que medem e não medem, e nunca entram numa leitura de direção.
12. **Suposições escondidas.** Os pesos existiam mas não estavam justificados.
    Agora: pesos iguais como padrão (sem razão a priori para privilegiar uma
    dimensão), três cenários alternativos definidos antes do cálculo, e o leitor
    pode mudar os pesos.
13. **Métricas duplicadas.** "Salário mínimo" e "litros de gasolina por salário
    mínimo" medem coisas relacionadas; ficam na mesma dimensão e a dimensão usa a
    mediana, então nenhum dos dois pesa em dobro na síntese.
14. **Agregação arbitrária.** A contagem "17 de 18 subiram" somava unidades
    diferentes e dava a Custo de vida 11 votos contra 1 do PIB. **Corrigido:**
    cada dimensão vira UM sentido (+1, 0, -1) pela mediana; a síntese soma
    sentidos com pesos, nunca magnitudes.
15. **Cherry-picking.** Todas as séries do projeto entram. Nenhuma exclusão.
    Dimensões fora do escopo (emprego, contas públicas, investimento) estão
    listadas como tal, por falta de série no projeto.
16. **Hierarquia visual.** Cartões repetidos de mesmo peso. Refeito como
    narrativa: pergunta → evidência → gráfico → leitura.
17. **Narrativa.** Não havia pergunta definida por dimensão. Agora cada uma
    tem a sua, escrita na metodologia antes do cálculo.

## Regra contra metodologia retroativa

`build_analise.py` grava `analysis_methodology.json` primeiro e só então
calcula, lendo a metodologia do disco. O hash SHA-256 desse arquivo vai para
`analysis_results.json`, e `test_analise.py` falha se o hash não conferir.
Mudar direção, peso, tipo ou regra depois de ver resultados exige subir a
versão e registrar aqui o motivo.

## Perguntas de controle (estado em 28/09/2026)

1. **Os períodos são comparáveis?** No modo principal, sim: mesma posição no
   mandato e mesmo número de observações por indicador (validado no teste). O
   modo "completo" é mostrado como alternativa, rotulado como período em curso.
2. **As métricas são comparáveis?** Dentro de cada dimensão, sim (todas reais em
   custo de vida; todas de poder de compra em renda). Entre dimensões, não, e por
   isso a síntese usa só o sentido de cada dimensão.
3. **Todo indicador tem interpretação definida?** Sim: Tipo A com direção, B e C
   explicitamente sem direção (teste).
4. **Algum indicador conta em dobro?** Não; cada um está em uma dimensão só
   (teste), e a dimensão vira um único sentido.
5. **Uma dimensão domina por ter mais séries?** Não: 11 séries de custo de vida
   viram uma leitura, igual à do PIB com uma série.
6. **Algum indicador na direção errada?** Revisado um a um; o teste confere que
   o sinal de f segue a direção da metodologia.
7. **Nominal e real separados?** Sim; custo de vida só com série real (teste).
8. **Indicadores dependentes do contexto tratados à parte?** Sim, Tipo B.
9. **A conclusão resiste a mudanças razoáveis de peso?** Calculado em quatro
   cenários predefinidos; o resultado diz se o sentido muda ou não.
10. **Um leitor cético consegue reproduzir?** Sim: metodologia e resultados em
    JSON, fórmulas escritas, script público e hash.
11. **Toda fonte é identificável?** Sim, por indicador.
12. **Toda escolha metodológica é identificável?** Sim, em
    `analysis_methodology.json` e no painel "Audite a análise" (hoje na seção Método, subseção G).
13. **Alguém com outra preferência política consegue auditar?** É o objetivo; o
    painel permite mudar pesos e ver cada número de origem.
14. **O período Lula está marcado como em curso?** Sim.
15. **Estamos implicando causalidade?** O texto gerado nunca atribui causa; o
    contexto externo é rotulado "coincide no tempo".

## Limitações que continuam

- Poucas dimensões: emprego, contas públicas, investimento e desigualdade não
  estão no projeto.
- Salário mínimo mede uma parte da renda da população, não a renda média.
- Alimentos são índice encadeado do IBGE, não preço em reais.
- No modo "mesmo tempo", os indicadores de mercado usam média mensal, não o
  último pregão; no modo "completo", usam o dado diário nas pontas.
- A tolerância para "sem diferença relevante" (1 ponto em variação, 0,1 ponto em
  média) é uma escolha da metodologia, registrada nela.
- O contexto externo tem cinco marcos; não é uma cronologia completa.
