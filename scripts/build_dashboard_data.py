"""
Consolida combustiveis_final.csv + cesta_basica_final.csv + salario_minimo
em um único dashboard_data.json, pronto para o frontend consumir sem
precisar fazer nenhum cálculo (o Python continua sendo a única fonte de
verdade para os números).

Regra importante: combustíveis têm preço em R$ (podem ser expressos como
% do salário mínimo / unidades por salário mínimo). Itens da cesta básica
aqui são um ÍNDICE relativo (não há preço médio absoluto em R$ na fonte
IBGE/SIDRA para todo o período) — por isso esses dois grupos têm campos
diferentes no JSON, e os campos de salário mínimo simplesmente não existem
para alimentos (não viram null fingindo ser dado ausente).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import pandas as pd

from common import DASHBOARD_DIR, DATA_PROCESSED, ensure_dirs, get_logger

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


def montar_alimentos() -> dict:
    df = pd.read_csv(DATA_PROCESSED / "cesta_basica_final.csv", parse_dates=["ano_mes"])
    produtos = {}
    for item, g in df.groupby("item"):
        g = g.dropna(subset=["indice_relativo"]).sort_values("ano_mes")
        if g.empty:
            continue
        g = g.assign(ipca_indice100=_indice100(g["ipca_indice"]))
        serie = []
        for _, r in g.iterrows():
            serie.append({
                "ano_mes": _fmt_mes(r["ano_mes"]),
                "periodo": r["periodo"],
                "indice_relativo": round(float(r["indice_relativo"]), 2),
                "indice_relativo_real": round(float(r["indice_relativo_real"]), 2) if pd.notna(r["indice_relativo_real"]) else None,
                "ipca_indice": round(float(r["ipca_indice"]), 2) if pd.notna(r["ipca_indice"]) else None,
                "ipca_indice100": round(float(r["ipca_indice100"]), 2) if pd.notna(r["ipca_indice100"]) else None,
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


def main() -> None:
    ensure_dirs(DATA_PROCESSED, DASHBOARD_DIR / "data")

    salario = pd.read_csv(DATA_PROCESSED / "salario_minimo_mensal.csv", parse_dates=["ano_mes"])

    dados = {
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "periodo_corte": "2023-01-01",
        "produtos": {**montar_combustiveis(salario), **montar_alimentos()},
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
