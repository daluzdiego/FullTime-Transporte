# FULL TIME — Consolidação funcional e técnica
**Revisão:** 2026-11-24  
**Repositório/branch de referência:** `daluzdiego/FullTime-Transporte` / `main`  
**Objetivo:** manter em um único lugar as decisões funcionais recentes, os módulos responsáveis, as dependências e o estado real da homologação.

## 1. Regras estruturais que não podem regredir

- A operação é a unidade de escala. Uma operação pode exigir várias viagens; não se cria uma oportunidade/escala separada para cada volta.
- Uma operação pode ter um ou vários destinos. Cada destino pertence à mesma operação por `OPERACAO_ID`; cada entrega individual usa `ID_DESTINO`.
- A planilha principal é a fonte única dos dados operacionais. A base de autenticação permanece separada.
- A integração com a planilha antiga do Bruno está desativada. Não reintroduzir sincronização Bruno → principal.
- Não criar entidades/guias genéricas `CAMINHOES` ou `CARGAS`. A frota é composta por motoristas, cavalos, carretas e conjuntos.
- Preservar a guia protegida `CAVALOS-BRUNO`; não limpar a base de autenticação nem reconstruir dados reais para homologar.
- IDs estáveis e cabeçalhos nomeados são o contrato de integração. Não depender da posição fixa de colunas.
- Alterações no Git não publicam automaticamente o Apps Script. A sincronização e a implantação são etapas separadas.
- Homologação sequencial: um teste por vez; só avançar quando o resultado esperado estiver 100% confirmado. Toda instrução de execução deve indicar arquivo, função, local de execução, resultado esperado e log a devolver.

## 2. Fluxo funcional consolidado

### 2.1 Entrada de solicitações e IA
**Arquivos:** `SolicitacoesFullTime.gs`, `InterpretacaoSolicitacoesFullTime.gs`, `Index.html`.

1. Receber solicitação pelo painel/canal integrado e preservar integralmente a mensagem original em `MENSAGEM_BRUTA`.
2. Interpretar com Gemini, mantendo dados, perguntas, pendências e histórico em `INTERPRETACAO_JSON`; estado em `STATUS_INTERPRETACAO`.
3. A IA não aprova e não cria operação. Ela prepara dados e perguntas para revisão humana.
4. A revisão permite corrigir os dados antes da aprovação; a aprovação e a geração da operação são ações separadas.
5. A chave de idempotência impede duplicar solicitações recebidas.
6. Se Gemini estiver indisponível, preservar a solicitação e permitir reprocessamento posterior; o formulário manual deve continuar utilizável.
7. Não inventar volume contratado a partir da carga total de um navio. O volume da operação é somente o volume contratado pela Full Time.
8. Volume de destino só é aceito quando houver evidência literal da mensagem que vincule aquele número àquele destino. Saldo não distribuído permanece sem destino e exige confirmação humana.

**Dados obrigatórios na revisão/aprovação:** cliente, origem identificável, destino(s) identificável(is), volume total em toneladas, quantidade inteira de motoristas necessários e data absoluta válida de coleta. A quantidade prevista de viagens não deve ser exigida da mensagem de entrada. Quando houver volume por viagem informado, pode-se estimar a quantidade; caso contrário, a previsão permanece não informada/zero até definição operacional.

**Datas:** interface de revisão em DD/MM/AAAA; backend normaliza para AAAA-MM-DD. Não converter expressões como “amanhã” sem referência de data confiável.

### 2.2 Cadastro e estrutura da operação
**Arquivos:** `MvpDestinosFullTime.gs`, `Code.gs`, `Index.html`.

- Cadastro manual completo sem IA cria a mesma estrutura operacional.
- Registrar cliente responsável, nome, origem, volume total, tipo/categoria, motoristas necessários e um ou mais destinos com empresa, local, cidade/UF, volume e data prevista quando conhecida.
- A soma dos volumes atribuídos aos destinos não pode exceder o volume total.
- Se a soma for menor, a diferença é saldo não destinado; nunca atribuir automaticamente a um destino.
- `MOTORISTAS_NECESSARIOS` é informação própria da operação e deve estar disponível para escala e Centro de Operações.
- A previsão de viagens é distinta da quantidade de motoristas. No cadastro manual atual, a estimativa é calculada pelo volume total dividido pela carga estimada por viagem.

### 2.3 Escala e convocação
**Arquivos:** `ConvocacaoMotoristasFullTime.gs`, `MotorConvocacaoAutomaticaFullTime.gs`, `EdicaoConvocacaoFullTime.gs`, `PortalMotoristaFullTime.gs`, `Code.gs`, `Index.html`.

- Uma designação é por operação/conjunto, não por viagem.
- Antes da oferta, validar motorista/conjunto, disponibilidade, capacidade, documentos/CNH, condição do conjunto e conflitos com outras operações.
- Motorista recebe oferta e pode aceitar ou recusar no portal.
- O aceite do motorista não ativa sozinho a escala: fica aguardando confirmação administrativa.
- Após confirmação administrativa, participação fica ativa e integra histórico.
- Ao retornar, liberar o conjunto para nova escala.
- Não permitir editar/remanejar uma convocação depois do aceite; estados pendentes/recusados/expirados podem ser gerenciados conforme regra do módulo.
- Convocação automática deve mostrar quem foi chamado e o estado da resposta. A regra conversada prevê lembretes a cada 30 minutos e expiração após 2 horas sem resposta, com reposicionamento ao fim da fila. A execução real de gatilhos e entrega de mensagens precisa ser homologada; não considerar ativa apenas por existir código.
- Confirmação/recusa em um canal deve encerrar a oferta para os demais canais, sem duplicar respostas.

### 2.4 Centro de Operações e movimentações
**Arquivos:** `CentroOperacoesFullTime.gs`, `Code.gs`, `MvpDestinosFullTime.gs`, `Index.html`.

O Centro deve apresentar, por operação:
- volume contratado/previsto;
- toneladas efetivamente movimentadas/carregadas;
- saldo restante;
- destinos, volumes previstos, entregues e saldos por destino;
- viagens previstas e realizadas, quando houver previsão;
- motoristas/conjuntos vinculados e viagens/toneladas por motorista;
- status, progresso e alertas que exijam conferência.

**Regra de balança:** peso real pode ficar abaixo ou acima do estimado. Registrar o valor efetivamente pesado e sinalizar divergência para conferência humana. Não bloquear uma viagem/entrega apenas por diferença de pesagem ou por exceder a estimativa do destino. Preservar o registro real, saldo recalculado e trilha de auditoria.

### 2.5 Comprovantes de viagem
**Arquivos:** `RecibosViagemFullTime.gs`, `WhatsAppTickets.gs`, `Index.html`.

- Captura de foto no painel e recebimento de mídia por WhatsApp são canais previstos.
- Arquivo é armazenado em pasta privada do Drive e relacionado a operação, participação, motorista e destino.
- Guia `TICKETS` usa cabeçalhos nomeados; migração é aditiva e não deve reordenar nem apagar colunas existentes.
- Estados iniciais de conferência: `AGUARDANDO_CONFERENCIA`.
- OCR/leitura automática e validação contábil não fazem parte da etapa atual. Não prometer extração automática de valores até existir implementação e teste específico.
- Limite e formatos aceitos devem ser validados no backend antes do envio.

### 2.6 Cadastros, frota e documentos
**Arquivos:** `CadastroMotoristasFullTime.gs`, `Code.gs`, `Index.html`.

- Cadastros de motoristas, cavalos mecânicos, carretas e conjuntos.
- Validar CPF duplicado/inválido, placas duplicadas, CNH/categoria/validade, capacidades e vínculos.
- Cadastro novo pode ficar `PENDENTE_REVISAO` até aprovação administrativa.
- Documentos associados a entidades devem ter validade e alertas de vencimento.
- Preservar os cadastros fictícios de homologação existentes até terminar os testes; não reconstruir ou limpar a base sem plano específico e backup validado.

### 2.7 Segurança, auditoria e encerramento
- Ações administrativas devem exigir sessão/autorização e gerar auditoria.
- Cancelamento e reabertura exigem justificativa e preservam histórico.
- Encerramento deve conferir participações pendentes/ativas, viagens e saldo; divergência ou saldo residual precisa permanecer explícito.
- Não armazenar segredos no código ou em logs. Gemini usa Script Properties.
- Base de autenticação não deve ser apagada pela preparação/reconstrução operacional.

## 3. Estado confirmado da homologação até 2026-11-24

| Etapa | Evidência | Estado |
|---|---|---|
| Preparação de `DESTINOS_OPERACAO` | Log `FT_MVP_PREPARACAO_DESTINOS`: ok=true; guia existente; 13 colunas; `ID_DESTINO` acrescentado | **Aprovado** |
| Preparação de `TICKETS` e pasta Drive | Log `FT_RECIBOS_PREPARACAO`: ok=true; guia TICKETS; 29 colunas; pasta “FULL TIME — Recibos de Viagem”; propriedade configurada | **Aprovado para preparação** |
| Auditoria somente leitura de TICKETS e acesso Drive | Função `testarEstruturaRecibosViagemFullTime()` disponível em `RecibosViagemFullTime.gs`; ainda aguarda log do usuário | **Pendente** |
| Teste real de foto/associação operação-participação-destino | Depende da auditoria estrutural e de dados fictícios válidos | **Não iniciado** |
| Testes funcionais da entrada IA → revisão → aprovação → geração | Há checklist em `docs/TESTES.md`; não há evidência de conclusão nesta rodada | **Pendente de homologação** |
| Convocação, resposta do motorista e confirmação administrativa ponta a ponta | Código e regras existem; faltam evidências atuais de ponta a ponta | **Pendente de homologação** |
| Centro de Operações com dados reais de movimentação | Funções e cálculos presentes; validar os indicadores e a apresentação no Apps Script | **Pendente de homologação** |

Os estados acima distinguem preparação estrutural de validação funcional. Um log de criação/preparação não prova que o fluxo completo está funcionando.

## 4. Sequência de testes — um por vez

**Próximo teste autorizado: auditoria somente leitura da estrutura de comprovantes.**

- Arquivo: `RecibosViagemFullTime.gs`
- Função: `testarEstruturaRecibosViagemFullTime()`
- Local: editor do Apps Script, seletor de funções, executar.
- Segurança: somente leitura; não cria guias/pastas, não altera cabeçalhos e não grava linhas.
- Resultado esperado: log `FT_TESTE_ESTRUTURA_RECIBOS` com `ok:true`, `cabecalhosAusentes:[]`, `duplicados:[]`, `cabecalhosVazios:[]` e `pastaDriveAcessivel:true`.
- Só depois de 100% aprovado avançar para envio de uma foto fictícia.

Depois dos comprovantes, seguir sem pular etapas:
1. teste de cálculos do Centro de Operações (incluindo peso abaixo/acima do previsto);
2. teste de conexão Gemini;
3. solicitação fictícia ponta a ponta: entrada → IA → revisão → pendências → aprovação → geração idempotente da operação;
4. cadastro manual sem IA e destinos múltiplos;
5. registro de entrega com pesagem divergente, conferindo saldos e alertas;
6. convocação automática → oferta → aceite/recusa → confirmação administrativa → execução → retorno;
7. regressão de cadastros, documentos, login, auditoria e operações legadas sem destinos.

Não executar o próximo item enquanto o atual não estiver comprovado por log/resultado.

## 5. Divergências e decisões técnicas a resolver antes da liberação

- O contrato de `OPERACOES` precisa incluir `MOTORISTAS_NECESSARIOS`; o módulo de destinos já acrescenta essa coluna aditivamente se ausente.
- O endpoint legado `salvarOperacaoFullTime()` em `Code.gs` ainda exige destino simples e viagens previstas maiores que zero. A interface atual usa `salvarOperacaoComDestinosFullTime()`; manter o endpoint legado somente para compatibilidade, mas impedir que volte a ser usado por formulários novos sem adaptar suas regras.
- A tela de cadastro manual ainda solicita carga estimada por viagem para calcular a previsão. A entrada via IA não deve exigir esse dado nem quantidade prevista de viagens.
- O contrato de cabeçalhos de TICKETS tem 18 campos canônicos, enquanto a guia existente possui 29 colunas. Preservar as 29 colunas; verificar duplicidades e ausências antes de gravar.
- O lembrete de 30 minutos, expiração de 2 horas, gatilhos e entrega de WhatsApp/e-mail precisam de teste de execução real. Não presumir que gatilho está instalado.
- A sincronização WhatsApp/e-mail/painel deve ser idempotente: uma resposta final em qualquer canal fecha a mesma oferta.
- OCR de comprovantes está explicitamente fora do escopo entregue nesta etapa.

## 6. Arquivos de referência

- Arquitetura e fontes de dados: `docs/ARQUITETURA.md`
- Contrato de cabeçalhos: `docs/CONTRATO_CANONICO_CABECALHOS.md`
- Checklist de homologação: `docs/TESTES.md`
- Regras de escala: `docs/REGRAS_ESCALA_JUSTA.md`
- Integração WhatsApp/tickets: `docs/AUTOMACAO_TICKETS_WHATSAPP.md`
- Segurança: `docs/SEGURANCA.md`
