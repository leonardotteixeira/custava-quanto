"""
Baixa e agrega a Série Histórica de Preços de Combustíveis da ANP.

Fonte: https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis

A ANP publica os dados por posto revendedor (não já agregados), em dois formatos
que mudam ao longo do tempo:

- 2004–2022: arquivos semestrais combinando gasolina/etanol/diesel/GNV
  (".../shpc/dsas/ca/ca-{ano}-{semestre}.csv") e GLP separado
  (".../shpc/dsas/glp/glp-{ano}-{semestre}.csv").
- 2023 em diante: arquivos mensais por grupo de combustível, em
  ".../shpc/dsan/{ano}/", com nomes de arquivo que NÃO seguem um padrão fixo
  (mudaram pelo menos uma vez em 2026). Por isso este script sempre lê o HTML
  do índice do ano e extrai os links reais em vez de supor um nome de arquivo.
  O GLP continua disponível também como arquivo semestral em todos os anos,
  então usamos só essa fonte para GLP (evita duplicar com os arquivos mensais).

Cada arquivo baixado é lido e imediatamente agregado (média mensal de preço de
venda por região e produto); os dados brutos por posto NÃO são versionados no
git (são ~1GB+), só o agregado final em data/processed/anp_precos_mensais.csv.
"""
from __future__ import annotations

import argparse
import re
import sys
import time
from datetime import date

import pandas as pd
import requests

from common import DATA_PROCESSED, DATA_RAW, ensure_dirs, get_logger

logger = get_logger("download_anp")

BASE_DSAS = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/dsas"
BASE_DSAN = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/dsan"

RAW_DIR = DATA_RAW / "anp"

# Produtos de interesse e como aparecem na coluna "Produto" da ANP.
PRODUTOS_ALVO = {"GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"}

USECOLS = ["Regiao - Sigla", "Estado - Sigla", "Produto", "Data da Coleta", "Valor de Venda"]
RENAME = {
    "Regiao - Sigla": "regiao",
    "Estado - Sigla": "estado",
    "Produto": "produto",
    "Data da Coleta": "data_coleta",
    "Valor de Venda": "preco",
}

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compat; quanto-custa-research/1.0)"})


def _download(url: str, dest_path, tentativas: int = 4) -> bool:
    if dest_path.exists() and dest_path.stat().st_size > 0:
        logger.info(f"cache: {dest_path.name}")
        return True
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest_path.with_suffix(dest_path.suffix + ".part")
    for tentativa in range(1, tentativas + 1):
        try:
            with SESSION.get(url, timeout=120, stream=True) as resp:
                if resp.status_code != 200:
                    return False
                total = 0
                with open(tmp_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=1024 * 1024):
                        f.write(chunk)
                        total += len(chunk)
            tmp_path.replace(dest_path)
            logger.info(f"baixado: {dest_path.name} ({total / 1e6:.1f} MB)")
            return True
        except requests.RequestException as e:
            logger.warning(f"falha de rede em {url} (tentativa {tentativa}/{tentativas}): {e}")
            tmp_path.unlink(missing_ok=True)
            if tentativa < tentativas:
                time.sleep(3 * tentativa)
    return False


def _read_and_aggregate(csv_path) -> pd.DataFrame:
    """Lê um CSV bruto da ANP (por posto) e retorna médias mensais por região/produto."""
    df = pd.read_csv(
        csv_path,
        sep=";",
        decimal=",",
        encoding="utf-8-sig",
        usecols=USECOLS,
        dtype={"Regiao - Sigla": "category", "Estado - Sigla": "category", "Produto": "category"},
    )
    df = df.rename(columns=RENAME)
    df = df[df["produto"].isin(PRODUTOS_ALVO)]
    if df.empty:
        return df
    df["data_coleta"] = pd.to_datetime(df["data_coleta"], format="%d/%m/%Y", errors="coerce")
    df = df.dropna(subset=["data_coleta", "preco"])
    df["ano_mes"] = df["data_coleta"].dt.to_period("M").dt.to_timestamp()

    regional = (
        df.groupby(["ano_mes", "regiao", "produto"], observed=True)["preco"]
        .agg(preco_medio="mean", preco_min="min", preco_max="max", desvio_padrao="std", num_coletas="count")
        .reset_index()
    )
    nacional = (
        df.groupby(["ano_mes", "produto"], observed=True)["preco"]
        .agg(preco_medio="mean", preco_min="min", preco_max="max", desvio_padrao="std", num_coletas="count")
        .reset_index()
    )
    nacional["regiao"] = "BR"
    return pd.concat([regional, nacional], ignore_index=True)


def _discover_dsan_links(ano: int, categoria: str) -> list[str]:
    """Extrai da página de índice do ano os links .csv que batem com `categoria`
    (ex.: 'gasolina-etanol' ou 'diesel-gnv'), pois o padrão de nome de arquivo
    muda entre anos. b_size=200 evita a paginação padrão do Plone (20 itens
    por página), que faria perder os meses de agosto em diante em anos cheios."""
    idx_url = f"{BASE_DSAN}/{ano}/?b_size=200"
    try:
        resp = SESSION.get(idx_url, timeout=60)
    except requests.RequestException as e:
        logger.warning(f"falha ao listar índice {idx_url}: {e}")
        return []
    if resp.status_code != 200:
        return []
    hrefs = re.findall(r'href="([^"]+\.csv)(?:/view)?"', resp.text)
    hrefs = sorted(set(h.replace("/view", "") for h in hrefs if categoria in h))
    return hrefs


# A ANP só publica o índice mensal (dsan/{ano}/) a partir de 2021; antes disso
# só existe o formato semestral (dsas/ca e dsas/glp).
PRIMEIRO_ANO_DSAN = 2021


def baixar_periodo(ano_inicio: int, ano_fim: int) -> pd.DataFrame:
    ensure_dirs(RAW_DIR / "ca", RAW_DIR / "glp", RAW_DIR / "dsan")
    agregados = []

    for ano in range(ano_inicio, ano_fim + 1):
        if ano < PRIMEIRO_ANO_DSAN:
            # --- Formato semestral: gasolina/etanol/diesel/GNV juntos, GLP separado ---
            for sem in (1, 2):
                if date(ano, 1 if sem == 1 else 7, 1) > date.today():
                    continue
                for grupo, subdir in (("ca", "ca"), ("glp", "glp")):
                    url = f"{BASE_DSAS}/{grupo}/{grupo}-{ano}-{sem:02d}.csv"
                    dest = RAW_DIR / subdir / f"{grupo}-{ano}-{sem:02d}.csv"
                    if _download(url, dest):
                        agg = _read_and_aggregate(dest)
                        if not agg.empty:
                            agregados.append(agg)
        else:
            # --- Formato mensal: cada mês tem 3 arquivos (gasolina-etanol,
            # diesel-gnv, glp). Nomes de arquivo mudam entre anos, por isso
            # sempre descobrimos os links reais na página de índice do ano. ---
            for categoria in ("gasolina-etanol", "diesel-gnv", "glp"):
                links = _discover_dsan_links(ano, categoria)
                for href in links:
                    dest = RAW_DIR / "dsan" / f"{ano}-{href.rsplit('/', 1)[-1]}"
                    if _download(href, dest):
                        agg = _read_and_aggregate(dest)
                        if not agg.empty:
                            agregados.append(agg)

    if not agregados:
        raise RuntimeError("Nenhum dado da ANP foi baixado com sucesso.")

    resultado = pd.concat(agregados, ignore_index=True)
    # Se um mês tiver dado tanto do arquivo semestral quanto do mensal (raro, na
    # transição de 2022/2023), mantemos a média ponderada por número de coletas.
    resultado = (
        resultado.groupby(["ano_mes", "regiao", "produto"], as_index=False)
        .apply(_combinar_duplicatas, include_groups=False)
        .reset_index(drop=True)
    )
    return resultado.sort_values(["produto", "regiao", "ano_mes"])


def _combinar_duplicatas(g: pd.DataFrame) -> pd.Series:
    if len(g) == 1:
        return g.iloc[0]
    peso = g["num_coletas"]
    return pd.Series(
        {
            "preco_medio": (g["preco_medio"] * peso).sum() / peso.sum(),
            "preco_min": g["preco_min"].min(),
            "preco_max": g["preco_max"].max(),
            "desvio_padrao": g["desvio_padrao"].mean(),
            "num_coletas": peso.sum(),
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Baixa e agrega preços de combustíveis da ANP.")
    parser.add_argument("--ano-inicio", type=int, default=2019)
    parser.add_argument("--ano-fim", type=int, default=date.today().year)
    args = parser.parse_args()

    ensure_dirs(DATA_PROCESSED)
    df = baixar_periodo(args.ano_inicio, args.ano_fim)
    out_path = DATA_PROCESSED / "anp_precos_mensais.csv"
    df.to_csv(out_path, index=False)
    logger.info(f"Salvo: {out_path} ({len(df)} linhas, {df['ano_mes'].min()} a {df['ano_mes'].max()})")


if __name__ == "__main__":
    sys.exit(main())
