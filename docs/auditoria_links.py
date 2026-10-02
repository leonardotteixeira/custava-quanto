"""Auditoria dos links externos da camada de notícias e contexto (data/processed/noticias.json).

    python docs/auditoria_links.py            # audita e grava data/raw/auditoria_links_noticias.csv (não versionado)
    python docs/auditoria_links.py --resumo   # só imprime o resumo do último CSV

Para cada item: status HTTP final, redirecionamentos, https, título da página, data de publicação encontrada,
domínio, imagem (quando houver) e comparação com o que está gravado no projeto (título, data, veículo).
Para o que não responde 200, consulta a API de disponibilidade do Internet Archive (Wayback Machine) e registra o
instantâneo mais próximo, se existir. NÃO altera nenhum dado do projeto: só lê e grava o CSV de auditoria.

Classes:
  OK                   200, https, título e data conferem
  OK_COM_REDIRECT      200 depois de redirecionamento (URL final registrada)
  OK_SEM_DATA_NA_PAGINA 200 e título confere, mas a página não expõe a data em metadado legível
  TITULO_DIFERENTE     200, mas o título da página difere do gravado (revisão manual)
  DATA_DIFERENTE       200, mas a data da página difere do gravado em mais de 1 dia (revisão manual)
  BLOQUEADO            403/429/999 ou verificação anti-robô: a página não foi lida, não prova que o link quebrou
  NAO_ENCONTRADO       404/410
  ERRO_REDE            tempo esgotado, SSL ou DNS
  OUTRO                outro status
"""
from __future__ import annotations

import csv
import difflib
import json
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

import requests

RAIZ = Path(__file__).resolve().parents[1]
SAIDA = RAIZ / "data" / "raw" / "auditoria_links_noticias.csv"  # data/raw/ não é versionado
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t or "")
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9 ]+", " ", t).strip()


def meta(html: str, *chaves: str) -> str | None:
    for ch in chaves:
        for m in re.finditer(r"<meta[^>]+>", html, re.I):
            tag = m.group(0)
            if re.search(rf'(?:property|name|itemprop)=["\']{re.escape(ch)}["\']', tag, re.I):
                c = re.search(r'content=["\']([^"\']*)["\']', tag, re.I)
                if c:
                    return unescape(c.group(1)).strip()
    return None


def titulo_pagina(html: str) -> str | None:
    t = meta(html, "og:title", "twitter:title")
    if t:
        return t
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    return unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else None


def data_pagina(html: str) -> str | None:
    d = meta(html, "article:published_time", "og:published_time", "datePublished", "date", "DC.date.issued", "publish-date")
    if not d:
        m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', html)
        d = m.group(1) if m else None
    if not d:
        m = re.search(r'<time[^>]+datetime=["\']([^"\']+)["\']', html, re.I)
        d = m.group(1) if m else None
    return d[:10] if d and re.match(r"\d{4}-\d{2}-\d{2}", d) else None


def dia(d: str) -> int:
    from datetime import date
    a, m, dd = (int(x) for x in d.split("-"))
    return date(a, m, dd).toordinal()


def wayback(url: str) -> str:
    try:
        r = requests.get("https://archive.org/wayback/available", params={"url": url}, timeout=20)
        snap = (r.json().get("archived_snapshots") or {}).get("closest")
        return snap["url"] if snap and snap.get("available") else ""
    except Exception:
        return ""


def auditar(item: dict) -> dict:
    url = item["url"]
    out = {"id": item["id"], "veiculo": item["veiculo"], "data_gravada": item["data"], "titulo_gravado": item["titulo"], "url": url,
           "marco": bool(item.get("marco")), "https": urlparse(url).scheme == "https", "status": "", "url_final": "", "redirecionamentos": 0,
           "titulo_pagina": "", "similaridade_titulo": "", "data_pagina": "", "dominio_final": "", "imagem": item.get("imagem") or "",
           "imagem_status": "", "classe": "", "wayback": ""}
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"}, timeout=30, allow_redirects=True)
    except requests.exceptions.RequestException as e:
        out["classe"], out["status"] = "ERRO_REDE", type(e).__name__
        out["wayback"] = wayback(url)
        return out
    out["status"] = r.status_code
    out["url_final"] = r.url
    out["redirecionamentos"] = len(r.history)
    out["dominio_final"] = urlparse(r.url).netloc
    if r.status_code in (403, 429, 999) or (r.status_code == 200 and re.search(r"(captcha|cf-chl|just a moment|attention required)", r.text[:4000], re.I)):
        out["classe"] = "BLOQUEADO"
    elif r.status_code in (404, 410):
        out["classe"] = "NAO_ENCONTRADO"
    elif r.status_code != 200:
        out["classe"] = "OUTRO"
    else:
        html = r.text
        tp, dp = titulo_pagina(html), data_pagina(html)
        out["titulo_pagina"], out["data_pagina"] = tp or "", dp or ""
        sim = difflib.SequenceMatcher(None, norm(item["titulo"]), norm(tp or "")).ratio() if tp else 0.0
        # título gravado contido no da página (ou o contrário) também vale: sites acrescentam o nome do veículo
        if tp and (norm(item["titulo"]) in norm(tp) or norm(tp) in norm(item["titulo"])):
            sim = max(sim, 0.95)
        out["similaridade_titulo"] = round(sim, 2)
        if sim < 0.6:
            out["classe"] = "TITULO_DIFERENTE"
        elif dp and abs(dia(dp) - dia(item["data"])) > 1:
            out["classe"] = "DATA_DIFERENTE"
        elif not dp:
            out["classe"] = "OK_SEM_DATA_NA_PAGINA"
        else:
            out["classe"] = "OK_COM_REDIRECT" if out["redirecionamentos"] else "OK"
    if out["classe"] in ("BLOQUEADO", "NAO_ENCONTRADO", "ERRO_REDE", "OUTRO"):
        out["wayback"] = wayback(url)
    img = item.get("imagem")
    if img:
        iu = img if img.startswith("http") else None
        if iu:
            try:
                out["imagem_status"] = requests.head(iu, headers={"User-Agent": UA}, timeout=20, allow_redirects=True).status_code
            except requests.exceptions.RequestException as e:
                out["imagem_status"] = type(e).__name__
        else:
            out["imagem_status"] = "local" if (RAIZ / "dashboard" / img).exists() else "arquivo local ausente"
    return out


def resumo(linhas: list[dict]) -> None:
    from collections import Counter
    c = Counter(l["classe"] for l in linhas)
    print(f"{len(linhas)} links; https: {sum(1 for l in linhas if str(l['https']) == 'True')}")
    for k, v in sorted(c.items(), key=lambda x: -x[1]):
        print(f"  {k:24s} {v}")
    for l in linhas:
        if not str(l["classe"]).startswith("OK"):
            print(f"  - [{l['classe']}] {l['id']} {l['veiculo']} {l['status']} {l['url'][:90]}  wayback: {l['wayback'][:60] if l['wayback'] else '-'}")


def main() -> None:
    if "--resumo" in sys.argv:
        resumo(list(csv.DictReader(open(SAIDA, encoding="utf-8"))))
        return
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    itens = json.loads((RAIZ / "data" / "processed" / "noticias.json").read_text(encoding="utf-8"))["itens"]
    # no máximo 2 conexões por vez por domínio: um pool pequeno e uma pausa curta bastam para 142 links
    with ThreadPoolExecutor(max_workers=6) as ex:
        linhas = []
        for r in ex.map(lambda i: (time.sleep(0.2), auditar(i))[1], itens):
            linhas.append(r)
    campos = list(linhas[0])
    with open(SAIDA, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(linhas)
    resumo(linhas)


if __name__ == "__main__":
    main()
