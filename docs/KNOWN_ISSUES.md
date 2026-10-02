# Problemas conhecidos e lacunas

Última atualização: 30/09/2026
Status: **CURRENT**. Todo item abaixo foi verificado no repositório nesta data.
Nada aqui foi corrigido na sincronização de documentação: esta tarefa só registra.

Legenda: **CRITICAL** = dado ou conclusão errada publicada · **HIGH** = texto ou
dado do site contradiz a realidade, ou risco de dado velho · **MEDIUM** = risco
operacional ou inconsistência sem efeito visível imediato · **LOW** = detalhe ·
**IDEA** = melhoria, não defeito.

## CRITICAL

Nenhum verificado.

## HIGH

### H1. O site descreve preço de arroz e feijão da CONAB que não existe nos dados

- **Fato:** `data/processed/conab_precos_varejo.csv` não existe;
  `data/processed/conab_status.json` registra `ok: false` (tentativa de
  25/09/2026: o script não achou o link de download na página da CONAB) e
  `download_conab.py` não está em `update_data.py`. Nenhum produto tem
  `preco_absoluto` em `dashboard_data.json`.
- **Contradição:** `dashboard/index.html` afirma, sem condição, que existe esse
  preço: linha 395 (Método › Fontes: "Preço observado de arroz e feijão — CONAB"),
  414 (Como calculamos), 474–475 (Limitações: "Arroz e feijão também têm um preço
  observado em R$/kg"), 498–499 (Definições). O código do front
  (`app.js`, ~linhas 323–345) trata o caso com condição e cai no índice IBGE.
- **Efeito:** o leitor lê que arroz e feijão têm preço em R$/kg e não vê nenhum.
- **Como ficou documentado:** README, METHODOLOGY e DATA_PIPELINE dizem que a CONAB
  é **planejada, não integrada**.

### H2. Método diz que o projeto não pontua o PIB entre os períodos; a Análise pontua

- `dashboard/index.html:481` (Método › Limitações): "Este projeto não classifica,
  pontua ou elege um 'melhor' ou 'pior' resultado de PIB entre os dois períodos."
- Em Análise (`analysis_methodology.json`, indicador `PIB`, tipo A, direção
  "maior"), o PIB entra na leitura de "Atividade econômica" com a frase "mais
  favorável no período …".
- **É uma decisão editorial pendente**, não um erro de cálculo: ou o texto do
  Método passa a descrever a Análise, ou o PIB deixa de ter direção definida.

### H3. PIB, insumos da estimativa da ANP e CONAB dependem de execução manual

- `update_data.py` não roda `download_pib.py`, `download_pib_componentes.py`,
  `download_ibge_combustiveis.py` nem `download_conab.py` (ver
  [DATA_PIPELINE.md](DATA_PIPELINE.md)).
- Quem roda só `update_data.py` mantém o PIB na última data baixada (hoje 2º
  trimestre de 2026, baixado em 25/09/2026). `build_dashboard_data.py` calcula
  `PIB.frescor` e emite um aviso, mas **não interrompe** a publicação e o front não
  mostra o aviso além de "atenção: dado possivelmente desatualizado" no painel de
  fonte do PIB.

## MEDIUM

### M1. Scripts legados sobrescrevem a fonte de produção

`download_bcb.py` e `download_ibovespa.py` escrevem os mesmos arquivos que
`download_mercados.py` (`bcb_contexto_mensal.csv`, `bcb_hoje.json`,
`ibovespa_mensal.csv`, `ibovespa_hoje.json`). O de Ibovespa usa o Yahoo Finance, cuja
série diária diverge da B3 (o próprio `download_mercados.py` cita 29/12/2022: B3
109.734,60 × Yahoo 110.031). Nenhum outro script os chama; rodá-los à mão troca a
fonte sem aviso.

### M2. `output/` e `analysis/analysis.py` estão congelados em 22/09/2026

Os gráficos estáticos e `output/RESUMO.md` são da primeira fase do projeto, geram
números de uma execução antiga (ex.: variação do câmbio no período Bolsonaro
calculada por médias mensais) e não fazem parte de `update_data.py`. Não incluem
PIB, mercados nem a Análise. Foram marcados como **HISTÓRICO**.

### M3. `common.periodo_do_governo()` rotula qualquer data anterior a 2023 como "Bolsonaro"

Correto para as séries que começam em jan/2019. Para uma série que comece antes
(caso do PIB, desde 1996) classifica anos de outros governos como "Bolsonaro". Já
corrigido apenas dentro de `montar_pib()` (anos antes de 2019 ficam sem período,
28/09/2026). Uma nova série longa repetiria o erro.

### M4. Texto do Método cita uma opção que foi removida

`dashboard/index.html:416` ("Trocar o ponto de partida no Índice para jan/2019
mostra a série completa…"). O seletor jan/2019 foi removido em 28/09/2026; o Índice
compara sempre a partir de dez/2022. Links antigos com `?desde=2019` abrem no
padrão e o parâmetro é apagado.

### M5. Sem testes automáticos do front-end nem de acessibilidade

O único teste automatizado do repositório é `scripts/test_analise.py`. Verificações
de console, contraste, teclado e layout foram feitas à mão (axe-core no navegador,
capturas de tela) e não estão salvas como script. Ver
[TESTING_AND_QA.md](TESTING_AND_QA.md).

### M6. `download_pib.py --autoteste` está fora de sincronia com a correção dos nomes de variável

As palavras-chave de `VARS_ANUAL` foram ajustadas aos nomes reais do SIDRA ("PIB -
valores correntes"), mas as fixtures sintéticas de `scripts/fixtures/pib_anual_exemplo.json`
ainda usam nomes antigos. Rodando `--autoteste` hoje, `pib_nominal` e
`pib_per_capita` **não são encontrados** (só a população é), e o script imprime
"Autoteste concluído" mesmo assim, porque só registra um aviso. O download real
funciona (o PIB de `pib_anual.csv` foi baixado da API em 25/09/2026); o que está
quebrado é o autoteste e a confiança que ele deveria dar. (`download_conab.py
--autoteste` passa.)

## LOW

- **L1.** Textos fixos desatualizados em `dashboard/index.html`: linha 94 diz "Quinze
  séries" (são **16**: 5 combustíveis, 6 alimentos, Dólar, Selic, IPCA, Ibovespa,
  PIB); linha 80 (`aria-label` da faixa de abertura) diz "Seis indicadores" (são 8).
- **L2.** `requirements.txt` não lista Pillow, usado por `process_portraits.py` (o
  ambiente atual tem pillow 12.3.0), nem numpy (dependência indireta do pandas).
- **L3.** Cinco imagens de matérias têm 640–1024 px de largura (fonte já é a maior
  versão publicada); o campo `imagem_foco` existe mas nenhuma imagem o define.
- **L4.** Notícias de PIB dos resultados anuais de 2022, 2023 e 2024 têm só um
  release cada; as páginas do IBGE bloqueiam a verificação automática (403), então
  quatro itens entram como `verificacao: "manual"`.
- **L5.** O contexto externo da Análise (5 marcos) cita a fonte como instituição e
  data, **sem link**.
- **L6.** Apoie: `PIX_KEY` e `MERCHANT_NAME` em `dashboard/js/apoie.config.js` ainda são
  "COLOQUE_…", então a página mostra "Chave Pix ainda não configurada" e não gera QR
  Code nem Pix Copia e Cola. O fluxo está implementado e testado com uma chave falsa
  em memória (QR decodificado por leitor independente; CRC e campos do BR Code
  conferidos); falta a chave real e a confirmação de `MERCHANT_CITY`. Não foi testado
  o pagamento de verdade em um app de banco.
- **L7.** Higiene do repositório: existem dois PDFs de brand book na raiz — um
  versionado ("Custava Quanto - Brand Book.pdf") e outro **não** versionado com o
  nome grafado "Custavo" —, mais `p.html` e `.impeccable/review/` não versionados.
  Não há arquivo `LICENSE`. O site está no ar em `custavaquanto.me` (GitHub Pages por branch, raiz
  redirecionando para `/dashboard/`); falta conferir o "Enforce HTTPS" (ver [DEPLOY.md](DEPLOY.md)).
- **L9.** Docstrings antigas: `download_pib.py` diz que a API do IBGE "está
  bloqueada nesta sessão" e que nenhuma tabela foi aberta diretamente, e
  `download_conab.py` foi escrito sem o arquivo real. O primeiro já baixou dados reais;
  o segundo continua sem baixar. Os textos não foram atualizados.
- **L10.** A legenda da textura da abertura (`dashboard/index.html:72`) diz "Cada linha
  acima é uma das séries deste projeto", mas o fundo mostra só 8 séries curadas mais
  a história escolhida (`HERO_SET` em `app.js`).
- **L11.** O vídeo original `gemini_generated_video_38efadc6.mp4` (7 MB, na raiz, não
  versionado) foi gerado por IA e contém cartões com números, preços e texto sem
  sentido entre ~3,5–6,5 s e depois de ~8,1 s. O site usa só um corte limpo
  (0–2,4 s + 7,05–7,9 s, sem áudio, 432 KB). Não versionar o original, e não usar
  outros trechos sem revisar.
- **L12.** Três fotos editoriais (`dashboard/assets/imagens/`: `urna-eletronica.jpg`,
  `protesto-cartaz.jpg`, `cabine-votacao.jpg`) entraram **sem origem, autor nem licença
  confirmados** (metadados apagados; só "Software: Picasa"). A do protesto traz o nome
  "Jeferson Alves" impresso na própria imagem; as outras duas estão creditadas apenas
  como "reprodução". A legenda de cada uma no site diz "fonte e licença a confirmar".
  A do protesto mostra pessoas identificáveis e um cartaz político; foi mantida por
  decisão editorial do responsável, só como contexto e com legenda. Os arquivos
  `imagem 1.jpg`, `imagem 2.jpg` e `imagem 3.jpg` continuam na raiz, não versionados.
- **L14.** Mercado de trabalho: duas das três séries (desocupação e subutilização) medem quase
  o mesmo fenômeno e andam juntas, então a dimensão pesa mais nelas do que no rendimento; a
  leitura "sem uma série" (3 de 3) mostra que nenhuma série sozinha muda o resultado. Com a métrica
  alternativa (variação do início ao fim, em p.p., para as taxas) a dimensão ficaria "praticamente
  igual" no período completo; a regra da métrica foi fixada antes do cálculo e está na
  metodologia (ver AUDITORIA v1.2). Os pontos são trimestres móveis: o primeiro trimestre inteiro
  de cada período termina em mar/2019 e mar/2023.
- **L15.** Contexto histórico: páginas do IBGE Agência de Notícias devolvem 403 a acessos
  automáticos e a Agência Brasil desativa algumas páginas por legislação eleitoral ("EBC - Página
  temporariamente indisponível", HTTP 200). Esses itens não passam na verificação por título e
  ficaram de fora (por exemplo, a sanção da isenção do Imposto de Renda até R$ 5 mil, em 2025, e
  o resultado de desemprego de dez/2025). Resultados do IBGE entram pela cobertura da Agência
  Brasil. A curadoria pode ser refeita quando as páginas voltarem.
- **L16.** O rendimento médio real da PNAD é refeito pelo IBGE a cada divulgação (deflator do mês
  mais recente): valores em reais de uma coleta antiga não são comparáveis com os de uma nova.
  Por isso a página usa só variações dentro da mesma coleta e cita valores das matérias apenas como
  o que foi divulgado na época.
- **L8.** O ambiente local usa Python 3.11.9; o README anterior dizia "3.11+".
  Nenhuma versão máxima é imposta.

## Lacunas de dados (não são bugs)

| Lacuna | Situação |
|---|---|
| Setembro/2020 sem pesquisa da ANP | Documentado; linhas interrompidas; estimativa "≈" só na Máquina do tempo |
| IPCA em 12 meses | Desde jan/2019 (v1.3.0: o número-índice é baixado desde jan/2018 para os 12 meses anteriores; antes começava em jan/2020) |
| PIB 2026 | Só trimestres (até o 2º); resultado anual não existe |
| Preço absoluto de alimentos (R$/kg) | Nenhuma fonte integrada; CONAB planejada (ver H1) |
| Cesta básica DIEESE | Sem acesso público em lote desde abril/2018 |
| Contas públicas, investimento, desigualdade, informalidade e qualidade do emprego | Sem série no projeto; fora da Análise (emprego e desemprego entraram na v1.2) |
| Filtro regional | Os dados de combustível têm quebra por região; o dashboard só mostra "Brasil" |

## Resolvido nesta rodada (registrado para não reabrir)

- PIB comparava 1996–2022 contra 2023–2025 no recorte "governo inteiro" — corrigido
  em `montar_pib()` (commit `9844300`).
- Abril/2026 ausente da série da ANP — hoje presente (30 linhas em
  `anp_precos_mensais.csv`).
- Seletor "jan/2019" do Índice — removido (`c27dbac`).
- Fotos dos presidentes pixeladas — versões pré-reduzidas via `srcset` (`f19abcc`).
- L13, contraste do "10" do item Apoie no menu: a opacidade 0,8 virou cor própria (`--on-night-3`).
- No celular a página era montada com 624 px de largura e reduzida para caber na tela (todo texto a
  ~62% do tamanho): uma célula `nowrap` da tabela "Em resumo" da Análise vazava do cartão. Corrigido.
- Menu do celular aberto no meio da página: a gaveta ficava fora da tela e a página voltava ~3.500 px.
  A trava de rolagem no `<body>` tirava a barra do lugar; agora só o `<html>` trava e a barra fica fixa.
- Gráficos no toque: a leitura do mês sumia ao levantar o dedo; agora fica até rolar ou tocar fora.

## Celular (30/09/2026, segunda rodada)

- A página tem ~55 mil px de altura em 390 px (era ~88 mil). A Análise ainda passa de 25 mil: é
  leitura longa por escolha; o sumário "Nesta análise" no topo leva direto a cada parte.
- Sem ?historia= no endereço, nenhuma série vem marcada como escolhida: a gasolina aparece como
  ponto de partida, com aviso, até o leitor escolher. Isso vale também no desktop.
- A ordem da história no celular (valores antes da variação) é feita com `order` de flexbox: a
  ordem visual difere da ordem do HTML nesse bloco e nas camadas de detalhe da Análise.
- A tabela mensal do capítulo Preço continua com rolagem horizontal controlada (5 colunas, até
  ~560 px); as demais tabelas viram cartões empilhados.
- Abaixo de 360 px o atalho da série atual some do cabeçalho (só resta o menu).
- Não há item "mercado de trabalho" no Índice: ele só existe na Análise (não é série do painel).

## Auditoria de lançamento V1 (30/09/2026)

Corrigido:
- Menu do computador: entre 1024 e ~1460 px, com a série no cabeçalho, os últimos capítulos
  (Arquivo, Método, Apoie; em 1024 px, a partir de Períodos) ficavam escondidos numa rolagem
  lateral sem barra. Agora a gaveta vale até 1279 px e, de 1280 a 1599 px, o menu fica um pouco
  mais justo para os 10 itens e a série caberem na linha.
- Links com âncora (`#periodos`, `#apoie`...) abriam no topo da página: os capítulos ganham altura
  depois de montados. O salto é refeito no fim da montagem.
- Prévia de compartilhamento: a raiz do domínio não tinha descrição nem `og:`; não havia imagem.

Pendente (fora do código):
- **Enforce HTTPS** no GitHub Pages: `http://custavaquanto.me/` ainda responde 200 sem
  redirecionar para https.
- Dólar, Selic e Ibovespa param em 22/09/2026 (o site mostra essa data). Rodar
  `scripts/update_data.py` antes do lançamento atualiza os três.

Não bloqueia (fica para depois):
- Algumas imagens de matérias, servidas pelos próprios veículos, passam de 1 MB (carregam só
  quando aparecem na tela).
- `noticias.json` é pedido duas vezes na abertura (dois módulos); o navegador reaproveita o cache.
- Alguns resumos de matérias terminam com a chamada do veículo ("Leia no Poder360.").
- Na lista de trimestres do PIB, data e fonte têm 11,5 px no celular.
- Por decisão de produto (01/10/2026), o endereço fica sempre `https://custavaquanto.me/`: escolher
  uma série não muda o link. Consequências: recarregar a página volta ao ponto de partida
  (gasolina), Voltar/Avançar não alternam entre séries, e não dá para compartilhar o link de uma
  série específica. Links antigos com `?historia=` ainda abrem a série pedida e o endereço volta a
  ficar limpo.

## Apoie desativado (01/10/2026)

- Por decisão do dono do projeto, o capítulo Apoie (Pix) está fora do site por enquanto. O código e a
  configuração (`dashboard/js/apoie.js`, `apoie.config.js`, `vendor/qrcode-generator.js`) seguem no
  repositório. Documentos antigos que falam em "10 capítulos" ou no Apoie descrevem o site com o
  capítulo ativo.

## Salário mínimo real (corrigido em 01/10/2026)

- A escala do "Salário mínimo real" (~R$ 180–220) era um erro de unidade: salário ÷ número-índice do
  IPCA × 1000. Agora é R$ do último mês com IPCA (faixa ~R$ 1.370–1.670; ago/2026 = R$ 1.621).
  Nenhuma leitura mudou. Detalhes: AUDITORIA_ANALISE_GOVERNOS.md (v1.2.1).

## Auditoria acadêmica e metodológica, etapas 2 e 3 (01/10/2026, metodologia v1.3.0 e v1.4.0)

**Resolvido (não reabrir; evidência em [AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md)):**

- IPCA em 12 meses sem 2019 (R1, v1.3.0); litros de gasolina por salário mínimo contados duas vezes em Renda (R2, v1.3.0);
  "robustez" renomeada para "análise de sensibilidade aos pesos" (R7, v1.3.0).
- **Diferença do etanol contra a série oficial da ANP:** causa determinada (ponderação por vendas; a amostra é a mesma). A série
  oficial passou a ser a principal (v1.4.0); a média simples das coletas ficou como sensibilidade.
- **Salário mínimo herdando o buraco de set/2020 da gasolina:** corrigido; a Análise lê uma série própria e completa (v1.4.0).
- **Janela por número de observações (E11):** os resumos "primeiros 12/24/36 meses" usam agora a mesma janela de calendário nos dois
  períodos (v1.4.0). A Análise já usava o calendário.
- **Rótulo do subitem 1111004 ("Leite longa vida"):** correto nas duas estruturas do IPCA (BCB, Estudo Especial nº 69/2019).
- **Links de notícias:** 142 verificados em 01/10/2026 (ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md)).
- **R3b (agregador do Custo de vida):** avaliado; método principal mantido como "defensável, com limitações" e alternativas
  documentadas e calculadas no pipeline.

**Limitações que permanecem (não são erros):** a mediana não ponderada, o voto ±1/0 com tolerância e a razão litros por salário
mínimo são convenções do projeto, sem literatura que as sustente diretamente; a leitura do nível real do Custo de vida depende do resumo
das séries (mediana e médias sem peso: período Bolsonaro; média ponderada pelo IPCA: período Lula, na margem da tolerância); o
resíduo de 0,1% a 0,5% entre a reprodução da série oficial da ANP e a própria série não pôde ser explicado com a documentação pública;
o texto integral do *Consumer Price Index Manual* não pôde ser aberto (acesso bloqueado).

**Escolhas documentadas, não erros:** variação do início ao fim como leitura principal do Custo de vida, com o nível real
como "outra forma de olhar" (R3a); IPCA em vez de INPC no salário real (R9); tolerâncias de 1,0 e 0,1 ponto (R8); câmbio nominal
em reais de hoje, rotulado "Dólar corrigido pelo IPCA" (R5).

## Refinamento da Análise (01/10/2026)

- A Análise ficou ~950 px mais curta no computador (1280 px), mas ~7.000 px mais longa no celular
  (390 px): o contexto de Mercado de trabalho, Atividade e Mercados agora fica sempre à vista, com
  gráfico interativo, abas e acontecimentos recolhidos. O de Custo de vida, Inflação e Renda continua
  atrás do botão "Ver o detalhe" no celular.
- A "Diferença" dos cartões é a distância entre os dois valores já calculados em Python, arredondada
  só no fim (por isso 7,0% e 4,6% aparecem com diferença de 2,3 p.p., não 2,4). É apresentação, não
  um número novo do método; a classificação ("Diferença relevante", "Praticamente iguais", "Sem
  direção definida") vem da leitura e da tolerância da metodologia, sem apontar vencedor.
- A rolagem suave entre capítulos não foi vista em movimento no ambiente de teste (painel oculto);
  o destino e o endereço foram conferidos com a animação desligada.
- O PIB mantém as barras anuais e o gráfico de contexto (linha anual, acontecimentos recolhidos); os trimestres de 2026 continuam
  separados. Nenhum número, fonte ou notícia foi alterado.

## Ideias

- Colocar `download_pib*.py` e `download_ibge_combustiveis.py` no `update_data.py`
  e fazer o aviso de frescor aparecer no site.
- Salvar as verificações de acessibilidade (axe) e de layout como scripts.
- Ampliar o retrato dos presidentes em Períodos (hoje 56×70 px).
- Servir `dashboard_data.json` (~960 KB) em partes; hoje o navegador baixa tudo.
