# CUSTAVA QUANTO? — Combustíveis e Alimentos: Bolsonaro x Lula

Projeto pessoal de análise de dados comparando preços de combustíveis e itens
da cesta básica entre o governo Bolsonaro (até 31/12/2022) e o governo Lula
(desde 01/01/2023), com o contexto necessário (câmbio, petróleo Brent) para
não atribuir a um governo o que é efeito de fatores externos.

**Objetivo declarado: entender o que os dados mostram, não confirmar uma
narrativa.** Ver [output/RESUMO.md](output/RESUMO.md) para as conclusões e,
principalmente, para as limitações da análise — elas importam tanto quanto os
números. O projeto tem duas camadas de apresentação: um **dashboard
interativo** ([dashboard/](dashboard/), ver [seção abaixo](#dashboard-custava-quanto))
e os gráficos estáticos originais em `output/`.

## Fontes de dados

| Fonte | O que | Cobertura |
|---|---|---|
| [ANP](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis) | Gasolina comum, etanol hidratado, diesel (comum e S10), GLP (botijão 13kg) — preço por posto revendedor, agregado aqui por mês/região | 2019–hoje |
| [IBGE/SIDRA](https://sidra.ibge.gov.br) | IPCA geral (deflator) e variação mensal de itens específicos (arroz, feijão, carne, leite, óleo de soja, café) | 2019–hoje |
| [Banco Central (SGS)](https://www3.bcb.gov.br/sgspub/) | Câmbio USD/BRL e Selic (também tratados como "produtos" próprios no dashboard) e salário mínimo nacional (série 1619) | 2019–hoje |
| [FRED (Brent)](https://fred.stlouisfed.org/series/DCOILBRENTEU) | Petróleo Brent, USD/barril — contexto | 2019–hoje |
| [Yahoo Finance (^BVSP)](https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP) | Ibovespa, fechamento mensal em pontos — "produto" próprio no dashboard | 2019–hoje |
| DIEESE (Cesta Básica Nacional) | **Não incluída no pipeline automático** — ver [Sobre o DIEESE](#sobre-o-dieese) | — |

## Estrutura do projeto

```
data/
  raw/          dados brutos baixados (não versionado — ver .gitignore)
  processed/    dados agregados/tratados (versionado, são pequenos)
                inclui dashboard_data.json, a fonte única de dados do dashboard
scripts/        download_*.py (coleta), build_dataset.py e
                build_dashboard_data.py (consolidação)
analysis/       analysis.py — gera os gráficos estáticos em /output
output/         gráficos (.html) e RESUMO.md com as conclusões
dashboard/      site estático interativo (HTML/CSS + módulos JS em js/,
                gráficos em SVG próprio, sem biblioteca de gráficos),
                lê data/processed/dashboard_data.json — nenhum cálculo
                econômico acontece no navegador
```

## Como rodar

Requer Python 3.11+. Recomendado usar o ambiente virtual do projeto:

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

**Atalho:** depois da primeira execução completa (passos 1–4 abaixo pelo
menos uma vez), `scripts/update_data.py` roda tudo de novo em sequência —
baixa os dados mais recentes de cada fonte, consolida e reverifica as
notícias — parando na primeira falha de uma etapa crítica:

```bash
.venv/Scripts/python scripts/update_data.py            # pipeline completo (inclui ANP, IBGE — demorado)
.venv/Scripts/python scripts/update_data.py --rapido    # pula ANP/IBGE; só atualiza dados de mercado (via download_mercados.py) e notícias
```

Os passos abaixo explicam o que cada etapa faz, para quem quiser rodar (ou
depurar) uma de cada vez.

### 1. Baixar os dados brutos

```bash
.venv/Scripts/python scripts/download_anp.py        # demorado (~1-2GB, vários arquivos grandes da ANP)
.venv/Scripts/python scripts/download_ibge.py
.venv/Scripts/python scripts/download_mercados.py   # Dólar, Selic, Ibovespa (dados diários desde 2019)
.venv/Scripts/python scripts/download_brent.py
.venv/Scripts/python scripts/download_salario_minimo.py
```

Todos os scripts são **idempotentes**: usam cache em `data/raw/` e podem ser
re-executados a qualquer momento para atualizar com dados mais recentes (por
padrão, `download_anp.py` baixa de 2019 até o ano atual; ajuste com
`--ano-inicio`/`--ano-fim` se quiser um recorte diferente).

### 2. Consolidar e deflacionar

```bash
.venv/Scripts/python scripts/build_dataset.py
```

Gera os datasets finais em `data/processed/`: séries mensais nominais e
reais (deflacionadas pelo IPCA), e os resumos por período de governo.

### 3. Gerar os gráficos estáticos

```bash
.venv/Scripts/python analysis/analysis.py
```

Gera arquivos `.html` interativos em `output/` (abra no navegador).

### 4. Gerar os dados do dashboard e rodar o dashboard

```bash
.venv/Scripts/python scripts/build_dashboard_data.py
```

Gera `data/processed/dashboard_data.json` — a única fonte de dados que o
dashboard lê (nenhum cálculo de preço/deflação acontece em JavaScript).

O dashboard é HTML/CSS/JS estático e usa `fetch()`, então precisa ser servido
por HTTP (abrir `dashboard/index.html` direto como `file://` não funciona).
Da raiz do projeto:

```bash
.venv/Scripts/python -m http.server 8420
```

e abra `http://localhost:8420/dashboard/index.html`. (Há também um
`.claude/launch.json` já configurado para isso, se estiver usando o Claude
Code desktop app com preview de navegador.)

## Dashboard CUSTAVA QUANTO?

Camada de apresentação interativa sobre os mesmos dados do pipeline: escolha
um produto (5 combustíveis, 6 itens da cesta básica ou um indicador de
**Mercados** — Dólar, Selic, Ibovespa, IPCA) e veja a evolução no tempo,
comparação Bolsonaro x Lula (governo inteiro ou primeiros 12/24/36 meses),
contexto, notícias reais da época e histórico anual. Combustíveis e Dólar
também têm preço em R$ (nominal, real ou % do salário mínimo) e poder de
compra; Selic e IPCA (taxas, % ao ano) e Ibovespa (pontos, não é R$) têm cada
um sua própria leitura — não fazem sentido nas mesmas contas de "preço" ou
"poder de compra" dos outros produtos.

- **Nada é calculado no navegador.** `scripts/build_dashboard_data.py` faz
  todas as contas em Python e grava o resultado pronto em
  `dashboard_data.json`; `dashboard/js/` só formata e desenha (as únicas
  contas no navegador são razões de exibição entre valores prontos:
  variação entre dois meses, base 100 num mês escolhido, largura de barras).
- **Cotação de hoje (Dólar/Selic)**: `scripts/download_mercados.py` baixa
  dados diários desde 2019 do Banco Central (SGS séries 1 e 432) e grava a
  última cotação disponível em `data/processed/bcb_hoje.json`. Mostrada à
  parte da série mensal (que fica limitada ao último mês fechado), para
  acompanhar o valor mais recente sem esperar o mês fechar. Para a Selic,
  essa cotação diária também traz `vigente_desde` (primeira data da sequência
  atual do mesmo valor) — mostrado como "vigente desde" no dashboard,
  separado da data da própria decisão do Copom, e sempre rotulado como
  **Selic-meta** (a taxa definida pelo Copom), não a Selic efetiva diária.
- **Cotação de hoje do Ibovespa**: `scripts/download_mercados.py` também
  baixa dados diários do Ibovespa (B3) desde 2019, com fechamento de cada
  pregão, e grava em `data/processed/ibovespa_hoje.json`. Não é tempo real
  garantido — é a cotação mais recente que B3 publica, sujeito aos atrasos
  normais de mercado; o dashboard deixa isso explícito no selo. Para
  histórico: os meses fechados estão em `ibovespa_mensal.csv`.
- **"Como estava o Brasil?"**: uma fotografia cross-indicador (Dólar,
  Ibovespa, Selic, IPCA, salário mínimo, Gasolina) para os meses Era/Agora
  do produto selecionado — montada em `montar_fotografia_mensal()`
  (`build_dashboard_data.py`) só a partir de campos que os outros produtos
  já calcularam, sem nenhuma conta nova.
- **Salário mínimo**: Banco Central, SGS série 1619 (piso nacional, nominal
  — não reflete pisos regionais mais altos em alguns estados).
- **Fotos dos presidentes**: retratos oficiais do acervo do Palácio do
  Planalto, licença CC BY 2.0, via Wikimedia Commons (mesmas fotos usadas
  pela Wikipedia em pt-BR) — crédito visível no próprio card.
- **Cesta básica no dashboard**: mostra o índice relativo (não R$), com a
  mesma nota de limitação do restante do projeto, sempre visível na tela
  (não escondida em tooltip).
- **Escopo do MVP**: região é sempre "Brasil" (os dados têm quebra regional
  em `combustiveis_final.csv`, mas o dashboard não expõe esse filtro ainda).

### Estrutura da página (v2)

A página é uma publicação em capítulos, não um painel: abertura (nome, frase
e uma textura com as 15 séries reais), **01 Índice** (sumário com a variação
de cada série e o ponto de partida: dez/2022 ou jan/2019), a **história** do
produto escolhido (era → agora), **02 Preço** (gráfico mensal com faixas de
período, marcos de contexto e notícias), **03 Bolso** (poder de compra do
salário mínimo, com um seletor de mês), **04 Contexto** (pequenos múltiplos
na mesma escala, base 100), **05 Máquina do tempo** (o Brasil em qualquer
mês, com o noticiário daquele mês), **06 Períodos** (mesma régua para os dois
governos, com recortes de mesma duração), **07 Arquivo** e **08 Método**.
A história escolhida fica na URL (`?historia=gasolina&desde=2019`), então
qualquer leitura pode ser compartilhada. Decisões visuais em
[DESIGN.md](DESIGN.md).

## Notícias da época

O dashboard intercala os dados com **matérias jornalísticas reais**:
marcadores numerados e clicáveis no gráfico mensal (com a matéria aberta ao
lado, em "O que se noticiava"), o noticiário de cada mês na Máquina do tempo
e o Arquivo, ano a ano, com a média do produto em cada ano.

- **Curadoria:** `data/news/raw_*.json` (título, veículo, data, URL, resumo e
  tags de produto de cada matéria).
- **Verificação:** `scripts/build_news.py` abre cada URL e só publica o item se
  a página responder e o título curado bater com o título da própria página.
  A descrição exibida é a publicada pela página (og:description). Saída em
  `data/processed/noticias.json`.

  ```bash
  .venv/Scripts/python scripts/build_news.py
  ```
- **Fotos:** só aparecem quando a licença permite reprodução com crédito
  (Agência Brasil, CC BY 4.0) **e** o crédito não indica restrição. Fotos da
  Reuters/AFP, "Divulgação" ou "Direitos reservados" publicadas pela própria
  Agência Brasil ficam de fora. As demais matérias aparecem só com texto.
- **Não é causalidade:** as notícias mostram o que estava sendo noticiado em
  cada momento. Elas não substituem os números nem provam que um evento
  causou uma variação de preço.

## Metodologia (resumo)

- **Dois períodos**: Bolsonaro (01/2019–12/2022) e Lula (01/2023–mês mais
  recente disponível). O marco de corte é `2023-01-01`, ver
  `scripts/common.py`.
- **Nominal vs. real**: preço nominal é o valor observado no mês; preço real
  é o nominal multiplicado pelo IPCA do mês mais recente dividido pelo IPCA
  do mês da observação (ou seja, "a preços de hoje"). Isso evita que a
  inflação acumulada do período infle artificialmente a variação percentual.
- **Variação dentro do período**: comparação entre o primeiro e o último mês
  disponível de cada período, não entre o primeiro/último ponto de toda a
  série.
- **Contexto de combustíveis**: cada preço de combustível vem acompanhado do
  câmbio USD/BRL e do Brent (em USD e convertido para BRL) do mesmo mês, para
  visualizar quanto da variação de preço reflete fatores internacionais
  (petróleo, câmbio) vs. decisões domésticas (política de preços da
  Petrobras, tributos estaduais/federais).
- **Cesta básica**: o SIDRA não publica preço médio absoluto em R$ por item a
  nível nacional — só a variação percentual mensal oficial do IPCA por
  subitem. Por isso o dataset de cesta básica é um **índice relativo**
  (encadeado a partir dessa variação, base 100 em jan/2019), não um preço em
  reais. Ver limitações abaixo.

## Limitações (leia antes de tirar conclusões)

1. **ANP tem defasagem e é uma amostra**: a pesquisa é semanal, feita por
   empresa contratada, cobre um subconjunto de postos (não todos) e alguns
   meses/regiões têm menos coletas que outras — isso afeta a precisão da
   média, especialmente em regiões menores (Norte, Centro-Oeste).
   **Setembro/2020 está completamente ausente** dos dados brutos publicados
   pela ANP para todos os combustíveis (confirmado direto no arquivo fonte,
   não é bug deste projeto) — coincide com um dos picos da pandemia, mas não
   temos confirmação da causa. **Abril/2026 também está ausente** da série
   processada atual (`anp_precos_mensais.csv`); a página detecta os meses
   faltantes a partir dos próprios dados e os declara na fonte de cada
   gráfico e em Método › Limitações.
2. **Cesta básica não é preço em R$**: como explicado acima, os itens do
   IBGE aqui são um índice relativo, não um valor monetário. Para preço
   absoluto (ex.: "quanto custa 1kg de arroz"), a fonte de referência no
   Brasil é o DIEESE — mas o banco de dados histórico do DIEESE por produto
   deixou de ser público em abril/2018 (ver abaixo).
3. **"Carne bovina" é um corte específico**: o IBGE não publica uma média
   única de "carne bovina" — publica por corte (picanha, patinho, alcatra
   etc.). Este projeto usa **Patinho** como referência por ser um corte
   popular e de consumo disseminado, mas isso não representa todos os cortes
   (cortes nobres tiveram trajetória de preço bem diferente de cortes
   populares em alguns períodos, puxada por exportação).
4. **Diesel "comum" perdeu participação de mercado**: a partir de ~2013 o
   diesel S10 foi gradualmente substituindo o diesel S500 ("comum") nos
   postos. O projeto reporta os dois separadamente — o S10 é hoje o mais
   relevante para o consumidor.
5. **Câmbio e Brent são contexto, não prova de causalidade**: mostrar que o
   Brent ou o câmbio variaram na mesma direção que o preço do combustível não
   isola o efeito de decisões domésticas (política de preços da Petrobras,
   ICMS, PIS/COFINS/CIDE). Uma decomposição causal rigorosa exigiria um
   modelo econométrico fora do escopo deste projeto — aqui o objetivo é dar
   contexto visual, não atribuir causalidade.
6. **IPCA é geral, não "cesta do projeto"**: o deflator usado é o IPCA cheio
   (todos os produtos/serviços), não um índice específico de combustíveis ou
   alimentos — é o padrão para "preço real", mas significa que o preço real
   de um item específico pode divergir do IPCA cheio por razões que nada têm
   a ver com o item (ex.: peso de serviços no IPCA).
7. **Sem ajuste sazonal**: preços de alimentos (especialmente hortifruti,
   fora do escopo aqui, mas também grãos) têm sazonalidade forte ligada à
   safra; os itens escolhidos (arroz, feijão, café, óleo de soja, leite,
   carne) são menos sazonais que hortifrutis, mas quebras de safra e
   entressafra ainda afetam meses específicos — isso é mencionado no resumo
   qualitativamente, não modelado formalmente.
8. **Salário mínimo é o piso nacional**: usado no dashboard para "% do
   salário mínimo" e "poder de compra" — é o valor nominal vigente em cada
   mês (BCB SGS 1619), não ajustado por pisos regionais mais altos que
   alguns estados praticam para certas categorias.

### Sobre o DIEESE

O DIEESE mantém a Pesquisa Nacional da Cesta Básica de Alimentos (PNCBA),
historicamente a referência para preço médio de itens da cesta básica por
capital. Desde abril/2018, porém, os indicadores de preço por produto e
cidade **não são mais de acesso público gratuito** — é preciso ser entidade
sindical filiada ou contratar acesso (ver
[nota oficial do DIEESE](https://www.dieese.org.br/analisecestabasica/notaBancoDados.html)).
Existe uma ferramenta de consulta pública em
[dieese.org.br/cesta](https://www.dieese.org.br/cesta/), mas não expõe
download em lote (CSV/XLS) sem automação adicional fora do escopo deste
projeto. Por isso o DIEESE **não está no pipeline automatizado** — é citado
aqui como fonte para validação cruzada manual: se quiser conferir um número
específico deste projeto contra o DIEESE, consulte o site diretamente ou os
relatórios mensais em PDF publicados em
[dieese.org.br/analisecestabasica](https://www.dieese.org.br/analisecestabasica/analiseCestaBasicaAnteriores.html).

### Preço absoluto (R$) para alimentos: por que ainda é só índice

Os seis itens de alimento aparecem como índice de preço, não em R$, porque
essa é a única coisa que o IBGE publica (ver acima). Antes de aceitar essa
limitação como definitiva, o projeto auditou outras fontes possíveis —
DIEESE, CONAB, CEPEA/ESALQ, Procon, IBGE/POF — avaliando cobertura
geográfica, frequência, se o produto pesquisado é o mesmo do início ao fim
da série e se o dado é preço absoluto de fato, não uma commodity num
estágio diferente da cadeia (ex.: preço pago ao produtor, não ao
consumidor). Resultado: nenhuma fonte passou em todos os critérios para
nenhum dos seis itens hoje; arroz e feijão têm um candidato promissor
(CONAB, preço de varejo por estado) que fica como próximo passo, pendente
de verificar o arquivo real. Auditoria completa, fonte por fonte, em
[docs/AUDITORIA_PRECOS_ALIMENTOS.md](docs/AUDITORIA_PRECOS_ALIMENTOS.md).

## Atualizando os dados no futuro

O jeito mais simples é `.venv/Scripts/python scripts/update_data.py` (ou
`--rapido` para pular ANP/IBGE) — ver [Como rodar](#como-rodar). Isso
equivale a rodar os 6 scripts de download novamente (eles buscam
automaticamente até o dado mais recente disponível em cada fonte), depois
`build_dataset.py`, `build_dashboard_data.py` e `build_news.py` (reverifica
as notícias curadas contra as páginas originais). Quer os gráficos estáticos
também? Rode `analysis/analysis.py` à parte. Não é preciso apagar
`data/raw/` — o cache local evita rebaixar arquivos que não mudam (arquivos
de meses/anos fechados da ANP raramente são revisados; se desconfiar de dado
desatualizado, apague o arquivo específico em `data/raw/anp/` e rode de
novo).
