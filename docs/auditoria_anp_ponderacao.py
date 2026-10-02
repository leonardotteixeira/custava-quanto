"""Por que a média simples das coletas da ANP difere da série nacional oficial (auditoria R6).

    python docs/auditoria_anp_ponderacao.py

Somente leitura do projeto. Precisa do cache de dados brutos por posto (`data/raw/anp/`, gerado por
`scripts/download_anp.py`, não versionado) e baixa, para `data/raw/anp/vendas/`, três arquivos oficiais da ANP:
  - a série mensal nacional oficial (mensal-brasil-desde-jan2013.xlsx);
  - vendas mensais por UF (vendas-combustiveis-m3-1990-2025.csv);
  - vendas anuais por município de etanol hidratado e de gasolina C.

Pergunta: a diferença (+6,5% em média no etanol) vem da amostra, do produto, do calendário ou da ponderação?

Método: reproduz a média mensal de cada produto a partir dos preços por posto de várias formas e compara com a série oficial.
  M0  média simples de todas as coletas (o que o projeto calculava até a metodologia 1.3.0)
  M3  média simples dos preços médios municipais (cada município pesa igual)
  M4  média simples dos preços médios das UFs (cada UF pesa igual)
  M1  preços médios por UF ponderados pelas vendas mensais de cada UF
  M5  preço médio municipal ponderado pelas vendas anuais do município, depois UF ponderada pelas vendas mensais da UF
      (é o que a ANP diz fazer: média municipal, ponderada por vendas nos níveis estadual, regional e nacional)
Também compara o número de coletas do projeto com o "número de postos pesquisados" do arquivo oficial.
"""
from __future__ import annotations

import glob
import os
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
import requests

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw" / "anp"
VENDAS = RAW / "vendas"
BASE = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/vdpb"
URLS = {
    "oficial.xlsx": "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/mensal/mensal-brasil-desde-jan2013.xlsx",
    "vendas_uf_m3.csv": f"{BASE}/vendas-derivados-petroleo-e-etanol/vendas-combustiveis-m3-1990-2025.csv",
    "vendas_mun_etanol.csv": f"{BASE}/vaehdpm/etanol-hidratado/vendas-anuais-de-etanol-hidratado-por-municipio.csv",
    "vendas_mun_gasolina.csv": f"{BASE}/vaehdpm/gasolina-c/vendas-anuais-de-gasolina-c-por-municipio.csv",
}
UF = {"ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA", "CEARA": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "GOIAS": "GO",
      "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG", "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR", "PERNAMBUCO": "PE",
      "PIAUI": "PI", "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", "RONDONIA": "RO", "RORAIMA": "RR", "SANTA CATARINA": "SC",
      "SAO PAULO": "SP", "SERGIPE": "SE", "TOCANTINS": "TO"}
PRODUTOS = {"ETANOL": ("ETANOL HIDRATADO", "ETANOL HIDRATADO", "vendas_mun_etanol.csv"), "GASOLINA": ("GASOLINA COMUM", "GASOLINA C", "vendas_mun_gasolina.csv")}


def norm(t) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", str(t)) if not unicodedata.combining(c)).upper().strip()


def baixar() -> None:
    VENDAS.mkdir(parents=True, exist_ok=True)
    for nome, url in URLS.items():
        destino = VENDAS / nome
        if not destino.exists() or destino.stat().st_size == 0:
            r = requests.get(url, timeout=180, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            destino.write_bytes(r.content)
            print(f"baixado {nome} ({len(r.content) / 1e6:.1f} MB)")


def coletas() -> pd.DataFrame:
    """Preços por posto de gasolina e etanol, de todos os arquivos brutos em cache."""
    arquivos = sorted(glob.glob(str(RAW / "ca" / "*.csv"))) + sorted(glob.glob(str(RAW / "dsan" / "*gasolina-etanol*.csv")))
    if not arquivos:
        sys.exit("sem cache de dados brutos da ANP: rode scripts/download_anp.py primeiro")
    partes = []
    for f in arquivos:
        for enc in ("utf-8-sig", "cp1252", "latin-1"):
            try:
                cab = pd.read_csv(f, sep=";", encoding=enc, nrows=0).columns
                break
            except UnicodeDecodeError:
                continue
        m = {c: {"regiao - sigla": "regiao", "estado - sigla": "uf", "municipio": "mun", "produto": "produto", "data da coleta": "data", "valor de venda": "preco"}[norm(c).lower()]
             for c in cab if norm(c).lower() in {"regiao - sigla", "estado - sigla", "municipio", "produto", "data da coleta", "valor de venda"}}
        d = pd.read_csv(f, sep=";", decimal=",", encoding=enc, usecols=list(m), dtype=str).rename(columns=m)
        d["produto"] = d["produto"].str.strip().str.upper()
        d = d[d["produto"].isin(PRODUTOS)]
        d["preco"] = pd.to_numeric(d["preco"].str.replace(",", "."), errors="coerce")
        d["data"] = pd.to_datetime(d["data"], format="%d/%m/%Y", errors="coerce")
        partes.append(d.dropna(subset=["preco", "data"]))
    df = pd.concat(partes, ignore_index=True)
    df["mes"] = df["data"].dt.to_period("M").dt.to_timestamp()
    df["mun_n"] = df["mun"].map(norm)
    return df


def main() -> None:
    baixar()
    df = coletas()
    of = pd.read_excel(VENDAS / "oficial.xlsx", header=None)
    linha = next(i for i in range(60) if str(of.iloc[i, 0]).strip().upper() == "MÊS")
    of = pd.read_excel(VENDAS / "oficial.xlsx", header=linha)
    of["MÊS"] = pd.to_datetime(of["MÊS"], errors="coerce")
    of = of.dropna(subset=["MÊS"])
    v = pd.read_csv(VENDAS / "vendas_uf_m3.csv", sep=";", encoding="utf-8-sig", decimal=",")
    v.columns = ["ano", "mes_nome", "regiao", "uf_nome", "produto", "vendas"]
    meses = dict(zip(["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"], range(1, 13)))
    v["mes"] = pd.to_datetime(dict(year=v["ano"], month=v["mes_nome"].map(meses), day=1))
    v["uf"] = v["uf_nome"].map(norm).map(UF)

    for prod, (nome_of, nome_v, arq_mun) in PRODUTOS.items():
        d = df[df["produto"] == prod]
        oo = of[of["PRODUTO"] == nome_of].set_index("MÊS")
        vm = pd.read_csv(VENDAS / arq_mun, sep=";", encoding="utf-8-sig", decimal=",")
        vm.columns = ["ano", "regiao", "uf", "produto", "cod", "mun", "vendas"]
        vm["mun"] = vm["mun"].map(norm)
        vs = v[v["produto"] == nome_v].groupby(["mes", "uf"])["vendas"].sum()
        linhas = []
        for mes, g in d.groupby("mes"):
            if mes not in oo.index:
                continue
            r = {"mes": mes, "oficial": oo.loc[mes, "PREÇO MÉDIO REVENDA"], "n_ratio": len(g) / oo.loc[mes, "NÚMERO DE POSTOS PESQUISADOS"]}
            r["M0"] = g["preco"].mean()
            pm = g.groupby(["uf", "mun_n"])["preco"].mean()
            pu = g.groupby("uf")["preco"].mean()
            r["M3"], r["M4"] = pm.mean(), pu.mean()
            w = vs.loc[mes].reindex(pu.index).fillna(0)
            r["M1"] = (pu * w).sum() / w.sum()
            pesos = vm[vm["ano"] == min(mes.year, int(vm["ano"].max()))].set_index(["uf", "mun"])["vendas"]
            gm = pm.rename("p").reset_index()
            gm["w"] = [pesos.get((a, b), np.nan) for a, b in zip(gm["uf"], gm["mun_n"])]
            gm = gm.dropna(subset=["w"])
            gm = gm[gm["w"] > 0]
            pu5 = gm.groupby("uf").apply(lambda x: (x["p"] * x["w"]).sum() / x["w"].sum(), include_groups=False)
            w5 = vs.loc[mes].reindex(pu5.index).fillna(0)
            r["M5"] = (pu5 * w5).sum() / w5.sum()
            linhas.append(r)
        t = pd.DataFrame(linhas).set_index("mes")
        print(f"\n== {prod}: {len(t)} meses; coletas do projeto / postos pesquisados oficiais: média {t['n_ratio'].mean():.3f} (mín. {t['n_ratio'].min():.2f}, máx. {t['n_ratio'].max():.2f})")
        for c, rot in (("M0", "média simples das coletas"), ("M3", "município com peso igual"), ("M4", "UF com peso igual"),
                       ("M1", "UF ponderada por vendas mensais"), ("M5", "município (vendas anuais) -> UF (vendas mensais)")):
            e = (t[c] / t["oficial"] - 1) * 100
            print(f"  {c} {rot:48s} diferença média {e.mean():+6.2f}%  |dif| média {e.abs().mean():5.2f}%  máx {e.abs().max():5.2f}%")

    d = df[(df["produto"] == "ETANOL") & (df["mes"].dt.year == 2022)]
    vv = v[(v["produto"] == "ETANOL HIDRATADO") & (v["mes"].dt.year == 2022)]
    print("\n== Etanol, 2022: participação nas coletas x nas vendas (por grande região) e preço médio simples da região")
    cole = d.groupby("regiao").size() / len(d)
    vend = (vv.groupby("regiao")["vendas"].sum() / vv["vendas"].sum())
    mapa = {"REGIÃO CENTRO-OESTE": "CO", "REGIÃO NORDESTE": "NE", "REGIÃO NORTE": "N", "REGIÃO SUDESTE": "SE", "REGIÃO SUL": "S"}
    for reg in ["N", "NE", "CO", "SE", "S"]:
        vend_reg = next((x for k, x in vend.items() if mapa.get(k) == reg), float("nan"))
        print(f"  {reg:3s} coletas {100 * cole.get(reg, 0):5.1f}%   vendas {100 * vend_reg:5.1f}%   preço médio {d[d['regiao'] == reg]['preco'].mean():.2f}")
    sp = d[d["uf"] == "SP"]
    vs_sp = vv[vv["uf"] == "SP"]["vendas"].sum() / vv["vendas"].sum()
    print(f"  SP  coletas {100 * len(sp) / len(d):5.1f}%   vendas {100 * vs_sp:5.1f}%   preço médio {sp['preco'].mean():.2f}   (Brasil, média simples: {d['preco'].mean():.2f})")


if __name__ == "__main__":
    main()
