"""Mercado de trabalho: PNAD Contínua (IBGE), via API do SIDRA.

Três séries oficiais, todas nacionais (Brasil), pessoas de 14 anos ou mais,
em TRIMESTRES MÓVEIS (o IBGE divulga um resultado por mês; cada resultado é a
média dos três meses que terminam naquele mês):

    taxa_desocupacao       tabela 6381, variável 4099  (%)
    taxa_subutilizacao     tabela 6441, variável 4118  (%)  taxa composta de
                           subutilização da força de trabalho
    rendimento_medio_real  tabela 6390, variável 5933  (R$)  rendimento médio
                           mensal REAL habitualmente recebido em todos os
                           trabalhos, das pessoas ocupadas com rendimento de
                           trabalho

Regras do projeto para estes dados:
- Nada é digitado, estimado, interpolado nem repetido de um mês para outro. Um
  valor que o IBGE não publicou (ou publicou como "-", "..." ou "X") fica vazio.
- A série de rendimento real vem já deflacionada pelo IBGE (IPCA, a preços do mês
  do meio do trimestre mais recente divulgado). O projeto NÃO aplica um segundo
  deflator. Como o IBGE refaz o deflator a cada divulgação, os valores em reais
  de toda a série mudam de uma divulgação para a outra: por isso o projeto usa
  variação percentual dentro da MESMA divulgação, nunca valores de divulgações
  diferentes.
- Cada ponto é identificado pelo mês em que o trimestre móvel TERMINA.

Saídas:
    data/raw/pnad/sidra_<tabela>_<variavel>.json   resposta bruta da API
    data/processed/pnad_mercado_trabalho.csv       uma linha por trimestre móvel
    data/processed/pnad_status.json                metadados, última observação, URL, data da coleta
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

import pandas as pd
import requests

from common import DATA_PROCESSED, DATA_RAW, ensure_dirs, get_logger

logger = get_logger("download_pnad")

SERIES = {
    "taxa_desocupacao": {
        "tabela": 6381, "variavel": 4099, "unidade": "%",
        "nome": "Taxa de desocupação, na semana de referência, das pessoas de 14 anos ou mais de idade",
    },
    "taxa_subutilizacao": {
        "tabela": 6441, "variavel": 4118, "unidade": "%",
        "nome": "Taxa composta de subutilização da força de trabalho, na semana de referência, das pessoas de 14 anos ou mais de idade",
    },
    "rendimento_medio_real": {
        "tabela": 6390, "variavel": 5933, "unidade": "Reais",
        "nome": "Rendimento médio mensal real das pessoas de 14 anos ou mais de idade ocupadas na semana de referência com rendimento de trabalho, habitualmente recebido em todos os trabalhos",
    },
}
URL_API = "https://apisidra.ibge.gov.br/values/t/{tabela}/n1/1/v/{variavel}/p/all"
URL_TABELA = "https://sidra.ibge.gov.br/tabela/{tabela}"
DESDE = "201901"  # o projeto começa em jan/2019


def _mes_seguinte(cod: str) -> str:
    a, m = int(cod[:4]), int(cod[4:]) + 1
    return f"{a + (m > 12)}{(m - 1) % 12 + 1:02d}"


def baixar(chave: str, cfg: dict) -> pd.DataFrame:
    url = URL_API.format(**cfg)
    logger.info("Baixando %s (tabela %s, variável %s)...", chave, cfg["tabela"], cfg["variavel"])
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    bruto = r.json()
    pasta = DATA_RAW / "pnad"
    ensure_dirs(pasta)
    (pasta / f"sidra_{cfg['tabela']}_{cfg['variavel']}.json").write_text(json.dumps(bruto, ensure_ascii=False), encoding="utf-8")
    linhas = bruto[1:]  # a primeira linha é o cabeçalho
    if not linhas:
        raise RuntimeError(f"{chave}: a API não devolveu observações")
    # conferências de layout: a variável, a unidade e o território esperados
    vars_ = {l["D2C"] for l in linhas}
    if vars_ != {str(cfg["variavel"])}:
        raise RuntimeError(f"{chave}: variáveis inesperadas {vars_}")
    if {l["D1N"] for l in linhas} != {"Brasil"}:
        raise RuntimeError(f"{chave}: território diferente de Brasil")
    df = pd.DataFrame({
        "periodo_codigo": [l["D3C"] for l in linhas],
        "rotulo": [l["D3N"] for l in linhas],
        chave: pd.to_numeric([l["V"] for l in linhas], errors="coerce"),  # "-", "..." e "X" viram vazio
    })
    if df["periodo_codigo"].duplicated().any():
        raise RuntimeError(f"{chave}: trimestre duplicado na resposta")
    df = df.sort_values("periodo_codigo").reset_index(drop=True)
    lacunas = [(a, b) for a, b in zip(df.periodo_codigo, df.periodo_codigo[1:]) if _mes_seguinte(a) != b]
    if lacunas:
        logger.warning("%s: meses ausentes na série do IBGE (não preenchidos): %s", chave, lacunas)
    return df


def main() -> None:
    ensure_dirs(DATA_PROCESSED, DATA_RAW)
    coleta = datetime.now(timezone.utc).isoformat(timespec="seconds")
    base, meta = None, {}
    for chave, cfg in SERIES.items():
        df = baixar(chave, cfg)
        ult = df.dropna(subset=[chave]).iloc[-1]
        meta[chave] = {
            "fonte": "IBGE — Pesquisa Nacional por Amostra de Domicílios Contínua (PNAD Contínua), divulgação mensal",
            "tabela_sidra": cfg["tabela"], "variavel_sidra": cfg["variavel"], "nome_oficial": cfg["nome"],
            "unidade": cfg["unidade"], "frequencia": "trimestre móvel (um resultado por mês, terminado no mês indicado)",
            "escopo_geografico": "Brasil", "populacao": "pessoas de 14 anos ou mais de idade",
            "primeira_observacao": df.dropna(subset=[chave]).iloc[0]["periodo_codigo"],
            "ultima_observacao": ult["periodo_codigo"], "ultima_observacao_rotulo": ult["rotulo"], "ultimo_valor": float(ult[chave]),
            "n_observacoes": int(df[chave].notna().sum()),
            "url_tabela": URL_TABELA.format(tabela=cfg["tabela"]), "url_api": URL_API.format(**cfg),
        }
        base = df if base is None else base.merge(df[["periodo_codigo", "rotulo", chave]], on=["periodo_codigo", "rotulo"], how="outer")
    base = base.sort_values("periodo_codigo").reset_index(drop=True)
    if base["periodo_codigo"].duplicated().any():
        raise RuntimeError("rótulos diferentes para o mesmo trimestre entre as tabelas")
    base["ano_mes"] = pd.to_datetime(base["periodo_codigo"] + "01", format="%Y%m%d")
    base = base[base["periodo_codigo"] >= DESDE]
    base = base[["ano_mes", "periodo_codigo", "rotulo", *SERIES]]
    caminho = DATA_PROCESSED / "pnad_mercado_trabalho.csv"
    base.to_csv(caminho, index=False)
    logger.info("Salvo: %s (%d linhas, %s a %s)", caminho, len(base), base.periodo_codigo.iloc[0], base.periodo_codigo.iloc[-1])

    status = {
        "coletado_em": coleta,
        "nota": "Cada ponto é um trimestre móvel identificado pelo mês em que termina. O rendimento real vem deflacionado pelo IBGE "
                "(IPCA, a preços do mês do meio do trimestre mais recente divulgado) e é refeito a cada divulgação.",
        "series": meta,
    }
    (DATA_PROCESSED / "pnad_status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    for k, m in meta.items():
        logger.info("%s: última observação %s (%s) = %s", k, m["ultima_observacao"], m["ultima_observacao_rotulo"], m["ultimo_valor"])


if __name__ == "__main__":
    sys.exit(main())
