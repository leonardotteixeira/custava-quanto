"""
Preço de varejo (R$/kg) de arroz e feijão — CONAB, Sistema de Informações
de Mercado (SIM), dataset "Preços Agropecuários".

CONTEXTO (ver docs/AUDITORIA_PRECOS_ALIMENTOS.md para a auditoria completa
de fontes antes de mexer neste script): o IBGE/SIDRA — única fonte já
usada no resto do pipeline de alimentos — não publica preço médio absoluto
em R$, só a variação percentual mensal (ver download_ibge.py). A CONAB tem
uma pesquisa própria de preços agropecuários por nível de comercialização
(Produtor, Atacado, Varejo) e UF, com séries nomeadas oficialmente algo como
"Arroz Tipo 1" e "Feijão Cores Tipo 1", "Médias Mensais", em R$/kg — o
candidato mais forte encontrado para um preço de fato observado no varejo.

O QUE ESTE SCRIPT FAZ:
  1. Abre a página pública de downloads do Portal de Informações
     Agropecuárias da CONAB e procura, no HTML, o link cujo texto se refere
     a "Preços agropecuários" + "Mensal" + "UF" — NUNCA um nome de arquivo
     fixo digitado à mão, porque o nome/URL exato do arquivo não foi
     confirmado antes deste script existir (ver auditoria). Se o texto do
     link mudar, o script falha alto (não silenciosamente) em vez de baixar
     o arquivo errado.
  2. Baixa o arquivo real para data/raw/conab/ (cache local, como todo o
     resto do pipeline).
  3. Filtra Arroz Tipo 1 e Feijão Cores Tipo 1 em nível "Varejo" e calcula,
     mês a mês, a média simples do preço entre as UFs que a CONAB pesquisou
     naquele mês — SEMPRE rotulada como "média calculada pelo projeto entre
     N UFs pesquisadas pela CONAB", nunca como "preço nacional oficial da
     CONAB" (a auditoria não encontrou nenhuma nota metodológica da própria
     CONAB para uma agregação nacional oficial desta série).
  4. Valida o resultado (sem mês/produto duplicado, sem preço negativo ou
     fora de uma faixa plausível, sem misturar nível de comercialização,
     sem string quebrada) antes de gravar.

QUANDO A FONTE NÃO RESPONDE (rede bloqueada, layout mudou, arquivo não
encontrado): o script REGISTRA a falha em conab_status.json e não grava
NADA em cima de um resultado válido anterior — e, na primeira execução (sem
cache), simplesmente não produz conab_precos_varejo.csv. Nenhum preço é
inventado, estimado ou copiado de outra fonte para preencher a lacuna;
scripts/build_dashboard_data.py já sabe tratar esse arquivo como opcional
(o item de alimento correspondente continua só com o índice IBGE).

Uso:
  .venv/Scripts/python scripts/download_conab.py
  .venv/Scripts/python scripts/download_conab.py --autoteste   # valida a lógica de parsing/agregação contra uma tabela sintética (scripts/fixtures/), sem tocar em dado real nem em data/processed/
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd
import requests

from common import DATA_PROCESSED, DATA_RAW, ensure_dirs, get_logger

logger = get_logger("download_conab")

PASTA_RAW = DATA_RAW / "conab"
ARQUIVO_SAIDA = DATA_PROCESSED / "conab_precos_varejo.csv"
STATUS = DATA_PROCESSED / "conab_status.json"
PAGINA_DOWNLOADS = "https://portaldeinformacoes.conab.gov.br/download-arquivos.html"
FONTE_URL = "https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"}

# Faixa plausível de preço de varejo (R$/kg), só para pegar erro grosseiro de
# parsing (coluna errada, conversão de unidade, milhar sem separador) — não é
# um julgamento sobre o preço em si. Ajuste se um mês legítimo cair fora.
FAIXA_PLAUSIVEL_RS_KG = (0.5, 40.0)

# Produtos que este script sabe procurar, e sob qual nome a CONAB os
# publica — NUNCA equiparado ao nome do item correspondente no índice IBGE
# sem checar a definição de produto primeiro (ver auditoria, achado 4: por
# isso o feijão sai rotulado exatamente como a CONAB nomeia, "Feijão Cores
# Tipo 1", não "Feijão carioca").
PRODUTOS_CONAB = {
    "arroz": {
        "item_dashboard": "Arroz",
        "produto_conab": "Arroz Tipo 1",
        # regex sobre o nome do produto já normalizado (minúsculo, sem
        # acento): precisa achar "arroz" e "tipo 1", e não pode achar
        # "tipo 2"/"tipo 3"/"parboilizado tipo 2" etc. junto.
        "regex_incluir": re.compile(r"\barroz\b.*\btipo\s*1\b"),
        "regex_excluir": re.compile(r"\btipo\s*[23]\b"),
        "equivalente_indice_ibge": "Arroz",
        "definicao_compativel": True,
    },
    "feijao": {
        "item_dashboard": "Feijão carioca",
        "produto_conab": "Feijão Cores Tipo 1",
        "regex_incluir": re.compile(r"\bfeij[aã]o\b.*\bcores\b.*\btipo\s*1\b"),
        "regex_excluir": re.compile(r"\btipo\s*[23]\b"),
        "equivalente_indice_ibge": "Feijão carioca",
        # "Feijão Cores" é uma categoria comercial (inclui o carioca como
        # variedade dominante, mas pode agregar outras cores) — NÃO
        # confirmado como idêntico ao subitem "Feijão carioca" do IBGE (ver
        # auditoria, achado 4). Por isso False: o dado é gravado e exposto,
        # mas rotulado com o nome da CONAB, nunca apresentado como "o mesmo
        # produto" do índice.
        "definicao_compativel": False,
    },
}


def _normalizar(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    return s.lower().strip()


# --------------------------------------------------------------- descoberta do link
def localizar_link_arquivo(html: str, base_url: str) -> str | None:
    """Procura, no HTML da página de downloads, o link de 'Preços agropecuários
    Mensal UF' pelo TEXTO (não por um nome de arquivo fixo — o nome real do
    arquivo nunca foi confirmado antes deste script existir)."""
    # <a ...href="...">texto do link</a> — casa qualquer link cujo texto
    # visível contenha as três palavras-chave, em qualquer ordem/pontuação.
    candidatos = re.findall(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
    for href, texto in candidatos:
        t = _normalizar(re.sub(r"<[^>]+>", " ", texto))
        if "preco" in t and "agropecuari" in t and "mensal" in t and ("uf" in t.split() or t.strip().endswith(" uf")):
            return urljoin(base_url, href.strip())
    return None


def baixar_arquivo_conab() -> tuple[Path | None, dict]:
    info = {"tentativa_em": datetime.now(timezone.utc).isoformat(timespec="minutes")}
    try:
        pagina = requests.get(PAGINA_DOWNLOADS, headers=HEADERS, timeout=60)
        pagina.raise_for_status()
        link = localizar_link_arquivo(pagina.text, PAGINA_DOWNLOADS)
        if not link:
            raise RuntimeError(
                "não encontrei, no HTML da página de downloads, nenhum link cujo "
                "texto contenha 'Preços agropecuários' + 'Mensal' + 'UF' — o layout "
                "da página pode ter mudado, ou a CONAB pode ter renomeado o arquivo. "
                "Não vou adivinhar uma URL: confira manualmente em "
                f"{PAGINA_DOWNLOADS}"
            )
        resp = requests.get(link, headers=HEADERS, timeout=180)
        resp.raise_for_status()
        ext = ".xlsx" if resp.content[:2] == b"PK" else ".csv" if b"," in resp.content[:2000] or b";" in resp.content[:2000] else ".bin"
        ensure_dirs(PASTA_RAW)
        destino = PASTA_RAW / f"precos_agropecuarios_mensal_uf{ext}"
        destino.write_bytes(resp.content)
        info.update(ok=True, mensagem=f"baixado de {link} ({len(resp.content)} bytes)", url_arquivo=link)
        return destino, info
    except Exception as e:  # rede bloqueada, site fora do ar, layout mudou...
        info.update(ok=False, mensagem=f"{type(e).__name__}: {e}")
        logger.warning(f"download CONAB falhou: {info['mensagem']}")
        return None, info


# --------------------------------------------------------------- leitura tolerante do arquivo
# Nomes de coluna candidatos (normalizados) para cada campo — o layout exato
# do arquivo da CONAB não foi confirmado (auditoria); em vez de assumir um
# nome fixo, procura por qualquer um destes por substring.
COLUNAS_CANDIDATAS = {
    "produto": ["produto", "descricao produto", "descricaoproduto", "produto pesquisado"],
    "nivel": ["nivel de comercializacao", "nivel comercializacao", "nivelcomercializacao", "nivel"],
    "uf": ["uf", "unidade da federacao", "estado", "sigla uf"],
    "data": ["data", "mes/ano", "mesano", "ano/mes", "anomes", "mes", "competencia", "periodo"],
    "preco": ["preco", "preco medio", "precomedio", "valor", "media", "preco r$", "preco (r$)"],
    "unidade": ["unidade", "unid", "unidade de medida"],
}


def _achar_coluna(colunas_normalizadas: dict[str, str], candidatos: list[str]) -> str | None:
    for cand in candidatos:
        for norm, original in colunas_normalizadas.items():
            if cand == norm or cand in norm:
                return original
    return None


def ler_arquivo_conab(caminho: Path) -> pd.DataFrame:
    """Lê o arquivo bruto (CSV ou XLSX) e devolve colunas padronizadas:
    produto, nivel, uf, ano_mes (Timestamp), preco (float). Levanta erro
    claro — em vez de silenciosamente ler a coluna errada — se não achar
    algum campo obrigatório."""
    if caminho.suffix.lower() == ".xlsx":
        bruto = pd.read_excel(caminho, dtype=str)
    else:
        # codificação e separador do arquivo real não foram confirmados —
        # tenta as combinações mais comuns em exports de órgão público
        # brasileiro (';'/',' × utf-8/latin-1) em vez de assumir uma.
        bruto = None
        for enc in ("utf-8-sig", "latin-1"):
            for sep in (";", ","):
                try:
                    tentativa = pd.read_csv(caminho, sep=sep, dtype=str, encoding=enc)
                except (UnicodeDecodeError, pd.errors.ParserError):
                    continue
                if tentativa.shape[1] > 1:
                    bruto = tentativa
                    break
            if bruto is not None:
                break
        if bruto is None:
            raise ValueError("não consegui ler o arquivo com nenhuma combinação conhecida de separador/codificação")

    colunas_normalizadas = {_normalizar(c): c for c in bruto.columns}
    mapeadas = {campo: _achar_coluna(colunas_normalizadas, cands) for campo, cands in COLUNAS_CANDIDATAS.items()}
    faltando = [c for c in ("produto", "nivel", "uf", "data", "preco") if not mapeadas[c]]
    if faltando:
        raise ValueError(
            f"não encontrei coluna para {faltando} no arquivo baixado. "
            f"Colunas disponíveis: {list(bruto.columns)}. "
            "O layout do arquivo mudou frente ao que este script espera — "
            "ajuste COLUNAS_CANDIDATAS depois de olhar o arquivo real, não adivinhe."
        )

    df = pd.DataFrame({
        "produto": bruto[mapeadas["produto"]].astype(str),
        "nivel": bruto[mapeadas["nivel"]].astype(str),
        "uf": bruto[mapeadas["uf"]].astype(str),
        "data_bruta": bruto[mapeadas["data"]].astype(str),
        "preco_bruto": bruto[mapeadas["preco"]].astype(str),
    })
    # preço em formato BR ("4,32") ou já com ponto — trata os dois
    df["preco"] = pd.to_numeric(
        df["preco_bruto"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
        errors="coerce",
    )
    # formato exato da data não confirmado — tenta os mais comuns em ordem,
    # sem deixar o dateutil "adivinhar" (isso já causou dia/mês trocado em
    # outras fontes públicas brasileiras).
    ano_mes = pd.Series(pd.NaT, index=df.index, dtype="datetime64[ns]")
    for fmt in ("%m/%Y", "%Y-%m", "%d/%m/%Y", "%Y-%m-%d"):
        falta = ano_mes.isna()
        if not falta.any():
            break
        tentativa = pd.to_datetime(df.loc[falta, "data_bruta"], errors="coerce", format=fmt)
        ano_mes.loc[falta] = tentativa
    df["ano_mes"] = ano_mes.dt.to_period("M").dt.to_timestamp()
    return df


# --------------------------------------------------------------- filtro + agregação
def filtrar_produto(df: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    produto_norm = df["produto"].map(_normalizar)
    nivel_norm = df["nivel"].map(_normalizar)
    mask = (
        produto_norm.str.contains(cfg["regex_incluir"])
        & ~produto_norm.str.contains(cfg["regex_excluir"])
        & (nivel_norm == "varejo")
    )
    return df[mask].copy()


def agregar_mensal(df_produto: pd.DataFrame) -> pd.DataFrame:
    """Média SIMPLES entre as UFs pesquisadas naquele mês — nunca chamada de
    'preço nacional da CONAB' (a CONAB não documenta uma agregação nacional
    oficial para esta série, ver auditoria). Meses sem nenhuma UF válida não
    entram no resultado — não são preenchidos com o mês vizinho nem
    interpolados."""
    df_produto = df_produto.dropna(subset=["ano_mes", "preco"])
    df_produto = df_produto[df_produto["preco"].between(*FAIXA_PLAUSIVEL_RS_KG)]
    grupos = df_produto.groupby("ano_mes")
    linhas = []
    for ano_mes, g in grupos:
        ufs = sorted(g["uf"].str.upper().str.strip().unique())
        linhas.append({
            "ano_mes": ano_mes,
            "preco_brl_kg": round(float(g["preco"].mean()), 4),
            "n_ufs": len(ufs),
            "ufs": ",".join(ufs),
        })
    return pd.DataFrame(linhas).sort_values("ano_mes")


# --------------------------------------------------------------- validação
class ErroValidacao(Exception):
    pass


def validar(resultado: pd.DataFrame, item: str) -> None:
    if resultado.empty:
        raise ErroValidacao(f"{item}: nenhuma linha sobrou após filtro — confira regex/nível antes de aceitar o resultado")
    dup = resultado["ano_mes"].duplicated()
    if dup.any():
        raise ErroValidacao(f"{item}: mês duplicado em {resultado.loc[dup, 'ano_mes'].tolist()}")
    if (resultado["preco_brl_kg"] <= 0).any():
        raise ErroValidacao(f"{item}: preço zero ou negativo encontrado")
    fora = ~resultado["preco_brl_kg"].between(*FAIXA_PLAUSIVEL_RS_KG)
    if fora.any():
        raise ErroValidacao(f"{item}: preço fora da faixa plausível {FAIXA_PLAUSIVEL_RS_KG} em {resultado.loc[fora, 'ano_mes'].tolist()}")
    if (resultado["n_ufs"] <= 0).any():
        raise ErroValidacao(f"{item}: linha sem nenhuma UF contabilizada")


# --------------------------------------------------------------- orquestração
def processar(caminho_arquivo: Path) -> dict[str, pd.DataFrame]:
    bruto = ler_arquivo_conab(caminho_arquivo)
    saida = {}
    for chave, cfg in PRODUTOS_CONAB.items():
        filtrado = filtrar_produto(bruto, cfg)
        agregado = agregar_mensal(filtrado)
        validar(agregado, cfg["produto_conab"])
        agregado["produto_conab"] = cfg["produto_conab"]
        agregado["item_dashboard"] = cfg["item_dashboard"]
        saida[chave] = agregado
        logger.info(f"  {cfg['produto_conab']}: {len(agregado)} meses, {agregado['ano_mes'].min():%m/%Y}–{agregado['ano_mes'].max():%m/%Y}, média {agregado['n_ufs'].mean():.1f} UFs/mês")
    return saida


def gravar_saida(series: dict[str, pd.DataFrame]) -> None:
    partes = []
    for chave, df in series.items():
        cfg = PRODUTOS_CONAB[chave]
        parte = df.copy()
        parte["fonte"] = "CONAB"
        parte["nivel_comercializacao"] = "Varejo"
        parte["unidade"] = "R$/kg"
        parte["oficial_nacional"] = False  # nunca True nesta implementação — ver docstring do módulo
        parte["metodologia"] = "Média simples entre as UFs pesquisadas pela CONAB naquele mês (ver n_ufs de cada mês) — cálculo do projeto, não um agregado nacional publicado pela CONAB."
        parte["definicao_compativel_indice_ibge"] = cfg["definicao_compativel"]
        partes.append(parte)
    final = pd.concat(partes, ignore_index=True)
    final["ano_mes"] = final["ano_mes"].dt.strftime("%Y-%m-%d")
    ensure_dirs(DATA_PROCESSED)
    final.to_csv(ARQUIVO_SAIDA, index=False)
    logger.info(f"Salvo: {ARQUIVO_SAIDA} ({len(final)} linhas)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--autoteste", action="store_true", help="valida a lógica de parsing/filtro/agregação contra scripts/fixtures/conab_precos_exemplo.csv (dado SINTÉTICO, não real) — não escreve em data/processed/")
    args = ap.parse_args()

    if args.autoteste:
        fixture = Path(__file__).parent / "fixtures" / "conab_precos_exemplo.csv"
        logger.info(f"AUTOTESTE — usando dado sintético em {fixture}, NÃO é dado real da CONAB e NÃO será gravado em data/processed/")
        series = processar(fixture)
        for chave, df in series.items():
            logger.info(f"  autoteste {chave}: OK — {df.to_dict('records')}")
        logger.info("Autoteste concluído: a lógica de parsing/filtro/agregação/validação funciona contra o formato esperado. Isso NÃO confirma que o arquivo real da CONAB tem esse mesmo layout — só é possível confirmar abrindo o arquivo real (ver docs/AUDITORIA_PRECOS_ALIMENTOS.md).")
        return 0

    status_antigo = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    caminho, info = baixar_arquivo_conab()

    status = {
        "fonte": "CONAB — Sistema de Informações de Mercado (SIM), Preços Agropecuários",
        "fonte_url": FONTE_URL,
        "pagina_downloads": PAGINA_DOWNLOADS,
        **info,
        "ultimo_sucesso_em": info["tentativa_em"] if info.get("ok") else status_antigo.get("ultimo_sucesso_em"),
    }

    if not info.get("ok") or caminho is None:
        STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
        if ARQUIVO_SAIDA.exists():
            logger.warning("Download falhou — mantendo conab_precos_varejo.csv existente (não sobrescrito).")
        else:
            logger.warning("Download falhou e não há conab_precos_varejo.csv anterior — Arroz e Feijão carioca seguem só com o índice IBGE nesta execução.")
        return 0  # falha não-crítica: o resto do pipeline (build_dashboard_data.py) funciona sem este arquivo

    try:
        series = processar(caminho)
        gravar_saida(series)
        status["ok"] = True
    except (ErroValidacao, ValueError) as e:
        logger.error(f"Arquivo baixado mas falhou na validação — NADA foi gravado em {ARQUIVO_SAIDA.name}: {e}")
        status["ok"] = False
        status["mensagem"] = f"baixado, mas falhou no parsing/validação: {e}"

    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if status["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
