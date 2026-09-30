# Publicação e domínio

Última atualização: 30/09/2026
Status: **NO AR em https://custavaquanto.me/** (GitHub Pages, publicando direto da branch `master`).
Verificado em 30/09/2026 por consulta ao DNS e ao servidor (ver "Estado da verificação").

Endereço oficial: **https://custavaquanto.me/**

## Como está publicado hoje

- **Provedor:** GitHub Pages, opção "Deploy from a branch" (`master`, raiz do repositório). O
  GitHub informa `has_pages: true` para `leonardotteixeira/custava-quanto`.
- **Domínio personalizado:** `CNAME` na raiz do repositório com `custavaquanto.me`. O domínio foi
  retirado do repositório antigo `leonardotteixeira.github.io` (o `CNAME` de lá não existe mais).
- **DNS (Namecheap):** `custavaquanto.me` resolve para os IPs do GitHub Pages
  (`185.199.108.153`, `185.199.110.153`, `185.199.111.153`, entre os quatro recomendados).
- **Raiz do site:** o `index.html` da raiz (commit `47ded14`) redireciona por `meta refresh` para
  `dashboard/index.html`, onde o site vive. Como `dashboard/` e `data/` ficam lado a lado no
  repositório, o site lê os dados por `../data/processed/*.json` sem nenhuma montagem.
- **Consequência:** a página aparece em `https://custavaquanto.me/dashboard/index.html` depois do
  redirecionamento, e não na raiz do domínio.

## O que o repositório contém para o domínio

| Arquivo | Para quê |
|---|---|
| `CNAME` (raiz) | `custavaquanto.me`; é o que o Pages usa na publicação por branch. |
| `.nojekyll` e `index.html` (raiz) | Desligam o Jekyll e redirecionam a raiz para `dashboard/index.html`. |
| `robots.txt` e `sitemap.xml` (raiz) | Permitem tudo e listam `https://custavaquanto.me/`. Ficam na raiz porque os rastreadores só procuram `/robots.txt` e `/sitemap.xml` ali. |
| `dashboard/index.html` | `<link rel="canonical">` e `og:url` apontam para `https://custavaquanto.me/`; também `og:type`, `og:site_name`, `og:locale`, `og:title` e `og:description` (mesmo texto do `<title>` e da `description` que já existiam). Não há imagem de compartilhamento: nenhuma foi inventada. |
| `.github/workflows/pages.yml` | **Opcional, só manual.** Publica o site na raiz do domínio (sem `/dashboard/`) por GitHub Actions. Só vale se o *Source* do Pages for trocado (abaixo). |

Todos os recursos externos do site (Google Fonts, links de fonte, imagens de matérias) usam
`https://`; não há `http://` no site além de `localhost` em ferramentas de desenvolvimento.

## Opcional: publicar na raiz do domínio (sem `/dashboard/`)

O redirecionamento atual funciona, mas deixa o endereço final com `/dashboard/index.html` e o
canonical (`https://custavaquanto.me/`) apontando para uma página que só redireciona. Para o site
aparecer direto na raiz:

1. Em `leonardotteixeira/custava-quanto` > Settings > Pages > *Build and deployment*, troque o
   **Source** de "Deploy from a branch" para **GitHub Actions**. O campo *Custom domain* continua
   `custavaquanto.me`.
2. Em Actions > *Publicar no GitHub Pages* > **Run workflow** (a cada atualização dos dados ou do
   site; o workflow é só manual para não falhar enquanto o Source for "branch").
3. O workflow monta `_site/` com `dashboard/` na raiz e `data/processed/*.json` em
   `/data/processed/`: a partir da raiz do domínio, `../data/processed/x.json` resolve para
   `/data/processed/x.json`, então o código do site não muda. Para voltar, restaure o Source para
   "Deploy from a branch".

Se quiser que ele rode a cada push, troque `on:` por `push: { branches: [master], paths: [...] }`.

## DNS: registros no Namecheap

Valores da documentação do GitHub Pages ("Managing a custom domain for your GitHub Pages site",
consultada em 30/09/2026). Advanced DNS > Host Records, com os nameservers da Namecheap:

| Tipo | Host | Valor |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA (opcional) | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME (opcional, só se quiser que `www` funcione) | `www` | `leonardotteixeira.github.io.` |

O `www` não é necessário: o endereço oficial é o domínio sem `www`. Nunca aponte para o nome do
repositório, só para `leonardotteixeira.github.io`. Opcional e recomendado: *verificar* o domínio na
conta do GitHub (Settings > Pages > Add a domain, registro TXT no Namecheap), o que impede outras
pessoas de usarem `custavaquanto.me` ou subdomínios em repositórios delas.

## Como conferir

```bash
nslookup custavaquanto.me 8.8.8.8             # deve listar IPs 185.199.108-111.153
curl -sI https://custavaquanto.me/ | head -3  # HTTP/1.1 200 OK (redirecionamento para /dashboard/)
curl -sI http://custavaquanto.me/ | head -3   # depois de "Enforce HTTPS": 301 para https
curl -s https://custavaquanto.me/robots.txt
```

## Estado da verificação (30/09/2026)

- **Repositório:** `CNAME`, `index.html` de redirecionamento, canonical e `og:url`, `robots.txt`,
  `sitemap.xml`, workflow opcional. Testado localmente servindo `dashboard/` + `data/` como o
  Pages faz: os cinco JSON de dados devolvem 200, sem recursos `http://`.
- **DNS:** resolve para os IPs do GitHub Pages (consulta ao 8.8.8.8).
- **Pages:** ativo (`has_pages: true`); o domínio antigo foi liberado.
- **HTTPS:** `https://custavaquanto.me/` respondeu 200 com certificado válido. Falta conferir se
  **Enforce HTTPS** está marcado: `http://custavaquanto.me/` também respondeu 200 (sem redirecionar
  para https). Marque a opção em Settings > Pages.
- **Ainda não conferido:** o site completo no domínio depois deste push (o Pages republica sozinho
  a cada push na `master`; leva alguns minutos), `robots.txt` e `sitemap.xml` ao vivo.
