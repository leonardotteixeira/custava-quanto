# CUSTAVA QUANTO?

> **Quanto custava. Quanto custa. O que mudou.**

**Jornalismo de dados sobre preços, inflação, renda e economia brasileira.**

🌐 **<https://custavaquanto.me/>**

Última atualização deste documento: 01/10/2026 · Status: **CURRENT**. O código e os dados do
repositório são a fonte da verdade; se este texto e o código discordarem, vale o código
(e a discordância deve entrar em [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)).

---

## O que é

**CUSTAVA QUANTO?** é um projeto independente de jornalismo de dados. Ele reúne dados públicos
para explorar como **preços, inflação, renda, atividade econômica e indicadores financeiros**
mudaram no Brasil desde janeiro de 2019, e transforma séries históricas em uma experiência
visual que qualquer pessoa pode explorar.

Quem entra no site pode:

- **escolher uma série** (combustíveis, alimentos, câmbio, juros, bolsa, inflação, PIB);
- **acompanhar a trajetória** dela, mês a mês, em reais ou a preços de hoje;
- **comparar períodos**: o período Bolsonaro (jan/2019–dez/2022) e o período Lula
  (jan/2023 até o último dado, em curso), com a mesma régua;
- **observar o que acontecia** em torno das mudanças, com matérias reais conferidas na fonte;
- **consultar as fontes** de cada número e de cada notícia;
- **entender a metodologia** e **auditar os cálculos**;
- **testar diferentes formas de interpretar os dados**, mudando o peso que cada dimensão tem.

O projeto não tem anunciante, partido nem campanha. Não há backend: é um site estático
alimentado por um pipeline Python aberto neste repositório.

---

## A pergunta é simples

> Quanto custava?
>
> Quanto custa?
>
> O que mudou?

Responder bem a essa pergunta exige mais do que parece:

- **séries históricas** de fontes diferentes, em tabelas e sistemas diferentes;
- **frequências diferentes** (a gasolina é mensal, o dólar é diário, o PIB é trimestral e anual);
- **inflação**: R$ 4,96 em 2022 não é o mesmo que R$ 4,96 hoje, então é preciso comparar a
  preços de uma mesma data;
- **tratamento de dados**: meses sem pesquisa, índices que não são preços, trimestres móveis;
- **comparação de períodos** com durações diferentes;
- **fontes** que o leitor possa abrir e conferir;
- **contexto**, sem confundir "aconteceu na mesma época" com "foi a causa";
- **limitações**, ditas em voz alta.

O objetivo do projeto é transformar tudo isso em algo compreensível, sem esconder o caminho.

---

## Por que existe

Os dados econômicos brasileiros existem em várias instituições (ANP, IBGE, Banco Central, B3 e
outras), em tabelas e sistemas distintos. Com frequência eles aparecem **separados** do período,
da unidade, da metodologia, da inflação, da fonte e do contexto, e é justamente isso que torna
um número fácil de usar mal.

O CUSTAVA QUANTO? tenta **aproximar essas coisas**. A cadeia editorial do projeto é:

```text
DADO
 ↓
TRATAMENTO        (unidade, inflação, frequência, lacunas declaradas)
 ↓
COMPARAÇÃO        (mesma régua, períodos definidos antes do cálculo)
 ↓
CONTEXTO          (o que estava acontecendo, sem afirmar causa)
 ↓
FONTE             (cada número e cada notícia com origem verificável)
 ↓
INTERPRETAÇÃO DO LEITOR
```

---

## O leitor tira a própria conclusão

O projeto **não pretende**:

- fazer campanha;
- dar nota a governo;
- criar ranking político;
- prever eleições;
- dizer ao leitor o que pensar.

A proposta é apresentar **dados + contexto + metodologia + fontes**, para que cada pessoa
possa formar a sua própria interpretação.

> **O objetivo não é dizer ao leitor o que pensar sobre os números. É tornar os números, o
> contexto e o caminho até eles transparentes o suficiente para que ele possa formar a própria
> conclusão.**

Na prática, isso vira regras que o código faz cumprir:

- **Sem nota e sem vencedor.** Os textos gerados não podem conter "venceu", "melhor governo",
  "pior governo", "campeão" ou "perdeu" (o teste `scripts/test_analise.py` falha se aparecerem).
- **"Subiu" não é "melhorou".** Preço real em queda significa menos pressão sobre o
  consumidor; PIB em alta, mais atividade. Dólar, Selic e Ibovespa não têm direção única de
  bem-estar e só são **descritos**.
- **Proximidade no tempo não é evidência de causalidade.** Notícias e marcos históricos são
  contexto; o script que os publica recusa resumos com "causou", "provocou" ou "foi
  responsável por".
- **Critério antes do resultado.** A pergunta, a régua e o critério de cada dimensão estão
  escritos em um arquivo de metodologia com **hash SHA-256**, que o teste confere: não dá para
  mudar o critério depois de olhar o resultado sem subir a versão.
- **Nada inventado.** Dado, fonte, notícia ou imagem que não possa ser verificado não entra.

---

## O site em dez capítulos

O site é uma publicação em capítulos (`dashboard/index.html`). O endereço **não muda** ao navegar:
escolher uma série ou clicar em um capítulo só rola a página até o lugar certo, e a barra
continua em `https://custavaquanto.me/`. (Links antigos com `?historia=gasolina` ainda abrem a
série pedida.)

| Capítulo | A pergunta que ele responde | O que tem |
|---|---|---|
| **01 Índice** | Qual história quero ler? | 16 séries em 3 famílias, com a variação da troca de governo (dez/2022) até o último dado |
| **02 Preço** | Como mudou, mês a mês? | Gráfico da série (na época, corrigido pela inflação ou em % do salário mínimo), com as notícias da época numeradas |
| **03 Bolso** | Quanto isso pesa no salário? | Quantos litros ou quanto de um item um salário mínimo comprava |
| **04 Contexto** | O que mais estava acontecendo? | Outras séries na mesma escala e uma linha do tempo editorial de marcos históricos |
| **05 Máquina do tempo** | Como estava o Brasil num mês qualquer? | Fotografia do mês escolhido: preços, câmbio, juros, bolsa, notícias |
| **06 Períodos** | Como os dois períodos se comparam? | A série escolhida nos dois períodos, com a mesma régua |
| **07 Análise** | O que os números permitem afirmar? | Seis dimensões, critérios definidos antes do cálculo, gráficos, acontecimentos e a ferramenta "E se?" |
| **08 Arquivo** | De onde vêm as informações? | Biblioteca de fontes pesquisável (busca e filtros), com link para cada matéria original |
| **09 Método** | Como tudo foi calculado? | Fórmulas, fontes, limitações e **"Audite a análise"** |
| **10 Apoie** | Como ajudar a manter o projeto? | Contribuição por Pix, sem confirmar pagamento: a transferência acontece no app do banco |

A numeração se ajusta sozinha: nas séries sem preço ou índice (Selic, IPCA, Ibovespa, PIB), o
capítulo **Bolso** some e os seguintes sobem um número.

**Contexto e Arquivo têm papéis diferentes.** O Contexto conta a história (o que estava
acontecendo em torno do momento em que os dados mudaram). O Arquivo guarda a evidência (todas as
matérias e registros, pesquisáveis). Eles se ligam por "Ver no Contexto" e "Ver no Arquivo".

### Como a Análise se lê

A Análise segue um caminho de leitura progressiva, do geral para o detalhe:

1. **Régua do tempo (Parte 1):** os dois períodos lado a lado, com o número de meses de cada um
   e duas formas de olhar: *período completo* (comparação principal) e *mesmo número de meses*
   (controle secundário). São duas réguas possíveis, e elas podem dar leituras diferentes.
2. **Em 1 minuto:** um cartão por dimensão com o valor de cada período, a **diferença** entre
   eles, a regra de leitura e uma classificação neutra ("Diferença relevante", "Praticamente
   iguais", "Sem direção definida"). Nenhum cartão aponta vencedor.
3. **Uma parte por dimensão:** a pergunta, o que mede e o que **não** mede, os números, o
   gráfico (com abas por série e acontecimentos recolhidos, que se abrem sob demanda) e a
   leitura dos dados.
4. **Detalhe sob demanda:** robustez (a leitura muda se uma série sair?), maiores movimentos e a
   tabela por série ficam atrás de um botão.

---

## E se eu mudar a minha prioridade?

Uma das ideias mais importantes do projeto está na **Parte 10 da Análise**: *Como diferentes
prioridades mudam a leitura?*

A análise tem cinco dimensões com direção definida:

- Custo de vida
- Inflação
- Renda e poder de compra
- Mercado de trabalho
- Atividade econômica

Cada uma resulta em uma leitura (aponta para um período, ou os dois ficam praticamente iguais).
A **síntese** soma essas leituras, ponderadas pelo peso que o leitor atribui a cada dimensão.
Por padrão os pesos são iguais (20% cada), mas o leitor pode movê-los.

> **Os dados não mudam. O que muda é a importância que o leitor atribui a cada dimensão.**

Uma pessoa pode ter o **custo de vida** como a maior preocupação. Outra pode achar o **mercado
de trabalho** mais importante. Outra pode distribuir tudo igualmente. A ferramenta permite
testar esses cenários e ver como a leitura agregada responde.

**Isso não significa que exista um peso correto.** É uma **análise de sensibilidade**: ela
mostra o quanto a conclusão depende das prioridades de quem lê, e não prova qual governo foi
melhor. A ideia central é:

```text
mesmos dados + prioridades diferentes = leituras agregadas potencialmente diferentes
```

### Exemplo ilustrativo

Os pesos abaixo são **um exemplo** (não são um cenário oficial do projeto). As barras de baixo
mostram quanto do peso total está em dimensões que apontam para cada lado, como no site:

```text
E SE VOCÊ PRIORIZAR CUSTO DE VIDA?

Custo de vida            50%  ████████████████████
Inflação                 20%  ████████
Renda e poder de compra  15%  ██████
Mercado de trabalho       5%  ██
Atividade econômica      10%  ████

Para onde o peso aponta, com os dados de hoje:
  Período Bolsonaro        0%
  Praticamente iguais     15%  ██████         (Renda e poder de compra)
  Período Lula            85%  ██████████████████████████████████
```

```text
E SE VOCÊ PRIORIZAR RENDA E PODER DE COMPRA?     (cenário oficial "Ênfase em renda")

Custo de vida            15%  ██████
Inflação                 15%  ██████
Renda e poder de compra  40%  ████████████████
Mercado de trabalho      15%  ██████
Atividade econômica      15%  ██████

  Período Bolsonaro        0%
  Praticamente iguais     40%  ████████████████
  Período Lula            60%  ████████████████████████
```

Repare no que o exemplo mostra: com a **mesma** análise, quando a prioridade vai para uma
dimensão em que os períodos ficam praticamente iguais (Renda e poder de compra), o peso
"praticamente igual" sobe de 15% para 40%. A leitura agregada responde à prioridade.

**Uma observação honesta sobre os dados de hoje:** nos números atuais, nenhuma das **10.626
combinações** de pesos (de 5 em 5 pontos, somando 100) leva a síntese ao período Bolsonaro: 10.625
apontam para o período Lula e 1 empata. O projeto mostra isso na Análise justamente para que a
ferramenta não pareça mais conclusiva, nem menos, do que é. Seis cenários nomeados (pesos
iguais e ênfase em cada dimensão) estão na metodologia; o leitor pode mover os pesos livremente.

---

## Os dados

| Grupo | Séries | Unidade |
|---|---|---|
| Combustíveis | Gasolina, Etanol, Diesel, Diesel S10, GLP | R$/litro (GLP: R$/botijão de 13 kg) |
| Alimentos | Arroz, Feijão carioca, Carne (patinho), Leite longa vida, Óleo de soja, Café moído | **índice** (base 100 = jan/2019), **não é R$** |
| Mercados | Dólar (PTAX), Selic (meta), IPCA (12 meses), Ibovespa | R$/US$, % ao ano, % em 12 meses, pontos |
| Atividade | PIB | % de crescimento real (anual; trimestral à parte) |
| Mercado de trabalho | Taxa de desocupação, taxa composta de subutilização, rendimento médio real habitual | %, %, R$ mensais (valores reais do IBGE) |

As séries de mercado de trabalho entram na **Análise** (não são "histórias" do Índice).

**Frequências diferentes, atualizações diferentes.** O site não trata tudo como se tivesse a
mesma data: os combustíveis e os alimentos são mensais; Dólar, Selic e Ibovespa são diários (o
site mostra a data do último pregão e diz que não é tempo real); o mercado de trabalho vem em
trimestres móveis (cada ponto leva o mês em que o trimestre termina); o PIB é anual e
trimestral. **O PIB de 2026 não aparece como resultado anual**, porque o ano ainda não fechou:
os trimestres de 2026 ficam separados e nunca entram nas barras anuais nem na média.

### Fontes

| Fonte | O que | Status |
|---|---|---|
| ANP | Preços de combustíveis (média simples mensal nacional) | Produção |
| IBGE / SIDRA | IPCA, variação mensal por item de alimento, PIB e componentes, PNAD Contínua (tabelas 6381, 6441 e 6390) | Produção |
| Banco Central (SGS) | Dólar PTAX (série 1), meta Selic (432), salário mínimo (1619) | Produção |
| B3 | Ibovespa (fechamento diário, site público do índice) | Produção |
| FRED | Brent (contexto dos combustíveis) | Produção (contexto) |
| CONAB | Preço de varejo de arroz e feijão (R$/kg) | **Planejada, não integrada**: o download falha, e nenhum dado da CONAB está nos resultados |
| DIEESE, CEPEA/ESALQ, Procon, IBGE/POF | Avaliadas para preço absoluto de alimentos | Não usadas ([auditoria](docs/AUDITORIA_PRECOS_ALIMENTOS.md)) |

Tabela completa por indicador (frequência, campo, processamento, limitações):
[docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

---

## Metodologia em resumo

A metodologia completa está em [docs/METHODOLOGY.md](docs/METHODOLOGY.md); a da Análise (versão
**1.2.1**) é congelada em `data/processed/analysis_methodology.json`.

- **Variação** = `(fim ÷ início − 1) × 100`. Para taxas (Selic, IPCA, PIB), a diferença é em
  **pontos percentuais**.
- **Real** = nominal × IPCA do último mês ÷ IPCA do mês do preço ("a preços de hoje"). O
  IPCA é o geral, não específico do item.
- **Alimentos** são índices encadeados a partir da variação oficial do IPCA por item: **não**
  são preço em reais.
- **PIB anual** é a taxa acumulada no ano lida no 4º trimestre; o resultado trimestral tem
  quatro leituras que nunca se misturam.
- **Mercado de trabalho:** cada ponto é um trimestre móvel, e só entram os trimestres inteiros
  dentro de cada período. O rendimento real já vem deflacionado pelo IBGE; o projeto não aplica
  um segundo deflator.

### Os dois períodos

| Janela | Período Bolsonaro | Período Lula |
|---|---|---|
| **Período completo disponível** (comparação principal) | jan/2019–dez/2022 (48 meses) | jan/2023–último dado (44 meses em ago/2026; **em curso**) |
| **Mesmo número de meses** (controle secundário) | meses 1 a *N* do mandato | meses 1 a *N* do mandato (*N* = duração comum, hoje 44) |

O período Lula **não está completo**: toda leitura sobre ele é parcial. As duas janelas existem
porque comparar 48 com 44 meses distorce acumulados.

### A Análise

- **Seis dimensões:** Custo de vida, Inflação, Renda e poder de compra, Mercado de trabalho,
  Atividade econômica e Mercados.
- **Tipos de indicador:** *Tipo A* tem direção definida antes do cálculo (preço real e inflação
  menores; poder de compra e crescimento maiores); *Tipo B* (Dólar, Selic, Ibovespa) só é
  descrito; *Tipo C* (salário nominal) é informativo.
- **Leitura de cada dimensão:** pela mediana das séries (no Mercado de trabalho, cujas séries têm
  unidades diferentes, cada série vota uma vez), com uma **tolerância** abaixo da qual os dois
  períodos ficam "praticamente iguais" (1,0 ponto em variações; 0,1 ponto em médias).
- **Nível de evidência** por dimensão: ALTA, MÉDIA ou INFORMATIVA, calculado por regra.
- **Síntese:** soma dos sentidos ponderados, testada em seis cenários e em todas as 10.626
  combinações de pesos. **Sem nota e sem vencedor.**
- **Mercados** nunca entram na síntese.

---

## Contexto e notícias

As matérias em Contexto, Arquivo e Análise vêm de **curadoria manual** (`data/news/raw_*.json`).
O script `scripts/build_news.py` abre cada URL e só publica se a página responde e o título
confere (similaridade ≥ 0,80); o resumo é a descrição da própria matéria. Hoje são **142 itens**
(quase todos de 2019 em diante), 63 deles **marcos históricos** (`data/news/marcos.json`: dimensão,
indicadores, tipo, relevância e um resumo curto do projeto), de 2019 a 2026.

Fotos: as da Agência Brasil seguem a licença CC BY 4.0 informada pela EBC; as dos demais
veículos são a imagem de capa da matéria, com crédito e **sem licença de reprodução** (decisão
editorial, desligável em `build_news.py`). Sem foto, só texto.

> **Proximidade no tempo não é evidência de causalidade.** Os acontecimentos aparecem pela data
> em que ocorreram, não por terem causado a mudança.

---

## Como auditar

O projeto foi feito para ser conferido, por qualquer pessoa, em quatro níveis:

1. **No site, sem instalar nada.** O capítulo **09 Método** tem a seção **"Audite a análise"**:
   versão da metodologia, hash SHA-256, janelas, tolerâncias, tipo e fonte de cada indicador,
   fórmulas e links para os arquivos.
2. **Nos arquivos.** Baixe `analysis_methodology.json` (critérios) e `analysis_results.json`
   (resultados) em [`data/processed/`](data/processed/), e `dashboard_data.json` (séries de
   origem). Todos são JSON legível.
3. **Refazendo o cálculo.** Com o ambiente instalado (ver abaixo):

   ```bash
   .venv/Scripts/python scripts/build_analise.py
   .venv/Scripts/python scripts/test_analise.py
   ```

   `build_analise.py` grava primeiro a metodologia e seu hash e só depois os resultados.
   `test_analise.py` (sem dependências além da biblioteca padrão) recalcula de forma independente
   a síntese de cada cenário, a grade de combinações, as variações e as janelas, e falha se o
   hash, a direção de um indicador, uma data no futuro ou uma palavra proibida ("vencedor",
   "melhor governo"...) aparecerem.
4. **Nas fontes.** Cada notícia tem link para a página original; cada indicador, a tabela de
   origem (por exemplo, as tabelas 6381, 6441 e 6390 do SIDRA para a PNAD Contínua).

Auditorias e decisões registradas: [docs/AUDITORIA_ANALISE_GOVERNOS.md](docs/AUDITORIA_ANALISE_GOVERNOS.md) e
[docs/AUDITORIA_PRECOS_ALIMENTOS.md](docs/AUDITORIA_PRECOS_ALIMENTOS.md).

---

## Limitações, ditas em voz alta

1. **ANP:** amostra de postos e média simples; **setembro/2020 sem pesquisa** (as linhas ficam
   interrompidas, e a Máquina do tempo mostra uma estimativa marcada com "≈").
2. **Alimentos:** índice, não R$; "carne" é só o corte patinho; o feijão é o carioca.
3. **Preço absoluto de alimentos:** nenhum dado da CONAB está nos resultados.
4. **PIB:** o IBGE revisa a série; 2026 só tem trimestres.
5. **Ibovespa:** vem de um endpoint público da B3, sem garantia contratual; é "último dado
   disponível", não tempo real. A Selic é a **meta**, não a efetiva.
6. **Salário mínimo:** piso nacional.
7. **Período Lula em curso:** toda leitura é parcial.
8. **Nenhuma dimensão diz tudo.** Contas públicas, dívida, desigualdade de renda,
   informalidade e qualidade do emprego ficam fora por falta de série no projeto.
9. **A Análise descreve; não explica.** Ela não mede causa e muda com os pesos.

Problemas verificados e lacunas: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).

---

## Arquitetura

```text
scripts/         download_*.py, build_dataset.py, build_dashboard_data.py, build_news.py,
                 build_analise.py, update_data.py, test_analise.py
data/raw/        cache dos downloads (não versionado)
data/processed/  dados versionados; dashboard_data.json e analysis_*.json alimentam o site
data/news/       curadoria manual de notícias e marcos
dashboard/       site estático (index.html, styles.css, js/), lê os JSON; nenhum cálculo
                 econômico acontece no navegador
docs/            documentação (índice em docs/README.md)
.github/         workflow que publica o site no GitHub Pages
analysis/, output/   gráficos estáticos da primeira fase (histórico)
```

- **Front-end:** HTML, CSS e módulos JavaScript puros, sem framework e sem biblioteca de
  gráficos (os gráficos são SVG próprio). Não há etapa de build.
- **Pipeline:** Python (pandas, requests), gerando CSV e JSON versionados em `data/processed/`.
- **Nada econômico é calculado no navegador.** As únicas contas feitas lá são a soma ponderada
  dos sentidos já calculados, quando o leitor mexe nos pesos (a mesma fórmula da metodologia), e a
  distância entre dois valores já calculados em Python nos cartões "Em 1 minuto".
- **Dependências em tempo de leitura:** Google Fonts e as imagens das matérias, servidas pelos
  próprios veículos. O gerador de QR Code (`qrcode-generator`, MIT) está copiado em
  `dashboard/vendor/`.
- **Sem backend, sem cookies, sem rastreamento.** O Apoie por Pix só monta o código no
  navegador; o site não processa nem confirma pagamentos.

### Pipeline de dados

```text
fonte → download_*.py → data/processed/*.csv → build_dataset.py → build_dashboard_data.py
      → dashboard_data.json → build_analise.py → analysis_*.json → site
```

Detalhes, e quais scripts o `update_data.py` roda (e quais não): [docs/DATA_PIPELINE.md](docs/DATA_PIPELINE.md).

---

## Rodando localmente

Requer Python 3.11. Nos exemplos, caminhos do Windows (Git Bash/PowerShell); em outros sistemas,
troque `.venv/Scripts/` por `.venv/bin/`.

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

`process_portraits.py` também precisa de Pillow (`.venv/Scripts/pip install pillow`), que ainda
não está no `requirements.txt`.

Servir o site (precisa de HTTP; `file://` não funciona):

```bash
.venv/Scripts/python -m http.server 8420
```

e abrir `http://localhost:8420/dashboard/index.html`.

### Atualizando os dados

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

Depois de baixar o PIB, reconstrua com `scripts/build_dashboard_data.py`,
`scripts/build_analise.py` e `scripts/test_analise.py`. Não rode `download_bcb.py` nem
`download_ibovespa.py` (legados; sobrescrevem a fonte de produção). Para o Apoie, `PIX_KEY`,
`MERCHANT_NAME` e `MERCHANT_CITY` ficam em `dashboard/js/apoie.config.js`.

### Testes

```bash
.venv/Scripts/python scripts/test_analise.py                 # validações da Análise (automático)
.venv/Scripts/python scripts/download_conab.py --autoteste   # lógica do CONAB, com dados sintéticos
```

Não há testes automáticos do front-end nem de acessibilidade: essas checagens (console, layout,
teclado, axe-core) foram feitas à mão e estão registradas em
[docs/TESTING_AND_QA.md](docs/TESTING_AND_QA.md).

---

## Publicação

O site é publicado no **GitHub Pages**, com domínio próprio (`CNAME`) e HTTPS. O workflow
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) monta o site (o conteúdo de
`dashboard/` na raiz e os JSON de `data/processed/`) e publica a cada push na `master` que mude o
site ou os dados. Domínio, DNS e como voltar atrás: [docs/DEPLOY.md](docs/DEPLOY.md).

---

## Contribuindo

O repositório é público: <https://github.com/leonardotteixeira/custava-quanto>.

- **Fonte incorreta, cálculo inconsistente ou escolha metodológica questionável?** Abra uma
  *issue*, dizendo qual número, qual fonte e o que não bate.
- **Mudança na metodologia da Análise?** Ela exige subir `METODOLOGIA_VERSAO` em
  `scripts/build_analise.py`, registrar a decisão em
  [docs/AUDITORIA_ANALISE_GOVERNOS.md](docs/AUDITORIA_ANALISE_GOVERNOS.md) e rodar
  `scripts/test_analise.py`.
- **Nova notícia ou marco?** Entra em `data/news/` com URL real; o `build_news.py` confere a
  página antes de publicar.
- **Regra do projeto:** nada de dado, fonte, notícia ou imagem inventados, e nenhuma linguagem
  de causa, nota ou vencedor.

---

## Licença e créditos

O repositório **não tem arquivo de licença** hoje; sem uma, valem os direitos reservados por
padrão. Os dados vêm de fontes públicas, citadas acima. Retratos dos presidentes: CC BY 2.0
(Wikimedia Commons, crédito no site). Fotos da Agência Brasil: CC BY 4.0. Fotos de outros
veículos: sem licença de reprodução (ver "Contexto e notícias").

---

## Documentação

Índice: [docs/README.md](docs/README.md). Principais:
[CURRENT_STATE](docs/CURRENT_STATE.md) · [METHODOLOGY](docs/METHODOLOGY.md) ·
[DATA_PIPELINE](docs/DATA_PIPELINE.md) · [KNOWN_ISSUES](docs/KNOWN_ISSUES.md) ·
[ROADMAP](docs/ROADMAP.md) · [TESTING_AND_QA](docs/TESTING_AND_QA.md) · [DEPLOY](docs/DEPLOY.md) ·
[DESIGN.md](DESIGN.md) · [PRODUCT.md](PRODUCT.md).
