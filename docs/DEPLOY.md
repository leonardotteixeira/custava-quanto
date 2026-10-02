# Publicação e domínio

Endereço oficial: **https://custavaquanto.me/**

O site é estático e é publicado no **GitHub Pages por GitHub Actions**, na raiz do domínio. Não há servidor nem etapa de build do site: o workflow só monta uma pasta com o conteúdo de `dashboard/` e os JSON de dados.

## Como funciona

- **Provedor:** GitHub Pages com *Source* = "GitHub Actions" (Settings > Pages > *Build and deployment*). *Custom domain* = `custavaquanto.me`, com *Enforce HTTPS* marcado.
- **Workflow:** [`.github/workflows/pages.yml`](../.github/workflows/pages.yml). Roda a cada push na `master` que mude `dashboard/`, `data/processed/*.json`, `robots.txt`, `sitemap.xml` ou o próprio workflow, e manualmente em Actions > *Publicar no GitHub Pages* > **Run workflow**. Nada é gerado no workflow: os JSON publicados são os versionados em `data/processed/` (rode `scripts/update_data.py` localmente e faça commit).
- **O que o workflow monta** (`_site/`): o conteúdo de `dashboard/` na raiz; `data/processed/*.json` em `/data/processed/`; `CNAME`, `robots.txt` e `sitemap.xml`; um `.nojekyll`; e uma página em `/dashboard/index.html` que redireciona para `/` mantendo `?historia=...` e `#capítulo`, para que os endereços antigos continuem valendo. O site lê os dados por `../data/processed/x.json`, que a partir da raiz do domínio resolve para `/data/processed/x.json`; por isso o código do site é o mesmo localmente e em produção.
- **Verificações do próprio workflow:** falha se `_site/index.html` ou `_site/data/processed/dashboard_data.json` não existirem e se sobrar o caminho `/dashboard/` no `index.html` publicado (as imagens de prévia usam `/assets/` na raiz).

## O que o repositório contém para o domínio

| Arquivo | Para quê |
|---|---|
| `CNAME` | `custavaquanto.me`; copiado para o site publicado. |
| `robots.txt` e `sitemap.xml` | Permitem tudo e listam `https://custavaquanto.me/`; ficam na raiz do site porque os rastreadores só procuram ali. |
| `dashboard/index.html` | `<link rel="canonical">` e `og:url` apontam para `https://custavaquanto.me/`; também `og:type`, `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:image` (1200×630, `dashboard/assets/brand/og-image.jpg`) e `twitter:card`. Robôs de prévia (WhatsApp, X, Facebook) não executam JavaScript, então é daqui que sai a prévia de quem compartilha o link. |
| `.github/workflows/pages.yml` | O workflow acima. |

Todos os recursos externos do site (Google Fonts, links de fonte, imagens de matérias) usam `https://`.

## DNS (Namecheap)

Valores da documentação do GitHub Pages ("Managing a custom domain for your GitHub Pages site"). Em Advanced DNS > Host Records, com os nameservers da Namecheap:

| Tipo | Host | Valor |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA (opcional) | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME (opcional, só se quiser que `www` funcione) | `www` | `leonardotteixeira.github.io.` |

O `www` não é necessário: o endereço oficial é o domínio sem `www`. Nunca aponte para o nome do repositório, só para `leonardotteixeira.github.io`. Recomendado: *verificar* o domínio na conta do GitHub (Settings > Pages > Add a domain, com um registro TXT), o que impede outras pessoas de usarem `custavaquanto.me` ou subdomínios em repositórios delas.

## Como conferir

```bash
nslookup custavaquanto.me 8.8.8.8             # deve listar IPs 185.199.108-111.153
curl -sI https://custavaquanto.me/ | head -3  # HTTP/2 200
curl -sI http://custavaquanto.me/ | head -3   # 301 para https (Enforce HTTPS)
curl -s https://custavaquanto.me/robots.txt
```

## Voltar a uma versão anterior

Reverta o commit que quebrou o site (`git revert <commit>`) e faça push: o workflow republica. Para republicar sem novo commit, use Actions > *Publicar no GitHub Pages* > **Run workflow**. Não há mais publicação "por branch": o *Source* do Pages deve continuar em "GitHub Actions".
