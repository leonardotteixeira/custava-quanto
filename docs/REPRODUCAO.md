# Reprodução

Como refazer a análise a partir deste repositório. Caminhos de Windows (Git Bash ou PowerShell); em Linux e macOS, troque `.venv/Scripts/` por `.venv/bin/`.

## Requisitos

- Python 3.11.
- Dependências em `requirements.txt` (`pandas`, `requests`, `openpyxl`). O tratamento das fotos dos presidentes (`scripts/process_portraits.py`) também usa Pillow, que só é preciso se as fotos mudarem.
- Conexão com a internet apenas para baixar dados novos: os dados processados já estão versionados em `data/processed/`.

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

## Caminho curto: refazer e validar sem baixar nada

Com os dados processados que já estão no repositório:

```bash
.venv/Scripts/python scripts/build_dataset.py
.venv/Scripts/python scripts/build_dashboard_data.py
.venv/Scripts/python scripts/build_analise.py
.venv/Scripts/python scripts/test_analise.py
```

`build_analise.py` grava primeiro a metodologia (`analysis_methodology.json`, com hash SHA-256) e só depois os resultados (`analysis_results.json`), lendo a metodologia do disco. `test_analise.py` recalcula de forma independente as sínteses, a grade de pesos, as variações, as janelas, o salário mínimo real e os agregadores, e confere o hash. Os resultados devem coincidir com os versionados, exceto o carimbo de hora (`gerado_em`).

## Obter os dados

Cada dado vem de uma fonte pública (tabela completa em [DATA_PIPELINE.md](DATA_PIPELINE.md); fontes e referências em [referencias.md](referencias.md)). O orquestrador baixa tudo e reconstrói:

```bash
.venv/Scripts/python scripts/update_data.py            # completo (ANP por posto e IBGE são lentos)
.venv/Scripts/python scripts/update_data.py --rapido   # mercados, salário mínimo, PNAD, Brent, série oficial da ANP, build e análise
```

O que cada fonte fornece e por qual script:

| Dado | Fonte | Script |
|---|---|---|
| Preços de combustíveis (série mensal nacional oficial) | ANP | `download_anp_oficial.py` |
| Preços de combustíveis por posto (sensibilidade e auditoria) | ANP | `download_anp.py` (cache de ~1 GB em `data/raw/`, não versionado) |
| IPCA (número-índice desde jan/2018), variação por subitem e pesos | IBGE/SIDRA | `download_ibge.py` |
| Dólar PTAX, Selic (meta) e Ibovespa | Banco Central e B3 | `download_mercados.py` |
| Salário mínimo | Banco Central (SGS 1619) | `download_salario_minimo.py` |
| Mercado de trabalho | IBGE, PNAD Contínua | `download_pnad.py` |
| Petróleo Brent | FRED | `download_brent.py` |
| Notícias e marcos de contexto (curadoria manual em `data/news/`, conferida na rede) | Veículos e fontes oficiais | `build_news.py` |

Não fazem parte do `update_data.py` e precisam de execução à parte:

```bash
.venv/Scripts/python scripts/download_pib.py                # PIB trimestral e anual
.venv/Scripts/python scripts/download_pib_componentes.py    # componentes e PIB nominal trimestral
.venv/Scripts/python scripts/download_ibge_combustiveis.py  # insumo da estimativa da lacuna de set/2020
```

Depois de baixar o PIB, reconstrua com `build_dashboard_data.py`, `build_analise.py` e `test_analise.py`.

**Os dados mudam com o tempo.** IBGE, ANP e Banco Central publicam novas observações e revisam séries; baixar de novo hoje pode dar valores diferentes dos versionados (por exemplo, novos meses). Os dados processados do repositório são a fotografia usada nos resultados publicados.

## Gerar os resultados

A cadeia é:

```text
fonte → download_*.py → data/processed/*.csv → build_dataset.py → build_dashboard_data.py
      → dashboard_data.json → build_analise.py → analysis_methodology.json + analysis_results.json
```

`build_dataset.py` deflaciona pelo IPCA e marca o período; `build_dashboard_data.py` consolida tudo em `dashboard_data.json`; `build_analise.py` calcula a Análise. Nenhum cálculo econômico é feito no navegador.

## Testes

```bash
.venv/Scripts/python scripts/test_analise.py                    # dados, metodologia, resultados e textos
.venv/Scripts/python docs/auditoria_antes_depois.py             # compara com o commit anterior
.venv/Scripts/python docs/auditoria_custo_vida_agregadores.py   # sensibilidade do Custo de vida ao agregador
```

Detalhes e demais auditorias reexecutáveis: [TESTING_AND_QA.md](TESTING_AND_QA.md). Metodologia: [METHODOLOGY.md](METHODOLOGY.md).

## Abrir o site localmente

O site precisa de HTTP (`file://` não funciona). Na raiz do repositório:

```bash
.venv/Scripts/python -m http.server 8420
```

e abra `http://localhost:8420/dashboard/index.html`. O site lê os dados por `../data/processed/*.json`.

## Publicação

O site é publicado no GitHub Pages por um workflow a cada push na `master` que mude o site ou os dados; ver [DEPLOY.md](DEPLOY.md).
