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
| `.nojekyll` e `index.html` (raiz) | Desligam o Jekyll e redirecionam a raiz para `dashboard/index.html`. O `index.html` da raiz repete título, descrição, canonical e as tags `og:`/`twitter:`: os robôs de prévia (WhatsApp, X, Facebook) não seguem o redirecionamento por `meta refresh`, então é daqui que sai a prévia de quem compartilha `https://custavaquanto.me/`. |
| `robots.txt` e `sitemap.xml` (raiz) | Permitem tudo e listam `https://custavaquanto.me/`. Ficam na raiz porque os rastreadores só procuram `/robots.txt` e `/sitemap.xml` ali. |
| `dashboard/index.html` | `<link rel="canonical">` e `og:url` apontam para `https://custavaquanto.me/`; também `og:type`, `og:site_name`, `og:locale`, `og:title` e `og:description` (mesmo texto do `<title>` e da `description` que já existiam); `og:image` 1200×630 (`dashboard/assets/brand/og-image.jpg`, captura da própria abertura do site) e `twitter:card`. |
| `.github/workflows/pages.yml` | Publica o site na raiz do domínio (sem `/dashboard/`) por GitHub Actions, a cada push na `master` que mexa em `dashboard/`, `data/processed/*.json`, `robots.txt`, `sitemap.xml` ou no próprio workflow (e manualmente em Actions > Run workflow). Só vale com o *Source* do Pages em "GitHub Actions" (abaixo). |

Todos os recursos externos do site (Google Fonts, links de fonte, imagens de matérias) usam
`https://`; não há `http://` no site além de `localhost` em ferramentas de desenvolvimento.

## Publicar na raiz do domínio (sem `/dashboard/`)

Com "Deploy from a branch", o endereço final fica `https://custavaquanto.me/dashboard/index.html`
(a raiz só redireciona). Com o workflow, o site aparece direto em `https://custavaquanto.me/`.

1. Em `leonardotteixeira/custava-quanto` > Settings > Pages > *Build and deployment*, troque o
   **Source** de "Deploy from a branch" para **GitHub Actions**. O campo *Custom domain* continua
   `custavaquanto.me` e o *Enforce HTTPS* continua marcado.
2. A partir daí, cada push na `master` que mude o site ou os dados publica sozinho (Actions >
   *Publicar no GitHub Pages*). Para publicar sem push: Actions > *Publicar no GitHub Pages* >
   **Run workflow**.
3. O workflow monta `_site/` com o conteúdo de `dashboard/` na raiz e `data/processed/*.json` em
   `/data/processed/`: da raiz do domínio, `../data/processed/x.json` resolve para
   `/data/processed/x.json`, então o código do site não muda e continua rodando localmente
   (`python -m http.server` na raiz do repositório, abrindo `/dashboard/index.html`).
4. Endereços antigos continuam valendo: `/dashboard/index.html?historia=arroz#periodos` vira
   `/?historia=arroz#periodos` (página de redirecionamento criada pelo workflow).
5. Para voltar: Source = "Deploy from a branch" (`master`, `/ (root)`). O `index.html` da raiz e o
   `CNAME` continuam no repositório para isso.

Testado em 30/09/2026 montando `_site/` com os mesmos comandos do workflow e servindo-o como raiz:
abertura, troca de série, Análise e Arquivo carregam, sem requisição falhando nem erro no console;
o redirecionamento de `/dashboard/index.html?historia=pib#periodos` chega ao capítulo certo.

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
