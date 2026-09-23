"""
Indicadores financeiros DIÁRIOS — Dólar, Ibovespa e Selic — com histórico
desde 2019 e atualização incremental até o dado mais recente disponível.

Fontes (verificadas em set/2026):

- Dólar: Banco Central do Brasil, SGS série 1 — "Dólar americano (venda) —
  PTAX", uma cotação oficial por dia útil. Mesma série em todo o período, sem
  misturar metodologias. https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados
- Selic: Banco Central do Brasil, SGS série 432 — META Selic definida pelo
  Copom, % a.a. (não é a Selic efetiva/diária, série 11, nem o CDI). A série
  tem uma linha por dia corrido e é publicada ADIANTADA até a próxima reunião
  do Copom: linhas com data futura são descartadas — o valor "atual" é o
  vigente na data de hoje.
- Ibovespa: fechamento diário publicado pela própria B3 na página pública de
  estatísticas do índice (backend do site: sistemaswebb3-listados.b3.com.br,
  IndexCall/GetPortfolioDay). NÃO é uma API documentada/contratual da B3 (a
  API oficial de dados de mercado é restrita a clientes); o endpoint pode
  mudar sem aviso. Escolhido porque os fechamentos batem com os oficiais — o
  histórico diário do Yahoo Finance para ^BVSP diverge (ex.: 29/12/2022:
  B3 109.734,60 pts × Yahoo 110.031).

Nenhum valor é inventado: quando uma fonte falha, o histórico já salvo em
disco é mantido e o arquivo de status registra a falha — o dashboard mostra
"última atualização em ..." em vez de fingir que o dado é atual.

Saídas (data/processed/):
  mercados_diario/dolar_ptax.csv     data, valor   (R$ por US$)
  mercados_diario/selic_meta.csv     data, valor   (% a.a., dias corridos)
  mercados_diario/ibovespa.csv       data, valor   (pontos, fechamento)
  mercados_status.json               situação de cada fonte na última execução
  bcb_contexto_mensal.csv            médias mensais (compatível com o pipeline antigo)
  ibovespa_mensal.csv                fechamento do último pregão de cada mês completo

Uso:
  .venv/Scripts/python scripts/download_mercados.py
  .venv/Scripts/python scripts/download_mercados.py --simular-falha   # testa o fallback
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
import requests

from common import DATA_PROCESSED, ensure_dirs, get_logger

logger = get_logger("download_mercados")

TZ = ZoneInfo("America/Sao_Paulo")
INICIO = date(2019, 1, 1)
PASTA = DATA_PROCESSED / "mercados_diario"
STATUS = DATA_PROCESSED / "mercados_status.json"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"}
REVISAO_DIAS = 15  # rebaixa os últimos dias a cada execução (capta revisões/atrasos)

SERIES = {
    "dolar": {
        "arquivo": "dolar_ptax.csv",
        "nome": "Dólar comercial — PTAX, venda",
        "fonte": "Banco Central do Brasil (SGS, série 1)",
        "fonte_url": "https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do?method=prepararTelaLocalizarSeries",
        "frequencia": "diária (dias úteis)",
    },
    "selic": {
        "arquivo": "selic_meta.csv",
        "nome": "Meta Selic (Copom)",
        "fonte": "Banco Central do Brasil (SGS, série 432)",
        "fonte_url": "https://www.bcb.gov.br/controleinflacao/historicotaxasjuros",
        "frequencia": "muda nas reuniões do Copom (valor vigente em cada dia)",
    },
    "ibovespa": {
        "arquivo": "ibovespa.csv",
        "nome": "Ibovespa — fechamento",
        "fonte": "B3 (estatísticas históricas do índice, site público)",
        "fonte_url": "https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-amplos/indice-ibovespa-ibovespa-estatisticas-historicas.htm",
        "frequencia": "diária (pregões)",
    },
}


def agora_brt() -> datetime:
    return datetime.now(TZ)


# ------------------------------------------------------------------ fontes
def baixar_sgs(codigo: int, ini: date, fim: date) -> pd.DataFrame:
    """SGS limita consultas de séries diárias a 10 anos: consulta ano a ano."""
    partes = []
    cursor = ini
    while cursor <= fim:
        ate = min(date(cursor.year, 12, 31), fim)
        url = (f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json"
               f"&dataInicial={cursor:%d/%m/%Y}&dataFinal={ate:%d/%m/%Y}")
        r = requests.get(url, timeout=60)
        if r.status_code == 404:  # intervalo sem dados (ex.: só fim de semana)
            cursor = ate + timedelta(days=1)
            continue
        r.raise_for_status()
        dados = r.json()
        if dados:
            partes.append(pd.DataFrame(dados))
        cursor = ate + timedelta(days=1)
    if not partes:
        return pd.DataFrame(columns=["data", "valor"])
    df = pd.concat(partes, ignore_index=True)
    df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y").dt.date
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
    return df.dropna(subset=["valor"])[["data", "valor"]]


def _valor_br(s: str | None) -> float | None:
    if not s:
        return None
    return float(s.replace(".", "").replace(",", "."))


def baixar_ibovespa_b3(ano: int) -> pd.DataFrame:
    payload = base64.b64encode(json.dumps({"index": "IBOV", "language": "pt-br", "year": str(ano)}).encode()).decode()
    url = f"https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/{payload}"
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    linhas = []
    for row in r.json()["results"]:  # uma linha por dia do mês, uma coluna por mês
        for mes in range(1, 13):
            v = _valor_br(row.get(f"rateValue{mes}"))
            if v is None:
                continue
            try:
                linhas.append({"data": date(ano, mes, int(row["day"])), "valor": v})
            except ValueError:
                continue
    return pd.DataFrame(linhas, columns=["data", "valor"])


# ------------------------------------------------------------------ cache incremental
def ler_cache(nome: str) -> pd.DataFrame:
    path = PASTA / SERIES[nome]["arquivo"]
    if not path.exists():
        return pd.DataFrame(columns=["data", "valor"])
    df = pd.read_csv(path)
    df["data"] = pd.to_datetime(df["data"]).dt.date
    return df


def mesclar(antigo: pd.DataFrame, novo: pd.DataFrame) -> pd.DataFrame:
    """Novo prevalece nas datas repetidas; histórico antigo é preservado."""
    df = pd.concat([antigo, novo], ignore_index=True)
    return df.drop_duplicates("data", keep="last").sort_values("data").reset_index(drop=True)


def atualizar(nome: str, hoje: date, simular_falha: bool) -> tuple[pd.DataFrame, dict]:
    cache = ler_cache(nome)
    ini = INICIO if cache.empty else max(INICIO, cache["data"].max() - timedelta(days=REVISAO_DIAS))
    info = {"tentativa_em": agora_brt().isoformat(timespec="minutes")}
    try:
        if simular_falha:
            raise requests.ConnectionError("falha simulada (--simular-falha)")
        if nome == "dolar":
            novo = baixar_sgs(1, ini, hoje)
        elif nome == "selic":
            novo = baixar_sgs(432, ini, hoje)
        else:
            novo = pd.concat([baixar_ibovespa_b3(a) for a in range(ini.year, hoje.year + 1)], ignore_index=True)
        novo = novo[novo["data"] <= hoje]  # nunca aceitar data futura (Selic vem adiantada)
        if novo.empty and cache.empty:
            raise ValueError("fonte respondeu sem dados")
        df = mesclar(cache, novo)
        info.update(ok=True, mensagem=f"{len(novo)} registros recebidos da fonte")
    except Exception as e:  # sem internet, fonte fora do ar, formato mudou...
        if cache.empty:
            raise RuntimeError(f"{nome}: fonte indisponível e não há cópia local — {e}") from e
        df = cache
        info.update(ok=False, mensagem=f"fonte indisponível ({type(e).__name__}: {e}); usando a cópia local")
        logger.warning(f"{nome}: {info['mensagem']}")
    return df, info


# ------------------------------------------------------------------ saídas compatíveis
def gravar_mensais(dolar: pd.DataFrame, selic: pd.DataFrame, ibov: pd.DataFrame, hoje: date) -> None:
    def mes(df):
        return pd.to_datetime(df["data"]).dt.to_period("M").dt.to_timestamp()

    # mesma conta de antes (média mensal dos valores diários do SGS)
    bcb = (dolar.assign(ano_mes=mes(dolar)).groupby("ano_mes")["valor"].mean().rename("cambio_usd_brl").reset_index()
           .merge(selic.assign(ano_mes=mes(selic)).groupby("ano_mes")["valor"].mean().rename("selic_meta_aa").reset_index(),
                  on="ano_mes", how="outer").sort_values("ano_mes"))
    bcb.to_csv(DATA_PROCESSED / "bcb_contexto_mensal.csv", index=False)

    # fechamento do último pregão de cada mês COMPLETO (o mês corrente ainda não fechou)
    mes_corrente = pd.Timestamp(hoje).to_period("M").to_timestamp()
    ib = ibov.assign(ano_mes=mes(ibov)).sort_values("data").groupby("ano_mes").tail(1)
    ib = ib[ib["ano_mes"] < mes_corrente][["ano_mes", "valor"]].rename(columns={"valor": "ibovespa_pontos"})
    ib.to_csv(DATA_PROCESSED / "ibovespa_mensal.csv", index=False)
    logger.info(f"Mensais: bcb_contexto_mensal.csv (até {bcb['ano_mes'].max():%m/%Y}), ibovespa_mensal.csv (até {ib['ano_mes'].max():%m/%Y})")


def gravar_hoje(dolar: pd.DataFrame, selic: pd.DataFrame, ibov: pd.DataFrame) -> None:
    """Gera bcb_hoje.json e ibovespa_hoje.json com os últimos valores diários."""
    ts_br = agora_brt()

    # bcb_hoje.json: Dólar e Selic mais recentes
    if not dolar.empty:
        ultimo_dolar = dolar.iloc[-1]
        dolar_valor = float(ultimo_dolar["valor"])
        dolar_data = ultimo_dolar["data"]
    else:
        dolar_valor, dolar_data = None, None

    if not selic.empty:
        ultimo_selic = selic.iloc[-1]
        selic_valor = float(ultimo_selic["valor"])
        selic_data = ultimo_selic["data"]
    else:
        selic_valor, selic_data = None, None

    bcb_hoje = {}
    if dolar_valor is not None and dolar_data is not None:
        bcb_hoje["cambio_usd_brl"] = {
            "valor": dolar_valor,
            "data": str(dolar_data),
            "data_hora": ts_br.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "fonte": "Banco Central do Brasil (SGS, série 1)",
            "nota": "Cotação de encerramento do dia útil anterior ou mais recente disponível.",
        }
    if selic_valor is not None and selic_data is not None:
        bcb_hoje["selic_meta_aa"] = {
            "valor": selic_valor,
            "data": str(selic_data),
            "data_hora": ts_br.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "fonte": "Banco Central do Brasil (SGS, série 432, Meta Selic)",
            "nota": "Taxa vigente no dia (definida pelo Copom).",
        }

    if bcb_hoje:
        bcb_path = DATA_PROCESSED / "bcb_hoje.json"
        bcb_path.write_text(json.dumps(bcb_hoje, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"Salvo: {bcb_path}")

    # ibovespa_hoje.json: Ibovespa mais recente
    if not ibov.empty:
        ultimo_ibov = ibov.iloc[-1]
        ibov_valor = float(ultimo_ibov["valor"])
        ibov_data = ultimo_ibov["data"]
        ibov_hoje = {
            "pontos": ibov_valor,
            "data": str(ibov_data),
            "data_hora": ts_br.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "fonte": "B3 (fechamento de pregão)",
            "nota": "Cotação de fechamento do pregão anterior ou mais recente disponível; não é garantidamente em tempo real.",
        }
        ibov_path = DATA_PROCESSED / "ibovespa_hoje.json"
        ibov_path.write_text(json.dumps(ibov_hoje, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"Salvo: {ibov_path}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--simular-falha", action="store_true", help="finge que as fontes estão fora do ar (testa o fallback)")
    args = ap.parse_args()

    ensure_dirs(PASTA)
    hoje = agora_brt().date()
    status_antigo = json.loads(STATUS.read_text(encoding="utf-8")) if STATUS.exists() else {}
    status, frames = {}, {}

    for nome, meta in SERIES.items():
        logger.info(f"Atualizando {nome} ({meta['fonte']})...")
        df, info = atualizar(nome, hoje, args.simular_falha)
        df.to_csv(PASTA / meta["arquivo"], index=False)
        frames[nome] = df
        anterior = status_antigo.get(nome, {})
        status[nome] = {
            **{k: meta[k] for k in ("nome", "fonte", "fonte_url", "frequencia")},
            **info,
            # último sucesso: agora, ou o registrado na última execução que deu certo
            "ultimo_sucesso_em": info["tentativa_em"] if info["ok"] else anterior.get("ultimo_sucesso_em"),
            "primeiro_dado": df["data"].min().isoformat(),
            "ultimo_dado": df["data"].max().isoformat(),
            "registros": int(len(df)),
        }
        logger.info(f"  {len(df)} registros, {df['data'].min()} a {df['data'].max()} ({'ok' if info['ok'] else 'CACHE'})")

    STATUS.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    gravar_mensais(frames["dolar"], frames["selic"], frames["ibovespa"], hoje)
    gravar_hoje(frames["dolar"], frames["selic"], frames["ibovespa"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
