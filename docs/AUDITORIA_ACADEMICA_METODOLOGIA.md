# Auditoria acadêmica da metodologia

Data: 01/10/2026 · Metodologia auditada: Análise v1.2.1 (`data/processed/analysis_methodology.json`) · Dados: gerados até ago/2026 (diário até 22/09/2026)
Status: **DIAGNÓSTICO (etapa 1) + IMPLEMENTAÇÃO (etapa 2) + FECHAMENTO DAS PENDÊNCIAS E AUDITORIA FINAL (etapa 3, metodologia v1.4.0; ver as seções "Etapa 2" e "Etapa 3" no fim).** As seções 1 a 11 descrevem o projeto como estava na metodologia v1.2.1, antes das correções; a etapa 2 registra o que foi corrigido (metodologia v1.3.0), o que foi verificado de novo, os números antes/depois e as pendências. `docs/auditoria_simulacoes.py` e `docs/auditoria_antes_depois.py` são scripts de apoio, somente leitura.

> **Como ler os selos.** Cada referência tem um selo de verificação:
> **[CR]** = DOI conferido por mim na API do Crossref (autores, ano e título batem) · **[TEXTO]** = o texto/PDF foi lido por um dos pesquisadores desta auditoria · **[RESUMO]** = só o resumo ou a página de divulgação foi lido · **[NÃO VERIFICADO]** = não foi possível confirmar. Quando só o resumo foi lido, **não** afirmo o que o método interno do artigo faz.
> **Limite desta auditoria:** a pesquisa foi feita em quatro frentes paralelas e eu confirmei independentemente apenas os DOIs (Crossref) e os números das simulações. As descrições de "procedimento relevante" vêm da leitura dos pesquisadores e do que cada selo indica. Itens com DOI impresso no PDF mas não resolvido no Crossref estão sinalizados.

---

## 1. Objetivo

Responder, indicador por indicador: (i) como o código calcula; (ii) que fonte oficial e que literatura sustentam (ou não) esse cálculo; (iii) onde a metodologia atual diverge do que a literatura recomenda; (iv) o que mudaria nos números do projeto se a divergência fosse corrigida.

Princípio editorial (mantido): a literatura serve para responder "este método de cálculo é defensável?", nunca para dizer qual governo foi melhor.

### Resumo executivo (leia isto primeiro)

1. **A síntese com pesos iguais não é invertida por nenhuma das 8 variantes testadas (§7).** Seis delas não reduzem nenhuma leitura favorável a Lula (uma reforça: Renda passa de empate para Lula). Duas reduzem: Trabalho vira empate na regra de métrica alternativa, e Custo de vida inverte se medido por nível médio real (ponto 2).
2. **Mas há uma exceção importante:** se Custo de vida for medido pelo **nível médio real** da janela em vez da variação início→fim, a leitura **inverte** (nível médio real mediano 2,5% maior no período Lula). Isso não prova que a métrica atual esteja errada — respondem perguntas diferentes —, mas significa que a conclusão de Custo de vida **depende de uma escolha de métrica que não é testada nem discutida** (§8, P4). Nesse cenário a grade de pesos deixa de ser unânime: 8.910 / 1.430 / 286 (Lula / Bolsonaro / empate) em 10.626.
3. **O teste das 10.626 combinações é tecnicamente uma "análise de sensibilidade aos pesos"** (e a conclusão pode ser descrita como "estável/robusta aos pesos"). Não deve ser chamado, sem qualificação, de "análise de robustez" do método. Ele só varia pesos, e o resultado (10.625 de 10.626) decorre de **dominância**: nenhuma dimensão aponta para o outro lado. Ver §6–7.
4. **Quatro pontos precisam de correção ou decisão editorial:** (a) o IPCA em 12 meses do período Bolsonaro **exclui 2019** (36 meses contra 44); (b) a série "litros de gasolina por salário mínimo" **conta a gasolina duas vezes** e cancela o salário real dentro de Renda; (c) o "dólar real" é só deflacionado pelo IPCA doméstico e **não é taxa de câmbio real**; (d) o "preço médio nacional ANP" é **média simples própria**, não a série oficial (ponderada por volume desde 2004).
5. **Para várias partes não existe literatura que sustente exatamente a implementação** (voto ±1/0 por dimensão com tolerância e grade de pesos; mediana não ponderada de séries heterogêneas; média da meta Selic; litros por salário). Isso está dito explicitamente em cada seção, sem forçar equivalência.

---

## 2. Metodologia atual

### 2.1 Tabela inicial: indicadores, fontes, fórmulas

Fórmulas conferidas diretamente em `scripts/build_dataset.py`, `build_dashboard_data.py`, `download_ibge.py`, `build_analise.py`.

| Indicador | Fonte | Fórmula atual | Unidade | Transformação | Uso na análise |
|---|---|---|---|---|---|
| Preço real (combustíveis) | ANP (LPC, por posto) + IBGE IPCA (SIDRA 1737, v. 2266) | `preço_nominal × IPCA_idx(último mês) ÷ IPCA_idx(t)`; preço nominal = média simples das coletas do mês | R$/L (GLP: R$/13 kg), em R$ de ago/2026 | Deflação pelo IPCA geral; variação % início→fim da janela | Custo de vida (5 séries, Tipo A, menor = melhor) |
| Índice de alimentos (6 itens) | IBGE/SIDRA IPCA por subitem (tab. 1419 até 2019; 7060 desde 2020, v. 63) | `I(t) = I(t−1) × (1 + var_mensal/100)`, base 100 = jan/2019; real: `I(t) × IPCA_idx(ref)/IPCA_idx(t)` | índice (não R$) | Encadeamento + deflação; variação % início→fim | Custo de vida (6 séries) |
| IPCA 12 meses | IBGE (tab. 1737) | `IPCA_idx(t)/IPCA_idx(t−12) × 100 − 100` | % | **Média** dos valores mensais da janela | Inflação (1 série, menor = melhor) |
| Salário mínimo real | BCB SGS 1619 + IPCA | `SM_nominal(t) × IPCA_idx(ref)/IPCA_idx(t)`; ref = último IPCA disponível (dinâmico) | R$ de ago/2026 | Variação % início→fim | Renda (Tipo A, maior = melhor) |
| Litros de gasolina por SM | ANP + BCB | `SM_nominal(t) ÷ preço_nominal_gasolina(t)` (≡ `SM_real ÷ preço_real`) | L/salário | Variação % início→fim | Renda (Tipo A, maior = melhor) |
| Salário mínimo nominal | BCB SGS 1619 | valor do mês | R$ | variação % | Tipo C (informativo) |
| Taxa de desocupação | IBGE PNAD Contínua (6381/4099), trimestre móvel | média simples dos trimestres móveis inteiros da janela | % | Média da janela | Trabalho (voto próprio) |
| Subutilização | PNAD (6441/4118) | idem | % da FT ampliada | Média da janela | Trabalho (voto próprio) |
| Rendimento real habitual | PNAD (6390/5933), já deflacionado pelo IBGE | `(fim ÷ início − 1) × 100` | R$ reais do IBGE | Variação início→fim | Trabalho (voto próprio) |
| PIB | IBGE CNT (5932), acumulado no ano do 4º trimestre | **média aritmética** das taxas anuais fechadas (B: 2019–22, 4 anos; L: 2023–25, 3 anos); acumulado = ∏(1+taxa) calculado, mas não usado na leitura | % a.a. | Média | Atividade (Tipo A, maior = melhor) |
| Dólar | BCB SGS 1 (PTAX venda) | mensal: média dos dias; comparação: ponta diária; "preço real" = `PTAX × IPCA_ref/IPCA_t` | R$/US$ | variação % | Mercados (Tipo B, só descrição) |
| Selic | BCB SGS 432 (**meta**, não efetiva) | mensal: média dos dias; comparação: diferença em p.p. entre pontas diárias | % a.a. | p.p. | Tipo B |
| Ibovespa | B3 (fechamento) | mensal: último pregão; comparação: variação % entre pontas diárias; **nominal** | pontos | variação % | Tipo B |

### 2.2 Cadeia de agregação (do código)

`série → métrica da janela → f = métrica × (±1) → mediana de f na dimensão (exceto Trabalho: voto por série) → tolerância (1,0 ponto em var. %; 0,1 em médias) → sentido {−1, 0, +1} por dimensão → soma ponderada dos sentidos (pesos iguais por padrão) → grade de 10.626 combinações de pesos`.

Resultado atual (período completo): Custo de vida **Lula**, Inflação **Lula**, Renda **empate** (mediana de f: 0,83 vs 0,89), Trabalho **Lula** (3 votos a 0), Atividade **Lula**. Grade: 10.625 Lula / 0 Bolsonaro / 1 empate.

### 2.3 Hierarquia de evidência usada neste relatório

`DADO OFICIAL → METODOLOGIA OFICIAL → LITERATURA ACADÊMICA → MÉTODO IMPLEMENTADO → TESTES/ROBUSTEZ`. Quando a fonte mais apropriada é documentação oficial, digo isso; quando uma operação é aritmética elementar (ex.: variação percentual ponta a ponta), digo que não precisa de artigo.

---

## 3. Fundamentação por indicador

Veredito de cada seção usa as cinco classes pedidas: CORRETO · CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO · METODOLOGICAMENTE QUESTIONÁVEL · PRECISA DE CORREÇÃO · NÃO HÁ LITERATURA SUFICIENTE PARA CONCLUIR.

### 3.A Salário mínimo real

- **Fonte:** BCB SGS 1619 (nominal); IBGE IPCA, tabela 1737.
- **Fórmula atual:** `SM_real(t) = SM_nominal(t) × IPCA_idx(ref) ÷ IPCA_idx(t)`, `ref` = último mês com IPCA (hoje ago/2026), determinado dinamicamente (`build_analise.py`: `_IPCA_REF`; `build_dataset.py`: `ipca_base`).
- **Unidade:** R$ de ago/2026. **Método:** deflação por número-índice com mês-base móvel.
- **Referências acadêmicas / técnicas** (todas com o selo e o que sustentam):
  - **IBGE (2020), *Sistema Nacional de Índices de Preços ao Consumidor: métodos de cálculo*, Série Relatórios Metodológicos v. 14, 8ª ed.** [TEXTO]. Define deflator como o coeficiente que converte valor nominal em poder aquisitivo constante; números-índice têm base fixa dez/1993=100. **Sustenta a mecânica** (multiplicar pelo índice do mês-base e dividir pelo do mês). URL: https://biblioteca.ibge.gov.br/visualizacao/livros/liv101767.pdf
  - **IPEA, Ipeadata, série "Salário mínimo real" (GAC12_SALMINRE12)** [RESUMO da página]. Usa "reais constantes do último mês", com mês-base **dinâmico**, deflator **INPC** (desde abr/1979). **Sustenta a estrutura (mês-base móvel); usa INPC, não IPCA.**
  - **DIEESE, Nota Técnica 283 (jan/2025)** [RESUMO]. Calcula aumento real do salário mínimo sobre inflação do **INPC**. Prática oficial do movimento sindical.
  - **Ertel (2022), "Análise do poder de compra do salário-mínimo a partir da alteração do processo de correção do salário estabelecido em 2007", *Perspectiva Econômica* 18(1):10–24** [TEXTO]. Converte o salário mínimo para valores de jan/2021 usando o número-índice do **IPCA, SIDRA 1737** — a mesma tabela do projeto. Mês-base fixo. Alcance modesto. **DOI impresso no PDF (10.4013/pe.2022.181.02) não resolve no Crossref → [NÃO VERIFICADO] como DOI.**
  - **Corseuil & Foguel**, *Uma sugestão de deflatores para rendas obtidas a partir de algumas pesquisas domiciliares do IBGE*, IPEA, Nota Técnica [RESUMO; ano e DOI NÃO VERIFICADOS]. Propõe o INPC e atenção à data-base.
- **Referências pré-identificadas, verificadas:**
  - **Taioka & Terra (2024/2025)**, *J. Post Keynesian Economics* 48(1):103–123, DOI 10.1080/01603477.2024.2366798 [CR] [RESUMO]. É um VAR sobre se reajustes reais do salário mínimo repassaram para a inflação. **Não trata de como calcular salário real. Só contexto; não sustenta a fórmula.**
  - **"Salário real e conflito distributivo na economia brasileira de 2010 a 2019"**, Rev. de Economia Contemporânea 28 (2024), autor identificado: Leandro Gomes; DOI impresso 10.1590/19805527242801 (**não resolve no Crossref**) [TEXTO]. Trabalha com salário nominal ÷ preço da cesta e preços relativos setoriais das Contas Nacionais; não declara deflator reproduzível por IPCA. **Só contexto conceitual (preço relativo = preço do item / preço da cesta).**
  - **Mazali & Divino (2010)**, *Rev. Brasileira de Economia* 64(3), DOI 10.1590/S0034-71402010000300005 [CR; o Crossref lista o periódico com nome divergente — provável erro de metadado; RePEc indica a RBE] [RESUMO]. Curva de Phillips com rigidez salarial (GMM). **Não sustenta** nada do cálculo.
- **O que as referências realmente sustentam:** a **mecânica** (deflator por número-índice, mês-base escolhido, mês-base móvel como no Ipeadata) está sustentada por **documentação oficial**, não por artigo. Os três artigos pré-identificados **não** sustentam a fórmula.
- **Compatibilidade:** alta na mecânica; **diverge no índice** (as fontes oficiais de salário mínimo — IPEA, DIEESE, a própria regra legal de reajuste — usam o **INPC**; o projeto usa IPCA geral).
- **Problemas encontrados:**
  1. IPCA vs INPC não está justificado na metodologia (o INPC, famílias de 1–5 s.m., foi criado "para medir variações no poder de compra da população assalariada"; o IPCA cobre até 40 s.m.). **Simulação (SIDRA 1736):** SM real com INPC → Bolsonaro **−5,20%** / Lula **+7,39%** (com IPCA: −4,02% / +6,15%). Mesma direção, magnitude ~1 p.p. maior.
  2. A correção da v1.2.1 está **correta** e a fórmula é a do Ipeadata/Ertel; a construção nova `SM × IPCA_ref/IPCA_t` é a padrão.
  3. Mês-base dinâmico: válido (o Ipeadata faz igual), mas os valores em R$ mudam a cada atualização — o relatório recomenda que todo gráfico/valor publicado indique o mês-base (já feito em parte: "em reais de ago/2026").
  4. `salario_minimo_mensal.csv` já contém meses futuros (set/2026 = R$ 1.621); o código só usa meses com IPCA, então não há erro hoje, mas é um ponto de atenção.
- **Classificação:** **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (justificar IPCA e mostrar sensibilidade com INPC).
- **Recomendação:** manter a fórmula; documentar "mês-base = último IPCA disponível" e "IPCA, não INPC (oficiais usam INPC; diferença testada: ~1 p.p.)"; citar IBGE (2020) + Ipeadata. **Não citar** Taioka & Terra, Gomes ou Mazali & Divino como fundamento do método.

### 3.B Índices de preços / alimentos (arroz, feijão, carne, leite, óleo, café)

- **Fonte:** IBGE/SIDRA, variação mensal por subitem do IPCA (tab. 1419 até dez/2019, tab. 7060 desde jan/2020, var. 63, classificação 315).
- **Fórmula atual:** `I(t) = I(t−1) × (1 + v(t)/100)`, base 100 em jan/2019 (a variação de jan/2019 é descartada: `variacoes["variacao_pct"].iloc[1:]`); índice real = `I(t) × IPCA_idx(ref)/IPCA_idx(t)`. Não é preço em R$.
- **Referências:**
  - **IBGE (2020), Relatórios Metodológicos v. 14** [TEXTO]. O IPCA é um índice de agregação do tipo **Lowe** (aritmética) com **Jevons** nos subitens elementares — chamá-lo de "Laspeyres encadeado" é aproximação. Quando a estrutura de pesos muda, a série **não é revisada**: histórico por **encadeamento** com mês comum ("elo"). POF 2017-18 vigora desde jan/2020. **Sustenta que encadear variações mensais é a prática oficial.**
  - **ILO/IMF/OECD/Eurostat/UN/World Bank, *Consumer Price Index Manual*** (2004; 2020, cap. 9 — atualização de pesos e encadeamento) [RESUMO; PDF não lido]. Sustenta conceitualmente o encadeamento com mês de sobreposição.
  - **Yuba, Sarti, Campino & Carmo (2013)**, "Evolução dos preços relativos de grupos alimentares entre 1939 e 2010, em São Paulo, SP", *Rev. Saúde Pública* 47(3):549–559, DOI 10.1590/s0034-8910.2013047004073 [CR] [TEXTO]. Preços de grupos alimentares **deflacionados por índice geral de preços ao consumidor** (IPC-FIPE até 1988, INPC-IBGE depois), em valores de maio/2010; Laspeyres modificado por grupo; índices mensais agregados e acumulados por encadeamento. **Única referência acadêmica achada que faz exatamente "preço de alimento relativo ao índice geral".** Diferenças: usa INPC, mês-base fixo, agrega por grupo (não por subitem).
  - **"Preços de alimentos e segurança alimentar: evidências para os domicílios brasileiros"** — título **NÃO ENCONTRADO**. O mais próximo (Rodrigues & Costa, 2017-18, trabalho de evento BRSA, sem DOI) estima um probit ordenado e **não** trata de deflação. **Não sustenta.**
- **O que as referências sustentam:** (i) encadear variações mensais oficiais = prática do IBGE; (ii) deflacionar item pelo índice geral para obter preço relativo = prática usada em Yuba et al. e conceito padrão de "preço relativo". **Nenhum estudo valida especificamente o IPCA geral como deflator de um subitem do próprio IPCA.**
- **Problemas encontrados:**
  1. **Quebra de tabela/pesos em jan/2020** (POF 2008-09 → 2017-18): o encadeamento por variações mensais é consistente com a prática do IBGE, mas **nenhuma documentação oficial lista subitens renomeados/fundidos entre as tabelas 1419 e 7060** — verificação item a item é tarefa do projeto (não feita nesta auditoria).
  2. O deflator geral **inclui o próprio item** (pequeno para arroz/feijão, maior para gasolina, peso 4,7% no IPCA de dez/2022).
  3. A variação início→fim da janela perde a variação do primeiro mês de cada período (o nível de jan/2019 e de jan/2023 é a base). Teste (base dez/2022 para Lula): diferenças de até 4,5 p.p. (feijão −13,3% → −8,9%), **mesmo sinal em todas as 11 séries**.
  4. A documentação diz "Laspeyres" informalmente; o termo oficial é Lowe/Jevons.
- **Classificação:** **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** para o encadeamento e a deflação; **NÃO HÁ LITERATURA SUFICIENTE** para o uso do IPCA geral como deflator de item.
- **Recomendação:** manter; documentar o elo jan/2020 e a escolha do deflator geral (citando IBGE 2020, o CPI Manual e Yuba et al. apenas pelo ponto "índice geral como deflator"); auditar os subitens das duas tabelas; descrever o índice como "Lowe encadeado (IBGE)".

### 3.C Combustíveis

- **Fonte:** ANP, Levantamento de Preços de Combustíveis (dados abertos por posto).
- **Fórmula atual:** preço nacional mensal = **média simples de todas as coletas do mês** (`groupby(ano_mes, produto).mean()` em `download_anp.py`); real = × deflator do IPCA.
- **Referências / documentos:**
  - **ANP, "Informações sobre o levantamento de preços de combustíveis"** [RESUMO da página]. LPC: coleta semanal, 459 municípios nominais; "preço médio municipal é obtido por **média aritmética simples**"; **desde 31/10/2004, os níveis estadual, regional e nacional são ponderados pelo volume de vendas das distribuidoras.** URL: gov.br/anp (página LPC).
  - **ANP/Análise & Síntese (2020), Metodologia resumida do LPC** [TEXTO]. Coleta presencial nos três primeiros dias úteis da semana; seleção aleatória de postos com cobertura geográfica garantida; **sem regra estatística publicada para outliers**.
  - **da Silva, Vasconcelos, Vasconcelos & de Mattos (2014)**, *Energy Economics* 43:11–21, DOI 10.1016/j.eneco.2014.02.002 [CR]. Usa o LPC como fonte (dados semanais, 2004–2011). **Só contexto: mostra o LPC como fonte acadêmica aceita; não trata de agregação.**
  - Nova Cana (imprensa setorial) [fonte secundária]: o preço nacional oficial pondera os médios regionais pelo volume comercializado; cobertura efetiva ~437–440 municípios/semana.
  - DIEESE (2025), *Metodologia da Cesta Básica* [TEXTO]: usa média simples de cotações sem ponderar locais — analogia (alimentos) que sustenta a média simples como prática de pesquisa de preços.
  - Agregação temporal (média vs fechamento): Working (1960), *Econometrica* 28(4), DOI 10.2307/1907574 [CR]; Rossana & Seater (1995), *JBES* [CR sem leitura do método] — **só contexto**, e relevantes para séries em nível, não para variações ponta a ponta de médias mensais.
- **O que sustentam:** a fonte e a periodicidade; a média simples **só no nível municipal**. **A ANP publica média nacional ponderada**, e a média simples sobre dados por posto é **construção do projeto**.
- **Problemas encontrados:** (1) o texto do projeto chama o resultado de "preço médio nacional (ANP)" — deve ser "média simples das coletas do LPC", pois **difere da série oficial ponderada**. (2) Setembro/2020 sem pesquisa (já documentado). (3) Diesel e Diesel S10 duplicam (§4). (4) Nenhuma literatura sustenta "média simples nacional de coletas" como agregação; o efeito é uma hipótese não testada — **a comparação numérica com a série oficial ponderada da ANP não foi feita nesta auditoria** (exige baixar outra série).
- **Classificação:** **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO**; **NÃO HÁ LITERATURA SUFICIENTE** para sustentar a média simples nacional.
- **Recomendação:** renomear; testar contra a série oficial ponderada (se a diferença na variação for pequena, documentar isso e encerrar); declarar que não há tratamento de outliers.

### 3.D Poder de compra da gasolina

- **Fórmula atual:** `litros_por_salário = SM_nominal(t) ÷ preço_nominal(t)`. **Identidade verificada numericamente:** `= SM_real ÷ preço_real` (mai/2023: 244,336 = 244,338).
- **Referências:** **não existe literatura acadêmica que defina "litros por salário mínimo" como indicador.** Análogos:
  - **DIEESE (2025), metodologia da Cesta Básica** [TEXTO]: horas de trabalho = custo da cesta ÷ (SM ÷ 220 h). Razão preço/salário mínimo — **sustenta por analogia**; o DIEESE também divulga versão com SM líquido (INSS).
  - **Ashenfelter & Jurajda (2001)**, "Cross-country comparisons of wage rates: the Big Mac index", Princeton IRS WP [RESUMO; não revisado por pares] — legitima "salário em unidades de uma mercadoria". Versão recente: NBER WP 32708 (2024), DOI 10.3386/w32708 [CR] ("The U.S. Low-Wage Structure: A McWage Comparison").
  - **Mattioli, Wadud & Lucas (2018)**, *Transportation Research A* 113:227–242, DOI 10.1016/j.tra.2018.04.002 [CR] — vulnerabilidade a preços de combustível por parcela da renda; **só contexto** (medida de orçamento).
  - Relatório Argonne (2021) sobre acessibilidade de combustível [NÃO VERIFICADO em detalhe]; indicadores de imprensa tipo "galões por hora de salário mínimo" existem sem validação acadêmica.
- **Avaliação:** a construção é aritmeticamente correta, transparente e pertence à família "salário em unidades de uma mercadoria". **Defensável como indicador descritivo.** Como descrever: "quantos litros de gasolina um salário mínimo comprava", **não** "índice de acessibilidade".
- **Problemas encontrados (importante):**
  1. **Dupla contagem entre dimensões.** A gasolina já está em Custo de vida (preço real); em Renda, `litros = SM_real/preço_real` reintroduz o preço real da gasolina **invertido**. As variações reais confirmam: SM real B −4,02% / L +6,15%; preço real da gasolina B −9,17% / L +11,02%; litros B +5,67% / L −4,38%.
  2. **Cancelamento artificial dentro de Renda.** Como Renda usa a mediana de duas séries (= média), `f(B) = (−4,02 + 5,67)/2 = 0,83` e `f(L) = (6,15 − 4,38)/2 = 0,89` → "praticamente iguais" no período completo. **O empate de Renda é produzido pela série da gasolina**: só com SM real a leitura é Lula (−4,02 vs +6,15).
  3. Um único bem, sem substituição (etanol/flex); SM bruto; reajuste anual do SM vs preço semanal.
- **Classificação:** **METODOLOGICAMENTE QUESTIONÁVEL** (como componente de uma dimensão que já tem SM real e cuja gasolina já pesa em Custo de vida). Como indicador isolado: CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO.
- **Recomendação:** manter o gráfico como indicador descritivo; **tirá-lo (ou torná-lo Tipo C) da leitura da dimensão Renda**, ou declarar explicitamente a identidade com SM_real/preço_real. Ver §8, P2 e §10.

### 3.E Dólar / câmbio

- **Fonte:** BCB SGS 1, PTAX venda. Mensal = média dos dias úteis; comparação = pontas diárias.
- **Fórmula atual do "dólar real":** `PTAX × IPCA_idx(ref)/IPCA_idx(t)` — deflaciona **só pelo IPCA doméstico**.
- **Referências:**
  - **IPEA/Ipeadata, nota metodológica da Taxa de câmbio efetiva real** [TEXTO]. Câmbio real = `Σ αᵢ·(Eᵢ·Pᵢ*/P)` (preços **externos** sobre **domésticos**, deflatores IPA/INPC e CPI/PPI dos parceiros). **Não sustenta** a construção do projeto; **sustenta a definição clássica**.
  - **Araújo, Caldarelli & Cortapasso (2023)**, "Padrões da transmissão cambial para taxa de inflação no Brasil", *Nova Economia* 33(2):363–392, DOI 10.1590/0103-6351/7570 [CR] [RESUMO/leitura parcial]. VAR com **câmbio nominal**; pass-through varia por regime. **Só contexto.**
  - **Salomão Neto & Alves (2025)**, "Efeitos assimétricos do câmbio para a inflação: evidência via NARDL para o Brasil", *Braz. J. Political Economy* 45(3):619–640, DOI 10.1590/0101-31572025-3679 [CR]. Repasse assimétrico; **não foi possível confirmar se o câmbio é nominal ou real**. **Só contexto.**
  - Rogoff (1996), *JEL* 34(2) e Klau & Fung (2006), *BIS Quarterly Review* [existência confirmada na busca; DOIs/textos NÃO consultados] — definição conceitual.
- **Problema:** o "dólar real" do projeto **não é taxa de câmbio real**. Teste com CPI dos EUA (FRED CPIAUCSL) sobre o IPCA brasileiro, base jan→dez / jan→ago: **Bolsonaro: dólar nominal +40,1%; "real só IPCA" +10,7%; câmbio real clássico (CPI EUA/IPCA) +31,0%. Lula: −0,9% / −15,5% / −6,0%.** A diferença é grande: o número rotulado "real" **subestima** a depreciação real no período Bolsonaro e **superestima** a apreciação no período Lula.
- **Classificação:** **PRECISA DE CORREÇÃO** (de rótulo/descrição; o cálculo em si é aritmeticamente o que diz ser).
- **Recomendação:** (a) renomear para "dólar a preços constantes de ago/2026" / "dólar em poder de compra doméstico", **ou** (b) incorporar o CPI dos EUA e citar IPEA. Indicador é Tipo B (não entra na síntese), então **nenhum resultado da Análise muda**.

### 3.F Selic

- **Fonte:** BCB SGS **432 = meta Selic** (definida pelo Copom). A **efetiva** é a SGS 11 (diária) / 4189 (mensal anualizada).
- **Fórmula atual:** mensal = média simples dos dias (`mean`); comparação entre períodos = diferença em p.p. entre pontas diárias (Tipo B, só descritivo).
- **Referências:**
  - **BCB, metadados SGS "Taxas Selic"** [TEXTO da página]. Confirma meta (432) vs efetiva (11/4189; média ponderada por volume). **Não sustenta a média dos dias úteis da meta como estatística oficial.**
  - **Perrelli & Roache (2014)**, "Time-Varying Neutral Interest Rate — The Case of Brazil", IMF WP/14/84, DOI 10.5089/9781484385210.001 [CR; método não lido a fundo] — sustenta parcialmente a ideia de analisar a postura monetária pelo **juro real**, não o nominal.
  - Roberts (2018), FEDS Notes, DOI 10.17016/2380-7172.2227 [CR citado por agente; EUA, só contexto].
- **Média mensal da meta é a melhor estatística?** Não encontrei literatura que trate disso. Aritmética: a meta é uma série em degraus; a média dos dias úteis só pondera os dias com cotação (não os corridos) e é equivalente à média no tempo apenas se as mudanças não caírem em fins de semana. **Não há literatura para concluir.** A medida mais informativa para comparar períodos é o **juro real**.
- **Simulação (ex-post, `(1+Selic)/(1+IPCA12m)−1`, média mensal):** Bolsonaro (jan/2020–dez/2022) **−0,26%**; Lula (jan/2023–ago/2026) **+8,21%**. A Selic nominal média (6,50% vs 13,20%) conta uma história diferente da do juro real; isso é conteúdo informativo para o leitor, e não uma correção.
- **Classificação:** **NÃO HÁ LITERATURA SUFICIENTE PARA CONCLUIR** sobre a média; **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (nomear como "meta Selic"; acrescentar juro real).

### 3.G Ibovespa

- **Fonte:** B3. Pontos de fechamento; mensal = último pregão; comparação = pontas diárias.
- **Referências:**
  - **B3 (2020), *Metodologia do Índice Bovespa*** [TEXTO]. **O Ibovespa é um índice de retorno total** ("incorpora o reinvestimento de proventos"). O alerta "preço vs retorno total" não se aplica; o que falta é a **deflação**, pois os pontos são nominais. (A fórmula detalhada está no *Manual de Definições e Procedimentos dos Índices da B3*, **não lido**.)
  - **Araújo, Brito & Sanvicente (2021)**, *Int. J. Finance & Economics* 26(4):6249–6263, DOI 10.1002/ijfe.2118 [CR; Crossref indica publicação online em 2020] [TEXTO via WP BCB 525]. Usa o Ibovespa como índice de retorno total (dez/1967–dez/2019) e **deflaciona pelo IGP-DI** para retornos reais; alta volatilidade (σ ≈ 67%). **Sustenta o uso do Ibovespa como retorno total e a necessidade de deflação.**
  - **Serra, Saito & Fávero (2016)**, "Nova metodologia do Ibovespa, betas e poder explicativo dos retornos das ações", *Rev. de Contabilidade e Organizações* 10(27), DOI 10.11606/rco.v10i27.111708 [CR] [RESUMO]. A metodologia mudou em 2013 (aplicada desde 2014). **Só contexto; alerta para quebra metodológica dentro do período.** (Atenção: o ano é 2016, não 2021.)
- **Limitações de interpretar valorização como bem-estar:** **nenhuma fonte verificada**; a ressalva (poucos domicílios têm ações) é do projeto, e já está na metodologia — está correta, mas sem respaldo bibliográfico.
- **Simulação (série mensal de fechamento, deflator IPCA, jan/2019→dez/2022 e jan/2023→ago/2026):** Bolsonaro nominal +12,7%, **real −10,9%**; Lula nominal +56,4%, **real +33,4%**. (A Análise usa pontas diárias — +20,6% e +76,2% até 22/09/2026 —; a comparação real acima usa a série mensal, portanto os números não são idênticos.)
- **Classificação:** **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (declarar "nominal; retorno total"; mostrar o valor real).

### 3.H PIB

- **Fonte:** IBGE, Contas Nacionais Trimestrais (tab. 5932); taxa anual = "acumulado no ano" do 4º trimestre.
- **Fórmula atual:** média aritmética das taxas anuais fechadas (B 2019–22; L 2023–25); acumulado `∏(1+taxa)` calculado mas não usado na leitura.
- **Referências:**
  - **IBGE (2004), *Contas Nacionais Trimestrais*, Série Relatórios Metodológicos v. 28** [TEXTO; 1ª edição, atual é posterior]. Define "taxa acumulada ao longo do ano" (no 4º trimestre = taxa anual) e "acumulada nos últimos quatro trimestres"; revisão anual (n-1 preliminar, n-2 semidefinitiva, n-3 definitiva). **Sustenta a escolha do dado.**
  - **OECD, *Quarterly National Accounts – GDP Growth Methodology*** (2026) [TEXTO]. A taxa anual preliminar é a soma dos 4 trimestres de Y sobre a de Y−1. **Sustenta a leitura do 4º trimestre como taxa anual.**
  - **SNA 2008, cap. 15; IMF *Quarterly National Accounts Manual* (2017), cap. 8** [RESUMO]; **OECD *Compendium of Productivity Indicators 2024*** (DOI 10.1787/b96cd88a-en [CR] [TEXTO]) — **não sustentam** média aritmética nem geométrica de taxas anuais (a frase de que "todas as estatísticas usam médias geométricas" apareceu só num resumo de busca e **não foi encontrada no texto: não citar**).
  - CECON/Unicamp, *Dimensões da economia brasileira…* [RESUMO]; Balassiano & Pessoa (2021), Blog do IBRE [lido; blog]. **Só contexto:** mostram que comparar governos por crescimento médio é prática corrente; não definem a média.
- **Média aritmética vs geométrica:** **não há literatura verificada** que escolha uma. Matematicamente (desigualdade de Jensen) a aritmética ≥ geométrica, com viés crescente na dispersão.
- **Simulação:** completo — aritmética B 1,43 / L 2,97; **geométrica (CAGR) B 1,38 / L 2,97**; mediana B 2,10 / L 3,20. Igual duração (3 anos: 2019–21 × 2023–25) — aritmética B 0,90; geométrica 0,85; mediana 1,20. **Mesma direção em todas.** A recessão de 2020 (−3,3%) e o rebote de 2021 (+4,8%, sobre base deprimida) são o que torna a média por ano sensível; o acumulado mostraria isso melhor.
- **Problemas:** (1) 4 anos vs 3 anos no modo completo — padronizado por média anual, defensável, mas o acumulado não é comparável; (2) 2026 só trimestral, corretamente excluído; (3) as taxas de 2023–25 ainda estão em revisão (n-1…n-3); (4) a média simples de taxas não corrige o efeito de base.
- **Classificação:** **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (declarar média aritmética; mostrar a geométrica; citar IBGE/OECD **apenas para o dado**, não para a média).

### 3.I Mercado de trabalho (PNAD Contínua)

- **Fonte/fórmula:** tab. 6381 (desocupação), 6441 (subutilização), 6390 (rendimento real habitual); trimestres móveis **inteiros** dentro do período; **taxas = média da janela; rendimento = variação início→fim**; voto por série.
- **Referências:**
  - **IBGE, *Medidas de subutilização da força de trabalho* (4T/2023)** [TEXTO]: subutilização = desocupados + subocupados por insuficiência de horas + força de trabalho potencial; alinhada à 19ª CIET (OIT, 2013). **Sustenta o conceito.**
  - **IBGE, Nota técnica 02/2022** [TEXTO]: coleta **exclusivamente telefônica de 2T/2020 a 2T/2021**; taxa de resposta de 79,2% (1T/2020) para ~55–60% em 2020; **reponderação desde nov/2021** (série refeita desde 2012). Há ainda **reponderação em jul/2025 com projeções do Censo 2022** [RESUMO] — a série inteira desde 2012 foi recalculada.
  - **BCB, Estudo Especial 109/2021** [TEXTO]: o viés de resposta afeta pouco ocupação/desocupação (ex.: ~0,4 p.p.), **sem cobrir rendimento**.
  - **Corseuil & Russo (2022)**, IPEA [RESUMO]; **Al Masri, Flamini & Toscani (2021)**, IMF WP/21/66, DOI 10.5089/9781513571645.001 [CR] (o Crossref lista só dois autores; o PDF lista três) — informalidade/mulheres/jovens perderam mais postos: **sustenta parcialmente o risco de composição**.
  - **Firpo & Portella (2024)**, *IZA World of Labor*, DOI 10.15185/izawol.441.v2 [CR; autores completos NÃO verificados]: "real wages increased slightly at the onset of the pandemic due to composition effects, as lower-wage workers lost their jobs earlier". **Fonte mais direta sobre o ponto do rendimento.**
  - **Bacciotti & Marçal (2020)**, "Taxa de desemprego no Brasil em quatro décadas: retropolação da PNAD Contínua de 1976 a 2016", *Estudos Econômicos* 50(3):513–534, DOI 10.1590/0101-41615035rbe [CR; o título em inglês indicado **não foi encontrado**]. **Só contexto** (pré-2016).
  - **Reis (2020)**, "As consequências do desemprego para os rendimentos de reemprego…", *Estudos Econômicos* 50(4):705–732, DOI 10.1590/0101-41615045mcr [CR; título em inglês indicado **NÃO VERIFICADO**]. Perda de 10–15% no rendimento de reemprego. **Só contexto; não sustenta nada do método.**
- **Média da janela vs valor final:** **sem literatura específica.** Trimestres móveis sobrepostos (painel 1-2(5), dois meses repetidos entre móveis consecutivos [RESUMO]) induzem autocorrelação; a média da janela é descritiva válida, não amostra independente.
- **Problemas:**
  1. **A dimensão Trabalho depende da regra de métrica.** Na métrica atual (taxas = média; rendimento = início→fim): Lula 3 a 0. Na **métrica alternativa já gravada** (taxas = variação início→fim; rendimento = média): desocupação **B −4,9 p.p. / L −3,5 p.p.** (voto Bolsonaro), subutilização B −6,5 / L −5,8 (empate pela tolerância de 1,0), rendimento (média) Lula → **soma 0 = empate**. A média das taxas premia o período com menor nível médio e penaliza o que atravessa o pico de 2020–21; a variação início→fim, o contrário. **A regra "taxas = média" foi fixada antes do cálculo (bom), mas a escolha muda a leitura.**
  2. **Desocupação e subutilização são quase redundantes** (a própria metodologia diz) e valem 2 de 3 votos.
  3. **Rendimento 2019→2022:** coleta telefônica + efeito de composição; deflator do IBGE refeito a cada divulgação (a leitura só é consistente dentro de uma coleta de dados — a metodologia já diz isso; deve registrar a **data da coleta** e a reponderação de jul/2025).
  4. Regimes de coleta distintos entre os dois períodos.
- **Classificação:** **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (e com **sensibilidade à regra de métrica a ser exibida**); componente "rendimento": **METODOLOGICAMENTE QUESTIONÁVEL** como indicador de bem-estar sem a ressalva de composição.

### 3.J Inflação (IPCA acumulado / 12 meses)

- **Fonte/fórmula:** `IPCA_idx(t)/IPCA_idx(t−12)×100−100`; **média dos valores mensais** da janela.
- **Referências:**
  - **IBGE (2020), v. 14** [TEXTO]: IPCA = Lowe + Jevons, 16 áreas urbanas (o roteiro do projeto fala em "13 regiões" — **verificar o texto do site**; o documento lido diz 16), POF 2017-18.
  - **Hansen & Hodrick (1980)**, *JPE*, DOI 10.1086/260910 [CR]; **Newey & West (1987)**, *Econometrica*, DOI 10.2307/1913610 [CR]: observações sobrepostas geram autocorrelação (contexto: câmbio/regressão). **Só contexto** para o fato de que médias de taxas de 12 meses não são amostras independentes.
  - **Não encontrei referência acadêmica verificada** sobre "inflação média por governo" nem sobre média de taxas de 12 meses vs inflação composta.
- **Problemas (achado concreto):**
  1. **A série de 12 meses só começa em jan/2020** porque `baixar_ipca_geral()` filtra `ano_mes >= 2019-01-01`. O comentário em `build_dashboard_data.py` diz que o cálculo usa "o histórico completo do IPCA", **o que não é verdade** (inconsistência código × comentário). Consequência: **Bolsonaro = 36 meses (jan/2020–dez/2022) contra Lula = 44**; a média do período Bolsonaro **exclui 2019** (IPCA 2019 = 4,31%).
  2. **Simulação (IPCA 2018 baixado do SIDRA):** média Bolsonaro **6,95% → 6,14%** com 2019; Lula 4,61%. Igual duração (44 meses): Bolsonaro **6,13%** (atual: 7,02%) contra 4,61%. **Direção inalterada.**
  3. Média de taxas de 12 meses ≠ inflação média anual composta; a primeira pesa cada mês em até 12 janelas. É descrição, não erro, mas deve ser dita.
- **Classificação:** **PRECISA DE CORREÇÃO** (incluir 2019 — dados já existem no SIDRA; custo trivial).

### 3.K Síntese de custo de vida (índice composto)

- **Como o projeto faz hoje:** **não há índice base 100 nem normalização.** A síntese de Custo de vida é a **mediana não ponderada** das 11 variações reais ponta a ponta (5 combustíveis + 6 alimentos), comparada entre períodos com tolerância de 1,0 ponto. Os dois grupos (combustíveis; alimentos) são exibidos separadamente.
- **Referências** (todas verificadas em [CR]; texto lido apenas do Handbook e de Mazziotta & Pareto):
  - **OECD/JRC (Nardo et al., 2008), *Handbook on Constructing Composite Indicators*, DOI 10.1787/9789264043466-en** [CR] [TEXTO]. p. 32: com pesos iguais, indicadores **colineares** fazem a dimensão pesar `w1+w2` (dupla contagem); a resposta usual é testar correlação e eliminar ou reduzir pesos — **com o alerta de que isso pode ser perigoso se motivado só por redundância aparente**. Pesos expressam trade-offs, não importância (p. 33, 102–105). Mediana aparece só em imputação/estatística-resumo; **não como agregador de subindicadores**.
  - **Becker, Saisana, Paruolo & Vandecasteele (2017)**, *Ecological Indicators* 80:12–22, DOI 10.1016/j.ecolind.2017.03.056 [CR] [RESUMO]; **Paruolo, Saisana & Saltelli (2013)**, "Ratings and rankings: voodoo or science?", *JRSS A* 176(3), DOI 10.1111/j.1467-985x.2012.01059.x [CR] [RESUMO]: **a importância efetiva** difere dos pesos nominais por correlação e variância desiguais. **Sustentam o alerta**, não um tratamento específico.
  - **Mazziotta & Pareto (2013)**, *Rivista Italiana di Economia Demografia e Statistica* 67(2):67–80 (sem DOI; ISTAT) [TEXTO]: guia de escolha de método; para indicadores correlatos, selecionar os menos correlacionados. **Não** discute mediana.
  - **Bryan & Cecchetti (1993/1994)**, "Measuring core inflation", NBER WP 4303, DOI 10.3386/w4303 [CR]; BCB, núcleos por média aparada/suavizada (TD 356) [RESUMO]: mediana e média aparada de variações de preços como medida central **ponderadas pelas participações de despesa**. **A mediana do projeto é não ponderada, sobre séries heterogêneas.** Sustenta "mediana resiste a outliers", **não** o procedimento do projeto.
  - Freudenberg (2003), OECD STI WP 2003/16, DOI 10.1787/405566708255 [CR; autor **não** verificado no registro; conteúdo não lido] — **só contexto**.
- **O que NÃO foi encontrado:** nenhum artigo que use mediana não ponderada de séries de naturezas distintas como agregador dentro de uma dimensão.
- **Diagnóstico de redundância (dados do projeto):**
  - **Diesel e Diesel S10:** correlação das variações mensais reais = **1,00**; ambos mapeiam ao mesmo subitem do IPCA (7659, peso 0,29%).
  - **Gasolina e etanol:** correlação 0,81. GLP, 0,25–0,36 com os demais.
  - **Pesos do IPCA (dez/2022, SIDRA v.66):** gasolina 4,70%; GLP 1,41%; etanol 0,68%; diesel 0,29%; leite 0,82%; arroz 0,59%; café 0,43%; óleo 0,32%; carne 0,18%; feijão 0,14%. **O diesel não é item de consumo relevante da família média e tem o mesmo peso (1/11) da gasolina e do arroz na mediana.**
  - Quatro combustíveis líquidos (gasolina, etanol, diesel, S10) ocupam 4 das 11 posições da mediana.
- **Simulação (variação real; f = −variação; negativo = mais pressão):**

| Esquema | f Bolsonaro | f Lula | Leitura |
|---|---|---|---|
| Atual: mediana das 11 | −34,80 | +9,84 | Lula |
| Sem Diesel S10 (10) | −30,69 | +10,46 | Lula |
| Sem Diesel e S10 (9) | −26,57 | +9,84 | Lula |
| Só alimentos (6) | −35,30 | +4,69 | Lula |
| Só combustíveis (5) | −23,49 | +9,84 | Lula |
| Média simples das 11 | −32,66 | +4,82 | Lula |
| Média de duas medianas (4 comb. + 6 alim.) | −24,16 | +7,57 | Lula |
| **Média ponderada pelos pesos do IPCA** | **−10,13** | **−2,21** | Lula (mas ambos com alta real) |

  A conclusão qualitativa **resiste** a todos os esquemas de agregação. Nota: com pesos do IPCA, os itens ponderados **subiram em termos reais nos dois períodos** (−10,1 vs −2,2), isto é, "menor pressão" ≠ "queda de preços".
- **Sensibilidade à métrica (pontos de ancoragem):**

| Métrica (mediana das 11) | Bolsonaro | Lula | Leitura |
|---|---|---|---|
| Ponta a ponta (atual) | +34,80% | −9,84% | Lula |
| Pontas suavizadas (média de 6 meses) | +40,19% | −3,32% | Lula |
| Pontas suavizadas (média de 12 meses) | +33,70% | −0,02% | Lula (**diferença quase toda por queda do lado Bolsonaro, o efeito para Lula some**) |
| **Nível médio real (Lula ÷ Bolsonaro − 1)** | — | **+2,51%** | **Lula mais caro: INVERTE** |

  A leitura atual é a **trajetória dentro de cada janela**; o nível médio real compara **patamares**. São perguntas distintas. A metodologia só responde à primeira e **não declara isso como escolha com consequência**.
- **Classificação:** **METODOLOGICAMENTE QUESTIONÁVEL** (redundância diesel/S10; diesel fora do consumo típico; mediana não ponderada) e **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** quanto à métrica (trajetória vs nível). **Resultado qualitativo robusto aos esquemas de agregação; sensível à métrica.**
- **Alternativas (não implementadas):** (a) remover Diesel S10 ou fundir diesel/S10; (b) trocar diesel por nada ou manter como "contexto"; (c) ponderar pelo IPCA (documentável, mas exige tratar os pesos em jan/2020); (d) mostrar as duas métricas (trajetória e nível).

### 3.L Síntese das dimensões e pesos

Ver §4–7. Resumo: a agregação por **sinais** (+1/0/−1) com **tolerância** e soma ponderada é compatível com a literatura de agregação **não compensatória/ordinal** (Handbook; Munda & Nardo 2009), mas essa literatura **a apresenta com a perda de informação e a arbitrariedade do limiar como limitações explícitas**. **Nenhuma fonte sustenta exatamente o método do projeto.**

---

## 4. Índices compostos

**O que o projeto é, tecnicamente.** Não é um índice composto numérico (não há normalização min-max/z-score, nem soma de escores). É um **resumo ordinal por dimensão**, seguido de uma **contagem ponderada de sinais**. A literatura de indicadores compostos fornece vocabulário e alertas; não valida o procedimento.

| Passo do Handbook OECD/JRC | Status no projeto |
|---|---|
| Normalização (p. 28–29, 84–86) | Substituída por direção (±) e tolerância. O Handbook cita a normalização por **limiar em torno da média** (±1/0) como "simples e não afetada por outliers", mas critica "a arbitrariedade do limiar e a omissão da informação em nível absoluto". |
| Ponderação | Pesos iguais por dimensão (20%), cinco cenários 40/15/15/15/15, e grade exaustiva. |
| Agregação por contagem (p. 102–103, Eq. 30) | É a agregação do projeto na prática; o Handbook diz que perde informação de intervalo (+30% e +25% contam igual). |
| Multicolinearidade/dupla contagem (p. 32) | **Não testada.** Diesel/S10 (r = 1,00) e gasolina em duas dimensões. |
| Incerteza e sensibilidade (Passo 8) | Parcial: só pesos; mais leave-one-out dentro de dimensões; mais janela. |

**Sobre magnitude.** O projeto descarta magnitude "porque as unidades diferem". A justificativa é compatível com a visão não compensatória (Munda & Nardo 2009, DOI 10.1080/00036840601019364 [CR] [RESUMO]; método deles é ranking par a par entre unidades, **não** voto por dimensão — não reproduzem o método). Uma alternativa defensável (Mazziotta & Pareto 2013) seria normalizar (rank, z-score ou min-max) e preservar magnitude. **Contagem simples de séries (sem tolerância, sem dimensões): 16 de 18 séries Tipo A favorecem o período Lula; 2 (preço real da gasolina e litros por salário) o Bolsonaro.**

---

## 5. Pesos e agregação

1. **Pesos nominais ≠ importância efetiva** (Handbook p. 33; Paruolo et al. 2013; Becker et al. 2017). Cada dimensão pesa 20%, mas: Custo de vida é decidido por 11 séries correlacionadas; Atividade por **uma série** (média de 3–4 números); Renda por duas séries que se cancelam; Trabalho por três votos de dois fenômenos quase iguais. A "importância efetiva" de cada dimensão **não é igual** mesmo com pesos iguais. A literatura não diz que isso é errado — diz que **deve ser declarado**.
2. **Pesos iguais por dimensão:** justificativa do projeto ("não há razão a priori") é legítima como agnosticismo (compatível com SMAA para pesos desconhecidos, §6), mas o Handbook lembra que pesos iguais também são uma escolha e que, em agregação linear, são **trade-offs**.
3. **Tolerância (1,0 ponto; 0,1 em médias)** corresponde ao conceito de **limiar de indiferença** de ELECTRE/PROMETHEE (Roy 1991, DOI 10.1007/bf00134132 [CR]; Brans & Vincke 1985, DOI 10.1287/mnsc.31.6.647 [CR]) — o conceito é padrão, mas lá o limiar é justificado por incerteza de medida e testado por sensibilidade; o Handbook (nota 40) avisa sobre valores *ad hoc*. **No resultado atual, a tolerância só importa em Renda (diferença de 0,06 contra tolerância de 1,0) e, nas métricas alternativas de Trabalho (subutilização: 0,7 contra 1,0). Variar a tolerância não foi testado; precisaria de um teste simples (0,5; 2,0).**
4. **Mediana como agregador:** sem apoio direto (§3.K). Dentro de Renda (2 séries) a mediana é a média.
5. **Votos por série em Trabalho:** coerente com o princípio de não misturar unidades; é uma decisão do projeto, sem literatura específica.

---

## 6. Análise de sensibilidade

**Terminologia recomendada (resposta direta).** O teste das 10.626 combinações deve ser chamado de **"análise de sensibilidade aos pesos"** (em inglês, *weight-space sensitivity analysis*); sua conclusão pode ser descrita como **"estabilidade/robustez da conclusão aos pesos"**. Fundamento:
- **Handbook OECD/JRC (Passo 8) [TEXTO]:** *sensibilidade* é a técnica (apurar a contribuição de cada fonte de incerteza); *robustez* é a propriedade avaliada ("sensitivity analysis can be used to assess the robustness of composite indicators"). Fontes de incerteza listadas: **inclusão/exclusão de indicadores, normalização, pesos, agregação, imputação**.
- **Saisana, Saltelli & Tarantola (2005)**, *JRSS A* 168(2), DOI 10.1111/j.1467-985x.2005.00350.x [CR]; **Saltelli & Annoni (2010)**, "How to avoid a perfunctory sensitivity analysis", DOI 10.1016/j.envsoft.2010.04.012 [CR]: o padrão é **global**, com todas as fontes de incerteza juntas; varrer só um fator é a prática que Saltelli & Annoni chamam de "perfunctória" quando ignora o resto do espaço de incerteza. (Textos integrais **não lidos**; baseio-me no título/resumo e na citação feita pelo Handbook.)
- **Evitar:** "análise de robustez" sem qualificação; "sensibilidade global" (implica decomposição de variância sobre todos os fatores); "teste de estresse".

**Precedente metodológico real para enumerar o simplex de pesos:** **SMAA — *Stochastic Multicriteria Acceptability Analysis*** (Lahdelma, Hokkanen & Salminen 1998, DOI 10.1016/s0377-2217(97)00163-x [CR]; Lahdelma & Salminen 2001, DOI 10.1287/opre.49.3.444.11220 [CR]; Tervonen & Lahdelma 2007, DOI 10.1016/j.ejor.2005.12.037 [CR]). Pesos desconhecidos distribuídos uniformemente no simplex; reporta o **índice de aceitabilidade de posição** (fração de pesos que levam cada alternativa à posição). A grade de passo 5 é uma **versão determinística discretizada** da mesma ideia; "10.625/10.626 = 0,9999" é análogo ao índice de aceitabilidade do 1º lugar. Diferenças: a malha inclui as bordas (pesos zero), é discreta, e no SMAA o modelo de agregação também é fixo.

**Outros precedentes:** estabilidade de pesos em MCDA (Mareschal 1988, DOI 10.1016/0377-2217(88)90254-8 [CR]; Triantaphyllou & Sánchez 1997, DOI 10.1111/j.1540-5915.1997.tb01306.x [CR]) — mesmo conceito com intervalos analíticos; **Luzzati & Gucciardi (2015)**, "A non-simplistic approach to composite indicators and rankings", *Ecological Economics* 113:25–38, DOI 10.1016/j.ecolecon.2015.02.018 [CR] (a revista é *Ecological Economics*, não *Environmental Modelling & Software*) — reporta a frequência de resultados sob muitas normalizações/agregações/pesos: é o precedente de **reportar distribuições em vez de um único resultado**, e é mais amplo do que a grade do projeto.

**O que a grade realmente mostra.** O resultado (10.625 Lula, 0 Bolsonaro, 1 empate) vem de **dominância**: nenhuma dimensão aponta para Bolsonaro (Custo de vida +1, Inflação +1, Renda 0, Trabalho +1, Atividade +1). Com sinais todos ≥ 0, **nenhuma ponderação pode inverter** — a grade confirma o óbvio. O texto do projeto já diz isso ("os pesos mudam o tamanho da diferença, não o lado"). É honesto, mas **não é prova de robustez do método**.

**Demonstração do que a grade mostraria se a dominância não existisse** (replicação em `docs/auditoria_simulacoes.py`):

| Cenário de leituras (C.vida, Infl., Renda, Trab., Ativ.) | Lula | Bolsonaro | Empate |
|---|---|---|---|
| Atual (+1, +1, 0, +1, +1) | 10.625 | 0 | 1 |
| Renda só com SM real (+1, +1, +1, +1, +1) | 10.626 | 0 | 0 |
| C.vida invertido pela métrica "nível médio" (−1, +1, 0, +1, +1) | 8.910 | 1.430 | 286 |
| C.vida invertido e Renda +1 | 9.625 | 715 | 286 |

---

## 7. Robustez

A robustez, no sentido amplo do Handbook, exigiria variar **além dos pesos**: normalização/métrica, agregação, conjunto de séries e tolerância. O que o projeto já faz: pesos (grade); leave-one-out dentro de Custo de vida; duas janelas (completo/igual duração); a métrica alternativa de Trabalho **informada como transparência**. O que falta e foi testado aqui (ver §10): redundância (diesel/S10), IPCA com 2019, métrica de Custo de vida, SM real isolado, PIB geométrico, INPC.

**Quadro resumido das variantes testadas — o que cada uma faz com a leitura:**

| Variante | Dimensão afetada | Leitura atual → variante | Sintese muda? |
|---|---|---|---|
| Remover diesel S10 | C. vida | Lula → Lula | Não |
| Média ponderada pelo IPCA | C. vida | Lula → Lula | Não |
| IPCA 12m com 2019 | Inflação | Lula → Lula (6,14 vs 4,61) | Não |
| PIB média geométrica | Atividade | Lula → Lula | Não |
| Renda só SM real | Renda | **empate → Lula** | Reforça Lula |
| SM real com INPC | Renda | (mesma direção) | Não |
| Trabalho com métrica alternativa | Trabalho | **Lula → empate** | Reduz Lula |
| C. vida por nível médio real | C. vida | **Lula → Bolsonaro** | **Sim (grade 8.910/1.430/286)** |

---

## 8. Problemas metodológicos encontrados

| # | Problema | Evidência | Classificação |
|---|---|---|---|
| P1 | IPCA 12m do período Bolsonaro **exclui 2019** (36 vs 44 meses); comentário do código ("histórico completo") contradiz o `download_ibge.py` (filtra ≥ 2019-01) | Código; SIDRA 2018 | **PRECISA DE CORREÇÃO** |
| P2 | Litros de gasolina por SM = SM_real/preço_real: **dupla contagem da gasolina** e **empate artificial em Renda** | Identidade numérica; f = 0,83 vs 0,89 | **METODOLOGICAMENTE QUESTIONÁVEL** |
| P3 | Custo de vida: **redundância diesel/S10** (r = 1,00, mesmo subitem IPCA); diesel quase sem peso no consumo (0,29%); mediana **não ponderada** de séries heterogêneas | Correlações; pesos IPCA | **METODOLOGICAMENTE QUESTIONÁVEL** (resultado robusto) |
| P4 | A leitura de Custo de vida é **trajetória início→fim**; por **nível médio real** a leitura inverte; pontas suavizadas reduzem o efeito Lula a ~0 | S5, S8 | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO + teste de métrica** |
| P5 | "Dólar real" só com IPCA ≠ taxa de câmbio real (IPEA/BCB/BIS) | Teste com CPI EUA: B +10,7% vs +31,0% | **PRECISA DE CORREÇÃO** (rótulo/descrição) |
| P6 | "Preço médio nacional (ANP)" é média simples própria; ANP publica média nacional **ponderada por volume desde 2004** | Documentação ANP | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (+ teste contra série oficial, não feito) |
| P7 | Grade de 10.626 combinações só varia pesos; resultado decorre de dominância; nome "robustez" sem qualificação | §6 | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** (terminologia) |
| P8 | Trabalho: regra "taxas = média" decide a leitura; desocupação/subutilização redundantes; rendimento com efeito de composição, coleta telefônica e reponderação jul/2025 | Alternativa gravada: soma 0 | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** |
| P9 | Agregação por sinais perde magnitude; tolerância não testada | Handbook p. 102–103 | **NÃO HÁ LITERATURA SUFICIENTE** para sustentar exatamente; **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** |
| P10 | IPCA vs INPC no salário mínimo | SIDRA 1736 | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** |
| P11 | PIB: média aritmética; 4 vs 3 anos; efeito de base 2020/2021 | Simulação | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** |
| P12 | Selic: meta ≠ efetiva; média dos dias úteis sem respaldo; juro real ausente | BCB SGS | **NÃO HÁ LITERATURA SUFICIENTE** / documentação |
| P13 | Ibovespa nominal (já é retorno total); sem versão real | B3 | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** |
| P14 | Encadeamento de subitens IPCA na quebra jan/2020 sem verificação de equivalência de subitens | IBGE 2020 | **CORRETO, MAS PRECISA MELHOR DOCUMENTAÇÃO** |

Itens CORRETOS sem ressalva: variação % ponta a ponta (aritmética elementar — **não precisa de artigo**); distinção pontos percentuais vs variação % de taxas; descrição de que alimentos são índice e não R$; leitura do 4º trimestre como taxa anual (IBGE, OECD); regra de PNAD só com trimestres inteiros; mês-base dinâmico.

---

## 9. Correções recomendadas

Para cada uma: problema · apoio · como é hoje · como poderia ser · impacto · muda a conclusão? · vale a pena?

**R1 — IPCA em 12 meses desde 2019.**
Problema: P1. Apoio: documentação do projeto e dados SIDRA (não é questão de literatura). Hoje: série começa em jan/2020. Poderia: baixar IPCA desde 2018 (`ipca >= 2018-01-01`) e recalcular. Impacto: média B 6,95 → 6,14 (completo); igual duração 7,02 → 6,13; Lula 4,61 inalterado. Muda a conclusão? **Não** (Lula segue com média menor), mas reduz a diferença de 2,3 para 1,5 p.p. **Vale muito a pena** (corrige comparação de janelas desiguais).

**R2 — Tratar a série "litros por SM" na dimensão Renda.**
Problema: P2. Apoio: Handbook p. 32 (dupla contagem). Hoje: entra em Renda como Tipo A e cancela SM real. Poderia: (a) Tipo C (descritiva); (b) deixar só SM real em Renda. Impacto: Renda passa de **empate** para **Lula** (−4,02% vs +6,15%) no período completo; síntese 80 → 100 de 100 (pesos iguais); grade 10.625 → 10.626. Muda a conclusão? **Reforça** Lula, o que **exige registro explícito** (a correção favorece um lado: deve ser justificada por dupla contagem, não por resultado). Vale a pena.

**R3 — Custo de vida: redundância diesel/S10 e ponderação.**
Problema: P3. Apoio: Handbook p. 32, Becker 2017, IBGE (pesos). Hoje: 11 séries, mediana. Poderia: remover S10 (ou fundi-lo ao diesel) e documentar o diesel como item de insumo/contexto; opcionalmente apresentar também a média ponderada pelo IPCA. Impacto: leitura **igual** em todos os esquemas; magnitudes mudam (Lula f 9,84 → 10,46 sem S10). Muda a conclusão? **Não.** Vale a pena, é de baixo custo e remove a crítica mais óbvia.

**R4 — Documentar e testar a métrica de Custo de vida.**
Problema: P4. Apoio: Handbook Passo 8 (fontes de incerteza incluem normalização/métrica). Hoje: só trajetória. Poderia: acrescentar painel "métrica alternativa (nível médio real; pontas suavizadas)" como transparência (como já se faz em Trabalho). Impacto: expõe que a conclusão de Custo de vida **depende** da pergunta (trajetória vs nível). Muda a conclusão? **Potencialmente** (em nível, inverte). **Vale a pena — é o ponto de maior consequência desta auditoria.** Decisão editorial necessária: qual pergunta o projeto quer responder (a pergunta atual — "qual período teve menor pressão" — ambígua entre trajetória e nível).

**R5 — Renomear "dólar real".**
Problema: P5. Apoio: IPEA, nota da taxa de câmbio efetiva real. Poderia: "dólar a preços constantes de ago/2026" ou incluir CPI EUA. Impacto: números do dólar "real" no site (B +10,7% / L −15,5% hoje; com CPI EUA B +31,0% / L −6,0%). Tipo B, fora da síntese → **não muda conclusões**. Vale a pena (precisão terminológica).

**R6 — Descrição da média da ANP.**
Problema: P6. Apoio: ANP. Poderia: renomear + comparar com a série oficial ponderada. Impacto: **desconhecido** (teste não feito). Vale a pena testar antes de decidir.

**R7 — Terminologia do teste de pesos.**
Problema: P7. Poderia: "análise de sensibilidade aos pesos"; frase: "a conclusão é estável sob qualquer ponderação porque nenhuma dimensão aponta para o outro período"; referência SMAA e Handbook. Impacto: nenhum número muda. Vale a pena (honestidade do rótulo).

**R8 — Teste de sensibilidade à tolerância e à regra de métrica de Trabalho.**
Problemas: P8/P9. Poderia: exibir leitura com tolerâncias 0,5/2,0 e a leitura de Trabalho nas duas regras (já existe a alternativa gravada). Impacto: Trabalho muda de Lula para **empate** na regra alternativa. Muda a conclusão? Parcialmente (reduz um voto). Vale a pena exibir.

**R9 — Documentação adicional (IPCA vs INPC; PIB geométrico/acumulado; juro real; Ibovespa real; composição do rendimento; datas de coleta).** Impactos: nenhum nos veredictos; melhoram auditabilidade. Vale a pena, em ordem de custo.

**R10 — Auditar os subitens do IPCA entre as tabelas 1419 e 7060** (quebra jan/2020). Impacto: desconhecido. Vale a pena fazer uma vez.

---

## 10. Impacto das correções nos resultados

**Pergunta: se aplicarmos o método recomendado, o que acontece com os números do CUSTAVA QUANTO?**

| Item | Antes | Depois | Muda a leitura? |
|---|---|---|---|
| IPCA 12m, completo (média) | B 6,95 / L 4,61 | **B 6,14** / L 4,61 | Não (ainda Lula) |
| IPCA 12m, igual duração | B 7,02 / L 4,61 | **B 6,13** / L 4,61 | Não |
| Custo de vida sem S10 (f B / f L) | −34,80 / +9,84 | −30,69 / +10,46 | Não |
| Custo de vida média ponderada IPCA | — | −10,13 / −2,21 | Não (direção); ambos com alta real |
| Renda sem litros/SM (f B / f L) | +0,83 / +0,89 (empate) | −4,02 / +6,15 | **Sim: empate → Lula** |
| Síntese pesos iguais (completo) | soma 80/100 | soma 100/100 | Mesmo lado |
| Grade 10.626 (completo) | 10.625 / 0 / 1 | 10.626 / 0 / 0 | Mesmo lado |
| PIB, média geométrica (completo) | B 1,43 / L 2,97 | B 1,38 / L 2,97 | Não |
| SM real com INPC | −4,02% / +6,15% | −5,20% / +7,39% | Não |
| Custo de vida por nível médio real | Lula (trajetória) | **Lula 2,5% mais caro → Bolsonaro** | **Sim** |
| Trabalho, regra alternativa | 3 a 0 Lula | soma 0 (empate) | **Sim: Lula → empate** |
| Grade com C. vida invertido | 10.625 / 0 / 1 | 8.910 / 1.430 / 286 | Perde unanimidade |
| Dólar "real" (Bolsonaro / Lula) | +10,7% / −15,5% | +31,0% / −6,0% (câmbio real) | Fora da síntese |
| Ibovespa real (mensal) | nominal +12,7% / +56,4% | real −10,9% / +33,4% | Fora da síntese |
| Juro real ex-post | Selic 6,50 / 13,20 | −0,26% / +8,21% | Fora da síntese |

**Efeitos sobre textos e gráficos:** a Parte 10 (sensibilidade) teria o texto da grade reescrito (R7), números de Renda e IPCA atualizados (R1, R2); a Parte 11 (conclusões) hoje afirma ausência de dimensão para Bolsonaro; **com R4/R8 expostos como transparência (não como regra de leitura)** o texto precisaria reconhecer que duas dimensões (Custo de vida e Trabalho) têm leitura dependente da métrica. Gráficos de dólar real (R5) mudam de rótulo; os demais não mudam de forma, exceto o de IPCA 12m (série passa a começar em jan/2019).

**Leitura final do impacto.** O resultado qualitativo da síntese (Lula nas dimensões com critério definido) é **estável aos erros corrigíveis** (R1, R2, R3) e **instável a uma escolha de métrica** (R4) e à regra de Trabalho (R8). A Análise continua sendo defensável como **descrição transparente sob regras pré-declaradas**; o que a literatura **não** sustenta é apresentá-la como um índice composto validado ou chamar a grade de prova de robustez.

---

## 11. Bibliografia

Selo: **[CR]** DOI conferido no Crossref por mim · **[TEXTO]** lido na íntegra por um pesquisador · **[RESUMO]** só resumo · **[NV]** não verificado. "Fundamenta" = parte do método que a referência sustenta, nos limites do selo.

### 11.1 Índices compostos, pesos, sensibilidade, MCDA

1. Nardo, M.; Saisana, M.; Saltelli, A.; Tarantola, S.; Hoffmann, A.; Giovannini, E. (2008). *Handbook on Constructing Composite Indicators: Methodology and User Guide*. OECD/JRC. DOI 10.1787/9789264043466-en. https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/08/handbook-on-constructing-composite-indicators-methodology-and-user-guide_g1gh9301/9789264043466-en.pdf [CR][TEXTO]. **Fundamenta:** dupla contagem (p. 32), pesos como trade-offs, agregação por contagem e suas perdas (p. 102–103), vocabulário de sensibilidade e robustez (Passo 8). **Não** fundamenta mediana como agregador.
2. Saisana, M.; Saltelli, A.; Tarantola, S. (2005). Uncertainty and sensitivity analysis techniques as tools for the quality assessment of composite indicators. *JRSS A* 168(2). DOI 10.1111/j.1467-985x.2005.00350.x [CR][NV volume/páginas]. **Fundamenta:** padrão de incerteza/sensibilidade global (contexto).
3. Becker, W.; Saisana, M.; Paruolo, P.; Vandecasteele, I. (2017). Weights and importance in composite indicators: Closing the gap. *Ecological Indicators* 80:12–22. DOI 10.1016/j.ecolind.2017.03.056 [CR][RESUMO]. **Fundamenta:** pesos nominais ≠ importância efetiva.
4. Paruolo, P.; Saisana, M.; Saltelli, A. (2013). Ratings and rankings: voodoo or science? *JRSS A* 176(3):609–634. DOI 10.1111/j.1467-985x.2012.01059.x [CR (data online 2012)][RESUMO]. **Fundamenta:** idem.
5. Greco, S.; Ishizaka, A.; Tasiou, M.; Torrisi, G. (2019). On the methodological framework of composite indices: a review of the issues of weighting, aggregation, and robustness. *Social Indicators Research* 141(1):61–94. DOI 10.1007/s11205-017-1832-9 [CR (online 2018)][RESUMO]. **Fundamenta:** contexto; "robustez" como etapa final. *(O título "Robustness and sensitivity of weighting and aggregation…" informado no pedido não existe nesse formato.)*
6. Munda, G.; Nardo, M. (2009). Noncompensatory/nonlinear composite indicators for ranking countries: a defensible setting. *Applied Economics* 41(12):1513–1523. DOI 10.1080/00036840601019364 [CR][RESUMO]. **Fundamenta parcialmente:** agregação não compensatória.
7. Mazziotta, M.; Pareto, A. (2013). Methods for constructing composite indices: one for all or all for one? *Rivista Italiana di Economia Demografia e Statistica* 67(2):67–80. Sem DOI. https://www.istat.it/en/files/2013/12/Rivista2013_Mazziotta_Pareto.pdf [TEXTO]. **Fundamenta:** escolha de normalização; redundância. **Não** trata de mediana nem de sensibilidade.
8. Lindén, D.; Cinelli, M.; Spada, M.; Becker, W.; Gasser, P.; Burgherr, P. (2021). A framework based on statistical analysis and stakeholders' preferences to inform weighting in composite indicators. *Environmental Modelling & Software* 145:105208. DOI 10.1016/j.envsoft.2021.105208 [CR][conteúdo não lido]. **Só contexto.**
9. Luzzati, T.; Gucciardi, G. (2015). A non-simplistic approach to composite indicators and rankings. *Ecological Economics* 113:25–38. DOI 10.1016/j.ecolecon.2015.02.018 [CR][RESUMO]. **Fundamenta parcialmente:** reportar frequência de resultados sob muitas construções.
10. Permanyer, I. (2011). Assessing the robustness of composite indices rankings. *Review of Income and Wealth* 57(2):306–326. DOI 10.1111/j.1475-4991.2011.00442.x [CR][conteúdo não lido]. **Só contexto.**
11. Saltelli, A.; Annoni, P. (2010). How to avoid a perfunctory sensitivity analysis. *Environmental Modelling & Software* 25:1508–1517. DOI 10.1016/j.envsoft.2010.04.012 [CR][RESUMO]. **Fundamenta:** crítica a sensibilidade que varia um fator só.
12. Saltelli, A.; Ratto, M.; Andres, T.; Campolongo, F.; Cariboni, J.; Gatelli, D.; Saisana, M.; Tarantola, S. (2008). *Global Sensitivity Analysis: The Primer*. Wiley. DOI 10.1002/9780470725184 [CR].
13. Mareschal, B. (1988). Weight stability intervals in multicriteria decision aid. *EJOR* 33(1). DOI 10.1016/0377-2217(88)90254-8 [CR][NV páginas].
14. Triantaphyllou, E.; Sánchez, A. (1997). A sensitivity analysis approach for some deterministic multi-criteria decision-making methods. *Decision Sciences* 28(1). DOI 10.1111/j.1540-5915.1997.tb01306.x [CR][NV páginas].
15. Lahdelma, R.; Hokkanen, J.; Salminen, P. (1998). SMAA – Stochastic multiobjective acceptability analysis. *EJOR*. DOI 10.1016/s0377-2217(97)00163-x [CR]. · Lahdelma, R.; Salminen, P. (2001). SMAA-2. *Operations Research* 49(3):444–454. DOI 10.1287/opre.49.3.444.11220 [CR]. · Tervonen, T.; Lahdelma, R. (2007). Implementing stochastic multicriteria acceptability analysis. *EJOR* 178(2):500–513. DOI 10.1016/j.ejor.2005.12.037 [CR]. **Fundamentam:** enumerar/amostrar o simplex de pesos e reportar aceitabilidade.
16. Ding, Fu, Lai & Leung (2017). Using ranked weights and acceptability analysis to construct composite indicators. *Social Indicators Research* 139:871–885. DOI 10.1007/s11205-017-1765-3 [CR][resumo não lido].
17. Roy, B. (1991). The outranking approach and the foundations of ELECTRE methods. *Theory and Decision* 31:49–73. DOI 10.1007/bf00134132 [CR]. · Brans, J.P.; Vincke, P. (1985). A preference ranking organisation method. *Management Science* 31(6):647–656. DOI 10.1287/mnsc.31.6.647 [CR]. **Fundamentam parcialmente:** limiar de indiferença (conceito).
18. Bryan, M.; Cecchetti, S. (1993). Measuring core inflation. NBER WP 4303. DOI 10.3386/w4303 [CR][publicação de 1994 em Mankiw (org.) NV]. **Fundamenta parcialmente:** mediana/média aparada **ponderadas** de variações de preços.
19. Freudenberg, M. (2003). *Composite indicators of country performance: a critical assessment*. OECD STI WP 2003/16. DOI 10.1787/405566708255 [CR (autor ausente no registro)][conteúdo não lido]. **Só contexto.**

### 11.2 Preços, deflação, salário real

20. IBGE (2020, 8ª ed.). *Sistema Nacional de Índices de Preços ao Consumidor: métodos de cálculo*. Série Relatórios Metodológicos v. 14. https://biblioteca.ibge.gov.br/visualizacao/livros/liv101767.pdf [TEXTO]. **Fundamenta:** deflator, números-índice, Lowe/Jevons, encadeamento e quebra de pesos.
21. ILO/IMF/OECD/Eurostat/UN/World Bank (2004; 2020). *Consumer Price Index Manual*. https://www.imf.org/-/media/files/data/cpi/cpi-manual-concepts-and-methods.pdf [RESUMO]. **Fundamenta parcialmente:** encadeamento com sobreposição.
22. Yuba, T.; Sarti, F.; Campino, A.; Carmo, H. (2013). Evolução dos preços relativos de grupos alimentares entre 1939 e 2010, em São Paulo, SP. *Rev. Saúde Pública* 47(3):549–559. DOI 10.1590/s0034-8910.2013047004073. https://www.scielo.br/j/rsp/a/WKHqBzLCywWmMcQNHFJ4FWf/?lang=pt [CR][TEXTO]. **Fundamenta:** preço real de alimento por índice geral; encadeamento.
23. Ertel, Y. (2022). Análise do poder de compra do salário-mínimo… *Perspectiva Econômica* 18(1):10–24. https://revistas.unisinos.br/index.php/perspectiva_economica/article/download/23965/60749494/60799623 [TEXTO]; DOI impresso 10.4013/pe.2022.181.02 **não resolve no Crossref [NV]**. **Fundamenta:** SM × IPCA (SIDRA 1737), mês-base escolhido.
24. IPEA. *Ipeadata – Salário mínimo real* (GAC12_SALMINRE12). http://ipeadata.gov.br/ExibeSerie.aspx?serid=37667&module=M [RESUMO]. **Fundamenta:** mês-base dinâmico; deflator INPC.
25. DIEESE (2025). *Nota Técnica 283* — https://www.dieese.org.br/notatecnica/2025/notaTec283salarioMinimo.pdf [RESUMO]; *Metodologia da Pesquisa Nacional da Cesta Básica de Alimentos* — https://www.dieese.org.br/metodologia/metodologiaCestaBasica2025.pdf [TEXTO]. **Fundamentam:** razão SM/preço e média simples de cotações.
26. Corseuil, C.H.; Foguel, M.N. *Uma sugestão de deflatores para rendas obtidas a partir de algumas pesquisas domiciliares do IBGE*. IPEA, Nota Técnica. https://repositorio.ipea.gov.br/server/api/core/bitstreams/e0c259b1-ec99-4403-84a7-d871b1e4ca22/content [RESUMO][ano e DOI NV].
27. Taioka, T.; Bittes Terra, F.H. (2024; fasc. 2025). An empirical analysis of the relationship between real wage appreciation and inflation in Brazil. *J. Post Keynesian Economics* 48(1):103–123. DOI 10.1080/01603477.2024.2366798 [CR][RESUMO]. **Só contexto; não fundamenta o método.**
28. Gomes, L. (2024). Salário real e conflito distributivo na economia brasileira de 2010 a 2019. *Rev. de Economia Contemporânea* 28, e242801. https://revistas.ufrj.br/index.php/rec/article/view/64878 [TEXTO]; DOI impresso 10.1590/19805527242801 **não resolve no Crossref [NV]**. **Só contexto.**
29. Mazali, A.A.; Divino, J.A. (2010). Real wage rigidity and the new Phillips curve: the Brazilian case. *Rev. Brasileira de Economia* 64(3). DOI 10.1590/S0034-71402010000300005 [CR (periódico divergente no registro)][RESUMO]. **Não fundamenta o método.**
30. Rodrigues & Costa. *Impacto dos preços dos alimentos na segurança alimentar nos domicílios brasileiros durante 2017-2018* (trabalho de evento, BRSA, sem DOI) [RESUMO]. O título "Preços de alimentos e segurança alimentar: evidências para os domicílios brasileiros" **não foi encontrado [NV]**; o mais próximo **não** trata de deflação.

### 11.3 Combustíveis, câmbio, juros, bolsa

31. ANP. *Informações sobre o levantamento de preços de combustíveis*. https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis [RESUMO]. **Fundamenta:** coleta; média municipal simples; média nacional **ponderada** desde 2004.
32. ANP/Análise & Síntese (2020). *Metodologia resumida do LPC*. https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/arquivos-metodologia/metodologia-pesquisa-publica-resumida-09082020.pdf [TEXTO].
33. da Silva, Vasconcelos, Vasconcelos & de Mattos (2014). Symmetric transmission of prices in the retail gasoline market in Brazil. *Energy Economics* 43:11–21. DOI 10.1016/j.eneco.2014.02.002 [CR]. **Só contexto (LPC como fonte).**
34. Working, H. (1960). *Econometrica* 28(4):916. DOI 10.2307/1907574 [CR via pesquisador] · Rossana & Seater (1995). *JBES* 13(4):441–451. DOI 10.1080/07350015.1995.10524618 [CR via pesquisador, método não lido]. **Só contexto (agregação temporal).**
35. Mattioli, G.; Wadud, Z.; Lucas, K. (2018). Vulnerability to fuel price increases in the UK. *Transportation Research A* 113:227–242. DOI 10.1016/j.tra.2018.04.002 [CR]. **Só contexto.**
36. Ashenfelter, O.; Jurajda, S. (2001). Cross-country comparisons of wage rates: the Big Mac index. Princeton IRS WP [RESUMO; sem revisão por pares] · Ashenfelter & Jurajda (2024). The U.S. low-wage structure: a McWage comparison. NBER WP 32708. DOI 10.3386/w32708 [CR]. **Fundamentam parcialmente:** salário em unidades de uma mercadoria.
37. IPEA/Ipeadata. *Taxa de câmbio efetiva real – Nota metodológica* (2018). http://www.ipeadata.gov.br/doc/Nota%20Metodol%C3%B3gica%20-%20tx%20de%20cambio%20efetiva%20real.pdf [TEXTO]. **Fundamenta:** definição de câmbio real.
38. Araújo, E.; Caldarelli, C.; Cortapasso (2023). Padrões da transmissão cambial para taxa de inflação no Brasil. *Nova Economia* 33(2):363–392. DOI 10.1590/0103-6351/7570 [CR][leitura parcial]. **Só contexto.**
39. Salomão Neto & Alves (2025). Efeitos assimétricos do câmbio para a inflação: evidência via NARDL para o Brasil. *Braz. J. Political Economy* 45(3):619–640. DOI 10.1590/0101-31572025-3679 [CR][RESUMO]. **Só contexto.**
40. Rogoff, K. (1996). The purchasing power parity puzzle. *JEL* 34(2) [NV DOI] · Klau, M.; Fung, S.S. (2006). The new BIS effective exchange rate indices. *BIS Quarterly Review*, março [NV texto]. **Só contexto conceitual.**
41. BCB. *Metadados SGS – Taxas Selic* (séries 11, 432, 1178, 4189). https://www4.bcb.gov.br/pec/series/port/metadados/mg45p.htm [TEXTO]. **Fundamenta:** meta vs efetiva.
42. Perrelli, R.; Roache, S. (2014). Time-varying neutral interest rate – the case of Brazil. IMF WP/14/84. DOI 10.5089/9781484385210.001 [CR][método não lido]. **Fundamenta parcialmente:** juro real/neutro.
43. B3 (2020). *Metodologia do Índice Bovespa*. https://www.b3.com.br/data/files/9C/15/76/F6/3F6947102255C247AC094EA8/IBOV-Metodologia-pt-br__Novo_.pdf [TEXTO]. **Fundamenta:** retorno total; critérios.
44. Araújo, G.S.; Brito, R.; Sanvicente, A.Z. (2021). Long-term stock returns in Brazil: volatile equity returns for U.S.-like investors. *Int. J. Finance & Economics* 26(4):6249–6263. DOI 10.1002/ijfe.2118 [CR][TEXTO via WP BCB 525]. **Fundamenta:** Ibovespa como retorno total; deflação.
45. Serra, R.G.; Saito, R.; Fávero, L.P. (2016). Nova metodologia do Ibovespa, betas e poder explicativo dos retornos das ações. *Rev. de Contabilidade e Organizações* 10(27). DOI 10.11606/rco.v10i27.111708 [CR][RESUMO]. **Só contexto (quebra de 2014).**

### 11.4 PIB, trabalho, inflação

46. IBGE (2004). *Contas Nacionais Trimestrais*, Série Relatórios Metodológicos v. 28 (1ª ed.). https://ftp.ibge.gov.br/Contas_Nacionais/Contas_Nacionais_Trimestrais/Metodologia_da_Pesquisa/Series_Relatorios_Metodologicos_1a_edicao.pdf [TEXTO; edição atual não conferida].
47. OECD (2026). *Quarterly National Accounts – GDP Growth Methodology*. https://www.oecd-ilibrary.org/content/dam/oecd/en/data/methods/OECD-Quarterly-GDP-Growth-Methodology.pdf [TEXTO]. · UN et al. (2009), SNA 2008 cap. 15; IMF (2017), QNA Manual cap. 8 [RESUMO]. · OECD (2024), *Compendium of Productivity Indicators*, DOI 10.1787/b96cd88a-en [CR][TEXTO — **não** sustenta média aritmética/geométrica].
48. CECON/Unicamp, *Dimensões da economia brasileira: renda, emprego e desigualdade nos governos Lula a Bolsonaro* (Nota do CECON nº 19) [RESUMO]; Balassiano & Pessoa (2021), Blog do IBRE/FGV [lido; blog]. **Só contexto.**
49. IBGE. *Medidas de subutilização da força de trabalho* (4T/2023); Nota técnica 02/2022; aviso de reponderação PNAD Contínua (jul/2025) [TEXTO/RESUMO]. **Fundamentam:** conceitos, coleta telefônica, reponderação.
50. BCB. *Estudo Especial nº 109/2021 – Estimativas da PNAD Contínua ajustadas para a redução da taxa de respostas na pandemia* [TEXTO]. · Corseuil, C.H.; Russo, F. (2022), IPEA [RESUMO]. · Al Masri, D.; Flamini, V.; Toscani, F. (2021), IMF WP/21/66, DOI 10.5089/9781513571645.001 [CR]. · Firpo, S.; Portella, A. (2024), *IZA World of Labor*, DOI 10.15185/izawol.441.v2 [CR (autores completos NV)].
51. Bacciotti, R.; Marçal, E.F. (2020). Taxa de desemprego no Brasil em quatro décadas… *Estudos Econômicos* 50(3):513–534. DOI 10.1590/0101-41615035rbe [CR]. · Reis, M.C. (2020). As consequências do desemprego para os rendimentos de reemprego… *Estudos Econômicos* 50(4):705–732. DOI 10.1590/0101-41615045mcr [CR]. **Só contexto.**
52. Hansen, L.P.; Hodrick, R.J. (1980). *JPE*. DOI 10.1086/260910 [CR] · Newey, W.K.; West, K.D. (1987). *Econometrica*. DOI 10.2307/1913610 [CR]. **Só contexto (sobreposição).**

### 11.5 Referências pedidas que NÃO foram confirmadas

- "Preços de alimentos e segurança alimentar: evidências para os domicílios brasileiros" — título não encontrado.
- Greco et al. "Robustness and sensitivity of weighting and aggregation in constructing composite indices" — título não existe nesse formato (o real é o item 5).
- Títulos em inglês de Bacciotti & Marçal e de Reis ("The consequences of unemployment on labor earnings in Brazil") — não encontrados; os artigos existem em português (itens 51).
- Artigo com "mediana não ponderada de séries heterogêneas como agregador" — não encontrado.
- Artigo com "voto ±1/0 por dimensão + soma ponderada + grade exaustiva de pesos" — não encontrado. **Não encontramos literatura suficiente para sustentar exatamente essa implementação.**

---

## Apêndice — Reprodução

`python docs/auditoria_simulacoes.py` (somente leitura; requer rede apenas para o IPCA de 2018 e os pesos do IPCA no SIDRA). As simulações de juro real, Ibovespa real, câmbio real com CPI dos EUA (FRED) e SM com INPC (SIDRA 1736) foram rodadas ad hoc e **não** estão no script; se este relatório for aprovado, entram na etapa 2.

**Etapa 2 (implementação): concluída em 01/10/2026 (metodologia v1.3.0); etapa 3 (pendências e auditoria final): concluída em 01/10/2026 (v1.4.0).** Ver as seções "Etapa 2" e "Etapa 3" no fim deste arquivo.

---

# Decision Matrix — R1 to R10

Added 01/10/2026 at the request of the project owner. This section is **appended**; nothing above it was altered. Language: English, as requested. **Nothing has been implemented: no code, data, JSON, dashboard or existing documentation was modified.** New numbers below come from `docs/auditoria_simulacoes.py` (function `custo_vida_lado_a_lado`) and from ad hoc runs listed in the Appendix.

## 0. Conventions

**Problem type** (each item gets one or more):
- **T1** definite methodological error · **T2** defensible choice that needs better documentation · **T3** choice where the literature supports several alternatives · **T4** terminology/labeling problem · **T5** data-source problem · **T6** could materially change the analytical conclusion.

**Decision**: **FIX NOW** · **DOCUMENT ONLY** · **INVESTIGATE FURTHER** · **DO NOT CHANGE**.

**Numbering.** R1–R8 and R10 keep the meaning they had in §9. **R9 is narrowed to "real minimum wage calculation"** (it was a bundle). R3 is split into R3a/R3b. Items that §9 did not number (weighting and aggregation, GDP, Selic, Ibovespa, PNAD composition, data-source gaps) are listed as **A1–A8** in §2, with the same columns and decision labels, so the matrix is complete.

**Crosswalk of the ten points you asked me to pay attention to:**

| Your point | Where |
|---|---|
| 1. IPCA 12-month coverage | R1 |
| 2. Gasoline liters per minimum wage | R2 |
| 3. "Real dollar" terminology | R5 (see erratum E1: the site does not use the phrase "dólar real") |
| 4. ANP simple vs volume-weighted average | R6 (now quantified with the official ANP file) |
| 5. Trajectory vs average real price level | R4 and §3 (side-by-side simulation) |
| 6. Composite cost-of-living dimension | R3a, R3b |
| 7. Weighting and aggregation | A1, A2, A3 |
| 8. The 10,626 weight combinations | R7 |
| 9. Minimum-wage real calculation | R9 |
| 10. Any other issue | R8, R10, A4–A8 |

## 1. Decision matrix

| ID | Issue | Current Method | Recommended Method | Evidence | Why It Matters | Impact on Results | Recommended Action |
|----|-------|----------------|--------------------|----------|----------------|-------------------|--------------------|
| **R1** | **IPCA 12-month coverage.** Types: **T1** (windows cover unequal spans), **T5** (pipeline filter, not a source limit). | `download_ibge.py` keeps IPCA only from Jan/2019, so 12-month rates exist from Jan/2020. Bolsonaro mean covers 36 months, Lula 44. A code comment in `build_dashboard_data.py` says the full history is used; it is not. | Download the IPCA index from at least Jan/2018 so the 12-month rate exists for all of 2019; recompute the mean. | SIDRA table 1737 has 2018 values (fetched). IBGE (2020) defines the index and base. No literature needed: this is window definition. | The period's low-inflation first year (2019: 4.31% in December) is dropped from one side only. | Completo: Bolsonaro mean **6.95 → 6.14**; Lula 4.61 unchanged; gap **2.34 → 1.53 p.p.** Equal duration (44 months): Bolsonaro **7.02 → 6.13**; gap **2.41 → 1.52 p.p.** Reading unchanged (Lula lower). Synthesis unchanged. Series gains 12 points (36 → 48). | **FIX NOW** |
| **R2** | **Gasoline liters per minimum wage inside Renda.** Types: **T1** (double counting inside the composite), **T6** (moves Renda from tie to Lula). The indicator as a descriptive chart is **T2**. | Type A series in Renda next to real minimum wage; Renda = median of 2 (= mean). Liters = SM nominal ÷ price nominal = **SM real ÷ gasoline real price** (checked: 244.336 = 244.338). Gasoline real price already votes in Cost of living. | Keep the chart as descriptive (Type C) and let Renda be decided by real minimum wage alone; or keep both and disclose the identity. Two ways to remove the duplicate exist (see impact). | Identity verified numerically. OECD/JRC Handbook: double counting from correlated indicators (full text read by a verifier). DIEESE and Ashenfelter & Jurajda support the ratio only as a descriptive concept, not as a component. | Renda's tie is **produced by** the duplicate: SM real B −4.02 / L +6.15 cancels against liters B +5.67 / L −4.38. | Renda completo: f **B 0.83 / L 0.89 (tie) → B −4.02 / L +6.15 (Lula)**. Equal-weight synthesis **+4/5 → +5/5** signs (score 80 → 100 of 100). Grid **10,625/0/1 → 10,626/0/0**. Equal duration: no change (Renda already Lula). **Symmetric alternative** (drop gasoline from Cost of living instead, keep liters): Cost of living f B −35.30 / L +10.46 (Lula, unchanged); Renda stays a tie. | **FIX NOW**, but only after your editorial sign-off. It is the one fix that moves a reading toward a single side; the stated reason must be double counting, not the result. |
| **R3a** | **Diesel and Diesel S10 duplicate each other in Cost of living.** Type: **T1** (redundant series). | Both in the 11-series median. Correlation of monthly real changes = **1.00**; both map to IPCA subitem 7659 (weight 0.29%). | Keep one diesel series (document which). | Computed correlation matrix; IPCA weights (SIDRA v. 66, Dec/2022). Handbook and Freudenberg (2003) state the double-counting principle (full text read by a verifier). | Two of 11 median positions carry the same information. | Median f: **B −34.80 → −30.69; L +9.84 → +10.46**. Reading unchanged (Lula). Synthesis and grid unchanged. | **FIX NOW** |
| **R3b** | **Construction of the composite Cost-of-living dimension.** Types: **T3**, **T2**. | Unweighted median of 11 real variations (5 fuels + 6 food indices), tolerance 1.0 point. Diesel (0.29% of IPCA) counts like gasoline (4.70%) and rice (0.59%). | No change to the primary rule yet. Show, as a complementary view, an IPCA-weighted mean. | Handbook and Mazziotta & Pareto: **median as a subindicator aggregator not found** in the full texts read. Bryan & Cecchetti (1994): median and trimmed mean are weighted by expenditure shares (full chapter read). BCB TD 356: core measures use IPCA weights. No source found for an unweighted median of heterogeneous series. | Weights are a value judgment either way; the current rule is transparent but has no literature behind it. | Alternatives all read **Lula**: drop S10 (+10.46), drop both diesels (+9.84), foods only (+4.69), fuels only (+9.84), simple mean (+4.82), mean of two group medians (+7.57), **IPCA-weighted mean f B −10.13 / L −2.21** (both periods rose in real terms). | **INVESTIGATE FURTHER** (weights exist only for the 11 items and change in Jan/2020) and **DOCUMENT ONLY** that no literature supports the unweighted median |
| **R4** | **Cost of living: trajectory (start → end) vs average real price level.** Types: **T3**, **T6**, **T2**. | Variation of the real price from the window's first to last month; median across series. | Keep as primary; document that it answers a "change" question; add the level view as a complementary panel. See §3. | Handbook: the metric/normalization is one of the listed sources of uncertainty. No source decides trajectory vs level. | The two metrics give **opposite** readings for this dimension. | Completo, 11 series: trajectory **B +34.80% / L −9.84% (Lula)**; mean level (base 100) **B 98.81 / L 101.29 (Bolsonaro, +2.48)**; median level **94.74 / 101.88 (Bolsonaro, +7.14)**. Grid with Cost of living flipped: **8,910 / 1,430 / 286** (L/B/tie). | **DOCUMENT ONLY** for the primary metric (**DO NOT CHANGE** it); the complementary level panel is **INVESTIGATE FURTHER** (design) |
| **R5** | **Dollar: nominal vs "inflation-corrected" vs conventional real exchange rate.** Types: **T4**, **T2**. | The Dollar chart has a "Corrigido pela inflação" toggle: PTAX × IPCA_ref ÷ IPCA_t (domestic IPCA only). Code field is `preco_real`. | Keep the calculation; state in the methodology that it is the dollar **in constant reais**, **not** the real exchange rate. Optionally add the conventional real rate (needs US CPI). | IPEA/Ipeadata real effective exchange rate note: real rate uses foreign over domestic prices. Rogoff (1996) and Klau & Fung (2006): see verification table. | Readers could take "corrected for inflation" as "real exchange rate". They differ by US inflation. | Jan→Dec 2019–22 / Jan/2023→Aug/2026: **Bolsonaro nominal +40.1%; constant reais +10.7%; conventional real (US CPI/IPCA) +31.0%. Lula −0.9% / −15.5% / −6.0%.** Pair USD/BRL only, FRED CPIAUCSL. Dollar is Type B: **no effect on the synthesis**. | **DOCUMENT ONLY**; adding the conventional real rate: **INVESTIGATE FURTHER** |
| **R6** | **ANP simple national average vs ANP volume-weighted national average.** Types: **T2**, **T5**. | National monthly price = simple mean of all station collections in the month (`download_anp.py`). | Describe it as "simple mean of LPC collections", not "ANP national average". Decide after the comparison below whether to adopt the official series. | ANP page: municipal mean is simple; state, regional and national levels are volume-weighted since 31/10/2004. Official monthly Brazil file (`mensal-brasil-desde-jan2013.xlsx`) **downloaded and compared**. | Different sample weighting; the official series is the reference. | Mean absolute monthly gap (project vs official): gasoline **0.39%** (max 1.25), diesel 0.67, S10 0.56, LPG 1.11, **ethanol 6.49% (max 12.0)**. Real variation B / L: gasoline −9.17 / +11.02 vs official −7.96 / +10.25; **ethanol +2.56 / −11.07 vs +7.93 / −13.64**; diesel +46.30 / −11.26 vs +46.25 / −12.45; S10 +44.80 / −8.28 vs +44.78 / −8.65; LPG +23.49 / −9.84 vs +24.59 / −10.30. Cost-of-living median with the official fuels: **B −34.80 / L +10.30** (vs +9.84). Reading unchanged. Ethanol gap **cause not investigated**. | **INVESTIGATE FURTHER** (ethanol gap) with an immediate **DOCUMENT ONLY** relabel |
| **R7** | **The 10,626 weight combinations: terminology and scope.** Types: **T4**, **T2**. | Text calls it sensitivity/robustness. It varies only weights; all five readings are ≥ 0 for Lula, so no weighting can flip the result. | Name it "sensitivity analysis to weights"; state it is a result of dominance; show what the grid would give if a dimension pointed the other way. | Handbook: "sensitivity analysis can be used to assess the robustness of composite indicators" (full text); Greco et al. (2019) treat robustness as the umbrella and uncertainty/sensitivity analysis as techniques (full text). Saltelli & Annoni and SMAA: abstract-level only (see verification table). | A reader may take 10,625/10,626 as proof that the method is robust. It only shows that no dimension favors Bolsonaro. | No number changes. Counterfactuals: current 10,625/0/1; Renda fixed (R2) 10,626/0/0; Cost of living flipped 8,910/1,430/286; flipped + R2 9,625/715/286. | **FIX NOW** (wording only) |
| **R8** | **Tolerance thresholds and the Labor-market metric rule.** Types: **T3**, **T6** (Labor). | Tolerance 1.0 point (variation %) and 0.1 (means). Labor: rates by window mean, earnings start→end; one vote per series. | Keep the pre-declared rule. Display the tolerance sensitivity and the already-computed alternative rule. | Indifference thresholds: Roy (1991) and Brans & Vincke (1985) could **not** be verified at content level; Handbook warns about arbitrary thresholds (full text). The alternative Labor reading is already in `analysis_results.json`. | The Labor reading depends on the rule; tolerance only matters near ties. | Labor alternative rule: unemployment **B −4.9 / L −3.5 p.p. (vote Bolsonaro)**, underutilization B −6.5 / L −5.8 (tie), earnings (mean) Lula → sum 0, **tie**. Tolerance on mean metrics (0.1 now): after R1 Inflation differs by 1.53 p.p. and GDP by 1.54 p.p.; **both become ties at tolerance ≥ ~1.6**. No tolerance tested produces a Bolsonaro reading. | **DOCUMENT ONLY** |
| **R9** | **Real minimum wage calculation (IPCA vs INPC; base month).** Types: **T2**, **T3**. | SM_nominal × IPCA_idx(last month) ÷ IPCA_idx(t); base month dynamic; IPCA (not INPC). | **Keep the formula.** Document IPCA vs INPC and the base month; show INPC as a sensitivity. | IBGE (2020) for the deflator mechanics; Ipeadata uses a dynamic last-month base and INPC; DIEESE uses INPC; Ertel (2022) uses IPCA/SIDRA 1737 (see verification table for access level of each). | Official minimum-wage series use INPC; the project does not say why it uses IPCA. | INPC: **B −4.02 → −5.20; L +6.15 → +7.39** (SIDRA 1736). Same direction; synthesis unchanged. | **DOCUMENT ONLY** (formula: **DO NOT CHANGE**) |
| **R10** | **Food-index chain break: tables 1419 (to 2019) and 7060 (2020 on).** Types: **T5**, **T2**. | Variations from table 1419 up to Dec/2019 and 7060 from Jan/2020, chained. | Record the link and the check. | IBGE (2020): weight structure POF 2017-18 from Jan/2020; series chained, not revised. **New check:** the six food codes and four fuel IPCA codes carry identical code and name in both tables (SIDRA fetch). | Equal names do not prove equal item definitions. | No effect measurable here. Only identity of code and name was verified. | **DOCUMENT ONLY** (low priority); deeper definition check **INVESTIGATE FURTHER** |

## 2. Additional findings outside R1–R10

| ID | Issue | Current Method | Recommended Method | Evidence | Why It Matters | Impact on Results | Recommended Action |
|----|-------|----------------|--------------------|----------|----------------|-------------------|--------------------|
| **A1** | **Nominal equal weights ≠ effective importance.** **T2**, **T3**. | 20% per dimension; Cost of living is decided by 11 correlated series, GDP by one number, Renda by two series that cancel, Labor by three votes of two near-identical phenomena. | Disclose the effective structure; no change to weights. | Paruolo et al. (2013), full text: "nominal weights are not a measure of variable importance". Becker et al. (2017): abstract only. | Equal nominal weights do not mean equal influence. | None computed. | **DOCUMENT ONLY** |
| **A2** | **Aggregation by signs discards magnitude.** **T3**, **T2**. | Each dimension → +1/0/−1. Simple count of the 18 Type A series (no tolerance, no dimensions): **16 favor Lula, 2 Bolsonaro**. | Keep; add the series count as a transparency line. | Handbook, full text: counting above/below a threshold is "simple and unaffected by outliers. However, the interval level information is lost". Munda & Nardo (2009), full text: non-compensatory aggregation, but it does not validate a weighted sum of signs. | Loses "by how much". | 16–2 series count. | **DOCUMENT ONLY** |
| **A3** | **Unweighted median inside a dimension.** **T3**. | See R3b. | See R3b. | See R3b. | | | **INVESTIGATE FURTHER** (merged with R3b) |
| **A4** | **Labor: redundancy and composition.** **T2**, **T6**. | Unemployment and underutilization carry 2 of 3 votes. Earnings are start→end, deflated by IBGE per release; phone collection Q2/2020–Q2/2021; reweighting Nov/2021 and Jul/2025. | Disclose the composition effect and the data-vintage date. | IBGE notes; Firpo & Portella (2024) on composition (see verification table). | Earnings can rise through composition without any worker earning more. | See R8. | **DOCUMENT ONLY** |
| **A5** | **GDP: arithmetic mean, 4 vs 3 years, base effect.** **T2**, **T3**. | Arithmetic mean of annual rates. | Keep; show the geometric mean and the cumulative product. | No source found choosing arithmetic or geometric. | The 2020 recession and 2021 rebound distort a mean of rates. | Completo: arithmetic **B 1.43 / L 2.97**; geometric **1.38 / 2.97**; median 2.10 / 3.20. 3 years: 0.90 / 2.97 (geometric 0.85). Same direction. | **DOCUMENT ONLY** |
| **A6** | **Selic, Ibovespa: nominal figures only.** **T2**, **T4**. | Selic target (SGS 432) daily mean; Ibovespa nominal points. | Name the series "Selic target"; add real interest rate and real Ibovespa as context. | BCB SGS metadata; B3 methodology (see verification table). | Nominal Selic hides the real rate. Both are Type B (outside the synthesis). | Ex-post real rate (monthly mean): **B −0.26% / L +8.21%** (nominal Selic mean 6.50 / 13.20). Ibovespa real, monthly series: **B −10.9% / L +33.4%** (nominal +12.7% / +56.4%). | **DOCUMENT ONLY** |
| **A7** | **ANP survey gap dates.** **T5**. | Docs say September 2020 has no survey. | Correct the text. | ANP file note: "no price survey between 18/8/20 and 17/10/20". | August and October 2020 are partial months. | Not quantified. | **INVESTIGATE FURTHER** |
| **A8** | **Minimum-wage CSV already contains future months.** **T5**. | Code only uses months with IPCA. | None now. | Last rows are Sep/2026 (R$ 1,621). | Risk if a future change drops the IPCA filter. | None today. | **DO NOT CHANGE** |

## 3. Cost of living: trajectory vs level, side by side

Both variants use the same 11 real series and the same tolerance (1.0 point). Level variant: each series is divided by its mean over **both windows pooled** (= 100), so no period is the base. Lower means lower pressure in both variants.

### 3.1 Results

| Window / series | A) Start → end variation (current) | B) Mean real level (base 100) | B') Median real level (base 100) |
|---|---|---|---|
| **Completo, 11 series** | Bolsonaro **+34.80%** · Lula **−9.84%** · diff **−44.64 p.p.** → **Lula** | Bolsonaro **98.81** · Lula **101.29** · diff **+2.48** → **Bolsonaro** | Bolsonaro **94.74** · Lula **101.88** · diff **+7.14** → **Bolsonaro** |
| Completo, 10 series (no S10) | +30.69% · −10.46% · −41.14 → Lula | 99.00 · 101.08 · +2.09 → Bolsonaro | 96.10 · 100.80 · +4.70 → Bolsonaro |
| **Equal duration (44 months), 11 series** | +39.36% · −9.84% · −49.19 → **Lula** | 98.37 · 101.63 · +3.26 → **Bolsonaro** | 94.47 · 101.67 · +7.20 → **Bolsonaro** |
| Equal duration, 10 series | +38.67% · −10.46% · −49.13 → Lula | 98.40 · 101.58 · +3.19 → Bolsonaro | 95.95 · 101.02 · +5.08 → Bolsonaro |

(The earlier text reported the per-series ratio version, median Lula/Bolsonaro − 1 = +2.51%. The pooled-base figures above are the cleaner per-period numbers; both point the same way.)

### 3.2 Effect on the five-dimension synthesis and on the 10,626 combinations

Other readings held at their current values (Inflation +1, Labor +1, Activity +1). Renda is shown as it stands today and after R2.

| Cost-of-living metric | Renda | Equal-weight signs (of 5) | Grid Lula / Bolsonaro / tie |
|---|---|---|---|
| A) trajectory (current) | tie (completo today) | **+4** (80/100) | **10,625 / 0 / 1** |
| A) trajectory | Lula (after R2) | +5 (100/100) | 10,626 / 0 / 0 |
| B) mean level | tie | **+2** (40/100) | **8,910 / 1,430 / 286** |
| B) mean level | Lula (after R2) | +3 (60/100) | 9,625 / 715 / 286 |
| B') median level | same as B | same as B | same as B |

Equal duration (44 months; Renda already Lula there): A) **+5 · 10,626/0/0**; B) and B') **+3 · 9,625/715/286**. Under B) the synthesis still points to Lula with equal weights; what changes is that **the grid is no longer unanimous**.

### 3.3 Why the two metrics differ (median of the 11 series, base 100 = pooled mean)

| Period | Level at window start | Level at window end |
|---|---|---|
| Bolsonaro | **81.8** (Jan/2019, before the 2020–22 rise) | **106.1** (Dec/2022) |
| Lula | **105.8** (Jan/2023, already on the plateau) | **103.8** (Aug/2026) |

Reading A mostly measures movement **from where each window began**. Bolsonaro's window starts low and ends high; Lula's starts high and ends slightly lower. Reading B compares the average level of the two windows, which carries the level inherited from the previous period. The per-series picture is mixed:

| Series | Mean level Lula ÷ Bolsonaro − 1 | Start→end B | Start→end L |
|---|---|---|---|
| Gasoline | −5.74% | −9.17% | +11.02% |
| Ethanol | −11.91% | +2.56% | −11.07% |
| Diesel | +8.95% | +46.30% | −11.26% |
| Diesel S10 | +8.51% | +44.80% | −8.28% |
| LPG | +1.70% | +23.49% | −9.84% |
| Rice | +9.26% | +23.74% | −17.83% |
| Coffee | **+50.62%** | +34.80% | +24.18% |
| Beef (patinho) | +2.51% | +35.80% | +5.64% |
| Beans | −12.65% | +40.43% | −13.32% |
| Milk | +5.28% | +26.57% | +3.94% |
| Soybean oil | −8.09% | +89.88% | −26.14% |

Coffee is the one series with a large level gap (+50.6%); the median across 11 series is not decided by it.

### 3.4 What question each method answers

- **A) Start → end variation:** *"Between where this period began and where it ended, how much did real prices move?"* It describes the change experienced inside each window. It depends on the starting point, which each period inherits; it does not say whether prices were high or low.
- **B) Average real level:** *"During this period, how expensive were these goods on average, in today's money?"* It describes the cost level consumers faced. It does not depend on the start point, but it inherits whatever level the previous period left.
- Neither isolates the effect of any government; that remains outside the project's scope.

### 3.5 Which metric should remain primary, and what to show as the complement

The project states its question as *"O que mudou entre os dois períodos?"* (METHODOLOGY.md), and its architecture (Era → Agora, handover → last data point, variation %) is built around **change**. By that stated question, **A) trajectory remains the primary metric**. The dimension's own wording, *"em qual período os preços tiveram menor pressão real… sobre o consumidor?"*, is ambiguous between change and level; if A stays primary, that wording should say "variação" explicitly.

**Complementary view:** B) the mean (or median) real level of each window, shown as a transparency panel (as Labor already does with its alternative rule), not as a second vote. This is a recommendation about consistency with the stated question; it is **not** a ruling that one metric is better. Whether the complementary panel should ever carry weight in the synthesis is an editorial decision for you.

## 4. Errata to earlier sections of this report

- **E1.** §3.E and P5 classified the "dólar real" as **PRECISA DE CORREÇÃO**. After reading the dashboard code: the site never uses the phrase "dólar real". The Dollar chart has a **"Corrigido pela inflação"** toggle, which accurately describes the calculation (nominal rate in constant reais). The remaining issue is **documentation** (state that it is not the real exchange rate), so the decision above is **DOCUMENT ONLY**, not a correction. The numbers in §3.E are unchanged.
- **E2.** §3.C said September/2020 has no ANP survey. The ANP file says there was **no survey between 18/8/20 and 17/10/20** (A7).
- **E3.** R10 (subitem audit) is partly resolved: codes and names are identical in tables 1419 and 7060 for all ten items. Item definitions were not compared.
- **E4.** §3.K quoted the level-metric result as the per-series ratio (+2.51%). §3 above gives the pooled-base per-period figures; the direction is the same.

## Appendix — new reproduction notes

- `python docs/auditoria_simulacoes.py` now also prints S9 (trajectory vs level, effect on synthesis and grid).
- Ad hoc runs (not in the script): ANP official file comparison (`mensal-brasil-desde-jan2013.xlsx`, downloaded from gov.br/anp; the official "óleo diesel" is diesel B S500); SM with INPC (SIDRA 1736, var. 2289); real interest rate; real Ibovespa; real exchange rate with US CPI (FRED CPIAUCSL); code/name check of IPCA subitems across tables 1419 and 7060; cost of living without gasoline.

---

## Addendum — independent re-verification (second session, 2026-10-01)

Nothing in production was touched. Re-checks were run from `data/processed`, SIDRA and the official ANP file, and `docs/auditoria_simulacoes.py` was re-run end to end (exit 0).

| Item | Result of the re-check | Effect on the matrix |
|---|---|---|
| **R1 (IPCA 12 months)** | **Confirmed.** `download_ibge.py` keeps `ano_mes >= 2019-01-01`, so the first 12-month rate is Jan/2020. Bolsonaro window = 36 months (mean 6.946); with 2019 = 48 months (6.144); Lula = 44 months (4.606). Gap 2.340 → 1.538 p.p. The comment in `build_dashboard_data.py` ("histórico completo do IPCA") contradicts the filter. | None. |
| **R1, "same duration" mode — new detail** | The *current* `mesmo_tempo` window for IPCA uses months 13–44 (**32 months**): B 7.023 / L 4.608 (recomputed, matches `analysis_results.json`). A true 44-month equal duration, after the fix, gives B 6.127 / L 4.606. The report's "44 months" refers to the post-fix state. | Wording only: say that the fix also changes the equal-duration window (32 → 44 months). |
| **R2 / R4 (liters per minimum wage)** | Formula verified: `unidades_por_salario_minimo = salario_minimo / preco_nominal` (`build_dashboard_data.py` l.190; same for the dollar, l.277). Across 91 months, the max deviation from `SM / nominal price` and from `SM_real / real price` is 0.008, which is rounding to two decimals. So liters = SM_real ÷ gasoline_real **exactly**; the series counts gasoline twice (once as a price, once in the denominator). Variations: liters B +5.67 / L −4.38; SM real B −4.02 / L +6.15; gasoline real B −9.17 / L +11.02. | Confirms the double counting (definite error in the synthesis, not in the formula). |
| **R5 (dollar terminology)** | Confirmed erratum E1. The UI says "Corrigido pela inflação" (`index.html` l.197, l.611; `app.js` l.606). The phrase "dólar real" appears nowhere in `dashboard/`, `README.md` or `scripts/`. The calculation is `cambio × (IPCA_base ÷ IPCA_t)` (`build_dashboard_data.py`, l.275), i.e. nominal exchange rate in constant reais, **not** a real exchange rate. | Labeling only; the toggle label is accurate. |
| **R3a (cost of living, trajectory vs level)** | Re-run (S9). Trajectory: B +34.80 / L −9.84. Mean level (base 100 = both periods pooled): B 98.81 / L 101.29. Median level: B 94.74 / L 101.88. Synthesis under the trajectory metric: Cost of living = Lula; under the level metric: Cost of living = Bolsonaro. Grid (all 10,626 combinations; Renda as it is today): trajectory **10,625 / 0 / 1**; level **8,910 / 1,430 / 286** (Lula / Bolsonaro / tie). With Renda fixed (R2): **10,626 / 0 / 0** vs **9,625 / 715 / 286**. In the equal-duration mode: 10,626 / 0 / 0 vs 9,625 / 715 / 286. All match the report. | None. This is the only alternative that changes any dimension's reading, so the choice is editorial and must be disclosed. |
| **R6 (ANP)** | Official file re-downloaded (`mensal-brasil-desde-jan2013.xlsx`, 91 months matched). Mean **signed** gap project − official: gasoline +0.29% (mean **absolute** 0.39%, the figure in R6), diesel +0.67, S10 +0.55, LPG +1.11, ethanol +6.49 (range +2.50 to +12.00). Real variation (project vs official), B / L: gasoline −9.17/+11.02 vs −7.96/+10.25; ethanol +2.56/−11.07 vs +7.93/−13.64; diesel +46.30/−11.26 vs +46.25/−12.45; S10 +44.80/−8.28 vs +44.78/−8.65; LPG +23.49/−9.84 vs +24.59/−10.30. All match R6. | None. |
| **R6, caveat (new)** | The official monthly file reports "number of stations surveyed" and does not say how the national average is weighted. The "volume-weighted" claim comes from the ANP methodology page (state/regional/national levels), not from the file. So the comparison measures the gap to the official series, **not** a proven effect of volume weighting. Hypothesis not tested for ethanol: its volume is concentrated in a few states, where it is cheaper, which could explain a project price that is higher. Do not state this as the cause. | Keep **INVESTIGATE FURTHER**; do not describe the gap as "caused by weighting" in any text. |
| `docs/_tmp_matriz.md` | Does not exist; the matrix lives in this file. | — |

**Reading unchanged by any re-check:** no alternative tested makes Bolsonaro the reading of Inflation, Income (SM real), Labor or Activity; the only dimension that flips is Cost of living under the mean/median-level metric (R3a).

---

# Etapa 2 — Auditoria metodológica final (01/10/2026, metodologia v1.3.0)

Estado: **implementado e testado, sem commit e sem push.** Origem das decisões: matriz R1–R10 acima, mais a reverificação independente da segunda sessão (adendo acima) e a pesquisa desta etapa. Nada foi escolhido para produzir um resultado político: as correções são as que a evidência sustenta, e as alternativas legítimas (R3a, R9, R8) foram documentadas, não escondidas.

## 1. O que foi pesquisado

- **Fontes oficiais lidas ou consultadas nesta etapa:** página da ANP sobre o levantamento de preços (texto da suspensão de 2020 e da ponderação desde 2004, citados abaixo); arquivo mensal oficial da ANP `mensal-brasil-desde-jan2013.xlsx` (notas e 91 meses de preços); API de metadados do IBGE/SIDRA (`servicodados.ibge.gov.br/api/v3/agregados/{1419,7060}/metadados`); tabelas oficiais de correspondência POF 2017-2018 × SNIPC e POF 2008-2009 × SNIPC (IBGE); índice de documentos do SNIPC; metodologia do Ibovespa, notas do Ipeadata e metadados da Selic (URLs respondendo 200).
- **Literatura:** os DOIs das referências com DOI da bibliografia (seção 11) foram **reconferidos hoje no Crossref** (38 registros conferidos; um DOI tentado para Rogoff (1996) não existe no Crossref) (título, autores, ano, periódico, volume e páginas); pesquisas novas no Crossref para afordabilidade/poder de compra, câmbio real, dupla contagem e salário mínimo; leitura do texto de Alcântara, Daier & Silva (2024).
- **Não encontrado:** artigo revisado por pares que defina "litros de gasolina por salário mínimo"; artigo que use mediana não ponderada de séries heterogêneas como agregador; artigo que sustente o voto ±1/0 por dimensão com tolerância e grade exaustiva de pesos; DOI de Rogoff (1996, *J. Economic Literature*) no Crossref.

## 2. O que foi verificado

| Item | Verificação | Resultado |
|---|---|---|
| R1 | Recalculei o IPCA 12 meses a partir do índice do SIDRA (incluindo 2018) e comparei com a série do pipeline | Idêntico, mês a mês; jan/2019 = 3,78%, dez/2019 = 4,31% |
| R1 | Rodei `download_ibge.py` com o novo piso e comparei os CSV | Os itens da cesta ficaram **idênticos**; o IPCA de 2019 em diante ficou idêntico; só entraram 12 linhas de 2018 |
| R2 | Litros por salário mínimo contra salário/preço e contra salário real/preço real, 91 meses | Diferença máxima 0,008 litro (arredondamento) |
| R3a | `custo_vida_nivel_real` recalculado por fora no teste | Confere; B 98,8 / L 101,3 (média), 94,7 / 101,9 (mediana) |
| R5 | Todas as ocorrências de "real"/"corrigido" no site | "Dólar real" não existe; o rótulo "Corrigido pela inflação" era correto; "Dólar corrigido pelo IPCA" agora é explícito; "câmbio real" só aparece para dizer que não é |
| R6 | Arquivo oficial da ANP contra a série do projeto | Ver tabela do R6; **causa da diferença no etanol: não determinada**. O arquivo oficial não informa como pondera a média nacional |
| R6 | Média simples das coletas brutas de mar/2019 | Igual ao valor do projeto (teste automatizado) |
| R7 | Enumeração independente das composições | 10.626 = C(24,4); contagem 10.626 / 0 / 0 confere |
| R9 | Salário mínimo real em jan/2019, jan/2020, ..., jan/2026 e no mês-base | Confere; no mês-base o real é igual ao nominal (R$ 1.621) |
| R10 | Códigos e nomes SIDRA nas duas tabelas, tabelas de correspondência oficiais | Os seis subitens são os pretendidos; ver ressalva do leite |
| A7 | Datas da lacuna da ANP de 2020 | A página da ANP diz "23/8/2020 a 17/10/2020"; o arquivo mensal diz 18/8 a 17/10; nos dados brutos a última coleta é 17/08 e a primeira, 19/10. **O texto do site (23/08 a 17/10) segue a ANP e foi mantido**; a diferença entre as duas notas da ANP é de semana de referência |

**Errata desta etapa (para o texto das seções 1 a 11):**

- **E5.** A lista de A7 ("INVESTIGATE FURTHER") está resolvida: não há erro no site; há duas notas da ANP que diferem em cinco dias.
- **E6.** O DOI 10.5089/9781513571645.001 (IMF WP/21/66) tem no Crossref só dois autores: Flamini e Toscani. A atribuição a três autores da bibliografia vem do PDF; use "Flamini & Toscani (2021)" ao citar pelo DOI.
- **E7.** Araújo, Brito & Sanvicente (2021): o Crossref registra a inicial do primeiro autor como "E."; a bibliografia a trazia como "G.S.". Use "Araújo, E."
- **E8.** Saisana, Saltelli & Tarantola (2005): volume e páginas agora conferidos (168, p. 307–323). Paruolo et al.: publicado online em 2012 (Crossref).
- **E9.** O rótulo "câmbio real" na bibliografia (item 37) refere-se ao índice de câmbio efetivo real do Ipeadata, que é outra coisa que o dólar do projeto (câmbio nominal em reais de hoje).
- **E10.** No R3a, o "mesmo tempo" do IPCA no código era de 32 meses (13 a 44); depois do R1 é de 44.
- **E11.** Na simulação (S4) da seção anterior, o salário real em "44 meses" aparecia como −2,45% (Bolsonaro); o pipeline dá −2,73%. A simulação pegava as 44 primeiras observações disponíveis; como a série do salário real herda a falta de set/2020 da série da gasolina (ANP), a 44ª observação era set/2022 (posição 45 do mandato). O pipeline compara a mesma posição k (jan/2019 a ago/2022) e confere com o cálculo direto: −2,73%. O valor do projeto é o do pipeline.
- **E12 (achado novo, impacto nulo nos resultados).** `SALARIO_REAL` e `SALARIO_NOMINAL` são lidos da série mensal da gasolina (`origem: "GASOLINA"`), então não têm o mês de set/2020 (sem pesquisa da ANP), embora o salário mínimo e o IPCA existam nesse mês. A variação do início ao fim e as leituras não mudam (o primeiro e o último mês existem); só `n`, média, mínimo e máximo ignoram um mês. Correção possível e simples (ler da série do Dólar, que é completa), **não aplicada** nesta etapa para não alterar séries fora do escopo autorizado.

## 3. O que foi corrigido (v1.3.0)

| Tipo | Item | Mudança | Arquivos |
|---|---|---|---|
| Correção de dados | R1 | O número-índice do IPCA é baixado desde jan/2018 (`IPCA_INICIO_DOWNLOAD`); IPCA 12 meses desde jan/2019; Bolsonaro 48 meses; igual duração 44 meses | `scripts/download_ibge.py`; dados regenerados (`ipca_geral_mensal.csv`, `dashboard_data.json`, `analysis_*.json`) |
| Correção de síntese | R2/R4 | Litros de gasolina por salário mínimo: Tipo A → Tipo C (sem voto em Renda, ainda publicado) | `scripts/build_analise.py` |
| Leitura complementar | R3a | `custo_vida_nivel_real` (nível médio e mediano, grade alternativa) e o bloco "Outra forma de olhar" | `build_analise.py`, `dashboard/js/analise.js`, `dashboard/styles.css` |
| Terminologia | R5 | "Dólar corrigido pelo IPCA", com aviso de que não é câmbio real | `dashboard/js/app.js`, `dashboard/index.html` |
| Terminologia | R6 | "Média simples das coletas da ANP" | `app.js`, `index.html`, `build_analise.py` |
| Terminologia | R7 | "Análise de sensibilidade aos pesos"; Parte 10 ampliada; Parte 11 resumida | `build_analise.py`, `analise.js`, `index.html` |
| Documentação | R8, R9, R3b, R10 | Seção "Fundamentos por indicador" em `docs/METHODOLOGY.md` | `docs/*.md` |
| Testes | todos | Bloco v1.3.0 em `test_analise.py` | `scripts/test_analise.py` |

## 4. O que intencionalmente NÃO foi mudado

- A fórmula do salário mínimo real (IPCA, mês-base dinâmico; **sem trocar por INPC**); a leitura principal do Custo de vida (variação do início ao fim); a mediana não ponderada e as 11 séries (R3b, em pesquisa); tolerâncias de 1,0 e 0,1 ponto; a regra de voto do Mercado de trabalho; o cálculo do dólar corrigido; a série de combustíveis do projeto (não foi trocada pela oficial); os subitens do IPCA; a grade de 5 em 5 pontos (não foi substituída por SMAA); o PIB (média aritmética); a regra de que Mercados não entram na síntese.

## 5. Status final R1–R10

| ID | Status | Mudança | Evidência | Impacto |
|---|---|---|---|---|
| R1 | **Corrigido** | Download do IPCA desde 2018 | Série recalculada por fora; testes | Bolsonaro 6,95 → 6,14% (48 meses); igual duração 32 → 44 meses; Inflação continua apontando para Lula |
| R2 | **Corrigido** | Litros como Tipo C | Identidade exata (≤ 0,008 L) | Renda: empate → Lula; síntese +80 → +100; grade 10.625/0/1 → 10.626/0/0 |
| R3a | **Documentado + leitura complementar** | Bloco "Outra forma de olhar", fora da síntese | Recalculado em teste | Nenhum número da síntese mudou; informa que a grade seria 9.625/715/286 |
| R3b | **Pesquisado, não alterado** | Só documentação | Handbook (dupla contagem); Bryan & Cecchetti (mediana ponderada); sensibilidades S3 | Nenhum agregador testado muda a leitura; método segue como convenção do projeto, com ressalvas |
| R4 | **Resolvido junto com o R2** | — | — | — |
| R5 | **Terminologia** | Rótulo e aviso | Código e texto conferidos | Nenhum número |
| R6 | **Terminologia; causa do etanol não determinada** | Rótulo "média simples das coletas" | Arquivo oficial da ANP, 91 meses | Nenhum número; diferença média: gasolina +0,3%, diesel +0,7%, S10 +0,6%, GLP +1,1%, etanol +6,5% |
| R7 | **Terminologia + documentação** | Sensibilidade aos pesos | Enumeração independente | Nenhum número da grade além do efeito do R2 |
| R8 | **Documentado** | — | Handbook (limiares arbitrários); Roy; Brans & Vincke | Nenhum número |
| R9 | **Mantido e documentado** | — | Testes em 9 datas | Nenhum número; INPC como sensibilidade: B −5,20 / L +7,39 |
| R10 | **Verificado, sem mudança** | — | Metadados SIDRA e tabelas de correspondência do IBGE | Seis subitens corretos; ressalva do leite (2008-09) |

## 6. Referências acadêmicas

Cada linha: autores (ano), título, veículo, DOI/URL, **o que sustenta**, classificação (**S** sustenta o método; **I** indireta ou contextual; **N** não sustenta; **V** não verificada). DOIs reconferidos hoje no Crossref, salvo indicação.

| # | Referência | Sustenta | Cl. |
|---|---|---|---|
| 1 | Nardo, Saisana, Saltelli, Tarantola, Hoffmann, Giovannini (2008). *Handbook on Constructing Composite Indicators*. OECD/JRC. DOI 10.1787/9789264043466-en | Dupla contagem (p. 32); pesos; vocabulário de sensibilidade. **Não** sustenta mediana como agregador | S (R2, R7), N (mediana) |
| 2 | Saisana, Saltelli, Tarantola (2005). Uncertainty and sensitivity analysis techniques as tools for the quality assessment of composite indicators. *JRSS A* 168(2):307–323. DOI 10.1111/j.1467-985x.2005.00350.x | Prática de testar sensibilidade de compostos | S |
| 3 | Becker, Saisana, Paruolo, Vandecasteele (2017). Weights and importance in composite indicators: closing the gap. *Ecological Indicators* 80:12–22. DOI 10.1016/j.ecolind.2017.03.056 | Pesos nominais ≠ importância efetiva | I |
| 4 | Paruolo, Saisana, Saltelli (2013). Ratings and rankings: voodoo or science? *JRSS A* 176(3):609–634. DOI 10.1111/j.1467-985x.2012.01059.x | Mesmo ponto | I |
| 5 | Greco, Ishizaka, Tasiou, Torrisi (2019). On the methodological framework of composite indices. *Social Indicators Research* 141(1):61–94. DOI 10.1007/s11205-017-1832-9 | Robustez/sensibilidade como etapas do composto (revisão) | I |
| 6 | Munda, Nardo (2009). Noncompensatory/nonlinear composite indicators for ranking countries. *Applied Economics* 41(12):1513–1523. DOI 10.1080/00036840601019364 | Agregação não compensatória (conceito) | S parcial |
| 7 | Saltelli, Annoni (2010). How to avoid a perfunctory sensitivity analysis. *Environ. Modelling & Software* 25:1508–1517. DOI 10.1016/j.envsoft.2010.04.012 | Crítica a sensibilidade de um fator por vez | I |
| 8 | Lahdelma, Hokkanen, Salminen (1998). SMAA. *EJOR* 106:137–143. DOI 10.1016/s0377-2217(97)00163-x · Lahdelma, Salminen (2001). SMAA-2. *Operations Research* 49(3):444–454. DOI 10.1287/opre.49.3.444.11220 · Tervonen, Lahdelma (2007). *EJOR* 178(2):500–513. DOI 10.1016/j.ejor.2005.12.037 | Explorar o espaço de pesos e reportar aceitabilidade (comparação conceitual com a grade) | S (conceito); SMAA **não adotado** |
| 9 | Mareschal (1988). *EJOR* 33:54–64. DOI 10.1016/0377-2217(88)90254-8 · Triantaphyllou, Sánchez (1997). *Decision Sciences* 28:151–194. DOI 10.1111/j.1540-5915.1997.tb01306.x | Sensibilidade a pesos em decisão multicritério | I |
| 10 | Roy (1991). *Theory and Decision* 31:49–73. DOI 10.1007/bf00134132 · Brans, Vincke (1985). *Management Science* 31(6):647–656. DOI 10.1287/mnsc.31.6.647 | Conceito de limiar de indiferença (não fixam valores) | I |
| 11 | Bryan, Cecchetti (1993). Measuring core inflation. NBER WP 4303. DOI 10.3386/w4303 | Mediana de variações de preços, **ponderada** | I |
| 12 | Mazziotta, Pareto (2013). *Rivista Italiana di Economia Demografia e Statistica* 67(2):67–80 (sem DOI) | Normalização e redundância | I |
| 13 | Luzzati, Gucciardi (2015). *Ecological Economics* 113:25–38. DOI 10.1016/j.ecolecon.2015.02.018 · Permanyer (2011). *Rev. Income and Wealth* 57(2):306–326. DOI 10.1111/j.1475-4991.2011.00442.x · Lindén et al. (2021). *Environ. Modelling & Software* 145:105208. DOI 10.1016/j.envsoft.2021.105208 · Ding et al. (2017). *SIR* 139:871–885. DOI 10.1007/s11205-017-1765-3 · Freudenberg (2003). OECD STI WP 2003/16. DOI 10.1787/405566708255 | Contexto sobre pesos e robustez | I |
| 14 | Yuba, Sarti, Campino, Carmo (2013). *Rev. Saúde Pública* 47(3):549–559. DOI 10.1590/s0034-8910.2013047004073 | Preço real de alimento por índice geral; encadeamento | S parcial |
| 15 | Ertel (2022). *Perspectiva Econômica* 18(1):10–24 (DOI impresso 10.4013/pe.2022.181.02 **não resolve** no Crossref) | Salário mínimo × IPCA do SIDRA 1737 | S parcial; DOI **V** |
| 16 | **Alcântara, Daier, Silva (2024).** Poder de compra do salário mínimo em relação à cesta básica alimentar na cidade do Rio de Janeiro nos anos de 2010 a 2019. *Boletim Mercado de Trabalho* (IPEA) 77. DOI 10.38116/bmt77/pf2 (objetivo e método lidos no PDF) | Razão salário mínimo / preço de um bem como indicador de poder de compra isolado (cesta, não gasolina) | I (R2) |
| 17 | **Ashenfelter, Jurajda (2024).** The U.S. low-wage structure: a McWage comparison. *Review of Economics and Statistics*. DOI 10.1162/rest_a_01514 (Crossref; página do periódico bloqueada, versão NBER WP 32708 lida na etapa 1) | Salário expresso em unidades de uma mercadoria | I (R2) |
| 18 | Mattioli, Wadud, Lucas (2018). *Transportation Research A* 113:227–242. DOI 10.1016/j.tra.2018.04.002 | Vulnerabilidade a preços de combustível (contexto) | I |
| 19 | Da Silva, Vasconcelos, Vasconcelos, De Mattos (2014). *Energy Economics* 43:11–21. DOI 10.1016/j.eneco.2014.02.002 | Usa o LPC como fonte | I |
| 20 | Araújo, E.; Brito, R.; Sanvicente, A. (2021). Long-term stock returns in Brazil. *Int. J. Finance & Economics* 26(4):6249–6263. DOI 10.1002/ijfe.2118 | Ibovespa como retorno total e deflação | S parcial |
| 21 | Perrelli, Roache (2014). IMF WP/14/84. DOI 10.5089/9781484385210.001 | Juro real/neutro (contexto) | I |
| 22 | Flamini, Toscani (2021). IMF WP/21/66. DOI 10.5089/9781513571645.001 · Bacciotti, Marçal (2020). *Estudos Econômicos* 50(3):513–534. DOI 10.1590/0101-41615035rbe · Reis (2020). *Estudos Econômicos* 50(4):705–732. DOI 10.1590/0101-41615045mcr | Mercado de trabalho brasileiro (contexto) | I |
| 23 | OECD (2024). *Compendium of Productivity Indicators*. DOI 10.1787/b96cd88a-en | **Não** sustenta média aritmética × geométrica do PIB | N (nesse ponto) |
| 24 | Taioka, Bittes Terra (2024), DOI 10.1080/01603477.2024.2366798 · Mazali, Divino (2010), DOI 10.1590/S0034-71402010000300005 · Araújo, Caldarelli, Cortapasso (2023), DOI 10.1590/0103-6351/7570 · Salomão Neto, Alves (2025), DOI 10.1590/0101-31572025-3679 | Contexto de salário real e câmbio/inflação | N (não sustentam o método) |
| 25 | Rogoff (1996). The purchasing power parity puzzle. *J. Economic Literature* 34(2) | Distinção câmbio nominal/real | V (DOI não localizado) |
| 26 | Working (1960), DOI 10.2307/1907574 · Rossana, Seater (1995), DOI 10.1080/07350015.1995.10524618 · Hansen, Hodrick (1980), DOI 10.1086/260910 · Newey, West (1987), DOI 10.2307/1913610 | Agregação temporal e sobreposição (contexto) | I |

## 7. Referências metodológicas oficiais

| Fonte | O que sustenta | Cl. |
|---|---|---|
| IBGE (2020, 8ª ed.). *Sistema Nacional de Índices de Preços ao Consumidor: métodos de cálculo*. https://biblioteca.ibge.gov.br/visualizacao/livros/liv101767.pdf | Números-índice, encadeamento, deflator, variação acumulada em 12 meses | S |
| IBGE/SIDRA, tabelas 1737 (IPCA, número-índice), 1419 e 7060 (variação por subitem), metadados pela API `servicodados.ibge.gov.br/api/v3/agregados/{tabela}/metadados` | Códigos e nomes dos subitens | S (R10) |
| IBGE, tabelas de correspondência despesas da POF × subitens do SNIPC (POF 2017-2018 e POF 2008-2009), em `ftp.ibge.gov.br/.../Estruturas_de_ponderacao_POF_SNIPC/` | O que cada subitem agrega (por exemplo, arroz: polido, com casca, não especificado) | S (R10) |
| ANP, *Informações sobre o levantamento de preços de combustíveis* (página oficial; texto lido nesta etapa) e *Metodologia resumida do LPC* (2020) | Coleta, 459 localidades, média municipal simples, média nacional ponderada desde 31/10/2004, lacuna de 2020 | S (fonte e coleta); **N** para a média simples nacional como método da ANP |
| ANP, `mensal-brasil-desde-jan2013.xlsx` | Série oficial mensal comparada na seção R6 | S (dado) |
| BCB, metadados SGS "Taxas Selic" | Meta (432) × efetiva (11/4189) | S; N para a média mensal da meta |
| BCB, SGS 1 (PTAX), 1619 (salário mínimo) | Fonte dos dados | S |
| B3, *Metodologia do Índice Bovespa* | Retorno total, critérios | S |
| IPEA/Ipeadata, nota metodológica da taxa de câmbio efetiva real; série de salário mínimo real | Definição de câmbio real; deflator INPC e base dinâmica | S (R5); I (R9) |
| DIEESE, metodologia da Pesquisa Nacional da Cesta Básica | Razão salário/preço e média simples de cotações | I |
| IBGE, Contas Nacionais Trimestrais; PNAD Contínua (subutilização; reponderação) | Medidas de PIB e trabalho | S |
| BCB, Estudo Especial nº 109/2021 | PNAD Contínua na pandemia | S (ressalva) |
| OECD/JRC, *Handbook* (Nardo et al., 2008) | Ver seção 6, item 1 | S/N |

## 8. Resultados antes × depois

Saída de `python docs/auditoria_antes_depois.py` (antes = HEAD, v1.2.1; depois = arquivos atuais, v1.3.0). **Alterado:**

| Item (janela completa, salvo indicação) | Antes | Depois | Diferença | Explicação |
|---|---|---|---|---|
| IPCA 12 meses, média, Bolsonaro | 6,95% (36 meses) | 6,14% (48 meses) | −0,80 p.p.; +12 meses | R1: 2019 entrou |
| Inflação, valor da dimensão, Bolsonaro | 6,95% | 6,14% | −0,81 p.p. | R1; leitura continua Lula; diferença entre períodos 2,34 → 1,54 p.p. |
| IPCA, igual duração, Bolsonaro / Lula | 7,02% / 4,61% (32 meses) | 6,13% / 4,61% (44 meses) | −0,89 / −0,002 p.p. | R1 |
| Renda, valor da dimensão, Bolsonaro / Lula | +0,83% / +0,89% | −4,02% / +6,15% | −4,85 / +5,26 p.p. | R2: só o salário real vota |
| Renda, leitura | Praticamente iguais | Lula | muda | R2 |
| Renda, igual duração | −3,01% / +0,89% (Lula) | −2,73% / +6,15% (Lula) | +0,28 / +5,26 p.p. | R2; leitura igual |
| Síntese, soma com pesos iguais | +80 | +100 | +20 | Efeito da leitura de Renda |
| Síntese, cenários: custo de vida, inflação, trabalho, atividade, renda | +85, +85, +85, +85, +60 | +100 em todos | +15 a +40 | idem |
| Grade de 10.626 (Lula / Bolsonaro / empate) | 10.625 / 0 / 1 | **10.626 / 0 / 0** | +1 / 0 / −1 | idem |

**Inalterado (explicitamente):** Custo de vida (34,80% / −9,84%; leitura Lula, nas duas janelas); IPCA do período Lula (4,61%); Atividade/PIB (1,43% / 2,97%; igual duração 0,90% / 2,97%); Mercado de trabalho (três votos pelo período Lula; leitura Lula); Mercados (descritivos); grade da janela de igual duração (10.626 / 0 / 0); todas as séries de preços, salário mínimo real e índices de alimentos (nenhum valor mudou; só o IPCA de 12 meses do período Bolsonaro). **Novo:** nível real do Custo de vida, B 98,8 / L 101,3 (mediano 94,7 / 101,9), grade alternativa 9.625 / 715 / 286.

## 9. Análise de sensibilidade aos pesos (resultado final)

**10.626 combinações: 10.626 apontam para o período Lula, 0 para o período Bolsonaro, 0 empates** (janela completa e janela de igual duração). Recontado por enumeração independente (estrelas e barras) no teste. A pergunta é só se mudar os pesos muda o lado da síntese; a resposta, nesta grade e com estas leituras, é não, porque nenhuma das cinco dimensões aponta para o período Bolsonaro. **Isso é dominância, não prova de robustez geral.** Quando uma dimensão apontou para o outro lado (Custo de vida pelo nível real), a mesma grade deu 9.625 / 715 / 286: o resultado depende da leitura de cada dimensão, que por sua vez depende da pergunta e do método.

## 10. Limitações metodológicas que permanecem

1. Leitura de cada dimensão por mediana (Custo de vida) e por voto (Trabalho) sem literatura que sustente exatamente a construção; é convenção do projeto.
2. Mediana não ponderada de 11 séries heterogêneas, com diesel e diesel S10 (r ≈ 1,00); ponderar pelos pesos do IPCA não muda a leitura, mas muda o tamanho.
3. Tolerâncias de 1,0 e 0,1 ponto são convenção; a Inflação e o PIB ficam empatados com tolerância ≥ ~1,6.
4. A síntese usa só o sentido (+1/0/−1): perde a magnitude, o que a literatura de agregação ordinal reconhece.
5. A grade de pesos é discreta e a análise vale para as dimensões que o projeto tem (sem contas públicas, desigualdade, informalidade).
6. O período Lula está em curso; o Bolsonaro tem 48 meses e o Lula 44.
7. Média simples das coletas da ANP difere da série oficial (etanol +6,5% em média).
8. Alimentos são índices encadeados, não preços em reais; "carne" é só o patinho.
9. IPCA, não INPC, como deflator do salário mínimo real.
10. Cada leitura é descritiva; nenhuma estabelece causa.

## 11. Perguntas de pesquisa em aberto

- **Causa da diferença do etanol** contra a série oficial da ANP (amostragem, cobertura geográfica, ponderação, valores ausentes, definição do produto, calendário): **causa não determinada**; o arquivo oficial não documenta a ponderação nacional.
- **Agregador do Custo de vida** (R3b): estrutura em grupos ponderados ou fusão diesel/S10; nenhum teste muda o lado, mas a decisão é editorial e merece uma pergunta explícita ao leitor.
- **Continuidade do subitem "Leite longa vida" (1111004)** entre 2012–2019 e 2020 em diante: na estrutura da POF 2008-2009 o código aparece como "Leite integral pasteurizado". Não quantificado.
- **Alternativas ao salário real**: INPC (já testado como sensibilidade) e salário real por hora ou por região.
- **Extensão por SMAA**: amostragem contínua de pesos, com as mesmas ressalvas.
- **DOI de Rogoff (1996)** e do artigo de Ertel (2022).
- **Origem da série do salário mínimo real** (E12): trocar a série de origem da gasolina pela do Dólar para incluir set/2020; impacto nulo nas leituras.

## 12. Testes executados

- `python scripts/test_analise.py`: **todas as validações passaram** (blocos v1.0 a v1.3.0; novos blocos para R1, R2, R3a, R5, R6, R7, R8, R9, R10, integridade).
- Pipeline reexecutado: `download_ibge.py` → `build_dataset.py` → `build_dashboard_data.py` → `build_analise.py` → `test_analise.py`; CSV de itens e de combustíveis idênticos aos anteriores.
- Navegador (pane, 1024 px e 375 px): 0 erros no console; axe-core 0 violações (a única violação transitória foi a animação `monthSwap` do relógio da Máquina do tempo, `#tm-month`, em opacidade parcial; zerada a animação, 0); sem rolagem lateral em 375 px; modo "igual duração" e âncora `#an-parte-10` funcionando; troca para o Dólar mostra "Dólar corrigido pelo IPCA".
- Nenhum NaN ou infinito em `analysis_results.json`; nenhuma série com mês duplicado ou fora de ordem.

## 13. Arquivos alterados (ao fim da etapa 2)

`scripts/download_ibge.py`, `scripts/build_analise.py`, `scripts/test_analise.py`, `dashboard/index.html`, `dashboard/js/app.js`, `dashboard/js/analise.js`, `dashboard/styles.css`, `data/processed/ipca_geral_mensal.csv`, `data/processed/dashboard_data.json`, `data/processed/analysis_methodology.json`, `data/processed/analysis_results.json` (os de dados regenerados pelo pipeline), `README.md`, `docs/METHODOLOGY.md`, `docs/AUDITORIA_ANALISE_GOVERNOS.md`, `docs/CURRENT_STATE.md`, `docs/KNOWN_ISSUES.md`, `docs/DATA_PIPELINE.md`, `docs/TESTING_AND_QA.md`, e (novos) `docs/AUDITORIA_ACADEMICA_METODOLOGIA.md`, `docs/auditoria_simulacoes.py`, `docs/auditoria_antes_depois.py`.

## 14. Arquivos NÃO alterados (ao fim da etapa 2; a etapa 3 mexeu em `build_dataset.py`, no `update_data.py` e nos downloads de IBGE e ANP oficial)

Todos os demais downloads e builds (`download_anp.py`, `download_bcb.py`, `download_mercados.py`, `download_pnad.py`, `download_pib*.py`, `build_dataset.py`, `build_news.py`), os dados de combustíveis, cesta, salário mínimo, mercados, PIB e PNAD, as notícias, os marcos, o histórico do Git e os arquivos não relacionados (vídeo, imagens, PDF da marca, `p.html`, `.impeccable/review/`).

## 15. Git (ao fim da etapa 2)

Nada foi commitado nem enviado (`git status` mostra as alterações acima como modificadas e os documentos de auditoria como novos). Quando houver autorização, a mensagem do commit não deve levar trailer de IA (regra do repositório).

---

# Etapa 3 — Fechamento das pendências e auditoria final (01/10/2026, metodologia v1.4.0)

Estado: **implementado, testado e verificado**. Os itens deixados em aberto na etapa 2 foram investigados com dados e documentação oficiais; cada um terminou
em uma das três situações: **resolvido**, **resolvido com tratamento defensável** ou **limitação documentada** (seção 9). Nenhuma decisão foi tomada pelo
resultado político: onde o resultado foi conhecido antes da decisão (combustíveis), a decisão se apoia no critério de adequação do método e o efeito foi medido depois.

## 1. Pendências da etapa 2 e como terminaram

| Pendência | Situação | Resumo |
|---|---|---|
| Causa da diferença do etanol (R6) | **Resolvida (classe A, método)** | A diferença vem da **ponderação por vendas** que a ANP aplica e a média simples não. A amostra é a mesma. |
| Tratamento da série de combustíveis | **Resolvido: série oficial passa a ser a principal** | Decisão por adequação do método, efeito medido: nenhuma leitura mudou. |
| Agregador do Custo de vida (R3b) | **Resolvido: método mantido, "defensável, com limitações"** | Seis alternativas calculadas para as duas perguntas; na variação, todas apontam para o mesmo período; no nível, depende do resumo. |
| Leite, código 1111004 (R10) | **Resolvido** | Rótulo correto; a divergência é do nome na tabela de correspondência de despesas da POF 2008-2009. |
| Salário mínimo herdando set/2020 | **Corrigido** | Série própria, completa. |
| E11 (janela por observações) | **Corrigido** | Janela de calendário nos resumos de 12/24/36 meses; a Análise já usava calendário. |
| Links de notícias | **Auditados** | 142 de 142 acessíveis (4 por cópia arquivada); ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md). |
| Referências | **Reverificadas** | Todos os DOIs usados na metodologia conferidos no Crossref; classificação final na seção 6. |
| Literatura dos quatro métodos sem referência direta | **Pesquisada de novo** | Conceitos próximos encontrados (indiretos); os quatro continuam sendo **convenção do projeto**. |

## 2. Etanol e ANP: a causa

Script reexecutável: `docs/auditoria_anp_ponderacao.py` (cache bruto por posto + arquivos oficiais de vendas da ANP).

**A. A amostra é a mesma.** O número de coletas do projeto, mês a mês, é igual ao "número de postos pesquisados" do arquivo mensal oficial (razão média
1,001; mínimo 0,97 e máximo 1,13), os 91 meses coincidem e os produtos são os mesmos. Descartadas: diferença de produto, de calendário, de
cobertura geográfica e de valores ausentes.

**B. A diferença vem da agregação, e a ANP a documenta.** Página oficial: o preço médio é a média aritmética simples só no nível municipal; desde 31/10/2004 os
níveis estadual, regional e nacional são ponderados pelas vendas informadas pelas distribuidoras. Reprodução da série oficial a partir dos preços por posto
(91 meses; diferença do reproduzido contra a série oficial):

| Forma de agregar | Etanol: dif. média | |dif.| média | máx. | Gasolina: dif. média | |dif.| média | máx. |
|---|---|---|---|---|---|---|
| M0 média simples de todas as coletas (o que o projeto usava) | +6,49% | 6,49% | 12,00% | +0,29% | 0,39% | 1,25% |
| M3 cada município com peso igual | +10,06% | 10,06% | 18,92% | +0,98% | 0,98% | 2,58% |
| M4 cada UF com peso igual | +15,25% | 15,25% | 28,71% | +1,96% | 1,96% | 4,00% |
| M1 UFs ponderadas pelas vendas mensais | +0,58% | 0,68% | 2,05% | +0,45% | 0,46% | 1,10% |
| **M5 municípios pelas vendas anuais, depois UFs pelas vendas mensais** | **+0,02%** | **0,47%** | **1,61%** | **−0,02%** | **0,14%** | **0,40%** |

**C. Por que a média simples fica acima no etanol.** Em 2022 (etanol hidratado): Nordeste 19,9% das coletas e 8,2% das vendas; Sul 12,5% e 6,0%; Norte 3,8% e 1,3%;
Sudeste 53,9% e 68,6%; Centro-Oeste 10,1% e 15,9%. São Paulo: 33,3% das coletas e 52,1% das vendas, com preço médio de R$ 4,33 contra R$ 4,85 na média simples
nacional. A amostra sobrerrepresenta regiões de etanol mais caro e subrepresenta o estado onde ele é mais barato e mais consumido.

**D. O que continua não determinado:** o resíduo de 0,47% (etanol) e 0,14% (gasolina) entre M5 e a série oficial. A ANP não publica os pesos exatos nem o
período de referência das vendas. **Causa do resíduo não determinada a partir da documentação oficial disponível.** Classe da conclusão principal: **A (explicada pela
metodologia)**, sem especular além disso.

**Decisão: a série oficial substitui a média simples como série principal.** Critério: o projeto quer mostrar quanto custava o combustível, em média, para quem o
compra; a média ponderada pelo consumo responde a isso, e a média simples responde a "o preço médio dos postos pesquisados", que depende do desenho da amostra. A
série oficial é pública, auditável e mantida pela ANP. Alternativas consideradas: **manter** a média simples (rejeitada: mede outra coisa e fica até 12% acima
no etanol), **mostrar as duas** no site (rejeitada: duplicaria séries sem ganho para o leitor; a média simples fica no CSV e na documentação) e **reconstruir a
ponderada** (rejeitada: ela só chega a 0,5% da oficial e exigiria manter dados de vendas). Implementação: `download_anp_oficial.py` → `anp_oficial_mensal.csv` →
`build_dataset.py` (coluna `preco_simples_coletas` preservada). Um mês que a série oficial não tem fica sem preço; nenhum mês é completado com a média simples.

**Efeito da troca** (variação real do início ao fim, período completo; Bolsonaro / Lula; antes = média simples):

| Série | Antes | Depois |
|---|---|---|
| Gasolina | −9,17 / +11,02 | −7,96 / +10,25 |
| Etanol | +2,56 / −11,07 | +7,93 / −13,64 |
| Diesel | +46,30 / −11,26 | +46,25 / −12,45 |
| Diesel S10 | +44,80 / −8,28 | +44,78 / −8,65 |
| GLP | +23,49 / −9,84 | +24,59 / −10,30 |
| Custo de vida, mediana das 11 | +34,80 / −9,84 | +34,80 / −10,30 |

Nenhuma leitura de dimensão, nenhum número da síntese e nenhuma das 10.626 combinações mudou. O nível real médio do Custo de vida ficou em 98,81 / 101,29
(mediano 94,74 / 101,88), igual ao anterior ao centésimo.

## 3. R3b: agregador do Custo de vida

Script reexecutável: `docs/auditoria_custo_vida_agregadores.py` (recálculo independente do que o pipeline grava em `custo_vida_agregadores`).

**Pesquisa.** O *Handbook* da OCDE/JRC (Nardo et al., 2008) exige evitar dupla contagem de indicadores correlacionados e recomenda testar a sensibilidade a normalização,
pesos e agregação; **não** recomenda nem desaconselha a mediana. O *Consumer Price Index Manual* trata o agregado elementar sem pesos de despesa e recomenda a média geométrica
(Jevons), apontando o viés para cima da média aritmética (Carli) — **o texto integral não pôde ser aberto**, a classificação vem do resumo e do registro Crossref. Com pesos
de despesa disponíveis, a teoria de números-índice e o próprio IBGE usam médias ponderadas (Laspeyres/Lowe encadeado). A mediana de variações de preços como medida central existe
na literatura de inflação-núcleo (Bryan & Cecchetti, 1993; Smith, 2004; Ball, Carvalho & Evans, 2023), mas **ponderada**. Não foi encontrada literatura que use a mediana **não**
ponderada de séries heterogêneas como agregador de uma dimensão.

**Alternativas calculadas** (variação real do início ao fim; período completo; Bolsonaro / Lula; diferença; leitura; grade Lula/Bolsonaro/empate; síntese com pesos iguais = +5/5 em todas):

| Agregador | Bolsonaro | Lula | Dif. L−B | Leitura | Grade |
|---|---|---|---|---|---|
| A. Mediana das 11 (atual) | +34,80% | −10,30% | −45,10 | Lula | 10.626 / 0 / 0 |
| B. Média aritmética das 11 | +33,35% | −5,30% | −38,65 | Lula | 10.626 / 0 / 0 |
| C. Média geométrica das 11 (Jevons) | +31,32% | −6,28% | −37,60 | Lula | 10.626 / 0 / 0 |
| D. Mediana sem o diesel S10 (10) | +30,68% | −11,38% | −42,06 | Lula | 10.626 / 0 / 0 |
| E. Mediana, diesel e S10 como um item (10) | +30,68% | −10,43% | −41,11 | Lula | 10.626 / 0 / 0 |
| F. Mediana das medianas das duas categorias | +29,95% | −7,50% | −37,44 | Lula | 10.626 / 0 / 0 |
| G. Média das médias das duas categorias | +32,49% | −5,44% | −37,93 | Lula | 10.626 / 0 / 0 |
| H. Igual peso por item do IPCA (10), média | +32,13% | −4,78% | −36,91 | Lula | 10.626 / 0 / 0 |
| I. Média ponderada pelo peso no IPCA (10 itens; peso médio de jan/2020 em diante) | +9,22% | +2,36% | −6,86 | Lula | 10.626 / 0 / 0 |

Janela de igual duração (44 meses): mesmas leituras (Lula) e mesma grade em todas; as diferenças L−B vão de −17,5 (ponderada) a −50,6 (média). Nível real médio (base 100 = média dos dois períodos),
período completo: A, B, C, D, E, F, G e H apontam para o período **Bolsonaro** (diferença de 2,1 a 3,3 pontos; grade 9.625 / 715 / 286); a ponderada pelo IPCA aponta para o período **Lula**
(+0,55 / −0,56; diferença de 1,11 ponto, grade 10.626 / 0 / 0), e com os pesos de dez/2022 ou de ago/2026 a diferença cai abaixo da tolerância (praticamente iguais; 10.625 / 0 / 1). A gasolina responde por
~54% do peso dos 10 itens, e o nível médio real dela foi 5,7% menor no período Lula do que no Bolsonaro.

**Avaliação: DEFENSÁVEL, COM LIMITAÇÕES.** Defensável porque (i) é um resumo robusto e declarado antes do cálculo, (ii) não é apresentado como índice de preços, (iii) a mesma conclusão
(variação) sai de todos os resumos testados, inclusive os que a literatura prefere (Jevons, ponderado). Limitações: pesos iguais para itens de pesos muito diferentes; diesel e S10 correlacionados (0,99) e o mesmo
subitem do IPCA; leitura do nível dependente do resumo. **Não foi substituída:** nenhuma alternativa é uma correção clara (o melhor suporte teórico, a média ponderada, exigiria pesos de
despesa que o projeto não tem para o conjunto das 11 séries e mudaria a pergunta), e trocar depois de ver os resultados seria uma escolha post hoc. **Efeito na síntese: nenhum** no que é a leitura principal.
O site mostra a contagem dos seis resumos no bloco "Outra forma de olhar".

## 4. Leite (código 1111004) e os subitens do IPCA

- **Item:** SIDRA classificação 315, categoria 12393, "1111004.Leite longa vida", nas tabelas 1419 (2012–2019) e 7060 (2020 em diante); nível: subitem; unidade: variação % mensal; cobertura:
  Brasil (nível territorial N1 do SIDRA).
- **Nome histórico:** a tabela de correspondência de despesas da POF 2008-2009 (IBGE) lista o código 1111004 como "Leite integral pasteurizado"; a da POF 2017-2018, como "Leite longa vida". O Banco
  Central, no Estudo Especial nº 69/2019 (jan/2020), lista o código como "Leite longa vida" na estrutura vigente de 2012 a 2019 e na nova. **Conclusão (classe C, só mapeamento histórico):** o descritor da tabela de
  despesas da POF 2008-2009 difere, mas o subitem coletado e publicado pelo IBGE tem o mesmo código e o mesmo nome nas duas estruturas; o rótulo do projeto está correto; a série de dados é a oficial. Sem mudança.
- **Os outros cinco** foram conferidos contra as tabelas de correspondência (arroz, feijão-carioca rajado, patinho, óleo de soja, café moído), sem divergência.
- **Limite:** não há documento público de especificação de coleta (marca, embalagem) que permita provar a identidade física do produto entre 2019 e 2020; a série não mostra descontinuidade na virada.

## 5. Salário mínimo, janelas e E11

- **Por que o salário vinha da gasolina:** herança de arquitetura. As primeiras versões da Análise reaproveitavam as linhas da série da gasolina, que já traziam `salario_minimo` e `ipca_indice` (usados no
  "% do salário" e no "Bolso"); o salário real foi construído sobre elas. Como a série da gasolina não tem set/2020, o salário real herdava o buraco.
- **Correção:** `build_dashboard_data.py` grava `salario_minimo_serie` (BCB SGS 1619 e IPCA; 92 meses de jan/2019 a ago/2026; falta de mês é erro); `build_analise.py` lê `origem: "SALARIO_MINIMO"`.
  Efeito: variações e leituras inalteradas (−4,02% / +6,15%); `n` de 47 para 48 (Bolsonaro, completo) e de 43 para 44 (igual duração); o gráfico e os marcos passam a ter set/2020. Os litros de gasolina por
  salário mínimo continuam sem set/2020, porque a gasolina não tem preço nesse mês (nada foi inventado).
- **E11:** a simulação da etapa 1 pegava as 44 primeiras observações (terminava em set/2022); o pipeline da Análise compara o mesmo mês k (jan/2019 a ago/2022: −2,73%). **Mas havia o mesmo problema em produção**
  nos resumos "primeiros 12/24/36 meses" (`_cohorts_para_periodo`, `head(n)`): na gasolina, a janela de 24 meses do período Bolsonaro terminava em jan/2021 e a do Lula em dez/2024. Corrigido para calendário
  (termina em dez/2020 e dez/2024). **Regra:** a mesma janela de calendário nos dois períodos, nunca o mesmo número de observações; `completo` = o período já chegou ao mês *n*. O PIB (linhas anuais) fica de fora.
  `docs/auditoria_simulacoes.py` também foi corrigido.

## 6. Referências: verificação final e classificação

Verificação de hoje: **todos os DOIs usados na metodologia foram conferidos no Crossref** (existência, título, autores, ano, periódico, volume e páginas). URLs oficiais conferidas por HTTP 200; os poucos
bloqueios de robô (FMI, OCDE, ILO) estão indicados. A tabela da etapa 2 (seção 6) continua válida, com as mudanças abaixo. Classes: **S** sustenta o método; **I** indireta ou contextual; **N** não sustenta; **V** não verificada.

**Correções e novidades:**

| Referência | O que mudou |
|---|---|
| Dobbie, M. J.; Dail, D. (2013). Robustness and sensitivity of weighting and aggregation in constructing composite indices. *Ecological Indicators* 29:270–277. DOI 10.1016/j.ecolind.2012.12.025 | **E13: o título que a etapa 2 declarou inexistente existe; o autor é Dobbie & Dail, não Greco et al.** Resumo conferido (testa a robustez e a sensibilidade de ponderação e agregação); texto não lido. **I.** |
| Scheffé, H. (1958). Experiments with mixtures. *J. Royal Statistical Society B* 20(2):344–360. DOI 10.1111/j.2517-6161.1958.tb00299.x | Nova. Fundamenta a malha simplex-lattice (10.626 = C(24,4) pontos). **I (estrutura combinatória).** |
| Hedges, L. V.; Olkin, I. (1980). Vote-counting methods in research synthesis. *Psychological Bulletin* 88(2):359–369. DOI 10.1037/0033-2909.88.2.359 | Nova. Contagem de votos em sínteses de pesquisa; só contexto e cautela; texto não lido. **I.** |
| Smith, J. K. (2004). Weighted median inflation: is this core inflation? *J. Money, Credit and Banking* 36(2):253–263. DOI 10.1353/mcb.2004.0014 · Ball, L.; Carvalho, C.; Evans, C. (2023). Weighted median inflation around the world. NBER WP 31032. DOI 10.3386/w31032 | Novas. Mediana de variações de preços **ponderada**. **I.** |
| *Consumer Price Index Manual* (ILO, IMF, OECD, Eurostat, UN, World Bank; 2004, cap. 20; edição revisada, cap. 6). DOI 10.5089/9789221136996.069.ch020; 10.5089/9781513559605.069.ch06 | Nova. Agregados elementares (Jevons × Carli). Texto integral **não aberto** (bloqueio de acesso); **I**, apoiada em resumo e Crossref. |
| Alcântara, N. S.; Daier, V. B.; Silva, M. A. X. (2024), DOI 10.38116/bmt77/pf2 · Ashenfelter & Jurajda (2024), DOI 10.1162/rest_a_01514 | Já listadas; **I** (salário em unidades de um bem). |
| BCB, Estudo Especial nº 69/2019 | Nova. **S** para o nome do subitem 1111004 nas duas estruturas do IPCA. |
| ANP, dados abertos de vendas (por UF e por município) | Nova. **S** para a reprodução da ponderação. |
| Rogoff (1996) | **V**; retirada da metodologia. |
| Ertel (2022) | DOI impresso não resolve no Crossref; texto aberto na revista; **S parcial**, DOI **V**. |
| Taioka & Bittes Terra; Mazali & Divino; Araújo, Caldarelli & Cortapasso; Salomão Neto & Alves | **N** (não sustentam o método). Mantidas só na bibliografia de contexto. |

**Lacunas de literatura (os quatro métodos):**

| Método | Conceito próximo encontrado | Classe | Situação |
|---|---|---|---|
| Litros de gasolina por salário mínimo | Salário em unidades de um bem (Ashenfelter & Jurajda, 2024); parcela do salário mínimo na cesta (Alcântara et al., 2024) | I | **Convenção do projeto** |
| Mediana não ponderada de séries heterogêneas | Mediana ponderada de variações de preços (Bryan & Cecchetti; Smith; Ball et al.); Jevons (CPI Manual) | I | **Convenção do projeto** |
| Voto ±1/0 com tolerância | Agregação não compensatória (Munda & Nardo, 2009); concordância com limiar de indiferença (Roy, 1991); contagem de votos (Hedges & Olkin, 1980, só cautela) | I | **Convenção do projeto** |
| Grade discreta de pesos de 5 em 5 pontos | Simplex-lattice (Scheffé, 1958); SMAA (Lahdelma et al., 1998; Tervonen & Lahdelma, 2007); sensibilidade de compostos (Saisana et al., 2005) | I / S (prática) | **Convenção do projeto**, com a estrutura combinatória fundamentada |

## 7. Antes × depois (acumulado, v1.2.1 → v1.4.0)

Saída de `python docs/auditoria_antes_depois.py` (antes = commit v1.2.1; depois = arquivos atuais). Período completo, salvo indicação.

| Indicador | Antes (v1.2.1) | Depois (v1.4.0) | Diferença | Motivo |
|---|---|---|---|---|
| IPCA 12 meses, Bolsonaro, média (meses) | 6,95% (36) | 6,14% (48) | −0,80 p.p. | R1: 2019 incluído |
| IPCA 12 meses, Lula | 4,61% (44) | 4,61% (44) | 0 | inalterado |
| IPCA, igual duração, B / L (meses) | 7,02% / 4,61% (32) | 6,13% / 4,61% (44) | −0,89 / −0,002 p.p. | R1 |
| Inflação, leitura | Lula (dif. 2,34 p.p.) | Lula (dif. 1,54 p.p.) | — | R1 |
| Custo de vida, Bolsonaro / Lula | +34,80% / −9,84% | +34,80% / −10,30% | 0 / −0,46 p.p. | Série oficial de combustíveis |
| Custo de vida, leitura | Lula | Lula | — | inalterado |
| Gasolina, B / L | −9,17 / +11,02 | −7,96 / +10,25 | +1,21 / −0,77 p.p. | Série oficial |
| Etanol, B / L | +2,56 / −11,07 | +7,93 / −13,64 | +5,37 / −2,57 p.p. | Série oficial (ponderação) |
| Diesel, B / L | +46,30 / −11,26 | +46,25 / −12,45 | −0,05 / −1,19 p.p. | Série oficial |
| Diesel S10, B / L | +44,80 / −8,28 | +44,78 / −8,65 | −0,02 / −0,37 p.p. | Série oficial |
| GLP, B / L | +23,49 / −9,84 | +24,59 / −10,30 | +1,10 / −0,46 p.p. | Série oficial |
| Salário real, B / L | −4,02% / +6,15% | −4,02% / +6,15% | 0 | inalterado (série própria; 47 → 48 meses) |
| Litros de gasolina por SM, B / L | +5,67 / −4,38 | +4,29 / −3,72 | −1,38 / +0,66 p.p. | Série oficial; sem voto em Renda desde a v1.3.0 |
| Renda, valor da dimensão, B / L | +0,83% / +0,89% (praticamente iguais) | −4,02% / +6,15% (Lula) | −4,85 / +5,26 p.p. | R2 |
| Mercado de trabalho | 3 votos Lula | 3 votos Lula | — | inalterado |
| Atividade (PIB), B / L | 1,43% / 2,97% | 1,43% / 2,97% | 0 | inalterado |
| Dólar, B / L (variação) | +35,19% / −4,26% | +35,19% / −4,26% | 0 | inalterado (só o rótulo) |
| Síntese, soma com pesos iguais | +80 | +100 | +20 | R2 |
| Grade de 10.626 (Lula / Bolsonaro / empate) | 10.625 / 0 / 1 | **10.626 / 0 / 0** | +1 / 0 / −1 | R2 |
| Grade, igual duração | 10.626 / 0 / 0 | 10.626 / 0 / 0 | 0 | inalterada |
| Nível real do Custo de vida (novo) | — | B 98,81 / L 101,29 (mediano 94,74 / 101,88) | novo | R3a; grade alternativa 9.625 / 715 / 286 |

**Inalterados:** o PIB, o mercado de trabalho, o dólar, a Selic, o Ibovespa (descritivos), os índices de alimentos, o salário real, o IPCA do período Lula, a Inflação e o Custo de vida em termos de leitura, e a grade de igual duração.

## 8. Testes e QA

- `python scripts/test_analise.py`: **todas as validações passaram** (blocos v1.0 a v1.4.0: R1, R2, R3a, R3b, R5, R6, R7, R8, R9, R10, série oficial da ANP, salário mínimo próprio, janela de calendário, integridade: sem NaN/infinito, sem mês duplicado, ordem cronológica).
- Auditorias reexecutadas sem erro: `auditoria_simulacoes.py`, `auditoria_antes_depois.py`, `auditoria_custo_vida_agregadores.py`, `auditoria_anp_ponderacao.py`, `auditoria_links.py`.
- Front-end em 12 larguras (1024, 1280, 1366, 1440, 1600, 1920; 320, 360, 375, 390, 412, 430 px): **sem rolagem horizontal da página, sem imagem quebrada, axe-core com 0 violações** (a animação do relógio da Máquina do tempo é
  zerada antes do teste, como nas rodadas anteriores), sem erro no console; as 17 histórias abrem; Parte 10, Parte 11, Renda, Custo de vida, bloco "Outra forma de olhar" e rótulo "Dólar corrigido pelo IPCA" conferidos.
- Links: ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md).

## 9. Auditoria final independente: cada método tem suporte?

Classes: **OFICIAL** = sustentado por metodologia oficial; **ACADÊMICO** = sustentado por literatura (total ou parcial); **CONVENÇÃO** = escolha do projeto, declarada e testada; **LIMITAÇÃO** = limitação documentada ou sem literatura direta.

| Método | Classe | Suporte e ressalva |
|---|---|---|
| IPCA em 12 meses (índice / índice 12 meses antes) | OFICIAL | IBGE, métodos de cálculo; verificado contra o SIDRA |
| Preço real (a preços do último mês pelo IPCA) | OFICIAL + ACADÊMICO parcial | IBGE (deflator); Yuba et al. (2013) |
| Salário mínimo real, fórmula | OFICIAL (mecânica) + CONVENÇÃO (IPCA × INPC) | IBGE; Ipeadata e DIEESE usam INPC; sensibilidade medida |
| Preço de combustíveis | OFICIAL | Série mensal nacional da ANP (ponderada por vendas) |
| Índices de alimentos (encadeamento da variação mensal por subitem) | OFICIAL | IBGE/SIDRA; subitens conferidos |
| Dólar corrigido pelo IPCA | CONVENÇÃO (correção só pelo IPCA) | A distinção para o câmbio real é OFICIAL (Ipeadata) |
| Selic: média mensal da meta | CONVENÇÃO | A meta é oficial (BCB); a média mensal não é estatística oficial |
| Ibovespa: variação nominal de pontos | OFICIAL (série) + CONVENÇÃO (nominal) | B3 |
| PIB: média aritmética das taxas anuais | OFICIAL (dados) + CONVENÇÃO | Geométrica dá a mesma leitura |
| Mercado de trabalho: dados | OFICIAL | IBGE, PNAD Contínua |
| Mercado de trabalho: voto por série | CONVENÇÃO / LIMITAÇÃO | Sem literatura direta |
| Custo de vida: mediana da variação real | CONVENÇÃO / LIMITAÇÃO | Defensável com limitações; alternativas calculadas |
| Custo de vida: nível real | CONVENÇÃO | Complementar, fora da síntese |
| Litros de gasolina por salário mínimo | CONVENÇÃO / LIMITAÇÃO | Conceito (salário em unidades de um bem) é ACADÊMICO indireto |
| Não pesar o salário real e os litros ao mesmo tempo | ACADÊMICO | OECD/JRC *Handbook* (dupla contagem) |
| Tolerâncias de 1,0 e 0,1 ponto | CONVENÇÃO | Limiar de indiferença: conceito indireto |
| Síntese por sentido (+1/0/−1) ponderado | ACADÊMICO parcial + CONVENÇÃO | Agregação não compensatória (conceito); perda da magnitude declarada |
| Grade de 10.626 pesos | ACADÊMICO (estrutura) + CONVENÇÃO (5 pontos) | Simplex-lattice; análise de sensibilidade |
| Janela de calendário | CONVENÇÃO | Regra declarada e testada |

**Nenhuma fórmula ficou sem explicação.** Verificação de viés: os textos novos e os existentes não usam "vencedor", "melhor", "pior" nem linguagem causal (conferido por `test_analise.py`); a "outra forma de olhar" é apresentada
nos dois sentidos, inclusive o resumo que muda a leitura; a troca da série de combustíveis foi decidida por adequação do método e o efeito foi medido depois; a regra do voto e as tolerâncias não foram alteradas.

## 10. Limitações que permanecem (somente as genuínas)

1. Mediana não ponderada, voto ±1/0 com tolerância, litros por salário mínimo e grade de 5 em 5 pontos são convenções do projeto, sem literatura que as sustente diretamente.
2. A leitura do **nível** real do Custo de vida depende do resumo das séries (sem peso: período Bolsonaro; ponderada pelo IPCA: período Lula, na margem da tolerância).
3. Resíduo de 0,14% a 0,47% entre a reprodução da ponderação da ANP e a série oficial, sem explicação na documentação pública.
4. Continuidade física do produto "leite longa vida" entre 2019 e 2020 não demonstrável por documento público (a série oficial é contínua).
5. O texto integral do *Consumer Price Index Manual* e dos artigos de Dobbie & Dail e Hedges & Olkin não foi lido; a classificação deles é "indireta".
6. Rogoff (1996) e o DOI impresso de Ertel (2022) não verificados.
7. A síntese usa só o sentido; só cinco dimensões; período Lula em curso; salário mínimo é o piso nacional; alimentos são índices; "carne" é só o patinho; IPCA, não INPC.
8. A série oficial de combustíveis chega com a defasagem de publicação da ANP e não tem quebra regional mensal; as linhas regionais do projeto são médias simples das coletas.
9. Cada leitura é descritiva e não estabelece causa.

## 11. Arquivos desta etapa

**Código:** `scripts/download_anp_oficial.py` (novo), `scripts/download_ibge.py` (pesos do IPCA), `scripts/build_dataset.py`, `scripts/build_dashboard_data.py`, `scripts/build_analise.py`, `scripts/test_analise.py`, `scripts/update_data.py`,
`dashboard/index.html`, `dashboard/js/app.js`, `dashboard/js/analise.js`, `dashboard/styles.css`. **Dados regenerados pelo pipeline:** `anp_oficial_mensal.csv`, `ipca_pesos_itens.csv`, `combustiveis_final.csv`, `resumo_periodos_combustiveis.csv`,
`ipca_geral_mensal.csv`, `dashboard_data.json`, `analysis_methodology.json`, `analysis_results.json`. **Documentação:** `README.md` e `docs/` (METHODOLOGY, AUDITORIA_ANALISE_GOVERNOS, AUDITORIA_ACADEMICA_METODOLOGIA, AUDITORIA_LINKS_NOTICIAS,
CURRENT_STATE, KNOWN_ISSUES, DATA_PIPELINE, TESTING_AND_QA, README), e os scripts `docs/auditoria_*.py` com `docs/auditoria_links_noticias.csv`.
