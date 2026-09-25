# Fixtures — dado SINTÉTICO, não real

Os arquivos nesta pasta são inventados só para testar a *lógica de código*
(parsing de coluna, filtro por produto/nível, agregação, validação) sem
depender de uma rede que esta pasta nunca alcança de verdade. **Nenhum
valor aqui é um preço real de arroz ou feijão** — não use estes números em
nenhum lugar do produto, e não os copie para `data/processed/`.

- `conab_precos_exemplo.csv`: layout plausível do arquivo "Preços
  agropecuários — Mensal UF" da CONAB, com linhas de Arroz Tipo 1 e Feijão
  Cores Tipo 1 em nível Varejo (o que `download_conab.py --autoteste` deve
  aceitar) e linhas-isca de Tipo 2, nível Atacado e outro produto (o que o
  filtro deve descartar). Usado só por `download_conab.py --autoteste`.
