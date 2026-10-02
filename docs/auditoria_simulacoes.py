"""Simulações da auditoria acadêmica (somente leitura: não altera dados, código nem JSON do projeto).

Reproduz os números atuais de data/processed/analysis_results.json e testa alternativas metodológicas.
Uso:  python docs/auditoria_simulacoes.py
Requer rede apenas para baixar o IPCA de 2018 e os pesos do IPCA (SIDRA).
"""
from __future__ import annotations

import itertools
import json
import statistics as st
from pathlib import Path

import pandas as pd
import requests

RAIZ = Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed"
D = json.loads((P / "dashboard_data.json").read_text(encoding="utf-8"))
R = json.loads((P / "analysis_results.json").read_text(encoding="utf-8"))
PROD = D["produtos"]
IPCA_REF = R["salario_real_referencia"]["ipca_indice"]
FUELS = ["GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"]
FOODS = [k for k in PROD if k in ("Arroz", "Café moído", "Carne bovina (patinho)", "Feijão carioca", "Leite longa vida", "Óleo de soja")]
PER = ("Bolsonaro", "Lula")
sgn = lambda v: (v > 0) - (v < 0)


def serie(prod, campo, periodo, f=None):
    out = {}
    for r in PROD[prod]["serie_mensal"]:
        if r.get("periodo") == periodo:
            v = f(r) if f else r.get(campo)
            if v is not None:
                out[r["ano_mes"]] = float(v)
    return out


def var(s):  # variação % do início ao fim da janela
    ks = sorted(s)
    return (s[ks[-1]] / s[ks[0]] - 1) * 100


def real(prod):
    return {p: serie(prod, "preco_real" if prod in FUELS else "indice_relativo_real", p) for p in PER}


def leitura(b, l, tol):
    return 0 if abs(l - b) < tol else (1 if l > b else -1)


# ---------------------------------------------------------------- base (reprodução)
def reproduz():
    print("== Reprodução do resultado atual (completo)")
    for d in R["modos"]["completo"]["dimensoes"]:
        print(" ", d["id"], d.get("leitura"))


# ---------------------------------------------------------------- S1 IPCA 12m com 2019
def ipca_12m_com_2019():
    r = requests.get("https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/2266/p/201801-201812", timeout=60).json()[1:]
    old = {pd.Timestamp(x["D3C"] + "01"): float(x["V"]) for x in r}
    atual = pd.read_csv(P / "ipca_geral_mensal.csv", parse_dates=["ano_mes"]).set_index("ano_mes")["ipca_indice"].to_dict()
    todo = {**old, **atual}
    s = pd.Series(todo).sort_index()
    v12 = (s / s.shift(12) - 1) * 100
    b_atual = v12["2020-01-01":"2022-12-01"].mean()
    b_2019 = v12["2019-01-01":"2022-12-01"].mean()
    l = v12["2023-01-01":].mean()
    print("== S1 IPCA 12m: Bolsonaro jan/20-dez/22 = %.2f | jan/19-dez/22 = %.2f | Lula jan/23-ago/26 = %.2f" % (b_atual, b_2019, l))
    # igual duração: 44 meses
    b44 = v12["2019-01-01":"2022-08-01"].mean()
    l44 = v12["2023-01-01":"2026-08-01"].mean()
    print("   igual duração (44m): Bolsonaro jan/19-ago/22 = %.2f | Lula = %.2f" % (b44, l44))
    print("   média anual 2019: %.2f (dez/19 acum.)" % v12["2019-12-01"])
    return b_2019, l


# ---------------------------------------------------------------- S2 PIB
def pib():
    anos = {r["ano"]: r["taxa_aa"] for r in PROD["PIB"]["serie_mensal"] if r["ano"] >= 2019 and r.get("taxa_aa") is not None}
    print("== S2 PIB anual:", anos)

    def aritm(a):
        return sum(a) / len(a)

    def geom(a):
        f = 1
        for x in a:
            f *= 1 + x / 100
        return (f ** (1 / len(a)) - 1) * 100

    for nome, (b, l) in {"completo": ([2019, 2020, 2021, 2022], [2023, 2024, 2025]), "3 anos": ([2019, 2020, 2021], [2023, 2024, 2025])}.items():
        vb, vl = [anos[a] for a in b], [anos[a] for a in l]
        print("  %s: média aritmética B=%.2f L=%.2f | média geométrica (CAGR) B=%.2f L=%.2f | mediana B=%.2f L=%.2f" %
              (nome, aritm(vb), aritm(vl), geom(vb), geom(vl), st.median(vb), st.median(vl)))
    return anos


# ---------------------------------------------------------------- S3 custo de vida
def pesos_ipca():
    cods = {"Arroz": "7173", "Feijão carioca": "12222", "Carne bovina (patinho)": "7295", "Leite longa vida": "12393", "Óleo de soja": "7385",
            "Café moído": "7392", "GASOLINA": "7657", "ETANOL": "7658", "DIESEL": "7659", "DIESEL S10": "7659", "GLP": "7482"}
    w = {}
    for k, c in cods.items():
        r = requests.get(f"https://apisidra.ibge.gov.br/values/t/7060/n1/1/v/66/p/202212/c315/{c}", timeout=60).json()
        w[k] = float(r[1]["V"])
    return w


def custo_vida():
    rr = {p: {} for p in PER}
    for prod in FUELS + FOODS:
        s = real(prod)
        for p in PER:
            rr[p][prod] = var(s[p])
    print("== S3 Custo de vida — variação real por série (completo)")
    for k in FUELS + FOODS:
        print("   %-24s B=%7.2f  L=%7.2f" % (k, rr["Bolsonaro"][k], rr["Lula"][k]))
    f = {p: {k: -v for k, v in rr[p].items()} for p in PER}  # f = -variação
    res = {}

    def med(keys):
        return {p: st.median([f[p][k] for k in keys]) for p in PER}

    esquemas = {
        "atual: mediana das 11": med(FUELS + FOODS),
        "sem Diesel S10 (10 séries)": med([k for k in FUELS + FOODS if k != "DIESEL S10"]),
        "sem Diesel e S10 (9 séries)": med([k for k in FUELS + FOODS if k not in ("DIESEL", "DIESEL S10")]),
        "só alimentos (6)": med(FOODS),
        "só combustíveis (5)": med(FUELS),
    }
    media = lambda keys: {p: st.fmean([f[p][k] for k in keys]) for p in PER}
    esquemas["média simples das 11"] = media(FUELS + FOODS)
    esquemas["média dos dois grupos (combust. 4 + alim. 6, mediana de cada)"] = {
        p: (st.median([f[p][k] for k in FUELS if k != "DIESEL S10"]) + st.median([f[p][k] for k in FOODS])) / 2 for p in PER}
    try:
        w = pesos_ipca()
        w9 = dict(w)
        w9["DIESEL S10"] = 0  # mesmo subitem IPCA que o diesel
        tot = sum(w9.values())
        esquemas["média ponderada pelos pesos do IPCA (dez/22)"] = {p: sum(w9[k] * f[p][k] for k in w9) / tot for p in PER}
        print("   pesos IPCA (%):", {k: round(v, 2) for k, v in w.items()})
    except Exception as e:  # sem rede
        print("   (pesos IPCA indisponíveis:", e, ")")
    for nome, m in esquemas.items():
        print("   %-62s f_B=%7.2f f_L=%7.2f -> %s" % (nome, m["Bolsonaro"], m["Lula"], {1: "Lula", -1: "Bolsonaro", 0: "igual"}[leitura(m["Bolsonaro"], m["Lula"], 1.0)]))
    # correlação entre as variações mensais reais (série inteira)
    mat = {}
    for prod in FUELS + FOODS:
        s = real(prod)
        ss = pd.Series({**s["Bolsonaro"], **s["Lula"]}).sort_index()
        mat[prod] = ss.pct_change()
    c = pd.DataFrame(mat).corr()
    print("   correlação das variações mensais reais (combustíveis):")
    print(c.loc[FUELS, FUELS].round(2).to_string())
    return esquemas


# ---------------------------------------------------------------- S4 renda
def renda():
    # salário mínimo: série própria (BCB SGS 1619 + IPCA), com todos os meses, a partir da metodologia 1.4.0
    sm_real = {p: {r["ano_mes"]: r["salario_minimo"] * IPCA_REF / r["ipca_indice"] for r in D["salario_minimo_serie"] if r["periodo"] == p} for p in PER}
    sm_gas = {p: serie("GASOLINA", "unidades_por_salario_minimo", p) for p in PER}
    gas_real = real("GASOLINA")
    print("== S4 Renda")
    for nome, s in (("SM real", sm_real), ("SM em litros de gasolina", sm_gas), ("preço real da gasolina", gas_real)):
        print("   %-28s B=%7.2f  L=%7.2f" % (nome, var(s["Bolsonaro"]), var(s["Lula"])))
    # identidade: litros = SM nominal / preço nominal = SM real / preço real
    k = "2023-05-01"
    r = next(x for x in PROD["GASOLINA"]["serie_mensal"] if x["ano_mes"] == k)
    print("   identidade litros = SM_real / preço_real  (", k, "):", round(r["salario_minimo"] / r["preco_nominal"], 3), "=",
          round((r["salario_minimo"] * IPCA_REF / r["ipca_indice"]) / r["preco_real"], 3))
    b, l = var(sm_real["Bolsonaro"]), var(sm_real["Lula"])
    print("   só SM real: B=%.2f L=%.2f -> %s" % (b, l, {1: "Lula", -1: "Bolsonaro", 0: "igual"}[leitura(b, l, 1.0)]))
    # igual duração (44 meses)
    for nome, s in (("SM real", sm_real), ("SM litros", sm_gas)):
        # janela de CALENDÁRIO (meses 1 a 44 de cada mandato), não "as 44 primeiras observações": a série da gasolina
        # não tem set/2020 e contar observações deslocaria o fim da janela do período Bolsonaro em um mês (etapa 3, E11)
        w = {p: _recorta(s[p], p, 44) for p in PER}
        print("   (44m, calendário) %-10s B=%7.2f L=%7.2f" % (nome, var(w["Bolsonaro"]), var(w["Lula"])))


# ---------------------------------------------------------------- S5 pontos de partida e métrica
def metricas_alternativas():
    print("== S5 Variação real: início da janela vs base dez/anterior vs nível médio real")
    for prod in FUELS + FOODS:
        s = real(prod)
        b_ini, b_fim = var(s["Bolsonaro"]), None
        # base dez/2022 para Lula (último mês do período anterior)
        dez22 = s["Bolsonaro"][max(s["Bolsonaro"])]
        l_fim = s["Lula"][max(s["Lula"])]
        l_alt = (l_fim / dez22 - 1) * 100
        mb, ml = st.fmean(s["Bolsonaro"].values()), st.fmean(s["Lula"].values())
        print("   %-24s Lula atual=%7.2f | base dez/22=%7.2f | nível médio real L/B-1 = %7.2f%%" % (prod, var(s["Lula"]), l_alt, (ml / mb - 1) * 100))


# ---------------------------------------------------------------- S6 robustez ampliada
def robustez_ampliada(anos, ipca_b19, ipca_l):
    """Varia, além dos pesos, as escolhas de construção de cada dimensão e conta quantas configurações apontam para cada lado."""
    esq = custo_vida_leituras()
    leit_cv = set(esq)  # leituras possíveis de custo de vida
    # inflação: com/sem 2019
    leit_inf = {leitura(-6.95, -4.61, 0.1), leitura(-ipca_b19, -ipca_l, 0.1)}
    # renda: só SM real / ambos
    leit_renda = {1, 0}
    # atividade: média aritmética/geom/mediana
    leit_pib = {1}
    print("== S6 leituras possíveis por dimensão sob escolhas alternativas:", {"custo_vida": leit_cv, "inflacao": leit_inf, "renda": leit_renda, "trabalho": {1}, "atividade": leit_pib})
    n = {1: 0, -1: 0, 0: 0}
    for cv, inf, rd, tb, at in itertools.product(leit_cv, leit_inf, leit_renda, {1}, leit_pib):
        n[sgn(cv + inf + rd + tb + at)] += 1
    print("   configurações (pesos iguais):", n)


def custo_vida_leituras():
    rr = {p: {} for p in PER}
    for prod in FUELS + FOODS:
        s = real(prod)
        for p in PER:
            rr[p][prod] = -var(s[p])
    keys_sets = [FUELS + FOODS, [k for k in FUELS + FOODS if k != "DIESEL S10"], FOODS, [k for k in FUELS if k != "DIESEL S10"]]
    return [leitura(st.median([rr["Bolsonaro"][k] for k in ks]), st.median([rr["Lula"][k] for k in ks]), 1.0) for ks in keys_sets]


# ---------------------------------------------------------------- S7 grade de pesos (replica)
def grade():
    leit = {d["id"]: d["leitura"] for d in R["modos"]["completo"]["dimensoes"] if d.get("leitura") is not None}
    ids = list(leit)

    def comps(n, k):
        if k == 1:
            yield (n,)
            return
        for a in range(n + 1):
            for rest in comps(n - a, k - 1):
                yield (a, *rest)

    cont = {1: 0, -1: 0, 0: 0}
    tot = 0
    for w in comps(20, len(ids)):
        cont[sgn(sum(x * leit[k] for x, k in zip(w, ids)))] += 1
        tot += 1
    print("== S7 grade replicada:", tot, "combinações;", cont, "leituras:", leit)
    # contagem de séries (sem pesos)
    n_l = n_b = 0
    for i in R["indicadores"]:
        if i.get("excluido") or i["tipo"] != "A":
            continue
        c = i["completo"]
        f_b, f_l = c["Bolsonaro"]["f"], c["Lula"]["f"]
        if f_l > f_b:
            n_l += 1
        elif f_b > f_l:
            n_b += 1
    print("   séries Tipo A em que Lula tem f maior: %d | Bolsonaro: %d (contagem simples, sem tolerância)" % (n_l, n_b))


# ---------------------------------------------------------------- S8 sensibilidade à métrica (Custo de vida)
def custo_vida_metricas():
    """Custo de vida sob métricas alternativas: ponta a ponta (atual), pontas suavizadas (média de 6 meses) e nível médio real."""
    print("== S8 Custo de vida sob métricas alternativas (mediana das 11 séries; negativo = menor pressão)")
    ser = {k: real(k) for k in FUELS + FOODS}

    def ponta(s, n):
        ks = sorted(s)
        return st.fmean(s[k] for k in ks[:n]), st.fmean(s[k] for k in ks[-n:])

    metricas = {
        "ponta a ponta (atual)": lambda s: var(s),
        "pontas suavizadas (média 6 meses)": lambda s: (ponta(s, 6)[1] / ponta(s, 6)[0] - 1) * 100,
        "pontas suavizadas (média 12 meses)": lambda s: (ponta(s, 12)[1] / ponta(s, 12)[0] - 1) * 100,
    }
    for nome, fn in metricas.items():
        for keys, rot in ((FUELS + FOODS, "11 séries"), ([k for k in FUELS + FOODS if k != "DIESEL S10"], "10 séries")):
            b = st.median([fn(ser[k]["Bolsonaro"]) for k in keys])
            l = st.median([fn(ser[k]["Lula"]) for k in keys])
            print("   %-38s %-9s B=%7.2f L=%7.2f -> %s" % (nome, rot, b, l, {1: "Bolsonaro", -1: "Lula", 0: "igual"}[leitura(-b, -l, 1.0) * -1] if False else {1: "Lula", -1: "Bolsonaro", 0: "igual"}[leitura(-b, -l, 1.0)]))
    # nível médio real: razão Lula/Bolsonaro dos níveis médios (ambos em R$ de ago/2026 ou índice jan/2019=100 deflacionado)
    for keys, rot in ((FUELS + FOODS, "11 séries"), ([k for k in FUELS + FOODS if k != "DIESEL S10"], "10 séries")):
        razoes = [(st.fmean(ser[k]["Lula"].values()) / st.fmean(ser[k]["Bolsonaro"].values()) - 1) * 100 for k in keys]
        print("   nível médio real (Lula/Bolsonaro-1) %-9s mediana=%.2f%% -> %s" % (rot, st.median(razoes), "Lula mais caro" if st.median(razoes) > 1 else "Bolsonaro mais caro" if st.median(razoes) < -1 else "igual"))


# ---------------------------------------------------------------- S9 Custo de vida: trajetória x nível (lado a lado) + efeito na síntese
def _comps(n, k):
    if k == 1:
        yield (n,)
        return
    for a in range(n + 1):
        for rest in _comps(n - a, k - 1):
            yield (a, *rest)


def _grade(leit):
    cont = {1: 0, -1: 0, 0: 0}
    for w in _comps(20, len(leit)):
        cont[sgn(sum(x * l for x, l in zip(w, leit)))] += 1
    return cont


def _recorta(s, periodo, kmax):
    a0 = 2019 if periodo == "Bolsonaro" else 2023
    if kmax is None:
        return s
    return {k: v for k, v in s.items() if (int(k[:4]) - a0) * 12 + int(k[5:7]) <= kmax}


def custo_vida_lado_a_lado():
    print("== S9 Custo de vida: A = variação início→fim | B = nível real médio/mediano da janela (base 100 = média conjunta dos dois períodos)")
    outros = {"completo": {"inflacao": 1, "trabalho": 1, "atividade": 1}, "mesmo_tempo": {"inflacao": 1, "trabalho": 1, "atividade": 1}}
    renda_atual = {"completo": 0, "mesmo_tempo": 1}
    for modo, kmax in (("completo", None), ("mesmo_tempo", 44)):
        for rot, keys in (("11 séries (atual)", FUELS + FOODS), ("10 séries (sem S10)", [k for k in FUELS + FOODS if k != "DIESEL S10"])):
            A = {p: [] for p in PER}
            Bm = {p: [] for p in PER}
            Bd = {p: [] for p in PER}
            for k in keys:
                s = real(k)
                s = {p: _recorta(s[p], p, kmax) for p in PER}
                for p in PER:
                    A[p].append(var(s[p]))
                base = st.fmean(list(s["Bolsonaro"].values()) + list(s["Lula"].values()))
                for p in PER:
                    Bm[p].append(st.fmean(s[p].values()) / base * 100)
                    Bd[p].append(st.median(s[p].values()) / base * 100)
            mA = {p: st.median(A[p]) for p in PER}
            mBm = {p: st.median(Bm[p]) for p in PER}
            mBd = {p: st.median(Bd[p]) for p in PER}
            print("  [%s | %s]" % (modo, rot))
            print("    A variação %%:           B=%7.2f  L=%7.2f  dif(L-B)=%7.2f p.p. -> %s" % (mA["Bolsonaro"], mA["Lula"], mA["Lula"] - mA["Bolsonaro"], {1: "Lula", -1: "Bolsonaro", 0: "igual"}[leitura(-mA["Bolsonaro"], -mA["Lula"], 1.0)]))
            print("    B nível MÉDIO (base 100): B=%7.2f  L=%7.2f  dif(L-B)=%7.2f pts -> %s" % (mBm["Bolsonaro"], mBm["Lula"], mBm["Lula"] - mBm["Bolsonaro"], {1: "Lula", -1: "Bolsonaro", 0: "igual"}[leitura(-mBm["Bolsonaro"], -mBm["Lula"], 1.0)]))
            print("    B nível MEDIANO (b.100):  B=%7.2f  L=%7.2f  dif(L-B)=%7.2f pts -> %s" % (mBd["Bolsonaro"], mBd["Lula"], mBd["Lula"] - mBd["Bolsonaro"], {1: "Lula", -1: "Bolsonaro", 0: "igual"}[leitura(-mBd["Bolsonaro"], -mBd["Lula"], 1.0)]))
            for nome, m in (("A", mA), ("B-média", mBm), ("B-mediana", mBd)):
                cv = leitura(-m["Bolsonaro"], -m["Lula"], 1.0)
                for rot_r, rd in (("renda atual", renda_atual[modo]), ("renda só SM real", 1)):
                    leit = [cv, outros[modo]["inflacao"], rd, outros[modo]["trabalho"], outros[modo]["atividade"]]
                    g = _grade(leit)
                    soma = sum(leit)  # pesos iguais
                    print("      síntese %-9s | %-16s leituras=%s soma(iguais)=%+d/5 grade L/B/E=%d/%d/%d" % (nome, rot_r, leit, soma, g[1], g[-1], g[0]))
    # por que diferem: onde começa e termina cada janela em relação ao nível médio conjunto
    print("  Nível real do INÍCIO e do FIM de cada janela (base 100 = média conjunta), mediana das 11 séries (completo):")
    ini = {p: [] for p in PER}
    fim = {p: [] for p in PER}
    for k in FUELS + FOODS:
        s = real(k)
        base = st.fmean(list(s["Bolsonaro"].values()) + list(s["Lula"].values()))
        for p in PER:
            ks = sorted(s[p])
            ini[p].append(s[p][ks[0]] / base * 100)
            fim[p].append(s[p][ks[-1]] / base * 100)
    for p in PER:
        print("    %-9s início=%6.1f  fim=%6.1f" % (p, st.median(ini[p]), st.median(fim[p])))
    print("  Por série (completo): nível médio L/B-1 (%) e variação início→fim B / L")
    for k in FUELS + FOODS:
        s = real(k)
        print("    %-24s nível L/B-1=%7.2f | var B=%7.2f L=%7.2f" % (k, (st.fmean(s["Lula"].values()) / st.fmean(s["Bolsonaro"].values()) - 1) * 100, var(s["Bolsonaro"]), var(s["Lula"])))


if __name__ == "__main__":
    reproduz()
    b19, l = ipca_12m_com_2019()
    anos = pib()
    custo_vida()
    renda()
    metricas_alternativas()
    robustez_ampliada(anos, b19, l)
    grade()
    custo_vida_metricas()
    custo_vida_lado_a_lado()
