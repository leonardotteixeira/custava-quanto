"""Baixa do SIDRA/IBGE a variação mensal (%) dos subitens de combustíveis do IPCA.

Serve SÓ para o cálculo transparente de uma ESTIMATIVA nos meses em que a ANP
não fez a pesquisa de preços (ver `estimar_lacunas_anp` em
build_dashboard_data.py e a seção "Estimativa" do Método). Não é preço em reais:
é a variação oficial de um mês para o outro.

Tabela 7060 (IPCA, a partir de jan/2020), variável 63 (variação mensal),
classificação 315 (subitens):
    7657 = Gasolina
    7658 = Etanol
    7659 = Óleo diesel
    7482 = Gás de botijão
Saída: data/processed/ibge_combustiveis_var_mensal.csv
"""
from __future__ import annotations

import sys

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_ibge_combustiveis")

ITENS = {"7657": "Gasolina", "7658": "Etanol", "7659": "Óleo diesel", "7482": "Gás de botijão"}
URL = "https://apisidra.ibge.gov.br/values/t/7060/n1/1/v/63/p/all/c315/{codigos}"


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    resp = requests.get(URL.format(codigos=",".join(ITENS)), timeout=90)
    resp.raise_for_status()
    dados = resp.json()[1:]
    df = pd.DataFrame(dados)
    out = pd.DataFrame({
        "ano_mes": pd.to_datetime(df["D3C"], format="%Y%m"),
        "item_codigo": df["D4C"].astype(str),
        "item": df["D4C"].astype(str).map(ITENS),
        "variacao_mensal_pct": pd.to_numeric(df["V"], errors="coerce"),
    }).dropna().sort_values(["item_codigo", "ano_mes"])
    caminho = DATA_PROCESSED / "ibge_combustiveis_var_mensal.csv"
    out.to_csv(caminho, index=False)
    logger.info("Salvo: %s (%d linhas, %s a %s)", caminho, len(out), out["ano_mes"].min().date(), out["ano_mes"].max().date())


if __name__ == "__main__":
    sys.exit(main())
