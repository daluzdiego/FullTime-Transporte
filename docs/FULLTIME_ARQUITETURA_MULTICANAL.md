# Full Time — Arquitetura Multicanal sem dependência da planilha do Bruno

**Branch:** `feat/arquitetura-multicanal-sem-planilha-bruno`  
**Base:** `fulltime-2.0`  
**Status:** decisão arquitetural aprovada; implementação condicionada à auditoria dos contratos de dados e da implantação ativa.

## 1. Decisão de produto

A planilha do Bruno deixa de ser fonte operacional e deixa de ser dependência da arquitetura futura. O Full Time será responsável pelos próprios cadastros e por toda a gestão operacional.

As três fontes oficiais de entrada de solicitações/operações serão:

1. WhatsApp — integração automatizada.
2. E-mail — caixa de entrada integrada e processamento automatizado.
3. Sistema Full Time — formulário/painel para lançamento manual.

As três fontes alimentam o mesmo núcleo de ingestão e a mesma base central. Não haverá três fluxos de negócio independentes.

A indisponibilidade de um canal não pode bloquear os outros. O operador deve conseguir continuar pelo canal alternativo disponível. A disponibilidade do canal será monitorada e o painel deve informar falhas e filas pendentes.

## 2. Princípios obrigatórios

- **Sem ponto único de entrada:** WhatsApp, e-mail e painel são adaptadores independentes.
- **Uma única fonte de verdade:** cadastros, solicitações, operações, alocações, viagens e eventos pertencem ao Full Time.
- **Persistir antes de interpretar:** a mensagem e os anexos originais devem ser registrados antes da chamada de IA.
- **IA sem autoridade de escrita operacional:** a IA extrai e sugere; validações determinísticas e regras de autorização decidem o que pode ser persistido.
- **Idempotência:** mensagens repetidas, reentregas de webhook, e-mails encaminhados e reprocessamentos não podem duplicar solicitações, operações ou eventos.
- **Rastreabilidade:** cada registro guarda canal, identificador externo, remetente, timestamps, conteúdo original, status de processamento e histórico.
- **Degradação controlada:** falha de IA não impede recebimento; falha de WhatsApp não impede e-mail/painel; falha de e-mail não impede WhatsApp/painel.
- **Recuperação:** filas com erro devem permitir reprocessamento seguro e manual, sem perda do original.
- **Segurança:** autenticar webhooks, validar remetentes, proteger segredos, limitar acesso e registrar auditoria.
- **Migração sem ruptura:** não remover dados ou funções antigas até inventariar dependências, validar migração e homologar o núcleo substituto.

## 3. Fluxo comum de ingestão

1. Adaptador recebe mensagem/formulário/anexo.
2. Valida autenticação, tamanho, formato e limites do canal.
3. Cria envelope de entrada com identificador interno e identificador externo do canal.
4. Persiste o conteúdo original e metadados.
5. Aplica deduplicação e registra o resultado.
6. Coloca o envelope em fila durável de processamento.
7. Agente de interpretação extrai os campos e aponta ambiguidades/lacunas.
8. Motor determinístico valida campos, regras, permissões e consistência.
9. Solicitação segue para coleta de informações, revisão ou aprovação, conforme política.
10. Somente após aprovação explícita e validação é convertida em OPERAÇÃO.
11. Cada transição gera evento de auditoria.

Estados mínimos sugeridos para a entrada: RECEBIDA, ARMAZENADA, AGUARDANDO_PROCESSAMENTO, EM_PROCESSAMENTO, EM_COLETA, AGUARDANDO_REVISAO, AGUARDANDO_APROVACAO, APROVADA, CONVERTIDA, RECUSADA, ERRO_REPROCESSAVEL e ERRO_FINAL.

## 4. Adaptadores de canal

### WhatsApp
- Receber mensagens e mídias por integração oficial e webhook autenticado.
- Persistir o ID da mensagem do provedor, telefone, horário, tipo de conteúdo e mídia original.
- Tratar reentrega do webhook sem duplicar.
- Se o provedor/API estiver indisponível, sinalizar canal degradado e orientar uso do e-mail ou painel.
- Não tornar a lógica de negócio dependente do fornecedor WhatsApp.

### E-mail
- Utilizar caixa postal dedicada à entrada de operações.
- Registrar Message-ID, remetente, destinatários, assunto, corpo, anexos e data.
- Deduplicar por Message-ID e, quando necessário, por hash do conteúdo/anexo.
- Processar anexos com os mesmos validadores usados no WhatsApp.
- Se a integração de e-mail falhar, WhatsApp e painel continuam disponíveis.

### Sistema
- Formulário autenticado para lançamento manual.
- Permitir texto livre e campos estruturados.
- Preservar o texto original, autor, data e anexos.
- Disponível como rota alternativa quando os canais externos falharem, desde que a aplicação e sua persistência estejam operacionais.

## 5. Modelo de dados conceitual

- CANAIS_ENTRADA: configuração, estado, última verificação, erros e disponibilidade.
- MENSAGENS_ENTRADA: envelope canônico, canal, identificador externo, remetente, conteúdo original, anexos e status.
- ANEXOS_ENTRADA: arquivo original, hash, MIME, tamanho, localização privada e metadados.
- FILA_PROCESSAMENTO: tentativas, prioridade, próxima execução, lease, erro e estado.
- SOLICITACOES: dados estruturados, campos pendentes, ambiguidades, revisão e aprovação.
- CLIENTES e CONTATOS_AUTORIZADOS: identidade, canais e permissões.
- OPERACOES: entidade operacional aprovada, com volume, rota, prazo e meta de viagens.
- MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS: cadastros geridos pelo próprio Full Time.
- PARTICIPACAO_OPERACOES: meta de viagens e volume atribuídos a cada motorista/conjunto.
- VIAGENS: ciclos individuais de transporte.
- EVENTOS_VIAGEM e COMPROVANTES: carregamento, trânsito, descarga e evidências.
- AUDITORIA: trilha imutável de ações e transições.

Os nomes são conceituais. Antes de criar guias/tabelas, comparar com o inventário real e reutilizar contratos compatíveis. Não duplicar guias existentes sem necessidade comprovada.

## 6. Disponibilidade e continuidade operacional

- Cada adaptador possui health check independente.
- O painel exibe: operacional, degradado, indisponível ou configuração pendente.
- Alertas são gerados quando um canal deixa de receber/processar.
- Falhas transitórias usam retry com backoff e limite; falhas permanentes vão para fila de exceções.
- A fila é persistente: reinício do serviço não perde entradas.
- O operador pode registrar pelo canal alternativo sem aguardar a recuperação do canal defeituoso.
- A deduplicação compartilhada identifica quando a mesma solicitação chega por mais de um canal, sem apagar a evidência de cada recebimento.
- Não prometer disponibilidade absoluta: se todos os canais e a infraestrutura central estiverem indisponíveis, deve existir procedimento operacional de contingência e posterior reconciliação.

## 7. Menu aprovado

### VISÃO GERAL
- Painel

### TRANSPORTE
- Entrada de solicitações
- Operações
- Viagens
- Localização

### CADASTROS
- Motoristas
- Frota
  - Cavalos
  - Carretas
  - Conjuntos
- Clientes
- Locais

### GESTÃO
- Operações
- Relatórios
- Configurações

A tela Entrada de solicitações deve apresentar a saúde dos três canais, fila de recebimentos, origem, horário, status, conteúdo original, análise IA, campos pendentes e ações de revisão. Não deve ser apenas um formulário de texto colado.

## 8. Regras de operação e segurança

- A entrada de solicitação não cria automaticamente uma operação nem designa motorista/conjunto.
- A conversão exige campos obrigatórios completos, meta de viagens, categoria operacional, revisão e aprovação conforme perfil.
- Reprocessar não significa aprovar.
- Mensagens duplicadas são vinculadas à solicitação existente e preservadas no histórico.
- Um remetente só pode consultar/alterar dados autorizados.
- Dados extraídos por IA devem guardar modelo, versão, timestamp e resultado de validação.
- Arquivos originais devem ser privados e sujeitos a política de retenção.
- Logs não devem expor tokens, chaves ou documentos sensíveis.

## 9. Estratégia de transição da planilha do Bruno

1. Inventariar as funções e dados atuais que dependem da planilha Bruno.
2. Definir o contrato canônico dos cadastros dentro do Full Time.
3. Implementar CRUD próprio para motoristas, cavalos, carretas e conjuntos.
4. Criar importação inicial controlada, com prévia, validação, relatório e deduplicação, se o usuário decidir aproveitar os dados existentes.
5. Homologar vínculos motorista-cavalo-carretas e capacidade útil.
6. Alterar leituras operacionais para a base nativa Full Time.
7. Desativar sincronizações e gatilhos Bruno somente após prova de que nenhum módulo depende deles.
8. Preservar a planilha antiga como arquivo histórico/contingência até aprovação expressa de encerramento.

Não executar exclusão, limpeza ou alteração de dados na planilha do Bruno durante a auditoria.

## 10. Sequência de implementação

A. Baseline: inventário do repositório, Apps Script implantado, propriedades, gatilhos, guias e dependências.  
B. Contratos: modelo canônico de cadastros, solicitações, operações, alocações, viagens e documentos.  
C. Núcleo de ingestão: envelope, persistência, deduplicação, fila e auditoria.  
D. Canal Sistema: entrada manual integrada ao núcleo e testes.  
E. Canal E-mail: leitura de caixa postal, anexos, deduplicação e reprocessamento.  
F. Canal WhatsApp: webhook oficial, mídia, autenticação, deduplicação e contingência.  
G. IA: interpretação e perguntas sobre o envelope persistido, sem escrita direta.  
H. Cadastros nativos: retirar dependência funcional da planilha Bruno.  
I. Operação: alocação, viagens, comprovantes e escala.  
J. UX: implementar o menu e as telas aprovadas, com indicadores de saúde dos canais.  
K. Homologação: testes de falha isolada de cada canal, duplicidade cruzada, indisponibilidade de IA, concorrência, recuperação e fluxo ponta a ponta.

## 11. Critérios de aceite

- Uma solicitação enviada pelo WhatsApp aparece no núcleo e pode ser rastreada.
- Uma solicitação enviada por e-mail aparece no mesmo núcleo e pode seguir o mesmo fluxo.
- Uma solicitação inserida pelo painel aparece no mesmo núcleo e pode seguir o mesmo fluxo.
- Desligar o adaptador WhatsApp não impede e-mail nem painel.
- Desligar o adaptador de e-mail não impede WhatsApp nem painel.
- Falha de IA não perde a solicitação nem bloqueia a entrada.
- A mesma solicitação recebida por dois canais não gera duas operações.
- Reentrega de webhook/e-mail não duplica eventos.
- O sistema identifica canal indisponível e oferece o procedimento alternativo.
- Cadastros e operações podem ser mantidos sem acesso à planilha Bruno.
- Nenhuma rotina crítica consulta ou sincroniza a planilha Bruno após a conclusão da transição.
- Nenhuma migração destrutiva ocorre sem backup, prévia, validação e aprovação.

## 12. Pendências que dependem de verificação técnica

- Provedor/conta oficial de WhatsApp e modelo de webhook.
- Caixa postal e método autorizado de integração de e-mail.
- Persistência e fila adequadas à concorrência e ao volume real.
- Estado do deploy Apps Script e das propriedades atualmente configuradas.
- Inventário real das guias e dados antes de desenhar migrações.
- Política de aprovação automática ou sempre humana para converter solicitação em operação.

**Regra final:** três portas de entrada independentes, um único núcleo confiável, uma única fonte de verdade e nenhum canal com poder de paralisar a operação sozinho.


## Cadastro inicial e manutenção em lote

A autonomia operacional não significa obrigar o usuário a cadastrar cada motorista, cavalo, carreta, cliente ou local individualmente. O Full Time terá um módulo de **Importação em lote** com planilha-modelo versionada e abas por entidade. O arquivo será uma interface de entrada, nunca o banco operacional. O sistema validará relações entre clientes, endereços, locais, frota, conjuntos, rotas e operações; mostrará prévia e erros por linha; e só gravará após confirmação autorizada. Importações repetidas serão idempotentes e atualizações terão comparação explícita. A especificação detalhada e o dicionário inicial estão em `docs/FULLTIME_CADASTRO_EM_LOTE_MODELO_DADOS.md`.


## Modelo operacional vigente — supersede referências históricas a CARGAS

A entidade CARGAS não integra o produto. A unidade é OPERAÇÃO e a execução é VIAGEM. Cada operação recebe metas de viagens e volume; cada PARTICIPACAO_OPERACOES define a quantidade de viagens e toneladas daquele motorista/conjunto; cada VIAGEM registra o ciclo individual. CAMINHOES também não integra o cadastro de frota: usar MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS. Ver o contrato normativo em `docs/FULLTIME_MODELO_OPERACIONAL_OPERACOES_VIAGENS.md`.
