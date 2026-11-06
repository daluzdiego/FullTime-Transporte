# FullTime — execução da homologação com massa fictícia

Branch: `feat/arquitetura-multicanal-sem-planilha-bruno`

## Escopo

A rotina usa exclusivamente `FT_REGISTRY_DATABASE_ID` para as guias operacionais e `FT_DATABASE_ID` para autenticação. Não consulta, copia, escreve nem limpa a planilha do Bruno ou a guia `CAVALOS-BRUNO`. Mantém usuários administrativos e a guia `AUDITORIA`.

A limpeza atua somente nas linhas abaixo do cabeçalho das guias listadas em `FT_HOMOLOGACAO_GUIAS`. Guias fora da allowlist não são apagadas. Antes de popular, a rotina exige que as guias permitidas estejam vazias, evitando duplicação acidental.

## Comandos no editor do Apps Script

Abra o projeto Apps Script vinculado ao FullTime, atualize os arquivos do projeto com o conteúdo desta branch e execute nesta ordem:

1. `diagnosticarHomologacaoFullTime()` — confirma nomes das duas bases e mostra a quantidade de linhas por guia. Não altera dados.
2. `fazerBackupHomologacaoFullTime()` — cria uma planilha de backup contendo somente cópias das guias operacionais permitidas. Guarde a URL retornada.
3. `prepararEstruturaHomologacaoFullTime()` — cria guias ausentes e acrescenta cabeçalhos canônicos ausentes, sem excluir colunas existentes.
4. `limparBaseParaHomologacaoFullTime()` — remove somente os dados operacionais das guias permitidas e credenciais de motoristas de teste antigas (`@fulltime.test` ou ID `FTTEST-`). Preserva administradores e usuários não identificados como teste.
5. `gerarMassaFicticiaHomologacaoFullTime()` — popula cadastros, vínculos, clientes, locais, operações, participações, regras, disponibilidade, fila, ofertas demonstrativas, eventos e histórico de assiduidade; cria 40 credenciais individuais.
6. `validarMassaHomologacaoFullTime()` — verifica quantidades e integridade dos vínculos.

## Massa esperada

- 40 motoristas ativos, 40 cavalos ativos, 40 carretas ativas e 40 conjuntos ativos.
- 4 clientes e 4 operações: 3 operações com 10 participações cada; uma quarta operação sem designação para testar o ranking com 10 conjuntos livres.
- 30 participações, cada uma com meta de 2 viagens e 100 toneladas; metas globais de 20 viagens e 1.000 toneladas por operação designada.
- As guias `VIAGENS`, `EVENTOS_VIAGEM`, `DOCUMENTOS_VIAGEM` e `TICKETS` ficam inicialmente sem linhas: são criadas pelos fluxos de iniciar viagem e registrar evidências. Pré-criar viagens contaria contra a meta e impediria o teste correto de início.
- `OFERTAS_OPERACOES` contém apenas registros demonstrativos, não representa um fluxo funcional de aceite/recusa/expiração.

## Credenciais

O comando 5 retorna os 40 logins e senhas temporárias no resultado e no registro de execução. Copie o resultado imediatamente e guarde-o em local seguro. A senha não é armazenada em texto aberto; somente salt e hash são persistidos. O primeiro acesso exige troca de senha.

Os logins usam `motorista01@fulltime.test` até `motorista40@fulltime.test`. Os dados cadastrais e documentos são fictícios e marcados como homologação. Não há telefones WhatsApp válidos nem envio de mensagens.

## Limites da homologação atual

A carga permite validar cadastro, vínculos, permissões individuais, isolamento do portal, distribuição de metas, ranking com motoristas livres e ciclo de viagens iniciado pelo painel administrativo. Ela não prova ainda aceite/recusa e expiração automática de ofertas, nem ingestão real de comprovantes por WhatsApp. Esses fluxos precisam estar implementados e testados antes da homologação final.

## Reexecução

Para refazer a massa: execute diagnóstico, faça novo backup, execute a limpeza, gere a massa e valide. Não execute o gerador duas vezes sem limpar: ele bloqueia a repetição quando encontra registros nas guias operacionais permitidas.
