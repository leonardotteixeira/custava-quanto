# Testes e QA

Última atualização: 30/09/2026
Status: **CURRENT**. Só consta aqui o que existe e foi executado; o que é manual
está dito como manual.

## Resumo

| Área | Como é verificada hoje | Automático? |
|---|---|---|
| Análise entre períodos (metodologia, janelas, direção, PIB, Selic, alimentos, hash) | `scripts/test_analise.py` | **Sim** (roda no `update_data.py`) |
| Notícias (página responde, título e data conferem) | `scripts/build_news.py` | **Sim**, a cada build de notícias |
| Frescor do PIB | `_checar_frescor_pib()` em `build_dashboard_data.py` | Sim, mas só **avisa** |
| Lógica de leitura do CONAB | `download_conab.py --autoteste` (dados sintéticos) | Sim, manual de acionar |
| Lógica de leitura do PIB | `download_pib.py --autoteste` (dados sintéticos) | Rodável, mas **fora de sincronia** (ver KNOWN_ISSUES M6) |
| Front-end: console, layout, teclado, acessibilidade | Verificação à mão no navegador (axe-core, capturas, medidas de overflow) | **Não** — nenhum script salvo |
| Dados brutos (ANP etc.) | Validações internas dos scripts de download | Parcial |

Não há framework de testes (pytest ou similar), nem integração contínua, nem
teste de front-end no repositório.

## `scripts/test_analise.py`

    .venv/Scripts/python scripts/test_analise.py

Sem dependências além da biblioteca padrão. Sai com código 1 e lista as falhas.
Verifica:

- versão da metodologia presente e **hash SHA-256** do arquivo igual ao registrado
  nos resultados (impede metodologia retroativa);
- todo indicador Tipo A tem direção ("maior"/"menor"; Tipo B e C não têm); Selic,
  Dólar e Ibovespa são Tipo B; Selic usa a métrica em p.p. (`nivel`);
- nenhum indicador duplicado; toda dimensão existe;
- pesos de cada cenário: cobrem exatamente as dimensões Tipo A e somam 100;
- em cada janela: Bolsonaro dentro de jan/2019–dez/2022, Lula a partir de
  jan/2023, **nenhuma data no futuro**, `f` coerente com a direção, Tipo B/C sem
  leitura de direção;
- **mesmo tempo de governo**: mesmo número de observações nos dois períodos;
- custo de vida sempre pela série **real**;
- PIB: o ano final de cada janela tem resultado anual fechado, e um ano que só tem
  trimestres não aparece como fechado;
- alimentos marcados como índice ("não é R$");
- nenhum texto gerado contém "venceu", "vencedor", "melhor governo", "pior
  governo", "campeão", "perdeu";
- os cenários da síntese batem com a metodologia; Mercados nunca recebem leitura;
- o fim do período Lula na Gasolina é o último mês disponível;
- **Arquivo:** toda URL curada em `data/news/raw_*.json` está em `noticias.json`; sem URL duplicada;
  todo item tem título, veículo, data, `indicadores` e `dimensoes` (vocabulário fechado).
- **v1.2**: Mercado de trabalho (tabela e variável do SIDRA, direção, métrica, série do dashboard
  contra a resposta bruta do IBGE quando o cache existe, período de cada trimestre móvel, votos
  recalculados, um só peso por dimensão nos cenários, ordem das dimensões) e marcos de contexto
  (`noticias.json` × `marcos.json`, fonte aceita, https, data de 2019 até hoje, indicadores
  existentes, `causalidade: "contexto"`, sem linguagem causal, verificação registrada,
  mínimo de 5 marcos por dimensão).
- **v1.1**: modo principal "completo" e nomes dos modos; regras de nível de evidência;
  "mede/não mede/critério" em cada dimensão; nível de evidência recalculado por
  regra; **soma da síntese recalculada** de forma independente (peso × sentido) para
  cada cenário; total e soma da **grade** de combinações (C(n+k−1, k−1); 10.626 na v1.2); grupos de custo de
  vida cobrindo todas as séries; maiores altas e quedas conferidas com as séries;
  variação % recalculada de valor inicial e final; PIB anual só de 2019 em diante,
  só anos fechados, período certo por ano, trimestres só de ano ainda não fechado;
  "janela que muda a leitura" igual à diferença real entre os dois modos; nenhum
  "favorável/desfavorável/melhorou/piorou" nos textos gerados.

Foi testado também com resultado adulterado à mão (hash trocado, Selic com
leitura): as duas falhas foram detectadas.

## Verificações manuais feitas (não repetíveis por script)

Registradas para dar contexto; **não** substituem testes automáticos.

- **Acessibilidade (axe-core no navegador):** capítulo Análise, Método (com "Audite a
  análise") e Apoie com 0 violações em 30/09/2026 (depois de trocar os títulos do painel
  de auditoria para `h3`). Na página inteira, a única violação é o contraste do número
  "10" no item Apoie do menu (3,7:1, por `opacity: 0.8`; existia antes, KNOWN_ISSUES L13). Nos demais capítulos a checagem não
  foi refeita depois das últimas mudanças.
- **Layout responsivo:** medidas de rolagem horizontal nas larguras 320, 390 e 768
  px para o capítulo Análise e o restante da página; captura em 1440 px. 1024 px e
  1920 px não foram cobertos nesta rodada.
- **Celular (30/09/2026):** páginas de Gasolina em 320, 360, 375, 390, 412 e 430 px (iframe
  na largura pedida; o painel do navegador não desce de ~386 px) e em 768, 1024, 1280, 1440
  e 1920 px: sem rolagem horizontal da página, nenhum botão ou link isolado com menos de
  44 px de altura e nenhum texto abaixo de 12 px nas larguras de celular. axe-core (WCAG 2
  A/AA e boas práticas) em 390 e 1280 px: únicas violações são o contraste do "10" do menu
  em tela larga (L13, anterior) e o número grande da Máquina do tempo medido no meio da
  animação de entrada (opacidade 0,25; o valor final tem contraste suficiente). Navegação por
  menu (abrir, Esc, foco preso, `inert` no conteúdo, fechar ao escolher capítulo e ao
  passar de 900 px) testada. Não testado em aparelho físico nem em leitor de tela.
- **Celular, segunda rodada (30/09/2026):** Playwright com emulação de celular (`isMobile`,
  `hasTouch`) em 320, 360, 375, 390, 412 e 430 px, e 768, 1024, 1280 e 1440 px sem emulação.
  **Checar `window.innerWidth` igual à largura do aparelho**, não só `scrollWidth − clientWidth`:
  com emulação de celular a janela de layout cresce junto com o conteúdo que vaza, e as duas
  medidas continuam iguais (foi assim que a página em 624 px passou despercebida; iframes também
  não mostram o problema). Medido também com todos os `<details>` e detalhes da Análise abertos.
  axe-core (WCAG 2 A/AA e boas práticas) em 390, 768 e 1440 px, nas histórias Gasolina, Selic,
  Arroz e PIB e com tudo expandido: 0 violações. Desktop 1440 e 1024 px com ?historia=gasolina:
  captura de página inteira sem diferença acima de 24/255 por canal em relação ao `master` anterior
  (a única mudança de desktop abaixo desse limiar é a cor do "10" do Apoie). Toque no gráfico
  principal, gaveta aberta no meio da página, alvos de toque (nenhum botão ou link isolado com
  menos de 44 px). Não testado em aparelho físico nem em leitor de tela.
- **Teclado:** foco e ativação dos controles de janela da Análise; nos gráficos
  as setas percorrem os pontos e, no gráfico anual do PIB, Enter/Espaço selecionam o
  ano (implementado em `charts.js`); a checagem foi feita lendo o código e testando
  os controles da Análise, não com leitor de tela.
- **Console do navegador:** sem erros nas páginas de Gasolina, Arroz, Dólar e PIB na
  última verificação.
- **Pix (Apoie):** com chave falsa em memória, validados o payload (campos e CRC por
  validador independente), os 4 valores sugeridos e "outro valor" (válidos e inválidos),
  a atualização do QR ao trocar de valor e a decodificação do QR por leitor independente
  (jsQR, só no teste). A cópia foi verificada com a área de transferência simulada; o
  caminho real do navegador e o pagamento em app de banco não foram exercitados.

- **Auditoria de lançamento V1 (30/09/2026), no site publicado:** `test_analise.py` passa;
  `dashboard_data.json` sem NaN/infinito, sem mês duplicado, em ordem, sem lacuna além de
  set/2020 dos combustíveis (sem pesquisa da ANP; a linha fica interrompida e a estimativa é
  mostrada à parte, marcada); PIB anual só com anos fechados (1996–2025), 2026 só em trimestres;
  Selic mensal (média da meta no mês) coerente com a série diária. As 142 fontes do Arquivo
  abrem (138 respondem 200 a um script; as 4 da Agência IBGE bloqueiam robôs e foram abertas no
  navegador, com o título certo); nas 138, título e data conferem com a página; os resumos
  amostrados (um por ano) são a descrição da própria fonte; as 97 imagens carregam. Navegação:
  10 âncoras do menu existem, nenhum link interno quebrado, nenhum recurso `http://`, nenhum erro
  no console, todas as requisições 200. Fluxo Pix: 4 valores e "outro valor" (válidos e
  inválidos), payload com CRC válido, QR gerado. Troca de série (9 séries) sem resto da série
  anterior; links `?historia=` (válido, inválido, com `#capítulo`), recarregar, voltar e avançar.
  axe-core: 0 violações em 390, 1024 e 1366 px (com a animação do mês da Máquina do tempo
  terminada).
- **Auditoria metodológica, v1.3.0 (01/10/2026):** `test_analise.py` ganhou um bloco por item da auditoria. R1: o
  número-índice do IPCA começa em jan/2018, o IPCA em 12 meses começa em jan/2019, cada mês é recalculado por fora
  (índice do mês ÷ índice de 12 meses antes), o período Bolsonaro tem 48 meses e as janelas de igual duração têm o mesmo tamanho.
  R2: litros por salário mínimo é Tipo C, Renda tem uma série com voto e leitura igual à do salário real, e a série de litros
  continua igual a salário ÷ preço (nominal e real). R3a: a leitura principal do Custo de vida segue a variação do início ao fim,
  o nível real é recalculado por série e não entra na síntese. R5: o site não usa "dólar real" e o dólar corrigido é câmbio nominal
  × IPCA base ÷ IPCA do mês. R6: o preço nacional de mar/2019 é a média simples das coletas brutas. R7: 10.626 = C(24,4), grade
  recontada por enumeração independente, texto da sensibilidade sem "robustez". R8: tolerâncias. R9: salário mínimo real em
  jan/2019 a jan/2026 e no mês-base. R10: códigos SIDRA dos seis itens. Integridade: nenhum valor não finito e nenhuma série mensal
  duplicada ou fora de ordem.
- **Metodologia v1.4.0 (01/10/2026):** `test_analise.py` confere que o preço nominal de cada combustível, em cada mês, é o da série oficial da
  ANP (`anp_oficial_mensal.csv`, sem mês duplicado, ordenado, positivo) e que a média simples das coletas do etanol fica, em média, entre 2% e 12% acima
  dela; que a série do salário mínimo é própria, começa em jan/2019, não tem mês faltando (inclusive set/2020) e que o salário real tem 48 meses
  no período Bolsonaro e o número de meses do calendário no Lula; que `SALARIO_REAL` e `SALARIO_NOMINAL` têm origem `SALARIO_MINIMO`; que nenhuma janela
  "primeiros 12/24/36 meses" passa do mês *n* do mandato e que a de 24 meses da gasolina termina em dez/2020 e dez/2024; e, para o R3b, que os agregadores do
  Custo de vida reproduzem a mediana e a média recalculadas por fora, que a "mediana" reproduz a leitura principal, que cada grade tem 10.626
  combinações e que os pesos do IPCA são positivos (o diesel S10 não tem peso próprio). Auditorias reexecutáveis (somente leitura): `docs/auditoria_simulacoes.py`,
  `docs/auditoria_antes_depois.py`, `docs/auditoria_custo_vida_agregadores.py`, `docs/auditoria_anp_ponderacao.py` (precisa do cache bruto da ANP) e
  `docs/auditoria_links.py` (rede). QA do front-end: 12 larguras (1024, 1280, 1366, 1440, 1600, 1920 e 320, 360, 375, 390, 412, 430 px), sem rolagem horizontal, sem
  imagem quebrada, axe-core com 0 violações e sem erro no console; as 17 histórias abrem sem erro.
- **Parte 10 da Análise, bloco "Teste de sensibilidade" (01/10/2026):** números lidos de `res().grade`
  (v1.2.1: 10.626 = 10.625 + 1 + 0 no período completo; v1.3.0: 10.626 + 0 + 0 nas duas janelas); mexer nos
  controles "Seus pesos" não altera o bloco; sem rolagem lateral em 320–1920 px; axe-core com 0
  violações em 390 e 1280 px.
- **Salário mínimo real (01/10/2026):** `test_analise.py` agora recalcula, por fora, cada mês do salário
  mínimo real (nominal × IPCA do último mês ÷ IPCA do mês), exige igualdade com o nominal no mês-base
  (ago/2026), a ordem de grandeza e a unidade em R$. Comparado campo a campo com a geração anterior:
  só mudaram os valores absolutos do salário real; variação, leitura, síntese e grade ficaram iguais.
- **Refinamento da Análise (01/10/2026):** navegação por capítulos sem `#capítulo` na barra
  (cliques no menu e nos links internos só rolam; link que chega com `#capítulo` salta e limpa o
  endereço; `?historia=` antigo ainda abre a série); cartões "Em 1 minuto" (valores iguais aos da
  tabela anterior: custo de vida +34,8%/−9,8%, inflação 7,0%/4,6%, renda +0,8%/+0,9%, trabalho
  12,1%/6,6%, 25,3%/15,7%, −1,5%/+13,2%, atividade 1,4%/3,0%, mercados +35,2%/−4,3%, +7,25/0,00 p.p.,
  +20,6%/+76,2%; nenhum arquivo de `data/` mudou); abas de série, acontecimentos recolhidos,
  "Mostrar todos", clique e Enter nos números do gráfico, dica ao passar o mouse, setas/Home/End nas
  abas, Esc; as seis dimensões, todas as abas e o modo "mesmo número de meses". Sem rolagem lateral
  nem alvo de toque abaixo de 44 px em 320–430 px; sem rolagem lateral em 768–1920 px; axe-core com 0
  violações em 390 e 1280 px (eventos abertos e detalhes expandidos).
## Histórico

`PHASE_1_QA_REPORT.md` (23/09/2026) é o relatório de QA da primeira reformulação e
está marcado como **HISTÓRICO**: descreve a página daquela data, não a atual.

## Como validar uma mudança de dados

1. `.venv/Scripts/python scripts/build_dashboard_data.py` — confira avisos no log
   (frescor do PIB, colunas ausentes).
2. `.venv/Scripts/python scripts/build_analise.py` e
   `.venv/Scripts/python scripts/test_analise.py`.
3. Sirva o site (`.venv/Scripts/python -m http.server 8420`, na raiz do projeto),
   abra `http://localhost:8420/dashboard/index.html` e confira o console.
4. Em Método › Atualização dos dados, confira a data do último sucesso de cada
   fonte.
