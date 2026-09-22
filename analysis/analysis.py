"""
Gera os gráficos comparativos (Bolsonaro x Lula) para combustíveis e itens da
cesta básica, a partir dos datasets finais em data/processed/.

Roda com: .venv/Scripts/python.exe analysis/analysis.py
Saída: arquivos .html (interativos, plotly) e .png (estáticos, matplotlib) em /output.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from common import DATA_PROCESSED, OUTPUT_DIR, PERIODO_CORTE, ensure_dirs, get_logger  # noqa: E402

logger = get_logger("analysis")

CORES_PERIODO = {"Bolsonaro": "#7a7a7a", "Lula": "#c0392b"}
PRODUTOS_COMBUSTIVEL = ["GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"]
NOMES_PRODUTO = {
    "GASOLINA": "Gasolina Comum",
    "ETANOL": "Etanol Hidratado",
    "DIESEL": "Diesel Comum (S500)",
    "DIESEL S10": "Diesel S10",
    "GLP": "GLP (botijão 13kg)",
}


def _linha_corte(fig: go.Figure, row=None, col=None) -> None:
    fig.add_vline(
        x=pd.Timestamp(PERIODO_CORTE).timestamp() * 1000,
        line_dash="dash",
        line_color="black",
        opacity=0.5,
        row=row,
        col=col,
    )


def grafico_combustiveis_nacional(df: pd.DataFrame) -> go.Figure:
    d = df[df["regiao"] == "BR"]
    fig = make_subplots(
        rows=len(PRODUTOS_COMBUSTIVEL), cols=1,
        subplot_titles=[NOMES_PRODUTO[p] for p in PRODUTOS_COMBUSTIVEL],
        shared_xaxes=True,
        vertical_spacing=0.04,
    )
    for i, produto in enumerate(PRODUTOS_COMBUSTIVEL, start=1):
        g = d[d["produto"] == produto].sort_values("ano_mes")
        fig.add_trace(
            go.Scatter(x=g["ano_mes"], y=g["preco_nominal"], name="Nominal", line=dict(color="#2980b9"),
                       legendgroup="nominal", showlegend=(i == 1)),
            row=i, col=1,
        )
        fig.add_trace(
            go.Scatter(x=g["ano_mes"], y=g["preco_real"], name="Real (preços de hoje)",
                       line=dict(color="#c0392b", dash="dot"), legendgroup="real", showlegend=(i == 1)),
            row=i, col=1,
        )
        _linha_corte(fig, row=i, col=1)
    fig.update_layout(
        title="Preço médio nacional de combustíveis — nominal vs. real (deflacionado pelo IPCA)<br>"
              "<sup>Linha tracejada vertical = início do governo Lula (jan/2023)</sup>",
        height=280 * len(PRODUTOS_COMBUSTIVEL),
        template="plotly_white",
    )
    return fig


def grafico_combustiveis_vs_brent_cambio(df: pd.DataFrame) -> go.Figure:
    d = df[(df["regiao"] == "BR") & (df["produto"].isin(["GASOLINA", "DIESEL S10"]))].copy()
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    for produto, cor in [("GASOLINA", "#2980b9"), ("DIESEL S10", "#27ae60")]:
        g = d[d["produto"] == produto].sort_values("ano_mes")
        base = g["preco_nominal"].iloc[0]
        fig.add_trace(
            go.Scatter(x=g["ano_mes"], y=g["preco_nominal"] / base * 100, name=f"{NOMES_PRODUTO[produto]} (índice)",
                       line=dict(color=cor)),
            secondary_y=False,
        )
    brent = d.drop_duplicates("ano_mes").sort_values("ano_mes")
    base_brent = brent["brent_brl_bbl"].iloc[0]
    fig.add_trace(
        go.Scatter(x=brent["ano_mes"], y=brent["brent_brl_bbl"] / base_brent * 100,
                   name="Brent em R$ (índice)", line=dict(color="#8e44ad", dash="dash")),
        secondary_y=False,
    )
    base_cambio = brent["cambio_usd_brl"].iloc[0]
    fig.add_trace(
        go.Scatter(x=brent["ano_mes"], y=brent["cambio_usd_brl"] / base_cambio * 100,
                   name="Câmbio USD/BRL (índice)", line=dict(color="#f39c12", dash="dot")),
        secondary_y=False,
    )
    _linha_corte(fig)
    fig.update_layout(
        title="Combustíveis vs. Brent (em reais) vs. câmbio — todos indexados a 100 no início da série<br>"
              "<sup>Mostra quanto da variação do preço doméstico acompanha fatores internacionais</sup>",
        template="plotly_white",
        height=550,
        yaxis_title="Índice (mês inicial = 100)",
    )
    return fig


def grafico_cesta_basica(df: pd.DataFrame) -> go.Figure:
    itens = sorted(df["item"].unique())
    fig = make_subplots(
        rows=len(itens), cols=1,
        subplot_titles=itens,
        shared_xaxes=True,
        vertical_spacing=0.035,
    )
    for i, item in enumerate(itens, start=1):
        g = df[df["item"] == item].sort_values("ano_mes")
        fig.add_trace(
            go.Scatter(x=g["ano_mes"], y=g["indice_relativo"], name="Nominal", line=dict(color="#2980b9"),
                       legendgroup="nominal", showlegend=(i == 1)),
            row=i, col=1,
        )
        fig.add_trace(
            go.Scatter(x=g["ano_mes"], y=g["indice_relativo_real"], name="Real (deflacionado)",
                       line=dict(color="#c0392b", dash="dot"), legendgroup="real", showlegend=(i == 1)),
            row=i, col=1,
        )
        _linha_corte(fig, row=i, col=1)
    fig.update_layout(
        title="Itens da cesta básica — índice de preço relativo (base 100 = jan/2019)<br>"
              "<sup>NÃO é preço em R$: é o índice oficial do IBGE encadeado a partir da variação mensal do IPCA "
              "por item. Linha tracejada = início do governo Lula (jan/2023)</sup>",
        height=260 * len(itens),
        template="plotly_white",
    )
    return fig


def grafico_resumo_variacao_periodo(resumo_comb: pd.DataFrame, resumo_cesta: pd.DataFrame) -> go.Figure:
    comb_br = resumo_comb[resumo_comb["regiao"] == "BR"].copy()
    comb_br["rotulo"] = comb_br["produto"].map(NOMES_PRODUTO)
    cesta = resumo_cesta.copy()
    cesta["rotulo"] = cesta["item"]

    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=["Combustíveis", "Cesta básica"],
        horizontal_spacing=0.12,
    )
    for periodo, cor in CORES_PERIODO.items():
        g = comb_br[comb_br["periodo"] == periodo]
        fig.add_trace(
            go.Bar(x=g["rotulo"], y=g["variacao_pct_real_periodo"], name=periodo, marker_color=cor, legendgroup=periodo),
            row=1, col=1,
        )
        g2 = cesta[cesta["periodo"] == periodo]
        fig.add_trace(
            go.Bar(x=g2["rotulo"], y=g2["variacao_pct_real_periodo"], name=periodo, marker_color=cor,
                   legendgroup=periodo, showlegend=False),
            row=1, col=2,
        )
    fig.update_layout(
        title="Variação percentual REAL (acima da inflação) do início ao fim de cada período de governo<br>"
              "<sup>Combustíveis: preço nacional médio. Cesta básica: índice relativo (ver limitações no README)</sup>",
        template="plotly_white",
        barmode="group",
        height=550,
        width=1100,
    )
    fig.update_xaxes(tickangle=-30)
    return fig


def main() -> None:
    ensure_dirs(OUTPUT_DIR)

    combustiveis = pd.read_csv(DATA_PROCESSED / "combustiveis_final.csv", parse_dates=["ano_mes"])
    cesta = pd.read_csv(DATA_PROCESSED / "cesta_basica_final.csv", parse_dates=["ano_mes"])
    resumo_comb = pd.read_csv(DATA_PROCESSED / "resumo_periodos_combustiveis.csv")
    resumo_cesta = pd.read_csv(DATA_PROCESSED / "resumo_periodos_cesta.csv")

    graficos = {
        "combustiveis_nacional_nominal_vs_real.html": grafico_combustiveis_nacional(combustiveis),
        "combustiveis_vs_brent_cambio.html": grafico_combustiveis_vs_brent_cambio(combustiveis),
        "cesta_basica_indice.html": grafico_cesta_basica(cesta),
        "resumo_variacao_por_periodo.html": grafico_resumo_variacao_periodo(resumo_comb, resumo_cesta),
    }
    for nome, fig in graficos.items():
        path = OUTPUT_DIR / nome
        fig.write_html(path, include_plotlyjs="cdn", config={"responsive": True})
        logger.info(f"Salvo: {path}")


if __name__ == "__main__":
    sys.exit(main())
