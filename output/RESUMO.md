# Resumo: Combustíveis e Cesta Básica — Bolsonaro x Lula

*Gerado a partir de `data/processed/resumo_periodos_combustiveis.csv` e
`resumo_periodos_cesta.csv`, produzidos por `scripts/build_dataset.py`.
Períodos: Bolsonaro = jan/2019–dez/2022 (48 meses); Lula = jan/2023–ago/2026
(44 meses, ainda em curso — os dois períodos não são perfeitamente
comparáveis em duração ou em ponto do ciclo econômico).*

**Antes dos números: o que este documento NÃO é.** Não é uma tentativa de
dizer "qual governo foi melhor para o seu bolso". É uma descrição do que
os dados mostram, com o contexto disponível para separar o que é
plausivelmente doméstico do que é plausivelmente externo. Causalidade
precisa exigiria um modelo econométrico fora do escopo deste projeto — aqui
o objetivo é dar contexto, não veredito.

## 1. O padrão mais forte dos dados: o "efeito câmbio + Brent" em 2021-2022

O fato isolado mais importante para interpretar tudo o resto: **dentro do
período Bolsonaro, o câmbio USD/BRL subiu 40,1% e o Brent subiu 36,2% em
dólar — juntos, isso é +90,8% no Brent convertido para reais.** Dentro do
período Lula (até agora), o câmbio ficou praticamente estável (-0,9%) e o
Brent em reais subiu só 9,4%.

| | Câmbio médio | Selic média | Brent médio (USD) | Variação câmbio no período | Variação Brent USD no período | Variação Brent BRL no período |
|---|---|---|---|---|---|---|
| Bolsonaro | R$ 4,92 | 6,5% a.a. | US$ 69,4 | +40,1% | +36,2% | **+90,8%** |
| Lula (até ago/2026) | R$ 5,29 | 13,2% a.a. | US$ 80,4 | -0,9% | +10,4% | +9,4% |

Isso importa porque grande parte do diesel e do GLP consumidos no Brasil
depende de insumo importado ou de preço de paridade internacional, e boa
parte da cesta básica (soja, milho, carne, café) é precificada com
referência ao mercado externo — um real mais fraco encarece essas
commodities no mercado interno mesmo sem nenhuma mudança de política
doméstica. Isso não anula decisões domésticas (ver seção 4), mas é o pano
de fundo que precisa estar na mesa antes de qualquer comparação.

## 2. Combustíveis (preço médio nacional, R$/litro ou R$/botijão 13kg)

| Produto | Nominal médio Bolsonaro | Nominal médio Lula | Variação nominal Bolsonaro | Variação nominal Lula | **Variação REAL Bolsonaro** | **Variação REAL Lula** |
|---|---|---|---|---|---|---|
| Gasolina comum | R$ 5,17 | R$ 6,00 | +14,9% | +30,2% | **-9,2%** | **+11,0%** |
| Etanol hidratado | R$ 3,92 | R$ 4,24 | +29,8% | +4,3% | **+2,6%** | **-11,1%** |
| Diesel comum (S500) | R$ 4,58 | R$ 6,08 | +85,1% | +4,1% | **+46,3%** | **-11,3%** |
| Diesel S10 | R$ 4,67 | R$ 6,16 | +83,2% | +7,6% | **+44,8%** | **-8,3%** |
| GLP (botijão 13kg) | R$ 86,31 | R$ 107,72 | +56,2% | +5,7% | **+23,5%** | **-9,8%** |

*Variação = do primeiro ao último mês com dado disponível em cada período.
"Real" = nominal deflacionado pelo IPCA geral, a preços de ago/2026.*

**O achado que chama atenção: gasolina se move ao contrário de todo o
resto.** Diesel, etanol e GLP dispararam em termos reais durante o governo
Bolsonaro e recuaram (ou ficaram estáveis) em termos reais no governo Lula
— o padrão que o câmbio/Brent da seção 1 já sugeria. A gasolina fez o
oposto: caiu em termos reais durante o Bolsonaro (mesmo com Brent e câmbio
disparando) e subiu em termos reais durante o Lula (mesmo com Brent/câmbio
comparativamente estáveis).

Isso não é ruído — tem uma explicação de política tributária amplamente
noticiada na época: em junho de 2022 a Lei Complementar 194/2022 zerou
PIS/Cofins federal e limitou o ICMS estadual sobre combustíveis (de
alíquotas de ~25-30% em vários estados para um teto de 17-18%), reduzindo
artificialmente o preço da gasolina, do etanol e do diesel no segundo
semestre de 2022. Em 2023, parte dessa desoneração foi revertida (CIDE e
PIS/Cofins voltaram a incidir sobre combustíveis, de forma escalonada ao
longo do ano) — o que empurra o preço nominal da gasolina para cima
justamente no início do governo Lula, mesmo sem grande pressão externa
naquele momento específico. **Isso é claramente doméstico** (decisão
tributária, não Petrobras nem câmbio) e é a explicação mais direta que os
dados sugerem para o comportamento atípico da gasolina — mas o dado aqui
não isola sozinho o tamanho exato desse efeito frente a outros (ex.:
mudanças na política de precificação da Petrobras em 2023).

## 3. Cesta básica (índice relativo, não é preço em R$ — ver limitações)

| Item | Variação nominal Bolsonaro | Variação nominal Lula | **Variação REAL Bolsonaro** | **Variação REAL Lula** |
|---|---|---|---|---|
| Arroz | +56,6% | -3,6% | **+23,7%** | **-17,8%** |
| Feijão carioca | +77,7% | +1,7% | **+40,4%** | **-13,3%** |
| Óleo de soja | +140,3% | -13,4% | **+89,9%** | **-26,1%** |
| Carne bovina (patinho) | +71,8% | +23,9% | **+35,8%** | **+5,6%** |
| Leite longa vida | +60,1% | +21,9% | **+26,6%** | **+3,9%** |
| Café moído | +70,6% | +45,6% | **+34,8%** | **+24,2%** |

**Padrão consistente nos seis itens**: todos subiram bem acima da inflação
durante o governo Bolsonaro (de +23,7% a +89,9% em termos reais). No
governo Lula, três itens caíram em termos reais (arroz, feijão, óleo de
soja), dois subiram pouco (leite, carne) e um continuou subindo forte
(café).

Contexto que ajuda a explicar o padrão geral de alta 2019-2022: além do
câmbio (seção 1), esse período inclui a pandemia (disrupção de cadeia de
suprimentos global em 2020-2021), a guerra na Ucrânia a partir de
fevereiro/2022 (choque nos preços globais de grãos e fertilizantes — afeta
diretamente soja e ração animal, logo carne e leite) e frotes/geadas que
atingiram a produção de café no Brasil em 2021. Arroz, feijão e soja são
commodities com preço de referência internacional — um real mais fraco
eleva o preço interno mesmo sem nenhuma decisão de governo.

O café é a exceção que confirma a regra: continuou subindo forte em termos
reais mesmo com câmbio estável no governo Lula, o que é consistente com
quebras de safra em outros grandes produtores globais (clima adverso no
Vietnã e na Colômbia, por exemplo) que empurraram o preço internacional do
café a recordes em 2024-2025 — um fator claramente externo, não capturado
pelo câmbio isoladamente.

## 4. O que os dados NÃO mostram (seja honesto sobre isso)

- **Não provam causalidade.** Câmbio e Brent explicam boa parte do timing,
  mas não isolam o efeito de decisões 100% domésticas — política de preços
  da Petrobras (que mudou de metodologia mais de uma vez nesse período),
  ICMS estadual (que variou por estado, não só pela LC 194/2022), e a
  dinâmica de oferta e demanda de cada produto agrícola especificamente.
- **O corte de governo não é um corte de causa.** Um evento que começa
  antes do corte (ex.: geada no café em 2021, guerra na Ucrânia em
  fev/2022) continua produzindo efeito em preços por vários meses depois —
  inclusive já dentro do período seguinte.
- **Cesta básica aqui é índice relativo, não R$.** Os números de "variação
  %" são comparáveis entre si e contra a inflação, mas não dizem "quanto
  custa 1kg de feijão" — para isso, a fonte de referência (DIEESE) não tem
  mais dados históricos públicos por produto (ver README).
- **"Carne bovina" é um corte específico (patinho)**, não uma média de
  todos os cortes — cortes nobres podem ter tido trajetória diferente.
- **A ANP tem uma lacuna real em setembro/2020** (confirmado nos dados
  brutos, não é bug do processamento) — coincide com o período mais agudo
  da pandemia; não sabemos se é falha de coleta ou de publicação.

## Ver também
- Gráficos interativos em `output/*.html`
- Metodologia completa e lista integral de limitações: [README.md](../README.md)
