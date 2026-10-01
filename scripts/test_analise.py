"""Validações da análise entre períodos (roda depois de build_analise.py).

    .venv/Scripts/python scripts/test_analise.py

Sai com código 1 e lista o que falhou. Sem dependências além da stdlib.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from datetime import date

from common import DATA_PROCESSED, DATA_RAW

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
        n, k = 100 // g["passo"], len(dims_a)
        check(g["combinacoes"] == math.comb(n + k - 1, k - 1), f"{modo}: número de combinações da grade errado")
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


    # ---------------------------------------------------------------- v1.2: mercado de trabalho (PNAD Contínua)
    check(met["versao"] >= "1.2", "a dimensão Mercado de trabalho exige metodologia v1.2 ou mais nova")
    ordem_dims = [d["id"] for d in sorted(met["dimensoes"], key=lambda d: d["ordem"])]
    check(ordem_dims == ["custo_vida", "inflacao", "renda", "trabalho", "atividade", "mercados"], f"ordem das dimensões inesperada: {ordem_dims}")
    check(not any(x.lower().startswith("emprego") or "desemprego" in x.lower() for x in met["regras"]["fora_do_escopo"]), "emprego/desemprego consta como fora do escopo, mas agora está incluído")
    trab = {"DESOCUPACAO": ("menor", "media", "taxa_desocupacao", 6381, 4099), "SUBUTILIZACAO": ("menor", "media", "taxa_subutilizacao", 6441, 4118),
            "RENDIMENTO": ("maior", "variacao_pct", "rendimento_medio_real", 6390, 5933)}
    for cod, (direcao, metrica, campo, tabela, variavel) in trab.items():
        m = imeta[cod]
        check(m["dimensao"] == "trabalho" and m["tipo"] == "A", f"{cod}: dimensão/tipo errados")
        check(m["direcao"] == direcao and m["metrica"] == metrica and m["campo"] == campo, f"{cod}: direção, métrica ou campo diferem da metodologia")
        check(f"tabela {tabela}" in m["fonte"] and str(variavel) in m["fonte"], f"{cod}: fonte não cita tabela e variável do SIDRA")
    check(next(d for d in met["dimensoes"] if d["id"] == "trabalho").get("agregacao") == "por_serie", "trabalho deve agregar por série (unidades diferentes)")
    # a dimensão vale UM sentido na síntese, qualquer que seja o número de séries
    for c in met["cenarios"]:
        check(list(c["pesos"]).count("trabalho") == 1, f"cenário {c['id']}: trabalho deve aparecer uma vez")

    mt = dash.get("mercado_trabalho")
    check(bool(mt), "dashboard_data.json sem o bloco mercado_trabalho")
    if mt:
        hoje_m = hoje[:7]
        for cod, (direcao, metrica, campo, tabela, variavel) in trab.items():
            serie = mt["produtos"][cod]["serie_mensal"]
            meta_s = mt["produtos"][cod]["meta"]
            datas = [r["ano_mes"] for r in serie]
            check(datas == sorted(set(datas)), f"{cod}: datas duplicadas ou fora de ordem")
            check(all(d[:7] <= hoje_m for d in datas), f"{cod}: observação com data no futuro")
            check(meta_s["ultima_observacao"] == datas[-1][:4] + datas[-1][5:7], f"{cod}: última observação do status difere da série")
            check(meta_s["tabela_sidra"] == tabela and meta_s["variavel_sidra"] == variavel, f"{cod}: tabela/variável do status diferem")
            check(all(isinstance(r[campo], (int, float)) for r in serie), f"{cod}: valor não numérico na série")
            # nenhum mês preenchido: meses consecutivos ou ausentes (nunca repetição criada pelo projeto)
            for r in serie:
                d = r["ano_mes"]
                if d < "2019-03-01" or "2022-12-01" < d < "2023-03-01":
                    check(r["periodo"] is None, f"{cod}: trimestre que mistura períodos ({d}) recebeu período")
                elif d <= "2022-12-01":
                    check(r["periodo"] == "Bolsonaro", f"{cod}: {d} deveria ser Bolsonaro")
                else:
                    check(r["periodo"] == "Lula", f"{cod}: {d} deveria ser Lula")
        # conferência independente com a resposta bruta do IBGE (o cache data/raw/ não é versionado)
        bruto = DATA_RAW / "pnad"
        for cod, (direcao, metrica, campo, tabela, variavel) in trab.items():
            arq = bruto / f"sidra_{tabela}_{variavel}.json"
            if arq.exists():
                lin = json.loads(arq.read_text(encoding="utf-8"))[1:]
                ref = {l["D3C"]: float(l["V"]) for l in lin if l["D3C"] >= "201901" and l["V"] not in ("-", "..", "...", "X")}
                got = {r["ano_mes"][:4] + r["ano_mes"][5:7]: r[campo] for r in mt["produtos"][cod]["serie_mensal"]}
                check(got == ref, f"{cod}: série do dashboard difere da resposta bruta do IBGE")

    for modo, bloco in res["modos"].items():
        d = next(x for x in bloco["dimensoes"] if x["id"] == "trabalho")
        # votos recalculados aqui, direto dos valores das janelas
        votos = []
        for l in d["por_serie"]:
            i = next(x for x in res["indicadores"] if x["id"] == l["id"])
            sinal = 1 if imeta[l["id"]]["direcao"] == "maior" else -1
            fb, fl = i[modo]["Bolsonaro"]["valor"] * sinal, i[modo]["Lula"]["valor"] * sinal
            tol = met["regras"]["tolerancia"].get(imeta[l["id"]]["metrica"], 1.0)
            votos.append(0 if abs(fl - fb) < tol else (1 if fl > fb else -1))
            check(l["leitura"] == votos[-1], f"{modo}/{l['id']}: voto da série não confere")
        check(d["leitura"] == (sum(votos) > 0) - (sum(votos) < 0), f"{modo}/trabalho: leitura da dimensão não segue a soma dos votos")
        check(d["por_periodo"] is None, f"{modo}/trabalho: não pode haver mediana entre unidades diferentes")
        check(d["nivel_evidencia"] == "alta", f"{modo}/trabalho: nível de evidência deveria ser alta")
        # janelas: só trimestres inteiros dentro do período
        for cod in trab:
            i = next(x for x in res["indicadores"] if x["id"] == cod)
            check(i[modo]["Bolsonaro"]["inicio"] >= "2019-03-01" and i[modo]["Bolsonaro"]["fim"] <= "2022-12-01", f"{modo}/{cod}: janela Bolsonaro fora dos trimestres inteiros")
            check(i[modo]["Lula"]["inicio"] >= "2023-03-01", f"{modo}/{cod}: janela Lula inclui trimestre que mistura períodos")
            check(i["fonte_ultima"]["periodo_codigo"] == mt["produtos"][cod]["meta"]["ultima_observacao"], f"{cod}: última observação exposta difere da fonte")


    # ---------------------------------------------------------------- v1.2: contexto histórico (marcos de notícias)
    import re
    from urllib.parse import urlparse
    noticias = json.loads((DATA_PROCESSED / "noticias.json").read_text(encoding="utf-8"))["itens"]
    marcos_json = json.loads((DATA_PROCESSED.parent / "news" / "marcos.json").read_text(encoding="utf-8"))
    marcos = [n for n in noticias if n.get("marco")]
    check(len(marcos) == len(marcos_json), f"marcos.json tem {len(marcos_json)} entradas e noticias.json, {len(marcos)}: há marco sem matéria verificada")
    check(len({n["url"] for n in marcos}) == len(marcos), "marco duplicado em noticias.json")
    causal = re.compile(r"\b(causou|causaram|provocou|provocaram|respons[aá]vel por|foi respons[aá]vel|explica sozinh[oa]|por causa d[eao]s?)\b", re.I)
    dominios = {"agenciabrasil.ebc.com.br", "agenciadenoticias.ibge.gov.br", "cnnbrasil.com.br", "poder360.com.br", "infomoney.com.br", "exame.com", "seudinheiro.com",
                "correiobraziliense.com.br", "www.bcb.gov.br", "bcb.gov.br", "www.gov.br", "www.planalto.gov.br"}
    for n in marcos:
        m = n["marco"]
        rot = n["url"][-60:]
        check(urlparse(n["url"]).scheme == "https", f"marco {rot}: URL sem https")
        check(re.sub(r"^www\.", "", urlparse(n["url"]).netloc) in {re.sub(r"^www\.", "", d) for d in dominios}, f"marco {rot}: domínio fora da lista de fontes aceitas ({urlparse(n['url']).netloc})")
        check("2019-01-01" <= n["data"] <= hoje, f"marco {rot}: data fora de 2019 até hoje ({n['data']})")
        check(set(m["dimensoes"]) <= dims, f"marco {rot}: dimensão inexistente")
        check(set(m["indicadores"]) <= set(ids), f"marco {rot}: indicador inexistente na metodologia")
        check(m["causalidade"] == "contexto", f"marco {rot}: causalidade deve ser 'contexto'")
        check(m["relevancia"] in ("alta", "media"), f"marco {rot}: relevância inválida")
        check(not causal.search(m["resumo"]), f"marco {rot}: resumo do projeto com linguagem causal")
        check(n.get("verificado_em"), f"marco {rot}: sem data de verificação")
        check(n.get("verificacao") in ("automatica", "manual"), f"marco {rot}: sem tipo de verificação")
    for d_ in dims:
        check(sum(1 for n in marcos if d_ in n["marco"]["dimensoes"]) >= 5, f"dimensão {d_}: menos de 5 marcos de contexto")
    # Arquivo pesquisável: nenhuma fonte curada foi perdida e todo item tem os metadados de filtro
    news_dir = DATA_PROCESSED.parent / "news"
    urls_curadas = {i["url"].strip() for f in sorted(news_dir.glob("raw_*.json")) for i in json.loads(f.read_text(encoding="utf-8")) if i.get("url")}
    urls_publicadas = {n["url"] for n in noticias}
    # ---------------------------------------------------------------- v1.2.1: salário mínimo real em R$ de uma data comum
    # recalculado por fora: salário nominal x IPCA do último mês disponível / IPCA do mês
    gas = dash["produtos"]["GASOLINA"]["serie_mensal"]
    com_ipca = [r for r in gas if r.get("ipca_indice")]
    ref = com_ipca[-1]
    check(res["salario_real_referencia"]["mes"] == ref["ano_mes"] and abs(res["salario_real_referencia"]["ipca_indice"] - ref["ipca_indice"]) < 1e-6,
          "mês-base do salário mínimo real não é o último mês com IPCA")
    sr = {x["iso"]: x["v"] for x in next(i for i in res["indicadores"] if i["id"] == "SALARIO_REAL")["serie"]}
    base = {r["ano_mes"]: r for r in gas if r.get("salario_minimo") and r.get("ipca_indice")}
    check(set(sr) <= set(base) and len(sr) > 0, "salário mínimo real tem mês sem salário nominal ou sem IPCA")
    for iso, v in sr.items():
        esperado = base[iso]["salario_minimo"] * ref["ipca_indice"] / base[iso]["ipca_indice"]
        check(abs(v - esperado) < 1e-6, f"salário mínimo real de {iso}: {v:.2f} != {esperado:.2f}")
    check(abs(sr[ref["ano_mes"]] - ref["salario_minimo"]) < 1e-6, "no mês-base o salário mínimo real deve ser igual ao nominal")
    check(all(v >= base[iso]["salario_minimo"] * 0.5 for iso, v in sr.items()), "salário mínimo real fora da ordem de grandeza do nominal (escala errada)")
    check("ipca_indice" not in imeta["SALARIO_REAL"]["unidade"] and "R$" in imeta["SALARIO_REAL"]["unidade"], "unidade do salário mínimo real deve ser R$ de uma data de referência")

    check(urls_curadas <= urls_publicadas, f"fonte curada ausente de noticias.json: {sorted(urls_curadas - urls_publicadas)[:3]}")
    check(len(urls_publicadas) == len(noticias), "URL duplicada em noticias.json")
    for n in noticias:
        rot = n["url"][-60:]
        check(isinstance(n.get("indicadores"), list) and isinstance(n.get("dimensoes"), list), f"item {rot}: sem indicadores/dimensoes (rode build_news.py ou --so-metadados)")
        check(set(n.get("dimensoes", [])) <= dims, f"item {rot}: dimensão fora do vocabulário")
        check(bool(n.get("titulo")) and bool(n.get("veiculo")) and bool(n.get("data")), f"item {rot}: título, veículo ou data ausente")
    check(any(n["data"] < "2020-01-01" for n in marcos), "nenhum marco de 2019")
    check(any(n["data"] >= "2026-01-01" for n in marcos), "nenhum marco de 2026")

    if falhas:
        print(f"{len(falhas)} falha(s):")
        for f in falhas:
            print(" -", f)
        sys.exit(1)
    print("análise: todas as validações passaram")


if __name__ == "__main__":
    main()
