"""
Baixa a série histórica mensal do Ibovespa (índice da bolsa de valores de
São Paulo, símbolo ^BVSP) via Yahoo Finance — dataset público, sem
necessidade de chave de API.

https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP

Guardamos o preço de fechamento de cada mês, em pontos (não é uma unidade
monetária — "pontos do Ibovespa" é como o próprio mercado financeiro chama).
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timezone

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_ibovespa")

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    period1 = int(datetime(2019, 1, 1, tzinfo=timezone.utc).timestamp())
    period2 = int(datetime.now(timezone.utc).timestamp())
    params = {"period1": period1, "period2": period2, "interval": "1mo"}

    logger.info("Baixando série do Ibovespa (Yahoo Finance)...")
    resp = requests.get(YAHOO_URL, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resultado = resp.json()["chart"]["result"][0]

    timestamps = resultado["timestamp"]
    fechamento = resultado["indicators"]["quote"][0]["close"]

    df = pd.DataFrame({"ano_mes": pd.to_datetime(timestamps, unit="s", utc=True), "ibovespa_pontos": fechamento})
    df["ano_mes"] = df["ano_mes"].dt.tz_localize(None).dt.to_period("M").dt.to_timestamp()
    df = df.dropna(subset=["ibovespa_pontos"]).drop_duplicates("ano_mes").sort_values("ano_mes")
    # O mês corrente vem parcial (cotação de hoje, não o fechamento do mês) —
    # tiramos para não misturar um valor "no meio do mês" com médias mensais.
    hoje = pd.Timestamp(date.today()).to_period("M").to_timestamp()
    df = df[df["ano_mes"] < hoje]

    out_path = DATA_PROCESSED / "ibovespa_mensal.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"Salvo: {out_path} ({len(df)} linhas, {df['ano_mes'].min().date()} a {df['ano_mes'].max().date()})")


if __name__ == "__main__":
    sys.exit(main())
