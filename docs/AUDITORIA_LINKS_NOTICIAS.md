# Auditoria dos links de notícias e contexto

Data: 01/10/2026 · Escopo: os 142 itens de `data/processed/noticias.json` (79 matérias do Arquivo e 63 marcos de contexto) ·
Ferramenta: `docs/auditoria_links.py` (grava o resultado por item em `data/raw/auditoria_links_noticias.csv`, que não é versionado)

A auditoria só lê: abre cada URL com um cliente de navegador comum, segue redirecionamentos, lê título e data de publicação na
própria página e compara com o que o projeto gravou. Nenhum metadado de matéria foi alterado, nenhum link foi trocado e nenhum
foi removido. Para o que não abre, registra se existe cópia no Internet Archive (Wayback Machine).

## Resultado

| Classe | Itens | O que significa |
|---|---|---|
| OK | 127 | HTTP 200, https, título e data conferem com o gravado |
| OK com redirecionamento | 11 | HTTP 200 depois de um redirecionamento; título e data conferem (ver abaixo) |
| Bloqueado para robô, verificado por cópia arquivada | 4 | HTTP 403 ao cliente automático; o título e a data conferem na cópia do Internet Archive |
| Quebrado ou não encontrado (404/410) | 0 | — |
| Erro de rede, SSL ou título/data divergentes | 0 | — |

- **HTTPS:** 142 de 142 usam https.
- **Fontes:** Agência Brasil (105), CNN Brasil (15), Exame (5), Poder360 (5), Agência de Notícias do IBGE (4), InfoMoney (4), Correio
  Braziliense (3), Seu Dinheiro (1). Todas na lista de fontes aceitas por `test_analise.py`.
- **Título:** nenhum item com similaridade abaixo de 0,8 entre o título gravado e o da página.
- **Data:** a data da página bate com a gravada em 136 dos 138 itens lidos; em 2 itens (n030, de 22/09/2020, e n063, de 08/07/2022) a página
  mostra um dia depois (publicação à noite; fuso horário), dentro da regra da metodologia ("diferença de um dia por fuso horário é resolvida a favor
  da data exibida na matéria"); nos outros 4 (IBGE, bloqueados) a data foi conferida na cópia arquivada.
- **Imagens:** 97 itens têm imagem externa e as 97 respondem 200; 45 itens não têm imagem. Créditos e itens marcados `imagem_sem_licenca` não foram
  alterados.

## Os 11 redirecionamentos (CNN Brasil)

A CNN Brasil reorganizou o caminho do site (`/economia/macroeconomia/...` e `/economia/financas/...` passaram a
`/economia/seu-bolso/meu-dinheiro/...` ou `/economia/money/...`), mantendo o mesmo final do endereço. A URL antiga continua abrindo a mesma
matéria (título e data conferem). A URL gravada foi mantida, porque é a que a fonte publicou e o redirecionamento funciona; a URL final fica no CSV que o script gera. Se a CNN Brasil deixar de redirecionar, os 11 itens passarão a ser classificados como quebrados e deverão ser atualizados para a URL final.

## Os 4 itens do IBGE (bloqueio de robô, não link quebrado)

A Agência de Notícias do IBGE responde 403 a clientes automáticos (também ao leitor de páginas usado nesta auditoria), mas abre no navegador.
Para cada um, o título e a data foram conferidos em cópia do Internet Archive:

| Item | Título gravado | Data gravada | Cópia arquivada (data da captura) | Conferido |
|---|---|---|---|---|
| n001 | Em 2010, PIB varia 7,5% e fica em R$ 3,675 trilhões | 03/03/2011 | 06/09/2026 | título e `article:published_time` 2011-03-03 |
| n117 | PIB cresce 2,3% em 2025 | 03/03/2026 | 03/03/2026 | título e 2026-03-03 |
| n130 | PIB cresce 1,1% no primeiro trimestre de 2026 | 29/05/2026 | 05/07/2026 | título e 2026-05-29 |
| n138 | PIB cresce 0,5% no segundo trimestre de 2026 | 01/09/2026 | 17/09/2026 | título e 2026-09-01 |

Cópias consultadas: [n001](http://web.archive.org/web/20260906114012/https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/13983-asi-em-2010-pib-varia-75-e-fica-em-r-3675-trilhoes), [n117](http://web.archive.org/web/20260303153737/https://agenciadenoticias.ibge.gov.br/agencia-noticias/2012-agencia-de-noticias/noticias/45969-pib-cresce-2-3-em-2025), [n130](http://web.archive.org/web/20260705172135/https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/46917-pib-cresce-1-1-no-primeiro-trimestre-de-2026) e [n138](http://web.archive.org/web/20260917230120/https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/47902-pib-cresce-0-5-no-segundo-trimestre-de-2026). O arquivo do Internet Archive é uma cópia de apoio da auditoria, não substitui o link da fonte.

## Outros links externos do site

Os 33 endereços únicos de `dashboard/index.html`, `dashboard/js/*.js`, `README.md` e `docs/*.md` foram conferidos: 27 respondem 200. Os 6 restantes
respondem 403 ou esgotam o tempo para o cliente automático (portal do IBGE e SIDRA, o PDF do FMI sobre o IPC, o PDF da OCDE e a página do FRED) e
foram abertos no navegador onde possível: IBGE Explica PIB, SIDRA e FRED funcionam. Os dois PDFs de referência bibliográfica (FMI e OCDE, só citados em `docs/AUDITORIA_ACADEMICA_METODOLOGIA.md`) bloqueiam clientes automáticos e não foram abertos aqui (o do FMI iniciou um download); não aparecem no site.

## Como repetir

```bash
python docs/auditoria_links.py            # rede; grava data/raw/auditoria_links_noticias.csv
python docs/auditoria_links.py --resumo   # resumo do último CSV
```

Classe BLOQUEADO não prova que o link quebrou: confirme no navegador e na cópia arquivada antes de qualquer mudança.
