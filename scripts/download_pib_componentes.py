"""Componentes do PIB (IBGE, Contas Nacionais Trimestrais, tabela 5932).

Mesma leitura que o PIB total usa no projeto: a taxa "acumulada ao longo do
ano" lida no 4º trimestre — o resultado do ANO de cada componente. Cada
componente é uma série ANUAL (um resultado por ano); nada é convertido para
mensal. O ano em curso, sem 4º trimestre publicado, simplesmente não tem
resultado anual (nunca é estimado).

Componentes (classificação 11255 do SIDRA, conferidos na API em 2026-09):
    90707 PIB a preços de mercado          93404 Despesa de consumo das famílias
    93406 Formação bruta de capital fixo   90691 Indústria - total
    90696 Serviços - total                 90687 Agropecuária - total
    93405 Consumo da administração pública 93407 Exportação de bens e serviços
    93408 Importação de bens e serviços

ATENÇÃO: o SIDRA traz a série ATUAL, revisada pelo IBGE ao longo dos anos.
Os números divulgados na época (ex.: release de 03/03/2011) podem diferir.

Saída: data/processed/pib_componentes_trimestral.csv
"""
from __future__ import annotations

import sys

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_pib_componentes")

COMPONENTES = {
    "90707": "PIB",
    "93404": "Consumo das famílias",
    "93406": "Formação bruta de capital fixo",
    "90691": "Indústria",
    "90696": "Serviços",
    "90687": "Agropecuária",
    "93405": "Consumo do governo",
    "93407": "Exportações",
    "93408": "Importações",
}
URL = "https://apisidra.ibge.gov.br/values/t/5932/n1/1/v/all/p/all/c11255/{codigos}"
VARIAVEIS = {
    "Taxa trimestral (em relação ao mesmo período do ano anterior)": "interanual",
    "Taxa acumulada ao longo do ano (em relação ao mesmo período do ano anterior)": "acumulado_ano",
}


def _norm(s: str) -> str:
    import unicodedata
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    resp = requests.get(URL.format(codigos=",".join(COMPONENTES)), timeout=120)
    resp.raise_for_status()
    df = pd.DataFrame(resp.json()[1:])
    alvo = {_norm(k): v for k, v in VARIAVEIS.items()}
    df["medida"] = df["D2N"].map(lambda n: alvo.get(_norm(n)))
    df = df.dropna(subset=["medida"])
    df["valor"] = pd.to_numeric(df["V"], errors="coerce")
    df["codigo"] = df["D4C"].astype(str)
    out = (df.pivot_table(index=["codigo", "D3C"], columns="medida", values="valor", aggfunc="first")
             .reset_index().rename(columns={"D3C": "periodo_codigo"}))
    out["nome"] = out["codigo"].map(COMPONENTES)
    out = out[["codigo", "nome", "periodo_codigo", "interanual", "acumulado_ano"]].sort_values(["codigo", "periodo_codigo"])
    caminho = DATA_PROCESSED / "pib_componentes_trimestral.csv"
    out.to_csv(caminho, index=False)
    logger.info("Salvo: %s (%d linhas)", caminho, len(out))


if __name__ == "__main__":
    sys.exit(main())
