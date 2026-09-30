# Publicação e domínio

Última atualização: 30/09/2026
Status: **CONFIGURAÇÃO NO REPOSITÓRIO PRONTA; PUBLICAÇÃO E DNS AINDA PENDENTES** (ver "O que falta fazer à mão").

Endereço oficial: **https://custavaquanto.me/**

## O que o repositório tinha (verificado em 30/09/2026)

- Nenhuma configuração de publicação: sem `.github/`, `CNAME`, `vercel.json`, `netlify.toml`,
  `robots.txt` nem `sitemap.xml`.
- GitHub Pages **desligado** em `leonardotteixeira/custava-quanto` (a API do GitHub
  devolve `has_pages: false`). O repositório é público e a branch padrão é `master`.
- O domínio `custavaquanto.me` já estava ligado a **outro** repositório da mesma conta,
  `leonardotteixeira/leonardotteixeira.github.io` (site de usuário; tem só `README.md` e um
  `CNAME` com `custavaquanto.me`). Por isso `https://leonardotteixeira.github.io/custava-quanto/`
  redireciona hoje para `custavaquanto.me/custava-quanto/`.
- O DNS de `custavaquanto.me` **ainda não resolvia** (consulta ao 8.8.8.8 devolveu
  "Non-existent domain"): nenhum registro foi criado ainda ou o domínio recém-registrado
  ainda não propagou.

Provedor escolhido: **GitHub Pages**, publicado por **GitHub Actions**. Motivo: o `CNAME`
criado no repositório do usuário indica essa intenção, e a estrutura do site pede uma
montagem de pastas (abaixo), que a publicação "a partir de uma branch" do Pages não faz.

## O que foi configurado no repositório

| Arquivo | Para quê |
|---|---|
| `.github/workflows/pages.yml` | A cada push na `master` que mexe em `dashboard/`, `data/processed/*.json` ou no próprio workflow, monta `_site/` e publica. Também roda à mão (`workflow_dispatch`). |
| `dashboard/CNAME` | Contém exatamente `custavaquanto.me`. Vai para a raiz do site publicado. |
| `dashboard/index.html` | `<link rel="canonical">` e `og:url` apontam para `https://custavaquanto.me/`; foram acrescentados também `og:type`, `og:site_name`, `og:locale`, `og:title` e `og:description` (mesmo texto do `<title>` e da `description` que já existiam). Não há imagem de compartilhamento: nenhuma foi inventada. |
| `dashboard/robots.txt` | Permite tudo e aponta para o sitemap em `https://custavaquanto.me/sitemap.xml`. |
| `dashboard/sitemap.xml` | Uma única URL: `https://custavaquanto.me/` (o site é uma página só, com capítulos em âncoras). |

**Como as pastas são montadas.** O site vive em `dashboard/` e lê os dados por caminhos
relativos (`../data/processed/*.json`). O workflow copia `dashboard/` para a raiz de `_site/`
e `data/processed/*.json` para `_site/data/processed/`. Na raiz do domínio,
`../data/processed/x.json` resolve para `/data/processed/x.json`, então **o código do site não
mudou**. Testado localmente servindo `_site/` na raiz: as cinco requisições de dados
(`dashboard_data.json`, `noticias.json`, `mercados_status.json`, `analysis_methodology.json` e
`analysis_results.json`) devolvem 200 e nenhum recurso usa `http://`.

**HTTPS.** Todos os recursos externos do site (Google Fonts, links de fonte, imagens de
matérias) já usam `https://`; a busca por `http://` não achou nada além de `localhost` em
ferramentas de desenvolvimento. O HTTPS do domínio é emitido pelo GitHub Pages depois que o
DNS propagar (ver abaixo).

**Nada foi feito nas configurações do GitHub nem no Namecheap:** isso exige a sua conta. Nenhuma
credencial foi pedida nem gravada.

## O que falta fazer à mão

Ordem recomendada. Enquanto os passos 1 a 3 não forem feitos, o site **não** está no ar em
`custavaquanto.me`.

1. **Namecheap, registros DNS** (Domain List > Manage > **Advanced DNS** > Host Records; os
   nameservers do domínio devem ser os da Namecheap, "Namecheap BasicDNS"). Remova registros
   de estacionamento ou redirecionamento que a Namecheap criar por padrão para `@` e `www`, e
   crie os registros abaixo. Os valores vêm da documentação do GitHub Pages
   ("Managing a custom domain for your GitHub Pages site", consultada em 30/09/2026):

   | Tipo | Host | Valor |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA (opcional, recomendado pelo GitHub) | `@` | `2606:50c0:8000::153` |
   | AAAA (opcional) | `@` | `2606:50c0:8001::153` |
   | AAAA (opcional) | `@` | `2606:50c0:8002::153` |
   | AAAA (opcional) | `@` | `2606:50c0:8003::153` |
   | CNAME (opcional, só se quiser que `www` também funcione) | `www` | `leonardotteixeira.github.io.` |

   O `www` não é necessário: o endereço oficial é o domínio sem `www`. Se criar o CNAME, o
   GitHub redireciona `www.custavaquanto.me` para `custavaquanto.me`. Nunca aponte para o
   nome do repositório, só para `leonardotteixeira.github.io`.

2. **GitHub, tirar o domínio do outro repositório.** Em
   `leonardotteixeira/leonardotteixeira.github.io` > Settings > Pages, remova o *Custom
   domain* (ou apague esse repositório, que só tem um `README` e um `CNAME`). Um domínio
   personalizado só pode estar em um site do Pages por vez; se ele continuar lá, o site do
   projeto será servido em `custavaquanto.me/custava-quanto/` em vez da raiz, ou o GitHub
   recusará o domínio como "já em uso".

3. **GitHub, ligar o Pages neste repositório.** Em `leonardotteixeira/custava-quanto` >
   Settings > Pages:
   - *Build and deployment > Source*: **GitHub Actions**;
   - *Custom domain*: `custavaquanto.me` > Save (o GitHub confere o DNS; pode levar de minutos
     a horas, e o aviso "DNS check unsuccessful" é normal até propagar);
   - quando a verificação passar, marque **Enforce HTTPS**.
   - Com a publicação por Actions, o `CNAME` do repositório é ignorado pelo GitHub (o que vale
     é o campo *Custom domain* das configurações); ele fica no repositório por clareza.

4. **Opcional, recomendado:** *verificar* o domínio na sua conta do GitHub (Settings > Pages >
   Add a domain), que impede outras pessoas de usarem `custavaquanto.me` ou subdomínios em
   repositórios delas. O GitHub pede um registro TXT no Namecheap (o valor aparece na tela).

5. Depois do primeiro push na `master` (ou de rodar o workflow em Actions > *Publicar no
   GitHub Pages* > Run workflow), confira `https://custavaquanto.me/`.

## Como conferir depois

```bash
nslookup custavaquanto.me 8.8.8.8            # deve listar os IPs 185.199.108-111.153
curl -sI https://custavaquanto.me/ | head -3  # HTTP/2 200
curl -sI http://custavaquanto.me/ | head -3   # 301 para https (depois de "Enforce HTTPS")
curl -s https://custavaquanto.me/robots.txt
```

## Estado da verificação (30/09/2026)

- **Configuração do repositório:** feita (arquivos acima); ainda **não commitada** neste momento.
- **DNS:** **não** configurado ou não propagado (`Non-existent domain` no 8.8.8.8).
- **Pages/Actions:** **não** ligados em `custava-quanto` (`has_pages: false`).
- **HTTPS ao vivo:** **não verificado**; depende dos passos 1 a 3.
