# FullTime-Transporte — Controle de projeto e homologação

**Data de abertura:** 05/11/2026  
**Meta:** 18/11/2026 — sistema homologado e pronto para liberação controlada  
**Capacidade planejada:** 8 horas por dia, inclusive finais de semana  
**Janela estimada:** aproximadamente 105 horas úteis de trabalho, considerando início parcial em 05/11 e 8 horas/dia de 06 a 18/11.

> Este documento é o controle de execução. Atualizar status, evidências, horas consumidas e bloqueios ao final de cada sessão. “Concluído” exige evidência/teste; código existente ou guia criada não contam, isoladamente, como funcionalidade concluída.

## 1. Painel executivo

| Indicador | Situação |
|---|---|
| Meta de entrega | 18/11/2026 |
| Resultado esperado | Homologado e pronto para liberação controlada |
| Horas planejadas | 105 h |
| Horas registradas | 0 h registradas neste controle |
| Etapa atual | 1 — Consolidação da arquitetura |
| Estado geral | Em diagnóstico; não liberar para produção |
| Dados reais | Preservar; usar massa fictícia até aprovação dos testes |
| Planilhas | Bruno = origem dos cadastros/entrada; sistema Full Time = base operacional e destino da replicação |

## 2. Plano de trabalho e orçamento de horas

| Etapa | Janela | Horas | Entrega verificável | Status |
|---|---:|---:|---|---|
| 1. Consolidar arquitetura e versão-base | 05–07/11 | 10 h | Fluxos, fontes oficiais, contratos de dados, conflitos e estratégia de integração documentados | EM ANDAMENTO |
| 2. Cadastros, vínculos e sincronização | 07–08/11 | 12 h | Sincronização unidirecional idempotente Bruno → sistema, vínculos e capacidades conferidos | NÃO INICIADA |
| 3. Entrada assistida por IA | 08–10/11 | 14 h | Mensagem fictícia → interpretação → revisão → confirmação → replicação sem duplicidade | NÃO INICIADA |
| 4. Motor de escala automática | 10–13/11 | 22 h | Elegibilidade, prioridade, fila, operação distinta, associação do conjunto e auditoria | NÃO INICIADA |
| 5. Ofertas, painel e notificações | 13–14/11 | 12 h | Ciclo de oferta/aceite/recusa/expiração, visão administrativa e avisos essenciais | NÃO INICIADA |
| 6. Testes integrados e segurança | 14–16/11 | 16 h | Testes ponta a ponta, permissões, idempotência, concorrência, recuperação e evidências | NÃO INICIADA |
| 7. Reserva para correções | 16–17/11 | 11 h | Correções de bloqueios encontrados na homologação | RESERVA |
| 8. Liberação controlada | 18/11 | 8 h | Checklist aprovado, backup, versão identificada e liberação com acompanhamento | NÃO INICIADA |
| **Total** | **05–18/11** | **105 h** | | |

## 3. Arquitetura-alvo acordada

1. **Planilha do Bruno:** origem oficial dos cadastros de motoristas, cavalos, carretas e respectivos vínculos; também recebe a entrada de operações quando confirmada.
2. **Planilha principal Full Time:** base operacional do sistema. Recebe a replicação da planilha do Bruno e mantém os registros operacionais necessários.
3. **Sincronização:** sentido Bruno → Full Time, idempotente por identificador estável. Não criar guias ou fluxos paralelos sem necessidade aprovada.
4. **Entrada de operações:** o Bruno poderá colar a mensagem recebida no WhatsApp pessoal em uma tela do sistema. A IA interpreta; o responsável revisa e confirma. A solicitação recebe um ID único e não pode gerar duas operações por reenvio.
5. **WhatsApp:** a entrada por copiar/colar é o caminho previsto para a primeira liberação. Integração automática com a conta pessoal não está presumida nem incluída sem provedor, autorização e desenho técnico.
6. **Escala:** distribuição pelo sistema, por operação distinta (não por volta), respeitando motorista e conjunto fixos, disponibilidade, elegibilidade, fila, recusas restritas à operação atual e auditoria.
7. **Segurança:** autenticação e autorização verificadas no servidor; dados fictícios durante testes; dados reais só após backup, validação e autorização operacional.

## 4. Levantamento técnico inicial — 05/11

| Item | Evidência encontrada | Impacto / ação |
|---|---|---|
| Documentação da `main` | README e docs ainda descrevem partes do MVP administrativo, embora o código já contenha operações, frota, vínculos e funções auxiliares de escala | Atualizar documentação depois de fechar os contratos reais |
| Função duplicada | `salvarConjuntoVeicularFullTime` existe em `Code.gs` e `CadastroMotoristasFullTime.gs` na `main` | Resolver colisão antes de consolidar; PR #1 remove a cópia de Cadastro |
| Leitura de cadastros | `listarRegistros_` combina algumas fontes para motoristas/conjuntos, mas cavalos e carretas são lidos pelo espelho Bruno | Definir fonte de verdade e política única de merge/status |
| Contadores | `contarAtivos_` e `contarStatus_` leem espelhos diretamente e podem divergir das listas que aplicam overrides | Unificar consultas e indicadores |
| PR #1 — entrada IA | Aberto; GitHub retornou `mergeable=false`. Prevê colagem manual, interpretação opcional Gemini, revisão, confirmação na planilha Bruno e replicação para o sistema | Resolver conflitos e testar em ambiente fictício antes de integrar |
| PR #4 — vínculos/escala | Aberto; GitHub retornou `mergeable=true`. Corrige aliases e interface, mas declara que o motor completo ainda precisa ser implementado | Avaliar como mudança preparatória; não confundir com escala automática concluída |
| WhatsApp | O arquivo `WhatsAppTickets.gs` trata tickets; isso não comprova integração automática das mensagens de operação | Manter a entrada manual assistida como escopo seguro do MVP |
| Escala | Há funções auxiliares de ordenação/contagem, mas a existência delas não comprova ciclo integrado de disponibilidade, oferta, aceite e gravação automática | Implementar e testar o fluxo completo |

**Nota de integridade:** esta é uma leitura estática do repositório GitHub. Não comprova o estado atual das planilhas, dos gatilhos instalados nem da implantação ativa do Apps Script.

## 5. Critérios de aceite por módulo

### Cadastros e sincronização
- [ ] Bruno é a única origem de cadastro de motorista/cavalo/carreta/vínculo.
- [ ] Cada registro possui ID estável e não duplica após sincronizações repetidas.
- [ ] Alterações e inativações são refletidas corretamente no sistema.
- [ ] Capacidade útil do conjunto é calculada/validada sem confundir tara, lotação, PBTC e peso da operação.
- [ ] Contadores e listagens apresentam os mesmos totais e status.
- [ ] Não há reutilização indevida de cavalo/carreta em conjuntos ativos.

### Entrada assistida por IA
- [ ] Aceita mensagens fictícias em formatos variados e abreviados.
- [ ] Campos extraídos são apresentados para revisão; incertezas não são inventadas.
- [ ] Campos essenciais ausentes geram pergunta ou pendência clara.
- [ ] A confirmação gera um ID único e uma única operação.
- [ ] A gravação ocorre primeiro na planilha Bruno e replica para a principal.
- [ ] Reenvio da mesma solicitação não duplica operação/carga.
- [ ] Mensagem original e resultado interpretado ficam auditáveis.

### Escala automática
- [ ] Elegibilidade considera status, habilitação/documentos, disponibilidade, bloqueios, conflito e conjunto fixo.
- [ ] Prioriza quem ainda não recebeu operação naquele dia.
- [ ] Equilíbrio usa operações distintas na janela móvel de 30 dias, nunca cada volta como operação.
- [ ] Recusa/indisponibilidade tira a vez apenas da operação atual.
- [ ] Oferta, aceite, recusa, expiração e reoferta têm estados persistidos.
- [ ] A atribuição é idempotente e protegida contra concorrência.
- [ ] Exceção manual do gestor exige justificativa e auditoria.
- [ ] As voltas herdam a operação e a atribuição já confirmada.

### Segurança e liberação
- [ ] Autenticação/autorização verificadas no backend em todas as ações sensíveis.
- [ ] Motorista não acessa dados de outros motoristas nem ações administrativas.
- [ ] Planilhas e documentos com dados pessoais têm acesso restrito.
- [ ] Backup e procedimento de restauração verificados.
- [ ] Testes integrados e evidências registrados.
- [ ] Implantação publicada corresponde ao commit/versão homologada.
- [ ] Liberação controlada tem responsável, janela e plano de retorno.

## 6. Bloqueios e decisões pendentes

| ID | Bloqueio/decisão | Responsável | Prazo-alvo | Estado |
|---|---|---|---|---|
| B01 | Resolver conflito do PR #1 e definir sequência de integração com PR #4 | Desenvolvimento | 07/11 | ABERTO |
| B02 | Fechar contrato de cabeçalhos/IDs entre planilha Bruno e planilha principal | Desenvolvimento | 07/11 | ABERTO |
| B03 | Confirmar fórmula/pesos de assiduidade sem inventar critérios | Bruno/gestão + desenvolvimento | Antes da homologação da escala | PENDENTE |
| B04 | Confirmar prazo de aceite/expiração de oferta | Bruno/gestão | Antes do teste de ofertas | PENDENTE |
| B05 | Confirmar fuso horário e gatilhos de lembrete (06h, 12h, 18h) | Desenvolvimento + gestão | Antes dos testes agendados | PENDENTE |
| B06 | Definir canal de envio de notificações e credenciais, se necessário | Bruno/gestão | Antes da etapa 5 | PENDENTE |

## 7. Registro de execução

| Data | Horas trabalhadas | Entrega/evidência | Bloqueios | Próxima ação |
|---|---:|---|---|---|
| 05/11 | Em andamento | Leitura inicial da main, arquitetura, roadmap, regras e PRs #1/#4; identificados conflitos e divergências | PR #1 não integrável no estado atual; contratos precisam ser consolidados | Comparar mudanças dos PRs e fechar mapa de fontes/cabeçalhos |

## 8. Regras de atualização deste controle

- Atualizar horas reais ao final de cada sessão; não contar estimativa como hora executada.
- Alterar para **CONCLUÍDO** somente com teste/evidência anexável.
- Registrar toda alteração de escopo e o impacto em horas/prazo.
- Se um bloqueio consumir a reserva, renegociar escopo antes de comprometer a data.
- A meta de 18/11 é homologação e liberação controlada, não promessa de operação crítica sem acompanhamento.
