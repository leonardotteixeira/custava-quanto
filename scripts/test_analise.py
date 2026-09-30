"""Validações da análise entre períodos (roda depois de build_analise.py).

    .venv/Scripts/python scripts/test_analise.py

Sai com código 1 e lista o que falhou. Sem dependências além da stdlib.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import date

from common import DATA_PROCESSED

falhas: list[str] = []


def check(cond: bool, msg: str) -> None:
    if not cond:
        falhas.append(msg)


def main() -> None:
    texto_met = (DATA_PROCESSED / "analysis_methodology.json").read_text(encoding="utf-8")
    met = json.loads(texto_met)
    res = json.loads((DATA_PROCESSED / "analysis_results.json").read_text(encoding="utf-8"))
    dash = json.loads((DATA_PROCESSED / "dashboard_data.json").read_text(encoding="utf-8"))
    imeta = {i["id"]: i for i in met["indicadores"]}
    hoje = date.today().isoformat()

    # versão e hash da metodologia
    check(bool(met.get("versao")), "metodologia sem versão")
    check(res["metodologia_versao"] == met["versao"], "resultado calculado com outra versão da metodologia")
    check(res["metodologia_sha256"] == hashlib.sha256(texto_met.encode("utf-8")).hexdigest(),
          "hash da metodologia não confere: resultado não foi gerado a partir do arquivo atual")

    # toda série do Tipo A tem direção; B e C não têm
    for i in met["indicadores"]:
        if i["tipo"] == "A":
            check(i.get("direcao") in ("maior", "menor"), f"{i['id']}: Tipo A sem direção definida")
        else:
            check(i.get("direcao") is None, f"{i['id']}: Tipo {i['tipo']} não pode ter direção (seria pontuado)")
    for cod in ("SELIC", "DOLAR", "IBOVESPA"):
        check(imeta[cod]["tipo"] == "B", f"{cod} deveria ser Tipo B (depende do contexto)")
    check(imeta["SELIC"]["metrica"] == "nivel", "Selic deve ser comparada em pontos percentuais (métrica 'nivel')")

    # cada indicador em exatamente uma dimensão, e sem duplicatas
    ids = [i["id"] for i in met["indicadores"]]
    check(len(ids) == len(set(ids)), "indicador duplicado na metodologia")
    dims = {d["id"] for d in met["dimensoes"]}
    check(all(i["dimensao"] in dims for i in met["indicadores"]), "indicador em dimensão inexistente")

    # pesos dos cenários: só dimensões Tipo A, somando 100
    dims_a = {d["id"] for d in met["dimensoes"] if d["tipo"] == "A"}
    for c in met["cenarios"]:
        check(set(c["pesos"]) == dims_a, f"cenário {c['id']}: pesos devem cobrir exatamente as dimensões Tipo A")
        check(sum(c["pesos"].values()) == 100, f"cenário {c['id']}: pesos não somam 100")

    for i in res["indicadores"]:
        if i.get("excluido"):
            continue
        m = imeta[i["id"]]
        mt, co = i.get("mesmo_tempo"), i["completo"]
        # mesmo tempo: mesma posição no mandato, mesmo número de observações
        if mt:
            check(mt["Bolsonaro"]["n"] == mt["Lula"]["n"], f"{i['id']}: mesmo tempo com número de observações diferente")
        for modo, s in (("mesmo_tempo", mt), ("completo", co)):
            if not s:
                continue
            b, l = s["Bolsonaro"], s["Lula"]
            # período certo
            check(b["inicio"] >= "2019-01-01" and b["fim"] <= "2022-12-31", f"{i['id']}/{modo}: janela Bolsonaro fora de jan/2019-dez/2022")
            check(l["inicio"] >= "2023-01-01", f"{i['id']}/{modo}: janela Lula começa antes de jan/2023")
            # nada no futuro
            check(l["fim"] <= hoje, f"{i['id']}/{modo}: dado com data no futuro ({l['fim']})")
            # f coerente com a direção
            sinal = {"maior": 1, "menor": -1}.get(m.get("direcao"))
            for p in (b, l):
                if sinal:
                    check(p["f"] == round(p["valor"] * sinal, 2), f"{i['id']}/{modo}: f não segue a direção definida")
                else:
                    check(p["f"] is None, f"{i['id']}/{modo}: Tipo {m['tipo']} recebeu leitura de direção")
        # custo de vida sempre pela variação REAL
        if m["dimensao"] == "custo_vida":
            check(m["campo"] in ("preco_real", "indice_relativo_real"), f"{i['id']}: custo de vida deve usar a série real")

    # PIB: só anos fechados; nenhum resultado anual inventado para o ano em curso
    pib = next(i for i in res["indicadores"] if i["id"] == "PIB")
    anos_fechados = {r["ano"] for r in dash["produtos"]["PIB"]["serie_mensal"] if r.get("taxa_aa") is not None}
    for modo in ("mesmo_tempo", "completo"):
        for p in ("Bolsonaro", "Lula"):
            s = pib[modo][p]
            check(int(s["fim"][:4]) in anos_fechados, f"PIB/{modo}/{p}: ano final sem resultado anual fechado")
    ult_tri = dash["produtos"]["PIB"].get("ultimo_trimestre") or {}
    if ult_tri:
        ano_tri = int(ult_tri["trimestre"][:4])
        if not ult_tri["trimestre"].endswith("T4"):
            check(ano_tri not in anos_fechados, f"PIB: {ano_tri} tem só trimestres mas aparece como ano fechado")

    # índices de alimentos marcados como índice (não R$)
    for i in met["indicadores"]:
        if i.get("campo") == "indice_relativo_real":
            check(i.get("indice") is True and "não é R$" in i["unidade"], f"{i['id']}: índice de alimento sem aviso de que não é R$")

    # nenhum texto gerado declara vencedor
    proibidas = ("venceu", "vencedor", "melhor governo", "pior governo", "campeão", "perdeu")
    for modo, blocoresult in res["modos"].items():
        tudo = json.dumps(blocoresult["textos"], ensure_ascii=False).lower()
        for p in proibidas:
            check(p not in tudo, f"{modo}: texto gerado contém '{p}'")
        # sensibilidade: um resultado por cenário predefinido
        check([s["id"] for s in blocoresult["sintese"]] == [c["id"] for c in met["cenarios"]], f"{modo}: cenários da síntese não batem com a metodologia")
        # mercados nunca entram na síntese
        merc = next(d for d in blocoresult["dimensoes"] if d["id"] == "mercados")
        check(merc.get("leitura") is None, f"{modo}: dimensão Mercados recebeu leitura de direção")

    # último dado: o fim do período Lula é o último mês da série
    ult_mes = max(dash["fotografia_mensal"])
    gas = next(i for i in res["indicadores"] if i["id"] == "GASOLINA")
    check(gas["completo"]["Lula"]["fim"] == ult_mes, f"Gasolina/completo: fim do período Lula ({gas['completo']['Lula']['fim']}) não é o último mês disponível ({ult_mes})")


    # ---------------------------------------------------------------- v1.1
    check(met["regras"].get("modo_principal") == "completo", "o modo principal deve ser a comparação por períodos inteiros ('completo')")
    check(set(met["regras"]["modos_nomes"]) == {"completo", "mesmo_tempo"}, "nomes dos dois modos ausentes na metodologia")
    check(set(met["regras"]["nivel_evidencia"]) >= {"alta", "média", "informativa", "regra"}, "regras de nível de evidência incompletas")
    for d in met["dimensoes"]:
        for campo in ("mede", "nao_mede", "pergunta") + (("criterio",) if d["tipo"] == "A" else ()):
            check(bool(d.get(campo)), f"dimensão {d['id']}: falta '{campo}' na metodologia")

    ordem = {"alta": 0, "média": 1}
    for modo, bloco in res["modos"].items():
        for d in bloco["dimensoes"]:
            dm = next(x for x in met["dimensoes"] if x["id"] == d["id"])
            # nível de evidência: informativa (tipo B) ou o menor nível de confiança entre as séries com direção
            if dm["tipo"] != "A":
                check(d["nivel_evidencia"] == "informativa", f"{modo}/{d['id']}: dimensão sem direção deve ser 'informativa'")
            else:
                confs = [i["confianca"] for i in met["indicadores"] if i["dimensao"] == d["id"] and i["tipo"] == "A"]
                esperado = max(confs, key=lambda c: ordem[c])
                check(d["nivel_evidencia"] == esperado, f"{modo}/{d['id']}: nível de evidência {d['nivel_evidencia']} != {esperado}")
                check(d["leitura"] in (-1, 0, 1), f"{modo}/{d['id']}: leitura inválida")
        # a síntese é a soma ponderada dos sentidos, recalculada aqui de forma independente
        leit = {d["id"]: d["leitura"] for d in bloco["dimensoes"] if d.get("leitura") is not None}
        for c, sr in zip(met["cenarios"], bloco["sintese"]):
            soma = sum(c["pesos"][k] * v for k, v in leit.items())
            check(sr["soma"] == soma, f"{modo}/{c['id']}: soma da síntese não confere")
            check(sr["sentido"] == (soma > 0) - (soma < 0), f"{modo}/{c['id']}: sentido da síntese não segue o sinal da soma")
        # grade de pesos: todas as combinações de 5 em 5 pontos, com soma consistente
        g = bloco["grade"]
        n = 100 // g["passo"]
        check(g["combinacoes"] == (n + 1) * (n + 2) * (n + 3) // 6, f"{modo}: número de combinações da grade errado")
        check(g["lula"] + g["bolsonaro"] + g["empate"] == g["combinacoes"], f"{modo}: grade não soma o total de combinações")
        # custo de vida: medianas de combustíveis e alimentos separadas
        cv = next(d for d in bloco["dimensoes"] if d["id"] == "custo_vida")
        check(cv["grupos"] and cv["grupos"]["combustiveis"]["n"] + cv["grupos"]["alimentos"]["n"] == cv["n_series"], f"{modo}: grupos de custo de vida não cobrem todas as séries")
        # sem-uma-série só para dimensões com 3+ séries
        for d in bloco["dimensoes"]:
            if d.get("sem_uma_serie"):
                check(d["sem_uma_serie"]["n"] == len([i for i in met["indicadores"] if i["dimensao"] == d["id"] and i["tipo"] == "A"]), f"{modo}/{d['id']}: sem_uma_serie com número errado de séries")
        # maiores movimentos coerentes com os números das séries
        mm = bloco["maiores_movimentos"]
        vals = [(i[modo][p]["valor"], i["id"], p) for i in res["indicadores"] if not i.get("excluido") and imeta[i["id"]]["tipo"] == "A"
                and imeta[i["id"]]["metrica"] == "variacao_pct" and i.get(modo) for p in ("Bolsonaro", "Lula") if i[modo][p]]
        check(mm["top_alta"][0]["valor"] == max(v[0] for v in vals), f"{modo}: maior alta não confere com as séries")
        check(mm["top_queda"][0]["valor"] == min(v[0] for v in vals), f"{modo}: maior queda não confere com as séries")
        # texto gerado: sem juízo de valor
        tudo = json.dumps(bloco["textos"], ensure_ascii=False).lower()
        for p_ in ("favorável", "desfavorável", "melhorou", "piorou"):
            check(p_ not in tudo, f"{modo}: texto gerado contém '{p_}'")

    # variação percentual recalculada a partir do valor inicial e final (séries sem dado diário nas pontas)
    for i in res["indicadores"]:
        if i.get("excluido") or imeta[i["id"]]["metrica"] != "variacao_pct":
            continue
        for modo in ("completo", "mesmo_tempo"):
            for p in ("Bolsonaro", "Lula"):
                sp = i[modo][p] if i.get(modo) else None
                if sp and sp.get("valor_inicio"):
                    check(abs(sp["valor"] - round((sp["valor_fim"] / sp["valor_inicio"] - 1) * 100, 2)) <= 0.01,
                          f"{i['id']}/{modo}/{p}: variação % não confere com valor inicial e final")

    # PIB: barras anuais começam em 2019, só anos fechados, sem 2026 anual
    anos_pib = res["pib"]["anos"]
    check(all(a["ano"] >= 2019 for a in anos_pib), "PIB: ano anterior a 2019 no bloco anual")
    check({a["ano"] for a in anos_pib} <= anos_fechados, "PIB: ano sem resultado anual fechado no bloco anual")
    check(all(a["periodo"] == ("Bolsonaro" if a["ano"] < 2023 else "Lula") for a in anos_pib), "PIB: ano atribuído ao período errado")
    check(all(int(t["trimestre"][:4]) > res["pib"]["ultimo_ano_fechado"] for t in res["pib"]["trimestres_sem_resultado_anual"]),
          "PIB: trimestre de ano fechado listado como 'sem resultado anual'")

    # janela que muda a leitura: só as dimensões cuja leitura difere entre os modos
    diferem = {a["id"] for a, b in zip(res["modos"]["completo"]["dimensoes"], res["modos"]["mesmo_tempo"]["dimensoes"])
               if a.get("leitura") is not None and a["leitura"] != b["leitura"]}
    check({x["id"] for x in (res.get("janela_muda") or {}).get("dimensoes", [])} == diferem, "janela_muda não confere com as leituras dos dois modos")

    if falhas:
        print(f"{len(falhas)} falha(s):")
        for f in falhas:
            print(" -", f)
        sys.exit(1)
    print("análise: todas as validações passaram")


if __name__ == "__main__":
    main()
