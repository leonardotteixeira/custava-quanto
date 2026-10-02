# Testes e verificações

Atualizado em 02/10/2026. Consta aqui o que existe e o que foi executado; o que é manual está dito como manual.

## Resumo

| Área | Como é verificada | Automático? |
|---|---|---|
| Dados, metodologia, resultados e textos da Análise | `scripts/test_analise.py` | Sim (roda no `update_data.py`) |
| Notícias (a página responde, título e data conferem) | `scripts/build_news.py` | Sim, a cada build de notícias |
| Frescor do PIB | `_checar_frescor_pib()` em `build_dashboard_data.py` | Sim, mas só avisa |
| Lógica de leitura do PIB | `scripts/download_pib.py --autoteste` (dados sintéticos) | Rodável, mas fora de sincronia ([KNOWN_ISSUES.md](KNOWN_ISSUES.md), M3) |
| Auditoria da metodologia, reexecutável (somente leitura) | `docs/auditoria_*.py` | Sim, sob demanda |
| Links das notícias | `docs/auditoria_links.py` (rede) | Sim, sob demanda |
| Front-end: console, layout, teclado, acessibilidade | Verificação no navegador (axe-core, medidas de overflow, capturas) | Não: nenhum script salvo |

Não há framework de testes (pytest ou similar), integração contínua dos testes nem teste automático de front-end.

## `scripts/test_analise.py`

```bash
.venv/Scripts/python scripts/test_analise.py
```

Sai com código 1 e lista as falhas. Verifica:

- **Metodologia:** versão presente; hash SHA-256 do arquivo igual ao registrado nos resultados (impede metodologia retroativa); todo indicador Tipo A tem direção e os Tipos B e C não; nenhum indicador duplicado; pesos dos cenários cobrem exatamente as dimensões Tipo A e somam 100; tolerâncias declaradas.
- **Janelas:** Bolsonaro dentro de jan/2019 a dez/2022 e Lula a partir de jan/2023; nenhuma data no futuro; mesmo número de observações nos dois períodos na janela de igual duração; resumos "primeiros 12/24/36 meses" na mesma janela de calendário nos dois períodos.
- **Cálculos recalculados por fora:** variação percentual a partir do valor inicial e final; soma da síntese de cada cenário; contagem da grade de pesos por enumeração independente (10.626 = C(24, 4)); salário mínimo real em datas de referência e no mês-base; IPCA em 12 meses a partir do número-índice; nível real e agregadores do Custo de vida.
- **Dados:** preço nominal de cada combustível igual ao da série oficial da ANP; série do salário mínimo própria, completa e sem mês faltando; códigos SIDRA dos seis itens de alimentos; nenhum valor não finito; nenhuma série mensal duplicada ou fora de ordem; PIB só com anos fechados.
- **Mercado de trabalho:** tabela e variável do SIDRA, série do dashboard contra a resposta bruta do IBGE quando o cache existe, período de cada trimestre móvel e votos recalculados.
- **Textos e terminologia:** nenhum texto gerado com "venceu", "vencedor", "melhor governo", "pior governo", "campeão", "perdeu" ou linguagem de causa; o site não chama o dólar corrigido de "dólar real"; a análise de sensibilidade não se chama "robustez"; o site tem o bloco "Referências e base metodológica"; o *Consumer Price Index Manual* só aparece com a ressalva de que o texto integral não foi consultado.
- **Contexto e Arquivo:** `noticias.json` × `marcos.json`, fonte aceita, https, data de 2019 até hoje, indicadores existentes, `causalidade: "contexto"`, sem linguagem causal, verificação registrada, mínimo de 5 marcos por dimensão; toda URL curada em `data/news/raw_*.json` está em `noticias.json`.

O teste também foi aplicado a um resultado adulterado à mão (hash trocado, Selic com leitura): as duas falhas foram detectadas.

## Auditorias reexecutáveis

Somente leitura; não alteram dados, código nem JSON.

| Script | O que refaz |
|---|---|
| `docs/auditoria_antes_depois.py` | Compara os resultados atuais com os de um commit anterior (`ANTES_REV`, padrão `HEAD`) |
| `docs/auditoria_simulacoes.py` | Simulações de sensibilidade da auditoria (IPCA, PIB, Custo de vida, Renda, grade de pesos) |
| `docs/auditoria_custo_vida_agregadores.py` | Sensibilidade do Custo de vida ao agregador das 11 séries |
| `docs/auditoria_anp_ponderacao.py` | Reprodução da série oficial da ANP a partir dos preços por posto e das vendas (precisa do cache bruto da ANP) |
| `docs/auditoria_links.py` | Status HTTP, título e data dos 142 links de notícias; ver [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md) |

## Verificações de front-end (no navegador, sem script salvo)

Feitas a cada mudança relevante e registradas aqui só como prática, não como teste automático:

- **Larguras:** 320, 360, 375, 390, 412 e 430 px (celular) e 1024, 1280, 1366, 1440, 1600 e 1920 px (computador). Confere-se `window.innerWidth` igual à largura pedida e ausência de rolagem horizontal da página; com emulação de celular a janela de layout cresce junto com o conteúdo que vaza, então `scrollWidth − clientWidth` sozinho não basta.
- **Acessibilidade:** axe-core (WCAG 2 A/AA e boas práticas) sem violações nas larguras acima, com a animação do relógio da Máquina do tempo concluída (no meio da animação o contraste é medido com opacidade parcial). Alvos de toque de pelo menos 44 px e navegação por teclado (menu, abas, setas nos gráficos). Não testado em aparelho físico nem em leitor de tela.
- **Console e rede:** sem erros no console e todas as requisições do site com status 200; as 17 histórias abrem; Parte 10, Parte 11, Renda, Custo de vida e o rótulo do dólar conferidos.
- **Navegação:** os links com âncora (`#capítulo`) rolam até o lugar certo e limpam o endereço; `?historia=` antigo ainda abre a série.

## Como validar uma mudança de dados

1. `.venv/Scripts/python scripts/build_dashboard_data.py`: confira os avisos no log (frescor do PIB, colunas ausentes).
2. `.venv/Scripts/python scripts/build_analise.py` e `.venv/Scripts/python scripts/test_analise.py`.
3. `.venv/Scripts/python docs/auditoria_antes_depois.py`: veja o que mudou nos resultados em relação ao commit anterior.
4. Sirva o site (`.venv/Scripts/python -m http.server 8420`, na raiz do projeto), abra `http://localhost:8420/dashboard/index.html` e confira o console.
5. Em Método › Atualização dos dados, confira a data do último sucesso de cada fonte.
