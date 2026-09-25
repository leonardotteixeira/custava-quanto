# Auditoria de fontes: preço absoluto (R$) para os itens da cesta básica

Pergunta que motivou esta auditoria: os seis itens de alimento do projeto
(arroz, feijão carioca, carne bovina/patinho, leite longa vida, óleo de
soja, café moído) hoje aparecem só como **índice de preço** (base 100 =
jan/2019), porque o IBGE/SIDRA — a única fonte já usada no pipeline —
não publica preço médio absoluto por item. Existe alguma fonte confiável
que permita mostrar também o **preço observado em R$**, mês a mês, com a
mesma régua nos dois governos (jan/2019–dez/2022 e jan/2023–hoje)?

**Resultado resumido: por enquanto, não para nenhum dos seis itens**, com
uma exceção promissora (arroz e feijão via CONAB) que fica documentada
como próximo passo, não implementada agora — ver "Por que não implementar
ainda" no fim de cada seção. Nenhum preço foi inventado, estimado ou
interpolado para preencher a lacuna; o índice continua sendo a única
representação de preço mostrada para os seis itens.

## Como esta auditoria foi feita

Pesquisa feita via busca na web (o ambiente desta sessão bloqueia acesso
direto a ibge.gov.br, sidra.ibge.gov.br, dieese.org.br e conab.gov.br —
só buscas passam, não o download direto das páginas/arquivos). Isso
significa que os pontos abaixo marcados **[verificado por busca]** vêm de
resultados de busca (incluindo o texto oficial de metodologia quando
apareceu nos resultados), e os marcados **[não verificado — requer
acesso direto]** são inferências razoáveis a partir da estrutura conhecida
da fonte, mas que precisam ser confirmadas baixando o arquivo real antes
de qualquer linha de código assumir um nome de coluna, unidade ou
cobertura temporal específica.

## Fontes avaliadas

### 1. IBGE/SIDRA (fonte já usada no pipeline)

- **Cobertura geográfica:** Brasil + regiões metropolitanas pesquisadas.
- **Frequência:** mensal, jan/2019–hoje sem interrupção.
- **O que é publicado:** só a **variação percentual mensal** de cada
  subitem (tabelas 1419 até dez/2019, 7060 de jan/2020 em diante) e o
  peso no índice — nunca o preço médio em R$. **[verificado por busca]**:
  a nota metodológica do SNIPC descreve o cálculo como "média aritmética
  simples de preços... que, comparadas em dois meses consecutivos,
  resultam no relativo das médias" — ou seja, o preço médio em si é um
  passo intermediário do cálculo, não um dado publicado. Não há tabela
  SIDRA ativa de "preços médios" para itens de alimento no período
  2019–hoje (a única tabela com esse nome, 655, cobre ago/1999–jun/2006
  e também é variação, não preço absoluto).
- **Conclusão:** confirma a premissa que o projeto já usava. Segue como
  fonte do índice, não do preço absoluto.

### 2. DIEESE — Pesquisa Nacional da Cesta Básica de Alimentos (PNCBA)

- **Cobertura geográfica:** 17 capitais historicamente (ampliado para 27
  em 2024/2025, ver item 2b) — nunca uma média nacional ponderada por
  população/consumo, e sim uma lista por capital.
- **Frequência:** mensal, com boletim em PDF por capital desde antes de
  2019.
- **Acesso:** **[verificado por busca]** desde abril/2018, os preços por
  produto e cidade não são de consulta pública gratuita — é preciso
  assinatura paga do DIEESE para o banco de dados consultável. Os
  boletins mensais em PDF (ex.: `202509cestabasica.pdf`) continuam
  públicos, mas são relatórios narrativos por capital, não uma série
  temporal para baixar em lote — extrair 90 meses × 17 capitais × 13
  itens exigiria abrir e interpretar ~90 PDFs manualmente ou via OCR, com
  risco real de erro de leitura em cada célula.
- **Consistência metodológica:** a composição da cesta varia por região
  (Decreto-Lei 399/1938 define cestas regionais, não uma única cesta
  nacional) — outro obstáculo para comparar "a mesma definição de
  produto" em todo o Brasil.
- **Conclusão:** mesma restrição que o README do projeto já documentava.
  Não entra no pipeline automatizado — nem os dados pagos (paywall), nem
  os PDFs públicos (não são dado estruturado, risco de erro de extração,
  e o próprio DIEESE monetiza esse dado especificamente).

### 2b. Parceria CONAB + DIEESE (desde 2024) — achado novo desta pesquisa

- **[verificado por busca]**: em 2024, CONAB e DIEESE formaram uma
  parceria para acompanhar a cesta básica, ampliando a coleta de 17 para
  27 capitais, com divulgação em `gov.br/conab` (não no domínio pago do
  DIEESE). Notícias de mai/2026 já citam essa parceria informando queda
  de preço do café e do óleo de soja "em 23 capitais".
- **Por que isso não resolve o problema ainda:**
  1. **Quebra de metodologia em 2024/2025** (17 → 27 capitais) — juntar
     a série antiga com a nova sem marcar essa mudança violaria a regra
     de "mesma metodologia nos dois períodos".
  2. Continua sendo uma lista por capital, não uma média nacional oficial
     — qualquer "Brasil" aqui seria uma média que o projeto teria que
     calcular sozinho, e isso precisa ficar declarado como tal.
  3. **[não verificado]** se a divulgação da parceria sai em formato
     estruturado (CSV/planilha) ou só em boletins/notícias — os
     resultados de busca mostram linguagem de press release ("registram
     queda"), o que sugere boletim narrativo, o mesmo problema do DIEESE.
- **Conclusão:** vale revisitar esta fonte especificamente (é a mais
  aberta das opções ligadas ao DIEESE), mas só depois de alguém confirmar,
  com acesso direto a `gov.br/conab`, se existe um arquivo baixável com
  série mensal por item — não presumido aqui.

### 3. CONAB — Sistema de Informações de Mercado (SIM), preços agropecuários

- **Cobertura geográfica:** por UF (estado), com mais de 30 anos de
  histórico — **[verificado por busca]** mais de 112 produtos, "mais de
  20 mil registros de séries" cobrindo todas as unidades da federação.
- **Frequência e nível:** mensal e semanal, com preço ao **produtor**,
  **atacado** e **varejo** — varejo é o nível que interessa aqui (preço
  pago pelo consumidor final).
- **Acesso:** **[verificado por busca]** arquivos baixáveis diretamente
  do portal (`Preços agropecuários Mensal UF`, entre outros), com reuso
  autorizado mediante citação da fonte — mecanismo de download em lote
  parecido com o que o projeto já usa para ANP/BCB/IBGE, ao contrário do
  DIEESE.
- **Por que não implementar ainda:** o acesso a `conab.gov.br` está
  bloqueado nesta sessão, então não foi possível abrir o arquivo real e
  confirmar (a) se arroz e feijão aparecem em toda a janela 2019–2026 sem
  buracos, (b) a unidade exata (R$/kg presumido, não confirmado), (c) se
  o corte de feijão é "carioca" especificamente (o mesmo já usado no
  índice IBGE) ou uma média de tipos, e (d) se existe uma linha "Brasil"
  agregada no próprio arquivo ou se a agregação nacional teria que ser
  calculada pelo projeto (nesse caso, precisaria ficar declarada como uma
  média própria, não um dado oficial "Brasil").
- **Conclusão:** **candidato mais forte para arroz e feijão** — mas seguir
  a regra "nunca inventar" significa não escrever um script que assume
  nomes de coluna e cobertura sem antes ter aberto o arquivo real. Fica
  como próximo passo (ver final do documento), não implementado nesta
  rodada.
- **Carne bovina, leite, óleo de soja, café:** o SIM da CONAB é
  historicamente focado em grãos e commodities agrícolas para política de
  preços mínimos (arroz, feijão, milho, soja-grão, café-grão etc.), não
  em carne por corte, leite industrializado embalado ou óleo de soja
  engarrafado — produtos processados, um ou mais elos à frente da
  commodity agrícola. Não há indício, nos resultados de busca, de que o
  SIM tenha esses quatro itens no nível de varejo do jeito que o
  consumidor compra. Fica descartado para estes quatro, sem mais
  verificação necessária.

### 4. CEPEA/ESALQ — indicadores de boi gordo, leite, soja, café

- **[verificado por busca]**: os indicadores CEPEA/ESALQ (boi gordo,
  leite, soja, café) medem o preço **pago ao produtor/nas praças de
  negociação** — ex.: boi gordo é "spot... na porteira do frigorífico",
  soja e café são cotados por saca na negociação entre produtor e
  comprador, leite é o preço de captação pago ao produtor. Nenhum desses
  é o preço que o consumidor paga na gôndola.
- **Conclusão: descartado para os quatro itens**, não por falta de dado
  mensal confiável (o CEPEA é rigoroso e teria série completa 2019–hoje),
  mas porque **misturaria dois elos diferentes da cadeia** no mesmo
  gráfico que hoje mostra preço ao consumidor — violaria a própria regra
  do projeto de comparar a mesma definição de produto o tempo todo. Um
  quilo de carne no açougue não varia ponto a ponto com a arroba do boi
  vivo (frete, abate, margem do frigorífico e do varejo entram no meio).

### 5. Procon (estadual/municipal)

- Pesquisas de preço feitas por Procons estaduais (ex.: Procon-SP) não
  têm cobertura nacional, metodologia própria de cada órgão, frequência
  irregular e nenhum repositório único automatizável. Descartado sem
  necessidade de mais verificação — não atende aos critérios de
  cobertura nacional nem de metodologia consistente entre os dois
  períodos.

### 6. IBGE — Pesquisa de Orçamentos Familiares (POF)

- Não é uma série mensal: é feita a cada 5–6 anos (a mais recente antes
  da atual é 2017–2018). Dá um retrato pontual de gasto médio por item em
  alguns anos, útil só como conferência cruzada eventual, nunca como
  série temporal comparável mês a mês. Descartado para este uso.

## Tabela-resumo

| Item | Fonte de índice (mantida) | Preço absoluto (R$) hoje? | Melhor candidato | Situação |
|---|---|---|---|---|
| Arroz | IBGE/SIDRA (variação) | Não | CONAB SIM, varejo/UF | Promissor, não verificado — próximo passo |
| Feijão carioca | IBGE/SIDRA (variação) | Não | CONAB SIM, varejo/UF | Promissor, não verificado — próximo passo |
| Carne bovina (patinho) | IBGE/SIDRA (variação) | Não | Nenhum identificado | Fica só índice |
| Leite longa vida | IBGE/SIDRA (variação) | Não | Nenhum identificado (CEPEA é preço ao produtor) | Fica só índice |
| Óleo de soja | IBGE/SIDRA (variação) | Não | Nenhum identificado (CEPEA é a soja-grão) | Fica só índice |
| Café moído | IBGE/SIDRA (variação) | Não | Nenhum identificado (CEPEA é o café-grão verde) | Fica só índice |

## Próximo passo, se alguém quiser continuar esta linha

Só a partir de um ambiente com acesso direto a `conab.gov.br`:

1. Baixar o arquivo `Preços agropecuários Mensal UF` (ou equivalente) do
   Portal de Informações Agropecuárias.
2. Confirmar, olhando o arquivo real: cobertura 2019–2026 sem buracos
   para arroz e feijão em nível de varejo; unidade; se o feijão é
   especificamente "carioca"; se existe uma linha "Brasil" agregada.
3. Só então decidir a fórmula de agregação nacional (se precisar somar
   estados) e documentá-la como tal — nunca apresentar uma média própria
   como se fosse um "preço nacional oficial".
4. Revisitar a parceria CONAB+DIEESE (item 2b) para os quatro itens
   restantes, verificando se ela sai em formato estruturado — e, se sim,
   tratar a mudança de 17→27 capitais como quebra de série, não como
   continuidade.

Nenhum destes quatro passos foi executado aqui — ficam descritos, não
implementados, porque exigem um dado que esta sessão não conseguiu abrir.
