# CUSTAVA QUANTO?

**Quanto custava. Quanto custa. O que mudou.**

Jornalismo de dados sobre preços, inflação, renda e economia brasileira · Site: <https://custavaquanto.me/> · Metodologia da Análise: **v1.4.0**

## O que é

CUSTAVA QUANTO? é um projeto independente de jornalismo de dados. Ele reúne dados públicos (ANP, IBGE, Banco Central, B3) para mostrar como **preços, inflação, renda, atividade econômica e indicadores financeiros** mudaram no Brasil desde janeiro de 2019, e transforma séries históricas em um site que qualquer pessoa pode explorar:

- escolher uma série (combustíveis, alimentos, câmbio, juros, bolsa, inflação, PIB) e acompanhar a trajetória mês a mês, em reais da época ou corrigidos pela inflação;
- comparar o período Bolsonaro (jan/2019 a dez/2022) e o período Lula (jan/2023 até o último dado, em curso) com a mesma régua;
- ver o contexto de cada momento, com matérias reais conferidas na fonte;
- abrir a fonte de cada número e auditar os cálculos;
- testar como a leitura muda quando se muda o peso de cada dimensão.

Não há backend: é um site estático alimentado por um pipeline Python aberto neste repositório. O projeto não tem anunciante, partido nem campanha.

## Objetivo e princípios

O objetivo não é dizer ao leitor o que pensar sobre os números, mas tornar os números, o contexto e o caminho até eles transparentes o bastante para que cada pessoa chegue à própria conclusão. Na prática:

- **Sem nota e sem vencedor.** Os textos gerados não usam "venceu", "melhor governo" ou "pior governo"; o teste automatizado falha se aparecerem.
- **"Subiu" não é "melhorou".** Preço real em queda significa menos pressão sobre o consumidor; dólar, Selic e Ibovespa não têm direção única de bem-estar e só são descritos.
- **Proximidade no tempo não é causa.** Notícias e marcos históricos são contexto; o projeto não afirma relação de causa.
- **Critério antes do resultado.** A pergunta, a régua e o critério de cada dimensão ficam num arquivo de metodologia com hash SHA-256, conferido pelo teste.
- **Nada inventado.** Dado, fonte, notícia ou imagem que não possa ser verificado não entra.

## Dados

| Grupo | Séries | Fonte |
|---|---|---|
| Combustíveis | Gasolina, etanol, diesel, diesel S10, GLP | ANP, série mensal nacional oficial (ponderada por vendas) |
| Alimentos | Arroz, feijão carioca, carne (patinho), leite longa vida, óleo de soja, café moído | IBGE/SIDRA, IPCA por subitem (índice encadeado, **não é preço em R$**) |
| Inflação | IPCA (número-índice e acumulado em 12 meses) | IBGE/SIDRA |
| Renda | Salário mínimo nominal e real | Banco Central (SGS 1619) e IPCA |
| Mercados | Dólar (PTAX), Selic (meta), Ibovespa | Banco Central e B3 |
| Atividade | PIB (anual e trimestral) | IBGE, Contas Nacionais |
| Mercado de trabalho | Desocupação, subutilização, rendimento real habitual | IBGE, PNAD Contínua |
| Contexto | Brent; 142 notícias e marcos, de curadoria manual | FRED; veículos e fontes oficiais |

As frequências são diferentes e o site as respeita: combustíveis e alimentos são mensais, dólar, Selic e Ibovespa são diários, o mercado de trabalho vem em trimestres móveis e o PIB é anual e trimestral. Tabela completa por indicador (frequência, campo, processamento, limitações): [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

## Metodologia

A Análise compara os dois períodos em **seis dimensões** (Custo de vida, Inflação, Renda e poder de compra, Mercado de trabalho, Atividade econômica e Mercados). Cinco têm direção definida antes do cálculo; Mercados é só descritiva. Cada dimensão resulta em uma leitura (aponta para um período ou os dois ficam praticamente iguais), e a síntese soma essas leituras ponderadas pelos pesos que o leitor escolhe.

Resumo das regras principais:

- **Variação** é `(fim ÷ início − 1) × 100`; para taxas (Selic, IPCA, PIB) a diferença é em pontos percentuais.
- **Valor real** é o valor nominal expresso em reais do último mês com IPCA: `nominal × IPCA do último mês ÷ IPCA do mês`.
- **Salário mínimo real** usa a mesma conta, com série própria e completa. **Litros de gasolina por salário mínimo** é um indicador à parte e não tem voto em Renda (repetiria o salário real e o preço da gasolina).
- **Custo de vida: trajetória × nível.** A leitura principal é a variação real do início ao fim de cada período ("como os preços variaram?"). O nível real médio durante o período ("qual era o preço típico?") aparece à parte, como "outra forma de olhar", e **não entra na síntese**. São perguntas diferentes, e a leitura do nível depende do resumo escolhido.
- **Análise de sensibilidade aos pesos.** A síntese é refeita para todas as 10.626 combinações de pesos de 5 em 5 pontos que somam 100 (C(24, 4)). É uma grade discreta, não todos os pesos possíveis, e não é validação externa da metodologia.
- **Janela de comparação:** a mesma janela de calendário nos dois períodos, nunca o mesmo número de observações.
- **O que é fonte e o que é convenção.** Os dados e as definições vêm de IBGE, ANP, Banco Central e B3; a mediana do Custo de vida, o voto por dimensão com tolerância, a razão litros por salário mínimo e a grade de pesos são **convenções do projeto**, sem literatura que as sustente diretamente.

Onde ler mais:

- **Metodologia completa:** [docs/METHODOLOGY.md](docs/METHODOLOGY.md), com a tabela "Origem da metodologia" (o que é fonte oficial, literatura ou convenção própria, componente por componente).
- **Referências:** [docs/referencias.md](docs/referencias.md), cada uma com o que sustenta e o que não sustenta.
- **Auditoria:** [docs/AUDITORIA_ACADEMICA_METODOLOGIA.md](docs/AUDITORIA_ACADEMICA_METODOLOGIA.md) (auditoria acadêmica e oficial da metodologia), [docs/AUDITORIA_ANALISE_GOVERNOS.md](docs/AUDITORIA_ANALISE_GOVERNOS.md) (histórico de versões da metodologia) e [docs/AUDITORIA_LINKS_NOTICIAS.md](docs/AUDITORIA_LINKS_NOTICIAS.md) (links das notícias).
- **No site:** capítulo 09 Método, com os blocos "Referências e base metodológica" e "Audite a análise".

A auditoria verificou contas, fontes e alternativas; ela não transforma as escolhas próprias do projeto em metodologia acadêmica universalmente aceita. O projeto não é "cientificamente comprovado": documenta cada escolha, mostra as alternativas e deixa o leitor conferir.

## Como auditar

1. **No site:** o capítulo 09 Método mostra a versão da metodologia, o hash, as janelas, as tolerâncias, o tipo e a fonte de cada indicador e as fórmulas.
2. **Nos arquivos:** `analysis_methodology.json` (critérios), `analysis_results.json` (resultados) e `dashboard_data.json` (séries) em [`data/processed/`](data/processed/); todos são JSON legível.
3. **Refazendo o cálculo:** `scripts/build_analise.py` grava primeiro a metodologia e seu hash e só depois os resultados; `scripts/test_analise.py` recalcula de forma independente as sínteses, a grade de pesos, as variações e as janelas. Passo a passo: [docs/REPRODUCAO.md](docs/REPRODUCAO.md).
4. **Nas fontes:** cada notícia tem link para a página original, e cada indicador, a tabela de origem.

## Reprodução

Requer Python 3.11. Em resumo:

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt     # em Linux/macOS: .venv/bin/
.venv/Scripts/python scripts/update_data.py       # baixa os dados e reconstrói tudo
.venv/Scripts/python scripts/test_analise.py      # valida dados, cálculos e metodologia
.venv/Scripts/python -m http.server 8420          # abrir http://localhost:8420/dashboard/index.html
```

Os dados processados já estão versionados em `data/processed/`, então a análise pode ser refeita e testada sem baixar nada de novo. Detalhes, incluindo os scripts que rodam à parte: [docs/REPRODUCAO.md](docs/REPRODUCAO.md).

## Limitações

1. **ANP:** setembro/2020 não tem pesquisa; as linhas ficam interrompidas e a Máquina do tempo mostra uma estimativa marcada com "≈".
2. **Alimentos:** índice, não preço em reais; "carne" é só o corte patinho; o feijão é o carioca. Nenhum preço absoluto de alimento foi integrado (as fontes avaliadas estão em [docs/AUDITORIA_PRECOS_ALIMENTOS.md](docs/AUDITORIA_PRECOS_ALIMENTOS.md)).
3. **PIB:** o IBGE revisa a série; 2026 só tem trimestres.
4. **Ibovespa e Selic:** o Ibovespa vem de endpoint público da B3, sem garantia contratual, e é "último dado disponível", não tempo real; a Selic é a meta, não a taxa efetiva.
5. **Salário mínimo:** piso nacional; alguns estados têm pisos maiores.
6. **Período Lula em curso:** toda leitura sobre ele é parcial.
7. **Escopo:** contas públicas, dívida, desigualdade de renda, informalidade e qualidade do emprego ficam fora por falta de série no projeto.
8. **A Análise descreve; não explica.** Ela não mede causa e muda com os pesos.
9. **Convenções próprias:** parte do método não tem literatura direta (ver "Metodologia" acima). O método do Custo de vida foi avaliado como "defensável, com limitações", e a reprodução da série da ANP deixa um resíduo de 0,14% a 0,47% sem explicação.

Problemas conhecidos e lacunas de dados: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).

## O site

Publicação em capítulos (`dashboard/index.html`): 01 Índice, 02 Preço, 03 Bolso, 04 Contexto, 05 Máquina do tempo, 06 Períodos, 07 Análise, 08 Arquivo e 09 Método. O endereço não muda ao navegar entre capítulos. HTML, CSS e JavaScript puros, sem framework e sem etapa de build; os gráficos são SVG próprio; nenhum cálculo econômico é feito no navegador (as únicas contas são a soma ponderada dos sentidos já calculados, quando o leitor mexe nos pesos, e a distância entre dois valores já calculados em Python). Sem backend, sem cookies, sem rastreamento. O site é publicado no GitHub Pages pelo workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml); domínio, DNS e como voltar atrás: [docs/DEPLOY.md](docs/DEPLOY.md).

## Estrutura do repositório

```text
dashboard/        site estático (index.html, styles.css, js/, assets/)
data/processed/   dados processados e resultados (versionados)
data/news/        curadoria manual de notícias e marcos
scripts/          download_*.py, build_*.py, update_data.py, test_analise.py
docs/             metodologia, referências, auditorias, pipeline, deploy, problemas conhecidos
.github/          workflow de publicação no GitHub Pages
```

## Contribuindo

O repositório é público: <https://github.com/leonardotteixeira/custava-quanto>.

- **Fonte incorreta, cálculo inconsistente ou escolha metodológica questionável?** Abra uma *issue* dizendo qual número, qual fonte e o que não bate.
- **Mudança na metodologia da Análise?** Exige subir `METODOLOGIA_VERSAO` em `scripts/build_analise.py`, registrar a decisão em [docs/AUDITORIA_ANALISE_GOVERNOS.md](docs/AUDITORIA_ANALISE_GOVERNOS.md) e rodar `scripts/test_analise.py`.
- **Nova notícia ou marco?** Entra em `data/news/` com URL real; `scripts/build_news.py` confere a página antes de publicar.
- **Regra do projeto:** nada de dado, fonte, notícia ou imagem inventados, e nenhuma linguagem de causa, nota ou vencedor.

## Licença e créditos

O repositório não tem arquivo de licença; sem uma, valem os direitos reservados por padrão. Os dados vêm de fontes públicas, citadas acima. Retratos dos presidentes: CC BY 2.0 (Wikimedia Commons, crédito no site). Fotos da Agência Brasil: CC BY 4.0. Fotos de outros veículos: imagem de capa da matéria, com crédito e sem licença de reprodução (decisão editorial). O vídeo da abertura da Análise é uma ilustração gerada por IA, e o site diz isso.

## Documentação

Índice: [docs/README.md](docs/README.md). Principais: [METHODOLOGY](docs/METHODOLOGY.md) · [referencias](docs/referencias.md) · [AUDITORIA_ACADEMICA_METODOLOGIA](docs/AUDITORIA_ACADEMICA_METODOLOGIA.md) · [REPRODUCAO](docs/REPRODUCAO.md) · [DATA_PIPELINE](docs/DATA_PIPELINE.md) · [KNOWN_ISSUES](docs/KNOWN_ISSUES.md) · [TESTING_AND_QA](docs/TESTING_AND_QA.md) · [DEPLOY](docs/DEPLOY.md).
