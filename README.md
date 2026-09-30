# CUSTAVA QUANTO?

Última atualização: 30/09/2026 · Status: **CURRENT** (sincronizado com o código)

## 1. Visão geral

**CUSTAVA QUANTO?** é um projeto independente de jornalismo de dados. Permite
explorar como preços, inflação, poder de compra, atividade econômica e indicadores
financeiros do Brasil mudaram desde 2019, comparando dois períodos de governo
com indicadores e metodologia documentados: **Bolsonaro** (jan/2019–dez/2022) e
**Lula** (jan/2023–último dado disponível; período em curso).

O projeto **não** é campanha, ranking de governos, nota, nem previsão. Não atribui
causa: notícias e eventos aparecem como contexto. Cada número traz fonte,
frequência e limitação.

Tagline: "Quanto custava. Quanto custa. O que mudou."

**Endereço oficial: <https://custavaquanto.me/>** (GitHub Pages, publicado por GitHub Actions). Como o domínio, o DNS e a publicação foram configurados, e o que ainda falta fazer à mão: [docs/DEPLOY.md](docs/DEPLOY.md).

## 2. O que o projeto faz

- Mostra 16 séries: 5 combustíveis, 6 alimentos, Dólar, Selic, IPCA, Ibovespa e PIB.
- Compara cada série entre a troca de governo (dez/2022) e o último dado
  disponível.
- Compara os dois períodos lado a lado, com janelas de mesma duração.
- Cruza os indicadores numa análise com critérios definidos antes do cálculo (sem
  nota nem vencedor).
- Acompanha matérias reais da época, conferidas contra a página de origem.

## 3. Perguntas principais

1. Quanto custava e quanto custa? 2. O que mudou entre os dois períodos, na mesma
régua? 3. Como estava o Brasil em um mês qualquer? 4. O que os indicadores mostram
juntos, e com que critério?

## 4. Experiência atual

Site estático em capítulos (`dashboard/index.html`): **Abertura**, **01 Índice**,
**História** (era → agora), **02 Preço**, **03 Bolso**, **04 Contexto**, **05
Máquina do tempo**, **06 Períodos**, **07 Análise**, **08 Arquivo**, **09 Método**,
**10 Apoie**. A numeração é dinâmica (Bolso some nas histórias sem preço ou índice).
A história escolhida fica na URL (`?historia=gasolina`). Descrição de cada capítulo,
dados e limites: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

**Contexto e Arquivo têm papéis diferentes.** **04 Contexto** responde "o que estava acontecendo
em torno do momento em que os dados mudaram?": uma linha do tempo editorial, em ordem
cronológica, com os marcos históricos e a ligação de cada um com os indicadores. **08 Arquivo**
responde "de onde vieram as informações?": uma biblioteca de fontes pesquisável (busca e filtros
por ano, indicador, fonte e dimensão) com todas as matérias e registros do projeto. Os dois se
ligam por "Ver no Contexto" e "Ver no Arquivo". Contexto conta a história; Arquivo guarda a
evidência por trás dela.

## 5. Indicadores

| Grupo | Séries | Unidade |
|---|---|---|
| Combustíveis | Gasolina, Etanol, Diesel, Diesel S10, GLP | R$/litro (GLP: R$/botijão de 13 kg) |
| Alimentos | Arroz, Feijão carioca, Carne (patinho), Leite longa vida, Óleo de soja, Café moído | **índice** (base 100 = jan/2019), **não é R$** |
| Mercados | Dólar (PTAX), Selic (meta), IPCA (12 meses), Ibovespa | R$/US$, % ao ano, % em 12 meses, pontos |
| Atividade | PIB | % de crescimento real (anual; trimestral à parte) |

Dados mensais até ago/2026; Dólar, Selic e Ibovespa diários até 22/09/2026; PIB até o
2º trimestre de 2026 (resultado anual até 2025; **2026 não tem resultado anual**).

## 6. Fontes de dados

| Fonte | O que | Status |
|---|---|---|
| ANP | Preços de combustíveis (média simples mensal nacional) | Produção |
| IBGE/SIDRA | IPCA (deflator e 12 meses), variação mensal por item de alimento, PIB e componentes (tabelas 5932, 6784, 1846) | Produção |
| Banco Central (SGS) | Dólar PTAX (1), meta Selic (432), salário mínimo (1619) | Produção |
| B3 | Ibovespa (fechamento diário, site público do índice) | Produção |
| FRED | Brent (contexto dos combustíveis) | Produção (contexto) |
| CONAB | Preço de varejo de arroz e feijão (R$/kg) | **Planejada, não integrada** (download falha; ver Limitações) |
| DIEESE | Cesta básica em R$ | **Não usada** (sem acesso público em lote); só validação manual |
| CEPEA/ESALQ, Procon, IBGE/POF | Avaliadas em auditoria | Descartadas para o consumidor ([auditoria](docs/AUDITORIA_PRECOS_ALIMENTOS.md)) |

Tabela completa por indicador (frequência, campo, processamento, limitações):
[docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

## 7. Metodologia

- **Variação** = `(fim ÷ início − 1) × 100`. Para taxas (Selic, IPCA, PIB), a
  diferença é em **pontos percentuais**.
- **Real** = nominal × IPCA do último mês ÷ IPCA do mês do preço ("a preços de
  hoje"). O IPCA é o geral, não específico do item.
- **Alimentos** são índices encadeados a partir da variação oficial do IPCA por item;
  **não** são preço em reais.
- **PIB anual** = taxa acumulada no ano lida no 4º trimestre; **trimestral** tem
  quatro leituras que nunca se misturam.
- Detalhes, fórmulas e limitações: [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## 8. Comparação entre os períodos

| Janela | Bolsonaro | Lula |
|---|---|---|
| **Período completo disponível** | jan/2019–dez/2022 (48 meses) | jan/2023–último dado disponível (44 meses em ago/2026; **em curso**) |
| **Mesmo tempo de governo** | meses 1 a *N* do mandato | meses 1 a *N* do mandato (*N* = duração comum calculada dos dados; 44) |
| **Primeiros 12/24/36 meses** (Períodos) | primeiros *n* | primeiros *n* |

O período Lula **não está completo**. As duas janelas existem porque comparar 48
com 44 meses distorce variações acumuladas.

**Análise (metodologia v1.2):** seis dimensões (Custo de vida, Inflação, Renda e
poder de compra, **Mercado de trabalho**, Atividade econômica, Mercados), com nível de evidência (ALTA, MÉDIA,
INFORMATIVA). A comparação principal é a dos períodos inteiros (Bolsonaro jan/2019–
dez/2022; Lula jan/2023–último dado, em curso); "igual duração" é um controle
secundário. Indicadores **Tipo A** têm direção definida antes do cálculo (preço real e
inflação menores; poder de compra e crescimento maiores); **Tipo B** (Dólar, Selic,
Ibovespa) só são descritos; **Tipo C** (salário nominal) é informativo. Cada dimensão
Tipo A vira um sentido pela **mediana** de suas séries (no Mercado de trabalho, cujas séries
têm unidades diferentes, cada série vota uma vez), com tolerância de "praticamente
iguais"; a síntese soma sentidos ponderados, é testada em seis cenários e em todas as
combinações de pesos de 5 em 5 pontos, e o leitor pode mover as prioridades. O Mercado de
trabalho usa três séries da PNAD Contínua (IBGE, tabelas 6381, 6441 e 6390 do SIDRA), em
trimestres móveis. Sem nota, sem vencedor. Ver [docs/METHODOLOGY.md](docs/METHODOLOGY.md) e
[docs/AUDITORIA_ANALISE_GOVERNOS.md](docs/AUDITORIA_ANALISE_GOVERNOS.md).

## 9. Limitações dos dados

1. **ANP**: amostra de postos e média simples; **setembro/2020 sem pesquisa**
   (linhas interrompidas; a Máquina do tempo mostra uma estimativa "≈" marcada).
2. **Alimentos**: índice, não R$; "carne" é só o corte patinho; feijão é o carioca.
3. **Preço absoluto de alimentos**: a CONAB tem script e testes com dados sintéticos,
   mas o download real falhou e **nenhum dado da CONAB está nos resultados**.
4. **PIB**: o IBGE revisa a série; 2026 só tem trimestres; anos antes de 2019 ficam
   fora dos dois períodos.
5. **Ibovespa**: vem de um endpoint público do site da B3, sem garantia contratual;
   "último dado disponível", não tempo real. Selic é a **meta**, não a efetiva.
6. **Salário mínimo**: piso nacional.
7. **Período Lula em curso**: toda leitura é parcial.
8. Problemas verificados e lacunas: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).

## 10. Notícias e contexto

Curadoria manual em `data/news/raw_*.json`; `scripts/build_news.py` abre cada URL e
só publica se a página responde e o título confere (similaridade ≥ 0,80). Hoje: 142
itens, 63 deles **marcos históricos** (`data/news/marcos.json`: dimensão, indicadores, tipo,
relevância e resumo curto do projeto), mostrados como contexto na linha do tempo do capítulo
Contexto e nas seções da Análise. Proximidade no tempo não é evidência de causalidade: o
script recusa resumo com "causou", "provocou" ou "foi responsável por". Fotos: Agência Brasil quando o crédito é da EBC (CC BY 4.0); de outros
veículos, a imagem de capa da matéria, com crédito e **sem licença de reprodução**
(decisão editorial, desligável em `build_news.py`). Sem foto, só texto.
**Proximidade no tempo é contexto, não prova de causa.**

## 11. Arquitetura

```
scripts/        download_*.py, build_dataset.py, build_dashboard_data.py,
                build_news.py, build_analise.py, update_data.py, test_analise.py
data/raw/       cache dos downloads (não versionado)
data/processed/ dados versionados; dashboard_data.json e analysis_*.json alimentam o site
data/news/      curadoria manual de notícias
dashboard/      site estático (index.html, styles.css, js/), lê os JSON; nenhum cálculo
                econômico acontece no navegador
docs/           documentação (ver docs/README.md)
analysis/, output/  gráficos estáticos da primeira fase — HISTÓRICO
```

Sem backend, sem framework, sem biblioteca de gráficos (SVG próprio). Externos em
tempo de leitura: Google Fonts e as imagens das matérias.

## 12. Pipeline de dados

`fonte → download_*.py → data/processed/*.csv → build_dataset.py →
build_dashboard_data.py → dashboard_data.json → build_analise.py →
analysis_*.json → dashboard`. Detalhes e quais scripts o `update_data.py` roda (e
quais não): [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

## 13. Desenvolvimento local

Requer Python 3.11 (o ambiente atual usa 3.11.9). Nos exemplos, caminhos do Windows
(Git Bash/PowerShell); em outros sistemas, troque `.venv/Scripts/` por `.venv/bin/`.

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

`process_portraits.py` também precisa de Pillow (`.venv/Scripts/pip install pillow`),
que ainda não está no `requirements.txt`.

Servir o site (precisa de HTTP; `file://` não funciona):

```bash
.venv/Scripts/python -m http.server 8420
```

e abrir `http://localhost:8420/dashboard/index.html`.

## 14. Atualizando os dados

```bash
.venv/Scripts/python scripts/update_data.py            # completo (ANP e IBGE são lentos)
.venv/Scripts/python scripts/update_data.py --rapido   # só mercados, salário mínimo, Brent, build, notícias, análise
```

**Não estão no `update_data.py`** e precisam de execução manual:

```bash
.venv/Scripts/python scripts/download_pib.py               # PIB trimestral e anual
.venv/Scripts/python scripts/download_pib_componentes.py   # componentes e PIB nominal trimestral
.venv/Scripts/python scripts/download_ibge_combustiveis.py # insumo da estimativa de set/2020
.venv/Scripts/python scripts/download_conab.py             # CONAB (hoje falha)
```

Depois de baixar o PIB, reconstrua: `scripts/build_dashboard_data.py`, `scripts/build_analise.py`
e `scripts/test_analise.py`. Não rode `download_bcb.py` nem `download_ibovespa.py`
(legados; sobrescrevem a fonte de produção). Para o Apoie, preencha `PIX_KEY`,
`MERCHANT_NAME` e `MERCHANT_CITY` em `dashboard/js/apoie.config.js` (enquanto forem
"COLOQUE_…", a página não gera QR Code nem Pix Copia e Cola).

## 15. Testes e QA

```bash
.venv/Scripts/python scripts/test_analise.py           # validações da Análise (automático)
.venv/Scripts/python scripts/download_conab.py --autoteste   # dados sintéticos
```

Não há testes automáticos do front-end nem de acessibilidade; essas checagens foram
manuais. Ver [docs/TESTING_AND_QA.md](docs/TESTING_AND_QA.md).

## 16. Documentação

Índice: [docs/README.md](docs/README.md). Principais:
[CURRENT_STATE](docs/CURRENT_STATE.md) · [METHODOLOGY](docs/METHODOLOGY.md) ·
[DATA_PIPELINE](docs/DATA_PIPELINE.md) · [KNOWN_ISSUES](docs/KNOWN_ISSUES.md) ·
[ROADMAP](docs/ROADMAP.md) · [DESIGN.md](DESIGN.md) · [PRODUCT.md](PRODUCT.md).

## 17. Roadmap

Em [docs/ROADMAP.md](docs/ROADMAP.md). Prioridades: alinhar o texto do Método aos
dados (CONAB, seletor jan/2019), decidir a posição editorial sobre o PIB na Análise,
incluir o PIB no fluxo de atualização e salvar as verificações de acessibilidade.

## 18. Contribuição e manutenção

O repositório é público: <https://github.com/leonardotteixeira/custava-quanto>.
Fonte incorreta, cálculo inconsistente ou escolha metodológica questionável: abra uma
*issue*. Mudanças na metodologia da Análise exigem subir `METODOLOGIA_VERSAO` em
`scripts/build_analise.py` e registrar em `docs/AUDITORIA_ANALISE_GOVERNOS.md`. Regra
do projeto: nada de dado, fonte, notícia ou imagem inventados.

## 19. Licença

O repositório **não tem arquivo de licença**. Retratos dos presidentes: CC BY 2.0
(Wikimedia Commons, crédito no site). Fotos da Agência Brasil: CC BY 4.0. Fotos de
outros veículos: sem licença de reprodução (ver seção 10).
