# Roadmap

Última atualização: 28/09/2026
Status: **CURRENT** — descreve o estado real do projeto; o plano de design original
fica preservado, com status, em [../DESIGN_EVOLUTION_PLAN.md](../DESIGN_EVOLUTION_PLAN.md).
Um item só está em FEITO se existe no repositório e foi verificado funcionando.

Ordem de prioridade: (1) integridade dos dados, (2) clareza metodológica, (3)
qualidade editorial, (4) UX e arquitetura de informação, (5) refinamento visual, (6)
acessibilidade, (7) desempenho, (8) implantação e manutenção.

## FEITO

**Dados**
- Pipeline de download e consolidação para ANP, IBGE/SIDRA, Banco Central, B3, FRED
  (`update_data.py`), com cache local e falha registrada por fonte.
- Dados diários de Dólar, Selic (meta) e Ibovespa (B3) desde 2019, usados nas
  comparações entre dois pontos.
- PIB como série própria (anual desde 1996, trimestral, componentes de oferta e
  demanda, PIB nominal por soma trimestral) com verificação de frescor no build.
- Estimativa transparente para a lacuna da ANP de set/2020, com teste de volta.
- Correção do recorte "governo inteiro" do PIB (antes comparava 1996–2022 com
  2023–2025).

**Metodologia**
- Análise entre períodos com metodologia congelada (v1.0), hash, modos "mesmo tempo
  de governo" e "período completo disponível", direção e tipo por indicador, mediana
  por dimensão, tolerância, sensibilidade a quatro cenários de peso e testes
  (`test_analise.py`).
- Auditoria da análise ([AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md))
  e auditoria de fontes de preço de alimentos
  ([AUDITORIA_PRECOS_ALIMENTOS.md](AUDITORIA_PRECOS_ALIMENTOS.md)).

**Editorial e produto**
- Notícias verificadas contra a página de origem (111 itens), com foto quando
  existe e crédito; regra "contexto, não causa".
- Site em capítulos: Índice, História, Preço, Bolso, Contexto, Máquina do tempo,
  Períodos, Arquivo, Método, Análise, Apoie.
- Ponto de partida único (dez/2022) no Índice.
- Retratos dos presidentes nítidos (`srcset` de 140/210/280 px).

**Documentação**
- README, CURRENT_STATE, METHODOLOGY, DATA_PIPELINE, KNOWN_ISSUES, TESTING_AND_QA
  e este roadmap sincronizados com o código em 28/09/2026.

## EM ANDAMENTO

- **Preço absoluto de arroz e feijão (CONAB).** Código escrito e testado com dados
  sintéticos; o download real falha (link não encontrado na página) e não há dado
  integrado. Bloqueado por acesso à fonte.
- **Apoie.** Página implementada; falta configurar `SUPPORT_CONFIG.pixKey` (decisão
  do responsável pelo projeto) e decidir sobre QR Code.

## PRÓXIMO

1. **Alinhar o texto do Método ao que os dados têm** (KNOWN_ISSUES H1, M4, L1): tirar
   ou condicionar as afirmações sobre CONAB, sobre o seletor jan/2019, "quinze
   séries" e "seis indicadores".
2. **Decidir a posição editorial sobre o PIB** (H2): o Método diz que não há
   leitura de direção do PIB entre períodos; a Análise a tem.
3. **Colocar PIB e a estimativa da ANP no `update_data.py`** e exibir o aviso de
   frescor no site (H3).
4. **Corrigir o `--autoteste` do PIB** e as docstrings antigas (M6, L9).
5. **Aposentar ou isolar `download_bcb.py` e `download_ibovespa.py`** (M1).
6. **Salvar as verificações de acessibilidade (axe) e de layout (320/390/768/1024/
   1440) como scripts** (M5).
7. Revisar o foco (`imagem_foco`) das fotos de maior destaque.

## BACKLOG

- Tornar `periodo_do_governo()` seguro para séries que começam antes de 2019 (M3).
- `requirements.txt` completo (Pillow, numpy) e versão de Python declarada.
- Indicadores hoje fora do escopo: emprego, contas públicas, investimento,
  desigualdade — só entram se houver fonte pública confiável e série comparável.
- PIB trimestral no modo "mesmo tempo de governo" da Análise (hoje usa só anos
  fechados: 2019–2021 × 2023–2025).
- Filtro regional para combustíveis (os dados já têm quebra por região).
- Mais cobertura de notícias para PIB (2022–2024) e links para as fontes do
  contexto externo da Análise (L4, L5).
- Retratos maiores em Períodos (hoje 56×70 px).
- Licença do repositório e configuração de deploy (não existem hoje).
- Servir `dashboard_data.json` em partes (hoje ~960 KB de uma vez).

## EXPERIMENTAL / OPCIONAL

- Integração com DIEESE (só se a fonte voltar a permitir acesso em lote).
- Atualização agendada (`update_data.py --rapido` periódico); hoje é manual.

## O que este roadmap não promete

Nenhum item acima está em produção. Se algo aparece na lista "PRÓXIMO" e ainda não
está no código, ele **não existe** na versão atual do site.
