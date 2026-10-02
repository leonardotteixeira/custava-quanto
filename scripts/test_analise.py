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
    # a série do salário mínimo é própria (BCB SGS 1619 + IPCA): não herda o buraco de set/2020 da gasolina
    gas = dash["salario_minimo_serie"]
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

    # ---------------------------------------------------------------- v1.3.0: auditoria metodológica (R1-R10)
    import csv
    import itertools
    import statistics

    check(met["versao"] >= "1.3", "as correções R1/R2/R7 exigem metodologia v1.3 ou mais nova")

    # R1: IPCA em 12 meses com cobertura completa. O número-índice começa 12 meses antes de jan/2019.
    ipca_idx = {r["ano_mes"][:7]: float(r["ipca_indice"]) for r in csv.DictReader(open(DATA_PROCESSED / "ipca_geral_mensal.csv", encoding="utf-8"))}
    meses_idx = sorted(ipca_idx)
    check(meses_idx[0] <= "2018-01", f"R1: o número-índice do IPCA deve começar em jan/2018 ou antes (começa em {meses_idx[0]})")
    check(len(meses_idx) == len(set(meses_idx)), "R1: mês duplicado no número-índice do IPCA")

    def _menos(m: str, n: int) -> str:
        t = int(m[:4]) * 12 + int(m[5:7]) - 1 - n
        return f"{t // 12}-{t % 12 + 1:02d}"

    ipca_serie = {r["ano_mes"][:7]: r["taxa_aa"] for r in dash["produtos"]["IPCA"]["serie_mensal"]}
    check(min(ipca_serie) == "2019-01", f"R1: o IPCA em 12 meses deve começar em jan/2019 (começa em {min(ipca_serie)})")
    for m_, v_ in ipca_serie.items():
        esperado = round((ipca_idx[m_] / ipca_idx[_menos(m_, 12)] - 1) * 100, 2)
        check(abs(v_ - esperado) <= 0.01, f"R1: IPCA em 12 meses de {m_}: {v_} != {esperado} (índice do mês / índice 12 meses antes)")
    check(all(f"{a}-{m:02d}" in ipca_serie for a in range(2019, 2026) for m in range(1, 13)), "R1: faltam meses de 2019 a 2025 no IPCA em 12 meses")
    ipca_res = next(i for i in res["indicadores"] if i["id"] == "IPCA")
    check(ipca_res["completo"]["Bolsonaro"]["n"] == 48 and ipca_res["completo"]["Bolsonaro"]["inicio"] == "2019-01-01", "R1: o período Bolsonaro do IPCA deve ter 48 meses desde jan/2019")
    mt_ = ipca_res["mesmo_tempo"]
    check(mt_["Bolsonaro"]["n"] == mt_["Lula"]["n"] == res["duracao"]["mesmo_tempo_meses"], "R1: janelas de mesma duração do IPCA com tamanhos diferentes")
    check(mt_["Bolsonaro"]["inicio"] == "2019-01-01" and mt_["Lula"]["inicio"] == "2023-01-01", "R1: a janela de igual duração do IPCA deve começar no mês 1 de cada mandato")
    media_b = statistics.fmean(v for m_, v in ipca_serie.items() if "2019-01" <= m_ <= "2022-12")
    check(abs(ipca_res["completo"]["Bolsonaro"]["media"] - media_b) < 1e-3, "R1: média do IPCA do período Bolsonaro não confere com a série")

    # R2: litros de gasolina por salário mínimo fora da síntese de Renda, mas ainda disponíveis como série à parte
    check(imeta["SM_GASOLINA"]["tipo"] == "C" and imeta["SM_GASOLINA"]["direcao"] is None, "R2: litros por salário mínimo deve ser informativo (Tipo C), sem voto em Renda")
    check(imeta["SALARIO_REAL"]["tipo"] == "A", "R2: o salário mínimo real deve continuar sendo a série com voto em Renda")
    for modo, bloco in res["modos"].items():
        renda = next(d for d in bloco["dimensoes"] if d["id"] == "renda")
        sm = next(i for i in res["indicadores"] if i["id"] == "SALARIO_REAL")[modo]
        check(renda["por_periodo"]["Bolsonaro"]["n"] == 1 and renda["por_periodo"]["Lula"]["n"] == 1, f"R2/{modo}: Renda deve ter uma série com direção")
        tol_ = met["regras"]["tolerancia"]["variacao_pct"]
        esperado = 0 if abs(sm["Lula"]["valor"] - sm["Bolsonaro"]["valor"]) < tol_ else (1 if sm["Lula"]["valor"] > sm["Bolsonaro"]["valor"] else -1)
        check(renda["leitura"] == esperado, f"R2/{modo}: leitura de Renda não segue só o salário mínimo real")
    gas_s = dash["produtos"]["GASOLINA"]["serie_mensal"]
    for r in gas_s:
        if r.get("salario_minimo") and r.get("preco_nominal"):
            check(abs(r["unidades_por_salario_minimo"] - r["salario_minimo"] / r["preco_nominal"]) <= 0.006 + 1e-4 * r["unidades_por_salario_minimo"], f"R2: litros por salário mínimo de {r['ano_mes']} não é salário/preço nominal")
            if r.get("preco_real") and r.get("ipca_indice"):
                sm_real_ = r["salario_minimo"] * ref["ipca_indice"] / r["ipca_indice"]
                check(abs(r["unidades_por_salario_minimo"] - sm_real_ / r["preco_real"]) <= 0.01 + 1e-4 * r["unidades_por_salario_minimo"], f"R2: litros em {r['ano_mes']} deveria ser igual ao salário real / preço real")
    check(next(i for i in res["indicadores"] if i["id"] == "SM_GASOLINA")["completo"]["Lula"]["valor"] is not None, "R2: a série de litros por salário mínimo continua calculada como indicador à parte")

    # R3a: a variação do início ao fim continua a leitura principal; o nível real é outra forma de olhar e não entra na síntese
    check("custo_vida" in met["regras"]["formulas"].get("nivel_real_custo_vida", "") or "nivel_real_custo_vida" in met["regras"]["formulas"], "R3a: a regra do nível real não está declarada na metodologia")
    for modo, bloco in res["modos"].items():
        nr = bloco["custo_vida_nivel_real"]
        cv_ = next(d for d in bloco["dimensoes"] if d["id"] == "custo_vida")
        check(nr["leitura_principal"] == cv_["leitura"], f"R3a/{modo}: a leitura principal do Custo de vida deve seguir a variação do início ao fim")
        leit_ = {d["id"]: d["leitura"] for d in bloco["dimensoes"] if d.get("leitura") is not None}
        check(leit_["custo_vida"] == cv_["leitura"], f"R3a/{modo}: a síntese deve usar a leitura principal")
        # recálculo independente do nível médio por série
        for l in nr["por_serie"]:
            ind_ = next(i for i in res["indicadores"] if i["id"] == l["id"])
            pontos = {x["iso"]: x["v"] for x in ind_["serie"]}
            kb = {(int(iso[:4]) - 2019) * 12 + int(iso[5:7]): v for iso, v in pontos.items() if "2019-01-01" <= iso <= "2022-12-01"}
            kl = {(int(iso[:4]) - 2023) * 12 + int(iso[5:7]): v for iso, v in pontos.items() if iso >= "2023-01-01"}
            if modo == "mesmo_tempo":  # só as posições k em que os dois períodos têm dado
                comuns_ = set(kb) & set(kl)
                kb, kl = {k: v for k, v in kb.items() if k in comuns_}, {k: v for k, v in kl.items() if k in comuns_}
            vb, vl = list(kb.values()), list(kl.values())
            base_ = statistics.fmean(vb + vl)
            check(abs(l["nivel_medio"]["Bolsonaro"] - statistics.fmean(vb) / base_ * 100) <= 0.01 and abs(l["nivel_medio"]["Lula"] - statistics.fmean(vl) / base_ * 100) <= 0.01,
                  f"R3a/{modo}/{l['id']}: nível médio não confere")
        check(abs(nr["nivel_medio"]["Bolsonaro"] - statistics.median(l["nivel_medio"]["Bolsonaro"] for l in nr["por_serie"])) <= 0.01, f"R3a/{modo}: mediana dos níveis médios não confere")
        check(nr["n_series"] == cv_["n_series"], f"R3a/{modo}: o nível real deve usar as mesmas séries do Custo de vida")

    # R5: terminologia do dólar. Nenhum texto do site chama a série de "dólar real" ou "câmbio real".
    site_txt = "\n".join((DATA_PROCESSED.parent.parent / "dashboard" / f).read_text(encoding="utf-8") for f in ("index.html", "js/app.js", "js/analise.js", "js/pib.js", "js/arquivo.js", "js/linhadotempo.js"))
    for proibida in ("dólar real", "dolar real"):
        check(proibida not in site_txt.lower(), f"R5: o site usa '{proibida}', mas a série é o câmbio nominal corrigido pelo IPCA")
    for pos_ in [m.start() for m in re.finditer(r"c[âa]mbio real", site_txt.lower())]:
        check("não é" in site_txt.lower()[max(0, pos_ - 24):pos_], "R5: 'câmbio real' só pode aparecer para dizer que a série NÃO é o câmbio real")
    check("Dólar corrigido pelo IPCA" in site_txt, "R5: rótulo 'Dólar corrigido pelo IPCA' ausente")
    dol = dash["produtos"]["DOLAR"]["serie_mensal"]
    for r in dol:
        if r.get("preco_real") and r.get("ipca_indice"):
            check(abs(r["preco_real"] - r["preco_nominal"] * ref["ipca_indice"] / r["ipca_indice"]) <= 0.001, f"R5: dólar corrigido de {r['ano_mes']} não é câmbio nominal x IPCA base / IPCA do mês")

    # R6 (v1.4.0): o preço de combustível é a série mensal nacional OFICIAL da ANP; a média simples das coletas é só sensibilidade
    check("série mensal nacional oficial da anp" in site_txt.lower(), "R6: o site não declara que o preço é a série mensal nacional oficial da ANP")
    check("preço médio nacional ${m.de}" not in site_txt, "R6: ainda há 'preço médio nacional' como rótulo sem dizer que é a série oficial")
    check("média simples das coletas da ANP ${m.de}" not in site_txt, "R6: o gráfico ainda rotula a série como média simples das coletas")
    import pandas as pd
    anp_csv = DATA_PROCESSED / "anp_precos_mensais.csv"
    bruto_anp = DATA_RAW / "anp" / "ca"
    if anp_csv.exists() and bruto_anp.exists() and list(bruto_anp.glob("ca-2019-0*.csv")):
        nac = pd.read_csv(anp_csv, parse_dates=["ano_mes"])
        nac = nac[(nac["regiao"] == "BR") & (nac["produto"] == "GASOLINA") & (nac["ano_mes"] == "2019-03-01")]
        bruto = pd.read_csv(next(bruto_anp.glob("ca-2019-01.csv")), sep=";", decimal=",", encoding="utf-8-sig")
        col_p = next(c for c in bruto.columns if c.lower().startswith("produto"))
        col_d = next(c for c in bruto.columns if "data da coleta" in c.lower())
        col_v = next(c for c in bruto.columns if "valor de venda" in c.lower())
        bruto["dt"] = pd.to_datetime(bruto[col_d], format="%d/%m/%Y")
        g_ = bruto[(bruto[col_p].str.upper().str.strip() == "GASOLINA") & (bruto["dt"].dt.strftime("%Y-%m") == "2019-03")][col_v]
        if len(nac) == 1 and len(g_):
            check(abs(float(nac["preco_medio"].iloc[0]) - g_.mean()) <= 1e-6, "R6: o preço nacional de mar/2019 não é a média simples das coletas")

    # v1.4.0 R6/E-ANP: o preço nominal dos combustíveis (Brasil) é o da série oficial; a média simples fica à parte
    ofi = list(csv.DictReader(open(DATA_PROCESSED / "anp_oficial_mensal.csv", encoding="utf-8")))
    ofi_idx = {(r["produto"], r["ano_mes"][:7]): float(r["preco_medio"]) for r in ofi}
    check(len(ofi_idx) == len(ofi), "ANP oficial: mês duplicado por produto")
    check(all(v > 0 and math.isfinite(v) for v in ofi_idx.values()), "ANP oficial: preço não positivo ou não finito")
    for cod_ in ("GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP"):
        meses_o = sorted(m for (p_, m) in ofi_idx if p_ == cod_)
        check(meses_o == sorted(set(meses_o)), f"ANP oficial/{cod_}: meses fora de ordem")
        for r in dash["produtos"][cod_]["serie_mensal"]:
            if r.get("preco_nominal") is None:
                continue
            check(abs(r["preco_nominal"] - ofi_idx[(cod_, r["ano_mes"][:7])]) <= 5e-4, f"ANP/{cod_}/{r['ano_mes']}: preço do dashboard difere da série oficial")
    comb_final = list(csv.DictReader(open(DATA_PROCESSED / "combustiveis_final.csv", encoding="utf-8")))
    br_ = [r for r in comb_final if r["regiao"] == "BR" and r["produto"] == "ETANOL"]
    dif_ = [float(r["preco_simples_coletas"]) / float(r["preco_nominal"]) - 1 for r in br_]
    check(len(br_) > 80 and 0.02 < statistics.fmean(dif_) < 0.12, "ANP: a média simples das coletas do etanol deveria ficar em média 2% a 12% acima da série oficial (documentado em ~6,5%)")

    # v1.4.0: salário mínimo é série própria e completa (não herda o buraco de set/2020 da gasolina)
    sm_meses = [r["ano_mes"][:7] for r in dash["salario_minimo_serie"]]
    check(sm_meses == sorted(set(sm_meses)) and sm_meses[0] == "2019-01", "salário mínimo: série fora de ordem, duplicada ou que não começa em jan/2019")
    check(all(f"{a}-{m:02d}" in sm_meses for a in range(2019, 2026) for m in range(1, 13)) and "2020-09" in sm_meses, "salário mínimo: faltam meses (inclusive set/2020)")
    check(all(r["salario_minimo"] > 0 and r["ipca_indice"] > 0 for r in dash["salario_minimo_serie"]), "salário mínimo: valor não positivo")
    sr_all = next(i for i in res["indicadores"] if i["id"] == "SALARIO_REAL")
    check(sr_all["completo"]["Bolsonaro"]["n"] == 48 and sr_all["completo"]["Lula"]["n"] == len([m for m in sm_meses if m >= "2023-01"]), "salário mínimo real: número de meses não é o do calendário")
    check(sr_all["mesmo_tempo"]["Bolsonaro"]["n"] == sr_all["mesmo_tempo"]["Lula"]["n"] == res["duracao"]["mesmo_tempo_meses"], "salário mínimo real: janelas de igual duração com tamanhos diferentes")
    check(imeta["SALARIO_REAL"]["origem"] == "SALARIO_MINIMO" and imeta["SALARIO_NOMINAL"]["origem"] == "SALARIO_MINIMO", "salário mínimo deve ter origem própria (SALARIO_MINIMO), não a gasolina")

    # v1.4.0: janela de CALENDÁRIO (meses 1 a n do mandato), não as n primeiras observações
    for cod_ in ("GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP", "DOLAR", "SELIC", "IPCA", "IBOVESPA", "Arroz", "Café moído"):
        for per_, ini_ in (("Bolsonaro", (2019, 1)), ("Lula", (2023, 1))):
            for nome_, n_ in (("primeiros_12m", 12), ("primeiros_24m", 24), ("primeiros_36m", 36)):
                c_ = (dash["produtos"][cod_].get("resumo_periodos", {}).get(per_) or {}).get(nome_)
                if not c_:
                    continue
                fim_ = int(c_["mes_fim"][:4]) * 12 + int(c_["mes_fim"][5:7]) - 1
                lim_ = ini_[0] * 12 + ini_[1] - 1 + n_ - 1
                check(fim_ <= lim_, f"{cod_}/{per_}/{nome_}: a janela passa do mês {n_} do mandato ({c_['mes_fim']})")
                check(c_["n_meses"] <= n_, f"{cod_}/{per_}/{nome_}: mais de {n_} meses")
    gas_c = dash["produtos"]["GASOLINA"]["resumo_periodos"]
    check(gas_c["Bolsonaro"]["primeiros_24m"]["mes_fim"] == "2020-12-01" and gas_c["Lula"]["primeiros_24m"]["mes_fim"] == "2024-12-01",
          "janela dos 24 primeiros meses da gasolina deve terminar em dez/2020 e dez/2024 (mesmo calendário), apesar de set/2020 sem pesquisa")

    # v1.4.0 R3b: sensibilidade do Custo de vida ao agregador (não entra na síntese)
    for modo, bloco in res["modos"].items():
        ag = bloco["custo_vida_agregadores"]
        cv_ = next(d for d in bloco["dimensoes"] if d["id"] == "custo_vida")
        ids_cv = [i["id"] for i in res["indicadores"] if i["dimensao"] == "custo_vida" and i["tipo"] == "A"]
        tr = {i: {p: next(x for x in res["indicadores"] if x["id"] == i)[modo][p]["valor"] for p in ("Bolsonaro", "Lula")} for i in ids_cv}
        por_id = {x["id"]: x for x in ag["trajetoria"]}
        for p in ("Bolsonaro", "Lula"):
            check(abs(por_id["mediana"][p] - round(statistics.median(tr[i][p] for i in ids_cv), 2)) <= 0.011, f"R3b/{modo}: mediana do agregador difere do recálculo")
            check(abs(por_id["media"][p] - round(statistics.fmean(tr[i][p] for i in ids_cv), 2)) <= 0.011, f"R3b/{modo}: média do agregador difere do recálculo")
        check(por_id["mediana"]["leitura"] == cv_["leitura"], f"R3b/{modo}: o agregador 'mediana' deve reproduzir a leitura principal do Custo de vida")
        check({x["id"] for x in ag["trajetoria"]} == {x["id"] for x in ag["nivel"]} and "ponderada_ipca" in por_id, f"R3b/{modo}: faltam agregadores (inclusive o ponderado pelo IPCA)")
        check(all(x["grade"]["combinacoes"] == 10626 for x in ag["trajetoria"] + ag["nivel"]), f"R3b/{modo}: grade de cada agregador deve ter 10.626 combinações")
        check(all(v > 0 for v in ag["pesos_ipca"]["pesos"].values()) and "DIESEL S10" not in ag["pesos_ipca"]["pesos"], "R3b: pesos do IPCA devem ser positivos e o diesel S10 não tem peso próprio (é o mesmo subitem do diesel)")
    check(set(dash["ipca_pesos"]) == {"Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído", "GASOLINA", "ETANOL", "DIESEL", "GLP"}, "ipca_pesos: itens inesperados")

    # R7: 10.626 combinações, calculadas aqui por enumeração independente
    check(math.comb(24, 4) == 10626, "R7: C(24,4) deveria ser 10.626")
    leit_c = {d["id"]: d["leitura"] for d in res["modos"]["completo"]["dimensoes"] if d.get("leitura") is not None}
    ordem_a = [d["id"] for d in met["dimensoes"] if d["tipo"] == "A"]
    cont_ = {1: 0, -1: 0, 0: 0}
    total_ = 0
    for corte in itertools.combinations(range(24), 4):  # estrelas e barras: 20 blocos de 5 pontos em 5 dimensões
        pesos = [b - a - 1 for a, b in zip((-1, *corte), (*corte, 24))]
        s_ = sum(5 * p * leit_c[k] for p, k in zip(pesos, ordem_a))
        cont_[(s_ > 0) - (s_ < 0)] += 1
        total_ += 1
    gc = res["modos"]["completo"]["grade"]
    check(total_ == 10626 and gc["combinacoes"] == 10626, "R7: a grade deve ter exatamente 10.626 combinações")
    check((gc["lula"], gc["bolsonaro"], gc["empate"]) == (cont_[1], cont_[-1], cont_[0]), "R7: contagem da grade não confere com a enumeração independente")
    check(met["regras"]["sensibilidade"]["nome"] == "Análise de sensibilidade aos pesos", "R7: a análise deve se chamar 'Análise de sensibilidade aos pesos'")
    for modo, bloco in res["modos"].items():
        check("sensibilidade" in bloco["textos"] and "robustez" not in bloco["textos"], f"R7/{modo}: o texto da grade deve se chamar 'sensibilidade', não 'robustez'")
        t_ = bloco["textos"]["sensibilidade"].lower()
        check("robust" not in t_ and "vencedor" not in t_ and "melhor governo" not in t_, f"R7/{modo}: texto da sensibilidade com termo proibido")
        if bloco["grade"]["mesmo_lado"]:
            check("não esgota" in t_ or "não esgota" in bloco["textos"]["sensibilidade"], f"R7/{modo}: o texto deve declarar que a grade não esgota todos os pesos")

    # R8: tolerâncias declaradas na metodologia
    check(met["regras"]["tolerancia"] == {"variacao_pct": 1.0, "media": 0.1}, "R8: tolerâncias diferentes das declaradas (1,0 ponto em variações; 0,1 em médias)")

    # R9: salário mínimo real = salário nominal x IPCA do último mês / IPCA do mês, em meses de referência
    for alvo_ in ("2019-01", "2020-01", "2021-01", "2022-01", "2023-01", "2024-01", "2025-01", "2026-01", ref["ano_mes"][:7]):
        r_ = next((x for x in gas if x["ano_mes"][:7] == alvo_), None)
        check(r_ is not None and alvo_ in {iso[:7] for iso in sr}, f"R9: sem salário mínimo real em {alvo_}")
        if r_:
            esperado = r_["salario_minimo"] * ref["ipca_indice"] / r_["ipca_indice"]
            check(abs(sr[r_["ano_mes"]] - esperado) < 1e-6, f"R9: salário mínimo real de {alvo_} não confere")
    check(res["salario_real_referencia"]["mes"] == max(ipca_idx) + "-01", "R9: o mês-base deve ser o último mês com IPCA publicado")

    # R10: os seis subitens do IPCA são os pretendidos (código SIDRA, nome oficial do subitem, tabelas 1419 e 7060)
    esperados_sidra = {"7173": "Arroz", "12222": "Feijão carioca", "7295": "Carne bovina (patinho)", "12393": "Leite longa vida", "7385": "Óleo de soja", "7392": "Café moído"}
    subitens_ibge = {"7173": "1101002 Arroz", "12222": "1101073 Feijão - carioca (rajado)", "7295": "1107089 Patinho", "12393": "1111004 Leite longa vida", "7385": "1113013 Óleo de soja", "7392": "1114022 Café moído"}
    itens_csv = list(csv.DictReader(open(DATA_PROCESSED / "ibge_itens_cesta_mensal.csv", encoding="utf-8")))
    mapa_csv = {r["codigo_sidra"]: r["item"] for r in itens_csv}
    check(mapa_csv == esperados_sidra, f"R10: códigos SIDRA dos itens diferem do verificado ({mapa_csv})")
    check(set(subitens_ibge) == set(esperados_sidra), "R10: lista de subitens verificados incompleta")
    for cod_, nome_ in esperados_sidra.items():
        meses_ = [r["ano_mes"] for r in itens_csv if r["codigo_sidra"] == cod_]
        check(meses_ == sorted(set(meses_)), f"R10/{nome_}: meses duplicados ou fora de ordem")
        check(meses_[0] == "2019-01-01", f"R10/{nome_}: série deve começar em jan/2019 (base 100)")

    # integridade geral: nenhum NaN/infinito, nenhuma série mensal com mês duplicado ou fora de ordem
    def _sem_nao_finito(x, caminho="") -> None:
        if isinstance(x, float):
            check(math.isfinite(x), f"valor não finito em analysis_results.json: {caminho}")
        elif isinstance(x, dict):
            for k_, v_ in x.items():
                _sem_nao_finito(v_, f"{caminho}/{k_}")
        elif isinstance(x, list):
            for n_, v_ in enumerate(x):
                _sem_nao_finito(v_, f"{caminho}[{n_}]")

    _sem_nao_finito(res)
    for cod_, prod_ in dash["produtos"].items():
        datas_ = [r.get("ano_mes") or str(r.get("ano")) for r in prod_.get("serie_mensal", [])]
        check(datas_ == sorted(set(datas_)), f"{cod_}: meses duplicados ou fora de ordem em serie_mensal")

    if falhas:
        print(f"{len(falhas)} falha(s):")
        for f in falhas:
            print(" -", f)
        sys.exit(1)
    print("análise: todas as validações passaram")


if __name__ == "__main__":
    main()
