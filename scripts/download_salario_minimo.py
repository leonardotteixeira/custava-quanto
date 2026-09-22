"""
Baixa a série histórica do salário mínimo nacional (nominal, mensal) via
Banco Central (SGS - Sistema Gerenciador de Séries Temporais), série 1619.

https://api.bcb.gov.br/dados/serie/bcdata.sgs.1619/dados?formato=json

Usado para calcular, no dashboard, o preço de um produto como % do salário
mínimo e quantas unidades ele compra com um salário mínimo.

Limitação: é o piso nacional. Alguns estados têm piso regional mais alto
(ex.: SP, RS, SC, PR, RJ têm leis de piso salarial estadual para certas
categorias) — não capturado aqui.
"""
from __future__ import annotations

import sys
from datetime import date

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_salario_minimo")

SERIE_BCB = "1619"


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{SERIE_BCB}/dados"
        f"?formato=json&dataInicial=01/01/2019&dataFinal={date.today():%d/%m/%Y}"
    )
    logger.info("Baixando salário mínimo (BCB SGS 1619)...")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()

    df = pd.DataFrame(resp.json())
    df["ano_mes"] = pd.to_datetime(df["data"], format="%d/%m/%Y").dt.to_period("M").dt.to_timestamp()
    df["salario_minimo"] = pd.to_numeric(df["valor"], errors="coerce")
    df = df.dropna(subset=["salario_minimo"])[["ano_mes", "salario_minimo"]].drop_duplicates("ano_mes")
    df = df.sort_values("ano_mes")

    out_path = DATA_PROCESSED / "salario_minimo_mensal.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"Salvo: {out_path} ({len(df)} linhas, {df['ano_mes'].min().date()} a {df['ano_mes'].max().date()})")


if __name__ == "__main__":
    sys.exit(main())
