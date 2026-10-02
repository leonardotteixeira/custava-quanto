"""Compara os resultados da Análise ANTES (versão 1.2.1, commit HEAD) e DEPOIS (arquivo atual).

    python docs/auditoria_antes_depois.py

Somente leitura: lê `git show HEAD:data/processed/analysis_results.json` (antes) e
`data/processed/analysis_results.json` (depois). Não altera nenhum arquivo. Use-o enquanto
as correções da auditoria (metodologia 1.3.0) ainda não estiverem em commit; depois do commit,
passe o hash do commit anterior em ANTES (variável de ambiente ANTES_REV).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REV = os.environ.get("ANTES_REV", "HEAD")
SINAL = {1: "Lula", -1: "Bolsonaro", 0: "praticamente iguais", None: "—"}


def carregar() -> tuple[dict, dict]:
    antes = json.loads(subprocess.run(["git", "show", f"{REV}:data/processed/analysis_results.json"], cwd=RAIZ, capture_output=True, check=True).stdout.decode("utf-8"))
    depois = json.loads((RAIZ / "data" / "processed" / "analysis_results.json").read_text(encoding="utf-8"))
    return antes, depois


def ind(res: dict, i: str) -> dict:
    return next(x for x in res["indicadores"] if x["id"] == i)


def dim(res: dict, modo: str, d: str) -> dict:
    return next(x for x in res["modos"][modo]["dimensoes"] if x["id"] == d)


def linha(rotulo: str, a, b, un: str = "", casas: int = 2) -> str:
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        dif = b - a
        return f"| {rotulo} | {a:.{casas}f}{un} | {b:.{casas}f}{un} | {dif:+.{casas}f}{' p.p.' if un == '%' else ''} | {'mudou' if abs(dif) > 10 ** -(casas + 1) else 'igual'} |"
    return f"| {rotulo} | {a} | {b} | — | {'mudou' if a != b else 'igual'} |"


def main() -> None:
    antes, depois = carregar()
    print(f"ANTES: {REV} (metodologia {antes['metodologia_versao']}) · DEPOIS: arquivo atual (metodologia {depois['metodologia_versao']})\n")
    print("| Item | Antes | Depois | Diferença | Situação |\n|---|---|---|---|---|")
    for modo in ("completo", "mesmo_tempo"):
        print(f"| **Janela: {modo}** | | | | |")
        for p in ("Bolsonaro", "Lula"):
            a, b = ind(antes, "IPCA")[modo][p], ind(depois, "IPCA")[modo][p]
            print(linha(f"IPCA 12 meses, média, {p}", a["media"], b["media"], "%"))
            print(linha(f"IPCA 12 meses, n meses, {p}", a["n"], b["n"], "", 0))
        for d_ in ("custo_vida", "inflacao", "renda", "atividade"):
            a, b = dim(antes, modo, d_), dim(depois, modo, d_)
            for p in ("Bolsonaro", "Lula"):
                print(linha(f"{d_}, valor da dimensão, {p}", a["por_periodo"][p]["mediana_valor"], b["por_periodo"][p]["mediana_valor"], "%"))
            print(linha(f"{d_}, leitura", SINAL[a["leitura"]], SINAL[b["leitura"]]))
        a, b = dim(antes, modo, "trabalho"), dim(depois, modo, "trabalho")
        print(linha("trabalho, votos (Lula/Bolsonaro/iguais)", "/".join(str(a["votos"][k]) for k in ("lula", "bolsonaro", "iguais")), "/".join(str(b["votos"][k]) for k in ("lula", "bolsonaro", "iguais"))))
        print(linha("trabalho, leitura", SINAL[a["leitura"]], SINAL[b["leitura"]]))
        for cod in ("GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP", "DOLAR", "SALARIO_REAL", "SM_GASOLINA", "PIB"):
            for p in ("Bolsonaro", "Lula"):
                print(linha(f"{cod}, variação/valor da série, {p}", ind(antes, cod)[modo][p]["valor"], ind(depois, cod)[modo][p]["valor"], "%"))
        for p in ("Bolsonaro", "Lula"):
            print(linha(f"SALARIO_REAL, n meses, {p}", ind(antes, "SALARIO_REAL")[modo][p]["n"], ind(depois, "SALARIO_REAL")[modo][p]["n"], "", 0))
        for c_a, c_b in zip(antes["modos"][modo]["sintese"], depois["modos"][modo]["sintese"]):
            print(linha(f"síntese, cenário {c_a['id']}, soma", c_a["soma"], c_b["soma"], "", 0))
        ga, gb = antes["modos"][modo]["grade"], depois["modos"][modo]["grade"]
        for k in ("combinacoes", "lula", "bolsonaro", "empate"):
            print(linha(f"grade 10.626, {k}", ga[k], gb[k], "", 0))
        na = antes["modos"][modo].get("custo_vida_nivel_real")
        nb = depois["modos"][modo]["custo_vida_nivel_real"]
        if na is None:
            print(f"| nível real do custo de vida (novo) | — | B {nb['nivel_medio']['Bolsonaro']} / L {nb['nivel_medio']['Lula']} (mediano B {nb['nivel_mediano']['Bolsonaro']} / L {nb['nivel_mediano']['Lula']}) | novo | grade alternativa {nb['grade']['lula']}/{nb['grade']['bolsonaro']}/{nb['grade']['empate']} |")
    # séries que não deveriam mudar
    print("\nSéries com valor inalterado (completo):")
    mudaram = []
    for i in antes["indicadores"]:
        if i.get("excluido"):
            continue
        j = ind(depois, i["id"])
        for p in ("Bolsonaro", "Lula"):
            if i["completo"][p]["valor"] != j["completo"][p]["valor"] or i["completo"][p]["n"] != j["completo"][p]["n"]:
                mudaram.append(f"{i['id']}/{p}")
    print("  mudaram:", ", ".join(mudaram) or "nenhuma")


if __name__ == "__main__":
    sys.exit(main())
