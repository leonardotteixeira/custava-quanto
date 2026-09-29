# Auditoria da análise entre períodos de governo

Capítulo "Análise" do CUSTAVA QUANTO? · metodologia v1.0 · 28/09/2026

Este documento registra o que estava errado ou frágil na primeira versão do
capítulo (commit `9844300`), o que mudou, e as limitações que continuam.
Qualquer mudança futura na metodologia deve subir a versão em
`scripts/build_analise.py` (`METODOLOGIA_VERSAO`) e ganhar uma entrada aqui.

## Arquivos

| Arquivo | Papel |
|---|---|
| `scripts/build_analise.py` | Grava a metodologia, depois calcula a partir dela |
| `data/processed/analysis_methodology.json` | Metodologia congelada: dimensões, perguntas, indicadores, direção, tipo, pesos, cenários, regras |
| `data/processed/analysis_results.json` | Resultados, com o hash SHA-256 da metodologia usada |
| `scripts/test_analise.py` | Validações (roda no `update_data.py` depois do build) |
| `dashboard/js/analise.js` | Só apresentação: escolhe o modo e formata; não calcula nada econômico |

## Achados da auditoria (versão anterior)

1. **Períodos incorretos: PIB.** O recorte "governo inteiro" do PIB comparava
   1996-2022 contra 2023-2025: todos os anos antes de 2023 eram rotulados como
   "Bolsonaro". Corrigido em `build_dashboard_data.py` no commit `9844300`
   (anos antes de 2019 ficam sem período). Afetava também a página Períodos.
2. **Períodos de tamanhos diferentes.** Bolsonaro tinha 48 meses; Lula, 44 e em
   curso. Variações acumuladas crescem com o tempo, então a comparação favorecia
   o período mais longo. **Corrigido:** o modo principal agora é "mesmo tempo de
   governo" (mês k de cada mandato, só os meses em que os dois têm dado).
3. **Direção errada ou ausente.** A versão anterior contava "variação positiva"
   como um mesmo sinal para tudo: gasolina subindo (ruim para o consumidor), PIB
   subindo (atividade maior) e Selic subindo (nem bom nem ruim) caíam na mesma
   contagem. **Corrigido:** cada indicador tem direção preferida ("maior",
   "menor" ou nenhuma) definida na metodologia, antes do cálculo.
4. **Indicadores sem direção simples.** Dólar, Selic e Ibovespa entravam na
   contagem. **Corrigido:** são Tipo B (dependem do contexto) e só são descritos;
   a dimensão Mercados não entra na síntese.
5. **Nominal x real.** Custo de vida misturava variação real (combustíveis e
   alimentos) com nominal (salário mínimo). **Corrigido:** custo de vida usa só
   a série real; o salário mínimo entra pelo valor real (descontado o IPCA) e o
   nominal fica como informação (Tipo C).
6. **Porcentagem x ponto percentual.** A Selic chegou a ser tratada como
   variação percentual de uma taxa (corrigido já na v0). Agora é métrica
   "nível": início, fim, média, mínimo, máximo, e diferença em p.p.
7. **Frequências diferentes.** PIB é anual; os demais, mensais; Dólar, Selic e
   Ibovespa têm dado diário. **Tratado:** PIB compara ano k de cada mandato, só
   anos fechados; no modo completo, os três indicadores de mercado usam o dado
   diário nas pontas; no modo mesmo tempo, a média mensal (rotulado).
8. **Período Lula incompleto.** Agora marcado "em curso" em todo lugar, e o
   modo principal compara durações iguais.
9. **PIB anual x trimestral.** A média anual usa só anos fechados; o último
   trimestre disponível aparece separado, sem virar resultado anual.
10. **Índice de alimentos.** O aviso "índice encadeado, não é R$" agora é um
    bloco visível na dimensão, não só um rótulo de unidade.
11. **Mercado como bem-estar.** Ibovespa e dólar agora vêm com a explicação do
    que medem e não medem, e nunca entram numa leitura de direção.
12. **Suposições escondidas.** Os pesos existiam mas não estavam justificados.
    Agora: pesos iguais como padrão (sem razão a priori para privilegiar uma
    dimensão), três cenários alternativos definidos antes do cálculo, e o leitor
    pode mudar os pesos.
13. **Métricas duplicadas.** "Salário mínimo" e "litros de gasolina por salário
    mínimo" medem coisas relacionadas; ficam na mesma dimensão e a dimensão usa a
    mediana, então nenhum dos dois pesa em dobro na síntese.
14. **Agregação arbitrária.** A contagem "17 de 18 subiram" somava unidades
    diferentes e dava a Custo de vida 11 votos contra 1 do PIB. **Corrigido:**
    cada dimensão vira UM sentido (+1, 0, -1) pela mediana; a síntese soma
    sentidos com pesos, nunca magnitudes.
15. **Cherry-picking.** Todas as séries do projeto entram. Nenhuma exclusão.
    Dimensões fora do escopo (emprego, contas públicas, investimento) estão
    listadas como tal, por falta de série no projeto.
16. **Hierarquia visual.** Cartões repetidos de mesmo peso. Refeito como
    narrativa: pergunta → evidência → gráfico → leitura.
17. **Narrativa.** Não havia pergunta definida por dimensão. Agora cada uma
    tem a sua, escrita na metodologia antes do cálculo.

## Regra contra metodologia retroativa

`build_analise.py` grava `analysis_methodology.json` primeiro e só então
calcula, lendo a metodologia do disco. O hash SHA-256 desse arquivo vai para
`analysis_results.json`, e `test_analise.py` falha se o hash não conferir.
Mudar direção, peso, tipo ou regra depois de ver resultados exige subir a
versão e registrar aqui o motivo.

## Perguntas de controle (estado em 28/09/2026)

1. **Os períodos são comparáveis?** No modo principal, sim: mesma posição no
   mandato e mesmo número de observações por indicador (validado no teste). O
   modo "completo" é mostrado como alternativa, rotulado como período em curso.
2. **As métricas são comparáveis?** Dentro de cada dimensão, sim (todas reais em
   custo de vida; todas de poder de compra em renda). Entre dimensões, não, e por
   isso a síntese usa só o sentido de cada dimensão.
3. **Todo indicador tem interpretação definida?** Sim: Tipo A com direção, B e C
   explicitamente sem direção (teste).
4. **Algum indicador conta em dobro?** Não; cada um está em uma dimensão só
   (teste), e a dimensão vira um único sentido.
5. **Uma dimensão domina por ter mais séries?** Não: 11 séries de custo de vida
   viram uma leitura, igual à do PIB com uma série.
6. **Algum indicador na direção errada?** Revisado um a um; o teste confere que
   o sinal de f segue a direção da metodologia.
7. **Nominal e real separados?** Sim; custo de vida só com série real (teste).
8. **Indicadores dependentes do contexto tratados à parte?** Sim, Tipo B.
9. **A conclusão resiste a mudanças razoáveis de peso?** Calculado em quatro
   cenários predefinidos; o resultado diz se o sentido muda ou não.
10. **Um leitor cético consegue reproduzir?** Sim: metodologia e resultados em
    JSON, fórmulas escritas, script público e hash.
11. **Toda fonte é identificável?** Sim, por indicador.
12. **Toda escolha metodológica é identificável?** Sim, em
    `analysis_methodology.json` e no painel "Audite a análise".
13. **Alguém com outra preferência política consegue auditar?** É o objetivo; o
    painel permite mudar pesos e ver cada número de origem.
14. **O período Lula está marcado como em curso?** Sim.
15. **Estamos implicando causalidade?** O texto gerado nunca atribui causa; o
    contexto externo é rotulado "coincide no tempo".

## Limitações que continuam

- Poucas dimensões: emprego, contas públicas, investimento e desigualdade não
  estão no projeto.
- Salário mínimo mede uma parte da renda da população, não a renda média.
- Alimentos são índice encadeado do IBGE, não preço em reais.
- No modo "mesmo tempo", os indicadores de mercado usam média mensal, não o
  último pregão; no modo "completo", usam o dado diário nas pontas.
- A tolerância para "sem diferença relevante" (1 ponto em variação, 0,1 ponto em
  média) é uma escolha da metodologia, registrada nela.
- O contexto externo tem cinco marcos; não é uma cronologia completa.
