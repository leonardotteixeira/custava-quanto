"""
Baixa dados do IPCA via API SIDRA/IBGE (apisidra.ibge.gov.br).

Duas coisas distintas são baixadas:

1. IPCA geral - número-índice mensal (tabela 1737, variável 2266). Usado como
   deflator para converter preços nominais em preços reais.

2. Variação mensal (%) de itens específicos da cesta básica (tabela 1419 para
   jan/2012-dez/2019 e tabela 7060 para jan/2020 em diante, ambas variável 63,
   classificação 315). IMPORTANTE: o SIDRA não publica preço médio absoluto em
   R$ desses itens a nível nacional — só a variação percentual mensal e o peso
   no índice. Por isso construímos aqui um ÍNDICE relativo por item (base 100
   no primeiro mês disponível), encadeando as variações mensais oficiais. Não
   é um preço em reais, é um indicador da evolução relativa do preço do item
   frente à inflação. Ver README para a limitação e fontes alternativas
   (DIEESE) para preços absolutos.

Itens escolhidos (código do subitem na classificação 315):
    7173  = Arroz
    12222 = Feijão - carioca (rajado)   [variedade mais consumida no Brasil]
    7295  = Patinho                     [corte bovino usado como referência;
                                          o IBGE não publica uma média única
                                          "carne bovina", só por corte]
    12393 = Leite longa vida
    7385  = Óleo de soja
    7392  = Café moído
"""
from __future__ import annotations

import sys

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_ibge")

SIDRA_BASE = "https://apisidra.ibge.gov.br/values"

ITENS_CESTA = {
    "7173": "Arroz",
    "12222": "Feijão carioca",
    "7295": "Carne bovina (patinho)",
    "12393": "Leite longa vida",
    "7385": "Óleo de soja",
    "7392": "Café moído",
}


def _sidra_get(url: str) -> list[dict]:
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) or (data and "erro" in str(data[0]).lower()):
        raise RuntimeError(f"Erro na API SIDRA: {data}")
    return data[1:]  # primeira linha é o cabeçalho de metadados


def baixar_ipca_geral() -> pd.DataFrame:
    logger.info("Baixando IPCA geral (número-índice, tabela 1737)...")
    url = f"{SIDRA_BASE}/t/1737/n1/1/v/2266/p/all"
    rows = _sidra_get(url)
    df = pd.DataFrame(rows)
    df["ano_mes"] = pd.to_datetime(df["D3C"], format="%Y%m")
    df["ipca_indice"] = pd.to_numeric(df["V"], errors="coerce")
    df = df[["ano_mes", "ipca_indice"]].dropna().sort_values("ano_mes")
    return df[df["ano_mes"] >= "2019-01-01"]


def baixar_variacao_item(codigo: str) -> pd.DataFrame:
    partes = []
    # Tabela 1419 cobre até dez/2019; tabela 7060 cobre jan/2020 em diante.
    for tabela, periodo in (("1419", "201901-201912"), ("7060", "all")):
        p = "201901,201902,201903,201904,201905,201906,201907,201908,201909,201910,201911,201912" if periodo != "all" else "all"
        url = f"{SIDRA_BASE}/t/{tabela}/n1/1/v/63/p/{p}/c315/{codigo}"
        try:
            rows = _sidra_get(url)
        except (requests.RequestException, RuntimeError) as e:
            logger.warning(f"falha ao buscar tabela {tabela} item {codigo}: {e}")
            continue
        for r in rows:
            partes.append({"ano_mes": r["D3C"], "variacao_pct": r["V"]})
    df = pd.DataFrame(partes)
    df["ano_mes"] = pd.to_datetime(df["ano_mes"], format="%Y%m")
    df["variacao_pct"] = pd.to_numeric(df["variacao_pct"], errors="coerce")
    return df.dropna().drop_duplicates(subset="ano_mes").sort_values("ano_mes")


def construir_indice_encadeado(variacoes: pd.DataFrame, base: float = 100.0) -> pd.DataFrame:
    variacoes = variacoes.sort_values("ano_mes").reset_index(drop=True)
    indice = [base]
    for pct in variacoes["variacao_pct"].iloc[1:]:
        indice.append(indice[-1] * (1 + pct / 100))
    variacoes = variacoes.copy()
    variacoes["indice_relativo"] = indice
    return variacoes


def main() -> None:
    ensure_dirs(DATA_PROCESSED)

    ipca_geral = baixar_ipca_geral()
    ipca_geral.to_csv(DATA_PROCESSED / "ipca_geral_mensal.csv", index=False)
    logger.info(f"Salvo: ipca_geral_mensal.csv ({len(ipca_geral)} linhas)")

    itens = []
    for codigo, nome in ITENS_CESTA.items():
        logger.info(f"Baixando variação mensal: {nome} (código {codigo})...")
        var = baixar_variacao_item(codigo)
        if var.empty:
            logger.warning(f"sem dados para {nome}, pulando")
            continue
        var = construir_indice_encadeado(var)
        var["item"] = nome
        var["codigo_sidra"] = codigo
        itens.append(var)

    itens_df = pd.concat(itens, ignore_index=True)
    out_path = DATA_PROCESSED / "ibge_itens_cesta_mensal.csv"
    itens_df.to_csv(out_path, index=False)
    logger.info(f"Salvo: {out_path} ({len(itens_df)} linhas, {itens_df['item'].nunique()} itens)")


if __name__ == "__main__":
    sys.exit(main())
