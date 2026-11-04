# Roadmap — Full Time Transporte

## Etapa 1 — Estabilização da base e cadastros
- Corrigir mapeamento dos IDs externos da planilha do Bruno.
- Validar reconciliação de motoristas, cavalos, carretas e conjuntos.
- Consolidar vínculo vigente motorista–cavalo–carretas.
- Preservar histórico de alterações de vínculo.
- Corrigir telas administrativas e remover designação manual como fluxo normal.

## Etapa 2 — Operações e cargas
- Consolidar diferença entre operação, carga e viagem.
- Validar origem, destino, data/hora, volume, quantidade e requisitos de frota.
- Estabelecer estados e transições válidas.
- Validar regras de saldo e conclusão.

## Etapa 3 — Motor de escala automática
- Formalizar regras de elegibilidade e prioridade com a Full Time.
- Considerar disponibilidade diária, documentação, veículo, capacidade e conflitos.
- Distribuir cargas automaticamente e de forma auditável.
- Garantir idempotência, locks e proteção contra dupla alocação.
- Construir testes determinísticos e simulações fictícias.

## Etapa 4 — Área do motorista
- Criar autenticação segura e acesso individual.
- Permitir somente confirmação de disponibilidade para o próximo dia.
- Implementar janela de habilitação após confirmação do horário com Bruno.
- Não permitir que o motorista escolha ou monte a própria escala.

## Etapa 5 — Execução, comunicação e acompanhamento
- Atualizar estados da viagem e horários reais.
- Tratar atrasos, cancelamentos, substituições e exceções.
- Definir notificações e eventual integração WhatsApp após validar provedor e credenciais.

## Etapa 6 — Relatórios e produção
- Relatórios operacionais e financeiros.
- Indicadores de distribuição e equilíbrio.
- Revisão de segurança, LGPD, backup, restauração e desempenho.
- Homologação com o cliente antes de operação real.

## Decisões pendentes com o cliente
- Horário de abertura e encerramento da habilitação diária.
- Critérios de prioridade e equilíbrio da escala.
- Regras para motorista habilitado sem vínculo disponível.
- Restrições de jornada, descanso e conflitos entre operações.
- Tratamento de recusas, faltas, atrasos e substituições.
