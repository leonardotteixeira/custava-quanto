# Metodologia

Última atualização: 01/10/2026
Status: **CURRENT** — descreve o que o código calcula hoje. Metodologia da
Análise: **v1.4.0** (arquivo congelado em `data/processed/analysis_methodology.json`).

Este texto é para quem lê, não para quem programa. Onde há fórmula, ela é a que o
código usa (arquivo indicado). Fontes, frequências e limitações de cada série
estão em [DATA_PIPELINE.md](DATA_PIPELINE.md).

## O que o projeto responde

1. **Quanto custava e quanto custa?** Um preço ou índice na troca de governo
   (dez/2022) e no último dado disponível.
2. **O que mudou entre os dois períodos?** Bolsonaro (jan/2019–dez/2022) e Lula
   (jan/2023–último dado disponível, período em curso), com a mesma régua.
3. **O que aparece quando se colocam os indicadores lado a lado?** É o capítulo
   Análise, com critérios definidos antes do cálculo.

O projeto **não** atribui causa, não dá nota a governo e não declara vencedor.

## Regra editorial: contexto não é causa

Uma notícia, um marco ou outro indicador que aparece perto de uma variação no
tempo é **contexto**. O projeto só descreve uma relação de causa se a própria fonte
a estabelece — e hoje nenhuma matéria ou marco é apresentado assim. Vale para
combustíveis, alimentos, inflação, PIB, câmbio, bolsa e juros.

## Base metodológica e referências

O projeto combina cinco coisas diferentes, e esta seção existe para que ninguém as confunda:

1. **Fontes oficiais** (IBGE, ANP, Banco Central, B3): de onde vêm os dados.
2. **Documentação institucional**: o que cada instituição diz sobre como produz o dado (por exemplo, como a ANP calcula a média nacional, como o IBGE define o número-índice do IPCA).
3. **Literatura metodológica**: manuais e artigos que sustentam um conceito usado (deflação, dupla contagem, análise de sensibilidade). A lista, com o que cada obra sustenta e o que não sustenta, está em [referencias.md](referencias.md).
4. **Procedimentos estatísticos e documentais**: contas que o projeto faz com esses dados e que são definições conhecidas (variação percentual, razão entre números-índice, média, mediana).
5. **Convenções analíticas próprias do projeto**: escolhas de agregação, síntese, ponderação e janela que não vêm de nenhuma instituição e para as quais não existe necessariamente uma metodologia única ou diretamente aplicável.

> **Como interpretar a metodologia.** Nem todas as decisões usadas nesta análise são metodologias estabelecidas pela literatura. O projeto combina
> dados e definições oficiais com procedimentos analíticos próprios. As referências externas indicam a origem dos dados e os conceitos utilizados; as
> escolhas específicas de agregação, síntese e ponderação são identificadas como convenções do projeto.

**Fonte não é método.** A ANP é a fonte dos preços de combustíveis, mas a forma como o projeto os compara entre dois períodos não é metodologia da
ANP. O IBGE fornece o IPCA e a documentação do índice, mas a forma como o projeto o usa para deflacionar preços e salários não é metodologia do IBGE. O Banco
Central publica a série do salário mínimo e a do dólar, mas "salário mínimo real" e "Dólar corrigido pelo IPCA" são contas do projeto. Sempre que um texto diz
"fonte: X", é a origem do dado; quando diz "convenção do projeto", a decisão é nossa.

### Fundamentação externa

Aquilo que tem respaldo em documentação oficial ou em literatura: o número-índice do IPCA e a definição da variação acumulada entre dois números-índice
(IBGE); a série mensal nacional de preços de combustíveis e a regra de ponderação por vendas (ANP); as séries do dólar PTAX, da meta Selic e do salário mínimo
(Banco Central); a definição do Ibovespa (B3); o conceito de deflacionar valores por um índice de preços (IBGE); o alerta contra a dupla contagem de indicadores
correlacionados e a prática de testar a sensibilidade de um índice composto (OECD/JRC, *Handbook on Constructing Composite Indicators*); a distinção entre câmbio
nominal e câmbio real (Ipeadata).

### Convenções metodológicas próprias

Aquilo que foi definido especificamente para este projeto: a síntese por sentido (+1, 0, −1) com tolerância; a mediana das variações reais como resumo do Custo de
vida; o "nível real" como leitura complementar; o voto por série no Mercado de trabalho; a razão litros de gasolina por salário mínimo; as janelas de 12, 24 e 36
meses e a janela de calendário; a grade de pesos de 5 em 5 pontos; a escolha do IPCA (e não do INPC) para o salário real; a média mensal da meta Selic; a média
aritmética das taxas anuais do PIB. **Esta lista não é uma validação acadêmica dessas escolhas.** A auditoria verificou que as contas estão corretas, que as
alternativas razoáveis foram testadas e que as limitações estão registradas; ela não transforma uma escolha do projeto em metodologia universalmente aceita.

### Origem da metodologia

| Componente | Base | Natureza |
|---|---|---|
| IPCA em 12 meses | IBGE (número-índice, SIDRA 1737; métodos de cálculo do SNIPC) | Fonte e documentação oficiais; o cálculo mensal em 12 meses a partir do índice é feito pelo projeto, com a definição oficial de variação entre números-índice |
| Preço real (a preços do último mês) | IBGE (conceito de deflator e de número-índice) | Conceito oficial; **a escolha do IPCA geral como deflator e do último mês como base é do projeto** |
| Índices de alimentos | IBGE/SIDRA (variação mensal por subitem do IPCA) | Dados oficiais; o encadeamento da variação mensal em um índice de base 100 em jan/2019 é procedimento do projeto |
| Preços de combustíveis | ANP (série mensal nacional oficial, ponderada por vendas) | Fonte e metodologia oficiais |
| Salário mínimo | Banco Central (SGS 1619); os valores são fixados por ato do governo federal (os atos individuais não foram verificados um a um pelo projeto) | Fonte oficial |
| Salário mínimo real | Banco Central + IBGE | Procedimento analítico do projeto (`salário × IPCA do último mês ÷ IPCA do mês`); o INPC é alternativa usada por outras instituições e foi medido como sensibilidade |
| Dólar | Banco Central (PTAX venda, SGS 1) | Fonte oficial |
| Dólar corrigido pelo IPCA | Banco Central + IBGE | Procedimento analítico do projeto; **não é a taxa de câmbio real**, cuja definição oficial está na nota do Ipeadata |
| Selic | Banco Central (meta definida pelo Copom, SGS 432) | Fonte oficial; a média mensal da meta é convenção do projeto |
| Ibovespa | B3 (metodologia do índice) | Fonte oficial; a variação nominal em pontos é convenção do projeto |
| PIB | IBGE (Contas Nacionais) | Fonte oficial; a média aritmética das taxas anuais é convenção do projeto |
| Mercado de trabalho (dados) | IBGE (PNAD Contínua) | Fonte oficial |
| Mercado de trabalho (voto por série) | — | Convenção metodológica própria do projeto |
| Litros de gasolina por salário mínimo | ANP + Banco Central | Indicador derivado; o conceito de salário em unidades de um bem tem apoio indireto na literatura, a razão é convenção do projeto |
| Janelas de 12/24/36 meses e janela de calendário | — | Convenção analítica do projeto |
| Tolerâncias de 1,0 e 0,1 ponto | — | Convenção metodológica própria do projeto (o conceito de limiar de indiferença existe na literatura de decisão multicritério; os valores não vêm dela) |
| Leitura por dimensão (mediana) e síntese por sentido | — | Convenção metodológica própria do projeto |
| Não pesar ao mesmo tempo o salário real e os litros de gasolina | OECD/JRC, *Handbook* (dupla contagem) | Princípio da literatura aplicado pelo projeto |
| Agregação do Custo de vida | — | Método próprio, com limitações documentadas (avaliado como "defensável, com limitações") |
| Nível real do Custo de vida | — | Convenção própria, leitura complementar fora da síntese |
| Grade de pesos C(24, 4) = 10.626 | Estrutura combinatória: simplex-lattice (Scheffé, 1958); prática de análise de sensibilidade (Saisana et al., 2005) | Análise de sensibilidade própria; a malha de 5 em 5 pontos é escolha do projeto |
| Corte entre os períodos (jan/2023) | — | Definição editorial do projeto |

Onde a coluna "Base" traz "—", **não existe literatura direta** que sustente o componente, e ele é uma **convenção metodológica própria do projeto**.

## Como uma variação é calculada

| Conceito | Fórmula | Onde |
|---|---|---|
| Variação percentual | `(valor no fim ÷ valor no início − 1) × 100` | `build_dashboard_data.py`; `build_analise.py` |
| Variação em pontos percentuais (taxas) | `taxa no fim − taxa no início` | Selic, IPCA (12 meses), PIB (comparações de taxas) |
| Preço real (a preços de hoje) | `preço nominal × IPCA do último mês ÷ IPCA do mês do preço` | `build_dataset.py` |
| Índice encadeado (alimentos) | `índice(t) = índice(t−1) × (1 + variação mensal do IPCA do item ÷ 100)`, base 100 em jan/2019 | `download_ibge.py` |
| IPCA em 12 meses | `índice do mês ÷ índice de 12 meses antes × 100 − 100` | `build_dashboard_data.py` |
| % do salário mínimo | `preço ÷ salário mínimo do mês × 100` | `build_dashboard_data.py` |
| Unidades por salário mínimo | `salário mínimo do mês ÷ preço` | idem |
| Poder de compra (alimentos) | índice de `salário mínimo ÷ índice do item`, base 100 no primeiro mês | idem |
| Crescimento acumulado do PIB | produto de `(1 + taxa anual ÷ 100)` dos anos fechados | `_resumo_pib()` |

**Taxas não têm variação percentual.** De 13,75% para 15% é `+1,25 p.p.`, não
`+9%`. O projeto usa pontos percentuais para Selic, IPCA (12 meses) e PIB.

### Nominal × real

- **Nominal** ("na época"): o valor como foi observado no mês.
- **Real** ("corrigido pela inflação"): o mesmo valor em reais do último mês
  disponível, usando o IPCA geral. Responde "quanto isso custaria em dinheiro de
  hoje?". Sem essa correção, quase qualquer preço sobe em qualquer período.
- O IPCA usado é o **geral**, não um índice específico do item; o preço real de um
  item pode se afastar do IPCA por razões próprias dele.

### Alimentos: índice, não preço

Os seis alimentos (arroz, feijão carioca, carne — só o corte patinho —, leite longa
vida, óleo de soja e café moído) são **índices de preço encadeados** a partir da
variação mensal oficial do IPCA por item (IBGE/SIDRA), com base 100 em jan/2019.
**Não são preço em reais.** "+24%" quer dizer que o índice subiu 24%, não que o
quilo custa 24% a mais em reais. O IBGE não publica preço médio absoluto por item.

Preço absoluto (R$/kg) de arroz e feijão pela CONAB foi avaliado e o código existe,
mas **não está integrado**: a última tentativa de download falhou e o arquivo de
dados não existe. Fontes avaliadas e descartadas estão em
[AUDITORIA_PRECOS_ALIMENTOS.md](AUDITORIA_PRECOS_ALIMENTOS.md). O DIEESE não tem
acesso público em lote e nenhum código o usa.

### Combustíveis

**Preço médio nacional de revenda, série mensal OFICIAL da ANP** (a mesma que a ANP publica no arquivo
`mensal-brasil-desde-jan2013.xlsx`), em R$/litro (GLP: R$/botijão de 13 kg). Desde a metodologia v1.4.0 é esta a série
principal (`download_anp_oficial.py` → `anp_oficial_mensal.csv` → `build_dataset.py`). Até a v1.3.0 o projeto usava a **média
simples de todas as coletas do mês** (`download_anp.py`), que continua calculada, como sensibilidade, na coluna
`preco_simples_coletas`. A razão da troca está em "Preços de combustíveis (ANP)", abaixo. Setembro/2020 não tem pesquisa da
ANP: as linhas ficam interrompidas e só a Máquina do tempo mostra uma estimativa "≈", calculada como `último preço da
ANP × (1 + variação do item no IPCA)` e nunca usada em outra conta. Nenhum mês é completado com a média simples: um mês que
a série oficial não tem fica sem preço.

Câmbio e Brent aparecem como **contexto** dos combustíveis; a proximidade entre
eles e o preço não é prova de causa (preço da Petrobras, ICMS e tributos federais
também pesam).

### Salário mínimo e poder de compra

Salário mínimo nacional (BCB SGS 1619, nominal). "% do salário mínimo" e
"unidades por salário mínimo" usam o salário **vigente no mês** de cada preço, não
o de hoje. É o piso nacional; alguns estados têm pisos maiores. Na Análise, o salário mínimo
(nominal e real) vem de uma **série própria** (`salario_minimo_serie` em `dashboard_data.json`: BCB SGS 1619 e IPCA, todos os
meses de jan/2019 ao último com IPCA), e não das linhas da série de combustíveis. Até a v1.3.0 ele era lido da série da gasolina
e herdava o buraco de set/2020 (sem pesquisa da ANP); o salário mínimo e o IPCA existem em todos os meses, então a lacuna é só
dos combustíveis.

### PIB

- **Crescimento anual**: a "taxa acumulada ao longo do ano" lida no 4º trimestre
  (IBGE, Contas Nacionais Trimestrais) — o mesmo número que a imprensa chama de "o
  PIB cresceu X% no ano". Um ponto por ano.
- **Trimestral**: quatro leituras que **nunca se misturam**: contra o mesmo
  trimestre do ano anterior, contra o trimestre anterior (dessazonalizado),
  acumulada em quatro trimestres e acumulada no ano.
- **Ano em curso**: 2026 só tem trimestres (dados até o 2º trimestre de 2026).
  Não existe resultado anual de 2026 e nenhum é estimado ou calculado por média.
- **Anos 2019–2025** têm resultado anual fechado. O histórico desde 1996 existe nos
  dados, mas fica **fora** dos gráficos de análise e dos dois períodos; só
  aparece no cartão de referência de 2010 (+7,5%).
- **PIB nominal** (R$) e **per capita** são valores correntes e nunca se misturam
  com o crescimento real. Para anos que a tabela anual do IBGE ainda não fechou, o
  PIB nominal é a soma dos quatro trimestres, e isso é indicado.
- O IBGE **revisa** a série. O projeto mostra a última revisão baixada, e em
  alguns cartões mostra também o número divulgado na época.

### Mercados

- **Dólar**: PTAX venda (BCB). **Selic**: a *meta* definida pelo Copom (não a
  efetiva). **Ibovespa**: fechamento (B3), em pontos.
- Nos gráficos mensais: média do mês (Dólar, Selic) ou fechamento do último pregão
  do mês (Ibovespa). Nas comparações entre dois pontos ("do último dado de
  dez/2022 ao último dado disponível"): o dado **diário** com a data real de cada
  ponto. Fins de semana e feriados não têm cotação; vale o último dia útil.
- "Último dado disponível" é o último valor gravado na execução mais recente do
  script — **não é tempo real**.

## Períodos e janelas de comparação

Marco: Bolsonaro até 31/12/2022; Lula desde 01/01/2023 (`PERIODO_CORTE`).

| Janela | Bolsonaro | Lula | Onde é usada |
|---|---|---|---|
| **Troca → último dado** | dez/2022 (último dado antes da troca) | — | Índice, história (era → agora), Contexto, Bolso |
| **Período completo disponível** | jan/2019–dez/2022 (48 meses) | jan/2023–último dado (44 meses em ago/2026, em curso) | Períodos "governo inteiro"; Análise (comparação principal) |
| **Mesmo tempo de governo** | meses 1 a *N* do mandato | meses 1 a *N* do mandato | Análise (comparação secundária, "igual duração") |
| **Primeiros 12/24/36 meses** | primeiros *n* meses | primeiros *n* meses | Períodos |

O período Lula **não está completo**: use "último dado disponível" ou "em curso".
As janelas de mesma duração existem porque comparar 48 meses com 44 distorce
qualquer variação acumulada.

Na comparação por **igual duração**, *N* é a maior duração em que os dois períodos têm
dado, calculada dos dados (44 meses, com dados mensais até ago/2026), não escolhida à mão. O IPCA em 12
meses de jan/2019 em diante usa o número-índice a partir de jan/2018 (o IPCA em 12 meses de um mês divide
o índice dele pelo de 12 meses antes), então o IPCA também tem os 44 meses de cada lado: jan/2019 a
ago/2022 contra jan/2023 a ago/2026. Até a v1.2.1 o número-índice só era guardado desde jan/2019, a série
de 12 meses começava em jan/2020 e o período Bolsonaro perdia o ano de 2019 (ver
[AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md), v1.3.0). O PIB é anual: três anos fechados de
cada lado (2019–2021 contra 2023–2025).

Compara-se a **mesma posição no mandato**, não o mesmo calendário: os primeiros 44
meses de cada período correspondem a momentos diferentes do ciclo econômico
mundial.

**Regra da janela (v1.4.0): "mesma janela de calendário", não "mesmo número de observações".** O mês *k* de cada mandato é
jan/2019 + *k*−1 (Bolsonaro) e jan/2023 + *k*−1 (Lula), e uma janela "dos primeiros *n* meses" são os meses 1 a *n* nesse
calendário, haja ou não dado em cada um. A Análise já funcionava assim (`_k()` em `build_analise.py`). Os resumos "primeiros
12/24/36 meses" de `build_dashboard_data.py` contavam as *n* primeiras observações: nas séries de combustíveis, que não têm set/2020,
a janela de 24 meses do período Bolsonaro terminava em jan/2021, e não em dez/2020, e as de 36 meses em jan/2022, um mês
adiante da janela do período Lula. Agora usam o calendário (`_cohorts_para_periodo`, com `completo` = o período já chegou ao mês
*n*), e `test_analise.py` confere que nenhuma janela passa do mês *n* do mandato. O PIB, de linhas anuais, fica de fora da regra.

## Análise: como a leitura é construída (metodologia v1.4.0)

A **comparação principal** é a dos períodos inteiros ("período completo disponível":
Bolsonaro jan/2019–dez/2022; Lula jan/2023–último dado, em curso). A comparação por
igual duração é um controle secundário, ligado por um botão na página; as duas nunca
se misturam num mesmo número.

Implementação: `scripts/build_analise.py`. Ela grava a metodologia primeiro e só
depois calcula, lendo a metodologia do disco; o hash SHA-256 do arquivo vai junto
dos resultados e `test_analise.py` falha se não bater. Mudança de regra exige subir
a versão e registrar em [AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md).

### Dimensões e perguntas (escritas antes do cálculo)

| Dimensão | Tipo | Pergunta | Séries |
|---|---|---|---|
| Custo de vida | A | Em qual período os preços tiveram menor pressão real sobre o consumidor? | 11 (5 combustíveis, 6 alimentos) — variação **real** |
| Inflação | A | Em qual período o IPCA em 12 meses foi, em média, menor? | IPCA |
| Renda e poder de compra | A | Em qual período o salário mínimo ganhou mais poder de compra, descontada a inflação? | Salário mínimo real (a única série com voto); litros de gasolina por salário mínimo e salário nominal, só informativos (tipo C) |
| Mercado de trabalho | A | Em qual período o mercado de trabalho mostrou menor desocupação, menor subutilização da força de trabalho e maior rendimento real do trabalho? | Taxa de desocupação; taxa composta de subutilização; rendimento médio real habitual (PNAD Contínua) — cada série na sua unidade |
| Atividade econômica | A | Em qual período o PIB apresentou maior crescimento? | PIB (média do crescimento real anual) |
| Mercados | B | Como os indicadores financeiros evoluíram? | Dólar, Selic, Ibovespa |

### Tipos de indicador

- **Tipo A — direção definida.** A metodologia diz de antemão qual sentido é
  o de menor pressão ou de mais atividade: preço real ou inflação **menor**; poder de
  compra, rendimento do trabalho ou crescimento **maior**. 17 séries.
- **Tipo B — depende do contexto.** Só descrito (início, fim, média, mínimo,
  máximo). Nunca recebe leitura de direção nem entra na síntese: Dólar, Selic,
  Ibovespa. Um dólar mais baixo barateia importações e prejudica exportadores; juro
  alto contém inflação e encarece crédito; o Ibovespa mede uma carteira de ações,
  não o bem-estar das famílias.
- **Tipo C — informativo.** Não entra em nenhuma leitura: salário mínimo nominal
  (sobe com a inflação em qualquer período) e litros de gasolina por salário mínimo (v1.3.0: é o
  salário real dividido pelo preço real da gasolina; recebia um voto próprio em Renda e contava duas vezes
  a mesma informação, e agora é um indicador à parte).

### Cálculo

1. Para cada série, a métrica da janela: variação % (`(fim ÷ início − 1) × 100`),
   média (IPCA, PIB) ou diferença em p.p. (Selic).
2. Séries Tipo A: `f = métrica × (+1 se maior é favorável, −1 se menor é
   favorável)`. `f > 0` significa movimento na direção definida como favorável.
3. Por dimensão: **mediana** de `f` entre as séries, para cada período (a mediana
   impede que um produto extremo decida sozinho). Mostram-se também média, mínimo,
   máximo e quantas séries foram em cada sentido.
4. **Tolerância** para "sem diferença relevante": se as medianas de `f` diferem
   menos que **1,0 ponto** (dimensões em variação %) ou **0,1 ponto** (dimensões em
   média), a leitura é "sem diferença relevante". Os valores são uma escolha da
   metodologia, registrada nela.
5. Cada dimensão Tipo A vira **um único sentido** (+1 um período, −1 o outro, 0 sem
   diferença). Onze séries de custo de vida pesam o mesmo que uma de PIB.
6. **Síntese**: soma dos sentidos ponderada por pesos. O sentido, não a
   magnitude, porque as dimensões têm unidades diferentes.

**Regra da métrica** (fixada antes de calcular a dimensão Mercado de trabalho, vale para
todas as séries): *taxas* (IPCA, desocupação, subutilização) entram pela **média da janela**,
que mede a pressão ao longo do período e não a trajetória entre dois pontos; *valores em R$
ou índices* (salário mínimo real, rendimento médio real, preços reais) entram pela **variação
percentual do início ao fim da janela**.

**Salário mínimo real** = salário mínimo nominal do mês × (número-índice do IPCA do último mês
disponível ÷ número-índice do IPCA do mês): R$ do último mês com IPCA (ago/2026 hoje), o mesmo
mês-base dos preços reais do projeto. "A preços do último mês" quer dizer: o poder de compra de cada mês expresso em reais
do último mês com IPCA; no último mês o valor real é igual ao nominal e nos anteriores é maior, porque o dinheiro de então
comprava mais por real. Não é um salário nominal: o nominal sobe com a inflação em qualquer período. Até a v1.2 o valor era calculado como salário ÷ índice × 1000,
que não é R$ de data nenhuma (ver [AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md), v1.2.1).
"Litros de gasolina por salário mínimo" continua publicado: salário nominal ÷ preço nominal do mês, que é igual a salário real ÷ preço real da gasolina (a diferença máxima nos 91 meses é arredondamento, 0,008 litro).

**Dimensões de unidades diferentes (agregação "por série").** Mercado de trabalho mistura %, %
e R$; uma mediana entre elas seria misturar unidades. Cada série é comparada na sua métrica e
na sua tolerância e **vota** +1 (período Lula), −1 (período Bolsonaro) ou 0 (praticamente
iguais); a dimensão segue o sinal da soma dos votos. Continua valendo **um único sentido** na
síntese e um único peso por dimensão, então ter três séries não dá mais peso ao mercado de
trabalho do que a uma dimensão com uma série só. A página mostra também, só como transparência,
o que aconteceria com a métrica alternativa (variação do início ao fim para as taxas; média da
janela para o rendimento): ela não entra na leitura.

### Nível de evidência

Cada dimensão recebe um rótulo, calculado por regra (não é opinião):

- **ALTA**: série medida da mesma forma nos dois períodos, com fonte oficial e valor em
  unidade concreta.
- **MÉDIA**: comparável, mas a medida tem uma limitação estrutural (por exemplo,
  índice de preço encadeado em vez de preço em R$: é o caso dos alimentos, então
  Custo de vida é MÉDIA).
- **INFORMATIVA**: descrita, sem direção definida (Mercados): não entra na síntese.

Para uma dimensão Tipo A, vale o **menor** nível de confiança entre as suas séries.
O rótulo descreve a qualidade da medida, não o desempenho de nenhum governo.

### Análise de sensibilidade aos pesos

Pergunta: **mudar a importância relativa das cinco dimensões muda o lado da síntese?** Seis cenários definidos antes do cálculo, sobre as cinco dimensões Tipo A:

| Cenário | Custo de vida | Inflação | Renda | Trabalho | Atividade |
|---|---|---|---|---|---|
| Pesos iguais (padrão) | 20 | 20 | 20 | 20 | 20 |
| Ênfase em custo de vida | 40 | 15 | 15 | 15 | 15 |
| Ênfase em inflação | 15 | 40 | 15 | 15 | 15 |
| Ênfase em renda e poder de compra | 15 | 15 | 40 | 15 | 15 |
| Ênfase em mercado de trabalho | 15 | 15 | 15 | 40 | 15 |
| Ênfase em atividade econômica | 15 | 15 | 15 | 15 | 40 |

O padrão é igual porque não há razão a priori para privilegiar uma dimensão; qualquer
outra escolha é juízo de valor. Além dos cenários, o script refaz a síntese para
**todas as combinações de pesos de 5 em 5 pontos que somam 100** e informa em quantas a síntese aponta para
cada período e em quantas empata. O total é combinatório: 100 ÷ 5 = 20 blocos de 5 pontos repartidos entre 5
dimensões, `C(20 + 5 − 1, 5 − 1) = C(24, 4) = 10.626` (conferido por enumeração independente em
`test_analise.py`). É uma **grade discreta**: não testa todos os vetores de pesos possíveis (os intermediários, como
22%, não entram) e o resultado vale para esta metodologia e estas cinco dimensões. "Estável nas combinações
testadas" quer dizer que nenhuma delas mudou o lado da síntese; como nenhuma dimensão aponta para o período Bolsonaro,
isso é consequência de as leituras apontarem todas para o mesmo lado (dominância), não prova de robustez geral nem de
causa. Se uma dimensão apontasse para o outro lado, a mesma grade mostraria a divisão (ver "Outra forma de olhar", abaixo). Na
página, o leitor move uma barra por dimensão ("Como diferentes prioridades mudam a
leitura?"); a única conta feita no navegador é a soma ponderada dos sentidos já
calculados (+1, 0, −1), a mesma fórmula da síntese. Os pesos são preferência do
leitor, não dado: mudá-los muda a interpretação e não mostra qual governo foi
melhor.

### Outra forma de olhar o Custo de vida (nível real)

A leitura principal do Custo de vida é a **variação do início ao fim** de cada período (`fim ÷ início − 1`), que
responde "como os preços variaram?". Há outra pergunta legítima: "qual era o nível típico dos preços reais durante o
período?". Para cada uma das 11 séries, o preço real de cada mês da janela é dividido pela média dos preços reais dos dois
períodos juntos e multiplicado por 100; o nível de um período é a média (e, à parte, a mediana) desses valores; a leitura
usa a mediana entre as séries do nível médio, com a mesma tolerância de 1,0 ponto. Resultado de hoje (período completo):
nível médio 98,8 (Bolsonaro) e 101,3 (Lula); mediano 94,7 e 101,9; a leitura por esta pergunta aponta para o período
Bolsonaro, ao contrário da variação do início ao fim. As duas são corretas para perguntas diferentes: preços que caem a
partir de um ponto alto terminam abaixo do início e podem, mesmo assim, ter ficado em média acima. **Esta leitura não
entra na síntese**; ela aparece em "Outra forma de olhar" (Parte 3) e na nota da Parte 10, que informa como ficaria a grade
se ela substituísse a leitura principal. Os números saem de `analysis_results.json` (`custo_vida_nivel_real`), nunca
digitados.

**A leitura do nível depende do resumo das séries.** Com mediana, média aritmética, média geométrica, diesel único ou média por categoria, o
nível aponta para o período Bolsonaro; com a média ponderada pelo peso dos itens no IPCA (a gasolina é ~54% do peso dos 10 itens) aponta para o período
Lula, na margem da tolerância. A variação do início ao fim, ao contrário, aponta para o mesmo período em todos os resumos testados (seção
"Custo de vida: como as 11 séries se resumem"). O site mostra as duas contagens (`custo_vida_agregadores`).

### Outras verificações de robustez

- **Sem uma série**: em dimensões com 3 ou mais séries (Custo de vida), a leitura é
  refeita tirando uma série por vez; a página informa em quantos testes ela se
  mantém.
- **Custo de vida em dois grupos**: combustíveis (preço médio em R$) e alimentos
  (índice de preço encadeado, não R$/kg) têm medianas separadas no gráfico, para que
  o índice não seja lido como preço em reais.
- **Maiores movimentos**: as maiores altas e quedas reais entre as séries de custo de
  vida, poder de compra e rendimento do trabalho, e a maior diferença entre os períodos. Entram só séries em
  variação real (mesma unidade de leitura).
- **PIB**: barras anuais de 2019 ao último ano fechado; os trimestres do ano em curso
  aparecem à parte, com três medidas rotuladas (contra o mesmo trimestre do ano
  anterior, contra o trimestre anterior com ajuste sazonal, acumulado em 4
  trimestres). Nenhuma delas é resultado anual e nenhuma entra na média.
- **Janela**: se trocar entre "período completo" e "igual duração" muda a leitura de
  uma dimensão, o texto gerado diz qual.

Os textos de leitura são gerados a partir dos números por modelos de frase; não há
conclusão digitada à mão, e o gerador não usa "favorável" nem "melhor".

### O que a Análise não faz

Não dá nota, não escolhe vencedor, não conclui causa, e não inclui contas públicas,
investimento, desigualdade de renda nem informalidade e qualidade do emprego (não há série no
projeto). Não avalia "tudo" sobre um governo: só os indicadores e a metodologia implementados.
O período Lula está em curso: toda leitura sobre ele é parcial.

### Mercado de trabalho (PNAD Contínua)

- **Fonte:** IBGE, PNAD Contínua, pela API do SIDRA. Taxa de desocupação: tabela 6381,
  variável 4099. Taxa composta de subutilização da força de trabalho: tabela 6441, variável
  4118. Rendimento médio mensal real habitual, de todos os trabalhos, das pessoas ocupadas com
  rendimento de trabalho: tabela 6390, variável 5933. Brasil, pessoas de 14 anos ou mais.
- **Frequência:** trimestre móvel. O IBGE publica um resultado por mês, que é a média dos três
  meses que terminam nele; cada ponto é identificado pelo mês em que termina (por exemplo,
  "jun-jul-ago 2026" é o ponto de ago/2026). A frequência oficial é preservada: nada é
  convertido em mensal, estimado, interpolado nem repetido de um mês para outro.
- **Janela:** só entram trimestres **inteiros** dentro de um período. Bolsonaro: trimestres
  terminados de mar/2019 a dez/2022. Lula: terminados a partir de mar/2023 até o último
  publicado. Os que misturam meses dos dois períodos (terminados em jan e fev de 2019 e de
  2023) ficam de fora da comparação, mas aparecem no gráfico como dados oficiais. Na comparação
  por igual duração vale o mesmo, do mês 3 ao mês 44 de cada mandato.
- **Último dado:** vem da própria fonte (registrado em `pnad_status.json`); o projeto não força
  o mês mais recente. Em 30/09/2026 as três séries iam até jun-jul-ago 2026.
- **Rendimento real:** já deflacionado pelo IBGE (IPCA, a preços do mês do meio do trimestre
  mais recente divulgado). O projeto **não** aplica um segundo deflator. Como o IBGE refaz o
  deflator a cada divulgação, os valores em reais de toda a série mudam de uma divulgação para
  a outra; por isso só se usam variações dentro de uma mesma coleta dos dados.
- **Limitações:** a desocupação só conta quem procurou trabalho na semana; a subutilização é
  mais ampla e correlacionada com ela (duas das três séries medem quase o mesmo fenômeno; por
  isso a leitura "sem uma série" também é informada); o rendimento é uma média de quem tem
  rendimento de trabalho e muda com a composição de quem está ocupado; a coleta presencial foi
  suspensa em março de 2020 (IBGE); não há informalidade, desigualdade nem recortes regionais.
- **Descritivo, não causal:** o texto diz que a taxa "variou" ou "foi menor" em um período, nunca
  que um governo a causou.

### Contexto histórico (notícias e eventos)

Camada de contexto, fora de qualquer cálculo. Marcos de `data/news/marcos.json` (dimensão,
indicadores, tipo, relevância e resumo curto escrito pelo projeto) são aplicados por
`scripts/build_news.py` às matérias verificadas e gravados em `noticias.json` no campo `marco`.
Regras: relevância (marcos com efeito econômico amplo e documentado que se sobrepõem a
movimentos visíveis); fontes (oficiais, Agência Brasil e veículos reconhecidos, nunca blogs,
SEO, redes sociais ou agregadores sem fonte); datas (a de publicação na fonte, conferida na
página); ligação com indicadores (dimensão e indicadores listados por item; o gráfico marca a
data e a lista mostra o valor da série no mês do evento); resumos curtos, sem cópia de trechos;
afirmações contestadas atribuídas a quem as fez. **Proximidade no tempo não é evidência de
causalidade:** o script recusa resumos com "causou", "provocou" ou "foi responsável por".

## Fundamentos por indicador: da fonte à interpretação

Esta seção segue, para cada indicador, o caminho **fonte → fórmula → método → interpretação**. Os selos separam o que
é **fato** (dado oficial), **escolha do projeto** (convenção declarada) e **evidência acadêmica ou oficial**. As referências
são classificadas pelo que realmente sustentam: **sustenta** (trata diretamente do método), **indireta** (mesmo conceito
ou contexto, não a fórmula), **não sustenta** ou **não verificada**. Lista completa, com DOI conferido no Crossref e
classificação de cada fonte, em [AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md) (seção "Etapa 2").
Onde não há literatura que sustente exatamente a implementação, o texto diz isso.

### Salário mínimo real

- **Dados:** salário mínimo nominal vigente em cada mês (BCB/SGS 1619) e número-índice do IPCA (IBGE/SIDRA, tabela 1737,
  variável 2266). Série própria e completa (jan/2019 a ago/2026, 92 meses, inclusive set/2020).
- **Fórmula:** `salário real(mês) = salário nominal(mês) × IPCA(último mês disponível) ÷ IPCA(mês)`. Unidade: R$ do último mês
  com IPCA (ago/2026 hoje; nesse mês o valor real é igual ao nominal, R$ 1.621). O mês-base é dinâmico: muda quando sai um
  IPCA novo, e a unidade na página mostra o mês. Conferido por fora em jan/2019, jan/2020, ..., jan/2026 e no mês-base.
- **Por que o IPCA:** é o mesmo deflator de todos os valores reais do projeto, então os valores são comparáveis entre si, e o IPCA
  é o índice oficial de inflação do país (meta do Banco Central). As séries oficiais de salário mínimo real costumam usar o INPC
  (IPEA/Ipeadata, DIEESE), que mede a inflação de famílias com renda de 1 a 5 salários mínimos. **O INPC é uma alternativa
  legítima, não uma correção automática:** com INPC (SIDRA 1736), a variação real vai de −4,02% para −5,20% (Bolsonaro) e de
  +6,15% para +7,39% (Lula); mesma direção, nenhuma leitura muda. **Convenção do projeto**, mantida; trocar de deflator exigiria uma
  nova versão da metodologia.
- **Referências:** IBGE (2020), *Sistema Nacional de Índices de Preços ao Consumidor: métodos de cálculo* (8ª ed.) — **sustenta**
  a mecânica do deflator e dos números-índice. Ertel (2022), *Perspectiva Econômica* 18(1) — **sustenta parcialmente** (usa
  SM e IPCA do SIDRA 1737; o DOI impresso não resolve no Crossref, o texto está em acesso aberto na revista). Ipeadata (salário
  mínimo real) e DIEESE — **indiretas** (mesmo conceito, deflator INPC).
- **Não significa:** a renda das famílias nem a de quem ganha acima do piso; alguns estados têm pisos maiores.

### Litros de gasolina por salário mínimo (poder de compra em um item)

- **Fórmula:** `salário mínimo nominal ÷ preço nominal da gasolina` no mesmo mês (litros). Igual a `salário real ÷ preço real`
  (conferido mês a mês em `test_analise.py`).
- **Papel (v1.3.0):** indicador de poder de compra **à parte**, publicado e gráficado; **sem voto** na dimensão Renda, porque
  repete o salário real e o preço da gasolina (que já está no Custo de vida). O OECD/JRC *Handbook* (Nardo et al., 2008, p. 32)
  alerta para a dupla contagem quando indicadores correlacionados entram juntos num composto — **sustenta** a decisão de
  não pesar os dois.
- **Literatura sobre a razão em si (pesquisada de novo em 01/10/2026):** não há artigo revisado por pares que defina "litros de
  gasolina por salário mínimo". O que existe é o conceito geral de **salário expresso em unidades de um bem**: Alcântara, Daier &
  Silva (2024), IPEA *Boletim Mercado de Trabalho* 77, DOI 10.38116/bmt77/pf2 (parcela do salário mínimo destinada à cesta básica,
  dados DIEESE; texto lido) e Ashenfelter & Jurajda (2024), *Review of Economics and Statistics*, DOI 10.1162/rest_a_01514 (salário em
  unidades de um bem, o "McWage"; resumo conferido na versão NBER). Ambas são **indiretas**: sustentam o conceito, não esta razão
  nem a escolha da gasolina. **A razão como indicador é, portanto, uma convenção do projeto**, aplicada com a mesma conta de
  qualquer razão salário/preço.
- **Não significa:** custo de vida; mede um item.

### Preços de combustíveis (ANP)

- **Dados:** Levantamento de Preços de Combustíveis (LPC) da ANP, por posto revendedor, preço de revenda; e a série mensal nacional
  que a própria ANP publica (`mensal-brasil-desde-jan2013.xlsx`).
- **Decisão (v1.4.0): a série principal é a série mensal nacional oficial da ANP.** Resultado da investigação da diferença entre a
  média simples das coletas (usada até a v1.3.0) e a série oficial, reproduzida em `docs/auditoria_anp_ponderacao.py`:
  - **A amostra é a mesma.** O número de coletas do projeto é igual ao "número de postos pesquisados" do arquivo oficial (razão
    média 1,001), os 91 meses são os mesmos e o produto é o mesmo (etanol hidratado, gasolina comum, GLP, óleo diesel e diesel S10).
    A diferença não vem de produto, de calendário nem de cobertura.
  - **A diferença vem da ponderação.** A página da ANP diz que a média é simples só no nível municipal e que, desde 31/10/2004, os
    níveis estadual, regional e nacional são ponderados pelas vendas informadas pelas distribuidoras. A média simples de todas as
    coletas pesa cada UF pelo número de coletas, que depende do desenho da amostra (os municípios do Nordeste e do Sul têm mais
    coletas do que sua parte nas vendas). Em 2022, no etanol hidratado: São Paulo tinha 33,3% das coletas e 52,1% das vendas, com preço
    médio de R$ 4,33 contra R$ 4,85 na média simples nacional; Nordeste, 19,9% das coletas e 8,2% das vendas; Sul, 12,5% e 6,0%;
    Sudeste, 53,9% e 68,6%.
  - **Reprodução da série oficial.** Ponderando o preço médio de cada município pelas vendas anuais do município e depois cada UF
    pelas vendas mensais da UF (vendas oficiais da ANP) reproduz a série oficial com diferença média de +0,02% no etanol (média
    absoluta 0,47%, máxima 1,61%) e −0,02% na gasolina (0,14%; 0,40%). A média simples fica +6,49% (etanol; máx. 12,0%) e +0,29%
    (gasolina; 0,39%); pesar cada município por igual (+10,1%) ou cada UF por igual (+15,3%) afasta ainda mais. Só a ponderação por
    vendas mensais das UFs já leva a +0,58% no etanol (máx. 2,05%).
  - **O que não foi determinado:** o resíduo de 0,47% (etanol) a 0,14% (gasolina) entre a reprodução e a série oficial. A ANP não
    publica os pesos exatos nem a data de referência das vendas usadas; **causa do resíduo não determinada a partir da documentação
    disponível**. Ele é pequeno diante da diferença original e não muda nenhuma leitura.
  - **Por que a série oficial é a mais adequada.** A pergunta do projeto é "quanto custava o combustível, em média, para quem o compra
    no país?". Uma média nacional que pesa o consumo responde a ela; uma média que pesa a densidade da amostra responde a "qual
    era o preço médio dos postos pesquisados". Além disso, a série oficial é pública, mantida pela ANP e auditável. Critério
    metodológico, não de resultado: o efeito foi medido depois da decisão e não muda nenhuma leitura.
  - **Efeito da troca** (período completo; Bolsonaro / Lula, variação real do início ao fim): gasolina −9,17 / +11,02 → −7,96 / +10,25;
    etanol +2,56 / −11,07 → +7,93 / −13,64; diesel +46,30 / −11,26 → +46,25 / −12,45; diesel S10 +44,80 / −8,28 → +44,78 / −8,65; GLP
    +23,49 / −9,84 → +24,59 / −10,30. Custo de vida (mediana das 11 séries): Lula −9,84% → −10,30%; Bolsonaro 34,80% (inalterado).
    Nenhuma leitura de dimensão e nenhum número da síntese ou da grade de 10.626 combinações mudou.
- **Rótulos:** "série mensal nacional oficial da ANP (ponderada por vendas)". A média simples das coletas só aparece, rotulada assim, na
  explicação do método e na coluna `preco_simples_coletas`. As linhas regionais seguem sendo a média simples das coletas da região
  (a ANP não publica a região mensal nesse arquivo) e não são exibidas.
- **Lacuna de 2020:** a página da ANP diz que não houve pesquisa entre 23/08 e 17/10/2020; o arquivo oficial mensal diz 18/08 a
  17/10. Nos dados brutos, a última coleta é 17/08 e a primeira, 19/10; agosto e outubro têm coleta parcial. O site cita a ANP.
- **Referências:** ANP, *Informações sobre o levantamento de preços de combustíveis* (texto lido em 01/10/2026) e *Metodologia resumida
  do LPC* (2020) — **sustentam** a fonte, a coleta, a média municipal simples e a ponderação por vendas nos níveis estadual, regional
  e nacional. Vendas: ANP, dados abertos de vendas de combustíveis por UF e por município — **sustentam** a reprodução.
- **Não significa:** o preço de um posto, de um estado ou de um dia.

### Alimentos (índice de preço por item do IPCA)

- **Dados:** variação mensal oficial de seis subitens do IPCA (IBGE/SIDRA, variável 63): Arroz (1101002, código SIDRA 7173),
  Feijão-carioca (rajado) (1101073, 12222), Patinho (1107089, 7295), Leite longa vida (1111004, 12393), Óleo de soja
  (1113013, 7385) e Café moído (1114022, 7392). Tabela 1419 (jan/2012–dez/2019) e tabela 7060 (jan/2020 em diante); mesmos
  códigos e nomes nas duas.
- **Verificação dos subitens (R10):** a tabela de correspondência oficial do IBGE entre despesas da POF 2017-2018 e subitens do
  SNIPC confirma que cada subitem é o produto pretendido: Arroz agrupa arroz polido, com casca e "não especificado" (todos os
  tipos); Feijão-carioca = "feijão rajado"; Patinho = corte patinho (o "patinho orgânico" é outro subitem, 1107204, e não entra);
  Leite longa vida = "leite de vaca integral"; Óleo de soja; Café moído = café moído e "café não especificado" (o café solúvel é
  outro subitem, 1114023, e não entra).
- **Leite (código 1111004), resolvido:** a tabela de correspondência da POF 2008-2009 do IBGE descreve o código 1111004 como "Leite
  integral pasteurizado", e a da POF 2017-2018 e o SIDRA (tabelas 1419 e 7060) como "Leite longa vida". O Banco Central, no Estudo
  Especial nº 69/2019 (dezembro/2019, que compara a estrutura vigente de jan/2012 a dez/2019, da POF 2008-2009, com a de jan/2020),
  lista o código 1111004 como "Leite longa vida" **nas duas estruturas**. Ou seja: o código é o mesmo, o nome "Leite longa vida" já
  valia na estrutura 2012–2019 e o descritor "integral pasteurizado" é o da tabela de correspondência de despesas da POF, não o do
  subitem coletado. O rótulo do projeto está correto. Não foi encontrada uma especificação de coleta que permita provar, por si só, que
  o produto é idêntico nos dois períodos; a série é a oficial do subitem, encadeada pela variação mensal, e não mostra
  descontinuidade em dez/2019–jan/2020 (+0,30%, −0,38%). **Documentado como distinção histórica, sem mudança de dados nem de rótulo.**
- **Fórmula:** índice encadeado `índice(t) = índice(t−1) × (1 + variação mensal ÷ 100)`, base 100 em jan/2019; índice real =
  índice × IPCA do último mês ÷ IPCA do mês.
- **Referências:** IBGE (2020), métodos de cálculo — **sustenta** o encadeamento e o deflator; Yuba et al. (2013), *Rev. Saúde
  Pública* 47(3), DOI 10.1590/s0034-8910.2013047004073 — **sustenta parcialmente** (preço real de alimento por índice geral;
  encadeamento); BCB, Estudo Especial nº 69/2019 — **sustenta** o nome do subitem 1111004 nas duas estruturas.
- **Não significa:** preço em reais do quilo; "carne" é só o patinho.

### Dólar corrigido pelo IPCA (câmbio nominal em reais constantes)

- **Dados:** PTAX venda (BCB/SGS série 1), média do mês nos gráficos e dado diário nas pontas das comparações.
- **Três coisas diferentes:**
  1. **Taxa de câmbio nominal** `E` (reais por dólar): a cotação do dia.
  2. **Dólar corrigido pelo IPCA** (o que o projeto mostra): `E(mês) × IPCA(último mês) ÷ IPCA(mês)`, a cotação de cada mês expressa em reais
     de hoje. Só tira a inflação brasileira.
  3. **Taxa de câmbio real** da literatura: `E × P* ÷ P`, que compara o nível de preços do exterior (`P*`) com o do país (`P`) e, nos índices
     efetivos, usa uma cesta de parceiros comerciais. Desconta também a inflação do parceiro.
- **Por isso o rótulo** é "Dólar corrigido pelo IPCA", e a página diz que não é a taxa de câmbio real. O cálculo não foi alterado.
- **Referências:** Ipeadata, *Taxa de câmbio efetiva real — nota metodológica* (2018) — **sustenta** a definição de câmbio real (e a
  distinção). Rogoff (1996), sobre paridade do poder de compra, **não foi usado como referência**: o DOI não foi localizado no
  Crossref e o texto não foi verificado.
- **Não significa:** boa ou má notícia; o dólar é Tipo B, descrito e nunca pontuado.

### Selic

- **Dados:** meta Selic definida pelo Copom (BCB/SGS 432), não a taxa efetiva (séries 11 e 4189).
- **Fórmula:** média do mês nos gráficos; nas comparações, o dado diário da meta; variação em pontos percentuais.
- **Escolha do projeto:** a média mensal da meta não é estatística oficial do BCB (o BCB publica meta, vigência e a taxa efetiva
  como média ponderada por volume). **Referência:** BCB, metadados SGS "Taxas Selic" — **sustenta** a distinção meta × efetiva
  e **não sustenta** a média dos dias úteis da meta como estatística oficial.
- **Não significa:** juros que as pessoas pagam; Tipo B, só descrito.

### Ibovespa

- **Dados:** fechamento do Ibovespa (B3), em pontos; último pregão do mês nos gráficos, dado diário nas pontas.
- **Método:** variação percentual nominal de pontos. O índice é de retorno total (reinveste dividendos); a série **não é
  descontada da inflação**. **Referências:** B3, *Metodologia do Índice Bovespa* — **sustenta** a definição e os critérios;
  Araújo, Brito & Sanvicente (2021), *Int. J. Finance & Economics* 26(4), DOI 10.1002/ijfe.2118 — **sustenta parcialmente** (usa o
  Ibovespa como retorno total e deflaciona para comparar épocas).
- **Não significa:** desempenho das empresas em reais constantes nem bem-estar; Tipo B.

### IPCA em 12 meses

- **Dados:** número-índice do IPCA (SIDRA 1737, variável 2266), **a partir de jan/2018**.
- **Fórmula:** `IPCA 12m(t) = índice(t) ÷ índice(t−12) − 1`, em %. A média da janela é a média simples dos valores mensais.
  Jan/2019 usa o índice de jan/2018 (3,78%); dez/2019, 4,31%. O IBGE define a variação acumulada de um IPCA em um período como a razão entre números-índice (fonte oficial); o
  cálculo mensal em 12 meses a partir do número-índice é feito pelo projeto, com essa definição.
- **Escolha do projeto:** a média da janela mede a pressão ao longo do período (regra da métrica). Para taxas, não é a variação
  entre o primeiro e o último ponto.
- **Referências:** IBGE (2020), métodos de cálculo — **sustenta** o encadeamento, a variação acumulada e os números-índice.
- **Não significa:** a inflação de cada família.

### PIB

- **Dados:** crescimento real anual (IBGE, Contas Nacionais Trimestrais), resultado do 4º trimestre; só anos fechados.
- **Fórmula:** média aritmética simples das taxas anuais da janela (Bolsonaro 2019–2022; Lula 2023–2025). Convenção do projeto:
  a média geométrica (CAGR) dá 1,38% e 2,97%, contra 1,43% e 2,97% pela aritmética; mesma leitura.
- **Referências:** IBGE, *Contas Nacionais Trimestrais* (relatório metodológico) — **sustenta** a medida; OECD, *Quarterly
  National Accounts – GDP Growth Methodology* — **sustenta** o cálculo de taxas; OECD *Compendium of Productivity Indicators* 2024
  (DOI 10.1787/b96cd88a-en) — **não sustenta** a escolha entre média aritmética e geométrica.
- **Não significa:** renda individual, distribuição nem bem-estar; nem desempenho de governo.

### Mercado de trabalho

Ver a seção própria acima. Referências: IBGE, *Medidas de subutilização da força de trabalho* e notas da PNAD Contínua —
**sustentam** os conceitos e a coleta; BCB, Estudo Especial nº 109/2021 (PNAD Contínua na pandemia) — **sustenta** a ressalva
sobre a queda da taxa de resposta; a regra "cada série vota uma vez" **não tem literatura que a sustente diretamente**
(é convenção do projeto, declarada antes do cálculo).

### Custo de vida: como as 11 séries se resumem

- **Método principal (convenção do projeto, com ressalvas):** variação real do início ao fim de cada série, mediana entre as 11
  séries (5 combustíveis e 6 alimentos), sem pesos. A mediana é um resumo robusto: um item extremo (o óleo de soja subiu 90% em termos
  reais num período) não decide a leitura sozinho. **Não é um índice de preços**: não é um agregado elementar, não tem pesos de despesa e
  as séries têm unidades e naturezas diferentes.
- **Avaliação (R3b, concluída em 01/10/2026): DEFENSÁVEL, COM LIMITAÇÕES; mantida como método principal.**
  - *Limitações:* (a) pesos iguais para itens de importâncias muito diferentes (a gasolina pesa ~5,3% do IPCA, o feijão ~0,13%); (b) diesel e
    diesel S10 têm correlação de variações mensais de 0,99 e são o mesmo subitem do IPCA (peso 0,24%), então o diesel entra duas vezes;
    (c) a mediana de 11 valores é decidida por poucas séries centrais; (d) a leitura principal responde "como variaram", e o nível real é
    outra pergunta (ver "Outra forma de olhar").
  - *Por que não foi substituída:* nenhuma alternativa testada é uma correção clara. As alternativas respondem a perguntas um pouco
    diferentes, a literatura não aponta um único agregador para séries heterogêneas e, na leitura principal, **todas** apontam para o
    mesmo período. Trocar o método depois de ver os resultados seria uma escolha post hoc.
- **Alternativas calculadas** (pipeline: `custo_vida_agregadores`; recálculo independente em `docs/auditoria_custo_vida_agregadores.py`).
  Variação real do início ao fim, período completo, Bolsonaro / Lula (menor valor = menor pressão):

  | Agregador | Bolsonaro | Lula | Diferença L−B | Leitura | Grade (Lula / Bolsonaro / empate) |
  |---|---|---|---|---|---|
  | Mediana das 11 (atual) | +34,80% | −10,30% | −45,10 | Lula | 10.626 / 0 / 0 |
  | Média aritmética das 11 (Carli) | +33,35% | −5,30% | −38,65 | Lula | 10.626 / 0 / 0 |
  | Média geométrica das 11 (Jevons) | +31,32% | −6,28% | −37,60 | Lula | 10.626 / 0 / 0 |
  | Mediana, diesel e S10 como um item (10) | +30,68% | −10,43% | −41,11 | Lula | 10.626 / 0 / 0 |
  | Mediana sem o diesel S10 (10) | +30,68% | −11,38% | −42,06 | Lula | 10.626 / 0 / 0 |
  | Média das médias das duas categorias | +32,49% | −5,44% | −37,93 | Lula | 10.626 / 0 / 0 |
  | Média ponderada pelo peso no IPCA (10 itens) | +9,22% | +2,36% | −6,86 | Lula | 10.626 / 0 / 0 |

  Nível real médio (base 100 = média dos dois períodos), mesma ordem: a mediana, a média, a média geométrica, o diesel único e a média por
  categoria apontam para o período **Bolsonaro** (98,8 / 101,3 na mediana; 98,4 / 101,6 por igual duração) e dão uma grade de 9.625 / 715 / 286;
  a **média ponderada pelo IPCA aponta para o período Lula** (nível relativo +0,55 no período Bolsonaro e −0,56 no Lula, diferença de 1,1 ponto, na margem da tolerância de
  1,0 ponto), porque a gasolina, com ~54% do peso dos 10 itens, ficou mais barata em nível no período Lula. Com pesos de dez/2022 ou de
  ago/2026 a diferença cai abaixo de 1 ponto ("praticamente iguais"). **Portanto a leitura do nível depende do resumo escolhido** e o site
  diz isso no bloco "Outra forma de olhar".
- **Literatura (pesquisada de novo):** OECD/JRC *Handbook* (Nardo et al., 2008) — **sustenta** a dupla contagem, o papel dos pesos e a
  necessidade de testar a sensibilidade; **não sustenta** a mediana como agregador. *Consumer Price Index Manual* (ILO et al., 2004, cap. 20, "Elementary
  indices"; edição revisada, cap. 6) — **indireta**: para agregar relativos de preço sem pesos de despesa recomenda a média geométrica
  (Jevons) e aponta o viés para cima da média aritmética (Carli); é a razão de a média geométrica estar entre as alternativas. Não foi
  possível abrir o texto integral do manual (acesso bloqueado); a classificação se apoia nos resumos e nos registros Crossref. Bryan &
  Cecchetti (1993, NBER WP 4303), Smith (2004, *J. Money, Credit and Banking* 36(2):253–263, DOI 10.1353/mcb.2004.0014) e Ball, Carvalho &
  Evans (2023, NBER WP 31032) — **indiretas**: usam a mediana de variações de preços como medida central de inflação, mas **ponderada** pelas
  participações de despesa. **Não foi encontrado** artigo que use mediana não ponderada de
  séries de naturezas diferentes como agregador de uma dimensão: **a mediana não ponderada é uma convenção do projeto**.

### Síntese e análise de sensibilidade aos pesos

- **Método:** cada dimensão vira um sentido (−1, 0, +1) pela comparação das medianas de `f` com a tolerância; a síntese soma os
  sentidos ponderados. Não há artigo que sustente **exatamente** esse voto ±1/0 por dimensão com tolerância e soma ponderada. Há dois
  quadros conceituais próximos, ambos **indiretos**: (i) a agregação ordinal ou não compensatória (Munda & Nardo, 2009, *Applied
  Economics* 41(12), DOI 10.1080/00036840601019364, que registra a perda da magnitude); (ii) o índice de concordância dos métodos de
  superação (*outranking*, ELECTRE), que soma os pesos dos critérios em que uma alternativa é ao menos tão boa quanto a outra, com um
  limiar de indiferença (Roy, 1991, *Theory and Decision* 31:49–73, DOI 10.1007/bf00134132). Aqui a contagem é descritiva, com direção definida antes
  do cálculo, e a magnitude é mostrada ao lado. **A regra do voto é uma convenção do projeto.**
- **Grade discreta de pesos:** o conjunto de combinações de pesos em múltiplos de 5 pontos que somam 100 é uma **malha simplex-lattice** `{q = 5, m = 20}`
  (Scheffé, 1958, *J. Royal Statistical Society B* 20(2):344–360, DOI 10.1111/j.2517-6161.1958.tb00299.x), que tem `C(q + m − 1, m) = C(24, 20) = C(24, 4) = 10.626`
  pontos. Scheffé trata de experimentos com misturas, não de índices compostos: **sustenta a estrutura combinatória**, não o uso.
- **Sensibilidade:** Saisana, Saltelli & Tarantola (2005), *JRSS A* 168(2), DOI 10.1111/j.1467-985x.2005.00350.x — **sustenta** a prática de
  testar incerteza e sensibilidade de compostos; Saltelli & Annoni (2010), DOI 10.1016/j.envsoft.2010.04.012 — **indireta** (critica a
  sensibilidade de um fator por vez; a grade varia todos os pesos juntos); Lahdelma, Hokkanen & Salminen (1998), *EJOR* 106, DOI
  10.1016/s0377-2217(97)00163-x e Tervonen & Lahdelma (2007), *EJOR* 178, DOI 10.1016/j.ejor.2005.12.037 — **sustentam o conceito** de
  explorar o conjunto de pesos e reportar aceitabilidade (SMAA). **SMAA não foi adotado:** ele amostra o simplex contínuo e reporta a fração
  de pesos que favorece cada alternativa; a grade de 5 em 5 pontos é a versão discreta e exaustiva disso, mais simples de auditar. Seria uma
  extensão possível, com o mesmo princípio e as mesmas ressalvas.

### Tolerâncias e "praticamente iguais" (convenção do projeto)

Duas medianas de `f` que diferem menos que **1,0 ponto** (variações em %) ou **0,1 ponto** (médias de taxas) são lidas como
"praticamente iguais". Os limiares **não vêm de literatura**: o conceito de limiar de indiferença existe em métodos
multicritério (Roy, 1991; Brans & Vincke, 1985, *Management Science* 31(6):647–656, DOI 10.1287/mnsc.31.6.647 — **indiretas**, não fixam
valores), e o *Handbook* adverte para limiares arbitrários. São escolhas do projeto fixadas antes do cálculo. Teste: na janela
completa, Inflação e PIB ficam empatados com tolerância ≥ ~1,6 ponto; nenhuma tolerância testada produz leitura a favor do período
Bolsonaro.

**Mercado de trabalho (regra do voto, convenção do projeto).** Três séries da PNAD Contínua em unidades diferentes (taxa de desocupação em %,
taxa composta de subutilização em %, rendimento médio real habitual em R$). Cada série é comparada na sua métrica (taxas: média da janela;
rendimento: variação do início ao fim) e na sua tolerância (0,1 ponto para médias; 1,0 ponto para variação) e **vota** +1 (período Lula), −1
(período Bolsonaro) ou 0 ("praticamente iguais"). A dimensão segue o **sinal da soma** dos votos. Se as séries divergem, a soma decide:
2 contra 1 dá o lado dos 2; 1 contra 1 mais um empate dá empate (0, "praticamente iguais"); nenhuma série tem peso maior que outra.
Hoje: 3 votos pelo período Lula. A regra alternativa (variação do início ao fim para as taxas; média da janela para o rendimento) é
mostrada só como transparência: desocupação B −4,9 / L −3,5 p.p. (voto Bolsonaro); subutilização B −6,5 / L −5,8 (empate); rendimento
(média) a favor de Lula; soma 0, o que daria "praticamente iguais". **Alternativa pesquisada:** uma mediana entre séries de unidades
diferentes foi descartada por misturar unidades; um índice composto exigiria normalizar (min-max ou z-score) e escolher pesos, o que o
projeto evita para não introduzir juízo de valor. Nenhuma alternativa tem melhor suporte na literatura (não há trabalho que fixe a regra), então a
regra continua sendo uma convenção do projeto, declarada antes do cálculo; a duplicação parcial entre desocupação e subutilização (correlacionadas) é
informada na leitura "sem uma série".

## Limitações e escolhas metodológicas

Registradas pela auditoria de 01/10/2026 ([AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md)); esta seção só as documenta e não as resolve.

- **Parte do método é convenção própria do projeto.** Não existe necessariamente uma metodologia acadêmica única, nem diretamente aplicável, para todas as agregações
  feitas aqui (mediana do Custo de vida, voto por série, síntese por sentido, razão litros por salário mínimo, grade de pesos de 5 em 5 pontos).
- **O método do Custo de vida foi avaliado como "defensável, com limitações":** pesos iguais para itens de importâncias muito diferentes, diesel e diesel S10
  quase duplicados, e uma leitura do nível real que depende do resumo escolhido.
- **A série oficial da ANP tem um resíduo não explicado.** A reprodução da ponderação por vendas chega a menos de 0,5% da série oficial; os 0,14% a 0,47% que
  sobram não têm explicação na documentação pública.
- **O texto integral do *Consumer Price Index Manual* não pôde ser consultado durante a auditoria.** Ele consta como referência metodológica pertinente a índices
  de preços, com essa ressalva.
- **A análise de sensibilidade dos pesos não valida a metodologia.** Ela testa se o resultado muda nas combinações de pesos avaliadas (uma grade discreta de 5 em 5
  pontos, não todos os pesos possíveis); como nenhuma dimensão aponta para o período Bolsonaro, o resultado é estável por construção. Não é validação externa, não
  prova causa e não mede desempenho de governo.
- **A auditoria não transforma as escolhas próprias em metodologia acadêmica.** Ela verificou contas, fontes e alternativas.

### Limitações de dados e de escopo


1. ANP: preço nacional oficial (ponderado por vendas), com defasagem de publicação; set/2020 sem pesquisa; sem quebra regional oficial no arquivo mensal.
2. Alimentos: índice, não R$; "carne" é só o patinho; o IBGE não tem preço médio
   absoluto por item.
3. IPCA geral como deflator, sem ajuste sazonal.
4. Salário mínimo: piso nacional.
5. PIB: série revisada pelo IBGE; ano em curso só trimestral.
6. Ibovespa: endpoint público do site da B3, sem garantia contratual.
7. Câmbio, Brent, notícias e marcos: contexto, não causa.
8. Comparar mandatos de tamanhos diferentes (48 × 44 meses) exige as janelas de
   mesma duração; o modo "completo" mostra a diferença.
9. Toda variação depende dos pontos escolhidos: por isso os gráficos mostram o
   caminho inteiro.
