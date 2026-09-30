"""Análise comparativa entre períodos de governo — capítulo "Análise" do site.

Ordem OBRIGATÓRIA (é o que impede metodologia retroativa):

  1. escrever_metodologia()  -> data/processed/analysis_methodology.json
     Dimensões, perguntas, indicadores, direção interpretável, tipo (A/B/C),
     métrica, pesos, cenários de sensibilidade e regras de período. Nada aqui
     depende de nenhum resultado.
  2. calcular_resultados()   -> data/processed/analysis_results.json
     Lê a metodologia DO DISCO (não das constantes deste arquivo) e aplica
     sobre dashboard_data.json. Grava junto o hash SHA-256 da metodologia
     usada, para qualquer pessoa conferir que o cálculo seguiu aquela versão.

Mudou algo na seção 1? Suba METODOLOGIA_VERSAO (v1.1, v2.0...) e registre em
docs/AUDITORIA_ANALISE_GOVERNOS.md o que mudou e por quê.

Regras de cálculo (todas também escritas na metodologia):
- Nenhum dado é baixado nem estimado aqui: só dashboard_data.json.
- Mercado de trabalho (PNAD Contínua): séries em trimestres móveis identificados pelo mês em que
  terminam; só entram trimestres INTEIROS dentro de um mandato (Bolsonaro: terminados de mar/2019
  a dez/2022; Lula: terminados a partir de mar/2023). Cada série é lida na sua unidade e vota uma
  vez (dimensão de agregação "por_serie"); unidades diferentes nunca entram numa mesma mediana.
- "Mesmo tempo de governo": o mês k de cada mandato (Bolsonaro: jan/2019 + k-1;
  Lula: jan/2023 + k-1). Entram só os k em que os DOIS períodos têm dado.
- "Período completo disponível": todos os meses de cada período (Lula em curso).
- A síntese entre dimensões usa só o SENTIDO de cada dimensão (-1, 0, +1),
  nunca a magnitude: as dimensões têm unidades diferentes (%, p.p.) e somá-las
  seria misturar grandezas.
"""
from __future__ import annotations

import hashlib
import itertools
import json
import statistics
import sys
from datetime import datetime, timezone

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("build_analise")

METODOLOGIA_VERSAO = "1.2"
METODOLOGIA_DATA = "2026-09-30"

INICIO = {"Bolsonaro": (2019, 1), "Lula": (2023, 1)}

# ------------------------------------------------------------------ 1. metodologia
# Perguntas definidas ANTES de olhar qualquer resultado.
DIMENSOES = [
    {"id": "custo_vida", "ordem": 1, "titulo": "Custo de vida", "tipo": "A",
     "pergunta": "Em qual período os preços analisados tiveram menor pressão real (descontada a inflação) sobre o consumidor?",
     "explicacao": "Combustíveis (preço médio em reais, ANP) e alimentos (índice de preço encadeado, IBGE). Usamos a variação REAL, porque a variação nominal sobe junto com a inflação em qualquer período.",
     "mede": "quanto variou, descontada a inflação, o preço de cinco combustíveis (em R$) e o índice de preço de seis alimentos",
     "nao_mede": "o gasto de uma família nem o preço em reais dos alimentos",
     "criterio": {"metrica": "variação real mediana das 11 séries", "sentido": "menor", "explica": "menor variação real = menor pressão sobre o consumidor"}},
    {"id": "inflacao", "ordem": 2, "titulo": "Inflação", "tipo": "A",
     "pergunta": "Em qual período a inflação observada (IPCA em 12 meses) foi, em média, menor?",
     "explicacao": "A média da inflação acumulada em 12 meses ao longo da janela. Mede pressão inflacionária no período, não se a inflação subiu ou caiu entre o primeiro e o último mês.",
     "mede": "a variação média de preços de uma cesta de consumo nacional, acumulada em 12 meses",
     "nao_mede": "a inflação vivida por cada família",
     "criterio": {"metrica": "média do IPCA em 12 meses", "sentido": "menor", "explica": "média menor = menor pressão inflacionária no período"}},
    {"id": "renda", "ordem": 3, "titulo": "Renda e poder de compra", "tipo": "A",
     "pergunta": "Em qual período o salário mínimo ganhou mais poder de compra nos indicadores disponíveis?",
     "explicacao": "O salário mínimo descontada a inflação (IPCA) e quantos litros de gasolina ele comprava. O valor nominal aparece só como informação: ele sobe em qualquer período com inflação.",
     "mede": "quanto o piso nacional rende, descontada a inflação, e quantos litros de gasolina ele compra",
     "nao_mede": "a renda média das famílias nem a de quem ganha acima do piso",
     "criterio": {"metrica": "variação mediana do poder de compra das 2 séries", "sentido": "maior", "explica": "variação maior = o piso rende mais"}},
    {"id": "trabalho", "ordem": 4, "titulo": "Mercado de trabalho", "tipo": "A", "agregacao": "por_serie",
     "pergunta": "Em qual período o mercado de trabalho mostrou menor desocupação, menor subutilização da força de trabalho e maior rendimento real do trabalho?",
     "explicacao": "Três séries oficiais da PNAD Contínua (IBGE), em trimestres móveis: a taxa de desocupação, a taxa composta de subutilização da força de trabalho e o rendimento médio real habitual. As unidades são diferentes (%, % e R$); por isso cada série é lida na sua unidade e vota uma vez, em vez de misturar unidades numa mediana.",
     "mede": "quantas pessoas procuram trabalho e não encontram, quantas estão sem trabalho suficiente ou disponível, e quanto ganham, em média e já descontada a inflação, as pessoas ocupadas com rendimento de trabalho",
     "nao_mede": "informalidade, qualidade do emprego, desigualdade de renda nem diferenças entre regiões e grupos",
     "criterio": {"metrica": "voto de cada série: taxas pela média da janela (média menor = menos desocupação ou subutilização); rendimento real pela variação do início ao fim da janela (variação maior = mais rendimento)",
                  "sentido": "misto", "explica": "cada série vota +1, 0 ou -1 e a dimensão segue o sinal da soma dos votos"}},
    {"id": "atividade", "ordem": 5, "titulo": "Atividade econômica", "tipo": "A",
     "pergunta": "Em qual período a atividade econômica medida pelo PIB apresentou maior crescimento?",
     "explicacao": "A média do crescimento real anual do PIB (IBGE). Só anos com resultado anual fechado: o ano em curso tem apenas trimestres e não entra na média.",
     "mede": "o crescimento real da produção do país, ano a ano",
     "nao_mede": "renda individual, distribuição de renda ou bem-estar",
     "criterio": {"metrica": "crescimento médio anual do PIB", "sentido": "maior", "explica": "média maior = a produção cresceu mais por ano"}},
    {"id": "mercados", "ordem": 6, "titulo": "Mercados e condições financeiras", "tipo": "B",
     "pergunta": "Como os principais indicadores financeiros evoluíram em cada período?",
     "explicacao": "Dólar, Selic e Ibovespa são descritos, não pontuados: nenhum deles tem uma direção que seja boa ou ruim para todo mundo. Por isso esta dimensão não entra na síntese entre dimensões.",
     "mede": "cotações e taxas financeiras: câmbio, juros básicos e o principal índice da bolsa",
     "nao_mede": "o bem-estar da população; nenhuma delas tem direção boa ou ruim para todos",
     "criterio": None},
]

# Tipo A: direção interpretável definida. Tipo B: depende do contexto (só descrição).
# Tipo C: informativo (não entra em nenhuma leitura de direção).
_LIM_COMB = ["Depende em parte de cotações internacionais (Brent) e do câmbio, não só de decisões domésticas.",
             "Preço médio nacional de revenda: não é o preço de cada posto ou estado."]
_LIM_ALIM = ["Índice de preço encadeado (IPCA por item, IBGE), não o preço em reais do produto.",
             "Safra, clima e preços internacionais de grãos pesam sobre o resultado."]


def _comb(cod, nome):
    return {"id": cod, "dimensao": "custo_vida", "tipo": "A", "campo": "preco_real", "metrica": "variacao_pct",
            "direcao": "menor", "unidade": "R$ (em valores do último mês)", "fonte": "ANP — Levantamento de Preços de Combustíveis",
            "frequencia": "mensal", "nome": nome,
            "interpretacao": "Queda do preço real é, em geral, favorável ao consumidor.", "limitacoes": _LIM_COMB, "confianca": "alta"}


def _alim(cod, nome):
    return {"id": cod, "dimensao": "custo_vida", "tipo": "A", "campo": "indice_relativo_real", "metrica": "variacao_pct",
            "direcao": "menor", "unidade": "índice (jan/2019 = 100), não é R$", "fonte": "IBGE/SIDRA — IPCA por item",
            "frequencia": "mensal", "nome": nome, "indice": True,
            "interpretacao": "Queda do índice real é, em geral, favorável ao consumidor.", "limitacoes": _LIM_ALIM, "confianca": "média"}


INDICADORES = [
    _comb("GASOLINA", "Gasolina"), _comb("ETANOL", "Etanol"), _comb("DIESEL", "Diesel"),
    _comb("DIESEL S10", "Diesel S10"), _comb("GLP", "Gás de cozinha (GLP)"),
    _alim("Arroz", "Arroz"), _alim("Feijão carioca", "Feijão"), _alim("Carne bovina (patinho)", "Carne"),
    _alim("Leite longa vida", "Leite"), _alim("Óleo de soja", "Óleo de soja"), _alim("Café moído", "Café"),
    {"id": "IPCA", "dimensao": "inflacao", "tipo": "A", "campo": "taxa_aa", "metrica": "media", "direcao": "menor",
     "unidade": "% em 12 meses", "fonte": "IBGE — IPCA", "frequencia": "mensal", "nome": "IPCA (12 meses)",
     "interpretacao": "Inflação média menor representa menor pressão sobre os preços.",
     "limitacoes": ["Média nacional de uma cesta: não é a inflação de cada família.",
                    "A série de 12 meses começa em jan/2020 (precisa de 12 meses anteriores)."], "confianca": "alta"},
    {"id": "SALARIO_REAL", "origem": "GASOLINA", "dimensao": "renda", "tipo": "A", "campo": "salario_minimo_real", "metrica": "variacao_pct",
     "direcao": "maior", "unidade": "R$ descontado o IPCA", "fonte": "Banco Central (salário mínimo) + IBGE (IPCA)",
     "frequencia": "mensal", "nome": "Salário mínimo real",
     "interpretacao": "Alta real do salário mínimo representa mais poder de compra para quem o recebe.",
     "limitacoes": ["Quem ganha o salário mínimo é uma parte da população; não mede a renda média nem a renda das famílias."], "confianca": "alta"},
    {"id": "SM_GASOLINA", "origem": "GASOLINA", "dimensao": "renda", "tipo": "A", "campo": "unidades_por_salario_minimo", "metrica": "variacao_pct",
     "direcao": "maior", "unidade": "litros por salário mínimo", "fonte": "ANP + Banco Central (cálculo do projeto)",
     "frequencia": "mensal", "nome": "Litros de gasolina por salário mínimo",
     "interpretacao": "Mais litros por salário mínimo representa mais poder de compra em combustível.",
     "limitacoes": ["Mede o poder de compra em UM item; não é um índice de custo de vida."], "confianca": "alta"},
    {"id": "SALARIO_NOMINAL", "origem": "GASOLINA", "dimensao": "renda", "tipo": "C", "campo": "salario_minimo", "metrica": "variacao_pct",
     "direcao": None, "unidade": "R$ (valor nominal)", "fonte": "Banco Central / decretos do salário mínimo",
     "frequencia": "mensal", "nome": "Salário mínimo (nominal)",
     "interpretacao": "Informativo: o valor nominal sobe com a inflação em qualquer período; a leitura de poder de compra está no valor real.",
     "limitacoes": ["Não descontado a inflação."], "confianca": "alta"},
    {"id": "DESOCUPACAO", "bloco": "mercado_trabalho", "dimensao": "trabalho", "tipo": "A", "campo": "taxa_desocupacao", "metrica": "media",
     "direcao": "menor", "trimestre_movel": True, "unidade": "% da força de trabalho",
     "fonte": "IBGE — PNAD Contínua, tabela 6381 (variável 4099)", "frequencia": "trimestre móvel (resultado mensal)",
     "nome": "Taxa de desocupação",
     "interpretacao": "Taxa menor significa menos pessoas procurando trabalho sem encontrar, em proporção da força de trabalho.",
     "limitacoes": ["Só conta quem procurou trabalho na semana de referência: quem desistiu de procurar não entra (aparece na subutilização).",
                    "Cada ponto é a média de três meses; a amostra tem margem de erro (coeficiente de variação publicado pelo IBGE)."], "confianca": "alta"},
    {"id": "SUBUTILIZACAO", "bloco": "mercado_trabalho", "dimensao": "trabalho", "tipo": "A", "campo": "taxa_subutilizacao", "metrica": "media",
     "direcao": "menor", "trimestre_movel": True, "unidade": "% da força de trabalho ampliada",
     "fonte": "IBGE — PNAD Contínua, tabela 6441 (variável 4118)", "frequencia": "trimestre móvel (resultado mensal)",
     "nome": "Taxa composta de subutilização",
     "interpretacao": "Taxa menor significa menos pessoas desocupadas, com trabalho insuficiente em horas ou disponíveis para trabalhar sem procurar, em proporção da força de trabalho ampliada.",
     "limitacoes": ["Inclui desocupados, subocupados por insuficiência de horas e força de trabalho potencial: é mais ampla que a desocupação e correlacionada com ela.",
                    "Cada ponto é a média de três meses; a amostra tem margem de erro."], "confianca": "alta"},
    {"id": "RENDIMENTO", "bloco": "mercado_trabalho", "dimensao": "trabalho", "tipo": "A", "campo": "rendimento_medio_real", "metrica": "variacao_pct",
     "direcao": "maior", "trimestre_movel": True, "unidade": "R$ mensais, valores reais do IBGE",
     "fonte": "IBGE — PNAD Contínua, tabela 6390 (variável 5933)", "frequencia": "trimestre móvel (resultado mensal)",
     "nome": "Rendimento médio real habitual",
     "interpretacao": "Variação maior representa mais rendimento real médio de quem está ocupado e tem rendimento de trabalho.",
     "limitacoes": ["Média de quem tem rendimento de trabalho: mudanças em quem está ocupado (por exemplo, saída de trabalhadores de menor renda) também mexem na média.",
                    "O IBGE deflaciona pelo IPCA a preços do mês do meio do trimestre mais recente e refaz o deflator a cada divulgação: comparamos variações da mesma divulgação, nunca valores de divulgações diferentes."],
     "confianca": "alta"},
    {"id": "PIB", "dimensao": "atividade", "tipo": "A", "campo": "taxa_aa", "metrica": "media", "direcao": "maior", "anual": True,
     "unidade": "% de crescimento real no ano", "fonte": "IBGE — Sistema de Contas Nacionais Trimestrais",
     "frequencia": "anual (resultado do 4º trimestre)", "nome": "PIB (crescimento real anual)",
     "interpretacao": "Crescimento maior representa maior atividade econômica medida; não é uma medida direta de renda individual ou bem-estar.",
     "limitacoes": ["Não mede distribuição de renda nem bem-estar.", "O IBGE revisa a série; usamos a última revisão disponível.",
                    "O ano em curso só tem trimestres e não entra na média anual."], "confianca": "alta"},
    {"id": "DOLAR", "dimensao": "mercados", "tipo": "B", "campo": "preco_nominal", "metrica": "variacao_pct", "direcao": None,
     "unidade": "R$ por US$", "fonte": "Banco Central — PTAX venda", "frequencia": "mensal (média do mês); diário nas pontas do período completo",
     "nome": "Dólar", "diario": True,
     "interpretacao": "Efeitos mistos: real mais forte barateia importações e combustíveis; real mais fraco favorece exportadores. Não é bom nem ruim para todos.",
     "limitacoes": ["Muito sensível a juros globais e ao fluxo internacional de capital."], "confianca": "alta"},
    {"id": "SELIC", "dimensao": "mercados", "tipo": "B", "campo": "taxa_aa", "metrica": "nivel", "direcao": None,
     "unidade": "% ao ano", "fonte": "Banco Central — meta Selic (Copom)", "frequencia": "mensal (média do mês); diário nas pontas do período completo",
     "nome": "Selic", "diario": True,
     "interpretacao": "Instrumento de política monetária: juros mais altos encarecem o crédito e tendem a conter a inflação. A leitura depende da inflação, da atividade e das expectativas.",
     "limitacoes": ["Definida pelo Copom do Banco Central, que tem mandato próprio."], "confianca": "alta"},
    {"id": "IBOVESPA", "dimensao": "mercados", "tipo": "B", "campo": "pontos", "metrica": "variacao_pct", "direcao": None,
     "unidade": "pontos", "fonte": "B3 — Ibovespa, fechamento", "frequencia": "mensal (fechamento do mês); diário nas pontas do período completo",
     "nome": "Ibovespa", "diario": True,
     "interpretacao": "Desempenho de uma carteira teórica de ações. Reflete lucros das empresas, juros, câmbio, cenário externo e expectativas; não mede o bem-estar das famílias.",
     "limitacoes": ["Variação nominal, em pontos; não descontada a inflação."], "confianca": "alta"},
]

# Pesos: o padrão é IGUAL entre as quatro dimensões com direção interpretável —
# não há razão a priori para privilegiar uma delas; qualquer outra escolha é um
# juízo de valor. Os cenários testam juízos diferentes, definidos antes do cálculo.
CENARIOS = [
    {"id": "iguais", "nome": "Pesos iguais", "pesos": {"custo_vida": 20, "inflacao": 20, "renda": 20, "trabalho": 20, "atividade": 20},
     "justificativa": "Nenhuma dimensão privilegiada."},
    {"id": "custo_vida", "nome": "Ênfase em custo de vida", "pesos": {"custo_vida": 40, "inflacao": 15, "renda": 15, "trabalho": 15, "atividade": 15},
     "justificativa": "Para quem prioriza o que chega ao bolso no dia a dia."},
    {"id": "inflacao", "nome": "Ênfase em inflação", "pesos": {"custo_vida": 15, "inflacao": 40, "renda": 15, "trabalho": 15, "atividade": 15},
     "justificativa": "Para quem prioriza a estabilidade de preços."},
    {"id": "renda", "nome": "Ênfase em renda e poder de compra", "pesos": {"custo_vida": 15, "inflacao": 15, "renda": 40, "trabalho": 15, "atividade": 15},
     "justificativa": "Para quem prioriza o que o salário compra."},
    {"id": "trabalho", "nome": "Ênfase em mercado de trabalho", "pesos": {"custo_vida": 15, "inflacao": 15, "renda": 15, "trabalho": 40, "atividade": 15},
     "justificativa": "Para quem prioriza emprego e rendimento do trabalho."},
    {"id": "atividade", "nome": "Ênfase em atividade econômica", "pesos": {"custo_vida": 15, "inflacao": 15, "renda": 15, "trabalho": 15, "atividade": 40},
     "justificativa": "Para quem prioriza o crescimento da economia."},
]

REGRAS = {
    "modos": {
        "completo": "Todos os meses com dado de cada período: Bolsonaro jan/2019-dez/2022; Lula jan/2023-último dado (em curso). Dólar, Selic e Ibovespa usam o primeiro e o último dado diário nas pontas. Mercado de trabalho: só trimestres móveis inteiros dentro do período (Bolsonaro: terminados de mar/2019 a dez/2022; Lula: terminados a partir de mar/2023).",
        "mesmo_tempo": "Os primeiros N meses de cada período (Bolsonaro: jan/2019 + k-1; Lula: jan/2023 + k-1). Entram só os k em que os dois períodos têm dado. PIB: ano k de cada período, só anos fechados. Mercado de trabalho: trimestre móvel terminado no mês k de cada mandato, só trimestres inteiros dentro do período.",
    },
    "modos_nomes": {"completo": "Período completo disponível", "mesmo_tempo": "Comparação por igual duração"},
    "modo_principal": "completo",
    "modo_principal_nota": "A comparação principal é a dos períodos inteiros, como o projeto os define (Bolsonaro jan/2019-dez/2022; Lula jan/2023-último dado). A comparação por igual duração é um controle secundário, para quando os tamanhos diferentes dos períodos importam. As duas nunca se misturam num mesmo número.",
    "sensibilidade": {"passo_pesos": 5, "descricao": "Todas as combinações de pesos das cinco dimensões com critério definido, de 5 em 5 pontos, somando 100 (10.626 combinações)."},
    "nivel_evidencia": {
        "regra": "Dimensão de tipo B: informativa. Dimensão de tipo A: o menor nível de confiança entre as séries com direção definida (alta > média). O nível de cada série está em 'confianca' e resume fonte, consistência de medida e comparabilidade entre os períodos. Não é uma nota para o desempenho de nenhum governo.",
        "alta": "Série medida da mesma forma nos dois períodos, com fonte oficial e valor em unidade concreta.",
        "média": "Comparável, mas a medida tem uma limitação estrutural (por exemplo, índice de preço encadeado em vez de preço em R$).",
        "informativa": "Descrita, sem direção definida: não entra na síntese.",
    },
    "formulas": {
        "variacao_pct": "(valor no fim da janela / valor no início da janela - 1) x 100",
        "media": "média simples dos valores mensais (ou anuais, no PIB) da janela; em séries de trimestre móvel, dos trimestres móveis inteiros da janela",
        "regra_da_metrica": "Taxas (IPCA, desocupação, subutilização): média da janela, que mede a pressão ao longo do período e não a trajetória entre dois pontos. Valores em R$ ou índices (salário mínimo real, rendimento médio real, preços reais): variação percentual do início ao fim da janela. A regra foi fixada antes de calcular a dimensão Mercado de trabalho e vale para todas as séries.",
        "trimestre_movel": "A PNAD Contínua divulga um resultado por mês, média dos três meses que terminam nele. Cada ponto é identificado pelo mês em que termina. Só entram trimestres inteiros dentro de um mandato: os que misturam meses dos dois períodos (terminados em jan e fev de 2019 e de 2023) ficam de fora e nada é rateado.",
        "por_serie": "Dimensão com séries de unidades diferentes (Mercado de trabalho): cada série é comparada na sua métrica e na sua tolerância e vota +1 (período Lula), -1 (período Bolsonaro) ou 0 (praticamente iguais); a dimensão segue o sinal da soma dos votos. Uma dimensão continua valendo um único sentido na síntese, qualquer que seja o número de séries. Também se informa o que aconteceria com a métrica alternativa (variação do início ao fim para as taxas; média da janela para o rendimento), só como transparência.",
        "nivel": "descrição: início, fim, média, mínimo e máximo da janela, em % ao ano; variação em pontos percentuais",
        "salario_minimo_real": "salário mínimo do mês / índice IPCA do mesmo mês (valores constantes)",
        "favoravel": "f = valor da métrica x (+1 se a direção preferida é 'maior', -1 se é 'menor'). f > 0 = movimento na direção definida como favorável.",
        "leitura_dimensao": "Compara a MEDIANA de f entre os períodos. Diferença menor que a tolerância = praticamente iguais. O texto descreve o valor bruto (por exemplo, 'foi menor no período Lula'), com o critério da dimensão ao lado.",
        "sem_uma_serie": "Para dimensões com 3 ou mais séries: refaz a leitura tirando uma série por vez e conta em quantas remoções a leitura não muda.",
        "grade_de_pesos": "Refaz a síntese para todas as combinações de pesos (de 5 em 5 pontos, somando 100) e informa em que fração delas a síntese aponta para cada lado.",
        "sintese": "Soma ponderada do sentido de cada dimensão (+1 Lula, -1 Bolsonaro, 0 sem diferença). Usa o sentido, não a magnitude.",
    },
    "tolerancia": {"variacao_pct": 1.0, "media": 0.1},
    "exclusoes": [],
    "fora_do_escopo": ["Contas públicas e dívida", "Investimento", "Desigualdade de renda", "Informalidade e qualidade do emprego"],
    "fora_do_escopo_nota": "Esta análise cobre as dimensões abaixo porque são as séries atualmente disponíveis no projeto (o mercado de trabalho entra pelas três séries oficiais da PNAD Contínua listadas). O que não está aqui fica de fora por falta de série no projeto, não por escolha de resultado, e a análise não avalia \"tudo\" sobre um governo.",
    "contexto_historico": {
        "papel": "Contexto histórico: mostra o que estava acontecendo no período em que um indicador se moveu. Não entra em nenhum cálculo desta análise e não atribui causa.",
        "arquivo": "data/processed/noticias.json (itens com marco: true), gerado por scripts/build_news.py a partir da curadoria em data/news/raw_*.json",
        "o_que_entra": "Marcos com efeito econômico amplo e documentado que se sobrepõem a movimentos visíveis nas séries do projeto: choques externos, decisões de política monetária, fiscal e tributária, mudanças regulatórias, e publicações oficiais de dados. Não se busca uma notícia por mês.",
        "fontes": "Fontes oficiais (IBGE, Banco Central, ANP, legislação, governo federal), Agência Brasil e veículos jornalísticos reconhecidos. Blogs, páginas de SEO, redes sociais e agregadores sem fonte não são usados. Cada item é aberto na fonte original: título e data são conferidos com a página.",
        "datas": "A data é a de publicação da matéria na fonte (ou a do ato oficial, quando a fonte é um ato). Conferida na página; diferença de um dia por fuso horário é resolvida a favor da data exibida na matéria.",
        "ligacao_com_indicadores": "Cada item traz os indicadores e a dimensão a que se relaciona. A ligação é de época: o evento ocorreu no período em que o indicador se moveu.",
        "causalidade": "Proximidade no tempo não é evidência de causalidade. O texto do site diz \"contexto do período\", \"evento próximo no tempo\" ou \"coincide com o período\", nunca \"causou\", \"provocou\" ou \"foi responsável por\". Afirmações contestadas são atribuídas à fonte.",
        "resumos": "Resumos curtos, escritos pelo projeto, com o link para a fonte original. Nenhum trecho longo é copiado.",
    },
}


def escrever_metodologia() -> dict:
    met = {
        "versao": METODOLOGIA_VERSAO, "data": METODOLOGIA_DATA,
        "dimensoes": DIMENSOES, "indicadores": INDICADORES, "cenarios": CENARIOS, "cenario_padrao": "iguais",
        "regras": REGRAS,
        "tipos": {"A": "Direção interpretável definida antes do cálculo.",
                  "B": "Depende do contexto: descrito, nunca pontuado.",
                  "C": "Informativo: não entra em nenhuma leitura de direção."},
    }
    (DATA_PROCESSED / "analysis_methodology.json").write_text(json.dumps(met, ensure_ascii=False, indent=2), encoding="utf-8")
    return met


# ------------------------------------------------------------------ 2. cálculo
def _k(iso: str, periodo: str, anual: bool) -> int:
    a, m = int(iso[:4]), int(iso[5:7])
    a0, m0 = INICIO[periodo]
    return (a - a0 + 1) if anual else (a - a0) * 12 + (m - m0) + 1


def _valor(row: dict, campo: str):
    if campo == "salario_minimo_real":
        sm, ip = row.get("salario_minimo"), row.get("ipca_indice")
        return sm / ip * 1000 if sm is not None and ip else None
    return row.get(campo)


def _serie(prod: dict, ind: dict, periodo: str) -> dict:
    """{k: (iso, valor)} de um período, só meses/anos com valor."""
    out = {}
    for r in prod.get("serie_mensal", []):
        if r.get("periodo") != periodo:
            continue
        v = _valor(r, ind["campo"])
        if v is None:
            continue
        out[_k(r["ano_mes"], periodo, ind.get("anual", False))] = (r["ano_mes"], float(v))
    return out


def _stats(pontos: list, ind: dict, diario_pontas=None) -> dict:
    if not pontos:
        return None
    vals = [v for _, v in pontos]
    ini_iso, ini = pontos[0]
    fim_iso, fim = pontos[-1]
    if diario_pontas:
        (ini_iso, ini), (fim_iso, fim) = diario_pontas
    s = {"inicio": ini_iso, "fim": fim_iso, "n": len(pontos), "valor_inicio": round(ini, 4), "valor_fim": round(fim, 4),
         "media": round(statistics.fmean(vals), 4), "min": round(min(vals), 4), "max": round(max(vals), 4), "diario_nas_pontas": bool(diario_pontas)}
    if ind["metrica"] == "media":
        s["valor"] = round(s["media"], 2)
    elif ind["metrica"] == "nivel":
        s["valor"] = round(fim - ini, 2)  # p.p.
        s["variacao_pp"] = s["valor"]
    else:
        s["valor"] = round((fim / ini - 1) * 100, 2) if ini else None
    if ind.get("anual"):
        acum = 1.0
        for v in vals:
            acum *= 1 + v / 100
        s["crescimento_acumulado_pct"] = round((acum - 1) * 100, 2)
    sinal = {"maior": 1, "menor": -1}.get(ind.get("direcao"))
    s["f"] = round(s["valor"] * sinal, 2) if sinal and s.get("valor") is not None else None
    return s


def _pontas_diarias(prod: dict, periodo: str):
    d = prod.get("diario") or {}
    a, b = ("inicio", "troca") if periodo == "Bolsonaro" else ("inicio_lula", "ultimo")
    if d.get(a) and d.get(b):
        return (d[a]["data"], float(d[a]["valor"])), (d[b]["data"], float(d[b]["valor"]))
    return None


def _indicador(ind: dict, produtos: dict, blocos: dict | None = None) -> dict:
    prod = (blocos or {}).get(ind.get("bloco"), {}).get(ind["id"]) if ind.get("bloco") else produtos.get(ind.get("origem", ind["id"]))
    base = {"id": ind["id"], "nome": ind["nome"], "dimensao": ind["dimensao"], "tipo": ind["tipo"]}
    if not prod:
        return {**base, "excluido": True, "motivo": "série ausente nesta geração dos dados"}
    sb, sl = _serie(prod, ind, "Bolsonaro"), _serie(prod, ind, "Lula")
    if not sb or not sl:
        return {**base, "excluido": True, "motivo": "sem dados nos dois períodos"}
    comuns = sorted(set(sb) & set(sl))
    res = {**base, "excluido": False, "k_bolsonaro": [min(sb), max(sb)], "k_lula": [min(sl), max(sl)], "k_comum": [comuns[0], comuns[-1]] if comuns else None}
    res["mesmo_tempo"] = {
        "Bolsonaro": _stats([sb[k] for k in comuns], ind),
        "Lula": _stats([sl[k] for k in comuns], ind),
    } if comuns else None
    res["completo"] = {
        p: _stats([s[k] for k in sorted(s)], ind, _pontas_diarias(prod, p) if ind.get("diario") else None)
        for p, s in (("Bolsonaro", sb), ("Lula", sl))
    }
    # séries para o gráfico (apresentação): valor por mês/ano, sem nada preenchido
    # (séries de trimestre móvel mostram também os trimestres que misturam os dois períodos: são dados
    # oficiais, só não entram na comparação)
    res["serie"] = [{"iso": r["ano_mes"], "v": _valor(r, ind["campo"])} for r in prod.get("serie_mensal", [])
                    if (ind.get("trimestre_movel") or r.get("periodo") in ("Bolsonaro", "Lula")) and _valor(r, ind["campo"]) is not None]
    if ind.get("trimestre_movel"):
        res["fonte_ultima"] = {"periodo_codigo": prod["meta"]["ultima_observacao"], "rotulo": prod["meta"]["ultima_observacao_rotulo"],
                               "valor": prod["meta"]["ultimo_valor"], "tabela": prod["meta"]["tabela_sidra"], "variavel": prod["meta"]["variavel_sidra"]}
    if ind["dimensao"] == "custo_vida" and ind["id"] in ("GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"):
        ctx = {}
        for p in ("Bolsonaro", "Lula"):
            r = (prod.get("resumo_periodos", {}).get(p) or {}).get("governo_inteiro") or {}
            ctx[p] = {"cambio_variacao_pct": r.get("cambio_variacao_pct"), "brent_usd_variacao_pct": r.get("brent_usd_variacao_pct")}
        res["contexto_completo"] = ctx
    return res


NIVEL_ORDEM = {"alta": 2, "média": 1}
PERIODOS = ("Bolsonaro", "Lula")
NOME_P = {1: "Lula", -1: "Bolsonaro"}


def _medianas_f(direcionais: list, modo: str, excluir: str | None = None) -> dict:
    out = {}
    for p in PERIODOS:
        fs = [i[modo][p]["f"] for i in direcionais if i["id"] != excluir and i[modo][p] and i[modo][p]["f"] is not None]
        out[p] = statistics.median(fs) if fs else None
    return out


def _leitura(m: dict, tol: float) -> int:
    mb, ml = m["Bolsonaro"], m["Lula"]
    return 0 if mb is None or ml is None or abs(ml - mb) < tol else (1 if ml > mb else -1)


def _nivel_evidencia(dim: dict, met: dict):
    if dim["tipo"] != "A":
        return "informativa", {}
    inds = [i for i in met["indicadores"] if i["dimensao"] == dim["id"] and i["tipo"] == "A"]
    cont: dict = {}
    for i in inds:
        cont[i["confianca"]] = cont.get(i["confianca"], 0) + 1
    return min((i["confianca"] for i in inds), key=lambda c: NIVEL_ORDEM[c]), cont


def _voto(bolsonaro: float, lula: float, tol: float) -> int:
    return _leitura({"Bolsonaro": bolsonaro, "Lula": lula}, tol)


def _sinal(v: float) -> int:
    return (v > 0) - (v < 0)


def _dimensao_por_serie(out: dict, direcionais: list, met: dict, modo: str) -> dict:
    """Dimensão de séries com unidades diferentes: cada série vota na sua métrica e tolerância."""
    imeta = {m["id"]: m for m in met["indicadores"]}
    tol = met["regras"]["tolerancia"]
    linhas = []
    for i in direcionais:
        m = imeta[i["id"]]
        sb, sl = i[modo]["Bolsonaro"], i[modo]["Lula"]
        t = tol.get(m["metrica"], 1.0)
        voto = _voto(sb["f"], sl["f"], t)
        # métrica alternativa, só como transparência (não entra na leitura da dimensão)
        if m["metrica"] == "media":
            alt_b, alt_l = round(sb["valor_fim"] - sb["valor_inicio"], 2), round(sl["valor_fim"] - sl["valor_inicio"], 2)
            sinal = {"maior": 1, "menor": -1}[m["direcao"]]
            alt = {"metrica": "variação do início ao fim da janela (p.p.)", "Bolsonaro": alt_b, "Lula": alt_l,
                   "leitura": _voto(alt_b * sinal, alt_l * sinal, tol.get("variacao_pct", 1.0))}
        else:
            sinal = {"maior": 1, "menor": -1}[m["direcao"]]
            dif = round((sl["media"] / sb["media"] - 1) * 100, 2)  # diferença relativa das médias
            alt = {"metrica": "média da janela (diferença relativa entre os períodos, %)", "Bolsonaro": round(sb["media"], 2), "Lula": round(sl["media"], 2),
                   "diferenca_relativa_pct": dif, "leitura": _voto(0, dif * sinal, tol.get("variacao_pct", 1.0))}
        linhas.append({"id": i["id"], "nome": m["nome"], "metrica": m["metrica"], "unidade": m["unidade"], "tolerancia": t,
                       "Bolsonaro": sb["valor"], "Lula": sl["valor"], "valor_inicio": {"Bolsonaro": sb["valor_inicio"], "Lula": sl["valor_inicio"]},
                       "valor_fim": {"Bolsonaro": sb["valor_fim"], "Lula": sl["valor_fim"]},
                       "inicio": {"Bolsonaro": sb["inicio"], "Lula": sl["inicio"]}, "fim": {"Bolsonaro": sb["fim"], "Lula": sl["fim"]},
                       "leitura": voto, "alternativa": alt})
    votos = [l["leitura"] for l in linhas]
    leitura = _sinal(sum(votos))
    sem_uma = None
    if len(linhas) >= 3:
        casos = [{"removido": l["id"], "leitura": _sinal(sum(x["leitura"] for x in linhas if x is not l))} for l in linhas]
        sem_uma = {"n": len(casos), "iguais": sum(1 for c in casos if c["leitura"] == leitura), "casos": casos}
    out.update({"grupos": None, "por_periodo": None, "por_serie": linhas, "leitura": leitura, "tolerancia": None, "metrica": "misto",
                "votos": {"lula": votos.count(1), "bolsonaro": votos.count(-1), "iguais": votos.count(0)},
                "leitura_alternativa": _sinal(sum(l["alternativa"]["leitura"] for l in linhas)),
                "maior_favoravel": None, "maior_desfavoravel": None, "maior_divergencia": None, "outliers": [], "sem_uma_serie": sem_uma})
    return out


def _dimensao(dim: dict, inds: list, met: dict, modo: str) -> dict:
    ativos = [i for i in inds if not i.get("excluido") and i.get(modo)]
    tol_por_ind = met["regras"]["tolerancia"]
    nivel, cont = _nivel_evidencia(dim, met)
    out = {"id": dim["id"], "n_series": len(ativos), "modo": modo, "nivel_evidencia": nivel, "evidencia_contagem": cont}
    if dim["tipo"] != "A":
        maior = max(ativos, key=lambda i: abs((i[modo]["Lula"] or {}).get("valor") or 0) + abs((i[modo]["Bolsonaro"] or {}).get("valor") or 0), default=None)
        out.update({"leitura": None, "maior_variacao": maior["id"] if maior else None})
        return out
    direcionais = [i for i in ativos if i["tipo"] == "A"]
    if dim.get("agregacao") == "por_serie":
        return _dimensao_por_serie(out, direcionais, met, modo)
    por = {}
    for p in PERIODOS:
        fs = [i[modo][p]["f"] for i in direcionais if i[modo][p] and i[modo][p]["f"] is not None]
        vs = [i[modo][p]["valor"] for i in direcionais if i[modo][p] and i[modo][p].get("valor") is not None]
        por[p] = {"n": len(fs), "mediana_f": round(statistics.median(fs), 2) if fs else None,
                  "mediana_valor": round(statistics.median(vs), 2) if vs else None,
                  "media_valor": round(statistics.fmean(vs), 2) if vs else None,
                  "min_valor": round(min(vs), 2) if vs else None, "max_valor": round(max(vs), 2) if vs else None,
                  "n_favoravel": sum(1 for f in fs if f > 0), "n_desfavoravel": sum(1 for f in fs if f < 0)}
    metrica = direcionais[0]["_metrica"] if direcionais else "variacao_pct"
    tol = tol_por_ind.get(metrica, 1.0)
    leitura = _leitura({p: por[p]["mediana_f"] for p in PERIODOS}, tol)
    todos = [(i, p, i[modo][p]["f"]) for i in direcionais for p in PERIODOS if i[modo][p] and i[modo][p]["f"] is not None]
    fav = max(todos, key=lambda x: x[2], default=None)
    desf = min(todos, key=lambda x: x[2], default=None)
    div = max(direcionais, key=lambda i: abs((i[modo]["Lula"]["f"] or 0) - (i[modo]["Bolsonaro"]["f"] or 0)), default=None)
    outliers = []
    if len(direcionais) >= 5:
        for p in PERIODOS:
            fs = [(i, i[modo][p]["f"]) for i in direcionais if i[modo][p]["f"] is not None]
            med = statistics.median([f for _, f in fs])
            mad = statistics.median([abs(f - med) for _, f in fs]) or 1e-9
            for i, f in fs:
                if abs(f - med) > 2.5 * mad:
                    outliers.append({"id": i["id"], "periodo": p, "f": f, "mediana_f": round(med, 2)})
    sem_uma = None
    if len(direcionais) >= 3:
        casos = [{"removido": i["id"], "leitura": _leitura(_medianas_f(direcionais, modo, i["id"]), tol)} for i in direcionais]
        sem_uma = {"n": len(casos), "iguais": sum(1 for c in casos if c["leitura"] == leitura), "casos": casos}
    grupos = None
    if dim["id"] == "custo_vida":  # combustíveis (R$) e alimentos (índice) não são a mesma medida: medianas separadas
        grupos = {}
        for nome, filtro in (("combustiveis", lambda i: i["id"] not in INDICES_ALIMENTO), ("alimentos", lambda i: i["id"] in INDICES_ALIMENTO)):
            sub = [i for i in direcionais if filtro(i)]
            grupos[nome] = {"n": len(sub), **{p: round(statistics.median([i[modo][p]["valor"] for i in sub]), 2) for p in PERIODOS}}
    out.update({"grupos": grupos, "por_periodo": por, "leitura": leitura, "tolerancia": tol, "metrica": metrica,
                "maior_favoravel": {"id": fav[0]["id"], "periodo": fav[1], "f": fav[2]} if fav else None,
                "maior_desfavoravel": {"id": desf[0]["id"], "periodo": desf[1], "f": desf[2]} if desf else None,
                "maior_divergencia": div["id"] if div else None, "outliers": outliers, "sem_uma_serie": sem_uma})
    return out


def _sintese(dims: list, cenarios: list) -> list:
    leituras = {d["id"]: d["leitura"] for d in dims if d.get("leitura") is not None}
    res = []
    for c in cenarios:
        total = sum(c["pesos"].get(k, 0) for k in leituras)
        soma = sum(c["pesos"].get(k, 0) * v for k, v in leituras.items())
        res.append({"id": c["id"], "soma": soma, "total_pesos": total, "sentido": 0 if soma == 0 else (1 if soma > 0 else -1),
                    "contribuicoes": {k: {"peso": c["pesos"].get(k, 0), "leitura": v} for k, v in leituras.items()}})
    return res


def _composicoes(n: int, k: int):
    """Todas as k-uplas de inteiros não negativos que somam n."""
    if k == 1:
        yield (n,)
        return
    for a in range(n + 1):
        for resto in _composicoes(n - a, k - 1):
            yield (a, *resto)


def _grade(dims: list, met: dict) -> dict:
    ids = [d["id"] for d in met["dimensoes"] if d["tipo"] == "A"]
    leit = {d["id"]: d["leitura"] for d in dims if d.get("leitura") is not None}
    passo = met["regras"]["sensibilidade"]["passo_pesos"]
    cont = {1: 0, -1: 0, 0: 0}
    total = 0
    for w in _composicoes(100 // passo, len(ids)):
        soma = sum(x * leit[k] for x, k in zip(w, ids))
        cont[_sinal(soma)] += 1
        total += 1
    return {"combinacoes": total, "lula": cont[1], "bolsonaro": cont[-1], "empate": cont[0], "passo": passo,
            "mesmo_lado": not (cont[1] > 0 and cont[-1] > 0)}


def _maiores_movimentos(inds: list, modo: str) -> dict:
    """Só séries com a mesma unidade de leitura (variação % real): custo de vida e poder de compra."""
    cands = []
    for i in inds:
        if i.get("excluido") or i["tipo"] != "A" or i.get("_metrica") != "variacao_pct" or not i.get(modo):
            continue
        for p in PERIODOS:
            s_ = i[modo][p]
            if s_ and s_.get("valor") is not None:
                cands.append({"id": i["id"], "nome": i["nome"], "periodo": p, "valor": s_["valor"], "indice": i["dimensao"] == "custo_vida" and i["id"] in INDICES_ALIMENTO})
    if not cands:
        return {}
    por_serie = {}
    for c in cands:
        por_serie.setdefault(c["id"], {})[c["periodo"]] = c
    dif = max((v for v in por_serie.values() if len(v) == 2), key=lambda v: abs(v["Lula"]["valor"] - v["Bolsonaro"]["valor"]), default=None)
    return {"alta": max(cands, key=lambda c: c["valor"]), "queda": min(cands, key=lambda c: c["valor"]),
            "top_alta": sorted(cands, key=lambda c: -c["valor"])[:3], "top_queda": sorted(cands, key=lambda c: c["valor"])[:3],
            "diferenca": {"id": dif["Lula"]["id"], "nome": dif["Lula"]["nome"], "indice": dif["Lula"]["indice"],
                          "bolsonaro": dif["Bolsonaro"]["valor"], "lula": dif["Lula"]["valor"]} if dif else None}


INDICES_ALIMENTO = {"Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído"}


def _fmt(v, d=1):
    s = f"{abs(v):.{d}f}".replace(".", ",")
    return ("+" if v > 0 else "−" if v < 0 else "") + s


def _v(v, metrica, d=1):
    return f"{_fmt(v, d)}%" if metrica == "variacao_pct" else f"{abs(v):.{d}f}".replace(".", ",") + "%"


def _txt_leitura(l: int) -> str:
    return "a dimensão aponta para o período Lula" if l == 1 else "a dimensão aponta para o período Bolsonaro" if l == -1 else "os dois períodos ficam praticamente iguais"


def _texto_por_serie(d: dict) -> str:
    partes = []
    for l in d["por_serie"]:
        if l["metrica"] == "media":
            b, lu = f"{_fmt(l['Bolsonaro'], 1)}%".replace("−", "").replace("+", ""), f"{_fmt(l['Lula'], 1)}%".replace("−", "").replace("+", "")
            partes.append(f"{l['nome']}: média de {b} no período Bolsonaro e {lu} no período Lula ({_txt_curta(l['leitura'])})")
        else:
            partes.append(f"{l['nome']}: variação de {_v(l['Bolsonaro'], 'variacao_pct')} no período Bolsonaro e {_v(l['Lula'], 'variacao_pct')} no período Lula ({_txt_curta(l['leitura'])})")
    v = d["votos"]
    conta = f"Cada série vota uma vez: {v['lula']} pelo período Lula, {v['bolsonaro']} pelo período Bolsonaro e {v['iguais']} praticamente iguais."
    return "; ".join(partes) + f". {conta} Somando os votos, {_txt_leitura(d['leitura'])}."


def _txt_curta(l: int) -> str:
    return "aponta para o período Lula" if l == 1 else "aponta para o período Bolsonaro" if l == -1 else "praticamente iguais"


def _textos(dims_res: list, inds: list, met: dict, modo: str, sint: list, grade: dict) -> dict:
    """Frases geradas a partir dos números (modelos de frase auditáveis; nenhuma conclusão digitada à mão).
    Descrevem o valor bruto e o critério da dimensão, sem 'favorável'/'melhor'."""
    dmeta = {d["id"]: d for d in met["dimensoes"]}
    linhas = {}
    for d in dims_res:
        dm = dmeta[d["id"]]
        if dm["tipo"] != "A":
            partes = []
            for i in [x for x in inds if x["dimensao"] == d["id"] and not x.get("excluido") and x.get(modo)]:
                b, l = i[modo]["Bolsonaro"], i[modo]["Lula"]
                un = " p.p." if i.get("_metrica") == "nivel" else "%"
                nd = 2 if un == " p.p." else 1
                partes.append(f"{i['nome']}: {_fmt(b['valor'], nd)}{un} no período Bolsonaro e {_fmt(l['valor'], nd)}{un} no período Lula")
            linhas[d["id"]] = "; ".join(partes) + ". Sem direção definida."
            continue
        if d.get("por_serie"):
            linhas[d["id"]] = _texto_por_serie(d)
            continue
        crit = dm["criterio"]
        pb, pl = d["por_periodo"]["Bolsonaro"], d["por_periodo"]["Lula"]
        vb, vl, m = pb["mediana_valor"], pl["mediana_valor"], d["metrica"]
        if d["leitura"] == 0:
            frase = (f"Neste critério ({crit['metrica']}), os dois períodos ficaram praticamente iguais: {_v(vb, m)} no período Bolsonaro "
                     f"e {_v(vl, m)} no período Lula (diferença abaixo da tolerância de {str(d['tolerancia']).replace('.', ',')} ponto).")
        else:
            P, O = ("Lula", "Bolsonaro") if d["leitura"] == 1 else ("Bolsonaro", "Lula")
            vP, vO = (vl, vb) if d["leitura"] == 1 else (vb, vl)
            frase = (f"Neste critério ({crit['metrica']}; {crit['explica']}), o valor foi {crit['sentido']} no período {P} "
                     f"({_v(vP, m)}) do que no período {O} ({_v(vO, m)}).")
        linhas[d["id"]] = frase
    n_dir = len([d for d in dims_res if d.get("leitura") is not None])
    cont = {k: sum(1 for d in dims_res if d.get("leitura") == k) for k in (1, -1, 0)}
    nome_modo = met["regras"]["modos_nomes"][modo]
    ap = lambda n: "aponta" if n == 1 else "apontam"
    ig = "fica praticamente igual" if cont[0] == 1 else "ficam praticamente iguais"
    geral = (f"Nas {n_dir} dimensões com critério definido, {cont[1]} {ap(cont[1])} para o período Lula, {cont[-1]} para o período Bolsonaro "
             f"e {cont[0]} {ig} (janela: {nome_modo.lower()}).")
    t = grade["combinacoes"]
    fmt_n = lambda n: f"{n:,}".replace(",", ".")
    # 99,96% não pode aparecer como "100,0%" quando sobra pelo menos uma combinação fora do lado
    pct_ = lambda n: ("mais de 99,9%" if n < t and 100 * n / t >= 99.95 else f"{100 * n / t:.1f}".replace(".", ",") + "%")
    if grade["lula"] > 0 and grade["bolsonaro"] > 0:
        rob = (f"A síntese depende dos pesos: aponta para o período Lula em {pct_(grade['lula'])} das {fmt_n(t)} combinações testadas, "
               f"para o período Bolsonaro em {pct_(grade['bolsonaro'])} e fica empatada em {pct_(grade['empate'])}. "
               "O lado da conclusão depende do peso que cada leitor dá a cada dimensão.")
    elif grade["lula"] == 0 and grade["bolsonaro"] == 0:
        rob = f"Nas {fmt_n(t)} combinações de pesos testadas a síntese fica empatada."
    else:
        lado = "Lula" if grade["lula"] > 0 else "Bolsonaro"
        oposto = "Bolsonaro" if lado == "Lula" else "Lula"
        n_lado = grade["lula"] if lado == "Lula" else grade["bolsonaro"]
        emp = (f" e fica empatada em {fmt_n(grade['empate'])} (quando todo o peso cai em dimensões que ficam praticamente iguais)"
               if grade["empate"] else "")
        rob = (f"Nenhuma das {fmt_n(t)} combinações de pesos testadas leva a síntese ao período {oposto}: ela aponta para o período {lado} em "
               f"{fmt_n(n_lado)} ({pct_(n_lado)}){emp}. Isso ocorre porque nenhuma dimensão aponta para o período {oposto}; "
               "os pesos mudam o tamanho da diferença, não o lado.")
    return {"por_dimensao": linhas, "geral": geral, "robustez": rob}


def _bloco_pib(pib: dict) -> dict:
    anos = [{"ano": r["ano"], "taxa": r["taxa_aa"], "periodo": r["periodo"]} for r in pib.get("serie_mensal", [])
            if r["ano"] >= 2019 and r.get("taxa_aa") is not None]
    ult_fechado = max((a["ano"] for a in anos), default=None)
    tri = [{"trimestre": q["trimestre"], "interanual": q.get("variacao_interanual"), "dessazonalizada": q.get("variacao_dessazonalizada"),
            "acumulado_4tri": q.get("acumulado_4tri")} for q in pib.get("serie_trimestral", [])
           if ult_fechado is not None and int(q["trimestre"][:4]) > ult_fechado]
    return {"anos": anos, "ultimo_ano_fechado": ult_fechado, "trimestres_sem_resultado_anual": tri, "ultimo_trimestre": pib.get("ultimo_trimestre")}


def calcular_resultados() -> dict:
    caminho_met = DATA_PROCESSED / "analysis_methodology.json"
    texto_met = caminho_met.read_text(encoding="utf-8")
    met = json.loads(texto_met)  # lê do disco: o cálculo segue a versão gravada
    d = json.loads((DATA_PROCESSED / "dashboard_data.json").read_text(encoding="utf-8"))
    produtos = d["produtos"]
    blocos = {"mercado_trabalho": (d.get("mercado_trabalho") or {}).get("produtos", {})}
    inds = []
    for ind in met["indicadores"]:
        r = _indicador(ind, produtos, blocos)
        r["_metrica"] = ind["metrica"]
        inds.append(r)
    saida = {"gerado_em": datetime.now(timezone.utc).isoformat(timespec="minutes"), "dados_gerados_em": d.get("gerado_em"),
             "metodologia_versao": met["versao"], "metodologia_sha256": hashlib.sha256(texto_met.encode("utf-8")).hexdigest(),
             "indicadores": inds, "modos": {}}
    mensais = [i for i in inds if not i.get("excluido") and i.get("k_comum") and not next(x for x in met["indicadores"] if x["id"] == i["id"]).get("anual")]
    kmax = max((i["k_comum"][1] for i in mensais), default=None)
    saida["duracao"] = {"mesmo_tempo_meses": kmax,
                        "lula_meses_disponiveis": max((i["k_lula"][1] for i in mensais), default=None),
                        "bolsonaro_meses": max((i["k_bolsonaro"][1] for i in mensais), default=None)}
    mt = d.get("mercado_trabalho")
    if mt:
        saida["mercado_trabalho"] = {"coletado_em": mt["coletado_em"], "nota": mt["nota"],
                                      "series": {k: {c: v["meta"][c] for c in ("nome_oficial", "tabela_sidra", "variavel_sidra", "unidade", "frequencia", "escopo_geografico", "populacao",
                                                     "ultima_observacao", "ultima_observacao_rotulo", "ultimo_valor", "url_tabela", "url_api")}
                                                  for k, v in mt["produtos"].items()}}
    pib = produtos.get("PIB", {})
    saida["pib_ultimo_trimestre"] = pib.get("ultimo_trimestre")
    saida["pib"] = _bloco_pib(pib)
    for modo in ("completo", "mesmo_tempo"):
        dims_res = [_dimensao(dim, [i for i in inds if i["dimensao"] == dim["id"]], met, modo) for dim in met["dimensoes"]]
        sint = _sintese(dims_res, met["cenarios"])
        grade = _grade(dims_res, met)
        saida["modos"][modo] = {"dimensoes": dims_res, "sintese": sint, "grade": grade, "maiores_movimentos": _maiores_movimentos(inds, modo),
                                "textos": _textos(dims_res, inds, met, modo, sint, grade)}
    # o que muda de leitura quando se troca a janela
    dm = {x["id"]: x for x in met["dimensoes"]}
    muda = []
    for a, b in zip(saida["modos"]["completo"]["dimensoes"], saida["modos"]["mesmo_tempo"]["dimensoes"]):
        if a.get("leitura") is not None and a["leitura"] != b["leitura"]:
            muda.append({"id": a["id"], "completo": a["leitura"], "mesmo_tempo": b["leitura"]})
    if muda:
        partes = [f"{dm[m['id']]['titulo']}: no período completo disponível, {_txt_leitura(m['completo'])}; na comparação por igual duração, {_txt_leitura(m['mesmo_tempo'])}" for m in muda]
        texto = ("A janela escolhida muda a leitura de uma dimensão. " if len(muda) == 1 else f"A janela escolhida muda a leitura de {len(muda)} dimensões. ") + ". ".join(partes) + (". Nas demais dimensões a leitura é a mesma nas duas janelas." if len(muda) == 1 else ". Nas demais dimensões a leitura é a mesma nas duas janelas.")
    else:
        texto = "A leitura de todas as dimensões com critério definido é a mesma nas duas janelas."
    saida["janela_muda"] = {"dimensoes": muda, "texto": texto}
    (DATA_PROCESSED / "analysis_results.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    return saida


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    if not (DATA_PROCESSED / "dashboard_data.json").exists():
        logger.error("dashboard_data.json não existe — rode build_dashboard_data.py primeiro.")
        sys.exit(1)
    met = escrever_metodologia()
    res = calcular_resultados()
    n = len([i for i in res["indicadores"] if not i.get("excluido")])
    logger.info(f"Metodologia v{met['versao']} ({res['metodologia_sha256'][:12]}) · {n} indicadores · mesmo tempo: {res['duracao']['mesmo_tempo_meses']} meses")


if __name__ == "__main__":
    sys.exit(main())
