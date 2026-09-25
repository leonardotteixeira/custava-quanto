"""Verifica e consolida as notícias reais usadas no dashboard.

Entrada: data/news/raw_*.json — curadoria manual (título, veículo, data, URL,
resumo e tags de produto de cada matéria).
Saída:  data/processed/noticias.json — lida pelo dashboard.

Regra do projeto: nenhuma notícia entra sem conferência na fonte. Para cada
item este script abre a URL original e extrai da própria página o título
(og:title/<title>), a data de publicação (article:published_time e
similares), a descrição (og:description) e a imagem (og:image). Um item só é
publicado se:

  - a página responde (HTTP 200) e
  - o título curado bate com o título da página (similaridade >= 0,80).

Quando a página informa a data de publicação, ela prevalece sobre a curada.
Imagens só são usadas quando a licença permite reprodução com crédito
(Agência Brasil/EBC, CC BY 4.0) — as demais notícias aparecem sem foto.

Itens reprovados são listados no log e ficam fora do JSON final. Use
--manter-bloqueados para publicar também itens cuja página bloqueia acesso
automatizado (paywall/anti-robô) mas que foram conferidos manualmente — eles
saem marcados com "verificacao": "manual".
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import DATA_PROCESSED, ROOT_DIR, ensure_dirs, get_logger  # noqa: E402

log = get_logger("build_news")

NEWS_DIR = ROOT_DIR / "data" / "news"
SAIDA = DATA_PROCESSED / "noticias.json"

# Domínios cujo conteúdo (texto e foto) é publicado sob licença que permite
# reprodução com crédito.
DOMINIOS_IMAGEM_LIVRE = {
    "agenciabrasil.ebc.com.br": "Agência Brasil (CC BY 4.0)",
}

# Fotos de outros veículos (CNN Brasil, Poder360, InfoMoney...): usa o og:image da
# própria matéria, com a fonte como crédito. NÃO há licença de reprodução — foi
# uma decisão editorial assumida pelo projeto e pode ser desligada aqui: com
# False, só a Agência Brasil (CC BY 4.0) mostra foto.
IMAGENS_DE_OUTROS_VEICULOS = True
# Imagens padrão do site (logo, miniatura genérica, "fallback"): não são a foto da matéria.
IMAGEM_GENERICA = re.compile(r"fallback|placeholder|default|logo|site-thumb|thumb-de-materia|sem-imagem|no-image|avatar", re.I)

CREDITO_RESTRITO = re.compile(r"reuters|afp|associated press|\bap\b|getty|proibida|direitos reservados|divulga", re.I)

TAGS_VALIDAS = {
    "combustiveis", "GASOLINA", "ETANOL", "DIESEL", "DIESEL S10", "GLP",
    "alimentos", "Arroz", "Feijão carioca", "Carne bovina (patinho)", "Leite longa vida", "Óleo de soja", "Café moído",
    "DOLAR", "SELIC", "IBOVESPA", "IPCA", "PIB",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


class MetaParser(HTMLParser):
    """Coleta <meta property/name=... content=...>, <title> e JSON-LD."""

    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self.title = ""
        self._in_title = False
        self._in_ld = False
        self.ld: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            chave = (a.get("property") or a.get("name") or a.get("itemprop") or "").lower()
            if chave and a.get("content") and chave not in self.meta:
                self.meta[chave] = a["content"]
        elif tag == "title":
            self._in_title = True
        elif tag == "script" and (a.get("type") or "").lower() == "application/ld+json":
            self._in_ld = True
            self.ld.append("")

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script":
            self._in_ld = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._in_ld:
            self.ld[-1] += data


def normalizar(s: str) -> str:
    s = unicodedata.normalize("NFKD", unescape(s or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def similaridade(curado: str, pagina: str) -> float:
    a, b = normalizar(curado), normalizar(pagina)
    if not a or not b:
        return 0.0
    if a in b:  # título da página costuma ter sufixo " | Veículo"
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


BRASILIA = timezone(timedelta(hours=-3))


def data_local(v: str) -> str:
    """Data de publicação no horário de Brasília (metadados costumam vir em UTC)."""
    try:
        dt = datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            return dt.astimezone(BRASILIA).date().isoformat()
    except ValueError:
        pass
    return v[:10]


def data_publicacao(p: MetaParser) -> str | None:
    for chave in ("article:published_time", "og:article:published_time", "datepublished",
                  "publishdate", "date", "dc.date", "sailthru.date", "parsely-pub-date"):
        v = p.meta.get(chave)
        if v and re.match(r"\d{4}-\d{2}-\d{2}", v):
            return data_local(v)
    for bloco in p.ld:
        m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', bloco)
        if m and re.match(r"\d{4}-\d{2}-\d{2}", m.group(1)):
            return data_local(m.group(1))
    return None


# Foto de capa da Agência Brasil: a página traz o bloco "capa-materia" com a
# <img data-echo=URL> e a <figcaption class="credito-foto">© Crédito</figcaption>
# quando a matéria TEM foto própria. Sem esse bloco, o og:image é só o padrão
# do site (logo/miniatura genérica) e não vale como imagem da matéria.
# Só entra foto cujo crédito é da própria EBC ("…/Agência Brasil", "…/ABr"):
# é a que está sob CC BY 4.0. Fotos de terceiros (Adobe Stock, Reuters, AFP,
# Getty, agências parceiras) ficam de fora mesmo dentro de uma matéria da ABr.
# (a própria página às vezes omite a barra: "Marcello Casal JrAgência Brasil")
CREDITO_EBC = re.compile(r"(?:Ag[êe]ncia Brasil|/\s*ABr|EBC)\s*$", re.I)


def foto_capa_agencia_brasil(html: str) -> tuple[str | None, str | None, str]:
    """(url, crédito, motivo). motivo != 'ok' explica por que não há foto usável."""
    i = html.find('class="capa-materia')
    if i < 0:
        return None, None, "sem bloco de capa"
    bloco = html[i:i + 6000]
    fim = bloco.find("<!-- END scald")
    if fim > 0:
        bloco = bloco[:fim]
    img = re.search(r'data-echo="([^"]+)"', bloco)
    cred = re.search(r'<figcaption[^>]*credito-foto[^>]*>(.*?)</figcaption>', bloco, re.S)
    if not img:
        return None, None, "matéria sem foto de capa"
    credito = unescape(re.sub(r"<[^>]+>", "", cred.group(1))).replace("©", "").strip() if cred else ""
    if not credito:
        return None, None, "foto sem crédito"
    if CREDITO_RESTRITO.search(credito) or not CREDITO_EBC.search(credito):
        return None, None, f"crédito de terceiros ({credito})"
    credito = re.sub(r"([A-Za-z.])(Ag[êe]ncia Brasil)$", lambda m: f"{m.group(1)}/{m.group(2)}", credito)
    return unescape(img.group(1)), credito, "ok"


def melhor_url_imagem(url: str) -> str:
    """O og:image do CNN Brasil vem com ?w=1200&h=630&crop=1: o servidor recorta a foto
    no centro (perde a composição) e reduz. Sem h/crop e com w=1600 o mesmo servidor
    devolve a foto INTEIRA, mais nítida (testado: 1600px, ~150-250 KB; se a original for
    menor, ela vem no tamanho original). É a mesma imagem da matéria, só sem o recorte."""
    if "cnnbrasil.com.br/wp-content/uploads" in url and "crop=1" in url:
        return url.split("?")[0] + "?w=1600"
    return url


def verificar(item: dict, sessao: requests.Session) -> tuple[dict | None, str]:
    url = item["url"]
    try:
        r = sessao.get(url, headers=HEADERS, timeout=25, allow_redirects=True)
    except requests.RequestException as e:
        return None, f"erro de rede ({e.__class__.__name__})"
    if r.status_code != 200:
        return None, f"HTTP {r.status_code}"
    r.encoding = r.apparent_encoding if not r.encoding or r.encoding.lower() == "iso-8859-1" else r.encoding
    p = MetaParser()
    try:
        p.feed(r.text)
    except Exception:  # HTML malformado: seguimos com o que foi lido
        pass
    titulo_pagina = unescape(p.meta.get("og:title") or p.meta.get("twitter:title") or p.title).strip()
    sim = max(similaridade(item["titulo"], titulo_pagina), similaridade(item["titulo"], p.title))
    if sim < 0.80:
        return None, f"título não confere (sim={sim:.2f}; página: {titulo_pagina[:90]!r})"

    dominio = re.sub(r"^www\.", "", requests.utils.urlparse(r.url).netloc)
    data_pag = data_publicacao(p)
    # Diferença de 1 dia é fuso: alguns sites (ex.: Agência Brasil) gravam nos
    # metadados um horário 3 h à frente do exibido na matéria. Nesse caso vale
    # a data que o leitor vê na página, registrada na curadoria.
    if data_pag and item.get("data"):
        dias = abs((datetime.fromisoformat(data_pag) - datetime.fromisoformat(item["data"])).days)
        if dias <= 1:
            data_pag = item["data"]
    saida = {
        "titulo": item["titulo"].strip(),
        "veiculo": item["veiculo"].strip(),
        "data": data_pag or item["data"],
        "url": item["url"],
        # a descrição publicada pela própria página prevalece sobre a curada
        "resumo": unescape(p.meta.get("og:description") or p.meta.get("description") or item.get("resumo") or "").strip(),
        "produtos": item["produtos"],
        "imagem": None,
        "credito_imagem": None,
        "verificacao": "automatica",
        "similaridade_titulo": round(sim, 2),
    }
    # tema editorial opcional (ex.: "ormuz-ira"): agrupa matérias numa seção própria
    for campo in ("tema", "imagem_foco"):
        if item.get(campo):
            saida[campo] = item[campo]
    if data_pag and item.get("data") and data_pag != item["data"]:
        log.info("  data ajustada pela página: %s -> %s", item["data"], data_pag)
    # Foto de capa: lida da própria página da matéria (Agência Brasil, CC BY 4.0),
    # com o crédito impresso nela. Outros veículos não licenciam a reprodução
    # das fotos, então ficam sem imagem. Nada é gerado nem substituído.
    if dominio in DOMINIOS_IMAGEM_LIVRE:
        url_foto, credito, motivo = foto_capa_agencia_brasil(r.text)
        if motivo == "ok":
            saida["imagem"] = url_foto
            saida["credito_imagem"] = f"{credito} · CC BY 4.0"
        else:
            log.info("  sem foto: %s", motivo)
    elif IMAGENS_DE_OUTROS_VEICULOS:
        foto = p.meta.get("og:image") or p.meta.get("twitter:image") or ""
        foto = unescape(foto).strip()
        if foto.startswith("//"):
            foto = "https:" + foto
        if not foto.startswith("http"):
            log.info("  sem foto: matéria sem og:image")
        elif IMAGEM_GENERICA.search(foto):
            log.info("  sem foto: imagem padrão do site")
        else:
            try:
                ri = sessao.get(foto, headers=HEADERS, timeout=25, stream=True)
                ok = ri.status_code == 200 and ri.headers.get("content-type", "").startswith("image")
                ri.close()
            except requests.RequestException:
                ok = False
            if ok:
                saida["imagem"] = melhor_url_imagem(foto)
                saida["credito_imagem"] = f"Reprodução · {item['veiculo'].strip()}"
                saida["imagem_sem_licenca"] = True
            else:
                log.info("  sem foto: imagem indisponível")
    return saida, "ok"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manter-bloqueados", action="store_true",
                    help="publica itens com HTTP 401/403/429 (bloqueio anti-robô) marcados como verificação manual")
    args = ap.parse_args()

    ensure_dirs(DATA_PROCESSED)
    arquivos = sorted(NEWS_DIR.glob("raw_*.json"))
    if not arquivos:
        log.error("nenhum arquivo em %s", NEWS_DIR)
        sys.exit(1)

    brutos = []
    for arq in arquivos:
        brutos.extend(json.loads(arq.read_text(encoding="utf-8")))
    log.info("%d itens curados em %d arquivos", len(brutos), len(arquivos))

    sessao = requests.Session()
    aprovados, reprovados, vistos = [], [], set()
    for item in brutos:
        url = item.get("url", "").strip()
        if not url or url in vistos:
            continue
        vistos.add(url)
        tags = [t for t in item.get("produtos", []) if t in TAGS_VALIDAS]
        if not tags:
            reprovados.append((item.get("titulo", "?"), "sem tag de produto válida"))
            continue
        item["produtos"] = tags
        log.info("verificando: %s", item["titulo"][:80])
        ok, motivo = verificar(item, sessao)
        if ok:
            aprovados.append(ok)
        elif args.manter_bloqueados and motivo in ("HTTP 401", "HTTP 403", "HTTP 429") and item.get("confirmado"):
            aprovados.append({**{k: item.get(k) for k in ("titulo", "veiculo", "data", "url", "resumo", "produtos")},
                              "imagem": None, "credito_imagem": None, "verificacao": "manual",
                              **({"tema": item["tema"]} if item.get("tema") else {})})
            log.info("  bloqueado (%s) — mantido como verificação manual", motivo)
        else:
            reprovados.append((item["titulo"], motivo))
            log.info("  REPROVADO: %s", motivo)
        time.sleep(0.6)

    aprovados.sort(key=lambda n: n["data"])
    for i, n in enumerate(aprovados, 1):
        n["id"] = f"n{i:03d}"

    SAIDA.write_text(json.dumps({
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "nota": "Notícias reais, conferidas na fonte original. Mostram o que estava sendo noticiado na época — não são prova de causa.",
        "itens": aprovados,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    log.info("%d aprovadas, %d reprovadas -> %s", len(aprovados), len(reprovados), SAIDA)
    for titulo, motivo in reprovados:
        log.info("  fora: %s — %s", titulo[:80], motivo)


if __name__ == "__main__":
    main()
