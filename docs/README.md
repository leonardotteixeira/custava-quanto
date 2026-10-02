# Documentação

Atualizado em 02/10/2026. O código e os dados do repositório são a fonte da verdade; quando um documento e o código discordarem, vale o código, e a discordância deve ser registrada em [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Comece por aqui

| Preciso… | Leia |
|---|---|
| Entender o projeto | [../README.md](../README.md) |
| Entender a metodologia | [METHODOLOGY.md](METHODOLOGY.md) |
| Ver as fontes e as referências | [referencias.md](referencias.md) |
| Ver como a metodologia foi auditada | [AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md) |
| Reproduzir a análise | [REPRODUCAO.md](REPRODUCAO.md) |
| Saber o que está em aberto | [KNOWN_ISSUES.md](KNOWN_ISSUES.md) |

## Documentos

| Documento | Conteúdo |
|---|---|
| [METHODOLOGY.md](METHODOLOGY.md) | Fórmulas, nominal × real, janelas de comparação, metodologia da Análise (v1.4.0), tabela "Origem da metodologia", fundamentos por indicador e limitações |
| [referencias.md](referencias.md) | Fontes institucionais e literatura metodológica, cada uma com o que sustenta e o que não sustenta; o que é convenção do projeto |
| [AUDITORIA_ACADEMICA_METODOLOGIA.md](AUDITORIA_ACADEMICA_METODOLOGIA.md) | Auditoria acadêmica e oficial da metodologia: matriz R1–R10, problemas e correções, verificações, antes e depois, referências avaliadas |
| [AUDITORIA_ANALISE_GOVERNOS.md](AUDITORIA_ANALISE_GOVERNOS.md) | Histórico de versões da metodologia da Análise (v1.0 a v1.4.0) e decisões |
| [AUDITORIA_LINKS_NOTICIAS.md](AUDITORIA_LINKS_NOTICIAS.md) | Auditoria dos 142 links de notícias e contexto |
| [AUDITORIA_PRECOS_ALIMENTOS.md](AUDITORIA_PRECOS_ALIMENTOS.md) | Fontes avaliadas para preço absoluto de alimentos e por que nenhuma foi integrada |
| [REPRODUCAO.md](REPRODUCAO.md) | Requisitos, obtenção dos dados, execução dos scripts, testes e site local |
| [DATA_PIPELINE.md](DATA_PIPELINE.md) | Fluxo fonte → site, tabela de fontes e indicadores, arquivos, notícias, frescor |
| [DEPLOY.md](DEPLOY.md) | Publicação no GitHub Pages, domínio e DNS |
| [TESTING_AND_QA.md](TESTING_AND_QA.md) | Testes automatizados, auditorias reexecutáveis e verificações de front-end |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Problemas conhecidos e lacunas de dados |

Os scripts `auditoria_*.py` desta pasta refazem, em modo somente leitura, as verificações da auditoria (ver [TESTING_AND_QA.md](TESTING_AND_QA.md)).
