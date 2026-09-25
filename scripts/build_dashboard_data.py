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

# Duas variantes, escolhidas por item (ver ITENS_SEM_FONTE_PROXIMA abaixo).
# Nenhuma delas afirma que um preço em R$ virá "em breve" — cada uma explica,
# com a fonte concreta que foi avaliada e descartada ou deixada em aberto,
# por que este item continua sendo só índice. Auditoria completa das fontes
# avaliadas (IBGE, DIEESE, CONAB, CEPEA/ESALQ, Procon, POF) em
# docs/AUDITORIA_PRECOS_ALIMENTOS.md — nenhum preço foi estimado ou
# inventado para preencher a lacuna.
NOTA_ALIMENTO_GRAO = (
    "O IBGE/SIDRA não publica preço médio nacional em R$ para este item — só "
    "a variação mensal oficial do IPCA por subitem. Por isso este número é um "
    "índice relativo (base 100 = jan/2019), não um preço em reais. A CONAB "
    "tem uma série de preço de varejo por estado que poderia, em tese, dar um "
    "preço nacional em R$/kg — o projeto ainda não verificou essa fonte o "
    "bastante para publicá-la (ver docs/AUDITORIA_PRECOS_ALIMENTOS.md)."
)
NOTA_ALIMENTO_PROCESSADO = (
    "O IBGE/SIDRA não publica preço médio nacional em R$ para este item — só "
    "a variação mensal oficial do IPCA por subitem. Por isso este número é um "
    "índice relativo (base 100 = jan/2019), não um preço em reais. As únicas "
    "séries de preço em R$ encontradas (CEPEA/ESALQ) medem o valor pago ao "
    "produtor, não o preço na prateleira — por isso não foram usadas (ver "
    "docs/AUDITORIA_PRECOS_ALIMENTOS.md)."
)
# Arroz e feijão: CONAB acompanha varejo desses grãos há décadas — candidato
# mais forte, pendente de verificação direta do arquivo (ver auditoria).
# Os demais são produtos processados; a fonte mais próxima encontrada mede
# a commodity crua/ao produtor, um elo antes do que o consumidor compra.
ITENS_GRAO = {"Arroz", "Feijão carioca"}
def _nota_alimento(item: str) -> str:
    return NOTA_ALIMENTO_GRAO if item in ITENS_GRAO else NOTA_ALIMENTO_PROCESSADO

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


def _carregar_conab_opcional() -> dict[str, pd.DataFrame]:
    """Preço de varejo (R$/kg) da CONAB, se scripts/download_conab.py já
    rodou com sucesso — ver docs/AUDITORIA_PRECOS_ALIMENTOS.md para a fonte
    e scripts/download_conab.py para como o arquivo é gerado e validado.
    Arquivo ausente (fonte bloqueada/fora do ar na última execução) não
    quebra o build: os itens correspondentes simplesmente seguem só com o
    índice IBGE, como sempre foi."""
    path = DATA_PROCESSED / "conab_precos_varejo.csv"
    if not path.exists():
        return {}
    conab = pd.read_csv(path, parse_dates=["ano_mes"])
    return {item: g.sort_values("ano_mes") for item, g in conab.groupby("item_dashboard")}


def _resumo_alimento_preco(df: pd.DataFrame) -> dict | None:
    """Mesmo formato de resumo por período que _resumo_alimento, mas para o
    preço absoluto (R$/kg) da CONAB em vez do índice IBGE — usado no
    'Períodos' com a mesma máquina de cohorts (1/2/3 anos)."""
    df = df.dropna(subset=["preco_conab_brl_kg"]).sort_values("ano_mes")
    if df.empty:
        return None
    primeiro, ultimo = df.iloc[0], df.iloc[-1]
    return {
        "n_meses": len(df),
        "mes_inicio": _fmt_mes(primeiro["ano_mes"]),
        "mes_fim": _fmt_mes(ultimo["ano_mes"]),
        "preco_brl_kg_inicio": round(float(primeiro["preco_conab_brl_kg"]), 4),
        "preco_brl_kg_fim": round(float(ultimo["preco_conab_brl_kg"]), 4),
        "variacao_pct_nominal": round(float((ultimo["preco_conab_brl_kg"] / primeiro["preco_conab_brl_kg"] - 1) * 100), 2),
        "variacao_pct_real": (
            round(float((ultimo["preco_conab_real_brl_kg"] / primeiro["preco_conab_real_brl_kg"] - 1) * 100), 2)
            if pd.notna(primeiro.get("preco_conab_real_brl_kg")) and pd.notna(ultimo.get("preco_conab_real_brl_kg"))
            else None
        ),
    }


def montar_alimentos(salario: pd.DataFrame) -> dict:
    df = pd.read_csv(DATA_PROCESSED / "cesta_basica_final.csv", parse_dates=["ano_mes"])
    df = df.merge(salario, on="ano_mes", how="left")
    conab_por_item = _carregar_conab_opcional()
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

        # Preço absoluto CONAB (R$/kg), quando existe para este item — nunca
        # substitui o índice IBGE, só soma colunas (left join: mês sem dado
        # CONAB continua no índice, com preco_conab_brl_kg=None, nunca
        # preenchido por interpolação ou pelo mês vizinho).
        conab = conab_por_item.get(item)
        tem_preco_absoluto = conab is not None and not conab.empty
        if tem_preco_absoluto:
            # deflaciona o preço CONAB com o MESMO ipca_indice/ipca_base já
            # usados para o índice IBGE deste item — um único deflator, para
            # não misturar dois critérios de "preço real" no mesmo produto.
            ipca_por_mes = g.set_index("ano_mes")["ipca_indice"]
            ipca_base = ipca_por_mes.dropna().iloc[-1]
            conab = conab.merge(ipca_por_mes.rename("ipca_indice_mes").reset_index(), on="ano_mes", how="left")
            conab["preco_conab_real_brl_kg"] = conab["preco_brl_kg"] * (ipca_base / conab["ipca_indice_mes"])
            g = g.merge(
                conab[["ano_mes", "preco_brl_kg", "n_ufs", "preco_conab_real_brl_kg"]].rename(columns={"preco_brl_kg": "preco_conab_brl_kg"}),
                on="ano_mes", how="left",
            )
            fonte_row = conab.iloc[0]

        serie = []
        for _, r in g.iterrows():
            linha = {
                "ano_mes": _fmt_mes(r["ano_mes"]),
                "periodo": r["periodo"],
                "indice_relativo": round(float(r["indice_relativo"]), 2),
                "indice_relativo_real": round(float(r["indice_relativo_real"]), 2) if pd.notna(r["indice_relativo_real"]) else None,
                "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
                "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
                "salario_minimo": round(float(r["salario_minimo"]), 2) if pd.notna(r["salario_minimo"]) else None,
                "indice_poder_compra": round(float(r["indice_poder_compra"]), 2) if pd.notna(r["indice_poder_compra"]) else None,
            }
            if tem_preco_absoluto:
                linha["preco_conab_brl_kg"] = round(float(r["preco_conab_brl_kg"]), 4) if pd.notna(r.get("preco_conab_brl_kg")) else None
                linha["preco_conab_real_brl_kg"] = round(float(r["preco_conab_real_brl_kg"]), 4) if pd.notna(r.get("preco_conab_real_brl_kg")) else None
                linha["preco_conab_n_ufs"] = int(r["n_ufs"]) if pd.notna(r.get("n_ufs")) else None
            serie.append(linha)

        resumo = {}
        for periodo in ("Bolsonaro", "Lula"):
            resumo[periodo] = _cohorts_para_periodo(g[g["periodo"] == periodo], _resumo_alimento)

        produto = {
            "nome": item,
            "tipo": "alimento_indice",
            "unidade": "índice (base 100 = jan/2019)",
            "nota": _nota_alimento(item),
            "serie_mensal": serie,
            "serie_anual": _serie_anual_alimento(g),
            "resumo_periodos": resumo,
        }
        if tem_preco_absoluto:
            resumo_preco = {}
            for periodo in ("Bolsonaro", "Lula"):
                resumo_preco[periodo] = _cohorts_para_periodo(g[g["periodo"] == periodo], _resumo_alimento_preco)
            produto["preco_absoluto"] = {
                "produto_conab": str(fonte_row["produto_conab"]),
                "nivel_comercializacao": str(fonte_row["nivel_comercializacao"]),
                "unidade": str(fonte_row["unidade"]),
                "fonte": str(fonte_row["fonte"]),
                "oficial_nacional": bool(fonte_row["oficial_nacional"]),
                "definicao_compativel_indice_ibge": bool(fonte_row["definicao_compativel_indice_ibge"]),
                "cobertura": "Preço observado nas UFs pesquisadas pela CONAB naquele mês — não todas as 27 unidades da federação necessariamente.",
                "resumo_periodos": resumo_preco,
            }
        produtos[item] = produto
    return produtos


# Fator de conversão até bilhões de reais, lido da UNIDADE que a própria API
# devolveu (nunca assumido) — cobre os nomes mais comuns que o IBGE usa.
_FATOR_ATE_BILHOES = {"reais": 1e-9, "mil reais": 1e-6, "milhões de reais": 1e-3, "milhoes de reais": 1e-3, "bilhões de reais": 1, "bilhoes de reais": 1}


def _resumo_pib(df: pd.DataFrame) -> dict | None:
    """Mesmo formato de _resumo_taxa (início/fim/mínima/máxima do recorte),
    mais um crescimento REAL ACUMULADO no período — o produto encadeado de
    cada ano fechado (1 + taxa/100), não a diferença simples início-fim que
    _resumo_taxa calcula para Selic/IPCA (que são níveis de taxa, não
    crescimentos que se compõem ano a ano)."""
    base = _resumo_taxa(df)
    if base is None:
        return None
    fechados = df.dropna(subset=["taxa_aa"]).sort_values("ano_mes")
    fator = 1.0
    for v in fechados["taxa_aa"]:
        fator *= 1 + float(v) / 100
    base["crescimento_acumulado_pct"] = round((fator - 1) * 100, 2)
    base["anos_com_resultado_fechado"] = int(len(fechados))
    return base


def montar_pib() -> dict:
    """PIB — Sistema de Contas Nacionais (IBGE). Ver scripts/download_pib.py
    para as duas tabelas oficiais usadas (5932 trimestral, 6784 anual) e por
    que a variação anual usada aqui é a leitura "acumulada no ano" do 4º
    trimestre — o mesmo número que o IBGE e a imprensa chamam de "o PIB
    cresceu X% no ano", não uma média inventada das quatro leituras
    trimestrais. Como os dois arquivos-fonte são opcionais (o download pode
    falhar — ver pib_status.json), a ausência de qualquer um deles não
    quebra o build: falta o que falta, sem preencher com nada calculado."""
    trim_path = DATA_PROCESSED / "pib_trimestral.csv"
    anual_path = DATA_PROCESSED / "pib_anual.csv"
    if not trim_path.exists() and not anual_path.exists():
        return {}

    trimestral = pd.read_csv(trim_path) if trim_path.exists() else pd.DataFrame()
    anual = pd.read_csv(anual_path) if anual_path.exists() else pd.DataFrame()

    serie_trimestral = []
    taxa_fechada_por_ano = {}
    if not trimestral.empty:
        trimestral = trimestral.copy()
        trimestral["ano"] = trimestral["periodo_codigo"].astype(str).str[:4].astype(int)
        trimestral["trimestre_num"] = trimestral["periodo_codigo"].astype(str).str[4:6].astype(int)
        trimestral = trimestral.sort_values(["ano", "trimestre_num"])
        for _, r in trimestral.iterrows():
            serie_trimestral.append({
                "trimestre": f"{int(r['ano'])}-T{int(r['trimestre_num'])}",
                "ano_mes": f"{int(r['ano'])}-{(int(r['trimestre_num']) - 1) * 3 + 1:02d}-01",
                "variacao_interanual": round(float(r["interanual"]), 2) if pd.notna(r.get("interanual")) else None,
                "variacao_dessazonalizada": round(float(r["dessazonalizada"]), 2) if pd.notna(r.get("dessazonalizada")) else None,
                "acumulado_4tri": round(float(r["acum_4tri"]), 2) if pd.notna(r.get("acum_4tri")) else None,
            })
            if int(r["trimestre_num"]) == 4 and pd.notna(r.get("acumulado_ano")):
                taxa_fechada_por_ano[int(r["ano"])] = float(r["acumulado_ano"])

    anual_por_ano = {}
    if not anual.empty:
        anual = anual.copy()
        anual["ano"] = anual["ano"].astype(int)
        for _, r in anual.iterrows():
            fator_nominal = _FATOR_ATE_BILHOES.get(str(r.get("unidade_pib_nominal", "")).strip().lower())
            anual_por_ano[int(r["ano"])] = {
                "pib_nominal_bilhoes": round(float(r["pib_nominal"]) * fator_nominal, 2) if pd.notna(r.get("pib_nominal")) and fator_nominal else None,
                "pib_per_capita_rs": round(float(r["pib_per_capita"]), 2) if pd.notna(r.get("pib_per_capita")) else None,
                "populacao_mil": round(float(r["populacao"]), 1) if pd.notna(r.get("populacao")) else None,
            }
            if fator_nominal is None and pd.notna(r.get("pib_nominal")):
                logger.warning(f"PIB nominal de {r['ano']}: unidade '{r.get('unidade_pib_nominal')}' não reconhecida — pib_nominal_bilhoes fica None nesse ano, em vez de arriscar a casa decimal errada.")

    # PIB nominal dos anos que a tabela anual (6784) ainda não fechou: soma dos quatro
    # trimestres (tabela 1846), só quando os quatro existem. Nada é estimado.
    nominal_soma = {}
    nom_path = DATA_PROCESSED / "pib_nominal_trimestral.csv"
    if nom_path.exists():
        nt = pd.read_csv(nom_path, dtype={"periodo_codigo": str})
        nt["ano"] = nt["periodo_codigo"].str[:4].astype(int)
        for ano, g in nt.groupby("ano"):
            if len(g) == 4:
                nominal_soma[int(ano)] = round(float(g["pib_nominal_milhoes"].sum()) / 1000, 2)
    for ano, v in nominal_soma.items():
        cur = anual_por_ano.setdefault(ano, {})
        if cur.get("pib_nominal_bilhoes") is None:
            cur["pib_nominal_bilhoes"] = v
            cur["pib_nominal_fonte"] = "soma dos quatro trimestres (Contas Nacionais Trimestrais)"

    anos = sorted(set(taxa_fechada_por_ano) | set(anual_por_ano))
    if not anos and not serie_trimestral:
        return {}

    serie = []
    for ano in anos:
        iso = f"{ano}-01-01"
        extra = anual_por_ano.get(ano, {})
        serie.append({
            "ano_mes": iso,
            "ano": ano,
            "periodo": "Bolsonaro" if pd.Timestamp(iso) < pd.Timestamp(PERIODO_CORTE) else "Lula",
            "taxa_aa": round(taxa_fechada_por_ano[ano], 2) if ano in taxa_fechada_por_ano else None,
            "resultado_anual": ano in taxa_fechada_por_ano,
            "pib_nominal_bilhoes": extra.get("pib_nominal_bilhoes"),
            "pib_per_capita_rs": extra.get("pib_per_capita_rs"),
            "populacao_mil": extra.get("populacao_mil"),
            "pib_nominal_fonte": extra.get("pib_nominal_fonte"),
        })
    df_serie = pd.DataFrame(serie)
    df_serie["ano_mes"] = pd.to_datetime(df_serie["ano_mes"])

    resumo = {}
    for periodo in ("Bolsonaro", "Lula"):
        resumo[periodo] = _cohorts_para_periodo(df_serie[df_serie["periodo"] == periodo], _resumo_pib)

    ultimo_trim = serie_trimestral[-1] if serie_trimestral else None
    componentes = _componentes_pib()
    pib_ac = {}
    pib_comp = next((c for c in componentes if c["codigo"] == "90707"), None)
    if ultimo_trim and pib_comp:
        ult = pib_comp["serie_trimestral"][-1] if pib_comp["serie_trimestral"] else None
        if ult and ult["trimestre"] == ultimo_trim["trimestre"]:
            ultimo_trim = {**ultimo_trim, "acumulado_ano": ult["acumulado_ano"]}
    frescor = _checar_frescor_pib(serie_trimestral, taxa_fechada_por_ano)
    status = {}
    status_path = DATA_PROCESSED / "pib_status.json"
    if status_path.exists():
        status = json.loads(status_path.read_text(encoding="utf-8"))
    return {
        "PIB": {
            "nome": "PIB",
            "tipo": "pib",
            "unidade": "% ao ano (variação real, acumulada no ano)",
            "nota": (
                "PIB real (crescimento) e PIB nominal/per capita (valores em R$) são "
                "contas diferentes, nunca misturadas no mesmo número. A variação "
                "anual mostrada aqui é a leitura \"acumulada no ano\" do 4º "
                "trimestre — o mesmo número que o IBGE e a imprensa chamam de "
                "\"o PIB cresceu X% no ano\". Um ano sem essa leitura ainda fechada "
                "aparece com os trimestres disponíveis, nunca com um resultado "
                "anual estimado. O IBGE pode revisar dados de PIB já publicados em "
                "divulgações seguintes — este projeto reflete a última revisão "
                "disponível no momento em que os dados foram baixados, não um "
                "arquivo histórico congelado. Proximidade temporal entre um "
                "evento e uma variação do PIB não demonstra causalidade."
            ),
            "serie_mensal": [
                {k: (None if pd.isna(v) else v) for k, v in row.items()}
                for row in df_serie.assign(ano_mes=df_serie["ano_mes"].dt.strftime("%Y-%m-%d")).to_dict("records")
            ],
            "serie_trimestral": serie_trimestral,
            "serie_anual": _serie_anual_taxa(df_serie),
            "resumo_periodos": resumo,
            "ultimo_trimestre": ultimo_trim,
            "frescor": frescor,
            "componentes": componentes,
            "fonte": {
                "nome": "IBGE — Sistema de Contas Nacionais Trimestrais",
                "url": "https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/2087-np-contas-nacionais-trimestrais/9300-contas-nacionais-trimestrais.html",
                "explica_url": "https://www.ibge.gov.br/explica/pib.php",
                "periodicidade": "trimestral (resultado do ano = acumulado no 4º trimestre)",
                "atualizado_em": ((status.get("trimestral") or {}).get("ultimo_sucesso_em")),
            },
        }
    }


# O IBGE divulga o PIB de um trimestre cerca de dois meses depois de ele acabar; damos
# folga de 100 dias. Se o dado guardado estiver atrás do que já deveria existir, o
# build AVISA e grava "desatualizado" no JSON (a página mostra) — nunca publica
# dado velho em silêncio. O esperado é derivado da data, não escrito à mão.
FOLGA_DIVULGACAO_PIB_DIAS = 100


def _checar_frescor_pib(serie_trimestral: list[dict], taxa_fechada_por_ano: dict) -> dict:
    hoje = pd.Timestamp.today().normalize()
    esperado = None
    for ano in range(hoje.year, hoje.year - 3, -1):
        for tri in (4, 3, 2, 1):
            fim = pd.Timestamp(year=ano, month=tri * 3, day=1) + pd.offsets.MonthEnd(0)
            if fim + pd.Timedelta(days=FOLGA_DIVULGACAO_PIB_DIAS) <= hoje:
                esperado = f"{ano}-T{tri}"
                break
        if esperado:
            break
    ultimo = serie_trimestral[-1]["trimestre"] if serie_trimestral else None
    ultimo_anual = max(taxa_fechada_por_ano) if taxa_fechada_por_ano else None
    avisos = []
    if esperado and (ultimo is None or ultimo < esperado):
        avisos.append(f"último trimestre guardado ({ultimo}) está atrás do esperado ({esperado})")
    if esperado and ultimo_anual is not None and ultimo_anual < int(esperado[:4]) - (0 if esperado.endswith("T4") else 1):
        avisos.append(f"último ano fechado ({ultimo_anual}) está atrás do esperado")
    for a in avisos:
        logger.warning(f"PIB DESATUALIZADO: {a}")
    return {"trimestre_esperado": esperado, "ultimo_trimestre": ultimo, "ultimo_ano_anual": ultimo_anual, "desatualizado": bool(avisos), "avisos": avisos}


def _componentes_pib() -> list[dict]:
    """Componentes do PIB (oferta e demanda), do IBGE — ver
    scripts/download_pib_componentes.py. Cada um é uma série TRIMESTRAL e, dela,
    o resultado ANUAL (acumulado no ano lido no 4º trimestre). Nenhum valor é
    interpolado, repetido ou convertido para mensal; ano sem 4º trimestre
    publicado não tem resultado anual."""
    caminho = DATA_PROCESSED / "pib_componentes_trimestral.csv"
    if not caminho.exists():
        return []
    df = pd.read_csv(caminho)
    df["periodo_codigo"] = df["periodo_codigo"].astype(str)
    df["ano"] = df["periodo_codigo"].str[:4].astype(int)
    df["tri"] = df["periodo_codigo"].str[4:6].astype(int)
    saida = []
    for codigo, g in df.groupby("codigo", sort=False):
        g = g.sort_values(["ano", "tri"])
        anual = []
        for _, r in g[g["tri"] == 4].iterrows():
            if pd.notna(r["acumulado_ano"]):
                anual.append({"ano": int(r["ano"]), "taxa": round(float(r["acumulado_ano"]), 2)})
        trimestral = [{
            "trimestre": f"{int(r['ano'])}-T{int(r['tri'])}",
            "ano_mes": f"{int(r['ano'])}-{(int(r['tri']) - 1) * 3 + 1:02d}-01",
            "interanual": round(float(r["interanual"]), 2) if pd.notna(r["interanual"]) else None,
            "acumulado_ano": round(float(r["acumulado_ano"]), 2) if pd.notna(r["acumulado_ano"]) else None,
        } for _, r in g.iterrows() if pd.notna(r["interanual"]) or pd.notna(r["acumulado_ano"])]
        saida.append({"codigo": str(codigo), "nome": str(g["nome"].iloc[0]), "serie_anual": anual, "serie_trimestral": trimestral})
    ordem = ["90707", "93404", "93405", "93406", "93407", "93408", "90687", "90691", "90696"]
    return sorted(saida, key=lambda c: ordem.index(c["codigo"]) if c["codigo"] in ordem else 99)


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
        ("salario_minimo", "DOLAR", "salario_minimo"),  # série completa (a de combustíveis tem meses sem coleta da ANP)
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


# Item do IPCA (SIDRA, tabela 7060, classificação 315) que acompanha cada combustível.
IPCA_ITEM_COMBUSTIVEL = {
    "GASOLINA": ("7657", "Gasolina"),
    "ETANOL": ("7658", "Etanol"),
    "DIESEL": ("7659", "Óleo diesel"),
    "DIESEL S10": ("7659", "Óleo diesel"),
    "GLP": ("7482", "Gás de botijão"),
}


def estimar_lacunas_anp(produtos: dict) -> None:
    """ESTIMATIVA (nunca dado oficial) para meses em que a ANP não fez pesquisa
    de preços — hoje, set/2020 (a ANP informa que não houve pesquisa entre
    23/08 e 17/10/2020, por troca do contrato de coleta).

    Método, deliberadamente simples e conferível:
      estimativa = último preço médio da ANP antes da lacuna
                   × (1 + variação mensal do item no IPCA/IBGE no mês da lacuna)
    Verificações que acompanham o número, para mostrar a incerteza:
      - interpolação linear entre o último preço antes e o primeiro depois;
      - "teste de volta": aplicar a variação do IPCA do mês seguinte à
        estimativa e comparar com o preço que a ANP de fato observou depois.
    O valor estimado NÃO entra em nenhum outro cálculo (variação, média,
    período, comparação): só é mostrado, à parte, com aviso.
    """
    caminho = DATA_PROCESSED / "ibge_combustiveis_var_mensal.csv"
    if not caminho.exists():
        logger.warning("ibge_combustiveis_var_mensal.csv ausente: sem estimativas de lacunas da ANP")
        return
    ibge = pd.read_csv(caminho, parse_dates=["ano_mes"])
    var = {(str(r.item_codigo), r.ano_mes.strftime("%Y-%m-%d")): float(r.variacao_mensal_pct) for r in ibge.itertuples()}
    for codigo, (item_cod, item_nome) in IPCA_ITEM_COMBUSTIVEL.items():
        prod = produtos.get(codigo)
        if not prod:
            continue
        serie = {r["ano_mes"]: r["preco_nominal"] for r in prod["serie_mensal"] if r.get("preco_nominal") is not None}
        meses = sorted(pd.date_range(min(serie), max(serie), freq="MS").strftime("%Y-%m-%d"))
        faltam = [m for m in meses if m not in serie]
        if not faltam:
            continue
        estim = []
        i = 0
        while i < len(faltam):
            j = i
            while j + 1 < len(faltam) and pd.Timestamp(faltam[j + 1]) == pd.Timestamp(faltam[j]) + pd.offsets.MonthBegin(1):
                j += 1
            corrida = faltam[i:j + 1]
            i = j + 1
            ant = max(m for m in serie if m < corrida[0])
            dep = min(m for m in serie if m > corrida[-1])
            if any((item_cod, m) not in var for m in corrida) or (item_cod, dep) not in var:
                continue
            valor = serie[ant]
            for k, m in enumerate(corrida, start=1):
                valor *= 1 + var[(item_cod, m)] / 100
                interp = serie[ant] + (serie[dep] - serie[ant]) * k / (len(corrida) + 1)
                previsto_dep = valor * (1 + var[(item_cod, dep)] / 100) if m == corrida[-1] else None
                estim.append({
                    "ano_mes": m,
                    "valor": round(valor, 2),
                    "metodo": "ultimo_preco_anp x variacao_ipca_item",
                    "base_ano_mes": ant, "base_valor": round(serie[ant], 4),
                    "ipca_item": item_nome, "ipca_item_codigo": item_cod, "ipca_var_pct": var[(item_cod, m)],
                    "interpolacao_linear": round(interp, 2),
                    "intervalo": [round(min(valor, interp), 2), round(max(valor, interp), 2)],
                    "teste_de_volta": None if previsto_dep is None else {
                        "ano_mes": dep, "previsto": round(previsto_dep, 2), "observado_anp": round(serie[dep], 2),
                        "erro_pct": round((previsto_dep / serie[dep] - 1) * 100, 2),
                    },
                })
        if estim:
            prod["estimativas"] = estim


def main() -> None:
    ensure_dirs(DATA_PROCESSED, DASHBOARD_DIR / "data")

    salario = pd.read_csv(DATA_PROCESSED / "salario_minimo_mensal.csv", parse_dates=["ano_mes"])
    ipca = pd.read_csv(DATA_PROCESSED / "ipca_geral_mensal.csv", parse_dates=["ano_mes"])
    ibovespa = pd.read_csv(DATA_PROCESSED / "ibovespa_mensal.csv", parse_dates=["ano_mes"])

    produtos = {
        **montar_combustiveis(salario),
        **montar_alimentos(salario),
        **montar_indicadores(salario, ipca, ibovespa),
        **montar_pib(),
    }

    estimar_lacunas_anp(produtos)

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
