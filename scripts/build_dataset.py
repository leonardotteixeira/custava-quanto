"""
Consolida todas as fontes processadas em datasets finais prontos para
análise: deflaciona preços nominais pelo IPCA (preço real a preços de hoje),
classifica cada mês no período de governo correspondente, e calcula
estatísticas resumo por período (Bolsonaro x Lula).

Entradas (geradas pelos scripts download_*.py em data/processed/):
    anp_precos_mensais.csv        - combustíveis, nominal, por região/produto
    ibge_itens_cesta_mensal.csv   - índice relativo de itens da cesta básica
    ipca_geral_mensal.csv         - IPCA número-índice (deflator)
    bcb_contexto_mensal.csv       - câmbio USD/BRL e Selic (contexto)
    brent_mensal.csv              - petróleo Brent USD/barril (contexto)

Saídas (data/processed/):
    combustiveis_final.csv   - série mensal de combustíveis, nominal e real,
                                com câmbio e Brent (USD e BRL) para contexto
    cesta_basica_final.csv   - série mensal do índice relativo dos itens da
                                cesta básica, nominal e real
    resumo_periodos_combustiveis.csv
    resumo_periodos_cesta.csv
        - preço/índice médio nominal e real por período de governo, variação
          percentual dentro de cada período, e (para combustíveis) quanto do
          câmbio e do Brent mudou no mesmo período, para dar contexto de
          quanto é fator externo.
"""
from __future__ import annotations

import sys

import pandas as pd

from common import DATA_PROCESSED, ensure_dirs, get_logger, periodo_do_governo

logger = get_logger("build_dataset")


def carregar_base() -> pd.DataFrame:
    ipca = pd.read_csv(DATA_PROCESSED / "ipca_geral_mensal.csv", parse_dates=["ano_mes"])
    bcb = pd.read_csv(DATA_PROCESSED / "bcb_contexto_mensal.csv", parse_dates=["ano_mes"])
    brent = pd.read_csv(DATA_PROCESSED / "brent_mensal.csv", parse_dates=["ano_mes"])

    base = ipca.merge(bcb, on="ano_mes", how="outer").merge(brent, on="ano_mes", how="outer")
    base = base.sort_values("ano_mes").reset_index(drop=True)
    base["brent_brl_bbl"] = base["brent_usd_bbl"] * base["cambio_usd_brl"]

    # Deflator: preço real = preço nominal * (ipca do mês-base / ipca do mês da observação).
    # Mês-base = mês mais recente disponível em qualquer uma das séries (preços de hoje).
    ipca_base = base.dropna(subset=["ipca_indice"])["ipca_indice"].iloc[-1]
    base["fator_deflator"] = ipca_base / base["ipca_indice"]
    return base


def montar_combustiveis(base: pd.DataFrame) -> pd.DataFrame:
    anp = pd.read_csv(DATA_PROCESSED / "anp_precos_mensais.csv", parse_dates=["ano_mes"])
    df = anp.merge(base, on="ano_mes", how="left")
    df["preco_real"] = df["preco_medio"] * df["fator_deflator"]
    df["periodo"] = df["ano_mes"].apply(periodo_do_governo)
    cols = [
        "ano_mes", "periodo", "regiao", "produto",
        "preco_medio", "preco_real",
        "cambio_usd_brl", "brent_usd_bbl", "brent_brl_bbl", "selic_meta_aa", "ipca_indice",
    ]
    return df[cols].rename(columns={"preco_medio": "preco_nominal"}).sort_values(
        ["produto", "regiao", "ano_mes"]
    )


def montar_cesta(base: pd.DataFrame) -> pd.DataFrame:
    ibge = pd.read_csv(DATA_PROCESSED / "ibge_itens_cesta_mensal.csv", parse_dates=["ano_mes"])
    df = ibge.merge(base[["ano_mes", "fator_deflator", "ipca_indice"]], on="ano_mes", how="left")
    df["indice_relativo_real"] = df["indice_relativo"] * df["fator_deflator"]
    df["periodo"] = df["ano_mes"].apply(periodo_do_governo)
    cols = ["ano_mes", "periodo", "item", "variacao_pct", "indice_relativo", "indice_relativo_real", "ipca_indice"]
    return df[cols].sort_values(["item", "ano_mes"])


def _variacao_periodo(g: pd.DataFrame, col: str) -> float:
    g = g.dropna(subset=[col]).sort_values("ano_mes")
    if len(g) < 2:
        return float("nan")
    return (g[col].iloc[-1] / g[col].iloc[0] - 1) * 100


def resumir_combustiveis(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for (produto, regiao), g in df.groupby(["produto", "regiao"]):
        for periodo, gp in g.groupby("periodo"):
            gp_valid = gp.dropna(subset=["preco_nominal"])
            if gp_valid.empty:
                continue
            linhas.append({
                "produto": produto,
                "regiao": regiao,
                "periodo": periodo,
                "n_meses": len(gp_valid),
                "preco_nominal_medio": gp_valid["preco_nominal"].mean(),
                "preco_real_medio": gp_valid["preco_real"].mean(),
                "variacao_pct_nominal_periodo": _variacao_periodo(gp_valid, "preco_nominal"),
                "variacao_pct_real_periodo": _variacao_periodo(gp_valid, "preco_real"),
                "variacao_pct_cambio_periodo": _variacao_periodo(gp_valid, "cambio_usd_brl"),
                "variacao_pct_brent_usd_periodo": _variacao_periodo(gp_valid, "brent_usd_bbl"),
                "variacao_pct_brent_brl_periodo": _variacao_periodo(gp_valid, "brent_brl_bbl"),
            })
    return pd.DataFrame(linhas).sort_values(["produto", "regiao", "periodo"])


def resumir_cesta(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for item, g in df.groupby("item"):
        for periodo, gp in g.groupby("periodo"):
            gp_valid = gp.dropna(subset=["indice_relativo"])
            if gp_valid.empty:
                continue
            linhas.append({
                "item": item,
                "periodo": periodo,
                "n_meses": len(gp_valid),
                "indice_nominal_medio": gp_valid["indice_relativo"].mean(),
                "indice_real_medio": gp_valid["indice_relativo_real"].mean(),
                "variacao_pct_nominal_periodo": _variacao_periodo(gp_valid, "indice_relativo"),
                "variacao_pct_real_periodo": _variacao_periodo(gp_valid, "indice_relativo_real"),
            })
    return pd.DataFrame(linhas).sort_values(["item", "periodo"])


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    base = carregar_base()

    combustiveis = montar_combustiveis(base)
    combustiveis.to_csv(DATA_PROCESSED / "combustiveis_final.csv", index=False)
    logger.info(f"Salvo: combustiveis_final.csv ({len(combustiveis)} linhas)")

    cesta = montar_cesta(base)
    cesta.to_csv(DATA_PROCESSED / "cesta_basica_final.csv", index=False)
    logger.info(f"Salvo: cesta_basica_final.csv ({len(cesta)} linhas)")

    resumo_comb = resumir_combustiveis(combustiveis)
    resumo_comb.to_csv(DATA_PROCESSED / "resumo_periodos_combustiveis.csv", index=False)
    logger.info(f"Salvo: resumo_periodos_combustiveis.csv ({len(resumo_comb)} linhas)")

    resumo_cesta = resumir_cesta(cesta)
    resumo_cesta.to_csv(DATA_PROCESSED / "resumo_periodos_cesta.csv", index=False)
    logger.info(f"Salvo: resumo_periodos_cesta.csv ({len(resumo_cesta)} linhas)")


if __name__ == "__main__":
    sys.exit(main())
