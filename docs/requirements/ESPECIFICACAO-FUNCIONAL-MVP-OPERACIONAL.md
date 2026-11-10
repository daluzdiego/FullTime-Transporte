# FullTime — Especificação funcional do MVP operacional

**Versão:** 1.0  
**Data:** 2026-11-10  
**Fonte principal:** respostas do responsável operacional ao questionário de 65 perguntas  
**Status:** baseline parcial; pendências explicitamente preservadas  
**Ambiente:** MVP no sistema atual (Google Apps Script + Google Sheets), com dados fictícios e sem serviços pagos

## 1. Objetivo e decisão de produto

Evoluir o FullTime existente para validar o ciclo operacional de transporte portuário, sem criar uma aplicação paralela e sem descartar a base atual.

O MVP será desenvolvido no repositório e na aplicação Apps Script existentes. A arquitetura deve evitar acoplamento desnecessário para permitir evolução futura para uma plataforma multiempresa. A aprovação do MVP no Apps Script não obriga que essa seja a infraestrutura definitiva.

**Regra financeira:** desenvolvimento e homologação exclusivamente gratuitos. Não ativar billing, cadastrar cartão, contratar serviços ou executar integrações tarifadas. Usar somente dados fictícios. Nenhuma planilha real será limpa, migrada ou alterada sem autorização específica.

## 2. Vocabulário do domínio

- **Operação:** demanda de transporte solicitada por um cliente ou conjunto de clientes, com origem, destino(s), produto/serviço, volume, período e capacidade operacional.
- **Cliente participante:** empresa cuja demanda/vagas compõem a operação.
- **Lote:** parcela operacional atribuída a um cliente participante, com destino, produto, quantidade, vagas/motoristas previstas e regras próprias quando aplicável.
- **Vaga:** posição/capacidade de atendimento disponibilizada pelo operador portuário a um cliente. A quantidade de vagas por cliente é informada previamente.
- **Participação:** vínculo de um motorista/conjunto com uma operação e, quando aplicável, com um lote.
- **Viagem:** ciclo individual de transporte, iniciado na origem e concluído somente após descarga confirmada; o retorno à origem é necessário antes de nova viagem do mesmo conjunto.
- **Conjunto:** motorista + cavalo + composição de carreta(s) aprovada.

Não criar entidades separadas chamadas CAMINHÕES ou CARGAS. O transporte será representado por operações, lotes, participações e viagens; os veículos permanecem modelados como CAVALOS, CARRETAS e CONJUNTOS.

## 3. Requisitos confirmados

### 3.1 Criação da operação
1. A operação é solicitada por um cliente.
2. Uma operação pode envolver vários clientes.
3. Cada cliente participante pode ter um ou mais lotes.
4. Os lotes podem representar clientes, destinos, produtos, quantidades e outras diferenças operacionais.
5. Para iniciar a escala, devem existir pelo menos cliente(s), origem, destino e quantidade/volume.
6. O operador portuário oferta quantidade de vagas por cliente; essa quantidade deve ser registrada.
7. Os lotes podem funcionar simultaneamente.

### 3.2 Motoristas e lotes
1. Um lote pode ter vários motoristas simultaneamente.
2. Um motorista pode participar de mais de um lote da mesma operação.
3. É permitido transferir motorista entre lotes durante a operação, mantendo histórico.
4. Existe mínimo e máximo de motoristas por lote, definidos previamente; os valores ainda precisam ser informados.
5. A quantidade de motoristas é definida antes da escala, não calculada livremente pelo sistema.

### 3.3 Distribuição de viagens
1. O sistema deve sugerir distribuição de viagens.
2. O responsável pode alterar manualmente a distribuição.
3. Se um motorista não concluir a meta, as viagens restantes podem ser redistribuídas entre os demais.
4. É permitido incluir motoristas depois do início.
5. Não foi informado limite de viagens por motorista, turno ou dia.
6. A distribuição deve respeitar volume total, capacidade individual dos conjuntos e pesos reais variáveis por viagem.
7. Conjuntos podem ter capacidades diferentes.
8. O motorista precisa retornar à origem antes de iniciar a próxima viagem.

**Regra de cálculo a implementar:** não dividir simplesmente o volume pelo número de caminhões. Calcular a capacidade/viagens mínimas por conjunto, distribuir uma meta sugerida e permitir ajuste manual com validação de fechamento do volume e das viagens. A fórmula de balanceamento e o tratamento de sobra serão validados em testes.

### 3.4 Fila e liberação
1. Não existe fila numerada fixa.
2. A ordem é por chegada efetiva.
3. Não há horário individual de apresentação definido.
4. A operação inicia com um grupo reduzido; o restante é liberado após seis horas contadas do início da operação.
5. O responsável controla a liberação.
6. Motorista pode chegar e aguardar autorização para carregar.
7. Existem horários em que entrada/carregamento não podem ocorrer, mas as janelas/restrições ainda precisam ser informadas.

A liberação após seis horas deve ser configurável por operação/lote, não codificada como regra universal sem confirmação de que vale para todos os terminais.

### 3.5 Viagem e evidências
1. Viagem concluída significa descarga confirmada.
2. O motorista informa início e conclusão.
3. O motorista envia fotos dos tickets de carregamento e descarga.
4. O responsável acompanha e trata atrasos, cancelamentos, falhas mecânicas e viagens não realizadas diretamente.
5. O operador portuário avisa quando um lote terminou.
6. A operação pode ser encerrada mesmo com lote pendente, mediante decisão do responsável; o sistema deve preservar claramente o estado dos lotes pendentes.

O MVP deve manter registro por viagem, evidências de carregamento e descarga, horários, peso previsto/real, motorista, conjunto, origem/destino, status e histórico de eventos. Os campos finais dependem da resposta à pergunta 53.

### 3.6 Conjuntos e elegibilidade
1. A aptidão exige checklist do caminhão e do motorista aprovado.
2. A escala considera motorista e conjunto completo.
3. Algumas operações exigem tipos/capacidades específicas de veículos.
4. Motorista ou conjunto não pode estar escalado em duas operações no mesmo período.
5. O responsável escolhe substitutos.
6. A disponibilidade deve ser explícita e auditável; o critério operacional de indisponibilidade ainda está pendente.

### 3.7 Convites e governança
1. O responsável aprova a operação antes dos convites.
2. Motoristas podem aceitar ou recusar individualmente.
3. Recusa deve disparar convite ao próximo candidato elegível, conforme regra de seleção aprovada.
4. Convite possui prazo de resposta, ainda não informado.
5. Motorista pode desistir após aceitar; procedimento ainda pendente.
6. O responsável aprova a escala final.
7. Somente o responsável altera escala confirmada, até que a matriz de usuários/permissões seja definida.

### 3.8 Comunicação
O canal de convite e atualização ainda não foi escolhido. O MVP deve manter uma camada de notificações desacoplada, com adaptador simulado nos testes gratuitos. Não enviar WhatsApp/e-mail real nesta fase.

## 4. Requisitos derivados que precisam de validação

Os itens abaixo são propostas técnicas, não respostas confirmadas:
- Uma operação deve possuir identificador próprio e poder agrupar clientes participantes e lotes.
- Cada lote deve ter cliente, origem, destino, produto/serviço, volume/quantidade, vagas ofertadas, mínimo/máximo de motoristas, janela operacional e status.
- Participações devem referenciar operação e lote; transferências devem encerrar a participação anterior e criar nova participação, sem apagar histórico.
- O sistema deve impedir sobreposição temporal de motorista e conjunto em operações diferentes.
- A escala deve ter estados de rascunho, aguardando aprovação, aprovada e publicada.
- Convites devem ter estados pendente, aceito, recusado, expirado e cancelado, com prazo configurável.
- O encerramento de lote deve ser independente do encerramento da operação.
- Fotos/tickets devem ser associados à viagem e ao tipo de evidência.
- Toda alteração de escala, redistribuição, liberação e encerramento deve gerar evento de auditoria.

## 5. Lacunas e decisões pendentes

| Pergunta | Situação | Informação necessária |
|---|---|---|
| 3 | Não compreendida | O que identifica a operação: navio, contrato, período, serviço, cliente ou combinação? |
| 11 | Parcial | Mínimo e máximo de motoristas por lote |
| 28 | Pendente | Regra de reorganização em atraso |
| 34 | Parcial | Restrições por produto, cliente, terminal ou local |
| 41 | Pendente | Como marcar motorista/conjunto indisponível e quem atualiza |
| 47 | Pendente | Prazo de resposta do convite |
| 48 | Parcial | Fluxo quando motorista desiste após aceitar |
| 53 | Pendente | Campos obrigatórios por viagem |
| 57 | Pendente | Relatórios necessários |
| 58–61 | Pendente | Usuários, permissões, canais e alertas |
| 62–65 | Pendente | Operação exemplo, escala existente, caso problemático e três maiores dores |

Não preencher lacunas por inferência. Regras pendentes devem aparecer como configuração não definida e não podem ser tratadas como homologadas.

## 6. Divergências com a implementação atual

A auditoria estática da versão atual identificou:
1. `OPERACOES` guarda um único `CLIENTE_ID`; ainda não representa vários clientes por operação.
2. Não foi identificada entidade/guia de lotes vinculada à operação.
3. `PARTICIPACAO_OPERACOES` vincula operação e conjunto, mas não possui `LOTE_ID`.
4. A função de cadastro atual exige cliente único, origem/destino e volume total.
5. O atual modelo de conclusão registra descarga/estado e peso, mas a evidência documental deve ser validada ponta a ponta.
6. A regra de seis horas e a liberação por grupo ainda não aparecem como regra configurável claramente identificada na estrutura auditada.
7. A sessão e os repositórios ainda usam base global; não existe isolamento multiempresa comprovado.

Essas diferenças exigem evolução do modelo antes de afirmar que o MVP cobre os requisitos de operação multi-cliente/lotes.

## 7. Escopo do MVP

### Incluído
- Criar operação com um ou vários clientes participantes.
- Criar lotes vinculados à operação e ao cliente.
- Registrar vagas ofertadas por lote/cliente.
- Definir motoristas mínimos/máximos e quantidade planejada por lote.
- Associar motorista e conjunto à operação/lote.
- Sugerir e editar distribuição de viagens considerando capacidade diferente.
- Registrar ordem real de chegada e liberação manual.
- Configurar liberação do grupo restante após intervalo de seis horas, com horário de início registrado.
- Controlar ciclo de viagem, retorno à origem e conclusão após descarga.
- Anexar/registrar tickets de carregamento e descarga.
- Registrar redistribuição, troca, recusa, atraso, indisponibilidade e encerramento parcial.
- Relatórios básicos por operação, lote, motorista, conjunto e período, sujeitos à confirmação das perguntas 57–61.
- Testes automatizados com duas empresas e massa fictícia.

### Fora do primeiro corte
- Integração WhatsApp real.
- OCR/IA externa para ler tickets.
- Geolocalização e roteirização paga.
- Cobrança real e faturamento automático.
- Migração para infraestrutura paga.
- Regras específicas de terminal ainda não confirmadas.

## 8. Critérios de aceite do MVP
1. Uma operação pode conter ao menos dois clientes e múltiplos lotes.
2. Cada lote mantém cliente, destino, volume e vagas independentes.
3. Um motorista pode atuar em lotes diferentes da mesma operação com histórico íntegro.
4. Transferir motorista não apaga a participação anterior.
5. A sugestão de viagens respeita capacidade de cada conjunto e fecha os totais sem exceder volume.
6. Ajustes manuais são validados e auditados.
7. Um motorista/conjunto não pode ter conflito de escala em operações sobrepostas.
8. A ordem de chegada é registrada por timestamp, sem inventar fila numérica.
9. O responsável libera manualmente e o sistema controla o marco de seis horas a partir do início da operação.
10. Uma viagem só fica concluída após confirmação da descarga e registro da evidência exigida.
11. A conclusão de lote não obriga automaticamente a conclusão da operação.
12. Todos os testes usam dados fictícios e não geram chamadas externas pagas.
13. Testes de isolamento entre duas empresas não permitem leitura ou alteração cruzada.
14. Pendências operacionais não são apresentadas como regras confirmadas.

## 9. Sequência de implementação
1. Consolidar o modelo de operação multi-cliente e lotes.
2. Implementar validações de motoristas/conjuntos e conflitos de agenda.
3. Implementar cálculo sugerido e edição de distribuição.
4. Implementar fila por chegada e liberação escalonada.
5. Fechar ciclo da viagem, retorno e evidências.
6. Implementar convites e notificações simuladas.
7. Implementar relatórios e homologação ponta a ponta.

## 10. Segurança de alteração
Antes de qualquer script de migração em planilha:
- fazer cópia/backup;
- gerar prévia das guias/colunas que serão criadas;
- não renomear ou excluir colunas existentes automaticamente;
- preservar todas as linhas;
- exigir confirmação explícita;
- testar em cópia fictícia primeiro.

**Status final:** especificação aprovada como baseline de desenvolvimento, não como homologação das regras ainda pendentes.
