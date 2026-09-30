# Testes e QA

Última atualização: 28/09/2026
Status: **CURRENT**. Só consta aqui o que existe e foi executado; o que é manual
está dito como manual.

## Resumo

| Área | Como é verificada hoje | Automático? |
|---|---|---|
| Análise entre períodos (metodologia, janelas, direção, PIB, Selic, alimentos, hash) | `scripts/test_analise.py` | **Sim** (roda no `update_data.py`) |
| Notícias (página responde, título e data conferem) | `scripts/build_news.py` | **Sim**, a cada build de notícias |
| Frescor do PIB | `_checar_frescor_pib()` em `build_dashboard_data.py` | Sim, mas só **avisa** |
| Lógica de leitura do CONAB | `download_conab.py --autoteste` (dados sintéticos) | Sim, manual de acionar |
| Lógica de leitura do PIB | `download_pib.py --autoteste` (dados sintéticos) | Rodável, mas **fora de sincronia** (ver KNOWN_ISSUES M6) |
| Front-end: console, layout, teclado, acessibilidade | Verificação à mão no navegador (axe-core, capturas, medidas de overflow) | **Não** — nenhum script salvo |
| Dados brutos (ANP etc.) | Validações internas dos scripts de download | Parcial |

Não há framework de testes (pytest ou similar), nem integração contínua, nem
teste de front-end no repositório.

## `scripts/test_analise.py`

    .venv/Scripts/python scripts/test_analise.py

Sem dependências além da biblioteca padrão. Sai com código 1 e lista as falhas.
Verifica:

- versão da metodologia presente e **hash SHA-256** do arquivo igual ao registrado
  nos resultados (impede metodologia retroativa);
- todo indicador Tipo A tem direção ("maior"/"menor"; Tipo B e C não têm); Selic,
  Dólar e Ibovespa são Tipo B; Selic usa a métrica em p.p. (`nivel`);
- nenhum indicador duplicado; toda dimensão existe;
- pesos de cada cenário: cobrem exatamente as dimensões Tipo A e somam 100;
- em cada janela: Bolsonaro dentro de jan/2019–dez/2022, Lula a partir de
  jan/2023, **nenhuma data no futuro**, `f` coerente com a direção, Tipo B/C sem
  leitura de direção;
- **mesmo tempo de governo**: mesmo número de observações nos dois períodos;
- custo de vida sempre pela série **real**;
- PIB: o ano final de cada janela tem resultado anual fechado, e um ano que só tem
  trimestres não aparece como fechado;
- alimentos marcados como índice ("não é R$");
- nenhum texto gerado contém "venceu", "vencedor", "melhor governo", "pior
  governo", "campeão", "perdeu";
- os cenários da síntese batem com a metodologia; Mercados nunca recebem leitura;
- o fim do período Lula na Gasolina é o último mês disponível.

Foi testado também com resultado adulterado à mão (hash trocado, Selic com
leitura): as duas falhas foram detectadas.

## Verificações manuais feitas (não repetíveis por script)

Registradas para dar contexto; **não** substituem testes automáticos.

- **Acessibilidade (axe-core no navegador):** capítulo Análise e página do PIB com 0
  violações na última verificação (28/09/2026). Nos demais capítulos a checagem não
  foi refeita depois das últimas mudanças.
- **Layout responsivo:** medidas de rolagem horizontal nas larguras 320, 390 e 768
  px para o capítulo Análise e o restante da página; captura em 1440 px. 1024 px e
  1920 px não foram cobertos nesta rodada.
- **Teclado:** foco e ativação dos controles de janela da Análise; nos gráficos
  as setas percorrem os pontos e, no gráfico anual do PIB, Enter/Espaço selecionam o
  ano (implementado em `charts.js`); a checagem foi feita lendo o código e testando
  os controles da Análise, não com leitor de tela.
- **Console do navegador:** sem erros nas páginas de Gasolina, Arroz, Dólar e PIB na
  última verificação.
- **Cópia da chave PIX:** o caminho de sucesso não pôde ser exercitado no painel de
  navegador usado (permissão de área de transferência negada); só o caminho de
  reserva (chave selecionada para copiar à mão) foi verificado.

## Histórico

`PHASE_1_QA_REPORT.md` (23/09/2026) é o relatório de QA da primeira reformulação e
está marcado como **HISTÓRICO**: descreve a página daquela data, não a atual.

## Como validar uma mudança de dados

1. `.venv/Scripts/python scripts/build_dashboard_data.py` — confira avisos no log
   (frescor do PIB, colunas ausentes).
2. `.venv/Scripts/python scripts/build_analise.py` e
   `.venv/Scripts/python scripts/test_analise.py`.
3. Sirva o site (`.venv/Scripts/python -m http.server 8420`, na raiz do projeto),
   abra `http://localhost:8420/dashboard/index.html` e confira o console.
4. Em Método › Atualização dos dados, confira a data do último sucesso de cada
   fonte.
