"""
Consolida combustiveis_final.csv + cesta_basica_final.csv + salario_minimo
em um único dashboard_data.json, pronto para o frontend consumir sem
precisar fazer nenhum cálculo (o Python continua sendo a única fonte de
verdade para os números).

Regra importante: combustíveis têm preço em R$ (podem ser expressos como
% do salário mínimo / unidades por salário mínimo). Itens da cesta básica
aqui são um ÍNDICE relativo (não há preço médio absoluto em R$ na fonte
IBGE/SIDRA para todo o período) — por isso esses dois grupos têm campos de
preço diferentes no JSON. Ambos os grupos têm salário mínimo: para
combustível vira "quantas unidades" (preço é R$); para alimento vira um
índice de poder de compra (não dá pra dizer "quantos kg", porque não há
preço absoluto) — nunca um valor em reais fingindo ser preço de alimento.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import pandas as pd

from common import DASHBOARD_DIR, DATA_PROCESSED, PERIODO_CORTE, ensure_dirs, get_logger

logger = get_logger("build_dashboard_data")

NOMES_COMBUSTIVEL = {
    "GASOLINA": ("Gasolina Comum", "R$/litro"),
    "ETANOL": ("Etanol Hidratado", "R$/litro"),
    "DIESEL": ("Diesel Comum (S500)", "R$/litro"),
    "DIESEL S10": ("Diesel S10", "R$/litro"),
    "GLP": ("GLP (botijão 13kg)", "R$/13kg"),
}

NOTA_ALIMENTO = (
    "O IBGE/SIDRA não publica preço médio nacional em R$ para este item ao "
    "longo de todo o período — só a variação mensal oficial do IPCA por "
    "subitem. Este número é um índice relativo (base 100 = jan/2019), "
    "encadeado a partir dessa variação. Não é um preço em reais."
)

COHORTS = {"primeiros_12m": 12, "primeiros_24m": 24, "primeiros_36m": 36}


def _carregar_json_opcional(path) -> dict | None:
    """Lê um JSON auxiliar (cotação ao vivo, notícias) se o arquivo existir —
    scripts de download que ainda não rodaram não devem quebrar o build."""
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _fmt_mes(ts) -> str:
    return pd.Timestamp(ts).strftime("%Y-%m-%d")


def _indice100(serie: pd.Series) -> pd.Series:
    """Reescala uma série para base 100 no primeiro valor não-nulo — só para
    visualização (seção 'Contexto'), calculado aqui para não duplicar em JS."""
    base = serie.dropna().iloc[0] if serie.notna().any() else None
    if not base:
        return pd.Series([None] * len(serie), index=serie.index)
    return serie / base * 100


def _serie_anual_combustivel(df: pd.DataFrame) -> list[dict]:
    df = df.dropna(subset=["preco_nominal"]).copy()
    df["ano"] = df["ano_mes"].dt.year
    out = []
    for ano, g in df.groupby("ano"):
        out.append({
            "ano": int(ano),
            "preco_nominal_medio": round(float(g["preco_nominal"].mean()), 4),
            "preco_real_medio": round(float(g["preco_real"].mean()), 4) if g["preco_real"].notna().any() else None,
            "n_meses": len(g),
        })
    return out


def _serie_anual_alimento(df: pd.DataFrame) -> list[dict]:
    df = df.dropna(subset=["indice_relativo"]).copy()
    df["ano"] = df["ano_mes"].dt.year
    out = []
    for ano, g in df.groupby("ano"):
        out.append({
            "ano": int(ano),
            "indice_nominal_medio": round(float(g["indice_relativo"].mean()), 2),
            "indice_real_medio": round(float(g["indice_relativo_real"].mean()), 2) if g["indice_relativo_real"].notna().any() else None,
            "n_meses": len(g),
        })
    return out


def _resumo_combustivel(df: pd.DataFrame) -> dict:
    df = df.dropna(subset=["preco_nominal"]).sort_values("ano_mes")
    if df.empty:
        return None
    primeiro, ultimo = df.iloc[0], df.iloc[-1]
    return {
        "n_meses": len(df),
        "mes_inicio": _fmt_mes(primeiro["ano_mes"]),
        "mes_fim": _fmt_mes(ultimo["ano_mes"]),
        "preco_nominal_inicio": round(float(primeiro["preco_nominal"]), 4),
        "preco_nominal_fim": round(float(ultimo["preco_nominal"]), 4),
        "variacao_nominal_rs": round(float(ultimo["preco_nominal"] - primeiro["preco_nominal"]), 4),
        "variacao_nominal_pct": round(float((ultimo["preco_nominal"] / primeiro["preco_nominal"] - 1) * 100), 2),
        "preco_real_inicio": round(float(primeiro["preco_real"]), 4) if pd.notna(primeiro["preco_real"]) else None,
        "preco_real_fim": round(float(ultimo["preco_real"]), 4) if pd.notna(ultimo["preco_real"]) else None,
        "variacao_real_pct": (
            round(float((ultimo["preco_real"] / primeiro["preco_real"] - 1) * 100), 2)
            if pd.notna(primeiro["preco_real"]) and pd.notna(ultimo["preco_real"])
            else None
        ),
        "preco_nominal_medio": round(float(df["preco_nominal"].mean()), 4),
        "preco_nominal_min": round(float(df["preco_nominal"].min()), 4),
        "preco_nominal_max": round(float(df["preco_nominal"].max()), 4),
        "pct_salario_minimo_inicio": round(float(primeiro["pct_salario_minimo"]), 2) if pd.notna(primeiro.get("pct_salario_minimo")) else None,
        "pct_salario_minimo_fim": round(float(ultimo["pct_salario_minimo"]), 2) if pd.notna(ultimo.get("pct_salario_minimo")) else None,
        "unidades_por_salario_minimo_inicio": round(float(primeiro["unidades_por_salario_minimo"]), 2) if pd.notna(primeiro.get("unidades_por_salario_minimo")) else None,
        "unidades_por_salario_minimo_fim": round(float(ultimo["unidades_por_salario_minimo"]), 2) if pd.notna(ultimo.get("unidades_por_salario_minimo")) else None,
        "cambio_variacao_pct": round(float((ultimo["cambio_usd_brl"] / primeiro["cambio_usd_brl"] - 1) * 100), 2) if pd.notna(primeiro.get("cambio_usd_brl")) and pd.notna(ultimo.get("cambio_usd_brl")) else None,
        "brent_usd_variacao_pct": round(float((ultimo["brent_usd_bbl"] / primeiro["brent_usd_bbl"] - 1) * 100), 2) if pd.notna(primeiro.get("brent_usd_bbl")) and pd.notna(ultimo.get("brent_usd_bbl")) else None,
    }


def _resumo_alimento(df: pd.DataFrame) -> dict:
    df = df.dropna(subset=["indice_relativo"]).sort_values("ano_mes")
    if df.empty:
        return None
    primeiro, ultimo = df.iloc[0], df.iloc[-1]
    return {
        "n_meses": len(df),
        "mes_inicio": _fmt_mes(primeiro["ano_mes"]),
        "mes_fim": _fmt_mes(ultimo["ano_mes"]),
        "indice_nominal_inicio": round(float(primeiro["indice_relativo"]), 2),
        "indice_nominal_fim": round(float(ultimo["indice_relativo"]), 2),
        "variacao_nominal_pct": round(float((ultimo["indice_relativo"] / primeiro["indice_relativo"] - 1) * 100), 2),
        "indice_real_inicio": round(float(primeiro["indice_relativo_real"]), 2) if pd.notna(primeiro["indice_relativo_real"]) else None,
        "indice_real_fim": round(float(ultimo["indice_relativo_real"]), 2) if pd.notna(ultimo["indice_relativo_real"]) else None,
        "variacao_real_pct": (
            round(float((ultimo["indice_relativo_real"] / primeiro["indice_relativo_real"] - 1) * 100), 2)
            if pd.notna(primeiro["indice_relativo_real"]) and pd.notna(ultimo["indice_relativo_real"])
            else None
        ),
        "indice_nominal_medio": round(float(df["indice_relativo"].mean()), 2),
    }


def _cohorts_para_periodo(df_periodo: pd.DataFrame, resumo_fn) -> dict:
    df_periodo = df_periodo.sort_values("ano_mes")
    out = {"governo_inteiro": resumo_fn(df_periodo)}
    for nome, n in COHORTS.items():
        cohort_df = df_periodo.head(n)
        resumo = resumo_fn(cohort_df)
        if resumo is not None:
            resumo["completo"] = len(cohort_df.dropna(how="all")) >= n and len(df_periodo) >= n
        out[nome] = resumo
    return out


def montar_combustiveis(salario: pd.DataFrame) -> dict:
    df = pd.read_csv(DATA_PROCESSED / "combustiveis_final.csv", parse_dates=["ano_mes"])
    df = df[df["regiao"] == "BR"].merge(salario, on="ano_mes", how="left")
    df["pct_salario_minimo"] = df["preco_nominal"] / df["salario_minimo"] * 100
    df["unidades_por_salario_minimo"] = df["salario_minimo"] / df["preco_nominal"]

    produtos = {}
    for codigo, (nome, unidade) in NOMES_COMBUSTIVEL.items():
        g = df[df["produto"] == codigo].dropna(subset=["preco_nominal"]).sort_values("ano_mes")
        if g.empty:
            logger.warning(f"sem dados para {codigo}, pulando")
            continue
        g = g.assign(
            preco_indice100=_indice100(g["preco_nominal"]),
            brent_brl_indice100=_indice100(g["brent_brl_bbl"]),
            cambio_indice100=_indice100(g["cambio_usd_brl"]),
            ipca_indice100=_indice100(g["ipca_indice"]),
        )
        serie = []
        for _, r in g.iterrows():
            serie.append({
                "ano_mes": _fmt_mes(r["ano_mes"]),
                "periodo": r["periodo"],
                "preco_nominal": round(float(r["preco_nominal"]), 4),
                "preco_real": round(float(r["preco_real"]), 4) if pd.notna(r["preco_real"]) else None,
                "cambio_usd_brl": round(float(r["cambio_usd_brl"]), 4) if pd.notna(r["cambio_usd_brl"]) else None,
                "brent_usd_bbl": round(float(r["brent_usd_bbl"]), 2) if pd.notna(r["brent_usd_bbl"]) else None,
                "brent_brl_bbl": round(float(r["brent_brl_bbl"]), 2) if pd.notna(r["brent_brl_bbl"]) else None,
                "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
                "selic_meta_aa": round(float(r["selic_meta_aa"]), 2) if pd.notna(r["selic_meta_aa"]) else None,
                "salario_minimo": round(float(r["salario_minimo"]), 2) if pd.notna(r["salario_minimo"]) else None,
                "pct_salario_minimo": round(float(r["pct_salario_minimo"]), 2) if pd.notna(r["pct_salario_minimo"]) else None,
                "unidades_por_salario_minimo": round(float(r["unidades_por_salario_minimo"]), 2) if pd.notna(r["unidades_por_salario_minimo"]) else None,
                "preco_indice100": round(float(r["preco_indice100"]), 2) if pd.notna(r["preco_indice100"]) else None,
                "brent_brl_indice100": round(float(r["brent_brl_indice100"]), 2) if pd.notna(r["brent_brl_indice100"]) else None,
                "cambio_indice100": round(float(r["cambio_indice100"]), 2) if pd.notna(r["cambio_indice100"]) else None,
                "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
            })
        resumo = {}
        for periodo in ("Bolsonaro", "Lula"):
            resumo[periodo] = _cohorts_para_periodo(g[g["periodo"] == periodo], _resumo_combustivel)
        produtos[codigo] = {
            "nome": nome,
            "tipo": "combustivel",
            "unidade": unidade,
            "serie_mensal": serie,
            "serie_anual": _serie_anual_combustivel(g),
            "resumo_periodos": resumo,
        }
    return produtos


def montar_indicadores(salario: pd.DataFrame, ipca: pd.DataFrame, ibovespa: pd.DataFrame) -> dict:
    """Dólar, Selic e Ibovespa como "produtos" próprios — não são itens que
    se compra como gasolina ou arroz, então cada um tem sua unidade e o que
    faz sentido calcular: Dólar tem preço em R$ (dá pra deflacionar e ver
    quantos dólares um salário mínimo compra, igual combustível). Selic é
    uma taxa (% ao ano) — não é preço, não se deflaciona pelo IPCA do jeito
    normal, não tem "quantidade comprada". Ibovespa é medido em pontos, que
    não são reais nem uma taxa — outro schema próprio."""
    bcb = pd.read_csv(DATA_PROCESSED / "bcb_contexto_mensal.csv", parse_dates=["ano_mes"])
    ultimo_mes_comum = ipca["ano_mes"].max()
    bcb = bcb[bcb["ano_mes"] <= ultimo_mes_comum]

    # Cotação diária mais recente (Dólar/Selic são publicados todo dia útil,
    # bem mais rápido que o IPCA) — mostrada à parte da série mensal, que
    # segue limitada ao último mês fechado pelo IPCA acima.
    hoje_path = DATA_PROCESSED / "bcb_hoje.json"
    cotacao_hoje = json.loads(hoje_path.read_text(encoding="utf-8")) if hoje_path.exists() else {}

    # Inflação acumulada em 12 meses (não é o número-índice cru): é o que se
    # compara com a Selic de verdade, porque as duas ficam na mesma escala
    # ("% ao ano"). Calculada sobre o histórico completo do IPCA (não só o
    # recorte 2019+) para o "olhar 12 meses para trás" funcionar mesmo nos
    # primeiros meses da série.
    ipca_ord = ipca.sort_values("ano_mes").copy()
    ipca_ord["ipca_var_12m"] = ipca_ord["ipca_indice"] / ipca_ord["ipca_indice"].shift(12) * 100 - 100
    ipca = ipca_ord

    df = bcb.merge(ipca, on="ano_mes", how="left").merge(salario, on="ano_mes", how="left").merge(ibovespa, on="ano_mes", how="left")
    ipca_base = ipca.dropna(subset=["ipca_indice"])["ipca_indice"].iloc[-1]
    df["fator_deflator"] = ipca_base / df["ipca_indice"]
    df["ano_mes_periodo"] = df["ano_mes"].apply(lambda d: "Bolsonaro" if d < pd.Timestamp(PERIODO_CORTE) else "Lula")

    produtos = {}

    # --- Dólar: comportamento igual combustível (preço em R$, deflacionável) ---
    dolar = df.dropna(subset=["cambio_usd_brl"]).sort_values("ano_mes").copy()
    dolar["preco_nominal"] = dolar["cambio_usd_brl"]
    dolar["preco_real"] = dolar["preco_nominal"] * dolar["fator_deflator"]
    dolar["pct_salario_minimo"] = dolar["preco_nominal"] / dolar["salario_minimo"] * 100
    dolar["unidades_por_salario_minimo"] = dolar["salario_minimo"] / dolar["preco_nominal"]
    dolar = dolar.assign(
        preco_indice100=_indice100(dolar["preco_nominal"]),
        ipca_indice100=_indice100(dolar["ipca_indice"]),
        selic_indice100=_indice100(dolar["selic_meta_aa"]),
    )
    serie_dolar = []
    for _, r in dolar.iterrows():
        serie_dolar.append({
            "ano_mes": _fmt_mes(r["ano_mes"]),
            "periodo": r["ano_mes_periodo"],
            "preco_nominal": round(float(r["preco_nominal"]), 4),
            "preco_real": round(float(r["preco_real"]), 4) if pd.notna(r["preco_real"]) else None,
            "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
            "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
            "selic_meta_aa": round(float(r["selic_meta_aa"]), 2) if pd.notna(r["selic_meta_aa"]) else None,
            "selic_indice100": round(float(r["selic_indice100"]), 2) if pd.notna(r["selic_indice100"]) else None,
            "salario_minimo": round(float(r["salario_minimo"]), 2) if pd.notna(r["salario_minimo"]) else None,
            "pct_salario_minimo": round(float(r["pct_salario_minimo"]), 2) if pd.notna(r["pct_salario_minimo"]) else None,
            "unidades_por_salario_minimo": round(float(r["unidades_por_salario_minimo"]), 2) if pd.notna(r["unidades_por_salario_minimo"]) else None,
            "preco_indice100": round(float(r["preco_indice100"]), 2) if pd.notna(r["preco_indice100"]) else None,
        })
    resumo_dolar = {}
    for periodo in ("Bolsonaro", "Lula"):
        resumo_dolar[periodo] = _cohorts_para_periodo(dolar[dolar["ano_mes_periodo"] == periodo], _resumo_combustivel)
    produtos["DOLAR"] = {
        "nome": "Dólar comercial",
        "tipo": "cambio",
        "unidade": "R$/US$",
        "serie_mensal": serie_dolar,
        "serie_anual": _serie_anual_combustivel(dolar),
        "resumo_periodos": resumo_dolar,
        "cotacao_hoje": cotacao_hoje.get("cambio_usd_brl"),
    }

    # --- Selic: taxa, não preço — schema próprio, bem mais simples ---
    selic = df.dropna(subset=["selic_meta_aa"]).sort_values("ano_mes").copy()
    selic = selic.assign(ipca_indice100=_indice100(selic["ipca_indice"]), taxa_aa=selic["selic_meta_aa"])
    serie_selic = []
    for _, r in selic.iterrows():
        serie_selic.append({
            "ano_mes": _fmt_mes(r["ano_mes"]),
            "periodo": r["ano_mes_periodo"],
            "taxa_aa": round(float(r["selic_meta_aa"]), 2),
            "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
            "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
            "ipca_var_12m": round(float(r["ipca_var_12m"]), 2) if pd.notna(r["ipca_var_12m"]) else None,
        })
    resumo_selic = {}
    for periodo in ("Bolsonaro", "Lula"):
        resumo_selic[periodo] = _cohorts_para_periodo(selic[selic["ano_mes_periodo"] == periodo], _resumo_taxa)
    produtos["SELIC"] = {
        "nome": "Taxa Selic",
        "tipo": "taxa",
        "unidade": "% ao ano",
        "nota": (
            "A Selic é a taxa básica de juros da economia brasileira, definida "
            "pelo Copom. Não é um preço — por isso não faz sentido falar em "
            "\"poder de compra\" ou \"quantidade comprada\" da Selic."
        ),
        "serie_mensal": serie_selic,
        "serie_anual": _serie_anual_taxa(selic),
        "resumo_periodos": resumo_selic,
        "cotacao_hoje": cotacao_hoje.get("selic_meta_aa"),
    }

    # --- IPCA como "produto": mesma régua da Selic (% ao ano), mas aqui é a
    # inflação acumulada em 12 meses, não o índice de preços em si (esse
    # continua sendo usado só como deflator, nos bastidores). Reusa
    # _resumo_taxa/_serie_anual_taxa porque a coluna "taxa_aa" é genérica.
    ipca_prod = df.dropna(subset=["ipca_var_12m"]).sort_values("ano_mes").copy()
    ipca_prod = ipca_prod.assign(taxa_aa=ipca_prod["ipca_var_12m"])
    serie_ipca = []
    for _, r in ipca_prod.iterrows():
        serie_ipca.append({
            "ano_mes": _fmt_mes(r["ano_mes"]),
            "periodo": r["ano_mes_periodo"],
            "taxa_aa": round(float(r["ipca_var_12m"]), 2),
            "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
            "selic_meta_aa": round(float(r["selic_meta_aa"]), 2) if pd.notna(r["selic_meta_aa"]) else None,
        })
    resumo_ipca_prod = {}
    for periodo in ("Bolsonaro", "Lula"):
        resumo_ipca_prod[periodo] = _cohorts_para_periodo(ipca_prod[ipca_prod["ano_mes_periodo"] == periodo], _resumo_taxa)
    produtos["IPCA"] = {
        "nome": "Inflação (IPCA)",
        "tipo": "taxa",
        "unidade": "% ao ano (12 meses)",
        "nota": (
            "Aqui \"IPCA\" é a inflação acumulada nos últimos 12 meses — a "
            "mesma métrica usada para comparar com a Selic no restante do "
            "dashboard — não o índice de preços em si. Como depende de 12 "
            "meses anteriores, só começa em jan/2020 (o dado de 2019 fica "
            "sem par no histórico). Não é um preço — por isso não faz "
            "sentido falar em \"poder de compra\" da inflação."
        ),
        "serie_mensal": serie_ipca,
        "serie_anual": _serie_anual_taxa(ipca_prod),
        "resumo_periodos": resumo_ipca_prod,
    }

    # --- Ibovespa: pontos, não é preço nem taxa — schema próprio ---
    ibov = df.dropna(subset=["ibovespa_pontos"]).sort_values("ano_mes").copy()
    ibov = ibov.assign(
        pontos=ibov["ibovespa_pontos"],
        pontos_indice100=_indice100(ibov["ibovespa_pontos"]),
        ipca_indice100=_indice100(ibov["ipca_indice"]),
        selic_indice100=_indice100(ibov["selic_meta_aa"]),
        cambio_indice100=_indice100(ibov["cambio_usd_brl"]),
    )
    serie_ibov = []
    for _, r in ibov.iterrows():
        serie_ibov.append({
            "ano_mes": _fmt_mes(r["ano_mes"]),
            "periodo": r["ano_mes_periodo"],
            "pontos": round(float(r["ibovespa_pontos"]), 0),
            "pontos_indice100": round(float(r["pontos_indice100"]), 2) if pd.notna(r["pontos_indice100"]) else None,
            "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
            "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
            "selic_meta_aa": round(float(r["selic_meta_aa"]), 2) if pd.notna(r["selic_meta_aa"]) else None,
            "selic_indice100": round(float(r["selic_indice100"]), 2) if pd.notna(r["selic_indice100"]) else None,
            "cambio_usd_brl": round(float(r["cambio_usd_brl"]), 4) if pd.notna(r["cambio_usd_brl"]) else None,
            "cambio_indice100": round(float(r["cambio_indice100"]), 2) if pd.notna(r["cambio_indice100"]) else None,
        })
    resumo_ibov = {}
    for periodo in ("Bolsonaro", "Lula"):
        resumo_ibov[periodo] = _cohorts_para_periodo(ibov[ibov["ano_mes_periodo"] == periodo], _resumo_pontos)
    produtos["IBOVESPA"] = {
        "nome": "Ibovespa",
        "tipo": "pontos",
        "unidade": "pontos",
        "nota": (
            "O Ibovespa é o principal índice da bolsa de valores brasileira (B3): "
            "mede a variação média de preço de uma carteira das ações mais "
            "negociadas. \"Pontos\" não é dinheiro — é uma unidade própria do "
            "índice, criada em 1968 (quando valia 100 pontos)."
        ),
        "serie_mensal": serie_ibov,
        "serie_anual": _serie_anual_pontos(ibov),
        "resumo_periodos": resumo_ibov,
        "cotacao_hoje": _carregar_json_opcional(DATA_PROCESSED / "ibovespa_hoje.json"),
    }
    # Pontos diários de comparação (Dólar, Selic, Ibovespa): a comparação entre
    # governos usa o ÚLTIMO DADO de dez/2022 contra o ÚLTIMO DADO disponível,
    # respeitando a frequência diária de cada série, não a média mensal.
    for codigo, arquivo in (("DOLAR", "dolar_ptax.csv"), ("SELIC", "selic_meta.csv"), ("IBOVESPA", "ibovespa.csv")):
        d = _pontos_diarios(DATA_PROCESSED / "mercados_diario" / arquivo)
        if d:
            produtos[codigo]["diario"] = d
    return produtos


def _pontos_diarios(caminho) -> dict | None:
    """Primeiro dado da série, último dado antes da troca de governo e último
    dado disponível, todos com a data real do registro."""
    if not caminho.exists():
        return None
    df = pd.read_csv(caminho, parse_dates=["data"]).dropna(subset=["valor"]).sort_values("data")
    if df.empty:
        return None
    corte = pd.Timestamp(PERIODO_CORTE)
    antes = df[df["data"] < corte]
    depois = df[df["data"] >= corte]

    def reg(linha):
        return {"data": linha["data"].strftime("%Y-%m-%d"), "valor": float(linha["valor"])}

    return {
        "inicio": reg(df.iloc[0]),
        "troca": reg(antes.iloc[-1]) if not antes.empty else None,
        "inicio_lula": reg(depois.iloc[0]) if not depois.empty else None,
        "ultimo": reg(df.iloc[-1]),
    }


def _resumo_taxa(df: pd.DataFrame) -> dict:
    df = df.dropna(subset=["taxa_aa"]).sort_values("ano_mes")
    if df.empty:
        return None
    primeiro, ultimo = df.iloc[0], df.iloc[-1]
    return {
        "n_meses": len(df),
        "mes_inicio": _fmt_mes(primeiro["ano_mes"]),
        "mes_fim": _fmt_mes(ultimo["ano_mes"]),
        "taxa_inicio": round(float(primeiro["taxa_aa"]), 2),
        "taxa_fim": round(float(ultimo["taxa_aa"]), 2),
        "variacao_pp": round(float(ultimo["taxa_aa"] - primeiro["taxa_aa"]), 2),
        "taxa_media": round(float(df["taxa_aa"].mean()), 2),
        "taxa_min": round(float(df["taxa_aa"].min()), 2),
        "taxa_max": round(float(df["taxa_aa"].max()), 2),
    }


def _serie_anual_taxa(df: pd.DataFrame) -> list[dict]:
    df = df.dropna(subset=["taxa_aa"]).copy()
    df["ano"] = df["ano_mes"].dt.year
    out = []
    for ano, g in df.groupby("ano"):
        out.append({"ano": int(ano), "taxa_media": round(float(g["taxa_aa"].mean()), 2), "n_meses": len(g)})
    return out


def _resumo_pontos(df: pd.DataFrame) -> dict:
    df = df.dropna(subset=["pontos"]).sort_values("ano_mes")
    if df.empty:
        return None
    primeiro, ultimo = df.iloc[0], df.iloc[-1]
    return {
        "n_meses": len(df),
        "mes_inicio": _fmt_mes(primeiro["ano_mes"]),
        "mes_fim": _fmt_mes(ultimo["ano_mes"]),
        "pontos_inicio": round(float(primeiro["pontos"]), 0),
        "pontos_fim": round(float(ultimo["pontos"]), 0),
        "variacao_pct": round(float((ultimo["pontos"] / primeiro["pontos"] - 1) * 100), 2),
        "pontos_medio": round(float(df["pontos"].mean()), 0),
        "pontos_min": round(float(df["pontos"].min()), 0),
        "pontos_max": round(float(df["pontos"].max()), 0),
    }


def _serie_anual_pontos(df: pd.DataFrame) -> list[dict]:
    df = df.dropna(subset=["pontos"]).copy()
    df["ano"] = df["ano_mes"].dt.year
    out = []
    for ano, g in df.groupby("ano"):
        out.append({"ano": int(ano), "pontos_medio": round(float(g["pontos"].mean()), 0), "n_meses": len(g)})
    return out


def montar_alimentos(salario: pd.DataFrame) -> dict:
    df = pd.read_csv(DATA_PROCESSED / "cesta_basica_final.csv", parse_dates=["ano_mes"])
    df = df.merge(salario, on="ano_mes", how="left")
    produtos = {}
    for item, g in df.groupby("item"):
        g = g.dropna(subset=["indice_relativo"]).sort_values("ano_mes")
        if g.empty:
            continue
        # Poder de compra em termos relativos: não temos preço absoluto em R$
        # para alimentos, então não dá pra dizer "X kg por salário mínimo"
        # como fazemos com combustível — mas dá pra montar um índice (base
        # 100 = jan/2019) de quanto o salário mínimo rende frente a este
        # item, combinando o salário (R$, real) com o índice de preço.
        g = g.assign(
            ipca_indice100=_indice100(g["ipca_indice"]),
            indice_poder_compra=_indice100(g["salario_minimo"] / g["indice_relativo"]),
        )
        serie = []
        for _, r in g.iterrows():
            serie.append({
                "ano_mes": _fmt_mes(r["ano_mes"]),
                "periodo": r["periodo"],
                "indice_relativo": round(float(r["indice_relativo"]), 2),
                "indice_relativo_real": round(float(r["indice_relativo_real"]), 2) if pd.notna(r["indice_relativo_real"]) else None,
                "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
                "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
                "salario_minimo": round(float(r["salario_minimo"]), 2) if pd.notna(r["salario_minimo"]) else None,
                "indice_poder_compra": round(float(r["indice_poder_compra"]), 2) if pd.notna(r["indice_poder_compra"]) else None,
            })
        resumo = {}
        for periodo in ("Bolsonaro", "Lula"):
            resumo[periodo] = _cohorts_para_periodo(g[g["periodo"] == periodo], _resumo_alimento)
        produtos[item] = {
            "nome": item,
            "tipo": "alimento_indice",
            "unidade": "índice (base 100 = jan/2019)",
            "nota": NOTA_ALIMENTO,
            "serie_mensal": serie,
            "serie_anual": _serie_anual_alimento(g),
            "resumo_periodos": resumo,
        }
    return produtos


def montar_fotografia_mensal(produtos: dict) -> dict:
    """"Como estava o Brasil?" — fotografia cross-indicador por mês, montada
    só a partir de campos que os produtos já calcularam (nenhuma conta
    nova). Usada pelo frontend para os cards Era/Agora fora do produto
    selecionado."""
    campos = [
        ("dolar", "DOLAR", "preco_nominal"),
        ("ibovespa", "IBOVESPA", "pontos"),
        ("selic", "SELIC", "taxa_aa"),
        ("ipca", "IPCA", "taxa_aa"),
        ("gasolina", "GASOLINA", "preco_nominal"),
        ("salario_minimo", "GASOLINA", "salario_minimo"),
    ]
    foto: dict[str, dict] = {}
    for chave, codigo_produto, campo in campos:
        produto = produtos.get(codigo_produto)
        if not produto:
            continue
        for r in produto["serie_mensal"]:
            if campo in r:
                foto.setdefault(r["ano_mes"], {})[chave] = r[campo]
    return foto


def main() -> None:
    ensure_dirs(DATA_PROCESSED, DASHBOARD_DIR / "data")

    salario = pd.read_csv(DATA_PROCESSED / "salario_minimo_mensal.csv", parse_dates=["ano_mes"])
    ipca = pd.read_csv(DATA_PROCESSED / "ipca_geral_mensal.csv", parse_dates=["ano_mes"])
    ibovespa = pd.read_csv(DATA_PROCESSED / "ibovespa_mensal.csv", parse_dates=["ano_mes"])

    produtos = {
        **montar_combustiveis(salario),
        **montar_alimentos(salario),
        **montar_indicadores(salario, ipca, ibovespa),
    }

    dados = {
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "periodo_corte": "2023-01-01",
        "produtos": produtos,
        "fotografia_mensal": montar_fotografia_mensal(produtos),
        "presidentes": {
            "Bolsonaro": {
                "nome": "Jair Bolsonaro",
                "periodo_label": "Jan/2019 – Dez/2022",
                "foto": "assets/presidents/bolsonaro.jpg",
                "fonte_foto": "Foto: Isac Nóbrega/PR — Flickr do Palácio do Planalto, CC BY 2.0 (Wikimedia Commons)",
                "fonte_foto_url": "https://commons.wikimedia.org/wiki/File:Jair_Bolsonaro_2019_Portrait_(3x4_cropped_center).jpg",
            },
            "Lula": {
                "nome": "Luiz Inácio Lula da Silva",
                "periodo_label": "Jan/2023 – atual",
                "foto": "assets/presidents/lula.jpg",
                "fonte_foto": "Foto: Ricardo Stuckert/PR — Foto Oficial da Presidência, CC BY 2.0 (Wikimedia Commons)",
                "fonte_foto_url": "https://commons.wikimedia.org/wiki/File:Foto_oficial_de_Luiz_In%C3%A1cio_Lula_da_Silva_(ombros)_denoise.jpg",
            },
        },
    }

    out_path = DATA_PROCESSED / "dashboard_data.json"
    out_path.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"Salvo: {out_path} ({len(dados['produtos'])} produtos)")


if __name__ == "__main__":
    sys.exit(main())
