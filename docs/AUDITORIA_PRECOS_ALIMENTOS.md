# Fontes avaliadas para preço absoluto (R$) dos alimentos

Atualizado em 02/10/2026. Esta nota registra por que os seis alimentos do projeto (arroz, feijão carioca, carne bovina/patinho, leite longa vida, óleo de soja, café moído) aparecem como **índice de preço** (base 100 = jan/2019) e não em reais.

## Pergunta e resultado

O IBGE/SIDRA, a única fonte usada no pipeline para esses itens, publica só a **variação mensal** de cada subitem do IPCA (e o peso no índice), nunca o preço médio absoluto. Existe uma fonte confiável que permita mostrar também o preço observado em R$, mês a mês, com a mesma definição de produto nos dois períodos?

**Resultado: não para nenhum dos seis itens.** Nenhum preço foi inventado, estimado ou interpolado para preencher a lacuna; o índice é a única representação de preço mostrada. Uma tentativa de integrar a CONAB (varejo de arroz e feijão, por UF) não chegou a produzir dado: o script de download não encontrou o link do arquivo na página da CONAB, e esse código foi removido do repositório (permanece no histórico do Git). **Nenhum dado da CONAB está nos resultados.**

## Como foi feita a avaliação

Pesquisa na web e leitura da documentação das fontes. Parte dos portais (IBGE, DIEESE, CONAB) bloqueou o acesso direto durante a avaliação, então os pontos marcados **[por busca]** vêm de resultados de busca (incluindo texto oficial de metodologia quando apareceu) e os marcados **[não verificado]** são inferências a confirmar abrindo o arquivo real antes de qualquer código assumir nome de coluna, unidade ou cobertura.

## Fontes avaliadas

**IBGE/SIDRA (usada no pipeline).** Cobertura nacional e regiões metropolitanas, mensal. Publica a variação percentual mensal por subitem (tabelas 1419 até dez/2019 e 7060 de jan/2020 em diante). [por busca] A nota metodológica do SNIPC descreve o preço médio como passo intermediário do cálculo, não como dado publicado; não há tabela ativa de "preços médios" de alimentos para 2019 em diante (a tabela 655 cobre ago/1999 a jun/2006 e também é variação). Segue como fonte do índice, não do preço absoluto.

**DIEESE, Pesquisa Nacional da Cesta Básica.** 17 capitais historicamente (27 a partir de 2024/2025), nunca uma média nacional. [por busca] Desde abril/2018 os preços por produto e cidade só estão disponíveis por assinatura; os boletins mensais em PDF são públicos, mas são relatórios por capital, não uma série para baixar em lote (extrair ~90 meses × 17 capitais × 13 itens exigiria interpretar PDFs, com risco de erro de leitura). A composição da cesta varia por região (Decreto-Lei 399/1938). Não entra no pipeline.

**CONAB + DIEESE (parceria desde 2024).** [por busca] A coleta passou de 17 para 27 capitais. Essa mudança é uma quebra de metodologia, que violaria a regra de mesma definição nos dois períodos se a série fosse emendada sem marcação. Continua sendo uma lista por capital, não uma média nacional oficial, e [não verificado] se sai em formato estruturado ou só em boletim. Não usada.

**CONAB, Sistema de Informações de Mercado (preços agropecuários).** Por UF, mensal e semanal, com preço ao produtor, ao atacado e ao varejo (o varejo é o nível relevante); arquivos baixáveis ("Preços agropecuários Mensal UF"). A interface de consulta roda sobre uma plataforma de dashboards, o que aponta o arquivo de download, e não uma API, como caminho de automação. Candidato mais forte para arroz e feijão, mas **não integrado**, por quatro motivos em aberto:
1. o download automático falhou (não foi achado o link na página) e o arquivo real nunca foi aberto;
2. [não verificado] cobertura mensal contínua em 2019–2026 e unidade exata (R$/kg presumido);
3. "Feijão Cores Tipo 1" pode não ser exatamente "feijão carioca", o subitem do índice IBGE; juntar as duas séries misturaria definições de produto;
4. não foi encontrada nota metodológica oficial sobre como a CONAB consolida as UFs em um "Brasil"; qualquer número nacional seria uma média do projeto e teria de ser rotulado assim.
Para carne por corte, leite embalado, óleo engarrafado e café moído, o SIM não tem série de varejo comparável (foca em grãos e commodities). Descartada para esses quatro.

**CEPEA/ESALQ (boi gordo, leite, soja, café).** [por busca] Medem o preço pago ao produtor ou nas praças de negociação, não o preço ao consumidor; misturariam dois elos da cadeia no mesmo gráfico. Descartada para os quatro itens, não por falta de dado.

**Procon (estadual e municipal).** Sem cobertura nacional, metodologia própria de cada órgão e frequência irregular. Descartado.

**IBGE, Pesquisa de Orçamentos Familiares (POF).** A cada 5–6 anos; serve de conferência pontual, não de série mensal. Descartada para este uso. (Os pesos e as tabelas de correspondência da POF são usados em outro ponto: ver [referencias.md](referencias.md).)

## Resumo

| Item | Fonte do índice (mantida) | Preço absoluto hoje? | Melhor candidato | Situação |
|---|---|---|---|---|
| Arroz | IBGE/SIDRA (variação) | Não | CONAB SIM, varejo/UF | Candidato, não verificado nem integrado |
| Feijão carioca | IBGE/SIDRA (variação) | Não | CONAB SIM, varejo/UF | Candidato, com risco de definição de produto |
| Carne bovina (patinho) | IBGE/SIDRA (variação) | Não | Nenhum identificado | Só índice |
| Leite longa vida | IBGE/SIDRA (variação) | Não | Nenhum identificado (CEPEA é preço ao produtor) | Só índice |
| Óleo de soja | IBGE/SIDRA (variação) | Não | Nenhum identificado (CEPEA é a soja em grão) | Só índice |
| Café moído | IBGE/SIDRA (variação) | Não | Nenhum identificado (CEPEA é o café em grão) | Só índice |

## O que seria preciso para retomar

Alguém com acesso direto à CONAB teria de baixar o arquivo "Preços agropecuários Mensal UF", filtrar Arroz Tipo 1 e Feijão Cores Tipo 1 em nível Varejo e confirmar: cobertura mensal 2019–2026 sem buracos, a unidade, se existe uma linha "Brasil" oficial e a definição exata de "Feijão Cores Tipo 1" frente a "carioca". Só então se decidiria a fórmula de agregação nacional, documentada como cálculo do projeto, e se a série entra.
