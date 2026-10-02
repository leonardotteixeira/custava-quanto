"""
Baixa a série mensal NACIONAL oficial de preços de revenda da ANP.

Fonte: ANP, Levantamento de Preços de Combustíveis (LPC), "Síntese semanal/mensal dos preços":
https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/mensal/mensal-brasil-desde-jan2013.xlsx

Por que esta série é a série principal de combustíveis (metodologia 1.4.0):

A ANP diz, na página do levantamento, que o preço médio é a média aritmética simples só no nível
MUNICIPAL e que, desde 31/10/2004, os níveis estadual, regional e nacional são PONDERADOS pelas
vendas informadas pelas distribuidoras. A média simples de todas as coletas do país (o que
`download_anp.py` calcula) pesa cada UF pelo número de coletas, que depende do desenho da amostra,
não do consumo. Em etanol isso importa: em 2022, São Paulo tinha 33% das coletas mas 52% das vendas
de etanol hidratado, e o preço em SP era mais baixo que o das demais regiões; a média simples ficava
em média 6,5% acima da série oficial (docs/AUDITORIA_ACADEMICA_METODOLOGIA.md, seção 7.1). Reproduzi a
série oficial a partir dos dados brutos ponderando por vendas (município -> UF -> Brasil), com diferença
média absoluta de 0,47% no etanol: a diferença vem da ponderação, não da amostra (a contagem de coletas
é a mesma). O preço "nacional" que o projeto mostra deve ser o preço típico pago pelo consumidor, e é
isso que a ponderação por vendas mede; por isso a série oficial passa a ser a principal. A média simples
das coletas segue calculada por `download_anp.py` (coluna `preco_simples_coletas`) como sensibilidade.

Saída: data/processed/anp_oficial_mensal.csv
    ano_mes, produto, preco_medio, preco_min, preco_max, desvio_padrao, num_coletas
com `produto` no vocabulário do projeto (GASOLINA, ETANOL, DIESEL, DIESEL S10, GLP).

Observações da ANP no próprio arquivo (conferidas): "óleo diesel" = óleo diesel B S500 comum; sem pesquisa
entre 18/8/20 e 17/10/20 (a página da ANP diz 23/8 a 17/10; nos dados brutos a última coleta é 17/08 e a
primeira, 19/10). Os meses de agosto e outubro de 2020 têm coleta parcial.
"""
from __future__ import annotations

import sys
import time

import pandas as pd
import requests

from common import DATA_PROCESSED, DATA_RAW, ensure_dirs, get_logger

logger = get_logger("download_anp_oficial")

URL = (
    "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/"
    "precos-revenda-e-de-distribuicao-combustiveis/shlp/mensal/mensal-brasil-desde-jan2013.xlsx"
)
DEST = DATA_RAW / "anp" / "oficial" / "mensal-brasil-desde-jan2013.xlsx"
PRIMEIRO_MES = "2019-01-01"

# nome do produto no arquivo oficial -> nome no projeto
PRODUTOS = {
    "GASOLINA COMUM": "GASOLINA",
    "ETANOL HIDRATADO": "ETANOL",
    "OLEO DIESEL": "DIESEL",
    "OLEO DIESEL S10": "DIESEL S10",
    "GLP": "GLP",
}
COLUNAS = {
    "MÊS": "ano_mes",
    "PRODUTO": "produto",
    "NÚMERO DE POSTOS PESQUISADOS": "num_coletas",
    "PREÇO MÉDIO REVENDA": "preco_medio",
    "DESVIO PADRÃO REVENDA": "desvio_padrao",
    "PREÇO MÍNIMO REVENDA": "preco_min",
    "PREÇO MÁXIMO REVENDA": "preco_max",
}


def _baixar(tentativas: int = 4) -> None:
    DEST.parent.mkdir(parents=True, exist_ok=True)
    tmp = DEST.with_suffix(".part")
    for t in range(1, tentativas + 1):
        try:
            resp = requests.get(URL, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            if len(resp.content) < 10_000:
                raise RuntimeError(f"arquivo pequeno demais ({len(resp.content)} bytes)")
            tmp.write_bytes(resp.content)
            tmp.replace(DEST)
            logger.info(f"baixado: {DEST.name} ({len(resp.content) / 1e3:.0f} KB)")
            return
        except (requests.RequestException, RuntimeError) as e:
            logger.warning(f"falha ao baixar a série oficial (tentativa {t}/{tentativas}): {e}")
            tmp.unlink(missing_ok=True)
            if t < tentativas:
                time.sleep(3 * t)
    raise RuntimeError("não consegui baixar a série mensal oficial da ANP")


def ler(caminho=DEST) -> pd.DataFrame:
    """Lê o xlsx oficial (cabeçalho em linha variável, achada pela coluna 'MÊS') e devolve só o que o projeto usa."""
    bruto = pd.read_excel(caminho, header=None)
    linha = next(i for i in range(min(60, len(bruto))) if str(bruto.iloc[i, 0]).strip().upper() == "MÊS")
    df = pd.read_excel(caminho, header=linha)
    faltam = [c for c in COLUNAS if c not in df.columns]
    if faltam:
        raise ValueError(f"colunas esperadas ausentes no arquivo da ANP: {faltam}")
    df = df[list(COLUNAS)].rename(columns=COLUNAS)
    df["ano_mes"] = pd.to_datetime(df["ano_mes"], errors="coerce")
    df = df.dropna(subset=["ano_mes"])
    df["produto"] = df["produto"].astype(str).str.strip().str.upper().str.replace("Ó", "O")
    df = df[df["produto"].isin(PRODUTOS) & (df["ano_mes"] >= PRIMEIRO_MES)].copy()
    df["produto"] = df["produto"].map(PRODUTOS)
    for c in ("num_coletas", "preco_medio", "desvio_padrao", "preco_min", "preco_max"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["preco_medio"])
    if df.duplicated(["ano_mes", "produto"]).any():
        raise ValueError("mês duplicado na série oficial da ANP")
    return df.sort_values(["produto", "ano_mes"]).reset_index(drop=True)


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    _baixar()
    df = ler()
    out = DATA_PROCESSED / "anp_oficial_mensal.csv"
    df.to_csv(out, index=False)
    logger.info(f"Salvo: {out} ({len(df)} linhas, {df['ano_mes'].min().date()} a {df['ano_mes'].max().date()}, produtos: {', '.join(sorted(df['produto'].unique()))})")


if __name__ == "__main__":
    sys.exit(main())
