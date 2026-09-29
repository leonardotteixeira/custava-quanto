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
- "Mesmo tempo de governo": o mês k de cada mandato (Bolsonaro: jan/2019 + k-1;
  Lula: jan/2023 + k-1). Entram só os k em que os DOIS períodos têm dado.
- "Período completo disponível": todos os meses de cada período (Lula em curso).
- A síntese entre dimensões usa só o SENTIDO de cada dimensão (-1, 0, +1),
  nunca a magnitude: as dimensões têm unidades diferentes (%, p.p.) e somá-las
  seria misturar grandezas.
"""
from __future__ import annotations

import hashlib
import json
import statistics
import sys
from datetime import datetime, timezone

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("build_analise")

METODOLOGIA_VERSAO = "1.0"
METODOLOGIA_DATA = "2026-09-28"

INICIO = {"Bolsonaro": (2019, 1), "Lula": (2023, 1)}

# ------------------------------------------------------------------ 1. metodologia
# Perguntas definidas ANTES de olhar qualquer resultado.
DIMENSOES = [
    {"id": "custo_vida", "ordem": 1, "titulo": "Custo de vida", "tipo": "A",
     "pergunta": "Em qual período os preços analisados tiveram menor pressão real (descontada a inflação) sobre o consumidor?",
     "explicacao": "Combustíveis (preço médio em reais, ANP) e alimentos (índice de preço encadeado, IBGE). Usamos a variação REAL, porque a variação nominal sobe junto com a inflação em qualquer período."},
    {"id": "inflacao", "ordem": 2, "titulo": "Inflação", "tipo": "A",
     "pergunta": "Em qual período a inflação observada (IPCA em 12 meses) foi, em média, menor?",
     "explicacao": "A média da inflação acumulada em 12 meses ao longo da janela. Mede pressão inflacionária no período, não se a inflação subiu ou caiu entre o primeiro e o último mês."},
    {"id": "renda", "ordem": 3, "titulo": "Renda e poder de compra", "tipo": "A",
     "pergunta": "Em qual período o salário mínimo ganhou mais poder de compra nos indicadores disponíveis?",
     "explicacao": "O salário mínimo descontada a inflação (IPCA) e quantos litros de gasolina ele comprava. O valor nominal aparece só como informação: ele sobe em qualquer período com inflação."},
    {"id": "atividade", "ordem": 4, "titulo": "Atividade econômica", "tipo": "A",
     "pergunta": "Em qual período a atividade econômica medida pelo PIB apresentou maior crescimento?",
     "explicacao": "A média do crescimento real anual do PIB (IBGE). Só anos com resultado anual fechado: o ano em curso tem apenas trimestres e não entra na média."},
    {"id": "mercados", "ordem": 5, "titulo": "Mercados e condições financeiras", "tipo": "B",
     "pergunta": "Como os principais indicadores financeiros evoluíram em cada período?",
     "explicacao": "Dólar, Selic e Ibovespa são descritos, não pontuados: nenhum deles tem uma direção que seja boa ou ruim para todo mundo. Por isso esta dimensão não entra na síntese entre dimensões."},
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
    {"id": "iguais", "nome": "Pesos iguais (padrão)", "pesos": {"custo_vida": 25, "inflacao": 25, "renda": 25, "atividade": 25},
     "justificativa": "Nenhuma dimensão privilegiada."},
    {"id": "bolso", "nome": "Ênfase no custo de vida", "pesos": {"custo_vida": 40, "inflacao": 20, "renda": 20, "atividade": 20},
     "justificativa": "Para quem prioriza o que chega ao bolso no dia a dia."},
    {"id": "renda", "nome": "Ênfase em renda e inflação", "pesos": {"custo_vida": 20, "inflacao": 30, "renda": 30, "atividade": 20},
     "justificativa": "Para quem prioriza poder de compra e estabilidade de preços."},
    {"id": "macro", "nome": "Ênfase na atividade econômica", "pesos": {"custo_vida": 20, "inflacao": 20, "renda": 20, "atividade": 40},
     "justificativa": "Para quem prioriza o crescimento da economia."},
]

REGRAS = {
    "modos": {
        "mesmo_tempo": "Mês k de cada mandato (Bolsonaro: jan/2019 + k-1; Lula: jan/2023 + k-1). Entram só os k em que os dois períodos têm dado. PIB: ano k de cada mandato, só anos fechados.",
        "completo": "Todos os meses com dado de cada período: Bolsonaro jan/2019-dez/2022; Lula jan/2023-último dado (em curso). Dólar, Selic e Ibovespa usam o primeiro e o último dado diário nas pontas.",
    },
    "modo_principal": "mesmo_tempo",
    "formulas": {
        "variacao_pct": "(valor no fim da janela / valor no início da janela - 1) x 100",
        "media": "média simples dos valores mensais (ou anuais, no PIB) da janela",
        "nivel": "descrição: início, fim, média, mínimo e máximo da janela, em % ao ano; variação em pontos percentuais",
        "salario_minimo_real": "salário mínimo do mês / índice IPCA do mesmo mês (valores constantes)",
        "favoravel": "f = valor da métrica x (+1 se a direção preferida é 'maior', -1 se é 'menor'). f > 0 = movimento na direção definida como favorável.",
        "leitura_dimensao": "Compara a MEDIANA de f entre os períodos. Diferença menor que a tolerância = sem diferença relevante.",
        "sintese": "Soma ponderada do sentido de cada dimensão (+1 Lula, -1 Bolsonaro, 0 sem diferença). Usa o sentido, não a magnitude.",
    },
    "tolerancia": {"variacao_pct": 1.0, "media": 0.1},
    "exclusoes": [],
    "fora_do_escopo": ["Emprego e desemprego", "Contas públicas e dívida", "Investimento", "Desigualdade de renda"],
    "fora_do_escopo_nota": "Esta análise cobre estas dimensões porque são as séries atualmente disponíveis no projeto. Emprego, contas públicas e investimento ficam de fora por falta de série no projeto, não por escolha de resultado.",
}

CONTEXTO = [
    {"iso": "2020-03-01", "texto": "OMS declara pandemia de covid-19", "categoria": "Choque externo", "fonte": "Organização Mundial da Saúde, 11/03/2020",
     "relacao": "coincide no tempo com a queda do PIB de 2020 e a alta de alimentos"},
    {"iso": "2022-02-01", "texto": "Rússia invade a Ucrânia", "categoria": "Choque externo", "fonte": "Fato amplamente documentado, 24/02/2022",
     "relacao": "coincide no tempo com a alta internacional do petróleo e de grãos"},
    {"iso": "2022-06-01", "texto": "Lei Complementar 194 limita o ICMS sobre combustíveis", "categoria": "Alteração regulatória", "fonte": "Lei Complementar 194/2022",
     "relacao": "coincide no tempo com a queda do preço dos combustíveis no 2º semestre de 2022"},
    {"iso": "2023-03-01", "texto": "Volta parcial da cobrança de PIS/Cofins sobre a gasolina", "categoria": "Política econômica", "fonte": "Governo federal, reoneração dos combustíveis, 2023",
     "relacao": "coincide no tempo com a alta da gasolina no início de 2023"},
    {"iso": "2026-02-01", "texto": "EUA e Israel iniciam ofensiva contra o Irã (28/fev)", "categoria": "Contexto internacional", "fonte": "Cobertura internacional, fevereiro de 2026",
     "relacao": "coincide no tempo com a alta do petróleo e dos combustíveis em 2026"},
]


def escrever_metodologia() -> dict:
    met = {
        "versao": METODOLOGIA_VERSAO, "data": METODOLOGIA_DATA,
        "dimensoes": DIMENSOES, "indicadores": INDICADORES, "cenarios": CENARIOS, "cenario_padrao": "iguais",
        "regras": REGRAS, "contexto_externo": CONTEXTO,
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


def _indicador(ind: dict, produtos: dict) -> dict:
    prod = produtos.get(ind.get("origem", ind["id"]))
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
    res["serie"] = [{"iso": r["ano_mes"], "v": _valor(r, ind["campo"])} for r in prod.get("serie_mensal", [])
                    if r.get("periodo") in ("Bolsonaro", "Lula") and _valor(r, ind["campo"]) is not None]
    if ind["dimensao"] == "custo_vida" and ind["id"] in ("GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"):
        ctx = {}
        for p in ("Bolsonaro", "Lula"):
            r = (prod.get("resumo_periodos", {}).get(p) or {}).get("governo_inteiro") or {}
            ctx[p] = {"cambio_variacao_pct": r.get("cambio_variacao_pct"), "brent_usd_variacao_pct": r.get("brent_usd_variacao_pct")}
        res["contexto_completo"] = ctx
    return res


def _dimensao(dim: dict, inds: list, met: dict, modo: str) -> dict:
    ativos = [i for i in inds if not i.get("excluido") and i.get(modo)]
    tol_por_ind = met["regras"]["tolerancia"]
    out = {"id": dim["id"], "n_series": len(ativos), "modo": modo}
    if dim["tipo"] != "A":
        maior = max(ativos, key=lambda i: abs((i[modo]["Lula"] or {}).get("valor") or 0) + abs((i[modo]["Bolsonaro"] or {}).get("valor") or 0), default=None)
        out.update({"leitura": None, "maior_variacao": maior["id"] if maior else None})
        return out
    direcionais = [i for i in ativos if i["tipo"] == "A"]
    por = {}
    for p in ("Bolsonaro", "Lula"):
        fs = [i[modo][p]["f"] for i in direcionais if i[modo][p] and i[modo][p]["f"] is not None]
        vs = [i[modo][p]["valor"] for i in direcionais if i[modo][p] and i[modo][p].get("valor") is not None]
        por[p] = {"n": len(fs), "mediana_f": round(statistics.median(fs), 2) if fs else None,
                  "mediana_valor": round(statistics.median(vs), 2) if vs else None,
                  "media_valor": round(statistics.fmean(vs), 2) if vs else None,
                  "min_valor": round(min(vs), 2) if vs else None, "max_valor": round(max(vs), 2) if vs else None,
                  "n_favoravel": sum(1 for f in fs if f > 0), "n_desfavoravel": sum(1 for f in fs if f < 0)}
    metrica = direcionais[0]["_metrica"] if direcionais else "variacao_pct"
    tol = tol_por_ind.get(metrica, 1.0)
    mb, ml = por["Bolsonaro"]["mediana_f"], por["Lula"]["mediana_f"]
    leitura = 0 if mb is None or ml is None or abs(ml - mb) < tol else (1 if ml > mb else -1)
    # maiores movimentos (na direção definida pela metadata)
    todos = [(i, p, i[modo][p]["f"]) for i in direcionais for p in ("Bolsonaro", "Lula") if i[modo][p] and i[modo][p]["f"] is not None]
    fav = max(todos, key=lambda x: x[2], default=None)
    desf = min(todos, key=lambda x: x[2], default=None)
    div = max(direcionais, key=lambda i: abs((i[modo]["Lula"]["f"] or 0) - (i[modo]["Bolsonaro"]["f"] or 0)), default=None)
    # outliers: distância à mediana > 2,5 x MAD, só com 5+ séries
    outliers = []
    if len(direcionais) >= 5:
        for p in ("Bolsonaro", "Lula"):
            fs = [(i, i[modo][p]["f"]) for i in direcionais if i[modo][p]["f"] is not None]
            med = statistics.median([f for _, f in fs])
            mad = statistics.median([abs(f - med) for _, f in fs]) or 1e-9
            for i, f in fs:
                if abs(f - med) > 2.5 * mad:
                    outliers.append({"id": i["id"], "periodo": p, "f": f, "mediana_f": round(med, 2)})
    out.update({"por_periodo": por, "leitura": leitura, "tolerancia": tol, "metrica": metrica,
                "maior_favoravel": {"id": fav[0]["id"], "periodo": fav[1], "f": fav[2]} if fav else None,
                "maior_desfavoravel": {"id": desf[0]["id"], "periodo": desf[1], "f": desf[2]} if desf else None,
                "maior_divergencia": div["id"] if div else None, "outliers": outliers})
    return out


def _sintese(dims: list, cenarios: list) -> list:
    leituras = {d["id"]: d["leitura"] for d in dims if d.get("leitura") is not None}
    res = []
    for c in cenarios:
        soma = sum(c["pesos"].get(k, 0) * v for k, v in leituras.items())
        total = sum(c["pesos"].get(k, 0) for k in leituras)
        res.append({"id": c["id"], "soma": soma, "total_pesos": total,
                    "sentido": 0 if soma == 0 else (1 if soma > 0 else -1)})
    return res


NOME_P = {1: "Lula", -1: "Bolsonaro"}


def _fmt(v, d=1):
    s = f"{abs(v):.{d}f}".replace(".", ",")
    return ("+" if v > 0 else "−" if v < 0 else "") + s


def _textos(dims_res: list, inds: list, met: dict, modo: str, sint: list) -> dict:
    """Frases geradas a partir dos números (templates auditáveis, sem conclusão digitada à mão)."""
    idx = {i["id"]: i for i in inds}
    dmeta = {d["id"]: d for d in met["dimensoes"]}
    linhas = {}
    for d in dims_res:
        dm = dmeta[d["id"]]
        if dm["tipo"] != "A":
            partes = []
            for i in [x for x in inds if x["dimensao"] == d["id"] and not x.get("excluido") and x.get(modo)]:
                b, l = i[modo]["Bolsonaro"], i[modo]["Lula"]
                un = " p.p." if i.get("_metrica") == "nivel" else "%"
                partes.append(f"{i['nome']}: {_fmt(b['valor'], 2 if un == ' p.p.' else 1)}{un} no período Bolsonaro e {_fmt(l['valor'], 2 if un == ' p.p.' else 1)}{un} no período Lula")
            linhas[d["id"]] = "; ".join(partes) + ". Descrição, não avaliação: estes indicadores não têm uma direção boa ou ruim para todos."
            continue
        pb, pl = d["por_periodo"]["Bolsonaro"], d["por_periodo"]["Lula"]
        met_txt = {"custo_vida": "variação real mediana", "renda": "variação mediana do poder de compra",
                   "inflacao": "inflação média em 12 meses", "atividade": "crescimento médio anual do PIB"}.get(d["id"], "mediana")
        un = "%"
        base = f"{met_txt} de {_fmt(pb['mediana_valor'])}{un} no período Bolsonaro e {_fmt(pl['mediana_valor'])}{un} no período Lula"
        n_info = d["n_series"] - pb["n"]
        if pb["n"] > 1:
            base = f"{pb['n']} séries com direção definida{f' (e {n_info} informativa)' if n_info == 1 else f' (e {n_info} informativas)' if n_info > 1 else ''}; " + base
        if d["leitura"] == 0:
            leit = "sem diferença relevante pelo critério definido"
        else:
            leit = f"leitura mais favorável no período {NOME_P[d['leitura']]}, pelo critério definido"
        linhas[d["id"]] = f"{base} — {leit}."
    padrao = next(s for s in sint if s["id"] == met["cenario_padrao"])
    sentidos = {s["sentido"] for s in sint}
    n_dir = len([d for d in dims_res if d.get("leitura") is not None])
    cont = {1: sum(1 for d in dims_res if d.get("leitura") == 1), -1: sum(1 for d in dims_res if d.get("leitura") == -1), 0: sum(1 for d in dims_res if d.get("leitura") == 0)}
    if padrao["sentido"] == 0:
        geral = f"Com pesos iguais, as {n_dir} dimensões com direção interpretável se equilibram: não há um sentido predominante."
    else:
        geral = (f"Com pesos iguais, {cont[padrao['sentido']]} das {n_dir} dimensões com direção interpretável têm leitura mais favorável no período "
                 f"{NOME_P[padrao['sentido']]}, {cont[-padrao['sentido']]} no período {NOME_P[-padrao['sentido']]} e {cont[0]} sem diferença relevante.")
    if len(sentidos) == 1:
        rob = "O sentido da leitura agregada é o mesmo nos quatro cenários de peso testados."
    else:
        mudam = [c["nome"] for c, s in zip(met["cenarios"], sint) if s["sentido"] != padrao["sentido"]]
        rob = f"O sentido da leitura agregada MUDA conforme os pesos: difere do cenário padrão em {', '.join(mudam)}."
    return {"por_dimensao": linhas, "geral": geral, "robustez": rob}


def calcular_resultados() -> dict:
    caminho_met = DATA_PROCESSED / "analysis_methodology.json"
    texto_met = caminho_met.read_text(encoding="utf-8")
    met = json.loads(texto_met)  # lê do disco: o cálculo segue a versão gravada
    d = json.loads((DATA_PROCESSED / "dashboard_data.json").read_text(encoding="utf-8"))
    produtos = d["produtos"]
    inds = []
    for ind in met["indicadores"]:
        r = _indicador(ind, produtos)
        r["_metrica"] = ind["metrica"]
        inds.append(r)
    saida = {"gerado_em": datetime.now(timezone.utc).isoformat(timespec="minutes"), "dados_gerados_em": d.get("gerado_em"),
             "metodologia_versao": met["versao"], "metodologia_sha256": hashlib.sha256(texto_met.encode("utf-8")).hexdigest(),
             "indicadores": inds, "modos": {}}
    # duração comum (mês k) nos indicadores mensais, e anos no PIB
    mensais = [i for i in inds if not i.get("excluido") and i.get("k_comum") and not next(x for x in met["indicadores"] if x["id"] == i["id"]).get("anual")]
    kmax = max((i["k_comum"][1] for i in mensais), default=None)
    saida["duracao"] = {"mesmo_tempo_meses": kmax,
                        "lula_meses_disponiveis": max((i["k_lula"][1] for i in mensais), default=None),
                        "bolsonaro_meses": max((i["k_bolsonaro"][1] for i in mensais), default=None)}
    pib = produtos.get("PIB", {})
    saida["pib_ultimo_trimestre"] = pib.get("ultimo_trimestre")
    for modo in ("mesmo_tempo", "completo"):
        dims_res = [_dimensao(dim, [i for i in inds if i["dimensao"] == dim["id"]], met, modo) for dim in met["dimensoes"]]
        sint = _sintese(dims_res, met["cenarios"])
        saida["modos"][modo] = {"dimensoes": dims_res, "sintese": sint, "textos": _textos(dims_res, inds, met, modo, sint)}
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
