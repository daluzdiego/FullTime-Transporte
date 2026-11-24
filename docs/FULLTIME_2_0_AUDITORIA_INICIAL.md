# FullTime 2.0 — Relatório de auditoria inicial

**Data:** 2026-11-05  
**Branch de trabalho:** `fulltime-2.0`  
**Escopo executado:** leitura do repositório GitHub nas branches `main` e `feat/agente-ia-entrada-operacoes`. Nenhuma planilha foi modificada.

## 1. Resultado executivo

O projeto não deve ser reescrito do zero. Há uma base administrativa, cadastros de frota, operações, escala e uma primeira entrada assistida de operações por IA. Entretanto, a branch de IA e a `main` divergiram e não podem ser unidas por merge integral sem conciliação.

A estrutura de viagens ainda é baseada em lançamentos manuais de toneladas e sinalizador de viagem concluída. O modelo de comprovantes já aparece parcialmente na estrutura `TICKETS`, mas não está conectado ao ciclo completo de viagem nem ao WhatsApp.

## 2. Comparação das branches

Comparação GitHub:
- Base: `main`, commit `b6dfc5338a003aaafa4aadbc61ef90972ef81103`.
- Branch: `feat/agente-ia-entrada-operacoes`.
- Resultado: divergentes.
- Branch de IA: 70 commits à frente.
- `main`: 10 commits à frente.
- Merge-base: `c8a2b3e2631713f40c5edda694505d9ebbf02e21`.

Diferenças funcionais observadas:
- A branch de IA contém funções de entrada por texto, extração via Gemini (quando configurado), rascunho, validação, perguntas pendentes, confirmação e sincronização Bruno → FullTime.
- A branch de IA também contém funções de homologação/capacidade sintética e auditoria de integridade.
- A `main` contém funções de controle de status que não aparecem na branch de IA: `ftGetStatusControlSheet_`, `ftSaveStatusOverride_` e `ftReadStatusOverrides_`.
- As interfaces diferem: a branch de IA acrescenta navegação para entrada IA, escalas e localização; a `main` mantém navegação mais simples.
- A branch de IA não deve ser promovida integralmente à produção sem recuperar/conferir os recursos exclusivos da `main`.

## 3. Inventário funcional encontrado no código

| Domínio | Situação observada | Avaliação |
|---|---|---|
| Login e sessão administrativa | Implementado em Apps Script | Manter e revisar segurança |
| Motoristas e caminhões | CRUD/importação e validações | Manter; reconciliar com cadastros Bruno |
| Cavalos, carretas e conjuntos | Estrutura de cadastro e associação | Manter; validar integridade e permissões |
| Operações | Cadastro com cliente, rota, volume, cargas previstas e saldo | Evoluir |
| Participação de conjuntos | Designação, saída, remanejamento e retorno | Manter como base; reforçar regras |
| Escala | Disponibilidade, fila, ofertas e eventos | Existe estrutura; validar fluxo ponta a ponta |
| Entrada de operações IA | Texto colado, Gemini opcional, perguntas pendentes e confirmação | Aproveitável como protótipo do agente de cliente |
| Movimentações | Lançamento manual de toneladas e flag de conclusão | Insuficiente para ciclo automático |
| Comprovantes | Guia `TICKETS` prevista com IDs de mídia, Drive e estado OCR | Estrutura inicial; processamento não conectado |
| WhatsApp | Campos de mensagem e mídia preparados em parte | Não integrado |
| Auditoria | Logs administrativos e script de integridade | Ampliar para eventos automatizados e documentos |

## 4. Problemas e riscos técnicos prioritários

### P0 — Corrigir antes de ativar operação real

1. **Contagem de viagens sem entidade de viagem:** `MOVIMENTACOES_OPERACAO` registra uma movimentação, mas não modela um ciclo individual com identificador próprio, número sequencial, etapas e comprovantes vinculados.
2. **Carregamento e descarga:** o sistema ainda não distingue adequadamente dois comprovantes de um mesmo ciclo. É necessário evitar que os dois eventos sejam contados como duas viagens ou que o peso seja subtraído duas vezes.
3. **Alocação de volume por conjunto:** `OPERACOES` armazena volume total e cargas previstas, mas a estrutura não explicita o volume planejado por conjunto. Sem isso, não há base confiável para exibir `CARGA 6/10` por conjunto quando há vários conjuntos na operação.
4. **Idempotência de movimentação:** o registro atual cria novo UUID a cada chamada; não há chave de evento externo ou regra robusta de deduplicação de recibos.
5. **Origem da tonelagem:** a atualização de saldo é disparada por entrada manual. A regra definitiva precisa ser baseada em peso validado e em um evento de negócio único.

### P1 — Necessário para automação confiável

6. **Vínculo remetente → motorista/cliente:** preparar cadastro de telefones autorizados, múltiplos contatos por cliente e validação de identidade do remetente.
7. **Fila de exceções:** criar estados e fila para documento ilegível, operação ambígua, peso divergente, ticket duplicado e dados conflitantes.
8. **Auditoria automatizada:** registrar mensagem original, extração, versão do modelo, campos confirmados/corrigidos, usuário ou agente e resultado de validação.
9. **Agente cliente:** a entrada por texto colado é um bom protótipo, mas ainda não representa conversa persistente, múltiplas mensagens, áudio/anexos ou confirmação contextual.
10. **Concorrência:** revisar operações simultâneas, locks e atualizações de planilha para impedir perda de atualizações e saldos inconsistentes.

### P2 — Robustez e experiência

11. Modernizar a tela Operações após fechar os estados e entidades de dados.
12. Substituir `prompt()`/`confirm()` nativos por modais consistentes.
13. Criar observabilidade, alertas de falha, reprocessamento seguro e rotina de recuperação.
14. Definir política de retenção e acesso aos comprovantes e dados pessoais.

## 5. Modelo operacional recomendado

A entidade central deve ser **VIAGEM** (ou ciclo de transporte), ligada a uma operação e a uma alocação de conjunto.

Cada alocação deve conter:
- operação;
- conjunto;
- motorista vigente;
- volume planejado;
- capacidade útil validada;
- viagens previstas calculadas;
- início/fim da participação.

Cada viagem deve conter:
- ID imutável;
- operação e alocação;
- sequência dentro do conjunto na operação;
- estado atual;
- peso de referência e peso confirmado;
- datas/horas de carregamento, saída, chegada e descarga;
- comprovantes vinculados.

Cada comprovante deve ser um documento-evento:
- tipo: CARREGAMENTO ou DESCARGA;
- arquivo original obrigatório;
- remetente e canal;
- ticket, emissor, data/hora;
- peso bruto, tara e líquido, se existentes;
- extração e confiança por campo;
- estado de validação;
- chave de idempotência.

**Regra de contagem proposta:** a viagem só incrementa o contador de viagens concluídas quando a etapa de conclusão definida pela operação for satisfeita (normalmente descarga validada). O comprovante de carregamento muda a viagem para carregada/em trânsito; o de descarga fecha o ciclo. A tonelagem é contabilizada uma única vez conforme regra de negócio aprovada.

**CARGA 6/10:** o denominador deve ser calculado para cada conjunto a partir do volume alocado a ele dividido pela capacidade útil válida, arredondando para cima. Se o volume não foi alocado, o sistema não deve inventar uma divisão entre conjuntos.

## 6. Arquitetura-alvo em evolução

- Interface web: operação administrativa e painéis.
- Apps Script: compatibilidade e lógica existente durante a transição.
- Serviço backend dedicado (ex.: Cloud Run): futuro webhook, processamento assíncrono, mídia e integrações.
- IA/OCR: extração estruturada; não tem autoridade para gravar diretamente.
- Motor determinístico: validações, autorização, idempotência e transições de estado.
- Persistência: manter Sheets no estágio atual enquanto a concorrência/volume forem baixos e testados; avaliar banco transacional antes da operação crítica em escala.
- Armazenamento privado: documentos originais com controle de acesso e retenção.

## 7. Restrições respeitadas

- Não houve escrita em planilhas.
- Nenhuma operação de leitura, escrita, formatação ou sincronização foi feita na guia `CAVALOS-BRUNO`.
- Não houve merge de branches.
- Não houve promoção de código à `main`.
- A branch `fulltime-2.0` permanece separada.

## 8. Auditoria estrutural das planilhas — pendente de execução

O conector disponível nesta sessão permite consultar o repositório GitHub, mas não oferece leitura direta das planilhas Google. Para não inventar cabeçalhos ou contagens, foi criado o script:

`AuditoriaEstruturalFullTime2.gs`

Ele lê somente os cabeçalhos, dimensões e metadados das guias explicitamente permitidas nas duas planilhas. Não lê linhas de dados. Na planilha do Bruno, não enumera todas as guias e não procura nem acessa `CAVALOS-BRUNO`.

Após executar `auditarEstruturaFullTime2()` no projeto Apps Script principal e fornecer o JSON do log, será possível fechar a matriz real de guias, cabeçalhos, contagens e divergências.

## 9. Próxima sequência de trabalho

1. Executar a auditoria estrutural somente leitura.
2. Comparar os cabeçalhos reais com os contratos definidos no código.
3. Fazer conciliação seletiva das funções exclusivas de cada branch.
4. Aprovar o modelo de alocação e viagem.
5. Implementar o núcleo de viagens e comprovantes com testes fictícios.
6. Implementar os agentes cliente/motorista sem WhatsApp.
7. Homologar ponta a ponta.
8. Conectar WhatsApp apenas ao final.
