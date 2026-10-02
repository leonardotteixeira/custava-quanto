# Referências e base metodológica

Última atualização: 02/10/2026 · Metodologia da Análise: **v1.4.0**

Esta página lista as fontes e as referências que sustentam o projeto e diz, para cada uma, **o que ela sustenta** e **o que ela não sustenta**. Ela não é
uma bibliografia decorativa: só entra aqui o que o projeto usa como fonte de dados, como documentação de uma série ou como apoio a uma decisão metodológica
documentada.

## Como ler

Três coisas diferentes aparecem nesta página e na metodologia:

- **Fonte oficial:** de onde vem o dado (IBGE, ANP, Banco Central, B3).
- **Fundamentação externa:** documentação institucional ou literatura que sustenta um conceito ou uma definição.
- **Convenção metodológica própria do projeto:** escolha de agregação, síntese, ponderação ou janela que não vem de nenhuma instituição e para a qual não
  existe necessariamente uma metodologia única ou diretamente aplicável.

**Fonte não é método.** Uma instituição ser a fonte de um dado não significa que a forma como o projeto o combina com outros seja metodologia dessa instituição.
A tabela "Origem da metodologia", componente por componente, está em [METHODOLOGY.md](METHODOLOGY.md#origem-da-metodologia); as limitações, em
[METHODOLOGY.md](METHODOLOGY.md#limitações-e-escolhas-metodológicas).

> **Como interpretar a metodologia.** Nem todas as decisões usadas nesta análise são metodologias estabelecidas pela literatura. O projeto combina
> dados e definições oficiais com procedimentos analíticos próprios. As referências externas indicam a origem dos dados e os conceitos utilizados; as
> escolhas específicas de agregação, síntese e ponderação são identificadas como convenções do projeto.

A auditoria de 01/10/2026 ([AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md)) verificou contas, fontes e alternativas, e conferiu os DOIs no
Crossref. Isso **não** transforma as escolhas próprias do projeto em metodologia acadêmica universalmente aceita.

## 1. Fontes institucionais

### IBGE (Instituto Brasileiro de Geografia e Estatística)

Órgão oficial de estatística do país. Usado como fonte de:

- **IPCA, número-índice mensal** (SIDRA, [tabela 1737](https://sidra.ibge.gov.br/tabela/1737)), usado para deflacionar valores e para calcular o IPCA em 12 meses.
  **Sustenta:** a série e a definição oficial do índice. O cálculo do IPCA em 12 meses e dos valores reais é feito pelo projeto, a partir do número-índice.
- **Variação mensal por subitem do IPCA** (SIDRA, tabelas [1419](https://sidra.ibge.gov.br/tabela/1419), de 2012 a 2019, e [7060](https://sidra.ibge.gov.br/tabela/7060), de 2020 em
  diante), dos seis alimentos. **Sustenta:** os dados e os nomes oficiais dos subitens. O índice encadeado de base 100 em jan/2019 é um procedimento do projeto.
- **Métodos de cálculo do SNIPC:** IBGE, *Sistema Nacional de Índices de Preços ao Consumidor: métodos de cálculo*, 8ª ed. (Série Relatórios Metodológicos, v. 14, 2020).
  [Documento](https://biblioteca.ibge.gov.br/visualizacao/livros/liv101767.pdf). **Sustenta:** a mecânica de números-índice, encadeamento e deflator.
- **Tabelas de correspondência entre despesas da POF e subitens do SNIPC** (POF 2017-2018 e POF 2008-2009), em
  [ftp.ibge.gov.br](https://ftp.ibge.gov.br/Precos_Indices_de_Precos_ao_Consumidor/Sistema_de_Indices_de_Precos_ao_Consumidor/Estruturas_de_ponderacao_POF_SNIPC/).
  **Sustenta:** o que cada subitem do IPCA agrega (por exemplo, o subitem "Arroz" reúne arroz polido, com casca e não especificado). **Limitação:** o descritor do código
  1111004 na tabela da POF 2008-2009 ("leite integral pasteurizado") difere do nome do subitem ("Leite longa vida"); ver Banco Central, abaixo.
- **Peso mensal dos itens no IPCA** (variável 66 das mesmas tabelas), usado apenas na sensibilidade do Custo de vida, nunca na leitura principal.
- **PNAD Contínua** (SIDRA, tabelas [6381](https://sidra.ibge.gov.br/tabela/6381), [6441](https://sidra.ibge.gov.br/tabela/6441) e [6390](https://sidra.ibge.gov.br/tabela/6390)).
  **Sustenta:** os dados e as definições da desocupação, da subutilização e do rendimento real. A regra de voto por série é convenção do projeto.
- **Contas Nacionais** (SIDRA, tabelas [5932](https://sidra.ibge.gov.br/tabela/5932) e [6784](https://sidra.ibge.gov.br/tabela/6784)). **Sustenta:** os dados do PIB. A média
  aritmética das taxas anuais em cada período é convenção do projeto.

### ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis)

Agência reguladora que realiza o Levantamento de Preços de Combustíveis.

- **Série mensal nacional de preços de revenda**, arquivo oficial
  [mensal-brasil-desde-jan2013.xlsx](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/mensal/mensal-brasil-desde-jan2013.xlsx).
  **Sustenta:** a série de gasolina, etanol, diesel, diesel S10 e GLP usada como preço nominal.
- **Página do levantamento:** [Informações sobre o levantamento de preços de combustíveis](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis).
  **Sustenta:** a descrição da coleta, a média municipal simples, a ponderação por vendas nos níveis estadual, regional e nacional desde 31/10/2004 e o aviso de que não
  houve pesquisa entre 23/08 e 17/10/2020.
- **Metodologia resumida do LPC** (2020): [documento](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/arquivos-metodologia/metodologia-pesquisa-publica-resumida-09082020.pdf).
  **Sustenta:** a descrição da coleta.
- **Série por posto** (dados abertos) e **vendas de combustíveis por UF e por município** ([dados abertos de vendas](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/vendas-de-derivados-de-petroleo-e-biocombustiveis)).
  **Sustenta:** a reprodução da ponderação por vendas na auditoria. **Limitação:** a ANP não publica os pesos exatos, e sobra um resíduo de 0,14% a 0,47% entre a reprodução e a série
  oficial, sem explicação na documentação pública.

**O que a ANP não sustenta:** a forma como o projeto compara os preços entre os dois períodos, a razão litros por salário mínimo e a leitura do Custo de vida.

### Banco Central do Brasil

- **Sistema Gerenciador de Séries Temporais (SGS)** ([página](https://www3.bcb.gov.br/sgspub/)): dólar PTAX venda (série 1), meta Selic definida pelo Copom (série 432) e
  salário mínimo (série 1619). **Sustenta:** as séries. Os valores do salário mínimo são fixados por ato do governo federal; os atos individuais não foram verificados um a um pelo
  projeto. "Salário mínimo real" e "Dólar corrigido pelo IPCA" são contas do projeto.
- **Metadados da Selic** ([página](https://www4.bcb.gov.br/pec/series/port/metadados/mg45p.htm)). **Sustenta:** a distinção entre a meta Selic e a taxa efetiva. **Não sustenta:** a média
  mensal da meta como estatística oficial (é convenção do projeto).
- **Estudo Especial nº 69/2019**, *Atualizações da estrutura de ponderação do IPCA e repercussão nas suas classificações*
  ([documento](https://www.bcb.gov.br/conteudo/relatorioinflacao/EstudosEspeciais/EE069_Atualizacoes_da_estrutura_de_ponderacao_do_IPCA_e_repercussao_nas_suas_classificacoes.pdf)).
  **Sustenta:** o nome "Leite longa vida" do subitem 1111004 nas estruturas de 2012–2019 e de 2020 em diante.

### B3

- **Metodologia do Índice Bovespa** ([documento](https://www.b3.com.br/data/files/9C/15/76/F6/3F6947102255C247AC094EA8/IBOV-Metodologia-pt-br__Novo_.pdf)) e
  [estatísticas históricas](https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-amplos/indice-ibovespa-ibovespa-estatisticas-historicas.htm). **Sustenta:** a definição do
  índice e a série de fechamento. **Não sustenta:** a variação nominal em pontos como medida de desempenho (convenção do projeto, descrita como nominal).

### Outras instituições que aparecem na metodologia

- **IPEA / Ipeadata:** [nota metodológica da taxa de câmbio efetiva real](http://www.ipeadata.gov.br/doc/Nota%20Metodol%C3%B3gica%20-%20tx%20de%20cambio%20efetiva%20real.pdf).
  **Sustenta:** a definição de câmbio real (e, por contraste, o que o "Dólar corrigido pelo IPCA" não é). A [série de salário mínimo real](http://ipeadata.gov.br/ExibeSerie.aspx?serid=37667&module=M)
  é citada como exemplo de série que usa o INPC; o projeto usa o IPCA por convenção.
- **DIEESE:** [metodologia da Pesquisa Nacional da Cesta Básica de Alimentos](https://www.dieese.org.br/metodologia/metodologiaCestaBasica2025.pdf). Citada como contexto (razão salário/preço
  de uma cesta; uso do INPC em séries de salário mínimo real). O projeto **não** usa dados do DIEESE.
- **FRED (Federal Reserve Bank of St. Louis):** [Brent (DCOILBRENTEU)](https://fred.stlouisfed.org/series/DCOILBRENTEU), apenas como contexto dos combustíveis.

## 2. Literatura metodológica

Cada obra abaixo entra só pelo que sustenta. "Apoio indireto" quer dizer que a obra trata do conceito, não da conta feita pelo projeto.

- **OECD/JRC.** Nardo, M.; Saisana, M.; Saltelli, A.; Tarantola, S.; Hoffmann, A.; Giovannini, E. (2008). *Handbook on Constructing Composite Indicators: Methodology and User Guide*.
  OECD Publishing. DOI [10.1787/9789264043466-en](https://doi.org/10.1787/9789264043466-en).
  **Sustenta:** o alerta contra a dupla contagem de indicadores correlacionados (base para não pesar ao mesmo tempo o salário real e os litros de gasolina), o papel dos pesos e a
  análise de sensibilidade como etapa de um índice composto. **Não sustenta:** a mediana como agregador, a síntese por sentido nem os valores das tolerâncias.
- **Saisana, M.; Saltelli, A.; Tarantola, S. (2005).** Uncertainty and sensitivity analysis techniques as tools for the quality assessment of composite indicators.
  *Journal of the Royal Statistical Society A* 168(2):307–323. DOI [10.1111/j.1467-985x.2005.00350.x](https://doi.org/10.1111/j.1467-985x.2005.00350.x).
  **Sustenta:** a prática de testar a sensibilidade de índices compostos. **Não sustenta:** a grade de 5 em 5 pontos como escolha.
- **Saltelli, A.; Annoni, P. (2010).** How to avoid a perfunctory sensitivity analysis. *Environmental Modelling & Software* 25:1508–1517.
  DOI [10.1016/j.envsoft.2010.04.012](https://doi.org/10.1016/j.envsoft.2010.04.012). **Apoio indireto:** critica a análise que varia um fator por vez; a grade do projeto varia todos os pesos
  juntos.
- **Scheffé, H. (1958).** Experiments with mixtures. *Journal of the Royal Statistical Society B* 20(2):344–360.
  DOI [10.1111/j.2517-6161.1958.tb00299.x](https://doi.org/10.1111/j.2517-6161.1958.tb00299.x). **Sustenta:** a estrutura combinatória das combinações de pesos que somam 100 em múltiplos de 5
  (malha simplex-lattice, `C(24, 4) = 10.626`). **Limitação:** trata de experimentos com misturas, não de índices compostos.
- **Lahdelma, R.; Hokkanen, J.; Salminen, P. (1998).** SMAA — Stochastic multiobjective acceptability analysis. *European Journal of Operational Research* 106:137–143.
  DOI [10.1016/s0377-2217(97)00163-x](https://doi.org/10.1016/s0377-2217(97)00163-x). · **Tervonen, T.; Lahdelma, R. (2007).** Implementing stochastic multicriteria acceptability analysis.
  *European Journal of Operational Research* 178(2):500–513. DOI [10.1016/j.ejor.2005.12.037](https://doi.org/10.1016/j.ejor.2005.12.037). **Apoio indireto:** o conceito de explorar o conjunto
  de pesos e reportar em quantos o resultado muda. **O SMAA não foi adotado:** a grade discreta é uma versão mais simples de auditar.
- **Munda, G.; Nardo, M. (2009).** Noncompensatory/nonlinear composite indicators for ranking countries: a defensible setting. *Applied Economics* 41(12):1513–1523.
  DOI [10.1080/00036840601019364](https://doi.org/10.1080/00036840601019364). **Apoio indireto:** o conceito de agregação não compensatória (a síntese usa só o sentido de cada dimensão e perde a magnitude).
- **Roy, B. (1991).** The outranking approach and the foundations of ELECTRE methods. *Theory and Decision* 31:49–73. DOI [10.1007/bf00134132](https://doi.org/10.1007/bf00134132). ·
  **Brans, J. P.; Vincke, P. (1985).** A preference ranking organisation method. *Management Science* 31(6):647–656. DOI [10.1287/mnsc.31.6.647](https://doi.org/10.1287/mnsc.31.6.647).
  **Apoio indireto:** o conceito de limiar de indiferença. **Não sustentam:** os valores de 1,0 e 0,1 ponto, que são convenção do projeto.
- **Bryan, M.; Cecchetti, S. (1993).** Measuring core inflation. NBER Working Paper 4303. DOI [10.3386/w4303](https://doi.org/10.3386/w4303). · **Smith, J. K. (2004).** Weighted median inflation: is this
  core inflation? *Journal of Money, Credit and Banking* 36(2):253–263. DOI [10.1353/mcb.2004.0014](https://doi.org/10.1353/mcb.2004.0014). · **Ball, L.; Carvalho, C.; Evans, C. (2023).**
  Weighted median inflation around the world. NBER Working Paper 31032. DOI [10.3386/w31032](https://doi.org/10.3386/w31032). **Apoio indireto:** usam a mediana de variações de preços como medida
  central de inflação, **ponderada** pelas despesas. **Não sustentam** a mediana *não ponderada* usada no Custo de vida, que é convenção do projeto.
- **Consumer Price Index Manual** (ILO, IMF, OECD, Eurostat, UN, World Bank). Edição de 2004, cap. 20, "Elementary indices" (DOI
  [10.5089/9789221136996.069.ch020](https://doi.org/10.5089/9789221136996.069.ch020)); edição revisada, cap. 6, "Elementary Indices" (DOI
  [10.5089/9781513559605.069.ch06](https://doi.org/10.5089/9781513559605.069.ch06)).
  **Sustenta:** referência metodológica identificada como pertinente ao tratamento de índices de preços (agregados elementares sem pesos de despesa: média geométrica de Jevons e média aritmética de Carli),
  usada como motivo para a média geométrica estar entre as alternativas testadas do Custo de vida.
  **Limitação:** o texto integral não pôde ser consultado durante a auditoria; a classificação como apoio indireto se apoia em resumos e nos registros dos DOIs.
- **Yuba, T.; Sarti, F.; Campino, A.; Carmo, H. (2013).** Evolução dos preços relativos de grupos alimentares entre 1939 e 2010, em São Paulo, SP. *Revista de Saúde Pública* 47(3):549–559.
  DOI [10.1590/s0034-8910.2013047004073](https://doi.org/10.1590/s0034-8910.2013047004073). **Sustenta parcialmente:** preço real de alimento por um índice geral e encadeamento.
- **Ertel, Y. (2022).** Análise do poder de compra do salário-mínimo a partir da alteração do processo de correção do salário estabelecido em 2007. *Perspectiva Econômica* 18(1):10–24 ([texto](https://revistas.unisinos.br/index.php/perspectiva_economica/article/download/23965/60749494/60799623)).
  **Sustenta parcialmente:** comparação do salário mínimo com o IPCA do SIDRA. **Limitação:** o DOI impresso do artigo não resolve no Crossref, por isso nenhum DOI é citado.
- **Alcântara, N. S.; Daier, V. B.; Silva, M. A. X. (2024).** Poder de compra do salário mínimo em relação à cesta básica alimentar na cidade do Rio de Janeiro nos anos de 2010 a 2019.
  *Boletim Mercado de Trabalho* (IPEA) 77. DOI [10.38116/bmt77/pf2](https://doi.org/10.38116/bmt77/pf2). · **Ashenfelter, O.; Jurajda, S. (2024).** The U.S. low-wage structure: a McWage comparison.
  *Review of Economics and Statistics*. DOI [10.1162/rest_a_01514](https://doi.org/10.1162/rest_a_01514). **Apoio indireto:** o conceito de salário expresso em unidades de um bem. **Não sustentam** a
  razão litros de gasolina por salário mínimo, que é indicador derivado e convenção do projeto.
- **Araújo, E.; Brito, R.; Sanvicente, A. (2021).** Long-term stock returns in Brazil: volatile equity returns for U.S.-like investors. *International Journal of Finance & Economics* 26(4):6249–6263.
  DOI [10.1002/ijfe.2118](https://doi.org/10.1002/ijfe.2118). **Sustenta parcialmente:** o Ibovespa como índice de retorno total, que se compara entre épocas descontando a inflação (o projeto mostra a
  variação nominal e diz que não é descontada).

## 3. Referências consideradas e não usadas como fundamento

A auditoria avaliou outras obras (por exemplo, trabalhos sobre pesos e robustez de índices compostos e sobre contagem de votos em sínteses de pesquisa). Elas constam em
[AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md), com a classificação de cada uma, mas **não são citadas aqui** porque não sustentam uma decisão documentada
do projeto.

## 4. O que não tem literatura direta

Os componentes abaixo são **convenções metodológicas próprias do projeto**: a mediana não ponderada das variações reais do Custo de vida, o voto ±1/0 por série e por dimensão com tolerância, a razão
litros de gasolina por salário mínimo, a grade de pesos de 5 em 5 pontos, as janelas de 12/24/36 meses e de calendário, a escolha do IPCA para o salário real e a média mensal da meta Selic. A pesquisa feita
na auditoria não encontrou obra que os sustente diretamente; as obras acima sustentam, no máximo, o conceito.

## 5. Links

Em 02/10/2026, os endereços institucionais desta página (IBGE, ANP, Banco Central, B3, Ipeadata, DIEESE e a revista da Unisinos) responderam sem erro a uma
consulta automática; o FRED, que demorou a responder à consulta automática, abriu no navegador. Os links por DOI levam ao editor, que bloqueia clientes automáticos (HTTP 403):
para eles, a existência, o título, os autores, o ano e o periódico foram conferidos no registro do Crossref. Nenhuma URL foi inventada: onde não há endereço confiável (o DOI impresso de Ertel),
nenhum é citado. Para os links de notícias do site, ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md).
