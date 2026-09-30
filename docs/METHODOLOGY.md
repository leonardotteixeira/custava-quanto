# Metodologia

Última atualização: 28/09/2026
Status: **CURRENT** — descreve o que o código calcula hoje. Metodologia da
Análise: **v1.2** (arquivo congelado em `data/processed/analysis_methodology.json`).

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

Preço médio nacional de revenda (ANP), em R$/litro (GLP: R$/botijão de 13 kg). É a
**média simples de todas as coletas do mês**, sem ponderar por volume vendido ou
por região. Setembro/2020 não tem pesquisa da ANP: as linhas ficam interrompidas e
só a Máquina do tempo mostra uma estimativa "≈", calculada como `último preço da
ANP × (1 + variação do item no IPCA)` e nunca usada em outra conta.

Câmbio e Brent aparecem como **contexto** dos combustíveis; a proximidade entre
eles e o preço não é prova de causa (preço da Petrobras, ICMS e tributos federais
também pesam).

### Salário mínimo e poder de compra

Salário mínimo nacional (BCB SGS 1619, nominal). "% do salário mínimo" e
"unidades por salário mínimo" usam o salário **vigente no mês** de cada preço, não
o de hoje. É o piso nacional; alguns estados têm pisos maiores.

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
meses começa em jan/2020 (precisa de 12 meses anteriores) e o PIB é anual, então
para eles vale o que os dois lados têm em comum: IPCA de jan/2020 a ago/2022 contra
jan/2024 a ago/2026; PIB, três anos fechados de cada lado (2019–2021 contra
2023–2025).

Compara-se a **mesma posição no mandato**, não o mesmo calendário: os primeiros 44
meses de cada período correspondem a momentos diferentes do ciclo econômico
mundial.

## Análise: como a leitura é construída (metodologia v1.2)

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
| Renda e poder de compra | A | Em qual período o salário mínimo ganhou mais poder de compra? | Salário mínimo real; litros de gasolina por salário mínimo (+ salário nominal, tipo C) |
| Mercado de trabalho | A | Em qual período o mercado de trabalho mostrou menor desocupação, menor subutilização da força de trabalho e maior rendimento real do trabalho? | Taxa de desocupação; taxa composta de subutilização; rendimento médio real habitual (PNAD Contínua) — cada série na sua unidade |
| Atividade econômica | A | Em qual período o PIB apresentou maior crescimento? | PIB (média do crescimento real anual) |
| Mercados | B | Como os indicadores financeiros evoluíram? | Dólar, Selic, Ibovespa |

### Tipos de indicador

- **Tipo A — direção definida.** A metodologia diz de antemão qual sentido é
  o de menor pressão ou de mais atividade: preço real ou inflação **menor**; poder de
  compra, rendimento do trabalho ou crescimento **maior**. 18 séries.
- **Tipo B — depende do contexto.** Só descrito (início, fim, média, mínimo,
  máximo). Nunca recebe leitura de direção nem entra na síntese: Dólar, Selic,
  Ibovespa. Um dólar mais baixo barateia importações e prejudica exportadores; juro
  alto contém inflação e encarece crédito; o Ibovespa mede uma carteira de ações,
  não o bem-estar das famílias.
- **Tipo C — informativo.** Não entra em nenhuma leitura: salário mínimo nominal
  (sobe com a inflação em qualquer período).

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

### Sensibilidade aos pesos

Seis cenários definidos antes do cálculo, sobre as cinco dimensões Tipo A:

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
**todas as combinações de pesos de 5 em 5 pontos que somam 100** (10.626 combinações com cinco dimensões)
e informa em quantas a síntese aponta para cada período e em quantas empata. Na
página, o leitor move uma barra por dimensão ("Como diferentes prioridades mudam a
leitura?"); a única conta feita no navegador é a soma ponderada dos sentidos já
calculados (+1, 0, −1), a mesma fórmula da síntese. Os pesos são preferência do
leitor, não dado: mudá-los muda a interpretação e não mostra qual governo foi
melhor.

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

## Limitações gerais

1. ANP: amostra de postos, defasagem, média simples; set/2020 sem pesquisa.
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
