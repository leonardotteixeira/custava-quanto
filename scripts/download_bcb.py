"""
Baixa séries de contexto macroeconômico do Banco Central (SGS - Sistema
Gerenciador de Séries Temporais): câmbio USD/BRL e Selic.

Essas séries NÃO entram como "resultado" da análise, servem só de contexto
para explicar parte da variação de preços de combustíveis (importados em
dólar) e do custo de crédito/produção que afeta alimentos.

API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json
- 1    = Dólar americano (venda) - PTAX, diário
- 432  = Meta Selic definida pelo Copom, % a.a., diário (mantém último valor)
"""
from __future__ import annotations

import json
import sys
from datetime import date

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_bcb")

SERIES = {
    "1": "cambio_usd_brl",
    "432": "selic_meta_aa",
}


def baixar_serie(codigo: str, data_inicial: str, data_final: str) -> pd.DataFrame:
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
        f"?formato=json&dataInicial={data_inicial}&dataFinal={data_final}"
    )
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    dados = resp.json()
    df = pd.DataFrame(dados)
    df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y")
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
    return df.dropna(subset=["valor"])


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    hoje = date.today()
    data_inicial = "01/01/2019"
    data_final = hoje.strftime("%d/%m/%Y")

    mensal = None
    hoje = {}
    for codigo, nome in SERIES.items():
        logger.info(f"Baixando série BCB {codigo} ({nome})...")
        df = baixar_serie(codigo, data_inicial, data_final)
        ultimo = df.sort_values("data").iloc[-1]
        hoje[nome] = {"data": ultimo["data"].strftime("%Y-%m-%d"), "valor": float(ultimo["valor"])}
        df["ano_mes"] = df["data"].dt.to_period("M").dt.to_timestamp()
        agg = df.groupby("ano_mes")["valor"].mean().rename(nome).reset_index()
        mensal = agg if mensal is None else mensal.merge(agg, on="ano_mes", how="outer")

    mensal = mensal.sort_values("ano_mes")
    out_path = DATA_PROCESSED / "bcb_contexto_mensal.csv"
    mensal.to_csv(out_path, index=False)
    logger.info(f"Salvo: {out_path} ({len(mensal)} linhas, {mensal['ano_mes'].min()} a {mensal['ano_mes'].max()})")

    # Última cotação diária disponível de cada série (não é média mensal) —
    # usada só para o selo "hoje" do Dólar/Selic no dashboard.
    hoje_path = DATA_PROCESSED / "bcb_hoje.json"
    hoje_path.write_text(json.dumps(hoje, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"Salvo: {hoje_path}")


if __name__ == "__main__":
    sys.exit(main())
