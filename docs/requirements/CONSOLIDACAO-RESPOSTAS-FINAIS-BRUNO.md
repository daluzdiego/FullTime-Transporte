# FullTime — consolidação complementar de requisitos (respostas finais de Bruno)

**Data:** 2026-11-10  
**Status:** respostas confirmadas para orientar o MVP; implementação ainda precisa de testes e homologação.

## Decisões confirmadas

1. **Identidade da operação:** cada operação terá nome próprio e será especificada com suas particularidades. O sistema não deve exigir um conjunto universal e rígido de atributos operacionais.
2. **Motoristas por lote:** a quantidade depende da operação. Pode haver todos os motoristas envolvidos na mesma operação; as particularidades devem ser configuráveis por operação.
3. **Convite sem resposta:** prazo de 2 horas. Sem resposta, convite expira e o sistema convida automaticamente outro motorista elegível.
4. **Desistência após aceite:** o sistema seleciona automaticamente o próximo motorista elegível, seguindo uma ordem definida pelo sistema.
5. **Indisponibilidade:** Bruno ou equipe administrativa registram indisponibilidade de motorista, cavalo ou carreta no sistema.
6. **Atrasos:** o sistema sugere reorganização da fila e das viagens; a sugestão depende de aprovação administrativa antes de ser aplicada.

## Regras derivadas para implementação

- Particularidades devem ser armazenadas como configuração estruturada por operação, preservando nome e campos próprios. Não criar campos obrigatórios universais sem necessidade.
- Não impor limite fixo global de motoristas por lote. Cada operação define sua quantidade planejada e suas regras.
- Um motorista pode participar simultaneamente de lotes diferentes da mesma operação. A mesma participação duplicada no mesmo lote deve ser impedida.
- Conflitos de motorista/conjunto em operações diferentes com períodos sobrepostos devem ser detectados.
- O prazo de convite é calculado a partir do instante de envio: `enviado_em + 2 horas`.
- O sistema deve manter uma política explícita e auditável de ordenação de candidatos. Até a política ser validada, o motor recebe a lista já ordenada; não inventar critérios silenciosamente.
- Recusa, expiração e desistência após aceite acionam seleção do próximo elegível, desde que esteja disponível e não tenha convite ativo.
- A indisponibilidade é registrada por usuário administrativo, com recurso, período, motivo e autor.
- Replanejamento é apenas uma sugestão até aprovação; rejeição não altera escala nem viagens.
- A sugestão de redistribuição considera volume e capacidade e não deve criar, concluir ou transferir viagens automaticamente.

## Pontos que permanecem configuráveis/para homologação

- Campos específicos de cada tipo de operação e validações correspondentes.
- Ordem exata de elegibilidade dos motoristas.
- Canais concretos de envio de convite e comportamento de contingência.
- Campos obrigatórios de tickets/viagens e catálogo de relatórios/alertas.
- Regras de janelas proibidas, restrições por produto/local e critérios completos de indisponibilidade.
- A distribuição sugerida deverá ser validada com exemplos reais anonimizados ou dados fictícios aprovados antes de produção.

## Limite de escopo e segurança

- Desenvolvimento e testes somente com dados fictícios e ferramentas gratuitas.
- Nenhum serviço pago, faturamento, API paga ou integração real de mensagens será ativado antes da homologação e autorização explícita.
- Nenhuma planilha real será limpa, migrada ou alterada nesta etapa.
- Esta consolidação não declara a aplicação homologada nem a integração de produção concluída.
