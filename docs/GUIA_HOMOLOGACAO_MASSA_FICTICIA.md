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
5. `gerarMassaFicticiaHomologacaoFullTime()` — popula cadastros, vínculos, clientes, locais, dez operações, regras, disponibilidade, fila, cem convites e histórico de assiduidade; cria 40 credenciais individuais.
6. `validarMassaHomologacaoFullTime()` — verifica quantidades, integridade dos vínculos, 10 operações, 40 disponibilidades e 100 convites.

## Massa esperada

- 40 motoristas ativos, 40 cavalos ativos, 40 carretas ativas e 40 conjuntos ativos.
- 4 clientes, 10 operações com requisitos distintos e 40 motoristas/conjuntos sem participação previamente atribuída. Cada operação gera 10 convites simulados para os dez conjuntos compatíveis; são 100 convites no total.
- As operações têm volumes e restrições distintos. A operação de grãos possui 400.000 toneladas no total; com capacidade teórica máxima de 55 t por viagem, a estimativa inicial é de 7.273 viagens. O dimensionamento definitivo depende dos conjuntos efetivamente compatíveis e da operação real.
- As guias `VIAGENS`, `EVENTOS_VIAGEM`, `DOCUMENTOS_VIAGEM` e `TICKETS` ficam inicialmente sem linhas: são criadas pelos fluxos de iniciar viagem e registrar evidências. Pré-criar viagens contaria contra a meta e impediria o teste correto de início.
- `OFERTAS_OPERACOES` contém 100 convites simulados, dez por operação. Eles aparecem no portal individual do motorista. A função `ordenarCandidatosOperacaoFullTime` agora aplica filtro por situação do conjunto, motorista ativo, disponibilidade do dia, capacidade útil e tipos de carreta exigidos. A preferência de capacidade (maior, menor ou equilibrada) é definida no JSON de `REGRAS_OPERACIONAIS.EXIGENCIAS`.

## Credenciais

O comando 5 retorna os 40 logins e senhas temporárias no resultado e no registro de execução. Copie o resultado imediatamente e guarde-o em local seguro. A senha não é armazenada em texto aberto; somente salt e hash são persistidos. O primeiro acesso exige troca de senha.

Os logins usam `motorista01@fulltime.test` até `motorista40@fulltime.test`. Os dados cadastrais e documentos são fictícios e marcados como homologação. Não há telefones WhatsApp válidos nem envio de mensagens.

## Limites da homologação atual

A carga permite validar cadastro, vínculos, permissões individuais, isolamento do portal, distribuição de metas, ranking com motoristas livres e ciclo de viagens iniciado pelo painel administrativo. A notificação desta homologação é interna ao portal; não envia e-mail, SMS, push ou WhatsApp. O portal ainda não permite aceitar/recusar o convite, nem há expiração automática com convocação do próximo candidato. Esses fluxos, além da ingestão de comprovantes por WhatsApp, precisam ser implementados e testados antes da homologação final. Esses fluxos precisam estar implementados e testados antes da homologação final.

## Reexecução

Para refazer a massa: execute diagnóstico, faça novo backup, execute a limpeza, gere a massa e valide. Não execute o gerador duas vezes sem limpar: ele bloqueia a repetição quando encontra registros nas guias operacionais permitidas.


## Cenários das dez operações

1. Armazém de acesso compacto — VUC/baú compacto, capacidade máxima de 20 t.
2. Corredor de grãos — 400.000 t totais, BITREM/RODOTREM, capacidade mínima de 40 t.
3. Distribuição urbana — veículos compactos e baús.
4. Terminal portuário — graneleira, basculante ou bitrem.
5. Expedição urgente — prioridade e janela curta.
6. Carga pesada industrial — conjuntos de alta capacidade.
7. Pátio com manobra crítica — VUC/baú compacto, máximo de 18 t.
8. Rota de longa distância — capacidade e disponibilidade.
9. Janela programada — janela de recebimento definida.
10. Operação de volume elevado — BITREM/RODOTREM, mínimo de 40 t.

Para refazer a massa com esta versão, atualize os quatro arquivos do projeto Apps Script (`Code.gs`, `Homologacao.gs`, `Index.html` e o novo `MotorEscalaFullTime.gs`), faça novo backup, limpe a massa anterior, gere novamente e valide. As credenciais temporárias serão regeneradas; copie as novas senhas imediatamente.
