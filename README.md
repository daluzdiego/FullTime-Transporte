# FullTime — Transporte e Consultoria

Sistema web responsivo para gestão de operações de transporte, cadastros de frota, entrada assistida de solicitações e distribuição de motoristas por operação.

## Arquitetura operacional acordada

- **Planilha do Bruno:** origem oficial dos cadastros de motoristas, cavalos, carretas, conjuntos e documentos; também recebe a entrada confirmada de operações.
- **Planilha principal Full Time:** base operacional, espelhos sincronizados, operações, viagens, disponibilidade, fila, ofertas, escalas e movimentações.
- **Sincronização:** Bruno → Full Time, por IDs estáveis e com comportamento idempotente.
- **Entrada de operações:** o administrador cola a mensagem recebida no WhatsApp pessoal; a IA extrai os dados, apresenta os campos para revisão e só grava após confirmação.
- **Operação e viagens:** uma operação-pai pode conter de 1 a 30 viagens-filhas. A operação é a unidade de escala; as viagens herdam o motorista e o conjunto atribuídos.
- **Peso:** volume total da operação, peso previsto por viagem e peso real movimentado são campos distintos. O sistema não divide o total por suposição.
- **Escala:** elegibilidade por disponibilidade, CNH, conjunto APTO e capacidade; oferta sequencial com prazo de 120 minutos; aceite, recusa, indisponibilidade e expiração registrados.
- **Movimentações:** cada movimento aponta para a viagem e acumula o peso real; o saldo da operação é atualizado.

## Estado do projeto

A consolidação e as alterações recentes estão na branch `planejamento/controle-18-11-2026`, em revisão no [PR #5 — rascunho](https://github.com/daluzdiego/FullTime-Transporte/pull/5).

- A sintaxe estática dos arquivos Apps Script e dos scripts do frontend foi validada.
- Foram feitas simulações com dados fictícios para entrada multi-viagem, idempotência e movimentações.
- **Ainda não está homologado no runtime Google Apps Script.**
- A resposta do motorista ainda é registrada pelo administrador no painel; a integração automática de mensagens e respostas via WhatsApp não está ativa.
- O instalador do gatilho de expiração existe, mas ainda não foi executado. Só instalar após testes em cópia de homologação com `instalarGatilhoExpiracaoOfertasFullTime('ATIVAR_GATILHO_FULLTIME')`.

## Documentos de referência

- [Arquitetura consolidada para homologação](docs/ARQUITETURA_CONSOLIDADA_HOMOLOGACAO.md)
- [Controle de progresso e cronograma](docs/CONTROLE_PROJETO_HOMOLOGACAO_2026-11-18.md)
- [Regras de escala justa](docs/REGRAS_ESCALA_JUSTA.md)
- [Segurança](docs/SEGURANCA.md)
- [Instalação](docs/INSTALACAO.md)
- [Testes](docs/TESTES.md)

## Tecnologia

- Google Apps Script como backend e aplicação web.
- Google Sheets como persistência inicial.
- HTML, CSS e JavaScript no frontend.

## Primeiro passo seguro de homologação

No editor do Apps Script, execute `verificarAmbienteHomologacaoFullTime()`. Essa função é somente leitura: confere IDs configurados sem exibi-los, guias, cabeçalhos, propriedades e gatilho de expiração. Envie o objeto/log retornado para análise antes de executar qualquer migração.

## Atenção antes de executar no ambiente real

1. Não execute rotinas de limpeza nem apague dados reais.
2. Faça backup das duas planilhas e use cópias de homologação com dados fictícios.
3. Confirme os IDs das planilhas e as propriedades do Apps Script antes de executar rotinas de preparação/sincronização.
4. Execute a preparação de schema apenas depois de conferir os cabeçalhos existentes; as migrações previstas são aditivas.
5. Não instale gatilhos nem implante o Web App antes da homologação das permissões e do fluxo ponta a ponta.
6. Não use esta branch como sistema de produção crítica até que os testes no runtime Google sejam aprovados.

## Instalação

As instruções históricas de bootstrap em [docs/INSTALACAO.md](docs/INSTALACAO.md) precisam ser lidas junto com a arquitetura consolidada. **Para a implantação existente Bruno → Full Time, não execute `configurarSistemaFullTime()` sem confirmar que a intenção é criar uma base nova.** O projeto deve continuar usando as planilhas existentes e seus IDs já configurados.
