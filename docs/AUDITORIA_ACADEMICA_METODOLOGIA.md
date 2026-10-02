# Auditoria acadêmica e oficial da metodologia

Auditoria realizada em 01/10/2026 sobre a metodologia da Análise (`data/processed/analysis_methodology.json`), do estado v1.2.1 ao estado final **v1.4.0**. Este documento é a versão pública consolidada: registra o que foi perguntado, o que foi verificado, o que estava errado, o que foi corrigido, o que ficou como convenção do projeto e o que continua limitado. Os cálculos de cada afirmação podem ser refeitos com os scripts `docs/auditoria_*.py` (seção 11).

A literatura serve para responder se um método de cálculo é defensável. Não serve, e não é usada, para dizer qual governo foi melhor. Nenhuma leitura do projeto estabelece causa.

## Sumário

1. [Objetivo e escopo](#1-objetivo-e-escopo)
2. [Metodologia auditada](#2-metodologia-auditada)
3. [Como ler as classes de evidência](#3-como-ler-as-classes-de-evidência)
4. [Matriz R1–R10](#4-matriz-r1r10)
5. [Achados adicionais (A1–A8)](#5-achados-adicionais-a1a8)
6. [Problemas encontrados](#6-problemas-encontrados)
7. [Correções realizadas e verificações](#7-correções-realizadas-e-verificações)
8. [Resultados antes e depois](#8-resultados-antes-e-depois)
9. [Sensibilidade aos pesos e leituras alternativas](#9-sensibilidade-aos-pesos-e-leituras-alternativas)
10. [Suporte de cada método, convenções próprias e limitações](#10-suporte-de-cada-método-convenções-próprias-e-limitações)
11. [Reprodução e testes](#11-reprodução-e-testes)
12. [Referências avaliadas](#12-referências-avaliadas)
13. [Errata](#13-errata)

---

## 1. Objetivo e escopo

**Objetivo.** Responder, indicador por indicador: (i) como o código calcula; (ii) que fonte oficial e que literatura sustentam, ou não, esse cálculo; (iii) onde a metodologia diverge do que a literatura recomenda; (iv) o que mudaria nos números se a divergência fosse corrigida.

**Escopo.** Os seis indicadores de preço e renda (combustíveis, alimentos, salário mínimo real), os indicadores macro (IPCA, PIB, mercado de trabalho), os indicadores de mercado (dólar, Selic, Ibovespa), a síntese por dimensão, os pesos e a grade de sensibilidade. Ficam fora: a escolha das dimensões, a curadoria de notícias (auditada à parte em [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md)) e qualquer pergunta causal.

**Resultado em uma página.**

- A síntese com pesos iguais e as 10.626 combinações de pesos apontam para o período Lula em todas as dimensões com critério definido, **antes e depois das correções**. Nenhuma correção feita inverteu uma leitura.
- Dois erros reais foram corrigidos: o IPCA em 12 meses do período Bolsonaro excluía 2019 (R1) e a série "litros de gasolina por salário mínimo" contava a gasolina duas vezes dentro de Renda (R2). A fonte de combustíveis passou a ser a série oficial da ANP, e o salário mínimo real ganhou série própria.
- A única alternativa testada que inverte uma dimensão é medir o Custo de vida pelo **nível** real médio, em vez da variação do início ao fim. As duas medidas respondem a perguntas diferentes; o projeto mantém a variação como leitura principal e mostra o nível como leitura complementar, fora da síntese.
- A grade de pesos é uma análise de **sensibilidade aos pesos** e seu resultado decorre de dominância: nenhuma dimensão aponta para o outro período. Não é prova de robustez geral.
- Quatro construções são **convenção do projeto**, sem literatura que as sustente diretamente: mediana não ponderada, voto ±1/0 com tolerância, litros de gasolina por salário mínimo e grade de pesos de 5 em 5 pontos (seção 10).

## 2. Metodologia auditada

Cadeia de cálculo (do código): série mensal → deflação pelo IPCA a preços do último mês → variação do início ao fim de cada janela (ou média, conforme o tipo do indicador) → leitura por dimensão (+1 / 0 / −1, com tolerância) → síntese com pesos por cenário → grade de pesos.

| Elemento | Regra na v1.2.1 (auditada) | Regra na v1.4.0 (final) |
|---|---|---|
| Dimensões que votam | Custo de vida, Inflação, Renda, Mercado de trabalho, Atividade; Mercados não votam | Igual |
| Custo de vida | Mediana de 11 variações reais (5 combustíveis e 6 índices de alimentos), tolerância 1,0 ponto | Igual; fonte de combustíveis passa a ser a série oficial da ANP; nível real e seis agregadores como leitura complementar |
| Inflação | Média do IPCA em 12 meses; série começava em jan/2020 | Série desde jan/2019 (Bolsonaro com 48 meses; igual duração com 44) |
| Renda | Salário mínimo real e litros de gasolina por salário mínimo, ambos votando | Só o salário mínimo real vota; os litros são descritivos (Tipo C) |
| Salário mínimo real | Herdava a série da gasolina (sem set/2020) | Série própria e completa (BCB SGS 1619 e IPCA), 92 meses |
| Mercado de trabalho | Três votos (desocupação, subutilização, rendimento) | Igual; regra alternativa mostrada como transparência |
| Atividade | Média aritmética das taxas anuais do PIB | Igual |
| Janelas "primeiros 12/24/36 meses" | Mesmo número de observações | Mesma janela de calendário nos dois períodos |
| Pesos | Grade de 5 em 5 pontos, 10.626 combinações = C(24,4) | Igual; texto: "análise de sensibilidade aos pesos" |
| Dólar | "Corrigido pela inflação" (câmbio nominal em reais de hoje) | Rótulo "Dólar corrigido pelo IPCA", com aviso de que não é câmbio real |

A descrição indicador por indicador, com fontes e fórmulas, está em [METHODOLOGY.md](METHODOLOGY.md) (seção "Fundamentos por indicador"); o histórico de versões, em [AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md).

## 3. Como ler as classes de evidência

**Classe de cada método ou referência.**

- **OFICIAL**: sustentado por metodologia de órgão oficial (IBGE, ANP, BCB, B3).
- **ACADÊMICO**: sustentado por literatura revisada por pares, total ou parcialmente.
- **CONVENÇÃO**: escolha do projeto, declarada, testada e documentada.
- **LIMITAÇÃO**: limitação documentada, ou método sem literatura direta.

**Classe de cada referência (seção 12).** **S** sustenta o método; **I** é indireta ou contextual; **N** não sustenta o ponto em questão; **V** não verificada.

**Verificação das referências.** Todos os DOIs usados na metodologia foram conferidos na API do Crossref (existência, título, autores, ano, periódico, volume e páginas). Quando só o resumo ou a página de divulgação foi lido, não se afirma o que o método interno do artigo faz. As referências cujo texto integral não foi aberto estão indicadas.

**Tipos de problema** usados na matriz: **T1** erro metodológico definido; **T2** escolha defensável que pedia melhor documentação; **T3** escolha em que a literatura admite várias alternativas; **T4** problema de terminologia; **T5** problema de fonte de dados; **T6** poderia alterar materialmente a conclusão.

## 4. Matriz R1–R10

Cada linha traz o problema, o método original, o que se decidiu e o estado final. "B / L" são os períodos Bolsonaro e Lula; valores de janela completa, salvo indicação.

| ID | Questão | Método original | Evidência | Decisão e estado final (v1.4.0) | Impacto |
|---|---|---|---|---|---|
| **R1** | Cobertura do IPCA em 12 meses (T1, T5) | `download_ibge.py` mantinha o IPCA desde jan/2019; a taxa em 12 meses só existia desde jan/2020. Bolsonaro tinha 36 meses; Lula, 44 | SIDRA tabela 1737 tem 2018. Série recalculada por fora: idêntica mês a mês (jan/2019 = 3,78%; dez/2019 = 4,31%) | **Corrigido**: número-índice baixado desde jan/2018; Bolsonaro 48 meses; igual duração passou de 32 para 44 meses | Média B 6,95 → 6,14; L 4,61 inalterado; diferença 2,34 → 1,54 p.p.; leitura continua Lula |
| **R2** | Litros de gasolina por salário mínimo dentro de Renda (T1, T6) | Série Tipo A ao lado do salário mínimo real. Litros = SM real ÷ preço real da gasolina (identidade; desvio máximo 0,008 L em 91 meses). A gasolina já votava em Custo de vida | Identidade verificada numericamente; *Handbook* OCDE/JRC, p. 32 (dupla contagem) | **Corrigido**: litros passam a Tipo C (publicados, sem voto). A correção foi justificada por dupla contagem, não pelo resultado | Renda: empate (+0,83 / +0,89) → Lula (−4,02 / +6,15); soma da síntese 80 → 100; grade 10.625/0/1 → 10.626/0/0. É a única correção que move uma leitura para um só lado; por isso foi registrada explicitamente |
| **R3a** | Diesel e diesel S10 duplicados em Custo de vida (T1) | Ambos entram nas 11 séries; correlação das variações reais 1,00 (0,99 após a troca de fonte); mesmo subitem do IPCA (0,29% do índice) | Matriz de correlação; pesos do IPCA; *Handbook*; Freudenberg (2003) | **Documentado**; a série segue como convenção declarada (alternativas D e E da seção 9) | Sem o S10, mediana B −34,80 → −30,68 e L +9,84 → +10,46 (base antiga); leitura igual |
| **R3b** | Construção do Custo de vida: mediana não ponderada (T2, T3) | Mediana das 11 variações reais, tolerância 1,0 ponto; diesel (0,29%) pesa como gasolina (4,70%) | Sem literatura para mediana **não ponderada** de séries heterogêneas; Bryan & Cecchetti, Smith e Ball et al. usam mediana **ponderada**; *CPI Manual* recomenda Jevons para agregados sem pesos | **Mantido como "defensável, com limitações"**; nove agregadores calculados (seção 9); nenhum muda a leitura da variação | Nenhum na síntese. O site mostra a contagem dos resumos em "Outra forma de olhar" |
| **R4** | Custo de vida: trajetória × nível médio real (T3, T6) | Variação do preço real do primeiro ao último mês da janela | Nenhuma fonte decide entre trajetória e nível; o *Handbook* lista a métrica como fonte de incerteza | **Mantida a trajetória como leitura principal**; nível real publicado como leitura complementar, fora da síntese | Por nível: B 98,81 / L 101,29 (média) e 94,74 / 101,88 (mediana) → leitura Bolsonaro; grade alternativa 9.625/715/286 (com Renda corrigida) |
| **R5** | Dólar: nominal × corrigido pela inflação × câmbio real (T4, T2) | Alternância "Corrigido pela inflação": PTAX × IPCA_ref ÷ IPCA_t | Nota do Ipeadata sobre o câmbio efetivo real (usa preços externos sobre domésticos). O site nunca usou a expressão "dólar real" | **Terminologia**: "Dólar corrigido pelo IPCA", com aviso de que não é câmbio real | Nenhum número; Mercados não entram na síntese. Referência: B +10,7% (corrigido) e +31,0% (câmbio real com CPI dos EUA); L −15,5% e −6,0% |
| **R6** | Média simples das coletas × série oficial da ANP (T2, T5) | Média simples de todas as coletas do mês | Arquivo oficial `mensal-brasil-desde-jan2013.xlsx`, 91 meses; reprodução da ponderação (seção 7.1) | **Corrigido**: a série oficial mensal nacional passou a ser a principal; a média simples fica em `preco_simples_coletas` | Nenhuma leitura mudou (seção 8). Etanol: a média simples ficava 6,49% acima, em média |
| **R7** | As 10.626 combinações: terminologia e alcance (T4, T2) | Texto chamava de sensibilidade/robustez | *Handbook* (Passo 8); Saisana et al. (2005); Saltelli & Annoni (2010); SMAA | **Terminologia**: "análise de sensibilidade aos pesos"; Parte 10 ampliada e Parte 11 resumida | Nenhum número da grade além do efeito de R2 |
| **R8** | Tolerâncias e regra do Mercado de trabalho (T3, T6) | Tolerância 1,0 (variação) e 0,1 (médias); trabalho por média de taxas e variação do rendimento | Limiares arbitrários: aviso do *Handbook*; Roy (1991) e Brans & Vincke (1985) só no conceito | **Documentado**; regra alternativa mostrada como transparência | Regra alternativa de Trabalho: B −4,9 / L −3,5 p.p. na desocupação (Bolsonaro), subutilização empate, rendimento Lula → soma 0, empate. Inflação e PIB empatam com tolerância ≥ ~1,6. Nenhuma tolerância testada produz leitura Bolsonaro |
| **R9** | Salário mínimo real: IPCA × INPC e mês-base (T2, T3) | SM_nominal × IPCA_idx(último mês) ÷ IPCA_idx(t) | IBGE (deflator); Ipeadata e DIEESE usam INPC; Ertel (2022) usa IPCA | **Fórmula mantida e documentada**; INPC como sensibilidade. Série própria e completa desde a v1.4.0 | INPC: B −4,02 → −5,20; L +6,15 → +7,39; mesma direção. Conferido em 9 datas e no mês-base |
| **R10** | Encadeamento dos índices de alimentos: tabelas 1419 (até 2019) e 7060 (2020 em diante) (T5, T2) | Variações da 1419 até dez/2019 e da 7060 desde jan/2020 | Códigos e nomes idênticos nas duas tabelas para os seis alimentos e os quatro combustíveis; tabelas de correspondência da POF × SNIPC | **Verificado, sem mudança**; ressalva do leite resolvida (seção 7.4) | Sem efeito mensurável; só identidade de código e nome foi provada |

## 5. Achados adicionais (A1–A8)

| ID | Questão | Resolução |
|---|---|---|
| **A1** | Pesos nominais iguais não são importância efetiva: Custo de vida é decidido por 11 séries correlacionadas; PIB por um número; Trabalho por três votos de dois fenômenos quase idênticos (Paruolo et al., 2013) | Documentado; pesos não alterados |
| **A2** | A agregação por sinais perde a magnitude (*Handbook*: contagem acima/abaixo de limiar é simples e robusta a extremos, mas perde a informação de intervalo). Contagem simples das 18 séries Tipo A: 16 favorecem Lula, 2 Bolsonaro | Documentado |
| **A3** | Mediana não ponderada dentro de uma dimensão | Tratada em R3b |
| **A4** | Mercado de trabalho: redundância (desocupação e subutilização), efeito de composição no rendimento, coleta telefônica entre o 2º tri/2020 e o 2º tri/2021, reponderações em nov/2021 e jul/2025 | Documentado |
| **A5** | PIB: média aritmética, 4 × 3 anos, efeito de base 2020/2021. Aritmética B 1,43 / L 2,97; geométrica 1,38 / 2,97; mediana 2,10 / 3,20 | Documentado; mesma direção |
| **A6** | Selic e Ibovespa só em termos nominais. Juro real ex-post (média mensal): B −0,26% / L +8,21% (Selic nominal média 6,50 / 13,20). Ibovespa real, série mensal: B −10,9% / L +33,4% (nominal +12,7% / +56,4%) | Documentado; ambos são Tipo B, fora da síntese |
| **A7** | Datas da lacuna de coleta da ANP em 2020 | **Resolvido**: a página da ANP informa 23/08 a 17/10; o arquivo mensal, 18/08 a 17/10; nos dados brutos, última coleta em 17/08 e primeira em 19/10. O texto do site segue a ANP e foi mantido |
| **A8** | O CSV do salário mínimo já traz meses futuros (até set/2026) | Sem efeito: o código só usa meses com IPCA; risco apenas se o filtro de IPCA for removido |

## 6. Problemas encontrados

| # | Problema | Classificação | Tratamento |
|---|---|---|---|
| P1 | IPCA 12 meses do período Bolsonaro excluía 2019 (36 × 44 meses); o comentário do código ("histórico completo") contradizia o filtro de `download_ibge.py` | Erro | Corrigido (R1) |
| P2 | Litros de gasolina por salário mínimo contavam a gasolina duas vezes e produziam um empate artificial em Renda | Erro de síntese | Corrigido (R2) |
| P3 | Custo de vida: redundância diesel/S10; diesel quase sem peso no consumo; mediana não ponderada | Convenção sem literatura direta | Documentado; alternativas calculadas (R3a, R3b) |
| P4 | A leitura de Custo de vida é de trajetória; pelo nível médio real a leitura inverte | Escolha de métrica não discutida | Documentado; nível publicado como complemento (R4) |
| P5 | "Dólar corrigido" é câmbio nominal em reais constantes, não câmbio real | Terminologia | Rótulo e aviso (R5) |
| P6 | A média simples nacional das coletas diferia da série oficial; no etanol, em média 6,5% | Fonte | Série oficial adotada (R6) |
| P7 | A grade só varia pesos; o resultado decorre de dominância; o nome "robustez" era excessivo | Terminologia | Corrigido (R7) |
| P8 | Trabalho: a regra "taxas = média" decide a leitura; desocupação e subutilização redundantes | Convenção | Documentado, regra alternativa visível (R8) |
| P9 | Agregação por sinais perde a magnitude; tolerância não testada | Convenção | Documentado; sensibilidade à tolerância registrada (R8) |
| P10 | IPCA em vez de INPC como deflator do salário mínimo | Escolha | Documentado; sensibilidade medida (R9) |
| P11 | PIB: média aritmética, 4 × 3 anos, efeito de base | Escolha | Documentado (A5) |
| P12 | Selic: meta ≠ efetiva; média mensal da meta sem respaldo oficial; juro real ausente | Convenção | Documentado (A6) |
| P13 | Ibovespa só nominal | Escolha | Documentado (A6) |
| P14 | Encadeamento de subitens do IPCA na quebra de jan/2020 sem verificação de equivalência | Verificação | Verificado (R10) |
| P15 | O salário mínimo real herdava a falta de set/2020 da série da gasolina | Herança de arquitetura | Série própria (seção 7.5) |
| P16 | Resumos "primeiros 12/24/36 meses" comparavam o mesmo número de observações, não a mesma janela de calendário (na gasolina, a janela de 24 meses do período Bolsonaro terminava em jan/2021 e a do Lula em dez/2024) | Erro de janela | Corrigido para calendário (seção 7.5) |

**Itens corretos sem ressalva:** variação percentual de ponta a ponta (aritmética elementar); distinção entre pontos percentuais e variação percentual de taxas; apresentação dos alimentos como índice e não em reais; leitura do 4º trimestre como taxa anual do PIB (IBGE, OCDE); regra de usar só trimestres inteiros na PNAD; mês-base dinâmico.

## 7. Correções realizadas e verificações

### 7.1 Etanol e série oficial da ANP (R6)

Script reexecutável: `docs/auditoria_anp_ponderacao.py` (precisa do cache bruto por posto e dos arquivos oficiais de vendas).

**A amostra é a mesma.** O número de coletas do projeto, mês a mês, é igual ao "número de postos pesquisados" do arquivo oficial (razão média 1,001; mínimo 0,97, máximo 1,13), os 91 meses coincidem e os produtos são os mesmos. Foram descartadas diferenças de produto, calendário, cobertura geográfica e valores ausentes.

**A diferença vem da agregação, e a ANP a documenta.** Na página oficial, o preço médio é média aritmética simples só no nível municipal; desde 31/10/2004, os níveis estadual, regional e nacional são ponderados pelas vendas informadas pelas distribuidoras. Reprodução da série oficial a partir dos preços por posto (91 meses; diferença do reproduzido contra a oficial):

| Forma de agregar | Etanol: dif. média | \|dif.\| média | máx. | Gasolina: dif. média | \|dif.\| média | máx. |
|---|---|---|---|---|---|---|
| M0 média simples de todas as coletas (o que o projeto usava) | +6,49% | 6,49% | 12,00% | +0,29% | 0,39% | 1,25% |
| M3 cada município com peso igual | +10,06% | 10,06% | 18,92% | +0,98% | 0,98% | 2,58% |
| M4 cada UF com peso igual | +15,25% | 15,25% | 28,71% | +1,96% | 1,96% | 4,00% |
| M1 UFs ponderadas pelas vendas mensais | +0,58% | 0,68% | 2,05% | +0,45% | 0,46% | 1,10% |
| **M5 municípios pelas vendas anuais, depois UFs pelas vendas mensais** | **+0,02%** | **0,47%** | **1,61%** | **−0,02%** | **0,14%** | **0,40%** |

**Por que a média simples fica acima no etanol.** Em 2022 (etanol hidratado), o Nordeste tem 19,9% das coletas e 8,2% das vendas; o Sul, 12,5% e 6,0%; o Norte, 3,8% e 1,3%; o Sudeste, 53,9% e 68,6%; o Centro-Oeste, 10,1% e 15,9%. São Paulo tem 33,3% das coletas e 52,1% das vendas, com preço médio de R$ 4,33 contra R$ 4,85 na média simples nacional. A amostra sobrerrepresenta regiões de etanol mais caro e subrepresenta o estado onde ele é mais barato e mais consumido.

**O que não está determinado.** O resíduo de 0,47% (etanol) e 0,14% (gasolina) entre M5 e a série oficial: a ANP não publica os pesos exatos nem o período de referência das vendas. A conclusão principal é explicada pela metodologia da ANP; o resíduo não é atribuído a nada.

**Decisão: a série oficial substitui a média simples como série principal.** O critério foi adequação ao que o projeto quer mostrar (quanto custava o combustível, em média, para quem o compra): a média ponderada pelo consumo responde a isso; a média simples responde a "o preço médio dos postos pesquisados", que depende do desenho da amostra. Alternativas consideradas e rejeitadas: manter a média simples (mede outra coisa e fica até 12% acima no etanol); mostrar as duas (duplicaria séries sem ganho para o leitor; a média simples fica no CSV e na documentação); reconstruir a ponderada (chega a 0,5% da oficial e exigiria manter dados de vendas). Um mês que a série oficial não tem fica sem preço; nenhum mês é completado com a média simples. A decisão se apoia no critério do método; o efeito foi medido depois (seção 8).

### 7.2 Agregador do Custo de vida (R3b)

Script reexecutável: `docs/auditoria_custo_vida_agregadores.py`.

**Pesquisa.** O *Handbook* da OCDE/JRC exige evitar dupla contagem de indicadores correlacionados e recomenda testar a sensibilidade à normalização, aos pesos e à agregação; **não** recomenda nem desaconselha a mediana. O *Consumer Price Index Manual* trata o agregado elementar sem pesos de despesa e recomenda a média geométrica (Jevons), apontando o viés para cima da média aritmética (Carli); o texto integral não pôde ser aberto, e a classificação vem do resumo e do registro Crossref. Com pesos de despesa disponíveis, a teoria de números-índice e o IBGE usam médias ponderadas. A mediana de variações de preços existe na literatura de inflação-núcleo, mas **ponderada**. Não foi encontrada literatura que use a mediana **não** ponderada de séries heterogêneas como agregador de uma dimensão.

**Alternativas calculadas** (variação real do início ao fim; período completo; B / L; todas com síntese de +5/5 e grade 10.626/0/0):

| Agregador | Bolsonaro | Lula | Dif. L−B | Leitura |
|---|---|---|---|---|
| A. Mediana das 11 (atual) | +34,80% | −10,30% | −45,10 | Lula |
| B. Média aritmética das 11 | +33,35% | −5,30% | −38,65 | Lula |
| C. Média geométrica das 11 (Jevons) | +31,32% | −6,28% | −37,60 | Lula |
| D. Mediana sem o diesel S10 (10) | +30,68% | −11,38% | −42,06 | Lula |
| E. Mediana, diesel e S10 como um item (10) | +30,68% | −10,43% | −41,11 | Lula |
| F. Mediana das medianas das duas categorias | +29,95% | −7,50% | −37,44 | Lula |
| G. Média das médias das duas categorias | +32,49% | −5,44% | −37,93 | Lula |
| H. Igual peso por item do IPCA (10), média | +32,13% | −4,78% | −36,91 | Lula |
| I. Média ponderada pelo peso no IPCA (10 itens; peso médio de jan/2020 em diante) | +9,22% | +2,36% | −6,86 | Lula |

Na janela de igual duração (44 meses), as leituras e a grade são as mesmas em todos; as diferenças L−B vão de −17,5 (ponderada) a −50,6 (média). **Pelo nível real médio** (base 100 = média dos dois períodos), A a H apontam para o período Bolsonaro (diferença de 2,1 a 3,3 pontos; grade 9.625/715/286); a ponderada pelo IPCA aponta para o período Lula (+0,55 / −0,56; diferença de 1,11 ponto; 10.626/0/0), e com os pesos de dez/2022 ou de ago/2026 a diferença cai abaixo da tolerância (10.625/0/1). A gasolina responde por cerca de 54% do peso dos 10 itens, e o nível médio real dela foi 5,7% menor no período Lula.

**Avaliação: defensável, com limitações.** Defensável porque o resumo é robusto e foi declarado antes do cálculo, não é apresentado como índice de preços e a mesma conclusão (variação) sai de todos os resumos testados, inclusive os que a literatura prefere (Jevons, ponderado). Limitações: pesos iguais para itens de pesos muito diferentes; diesel e S10 correlacionados (0,99) e mesmo subitem do IPCA; leitura do nível dependente do resumo. **Não foi substituída:** nenhuma alternativa é uma correção clara (a média ponderada, de melhor suporte teórico, exigiria pesos de despesa que o projeto não tem para as 11 séries e mudaria a pergunta), e trocar depois de ver os resultados seria escolha post hoc.

### 7.3 Trajetória × nível no Custo de vida (R4)

Resultado para as 11 séries, período completo (base 100 = média dos dois períodos para o nível):

| Medida | Bolsonaro | Lula | Leitura |
|---|---|---|---|
| Variação do início ao fim (mediana) | +34,80% | −9,84% (−10,30% com a série oficial) | Lula |
| Nível real médio | 98,81 | 101,29 | Bolsonaro (+2,48) |
| Nível real mediano | 94,74 | 101,88 | Bolsonaro (+7,14) |

Por que diferem (mediana das 11 séries, base 100 = média conjunta): o período Bolsonaro começa em 81,8 (jan/2019, antes da alta de 2020–22) e termina em 106,1 (dez/2022); o Lula começa em 105,8 (jan/2023, já no patamar alto) e termina em 103,8 (ago/2026). A trajetória mede o movimento **a partir de onde cada janela começou**; o nível compara o custo médio enfrentado, que carrega o patamar herdado do período anterior. O café é a única série com grande diferença de nível (+50,6% no Lula); a mediana das 11 não é decidida por ele.

- **Trajetória:** "entre onde este período começou e onde terminou, quanto os preços reais se moveram?" Descreve a mudança vivida em cada janela; depende do ponto de partida, que cada período herda; não diz se os preços estavam altos ou baixos.
- **Nível médio:** "durante este período, quão caros foram esses bens, em dinheiro de hoje?" Não depende do ponto de partida, mas herda o patamar deixado pelo período anterior.
- Nenhuma das duas isola o efeito de um governo.

A pergunta declarada do projeto é "o que mudou entre os dois períodos?", e sua arquitetura (Era → Agora, variação percentual) é desenhada em torno de **mudança**. Por isso a trajetória permanece como leitura principal; o nível aparece como painel de transparência, não como segundo voto. Isso é uma consistência com a pergunta declarada, não uma decisão de que uma medida seja melhor.

### 7.4 Leite (R10) e subitens do IPCA

- **Item:** SIDRA classificação 315, categoria 12393, "1111004.Leite longa vida", nas tabelas 1419 (2012–2019) e 7060 (2020 em diante); nível subitem; unidade variação % mensal; cobertura Brasil.
- **Nome histórico:** a tabela de correspondência de despesas da POF 2008-2009 lista o código 1111004 como "Leite integral pasteurizado"; a da POF 2017-2018, como "Leite longa vida". O Banco Central (Estudo Especial nº 69/2019) lista o código como "Leite longa vida" na estrutura de 2012 a 2019 e na nova. O descritor da tabela de despesas da POF 2008-2009 difere, mas o subitem coletado e publicado pelo IBGE tem o mesmo código e o mesmo nome nas duas estruturas: o rótulo do projeto está correto e a série é a oficial. Sem mudança.
- Os outros cinco (arroz, feijão-carioca rajado, patinho, óleo de soja, café moído) foram conferidos contra as tabelas de correspondência, sem divergência.
- **Limite:** não há documento público de especificação de coleta (marca, embalagem) que permita provar a identidade física do produto entre 2019 e 2020; a série não mostra descontinuidade na virada.

### 7.5 Salário mínimo, janelas de calendário e simulação S4

- **Salário mínimo real.** As primeiras versões da Análise reaproveitavam as linhas da série da gasolina, que já traziam `salario_minimo` e `ipca_indice`; como a gasolina não tem set/2020 (sem pesquisa da ANP), o salário real herdava o buraco. `build_dashboard_data.py` passou a gravar `salario_minimo_serie` (BCB SGS 1619 e IPCA; 92 meses de jan/2019 a ago/2026; mês faltante é erro) e `build_analise.py` lê `origem: "SALARIO_MINIMO"`. Variações e leituras ficaram iguais (−4,02% / +6,15%); `n` passou de 47 para 48 (Bolsonaro, completo) e de 43 para 44 (igual duração). Os litros de gasolina por salário mínimo continuam sem set/2020, porque a gasolina não tem preço nesse mês; nada foi inventado.
- **Janelas de calendário.** Uma simulação da auditoria pegava as 44 primeiras observações disponíveis (terminando em set/2022), e o salário real em "44 meses" aparecia como −2,45%; o pipeline compara o mesmo mês k (jan/2019 a ago/2022) e dá −2,73%, que confere com o cálculo direto. O mesmo problema existia em produção nos resumos "primeiros 12/24/36 meses". **Regra adotada:** a mesma janela de calendário nos dois períodos, nunca o mesmo número de observações; `completo` significa que o período já chegou ao mês *n*. O PIB (linhas anuais) fica de fora. A simulação auditora também foi corrigida.

### 7.6 Verificações realizadas

| Item | Verificação | Resultado |
|---|---|---|
| R1 | IPCA 12 meses recalculado a partir do índice do SIDRA e comparado com o do pipeline; `download_ibge.py` reexecutado com o novo piso | Idêntico; itens da cesta idênticos; só entraram 12 linhas de 2018 |
| R2 | Litros × (salário/preço) e × (salário real/preço real), 91 meses | Diferença máxima 0,008 litro (arredondamento) |
| R3a | `custo_vida_nivel_real` recalculado por fora no teste | Confere |
| R5 | Todas as ocorrências de "real" e "corrigido" no site | "Dólar real" não existe; "câmbio real" só aparece para dizer que não é |
| R6 | Série oficial contra a do projeto; média simples das coletas brutas de mar/2019 | Seção 7.1; a média simples reproduz o valor do projeto (teste automatizado) |
| R7 | Enumeração independente das composições | 10.626 = C(24,4); contagem 10.626/0/0 confere |
| R9 | Salário mínimo real em jan/2019, jan/2020, ..., jan/2026 e no mês-base | Confere; no mês-base o real é igual ao nominal (R$ 1.621) |
| R10 | Códigos e nomes SIDRA nas duas tabelas; tabelas de correspondência oficiais | Seis subitens corretos; leite na seção 7.4 |
| Links | 142 links de notícias | 142 de 142 acessíveis (4 por cópia arquivada); ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md) |

## 8. Resultados antes e depois

Saída de `docs/auditoria_antes_depois.py`: antes = metodologia v1.2.1; depois = v1.4.0. Período completo, salvo indicação. B / L = Bolsonaro / Lula.

| Indicador | Antes (v1.2.1) | Depois (v1.4.0) | Diferença | Motivo |
|---|---|---|---|---|
| IPCA 12 meses, Bolsonaro, média (meses) | 6,95% (36) | 6,14% (48) | −0,80 p.p. | R1 |
| IPCA 12 meses, Lula | 4,61% (44) | 4,61% (44) | 0 | inalterado |
| IPCA, igual duração, B / L (meses) | 7,02% / 4,61% (32) | 6,13% / 4,61% (44) | −0,89 / −0,002 p.p. | R1 |
| Inflação, leitura | Lula (dif. 2,34 p.p.) | Lula (dif. 1,54 p.p.) | — | R1 |
| Custo de vida, B / L | +34,80% / −9,84% | +34,80% / −10,30% | 0 / −0,46 p.p. | Série oficial de combustíveis |
| Custo de vida, leitura | Lula | Lula | — | inalterado |
| Gasolina, B / L | −9,17 / +11,02 | −7,96 / +10,25 | +1,21 / −0,77 p.p. | Série oficial |
| Etanol, B / L | +2,56 / −11,07 | +7,93 / −13,64 | +5,37 / −2,57 p.p. | Série oficial (ponderação) |
| Diesel, B / L | +46,30 / −11,26 | +46,25 / −12,45 | −0,05 / −1,19 p.p. | Série oficial |
| Diesel S10, B / L | +44,80 / −8,28 | +44,78 / −8,65 | −0,02 / −0,37 p.p. | Série oficial |
| GLP, B / L | +23,49 / −9,84 | +24,59 / −10,30 | +1,10 / −0,46 p.p. | Série oficial |
| Salário real, B / L | −4,02% / +6,15% | −4,02% / +6,15% | 0 | inalterado (série própria; 47 → 48 meses) |
| Litros de gasolina por SM, B / L | +5,67 / −4,38 | +4,29 / −3,72 | −1,38 / +0,66 p.p. | Série oficial; sem voto em Renda desde a v1.3.0 |
| Renda, valor da dimensão, B / L | +0,83% / +0,89% (praticamente iguais) | −4,02% / +6,15% (Lula) | −4,85 / +5,26 p.p. | R2 |
| Renda, igual duração, B / L | −3,01% / +0,89% (Lula) | −2,73% / +6,15% (Lula) | +0,28 / +5,26 p.p. | R2 |
| Mercado de trabalho | 3 votos Lula | 3 votos Lula | — | inalterado |
| Atividade (PIB), B / L | 1,43% / 2,97% | 1,43% / 2,97% | 0 | inalterado |
| Dólar, B / L (variação) | +35,19% / −4,26% | +35,19% / −4,26% | 0 | só o rótulo mudou |
| Síntese, soma com pesos iguais | +80 | +100 | +20 | R2 |
| Grade de 10.626 (Lula / Bolsonaro / empate) | 10.625 / 0 / 1 | **10.626 / 0 / 0** | +1 / 0 / −1 | R2 |
| Grade, igual duração | 10.626 / 0 / 0 | 10.626 / 0 / 0 | 0 | inalterada |
| Nível real do Custo de vida (novo) | — | B 98,81 / L 101,29 (mediano 94,74 / 101,88) | novo | R4; grade alternativa 9.625/715/286 |

**Inalterados:** o PIB, o mercado de trabalho, o dólar, a Selic, o Ibovespa (descritivos), os índices de alimentos, o salário real, o IPCA do período Lula, a leitura de Inflação e de Custo de vida, e a grade de igual duração. Nenhuma leitura de dimensão mudou por causa da troca da série de combustíveis.

## 9. Sensibilidade aos pesos e leituras alternativas

**Resultado final.** Das 10.626 combinações de pesos, **10.626 apontam para o período Lula, 0 para o Bolsonaro e 0 empatam** (janela completa e janela de igual duração). A contagem foi refeita por enumeração independente (estrelas e barras). A pergunta é só se mudar os pesos muda o lado da síntese; a resposta, com estas leituras, é não, porque nenhuma das cinco dimensões aponta para o período Bolsonaro. **Isso é dominância, não prova de robustez geral.**

**Terminologia.** O *Handbook* (Passo 8) distingue a técnica (sensibilidade) da propriedade avaliada (robustez) e lista as fontes de incerteza: inclusão e exclusão de indicadores, normalização, pesos, agregação e imputação. O teste do projeto varia só os pesos, por isso o nome correto é **análise de sensibilidade aos pesos**. A grade de 5 pontos é uma versão determinística e discretizada do que o SMAA (Lahdelma et al., 1998; Tervonen & Lahdelma, 2007) faz com pesos distribuídos uniformemente no simplex; a malha inclui as bordas (pesos zero), e o modelo de agregação também é fixo.

**O que a grade mostraria sem dominância.** Cenários de leitura (Custo de vida, Inflação, Renda, Trabalho, Atividade):

| Cenário | Lula | Bolsonaro | Empate |
|---|---|---|---|
| Estado anterior à v1.3.0 (+1, +1, 0, +1, +1) | 10.625 | 0 | 1 |
| Renda só com salário real (+1, +1, +1, +1, +1) — estado atual | 10.626 | 0 | 0 |
| Custo de vida invertido pelo nível médio (−1, +1, 0, +1, +1) | 8.910 | 1.430 | 286 |
| Custo de vida invertido e Renda +1 (−1, +1, +1, +1, +1) | 9.625 | 715 | 286 |

**Variantes testadas e seu efeito na leitura:**

| Variante | Dimensão | Leitura original → variante | Muda a síntese? |
|---|---|---|---|
| Remover o diesel S10 | Custo de vida | Lula → Lula | Não |
| Média ponderada pelo IPCA | Custo de vida | Lula → Lula | Não |
| IPCA 12 meses com 2019 | Inflação | Lula → Lula (6,14 × 4,61) | Não |
| PIB, média geométrica | Atividade | Lula → Lula | Não |
| Renda só com salário real | Renda | empate → Lula | Reforça Lula |
| Salário real com INPC | Renda | mesma direção | Não |
| Trabalho com a métrica alternativa | Trabalho | Lula → empate | Reduz Lula |
| Custo de vida pelo nível médio real | Custo de vida | Lula → Bolsonaro | Sim (grade 8.910/1.430/286) |

Seis variantes não reduzem nenhuma leitura favorável a Lula (uma a reforça). Duas reduzem: Trabalho vira empate na regra alternativa, e Custo de vida inverte se medido pelo nível. Portanto o resultado qualitativo da síntese é estável aos erros corrigíveis (R1, R2, R3) e **depende de uma escolha de métrica** no Custo de vida e na regra do Trabalho. A Análise é defensável como descrição transparente sob regras pré-declaradas; a literatura **não** sustenta apresentá-la como índice composto validado nem tratar a grade como prova de robustez.

## 10. Suporte de cada método, convenções próprias e limitações

### 10.1 Suporte de cada método

| Método | Classe | Suporte e ressalva |
|---|---|---|
| IPCA em 12 meses (índice ÷ índice 12 meses antes) | OFICIAL | IBGE, métodos de cálculo; verificado contra o SIDRA |
| Preço real (a preços do último mês pelo IPCA) | OFICIAL + ACADÊMICO parcial | IBGE (deflator); Yuba et al. (2013) |
| Salário mínimo real, fórmula | OFICIAL (mecânica) + CONVENÇÃO (IPCA × INPC) | IBGE; Ipeadata e DIEESE usam INPC; sensibilidade medida |
| Preço de combustíveis | OFICIAL | Série mensal nacional da ANP (ponderada por vendas) |
| Índices de alimentos (encadeamento da variação mensal por subitem) | OFICIAL | IBGE/SIDRA; subitens conferidos |
| Dólar corrigido pelo IPCA | CONVENÇÃO | A distinção para o câmbio real é OFICIAL (Ipeadata) |
| Selic: média mensal da meta | CONVENÇÃO | A meta é oficial (BCB); a média mensal não é estatística oficial |
| Ibovespa: variação nominal de pontos | OFICIAL (série) + CONVENÇÃO (nominal) | B3 |
| PIB: média aritmética das taxas anuais | OFICIAL (dados) + CONVENÇÃO | A média geométrica dá a mesma leitura |
| Mercado de trabalho: dados | OFICIAL | IBGE, PNAD Contínua |
| Mercado de trabalho: voto por série | CONVENÇÃO / LIMITAÇÃO | Sem literatura direta |
| Custo de vida: mediana da variação real | CONVENÇÃO / LIMITAÇÃO | Defensável com limitações; alternativas calculadas |
| Custo de vida: nível real | CONVENÇÃO | Complementar, fora da síntese |
| Litros de gasolina por salário mínimo | CONVENÇÃO / LIMITAÇÃO | O conceito (salário em unidades de um bem) é ACADÊMICO indireto |
| Não pesar o salário real e os litros ao mesmo tempo | ACADÊMICO | *Handbook* OCDE/JRC (dupla contagem) |
| Tolerâncias de 1,0 e 0,1 ponto | CONVENÇÃO | Limiar de indiferença: conceito indireto |
| Síntese por sentido (+1/0/−1) com pesos | ACADÊMICO parcial + CONVENÇÃO | Agregação não compensatória (conceito); perda da magnitude declarada |
| Grade de 10.626 pesos | ACADÊMICO (estrutura) + CONVENÇÃO (passo de 5 pontos) | Simplex-lattice; análise de sensibilidade |
| Janela de calendário | CONVENÇÃO | Regra declarada e testada |

Nenhuma fórmula ficou sem explicação. Os textos do site não usam "vencedor", "melhor", "pior" nem linguagem de causa (conferido por `scripts/test_analise.py`); a "outra forma de olhar" é apresentada nos dois sentidos, inclusive o resumo que muda a leitura; a regra do voto e as tolerâncias não foram alteradas.

### 10.2 O que é convenção própria do projeto

Quatro construções não têm literatura que as sustente diretamente. Foi encontrado apenas um conceito próximo, indireto, e por isso elas continuam sendo **convenção do projeto**, declaradas como tal no site e em [METHODOLOGY.md](METHODOLOGY.md):

| Método | Conceito próximo encontrado | Classe | Situação |
|---|---|---|---|
| Litros de gasolina por salário mínimo | Salário em unidades de um bem (Ashenfelter & Jurajda, 2024); parcela do salário mínimo na cesta (Alcântara et al., 2024) | I | Convenção; descritiva, sem voto |
| Mediana não ponderada de séries heterogêneas | Mediana ponderada de variações de preços (Bryan & Cecchetti; Smith; Ball et al.); Jevons (*CPI Manual*) | I | Convenção |
| Voto ±1/0 com tolerância | Agregação não compensatória (Munda & Nardo, 2009); limiar de indiferença (Roy, 1991); contagem de votos (Hedges & Olkin, 1980, só como cautela) | I | Convenção |
| Grade discreta de pesos de 5 em 5 pontos | Simplex-lattice (Scheffé, 1958); SMAA (Lahdelma et al., 1998); sensibilidade de compostos (Saisana et al., 2005) | I / S (prática) | Convenção, com a estrutura combinatória fundamentada |

### 10.3 Limitações que permanecem

1. Mediana não ponderada, voto ±1/0 com tolerância, litros por salário mínimo e grade de 5 em 5 pontos são convenções do projeto (seção 10.2).
2. A leitura do **nível** real do Custo de vida depende do resumo das séries: sem peso, período Bolsonaro; ponderada pelo IPCA, período Lula, na margem da tolerância.
3. Resíduo de 0,14% a 0,47% entre a reprodução da ponderação da ANP e a série oficial, sem explicação na documentação pública.
4. A continuidade física do "leite longa vida" entre 2019 e 2020 não é demonstrável por documento público (a série oficial é contínua).
5. O texto integral do *Consumer Price Index Manual* e dos artigos de Dobbie & Dail e de Hedges & Olkin não foi lido; a classificação deles é "indireta".
6. Rogoff (1996) e o DOI impresso de Ertel (2022) não foram verificados.
7. A síntese usa só o sentido, e só cinco dimensões (sem contas públicas, desigualdade ou informalidade); o período Lula está em curso; o salário mínimo é o piso nacional; alimentos são índices; "carne" é só o patinho; IPCA, não INPC.
8. A série oficial de combustíveis chega com a defasagem de publicação da ANP e não tem quebra regional mensal; as linhas regionais do projeto são médias simples das coletas.
9. Cada leitura é descritiva e não estabelece causa.

Os problemas de dados e de apresentação ainda abertos estão em [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## 11. Reprodução e testes

| Script ou comando | O que refaz |
|---|---|
| `python scripts/test_analise.py` | Todas as validações da Análise (metodologia, janelas, cálculos recalculados por fora, dados, textos) |
| `python docs/auditoria_simulacoes.py` | Simulações de sensibilidade: IPCA, PIB, Custo de vida (trajetória × nível), Renda, grade de pesos |
| `python docs/auditoria_antes_depois.py` | Comparação com o commit anterior (`ANTES_REV`, padrão `HEAD`) |
| `python docs/auditoria_custo_vida_agregadores.py` | Os nove agregadores da seção 7.2 |
| `python docs/auditoria_anp_ponderacao.py` | Reprodução da série oficial da ANP (seção 7.1); precisa do cache bruto da ANP |
| `python docs/auditoria_links.py` | Status HTTP, título e data dos 142 links de notícias |

Os scripts de auditoria são somente leitura. Algumas simulações auxiliares (juro real, Ibovespa real, câmbio real com o CPI dos EUA pelo FRED, salário mínimo com INPC pela tabela 1736 do SIDRA) foram rodadas pontualmente e não estão nos scripts; os números aparecem na seção 5 (A6) e na matriz (R5, R9).

Resultado dos testes na v1.4.0: `test_analise.py` passa em todas as validações (blocos v1.0 a v1.4.0: R1, R2, R3a, R3b, R5 a R10, série oficial da ANP, salário mínimo próprio, janela de calendário, integridade: sem NaN ou infinito, sem mês duplicado, ordem cronológica). Detalhes e verificações de front-end em [TESTING_AND_QA.md](TESTING_AND_QA.md).

## 12. Referências avaliadas

Cada linha traz autores (ano), veículo, o que a referência sustenta e a classe (seção 3). As citações que sustentam a metodologia estão também em [referencias.md](referencias.md). Algumas referências avaliadas aqui já não são citadas em METHODOLOGY.md; permanecem neste registro porque foram lidas ou conferidas e informam o que o método **não** tem de apoio.

### 12.1 Literatura

| # | Referência | Sustenta | Cl. |
|---|---|---|---|
| 1 | Nardo, Saisana, Saltelli, Tarantola, Hoffmann, Giovannini (2008). *Handbook on Constructing Composite Indicators*. OECD/JRC. DOI 10.1787/9789264043466-en | Dupla contagem (p. 32); pesos; vocabulário de sensibilidade. **Não** sustenta mediana como agregador | S (R2, R7); N (mediana) |
| 2 | Saisana, Saltelli, Tarantola (2005). *JRSS A* 168(2):307–323. DOI 10.1111/j.1467-985x.2005.00350.x | Prática de testar a sensibilidade de compostos | S |
| 3 | Becker, Saisana, Paruolo, Vandecasteele (2017). *Ecological Indicators* 80:12–22. DOI 10.1016/j.ecolind.2017.03.056 | Pesos nominais ≠ importância efetiva | I |
| 4 | Paruolo, Saisana, Saltelli (2013). *JRSS A* 176(3):609–634. DOI 10.1111/j.1467-985x.2012.01059.x | Idem | I |
| 5 | Greco, Ishizaka, Tasiou, Torrisi (2019). *Social Indicators Research* 141(1):61–94. DOI 10.1007/s11205-017-1832-9 | Robustez e sensibilidade como etapas do composto (revisão) | I |
| 6 | Dobbie, Dail (2013). *Ecological Indicators* 29:270–277. DOI 10.1016/j.ecolind.2012.12.025 | Robustez e sensibilidade de ponderação e agregação (resumo conferido; texto não lido) | I |
| 7 | Munda, Nardo (2009). *Applied Economics* 41(12):1513–1523. DOI 10.1080/00036840601019364 | Agregação não compensatória (conceito) | S parcial |
| 8 | Saltelli, Annoni (2010). *Environ. Modelling & Software* 25:1508–1517. DOI 10.1016/j.envsoft.2010.04.012 | Crítica à sensibilidade de um fator por vez | I |
| 9 | Lahdelma, Hokkanen, Salminen (1998). *EJOR* 106:137–143. DOI 10.1016/s0377-2217(97)00163-x · Lahdelma, Salminen (2001). *Operations Research* 49(3):444–454. DOI 10.1287/opre.49.3.444.11220 · Tervonen, Lahdelma (2007). *EJOR* 178(2):500–513. DOI 10.1016/j.ejor.2005.12.037 | SMAA: explorar o espaço de pesos e reportar aceitabilidade (comparação conceitual com a grade; SMAA **não adotado**) | S (conceito) |
| 10 | Scheffé (1958). *JRSS B* 20(2):344–360. DOI 10.1111/j.2517-6161.1958.tb00299.x | Malha simplex-lattice (10.626 = C(24,4) pontos) | I (estrutura combinatória) |
| 11 | Mareschal (1988). *EJOR* 33:54–64. DOI 10.1016/0377-2217(88)90254-8 · Triantaphyllou, Sánchez (1997). *Decision Sciences* 28:151–194. DOI 10.1111/j.1540-5915.1997.tb01306.x | Sensibilidade a pesos em decisão multicritério | I |
| 12 | Roy (1991). *Theory and Decision* 31:49–73. DOI 10.1007/bf00134132 · Brans, Vincke (1985). *Management Science* 31(6):647–656. DOI 10.1287/mnsc.31.6.647 | Conceito de limiar de indiferença (não fixam valores) | I |
| 13 | Hedges, Olkin (1980). *Psychological Bulletin* 88(2):359–369. DOI 10.1037/0033-2909.88.2.359 | Contagem de votos em sínteses de pesquisa; só cautela (texto não lido) | I |
| 14 | Bryan, Cecchetti (1993). NBER WP 4303. DOI 10.3386/w4303 · Smith (2004). *JMCB* 36(2):253–263. DOI 10.1353/mcb.2004.0014 · Ball, Carvalho, Evans (2023). NBER WP 31032. DOI 10.3386/w31032 | Mediana de variações de preços, **ponderada** | I |
| 15 | *Consumer Price Index Manual* (OIT, FMI, OCDE, Eurostat, ONU, Banco Mundial), 2004, cap. 20 (DOI 10.5089/9789221136996.069.ch020) e edição revisada, cap. 6 (DOI 10.5089/9781513559605.069.ch06) | Agregados elementares (Jevons × Carli). Texto integral **não aberto**; apoiada em resumo e Crossref | I |
| 16 | Mazziotta, Pareto (2013). *Rivista Italiana di Economia Demografia e Statistica* 67(2):67–80 (sem DOI) | Normalização e redundância | I |
| 17 | Luzzati, Gucciardi (2015). *Ecological Economics* 113:25–38. DOI 10.1016/j.ecolecon.2015.02.018 · Permanyer (2011). *Rev. Income and Wealth* 57(2):306–326. DOI 10.1111/j.1475-4991.2011.00442.x · Lindén et al. (2021). *Environ. Modelling & Software* 145:105208. DOI 10.1016/j.envsoft.2021.105208 · Ding et al. (2017). *SIR* 139:871–885. DOI 10.1007/s11205-017-1765-3 · Freudenberg (2003). OECD STI WP 2003/16. DOI 10.1787/405566708255 | Contexto sobre pesos, robustez e dupla contagem | I |
| 18 | Yuba, Sarti, Campino, Carmo (2013). *Rev. Saúde Pública* 47(3):549–559. DOI 10.1590/s0034-8910.2013047004073 | Preço real de alimento por índice geral; encadeamento | S parcial |
| 19 | Ertel (2022). *Perspectiva Econômica* 18(1):10–24 (o DOI impresso 10.4013/pe.2022.181.02 não resolve no Crossref; texto aberto na revista) | Salário mínimo deflacionado pelo IPCA do SIDRA 1737 | S parcial; DOI **V** |
| 20 | Alcântara, Daier, Silva (2024). *Boletim Mercado de Trabalho* (IPEA) 77. DOI 10.38116/bmt77/pf2 · Ashenfelter, Jurajda (2024). *Review of Economics and Statistics*. DOI 10.1162/rest_a_01514 | Razão salário/preço de um bem como indicador isolado (cesta, não gasolina); salário em unidades de uma mercadoria | I (R2) |
| 21 | Mattioli, Wadud, Lucas (2018). *Transportation Research A* 113:227–242. DOI 10.1016/j.tra.2018.04.002 · Da Silva, Vasconcelos, Vasconcelos, De Mattos (2014). *Energy Economics* 43:11–21. DOI 10.1016/j.eneco.2014.02.002 | Vulnerabilidade a preço de combustível; uso do LPC como fonte (contexto) | I |
| 22 | Araújo, E.; Brito, R.; Sanvicente, A. (2021). *Int. J. Finance & Economics* 26(4):6249–6263. DOI 10.1002/ijfe.2118 | Ibovespa como retorno total e deflação | S parcial |
| 23 | Perrelli, Roache (2014). IMF WP/14/84. DOI 10.5089/9781484385210.001 | Juro real e neutro (contexto) | I |
| 24 | Flamini, Toscani (2021). IMF WP/21/66. DOI 10.5089/9781513571645.001 · Bacciotti, Marçal (2020). *Estudos Econômicos* 50(3):513–534. DOI 10.1590/0101-41615035rbe · Reis (2020). *Estudos Econômicos* 50(4):705–732. DOI 10.1590/0101-41615045mcr | Mercado de trabalho brasileiro (contexto) | I |
| 25 | OECD (2024). *Compendium of Productivity Indicators*. DOI 10.1787/b96cd88a-en | **Não** sustenta média aritmética × geométrica do PIB | N (nesse ponto) |
| 26 | Taioka, Bittes Terra (2024), DOI 10.1080/01603477.2024.2366798 · Mazali, Divino (2010), DOI 10.1590/S0034-71402010000300005 · Araújo, Caldarelli, Cortapasso (2023), DOI 10.1590/0103-6351/7570 · Salomão Neto, Alves (2025), DOI 10.1590/0101-31572025-3679 | Contexto de salário real e câmbio/inflação | N (não sustentam o método) |
| 27 | Rogoff (1996). *J. Economic Literature* 34(2) | Distinção câmbio nominal/real | V (DOI não localizado; retirada da metodologia) |
| 28 | Working (1960), DOI 10.2307/1907574 · Rossana, Seater (1995), DOI 10.1080/07350015.1995.10524618 · Hansen, Hodrick (1980), DOI 10.1086/260910 · Newey, West (1987), DOI 10.2307/1913610 | Agregação temporal e sobreposição (contexto) | I |

### 12.2 Fontes oficiais

| Fonte | O que sustenta | Cl. |
|---|---|---|
| IBGE (2020, 8ª ed.). *Sistema Nacional de Índices de Preços ao Consumidor: métodos de cálculo*. https://biblioteca.ibge.gov.br/visualizacao/livros/liv101767.pdf | Números-índice, encadeamento, deflator, variação acumulada em 12 meses | S |
| IBGE/SIDRA, tabelas 1737 (IPCA, número-índice), 1419 e 7060 (variação por subitem), com metadados pela API `servicodados.ibge.gov.br/api/v3/agregados/{tabela}/metadados` | Códigos e nomes dos subitens | S (R10) |
| IBGE, tabelas de correspondência despesas da POF × subitens do SNIPC (POF 2017-2018 e 2008-2009) | O que cada subitem agrega | S (R10) |
| ANP, *Informações sobre o levantamento de preços de combustíveis* e *Metodologia resumida do LPC* (2020) | Coleta, 459 localidades, média municipal simples, média nacional ponderada desde 31/10/2004, lacuna de 2020 | S (fonte e coleta); N para a média simples nacional como método da ANP |
| ANP, `mensal-brasil-desde-jan2013.xlsx` e dados abertos de vendas (por UF e município) | Série oficial mensal; reprodução da ponderação | S (dado) |
| BCB, metadados SGS "Taxas Selic" | Meta (432) × efetiva (11/4189) | S; N para a média mensal da meta |
| BCB, SGS 1 (PTAX) e 1619 (salário mínimo) | Fonte dos dados | S |
| BCB, Estudo Especial nº 69/2019 | Nome do subitem 1111004 nas duas estruturas do IPCA | S |
| BCB, Estudo Especial nº 109/2021 | PNAD Contínua na pandemia | S (com ressalva) |
| B3, *Metodologia do Índice Bovespa* | Retorno total, critérios | S |
| IPEA/Ipeadata, nota da taxa de câmbio efetiva real e série de salário mínimo real | Definição de câmbio real; deflator INPC e base dinâmica | S (R5); I (R9) |
| DIEESE, metodologia da Pesquisa Nacional da Cesta Básica | Razão salário/preço e média simples de cotações | I |
| IBGE, Contas Nacionais Trimestrais e PNAD Contínua (subutilização; reponderação) | Medidas de PIB e trabalho | S |

### 12.3 Pesquisas sem resultado

Não foi encontrado: artigo revisado por pares que defina "litros de gasolina por salário mínimo"; artigo que use a mediana não ponderada de séries heterogêneas como agregador; artigo que sustente o voto ±1/0 por dimensão com tolerância somado com pesos e grade exaustiva. Por isso as construções correspondentes são convenção do projeto (seção 10.2).

## 13. Errata

Correções ao que foi afirmado em estágios anteriores da própria auditoria; os textos acima já refletem os valores corretos.

| # | Correção |
|---|---|
| E1 | A expressão "dólar real" nunca foi usada no site; o rótulo "Corrigido pela inflação" descrevia corretamente o cálculo. O problema era só de documentação (R5), não de cálculo |
| E2 | Setembro de 2020 não é um mês inteiro sem pesquisa da ANP: a lacuna vai de 18/08 a 17/10 (A7) |
| E3 | R10 foi inicialmente só parcial: códigos e nomes foram comparados; definições de item, só depois e por tabelas de correspondência |
| E4 | A leitura por nível foi inicialmente citada como razão por série (+2,51%); as cifras corretas são as de nível agrupado (seção 7.3); a direção é a mesma |
| E5 | A7 está resolvida: não há erro no site; há duas notas da ANP que diferem em cinco dias |
| E6 | O DOI 10.5089/9781513571645.001 (IMF WP/21/66) tem no Crossref só dois autores, Flamini e Toscani |
| E7 | Araújo, Brito & Sanvicente (2021): a inicial do primeiro autor é "E." |
| E8 | Saisana, Saltelli & Tarantola (2005): volume 168, p. 307–323; Paruolo et al.: publicado online em 2012 |
| E9 | O "câmbio real" da bibliografia refere-se ao índice de câmbio efetivo real do Ipeadata, que não é o dólar do projeto |
| E10 | O "mesmo tempo" do IPCA no código era de 32 meses (13 a 44); depois de R1 é de 44 |
| E11 | A simulação S4 pegava as 44 primeiras observações (terminava em set/2022; −2,45%); o pipeline compara a mesma posição de calendário (−2,73%) e é o valor correto. O mesmo problema existia nos resumos de 12/24/36 meses, e foi corrigido (seção 7.5) |
| E12 | O salário real herdava a falta de set/2020 da série da gasolina; impacto nulo nas leituras; corrigido com série própria (seção 7.5) |
| E13 | O artigo "Robustness and sensitivity of weighting and aggregation in constructing composite indices" existe; o autor é Dobbie & Dail (2013), não Greco et al. |
