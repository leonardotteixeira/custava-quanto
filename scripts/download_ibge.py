"""
Baixa dados do IPCA via API SIDRA/IBGE (apisidra.ibge.gov.br).

Duas coisas distintas são baixadas:

1. IPCA geral - número-índice mensal (tabela 1737, variável 2266). Usado como
   deflator para converter preços nominais em preços reais e para calcular o
   IPCA acumulado em 12 meses. Guardado desde jan/2018, 12 meses antes do início
   do primeiro período analisado (jan/2019), para que o IPCA em 12 meses exista
   desde jan/2019.

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

# Primeiro mês do número-índice do IPCA a guardar: 12 meses antes de jan/2019 (início do primeiro
# período analisado), necessários para o IPCA em 12 meses de jan/2019 a dez/2019.
IPCA_INICIO_DOWNLOAD = "2018-01-01"

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
    # O período analisado começa em jan/2019, mas o IPCA acumulado em 12 meses de
    # jan/2019 já precisa do índice de jan/2018 (a variação é índice(t) / índice(t-12)).
    # Por isso o número-índice é baixado desde jan/2018: sem esses 12 meses anteriores a série
    # de 12 meses só começaria em jan/2020 e o período Bolsonaro perderia o ano de 2019.
    return df[df["ano_mes"] >= IPCA_INICIO_DOWNLOAD]


# Peso mensal de cada item no IPCA (variável 66), só dos 10 itens usados no Custo de vida (diesel e diesel S10 são um
# só subitem do IPCA, "óleo diesel"). Serve para UMA coisa: a sensibilidade do Custo de vida a um agregador ponderado
# (auditoria R3b). Os pesos não entram em nenhuma leitura principal.
ITENS_PESO = {**{c: n for c, n in ITENS_CESTA.items()}, "7657": "GASOLINA", "7658": "ETANOL", "7659": "DIESEL", "7482": "GLP"}


def baixar_pesos_ipca() -> pd.DataFrame:
    logger.info("Baixando o peso mensal dos itens no IPCA (variável 66)...")
    linhas = []
    for tabela, periodo in (("1419", ",".join(f"2019{m:02d}" for m in range(1, 13))), ("7060", "all")):
        url = f"{SIDRA_BASE}/t/{tabela}/n1/1/v/66/p/{periodo}/c315/{','.join(ITENS_PESO)}"
        for r in _sidra_get(url):
            linhas.append({"ano_mes": r["D3C"], "codigo_sidra": r["D4C"], "peso": r["V"]})
    df = pd.DataFrame(linhas)
    df["ano_mes"] = pd.to_datetime(df["ano_mes"], format="%Y%m")
    df["item"] = df["codigo_sidra"].astype(str).map(ITENS_PESO)
    df["peso"] = pd.to_numeric(df["peso"], errors="coerce")
    df = df.dropna(subset=["peso"]).drop_duplicates(["ano_mes", "codigo_sidra"]).sort_values(["item", "ano_mes"])
    return df[["ano_mes", "item", "codigo_sidra", "peso"]]


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

    pesos = baixar_pesos_ipca()
    pesos.to_csv(DATA_PROCESSED / "ipca_pesos_itens.csv", index=False)
    logger.info(f"Salvo: ipca_pesos_itens.csv ({len(pesos)} linhas, {pesos['item'].nunique()} itens)")

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
