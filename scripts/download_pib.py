"""
PIB (Produto Interno Bruto) — IBGE, Sistema de Contas Nacionais.

Três tabelas oficiais do SIDRA, identificadas por pesquisa (nenhuma delas
foi aberta diretamente por este ambiente — a API do IBGE está bloqueada
nesta sessão; ver a mensagem de erro que este script grava em
pib_status.json quando isso acontece). Por isso o script NUNCA assume um
código de variável de cabeça: pede `v/all` e escolhe a variável certa
comparando o NOME dela (campo "D2N"/"D3N" do retorno do SIDRA) com um texto
esperado — o mesmo princípio de "achar pelo texto, não por um número
adivinhado" já usado em download_conab.py para o link de download.

Tabelas usadas:

  5932  Taxa de variação do índice de volume trimestral (Contas Nacionais
        Trimestrais). Traz, por trimestre, quatro leituras diferentes:
        variação ante o mesmo trimestre do ano anterior, variação
        acumulada em 4 trimestres, variação acumulada no ano, e variação
        ante o trimestre imediatamente anterior (dessazonalizada). A
        "variação acumulada no ano" lida no 4º trimestre É o número que o
        IBGE e a imprensa chamam de "o PIB cresceu X% em determinado ano" —
        por isso este script usa exatamente essa leitura para o PIB real
        anual, em vez de inventar uma média das quatro variações
        trimestrais (que não é o que o IBGE divulga como resultado do ano).

  6784  Produto Interno Bruto, Produto Interno Bruto per capita, População
        residente e Deflator (Contas Nacionais Anuais). Preços correntes —
        fonte do PIB nominal (R$) e do PIB per capita (R$) anuais.

Nenhuma tabela de "preço médio" ou "índice" é usada como substituto: o PIB
real vem de variação (não de um nível reconstruído por este projeto), e o
nominal/per capita vêm de valores em R$ publicados diretamente pelo IBGE —
sem cálculo próprio além da leitura do campo certo.

Frequências NUNCA são misturadas num só número: a série anual
(serie_mensal, um ponto por ano) e a trimestral (serie_trimestral) são
estruturas separadas — ver scripts/build_dashboard_data.py.

Ano em curso: o último ano da série pode ter só trimestres parciais (sem
"acumulado no ano" fechado até o 4º trimestre publicar). Esse ano fica
marcado com "resultado_anual": false — nunca preenchido com uma estimativa.

Uso:
  .venv/Scripts/python scripts/download_pib.py
  .venv/Scripts/python scripts/download_pib.py --autoteste   # valida a lógica de seleção de variável/parsing contra scripts/fixtures/pib_*_exemplo.json (dado SINTÉTICO, não real)
"""
from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_pib")

SIDRA_BASE = "https://apisidra.ibge.gov.br/values"
STATUS = DATA_PROCESSED / "pib_status.json"
ARQUIVO_ANUAL = DATA_PROCESSED / "pib_anual.csv"
ARQUIVO_TRIMESTRAL = DATA_PROCESSED / "pib_trimestral.csv"

TABELA_TRIMESTRAL = "5932"
TABELA_ANUAL = "6784"
FONTE_URL = "https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9300-contas-nacionais-trimestrais.html"

# Texto (normalizado) que identifica cada variável dentro da tabela — nunca
# um código numérico adivinhado. Se o IBGE reformular o nome da variável,
# a busca falha alto (ver _achar_variavel) em vez de ler a variável errada.
VARS_TRIMESTRAL = {
    # Palavras-âncora tiradas do texto das 4 variáveis da tabela 5932 tal
    # como relatado pela pesquisa que embasou esta implementação (nenhuma
    # foi confirmada abrindo a API, que está bloqueada nesta sessão — ver
    # docs/AUDITORIA_PRECOS_ALIMENTOS.md para o precedente desta limitação
    # com a CONAB). "trimestral" (adjetivo) só aparece na variável #1;
    # "longo" só na #3 (distingue de "acumulada em QUATRO trimestres", que
    # não é uma das três que usamos); "imediatamente" só na #4.
    "interanual": ["trimestral"],
    "acumulado_ano": ["acumulad", "longo"],
    "dessazonalizada": ["imediatamente"],
}
VARS_ANUAL = {
    "pib_nominal": ["produto", "interno", "bruto"],       # "PIB, a preços correntes"
    "pib_per_capita": ["produto", "interno", "bruto", "capita"],
    "populacao": ["populacao", "residente"],
}
# Palavras que, se presentes, DESQUALIFICAM um candidato mesmo que ele bata
# com a lista acima (evita casar "PIB per capita" quando procuramos o PIB
# total, por exemplo).
EXCLUIR = {
    "pib_nominal": ["capita", "deflator", "anterior"],
    "pib_per_capita": ["deflator"],
    "populacao": [],
    "interanual": ["acumulad", "imediatamente"],
    "acumulado_ano": ["quatro", "imediatamente"],
    "dessazonalizada": ["acumulad"],
}


def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    return s.lower()


def _sidra_get(url: str) -> list[dict]:
    resp = requests.get(url, timeout=90)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) or (data and "erro" in str(data[0]).lower()):
        raise RuntimeError(f"erro na API SIDRA: {data}")
    return data[1:]  # primeira linha é cabeçalho de metadados


def _achar_variavel(linhas: list[dict], campo_nome: str, chave: str, incluir: dict, excluir: dict) -> str | None:
    """Entre os valores distintos de `campo_nome` (ex.: D2N, o nome da
    variável), acha o único que contém todas as palavras de `incluir[chave]`
    e nenhuma de `excluir[chave]`. Levanta erro se achar 0 ou mais de 1 —
    "mais de 1" significa que a busca é ambígua e precisa de mais palavras,
    não que se deva pegar a primeira ao acaso."""
    nomes = sorted({r[campo_nome] for r in linhas if campo_nome in r})
    casam = []
    for nome in nomes:
        n = _normalizar(nome)
        if all(p in n for p in incluir[chave]) and not any(p in n for p in excluir.get(chave, [])):
            casam.append(nome)
    if len(casam) == 1:
        return casam[0]
    if not casam:
        logger.warning(f"variável '{chave}' não encontrada entre: {nomes}")
        return None
    raise RuntimeError(f"variável '{chave}' ambígua — candidatos: {casam}. Ajuste as palavras-chave (incluir/excluir), não escolha um à toa.")


# --------------------------------------------------------------- trimestral (tabela 5932)
def processar_trimestral(linhas: list[dict]) -> pd.DataFrame:
    var_nome = _achar_variavel(linhas, "D2N", "interanual", VARS_TRIMESTRAL, EXCLUIR) or _achar_variavel(linhas, "D3N", "interanual", VARS_TRIMESTRAL, EXCLUIR)
    campo_var = "D2N" if any("D2N" in r and r["D2N"] == var_nome for r in linhas) else "D3N"
    resultado = {}
    for chave in VARS_TRIMESTRAL:
        nome = _achar_variavel(linhas, campo_var, chave, VARS_TRIMESTRAL, EXCLUIR)
        if not nome:
            continue
        for r in linhas:
            if r.get(campo_var) != nome:
                continue
            periodo = r["D3C"] if campo_var == "D2N" else r["D2C"]  # código de período, ex. "202401" ou trimestral "202401" formato SIDRA
            resultado.setdefault(periodo, {})[chave] = pd.to_numeric(r["V"], errors="coerce")
    linhas_out = []
    for periodo, vals in resultado.items():
        linhas_out.append({"periodo_codigo": periodo, **vals})
    df = pd.DataFrame(linhas_out)
    if df.empty:
        raise RuntimeError("tabela trimestral não produziu nenhuma linha — layout mudou")
    return df


# --------------------------------------------------------------- anual (tabela 6784)
def processar_anual(linhas: list[dict]) -> pd.DataFrame:
    campo_var = "D2N" if any("D2N" in r for r in linhas) else "D3N"
    campo_ano = "D3C" if campo_var == "D2N" else "D2C"
    campo_unidade_nome = "MN"
    resultado = {}
    unidades = {}
    for chave in VARS_ANUAL:
        nome = _achar_variavel(linhas, campo_var, chave, VARS_ANUAL, EXCLUIR)
        if not nome:
            continue
        for r in linhas:
            if r.get(campo_var) != nome:
                continue
            ano = r[campo_ano]
            resultado.setdefault(ano, {})[chave] = pd.to_numeric(r["V"], errors="coerce")
            unidades[chave] = r.get(campo_unidade_nome, "")
    linhas_out = [{"ano": ano, **vals} for ano, vals in resultado.items()]
    df = pd.DataFrame(linhas_out)
    if df.empty:
        raise RuntimeError("tabela anual não produziu nenhuma linha — layout mudou")
    # a unidade (ex.: "Milhões de Reais") vem escrita pela própria API, nunca
    # assumida — build_dashboard_data.py lê estas colunas para converter o
    # nominal para bilhões de forma correta seja qual for a unidade real.
    for chave, unidade in unidades.items():
        df[f"unidade_{chave}"] = unidade
    return df


# --------------------------------------------------------------- validação
class ErroValidacao(Exception):
    pass


def validar_trimestral(df: pd.DataFrame) -> None:
    if df["periodo_codigo"].duplicated().any():
        raise ErroValidacao("período trimestral duplicado")
    if "interanual" in df and df["interanual"].abs().gt(60).any():
        raise ErroValidacao("variação trimestral interanual fora de faixa plausível (>60%) — confira a variável escolhida")


def validar_anual(df: pd.DataFrame) -> None:
    if df["ano"].duplicated().any():
        raise ErroValidacao("ano duplicado na tabela anual")
    if "pib_nominal" in df and (df["pib_nominal"] <= 0).any():
        raise ErroValidacao("PIB nominal zero ou negativo")
    if "pib_per_capita" in df and "pib_nominal" in df and (df["pib_per_capita"] > df["pib_nominal"]).any():
        raise ErroValidacao("PIB per capita maior que o PIB total — colunas trocadas")


# --------------------------------------------------------------- orquestração
def baixar_tabela(tabela: str) -> tuple[list[dict] | None, dict]:
    info = {"tentativa_em": datetime.now(timezone.utc).isoformat(timespec="minutes")}
    url = f"{SIDRA_BASE}/t/{tabela}/n1/1/v/all/p/all"
    try:
        linhas = _sidra_get(url)
        if not linhas:
            raise ValueError("resposta vazia")
        info.update(ok=True, mensagem=f"{len(linhas)} linhas recebidas", url=url)
        return linhas, info
    except Exception as e:
        info.update(ok=False, mensagem=f"{type(e).__name__}: {e}", url=url)
        logger.warning(f"tabela {tabela} falhou: {info['mensagem']}")
        return None, info


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--autoteste", action="store_true", help="valida a lógica de seleção de variável/parsing contra scripts/fixtures/ (dado SINTÉTICO) — não escreve em data/processed/")
    args = ap.parse_args()

    if args.autoteste:
        fx = Path(__file__).parent / "fixtures"
        logger.info("AUTOTESTE — dado sintético, NÃO é dado real do IBGE, NÃO será gravado em data/processed/")
        trim = processar_trimestral(json.loads((fx / "pib_trimestral_exemplo.json").read_text(encoding="utf-8")))
        validar_trimestral(trim)
        logger.info(f"  trimestral OK — {trim.to_dict('records')}")
        anual = processar_anual(json.loads((fx / "pib_anual_exemplo.json").read_text(encoding="utf-8")))
        validar_anual(anual)
        logger.info(f"  anual OK — {anual.to_dict('records')}")
        logger.info("Autoteste concluído: a seleção de variável por nome e a validação funcionam contra o formato esperado. Isso NÃO confirma que a API real devolve exatamente esses nomes de variável hoje.")
        return 0

    status_antigo = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    status = {"fonte": "IBGE — Sistema de Contas Nacionais (Trimestrais e Anuais)", "fonte_url": FONTE_URL}
    ok_geral = True

    linhas_trim, info_trim = baixar_tabela(TABELA_TRIMESTRAL)
    status["trimestral"] = {**info_trim, "tabela": TABELA_TRIMESTRAL, "ultimo_sucesso_em": info_trim["tentativa_em"] if info_trim["ok"] else status_antigo.get("trimestral", {}).get("ultimo_sucesso_em")}
    if linhas_trim:
        try:
            df_trim = processar_trimestral(linhas_trim)
            validar_trimestral(df_trim)
            ensure_dirs(DATA_PROCESSED)
            df_trim.to_csv(ARQUIVO_TRIMESTRAL, index=False)
            logger.info(f"Salvo: {ARQUIVO_TRIMESTRAL} ({len(df_trim)} trimestres)")
        except (ErroValidacao, RuntimeError) as e:
            logger.error(f"trimestral baixado mas falhou no parsing/validação — nada gravado: {e}")
            status["trimestral"]["ok"] = False
            status["trimestral"]["mensagem"] = str(e)
            ok_geral = False
    else:
        ok_geral = False
        if not ARQUIVO_TRIMESTRAL.exists():
            logger.warning("Sem dado trimestral (fonte indisponível, sem cópia local) — PIB trimestral não aparece nesta execução.")

    linhas_anual, info_anual = baixar_tabela(TABELA_ANUAL)
    status["anual"] = {**info_anual, "tabela": TABELA_ANUAL, "ultimo_sucesso_em": info_anual["tentativa_em"] if info_anual["ok"] else status_antigo.get("anual", {}).get("ultimo_sucesso_em")}
    if linhas_anual:
        try:
            df_anual = processar_anual(linhas_anual)
            validar_anual(df_anual)
            ensure_dirs(DATA_PROCESSED)
            df_anual.to_csv(ARQUIVO_ANUAL, index=False)
            logger.info(f"Salvo: {ARQUIVO_ANUAL} ({len(df_anual)} anos)")
        except (ErroValidacao, RuntimeError) as e:
            logger.error(f"anual baixado mas falhou no parsing/validação — nada gravado: {e}")
            status["anual"]["ok"] = False
            status["anual"]["mensagem"] = str(e)
            ok_geral = False
    else:
        ok_geral = False
        if not ARQUIVO_ANUAL.exists():
            logger.warning("Sem dado anual (fonte indisponível, sem cópia local) — PIB nominal/per capita não aparecem nesta execução.")

    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if ok_geral else 1  # não-crítico: build_dashboard_data.py trata os CSVs como opcionais


if __name__ == "__main__":
    sys.exit(main())
