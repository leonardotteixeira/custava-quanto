# Fixtures: dado sintético, não real

Os arquivos desta pasta são inventados só para testar a *lógica de código* de
`scripts/download_pib.py --autoteste` (seleção da variável pelo nome e
validação do retorno do SIDRA), sem depender de rede. **Nenhum valor aqui é
dado real do PIB**: não use estes números em nenhum lugar do produto e não os
copie para `data/processed/`.

- `pib_trimestral_exemplo.json` e `pib_anual_exemplo.json`: respostas
  sintéticas no formato esperado da API do SIDRA.
