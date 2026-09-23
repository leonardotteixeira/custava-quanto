# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: qualquer pessoa no Brasil que quer entender como preços de
combustíveis, alimentos básicos e indicadores econômicos mudaram desde 2019,
sem depender de narrativa partidária pronta. Três perfis confirmados em
Phase 0 orientam a experiência:

- **Jordan** (first-timer): sem contexto econômico prévio, decide em segundos
  se o número "fez sentido" para ele.
- **Casey** (mobile, uma mão, distraído): descobre por toque/scroll, não lê
  parágrafos longos primeiro.
- **Riley** (pesquisador/verificador): quer conferir fonte, frequência e
  metodologia antes de confiar em qualquer número.

Alcance confirmado: publicação pública ampla (não é uso pessoal/portfólio
fechado) — o produto precisa passar credibilidade a visitantes desconhecidos
na primeira visita, não só a quem já conhece o autor.

## Product Purpose

Mostrar como preços de combustíveis, itens da cesta básica e indicadores de
mercado (Dólar, Selic, Ibovespa, IPCA) mudaram entre o governo Bolsonaro
(2019–2022) e o governo Lula (2023–hoje), sempre acompanhados do contexto
necessário (câmbio, petróleo Brent, inflação) para que o visitante não
atribua a um governo o que é efeito de fatores externos. Sucesso = o
visitante entende a magnitude e o contexto da mudança, sem o produto
declarar um "vencedor".

## Positioning

Não é um dashboard financeiro nem uma ferramenta político-partidária — é
jornalismo de dados neutro e auto-verificável. O que um concorrente não
poderia copiar de forma verdadeira sem o mesmo rigor:

- **Zero cálculo no navegador**: todo número exibido já foi calculado em
  Python a partir de fontes públicas (ANP, IBGE, Banco Central, FRED, Yahoo
  Finance) e gravado em `dashboard_data.json` — o front só formata e desenha.
- **Notícias verificadas contra a fonte, não curadas por IA**: cada matéria
  citada é conferida por script (`build_news.py`) contra a página original
  antes de publicar; título, veículo e data precisam bater.
- **Limitações declaradas, não escondidas**: toda lacuna de dado (ex.:
  set/2020 ausente na ANP, cesta básica como índice e não preço em R$) é
  visível na interface, não só em nota de rodapé.
- **Ordem editorial que impede causalidade falsa**: contexto macro
  (câmbio, Brent, Selic, IPCA) sempre aparece antes da comparação entre
  governos.

## Operating Context

Pipeline Python (`scripts/download_*.py` → `build_dataset.py` →
`build_dashboard_data.py` → `build_news.py`) roda localmente ou sob demanda,
gera JSON estático em `data/processed/`, servido por um dashboard HTML/CSS/JS
+ Plotly.js totalmente estático (sem backend em produção). Dados atualizáveis
via `scripts/update_data.py` (completo ou `--rapido`, pulando ANP/IBGE).
Cotações "ao vivo" (Dólar, Selic, Ibovespa) vêm do Banco Central (SGS) e
Yahoo Finance, com atraso declarado explicitamente na UI — nunca prometem
tempo real.

## Capabilities and Constraints

- 15 produtos: 5 combustíveis, 6 itens de cesta básica, 4 indicadores de
  mercado (Dólar, Selic, Ibovespa, IPCA) — cada categoria com sua própria
  unidade e leitura (R$/litro, índice relativo, pontos, % a.a.).
- Comparação Era→Agora, timeline mensal 2019–hoje, Poder de Compra (litros
  por salário mínimo), Cápsula do Tempo (fotografia cross-indicador por
  mês), comparação Bolsonaro×Lula com cohorts (1º ano, 2 anos, 3 anos,
  governo inteiro), arquivo de notícias reais por ano.
- Sem filtro regional no MVP (dados de combustível têm quebra regional na
  fonte, mas não expostos ainda).
- Cesta básica é índice relativo (base 100), não preço em R$ — o IBGE/SIDRA
  não publica preço absoluto nacional por item; DIEESE teria o dado mas não
  é mais público gratuitamente desde abril/2018.
- "Carne" = corte Patinho especificamente, não média de todos os cortes.
- IPCA usado como deflator é o índice geral, não um índice específico do
  setor analisado.
- WCAG AA já implementado (Phase 1): contraste corrigido, foco por teclado,
  numeração de seções sem pulos.

## Brand Commitments

- **Nome fixo**: "CUSTAVA QUANTO?"
- **Tagline fixa**: "Quanto custava. Quanto custa. O que mudou."
- **Voz editorial** (definida em Phase 0.3): "O Analista Neutro e Rigoroso"
  — clara, objetiva, humana, empática, rigorosamente isenta, sem
  sensacionalismo, sem adjetivos de IA.
- Tudo além de nome/tagline/voz (paleta, tipografia, componentes visuais) é
  **aberto para evolução** em Phase 2 — a identidade visual atual (serif
  editorial + paleta terrosa) é ponto de partida, não compromisso fixo.

## Evidence on Hand

- Dados reais versionados em `data/processed/*.json` (preços, câmbio, Selic,
  Ibovespa, IPCA, salário mínimo) — nenhum dado sintético/inventado.
- Notícias reais com URL, veículo e data verificados por script contra a
  fonte original (`data/processed/noticias.json`).
- Fotos oficiais dos presidentes (acervo Palácio do Planalto, CC BY 2.0, via
  Wikimedia Commons) — crédito visível.
- `output/RESUMO.md` documenta conclusões e limitações da análise original
  (camada de gráficos estáticos, anterior ao dashboard).
- Ausência confirmada: sem dado da DIEESE (cesta básica em R$), sem filtro
  regional, sem modelo econométrico causal — nenhum destes deve ser
  fabricado ou simulado.

## Product Principles

1. **Nunca implicar causalidade** onde só existe correlação temporal — toda
   comparação de governo vem depois do contexto macro, nunca antes.
2. **Nenhum dado inventado ou aproximado sem declarar a aproximação** — se a
   fonte não tem o número, a interface diz isso explicitamente, não estima
   silenciosamente.
3. **Transparência de fonte e frequência sempre visível**, nunca escondida
   em tooltip ou rodapé secundário.
4. **Neutralidade política ativa**: mesma régua, mesmo tratamento visual e
   textual para Bolsonaro e Lula — "sem vencedor, sem nota".
5. **Credibilidade à primeira vista para desconhecidos**: como o alcance é
   publicação pública ampla, o visitante que nunca ouviu falar do projeto
   precisa perceber rigor e seriedade nos primeiros segundos, sem precisar
   conhecer o autor.

## Accessibility & Inclusion

WCAG AA como padrão mínimo (contraste, foco por teclado, navegação sem
mouse) — já auditado e corrigido em Phase 1. Nenhum requisito adicional
específico de usuário foi levantado até o momento.
