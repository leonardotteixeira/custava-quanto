# Problemas conhecidos e lacunas

Atualizado em 02/10/2026. Lista só o que continua valendo; o que foi corrigido está nos históricos de versão ([AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md)) e na auditoria ([AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md)).

Legenda: **ALTO** = texto do site que pode contradizer a Análise, ou risco de dado velho · **MÉDIO** = risco operacional ou inconsistência sem efeito visível imediato · **BAIXO** = detalhe.

## Alto

### A1. O Método diz que o projeto não pontua o PIB entre os períodos; a Análise pontua

- `dashboard/index.html`, Método › Limitações: "Este projeto não classifica, pontua ou elege um 'melhor' ou 'pior' resultado de PIB entre os dois períodos."
- Na Análise (`analysis_methodology.json`, indicador `PIB`, tipo A, direção "maior"), o PIB entra na leitura de "Atividade econômica", que aponta para um período.
- É uma decisão editorial pendente, não um erro de cálculo: ou o texto do Método passa a descrever a Análise, ou o PIB deixa de ter direção definida.

### A2. PIB e insumos da estimativa da ANP dependem de execução manual

- `scripts/update_data.py` não roda `download_pib.py`, `download_pib_componentes.py` nem `download_ibge_combustiveis.py` (ver [DATA_PIPELINE.md](DATA_PIPELINE.md)). Quem roda só o `update_data.py` mantém o PIB na última data baixada.
- `build_dashboard_data.py` calcula `PIB.frescor` e emite um aviso, mas não interrompe a publicação, e o site só mostra "atenção: dado possivelmente desatualizado" no painel de fonte do PIB.

## Médio

- **M1. `periodo_do_governo()` rotula qualquer data anterior a 2023 como "Bolsonaro"** (`scripts/common.py`). Correto para as séries que começam em jan/2019. Para uma série mais longa (o PIB guarda histórico desde 1996) classificaria anos de outros governos como "Bolsonaro"; só `montar_pib()` trata o caso, deixando os anos anteriores a 2019 sem período. Uma nova série longa repetiria o erro.
- **M2. Sem testes automáticos do front-end nem de acessibilidade.** Os testes automatizados cobrem os dados, a metodologia e os resultados (`scripts/test_analise.py`). Console, contraste, teclado e layout foram verificados no navegador, sem script salvo ([TESTING_AND_QA.md](TESTING_AND_QA.md)).
- **M3. `download_pib.py --autoteste` está fora de sincronia.** As palavras-chave de `VARS_ANUAL` seguem os nomes reais do SIDRA, mas `scripts/fixtures/pib_anual_exemplo.json` ainda usa nomes antigos: o autoteste não encontra `pib_nominal` nem `pib_per_capita` e imprime "Autoteste concluído" mesmo assim, porque só registra um aviso. O download real funciona; o que falha é o autoteste.
- **M4. Mercado de trabalho: duas das três séries medem quase o mesmo fenômeno.** Desocupação e subutilização andam juntas, então a dimensão pesa mais nelas do que no rendimento. A leitura "sem uma série" (3 de 3) mostra que nenhuma série sozinha muda o resultado. Com a métrica alternativa (variação do início ao fim para as taxas) a dimensão ficaria "praticamente igual" no período completo; a regra da métrica foi fixada antes do cálculo ([METHODOLOGY.md](METHODOLOGY.md)).
- **M5. O rendimento médio real da PNAD é refeito pelo IBGE a cada divulgação.** Valores em reais de uma coleta antiga não são comparáveis com os de uma nova; por isso só se usam variações dentro da mesma coleta.
- **M6. A leitura do nível real do Custo de vida depende do resumo das séries** (mediana e médias sem peso: período Bolsonaro; média ponderada pelo IPCA: período Lula, na margem da tolerância). É uma limitação do método, não um erro; ver [METHODOLOGY.md](METHODOLOGY.md).

## Baixo

- **B1.** Textos fixos desatualizados em `dashboard/index.html`: o subtítulo do Índice diz "Quinze séries" (são 16) e o `aria-label` da faixa de abertura diz "Seis indicadores" (são 8).
- **B2.** A legenda da textura da abertura diz "Cada linha acima é uma das séries deste projeto", mas o fundo mostra só 8 séries curadas mais a história escolhida (`HERO_SET` em `app.js`).
- **B3.** Imagens de matérias: cinco têm 640 a 1024 px de largura (a fonte já é a maior versão publicada), e o campo `imagem_foco` existe sem uso. Notícias de PIB dos resultados anuais de 2022 a 2024 têm só um release cada.
- **B4.** O contexto externo da Análise (5 marcos) cita a fonte como instituição e data, sem link.
- **B5.** Contexto histórico: as páginas da Agência de Notícias do IBGE devolvem 403 a acessos automáticos (quatro itens entram como `verificacao: "manual"`, conferidos por cópia arquivada), e a Agência Brasil desativa algumas páginas por legislação eleitoral ("EBC - Página temporariamente indisponível", HTTP 200). Esses itens não passam na verificação por título e ficaram de fora (por exemplo, a sanção da isenção do Imposto de Renda até R$ 5 mil, em 2025, e o resultado de desemprego de dez/2025). A curadoria pode ser refeita quando as páginas voltarem.
- **B6.** Três fotos editoriais (`dashboard/assets/imagens/`: `urna-eletronica.jpg`, `protesto-cartaz.jpg`, `cabine-votacao.jpg`) não têm origem, autor nem licença confirmados (metadados apagados). A legenda de cada uma no site diz "fonte e licença a confirmar". A do protesto mostra pessoas identificáveis e um cartaz político; foi mantida por decisão editorial, só como contexto e com legenda.
- **B7.** O vídeo da abertura da Análise é uma ilustração gerada por IA; o site usa só um corte limpo do original (sem cartões com números ou texto sem sentido) e diz que a imagem não representa pessoa nem dado real.
- **B8.** O capítulo Apoie (Pix) está fora do site por decisão do projeto. O código e a configuração (`dashboard/js/apoie.js`, `apoie.config.js`, `dashboard/vendor/qrcode-generator.js`) continuam no repositório; a chave Pix em `apoie.config.js` não está configurada.
- **B9.** Não há arquivo de licença no repositório; sem uma, valem os direitos reservados por padrão.
- **B10.** O endereço do site é sempre `https://custavaquanto.me/`: escolher uma série não muda o link. Consequências: recarregar volta ao ponto de partida (gasolina), Voltar/Avançar não alternam entre séries e não dá para compartilhar o link de uma série específica. Links antigos com `?historia=` ainda abrem a série pedida.

## Lacunas de dados (não são erros)

| Lacuna | Situação |
|---|---|
| Setembro/2020 sem pesquisa da ANP | Documentado; as linhas de combustíveis ficam interrompidas; a estimativa "≈" aparece só na Máquina do tempo |
| Preço absoluto de alimentos (R$/kg) | Nenhuma fonte integrada; as fontes avaliadas estão em [AUDITORIA_PRECOS_ALIMENTOS.md](AUDITORIA_PRECOS_ALIMENTOS.md) |
| Cesta básica em R$ (DIEESE) | Sem acesso público em lote |
| PIB 2026 | Só trimestres; o resultado anual não existe |
| Contas públicas, investimento, desigualdade, informalidade e qualidade do emprego | Sem série no projeto; fora da Análise |
| Quebra regional dos combustíveis | O arquivo mensal oficial da ANP é só nacional; as linhas regionais do projeto são médias simples das coletas e não são exibidas |

## Limitações metodológicas

As limitações do método (convenções próprias sem literatura direta, método do Custo de vida "defensável, com limitações", resíduo de 0,14% a 0,47% na reprodução da série da ANP, texto integral do *Consumer Price Index Manual* não consultado, análise de sensibilidade que não é validação externa) estão em [METHODOLOGY.md](METHODOLOGY.md#limitações-e-escolhas-metodológicas) e na auditoria.

## Ideias

- Colocar `download_pib*.py` e `download_ibge_combustiveis.py` no `update_data.py` e fazer o aviso de frescor aparecer no site.
- Salvar as verificações de acessibilidade (axe) e de layout como scripts.
- Servir `dashboard_data.json` (~1 MB) em partes; hoje o navegador baixa tudo.
