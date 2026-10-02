"""Custo de vida: como a leitura muda com outros agregadores das 11 séries (auditoria R3b, etapa 3).

    python docs/auditoria_custo_vida_agregadores.py

Somente leitura. Usa data/processed/analysis_results.json (valores de início e fim de cada série, por janela e
período, já calculados no pipeline) e baixa do SIDRA, só aqui, o peso mensal de cada subitem no IPCA (variável 66).
Nada é gravado no projeto.

Para cada agregador calcula o valor de cada período (variação real do início ao fim, em %), a diferença, a leitura
(tolerância da metodologia: 1,0 ponto), o efeito na síntese com pesos iguais e a grade de 10.626 combinações de pesos
das cinco dimensões, mantendo as outras quatro leituras como estão no pipeline.

Agregadores (todos sobre as mesmas séries, variação real do início ao fim da janela):
  A  mediana das 11 séries (método atual)
  B  média aritmética das 11 (relativos de preço: estimador de Carli)
  C  média geométrica das 11 (relativos de preço: estimador de Jevons, o agregado elementar sem pesos do Manual do IPC)
  D  mediana sem o diesel S10 (10 séries)  ·  D2  mediana sem o diesel (10 séries)
  E  diesel e S10 fundidos em uma série (mediana de 10 itens, com o diesel contado uma vez)
  F  mediana das medianas das duas categorias (combustíveis, alimentos)
  G  média das duas categorias (média de cada uma, depois média simples)
  H  igual peso por item do IPCA (diesel e S10 são o mesmo subitem; 10 itens), média
  I  média ponderada pelos pesos do IPCA (diesel contado uma vez), peso médio de jan/2020 ao último mês (o do pipeline)
  J  idem, pesos de dez/2022, jan/2019 e ago/2026 (sensibilidade ao mês do peso)
"""
from __future__ import annotations

import itertools
import json
import math
import statistics as st
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parents[1]
RES = json.loads((RAIZ / "data" / "processed" / "analysis_results.json").read_text(encoding="utf-8"))
DASH = json.loads((RAIZ / "data" / "processed" / "dashboard_data.json").read_text(encoding="utf-8"))
MET = json.loads((RAIZ / "data" / "processed" / "analysis_methodology.json").read_text(encoding="utf-8"))
TOL = MET["regras"]["tolerancia"]["variacao_pct"]
PER = ("Bolsonaro", "Lula")
COMB = ["GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"]
ALIM = ["Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído"]
# código do SIDRA (classificação 315) de cada subitem; diesel e S10 são o mesmo subitem do IPCA ("óleo diesel")
SIDRA = {"GASOLINA": "7657", "ETANOL": "7658", "DIESEL": "7659", "DIESEL S10": "7659", "GLP": "7482",
         "Arroz": "7173", "Feijão carioca": "12222", "Carne bovina (patinho)": "7295", "Leite longa vida": "12393",
         "Óleo de soja": "7385", "Café moído": "7392"}


def peso_ipca(mes: str) -> dict[str, float]:
    """Peso mensal do subitem no IPCA (SIDRA, variável 66), em %, para o mês AAAAMM."""
    tabela = "1419" if mes <= "201912" else "7060"
    codigos = sorted(set(SIDRA.values()))
    url = f"https://apisidra.ibge.gov.br/values/t/{tabela}/n1/1/v/66/p/{mes}/c315/{','.join(codigos)}"
    linhas = requests.get(url, timeout=60).json()[1:]
    por_cod = {l["D4C"]: float(l["V"]) for l in linhas}
    return {k: por_cod[c] for k, c in SIDRA.items()}


def valores(modo: str, metrica: str = "trajetoria") -> dict[str, dict[str, float]]:
    """Por série e período: variação real do início ao fim da janela (valores do pipeline) ou, em "nivel", o nível real
    médio da janela (base 100 = média dos dois períodos) menos 100, de modo que 1 + v/100 seja o nível relativo."""
    out = {}
    if metrica == "nivel":
        for l in RES["modos"][modo]["custo_vida_nivel_real"]["por_serie"]:
            out[l["id"]] = {p: l["nivel_medio"][p] - 100 for p in PER}
        return out
    for i in RES["indicadores"]:
        if i["id"] in COMB + ALIM and not i.get("excluido"):
            out[i["id"]] = {p: i[modo][p]["valor"] for p in PER}
    return out


def mediana(v, ids, p): return st.median(v[i][p] for i in ids)
def media(v, ids, p): return st.fmean(v[i][p] for i in ids)
def geo(v, ids, p): return (math.exp(st.fmean(math.log(1 + v[i][p] / 100) for i in ids)) - 1) * 100


def ponderada(v, pesos, ids, p):
    w = {i: pesos[i] for i in ids}
    return sum(v[i][p] * w[i] for i in ids) / sum(w.values())


def leitura(b: float, l: float) -> int:
    """+1 = menor variação real no período Lula (menor pressão), -1 = no período Bolsonaro, 0 = praticamente iguais."""
    return 0 if abs(l - b) < TOL else (1 if l < b else -1)


def grade(leit: dict[str, int]) -> tuple[int, int, int]:
    ids = [d["id"] for d in MET["dimensoes"] if d["tipo"] == "A"]
    c = {1: 0, -1: 0, 0: 0}
    for corte in itertools.combinations(range(24), 4):
        pesos = [b - a - 1 for a, b in zip((-1, *corte), (*corte, 24))]
        s = sum(5 * p * leit[k] for p, k in zip(pesos, ids))
        c[(s > 0) - (s < 0)] += 1
    return c[1], c[-1], c[0]


def main() -> None:
    # peso usado no pipeline: média mensal de jan/2020 ao último mês (estrutura POF 2017-2018); e três meses isolados, como sensibilidade
    media_2020 = {item.replace("DIESEL", "DIESEL"): st.fmean(v for m, v in serie.items() if m >= "2020-01-01") for item, serie in DASH["ipca_pesos"].items()}
    media_2020["DIESEL S10"] = media_2020["DIESEL"]
    pesos = {"média jan/2020+": media_2020, "dez/2022": peso_ipca("202212"), "jan/2019": peso_ipca("201901"), "ago/2026": peso_ipca("202608")}
    for modo, metrica in itertools.product(("completo", "mesmo_tempo"), ("trajetoria", "nivel")):
        v = valores(modo, metrica)
        outras = {d["id"]: d["leitura"] for d in RES["modos"][modo]["dimensoes"] if d.get("leitura") is not None}
        itens10 = [i for i in COMB + ALIM if i != "DIESEL S10"]  # diesel e S10 = um subitem
        v_fund = {**v, "DIESEL": {p: st.fmean([v["DIESEL"][p], v["DIESEL S10"][p]]) for p in PER}}
        alt = {
            "A mediana das 11 (atual)": lambda p: mediana(v, COMB + ALIM, p),
            "B média aritmética das 11 (Carli)": lambda p: media(v, COMB + ALIM, p),
            "C média geométrica das 11 (Jevons)": lambda p: geo(v, COMB + ALIM, p),
            "D mediana sem o diesel S10 (10)": lambda p: mediana(v, [i for i in COMB + ALIM if i != "DIESEL S10"], p),
            "D2 mediana sem o diesel (10)": lambda p: mediana(v, [i for i in COMB + ALIM if i != "DIESEL"], p),
            "E diesel e S10 fundidos, mediana (10)": lambda p: mediana(v_fund, itens10, p),
            "F mediana das medianas das categorias": lambda p: st.median([mediana(v, COMB, p), mediana(v, ALIM, p)]),
            "G média das médias das categorias": lambda p: st.fmean([media(v, COMB, p), media(v, ALIM, p)]),
            "H igual peso por item do IPCA (10), média": lambda p: media(v_fund, itens10, p),
            "I média ponderada, pesos IPCA médios jan/2020+ (pipeline)": lambda p: ponderada(v_fund, pesos["média jan/2020+"], itens10, p),
            "J média ponderada, pesos IPCA dez/2022": lambda p: ponderada(v_fund, pesos["dez/2022"], itens10, p),
            "J média ponderada, pesos IPCA jan/2019": lambda p: ponderada(v_fund, pesos["jan/2019"], itens10, p),
            "J média ponderada, pesos IPCA ago/2026": lambda p: ponderada(v_fund, pesos["ago/2026"], itens10, p),
        }
        rot = "variação real do início ao fim, em %" if metrica == "trajetoria" else "nível real médio menos 100, em pontos"
        print(f"\n== Janela {modo}, métrica {metrica} ({rot}; leitura: Lula = menor valor)")
        print(f"{'agregador':44s} {'Bolsonaro':>10s} {'Lula':>9s} {'dif L-B':>9s}  leitura  síntese(iguais)  grade L/B/E")
        for nome, f in alt.items():
            b, l = f("Bolsonaro"), f("Lula")
            lt = leitura(b, l)
            leit = {**outras, "custo_vida": lt}
            soma = sum(leit.values())  # pesos iguais (20 cada), o sinal é o mesmo da soma de sentidos
            g = grade(leit)
            print(f"{nome:44s} {b:10.2f} {l:9.2f} {l - b:9.2f}  {({1: 'Lula', -1: 'Bolsonaro', 0: 'igual'})[lt]:9s} {soma:+d}/5            {g[0]}/{g[1]}/{g[2]}")
    # pesos e correlações
    print("\nPesos do IPCA (%) usados:")
    for mes, w in pesos.items():
        print(f"  {mes}: " + ", ".join(f"{k} {w[k]:.2f}" for k in ['GASOLINA', 'ETANOL', 'DIESEL', 'GLP', *ALIM]))
    corr = {}
    ser = {i["id"]: {x["iso"]: x["v"] for x in i["serie"]} for i in RES["indicadores"] if i["id"] in COMB}
    meses = sorted(set.intersection(*[set(s) for s in ser.values()]))

    def var(i):
        return [ser[i][b] / ser[i][a] - 1 for a, b in zip(meses, meses[1:])]

    def pearson(a, b):
        ma, mb = st.fmean(a), st.fmean(b)
        return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))

    print("\nCorrelação das variações mensais reais (combustíveis, série oficial da ANP):")
    for a, b in itertools.combinations(COMB, 2):
        print(f"  {a} x {b}: {pearson(var(a), var(b)):.2f}")


if __name__ == "__main__":
    main()
