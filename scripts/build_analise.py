"""Consolida a página "Análise — o que os dados mostram?" a partir do que já
foi calculado em dashboard_data.json.

Este script NÃO baixa nada nem calcula nenhum número novo: ele só reorganiza
`resumo_periodos.Bolsonaro/Lula.governo_inteiro` (e o `diario`, para Dólar,
Selic e Ibovespa) de cada produto — os mesmos números que a página "Períodos"
já mostra — em dimensões editoriais (custo de vida, inflação, renda, atividade
econômica, mercados). Nenhum valor é digitado à mão: se o indicador não tiver
`resumo_periodos` comparável, ele entra na lista de excluídos com o motivo.

Saída: data/processed/analise.json, lido por dashboard/js/analise.js.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("build_analise")

# ---------------------------------------------------------------- taxonomia
# Cada indicador aparece em EXATAMENTE uma dimensão. Fonte e nota metodológica
# são as mesmas que o resto do projeto já usa (ver sourceFor() em app.js) —
# nada inventado aqui.
DIMENSOES = [
    {
        "id": "custo_vida",
        "titulo": "Custo de vida",
        "explicacao": "Preços de combustíveis e alimentos pagos pelo consumidor. Combustíveis são preço médio nacional em reais (ANP); alimentos são índice de preço encadeado (IBGE), não o valor em reais de cada item.",
        "indicadores": [
            ("GASOLINA", "ANP — Levantamento de Preços de Combustíveis"),
            ("ETANOL", "ANP — Levantamento de Preços de Combustíveis"),
            ("DIESEL", "ANP — Levantamento de Preços de Combustíveis"),
            ("DIESEL S10", "ANP — Levantamento de Preços de Combustíveis"),
            ("GLP", "ANP — Levantamento de Preços de Combustíveis"),
            ("Arroz", "IBGE/SIDRA — IPCA por item (índice encadeado)"),
            ("Feijão carioca", "IBGE/SIDRA — IPCA por item (índice encadeado)"),
            ("Carne bovina (patinho)", "IBGE/SIDRA — IPCA por item (índice encadeado)"),
            ("Leite longa vida", "IBGE/SIDRA — IPCA por item (índice encadeado)"),
            ("Óleo de soja", "IBGE/SIDRA — IPCA por item (índice encadeado)"),
            ("Café moído", "IBGE/SIDRA — IPCA por item (índice encadeado)"),
        ],
    },
    {
        "id": "inflacao",
        "titulo": "Inflação e preços",
        "explicacao": "O IPCA mede a variação média de preços de uma cesta de consumo representativa; não é o gasto exato de nenhuma família específica.",
        "indicadores": [("IPCA", "IBGE — IPCA (variação acumulada em 12 meses)")],
    },
    {
        "id": "renda",
        "titulo": "Renda e poder de compra",
        "explicacao": "O valor nominal do salário mínimo, e quanto dele um item de custo de vida consumia — uma leitura de poder de compra, não de renda familiar total.",
        "indicadores": [],  # montado à parte (ver montar_renda)
    },
    {
        "id": "atividade",
        "titulo": "PIB e atividade econômica",
        "explicacao": "O PIB mede a variação da atividade econômica agregada (bens e serviços finais produzidos); não é uma medida direta de renda individual, bem-estar ou custo de vida.",
        "indicadores": [("PIB", "IBGE — Sistema de Contas Nacionais Trimestrais")],
    },
    {
        "id": "mercados",
        "titulo": "Mercados e macroeconomia",
        "explicacao": "Dólar, Selic e Ibovespa são variáveis financeiras. O Ibovespa representa o desempenho de uma carteira teórica de ações negociadas na B3, não o bem-estar da população; o dólar é uma cotação cambial; a Selic é a meta de juros definida pelo Copom.",
        "indicadores": [
            ("DOLAR", "Banco Central — PTAX venda"),
            ("SELIC", "Banco Central — Meta Selic (Copom)"),
            ("IBOVESPA", "B3 — Ibovespa, fechamento"),
        ],
    },
]

# Contexto externo: os mesmos marcos já usados nos gráficos do projeto
# (dashboard/js/app.js, const EVENTS) — não um evento novo, e sem inferir
# relação de causa com nenhum indicador.
CONTEXTO_EXTERNO = [
    {"iso": "2020-03-01", "texto": "OMS declara pandemia de covid-19", "fonte": "Organização Mundial da Saúde (declaração pública, 11/03/2020)"},
    {"iso": "2022-02-01", "texto": "Rússia invade a Ucrânia", "fonte": "Fato amplamente noticiado internacionalmente, fevereiro de 2022"},
    {"iso": "2022-06-01", "texto": "Lei Complementar 194 limita o ICMS sobre combustíveis", "fonte": "Diário Oficial da União, LC 194/2022"},
    {"iso": "2023-03-01", "texto": "Volta parcial da cobrança de PIS/Cofins sobre a gasolina", "fonte": "Decreto federal de reoneração de combustíveis, 2023"},
    {"iso": "2026-02-01", "texto": "EUA e Israel iniciam ofensiva contra o Irã (28/fev)", "fonte": "Cobertura internacional, fevereiro de 2026"},
]

# Documentado, não usado para calcular pontuação nenhuma (ver nota no front).
METODOLOGIA_PESOS = [
    {"id": "custo_vida", "peso": 0.30},
    {"id": "inflacao", "peso": 0.15},
    {"id": "renda", "peso": 0.15},
    {"id": "atividade", "peso": 0.20},
    {"id": "mercados", "peso": 0.20},
]

PASSOS_METODOLOGIA = [
    "Definimos períodos comparáveis: jan/2019-dez/2022 (governo Bolsonaro) e jan/2023-último dado disponível (governo Lula, em curso).",
    "Usamos as mesmas fontes públicas já citadas em cada indicador do projeto (ANP, IBGE/SIDRA, Banco Central, B3).",
    "Mantivemos todos os indicadores já calculados pelo projeto; nenhum foi escolhido a dedo para esta página.",
    "Diferenciamos, sempre que existe a informação, variação nominal e variação real (descontada a inflação).",
    "Documentamos dados faltantes ou períodos incompletos em vez de estimar o que falta.",
    "Não convertemos proximidade temporal entre um evento e uma variação em relação de causa.",
    "Explicamos, em cada dimensão, o que a métrica mede e o que ela não mede.",
    "Publicamos os números e a fórmula desta página para qualquer pessoa auditar (ver “Audite a análise”).",
]


def _round(v, d=2):
    return None if v is None else round(float(v), d)


def montar_indicador(codigo: str, fonte: str, produtos: dict) -> dict | None:
    p = produtos.get(codigo)
    if not p:
        return {"codigo": codigo, "excluido": True, "motivo": "produto não encontrado nesta geração dos dados"}
    rb = (p.get("resumo_periodos", {}).get("Bolsonaro") or {}).get("governo_inteiro")
    rl = (p.get("resumo_periodos", {}).get("Lula") or {}).get("governo_inteiro")
    diario = p.get("diario")
    if diario and diario.get("inicio") and diario.get("troca") and diario.get("inicio_lula") and diario.get("ultimo"):
        # Dólar/Selic/Ibovespa: último pregão de cada período, não o mês fechado.
        b = {"inicio": diario["inicio"]["data"], "fim": diario["troca"]["data"], "valor_inicio": diario["inicio"]["valor"], "valor_fim": diario["troca"]["valor"], "diario": True}
        l = {"inicio": diario["inicio_lula"]["data"], "fim": diario["ultimo"]["data"], "valor_inicio": diario["inicio_lula"]["valor"], "valor_fim": diario["ultimo"]["valor"], "diario": True}
        # Selic é uma TAXA (% ao ano): a comparação certa é em pontos percentuais, não
        # "variação percentual de uma porcentagem" (13,75% -> 15% não é "+9%", é "+1,25 p.p.").
        eh_taxa = p.get("tipo") == "taxa"
        for d in (b, l):
            if eh_taxa:
                d["variacao_pp"] = _round(d["valor_fim"] - d["valor_inicio"])
            else:
                d["variacao_pct"] = _round((d["valor_fim"] / d["valor_inicio"] - 1) * 100) if d["valor_inicio"] else None
        frequencia = "diário (último pregão/cotação de cada período)"
    elif rb is not None or rl is not None:
        def campos(r):
            if not r:
                return None
            if "taxa_fim" in r:  # SELIC, IPCA, PIB: taxa em pontos percentuais
                return {"inicio": r["mes_inicio"], "fim": r["mes_fim"], "valor_inicio": r["taxa_inicio"], "valor_fim": r["taxa_fim"],
                        "variacao_pp": _round(r["variacao_pp"]), "n_meses": r.get("n_meses")}
            if "pontos_fim" in r:  # Ibovespa (só cai aqui se não tiver diario)
                return {"inicio": r["mes_inicio"], "fim": r["mes_fim"], "valor_inicio": r["pontos_inicio"], "valor_fim": r["pontos_fim"],
                        "variacao_pct": _round(r["variacao_pct"]), "n_meses": r.get("n_meses")}
            if "indice_nominal_fim" in r:  # alimentos: índice, não R$
                return {"inicio": r["mes_inicio"], "fim": r["mes_fim"], "valor_inicio": r["indice_nominal_inicio"], "valor_fim": r["indice_nominal_fim"],
                        "variacao_nominal_pct": _round(r["variacao_nominal_pct"]), "variacao_real_pct": _round(r.get("variacao_real_pct")), "n_meses": r.get("n_meses")}
            if "preco_nominal_fim" in r:  # combustíveis/dólar
                return {"inicio": r["mes_inicio"], "fim": r["mes_fim"], "valor_inicio": r["preco_nominal_inicio"], "valor_fim": r["preco_nominal_fim"],
                        "variacao_nominal_pct": _round(r["variacao_nominal_pct"]), "variacao_real_pct": _round(r.get("variacao_real_pct")), "n_meses": r.get("n_meses")}
            return None
        b, l = campos(rb), campos(rl)
        frequencia = "mensal"
    else:
        return {"codigo": codigo, "excluido": True, "motivo": "sem comparação de período calculada para este indicador"}

    if l and l.get("n_meses") is not None and rb and rb.get("n_meses") and l["n_meses"] < rb.get("n_meses", 0):
        l["periodo_incompleto"] = True  # Lula ainda em curso: o período pode ter menos meses fechados que Bolsonaro

    return {
        "codigo": codigo, "nome": p.get("nome", codigo), "tipo": p.get("tipo"), "unidade": p.get("unidade"),
        "fonte": fonte, "frequencia": frequencia, "excluido": False,
        "bolsonaro": b, "lula": l,
    }


def montar_renda(produtos: dict) -> list[dict]:
    """Renda e poder de compra: o valor nominal do salário mínimo (via a série de
    qualquer combustível, que já traz pct_salario_minimo) e, como leitura de poder
    de compra, quantos litros de gasolina 1 salário mínimo comprava."""
    out = []
    gas = produtos.get("GASOLINA")
    if not gas:
        return [{"codigo": "SALARIO_MINIMO", "excluido": True, "motivo": "produto de referência (Gasolina) ausente"}]
    rb = (gas.get("resumo_periodos", {}).get("Bolsonaro") or {}).get("governo_inteiro")
    rl = (gas.get("resumo_periodos", {}).get("Lula") or {}).get("governo_inteiro")
    if rb and rl:
        # valor nominal do salário mínimo = preço do litro × quantos litros ele compra
        def sm(r):
            v_inicio = r["preco_nominal_inicio"] * r["unidades_por_salario_minimo_inicio"] if r.get("unidades_por_salario_minimo_inicio") else None
            v_fim = r["preco_nominal_fim"] * r["unidades_por_salario_minimo_fim"] if r.get("unidades_por_salario_minimo_fim") else None
            return {"inicio": r["mes_inicio"], "fim": r["mes_fim"], "valor_inicio": _round(v_inicio, 2), "valor_fim": _round(v_fim, 2),
                    "variacao_nominal_pct": _round((v_fim / v_inicio - 1) * 100) if v_inicio and v_fim else None, "n_meses": r.get("n_meses")}
        out.append({"codigo": "SALARIO_MINIMO", "nome": "Salário mínimo", "tipo": "renda", "unidade": "R$ (valor nominal)",
                     "fonte": "Banco Central / Decretos de salário mínimo", "frequencia": "mensal", "excluido": False,
                     "bolsonaro": sm(rb), "lula": sm(rl)})
        def poder(r):
            return {"inicio": r["mes_inicio"], "fim": r["mes_fim"], "valor_inicio": r.get("unidades_por_salario_minimo_inicio"),
                     "valor_fim": r.get("unidades_por_salario_minimo_fim"),
                     "variacao_nominal_pct": _round((r["unidades_por_salario_minimo_fim"] / r["unidades_por_salario_minimo_inicio"] - 1) * 100)
                     if r.get("unidades_por_salario_minimo_inicio") and r.get("unidades_por_salario_minimo_fim") else None, "n_meses": r.get("n_meses")}
        out.append({"codigo": "SM_GASOLINA", "nome": "Litros de gasolina por salário mínimo", "tipo": "poder_compra", "unidade": "litros",
                     "fonte": "ANP + Banco Central (cálculo do projeto)", "frequencia": "mensal", "excluido": False,
                     "bolsonaro": poder(rb), "lula": poder(rl)})
    else:
        out.append({"codigo": "SALARIO_MINIMO", "excluido": True, "motivo": "sem os dois períodos de referência (Gasolina) disponíveis"})
    return out


def main() -> None:
    ensure_dirs(DATA_PROCESSED)
    caminho = DATA_PROCESSED / "dashboard_data.json"
    if not caminho.exists():
        logger.error("dashboard_data.json não existe — rode build_dashboard_data.py primeiro.")
        sys.exit(1)
    d = json.loads(caminho.read_text(encoding="utf-8"))
    produtos = d.get("produtos", {})
    presidentes = d.get("presidentes", {})

    dimensoes_saida = []
    for dim in DIMENSOES:
        indicadores = [montar_renda(produtos)] if dim["id"] == "renda" else [
            [montar_indicador(cod, fonte, produtos)] for cod, fonte in dim["indicadores"]
        ]
        flat = [x for grupo in indicadores for x in grupo]
        dimensoes_saida.append({"id": dim["id"], "titulo": dim["titulo"], "explicacao": dim["explicacao"], "indicadores": flat})

    saida = {
        "gerado_em": d.get("gerado_em"),
        "periodo_corte": d.get("periodo_corte"),
        "periodos": {
            "bolsonaro": {"inicio": "2019-01-01", "fim": "2022-12-31", "label": presidentes.get("Bolsonaro", {}).get("periodo_label", "Jan/2019 – Dez/2022"), "em_curso": False},
            "lula": {"inicio": "2023-01-01", "fim": None, "label": presidentes.get("Lula", {}).get("periodo_label", "Jan/2023 – atual"), "em_curso": True},
        },
        "dimensoes": dimensoes_saida,
        "contexto_externo": CONTEXTO_EXTERNO,
        "metodologia": {"pesos": METODOLOGIA_PESOS, "pesos_nota": "Os pesos documentam a ordem de apresentação das dimensões (custo de vida primeiro). Eles NÃO são usados para calcular uma pontuação, nota ou vencedor único: esta página nunca soma os indicadores num placar.", "passos": PASSOS_METODOLOGIA},
    }
    caminho_saida = DATA_PROCESSED / "analise.json"
    caminho_saida.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    n_ind = sum(len(dim["indicadores"]) for dim in dimensoes_saida)
    n_exc = sum(1 for dim in dimensoes_saida for i in dim["indicadores"] if i.get("excluido"))
    logger.info(f"Salvo: {caminho_saida} ({n_ind} indicadores, {n_exc} excluídos)")


if __name__ == "__main__":
    sys.exit(main())
