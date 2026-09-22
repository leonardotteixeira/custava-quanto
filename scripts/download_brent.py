"""
Baixa a cotação diária do petróleo Brent (USD/barril) via FRED (Federal
Reserve Bank of St. Louis), série DCOILBRENTEU. É um dataset público, sem
necessidade de chave de API, mantido a partir de dados da ICE.

https://fred.stlouisfed.org/series/DCOILBRENTEU

Usado como contexto: parte do preço da gasolina/diesel no Brasil reflete a
cotação internacional do petróleo (e o câmbio), não decisões domésticas.
"""
from __future__ import annotations

import sys

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_brent")

FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU"


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    logger.info("Baixando série Brent (FRED)...")
    resp = requests.get(FRED_URL, timeout=60)
    resp.raise_for_status()

    from io import StringIO

    df = pd.read_csv(StringIO(resp.text))
    df.columns = ["data", "brent_usd_bbl"]
    df["data"] = pd.to_datetime(df["data"])
    df["brent_usd_bbl"] = pd.to_numeric(df["brent_usd_bbl"], errors="coerce")
    df = df.dropna(subset=["brent_usd_bbl"])
    df = df[df["data"] >= "2019-01-01"]

    df["ano_mes"] = df["data"].dt.to_period("M").dt.to_timestamp()
    mensal = df.groupby("ano_mes")["brent_usd_bbl"].mean().reset_index()

    out_path = DATA_PROCESSED / "brent_mensal.csv"
    mensal.to_csv(out_path, index=False)
    logger.info(f"Salvo: {out_path} ({len(mensal)} linhas, {mensal['ano_mes'].min()} a {mensal['ano_mes'].max()})")


if __name__ == "__main__":
    sys.exit(main())
