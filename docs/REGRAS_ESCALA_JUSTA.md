# Especificação operacional — escala justa da Full Time

## Decisões confirmadas pelo Bruno
1. Cada motorista usa sempre o mesmo cavalo mecânico e as carretas ficam fixas no conjunto.
2. Um motorista não utiliza o conjunto de outro por conta própria. Substituição por ausência exige autorização do gestor e registro de auditoria.
3. A fila considera o tempo desde a entrada do motorista na fila.
4. A distribuição deve ser equilibrada por operação, não por carga individual nem por volta. Uma operação (por exemplo, atendimento a um navio) pode gerar de 1 a 30 voltas para o mesmo caminhoneiro; essas voltas não contam como oportunidades independentes de escala. O valor do frete não é critério de prioridade.
5. Não existem reservas fixas por cliente, rota ou tipo de carga.
6. O gestor pode alterar a ordem por necessidade operacional, com justificativa obrigatória e registro da ordem original, escolhido, autor, data/hora e motivo (“preferência no trabalho”).
7. O motorista escolhido é associado automaticamente ao seu conjunto fixo.
8. Troca de motorista/conjunto depois da confirmação exige autorização do gestor.
9. Há uma confirmação diária de disponibilidade. Enviar lembretes às 06:00, 12:00 e 18:00; esses horários são lembretes, não três confirmações obrigatórias.
10. O motorista pode informar imprevisto após confirmar disponibilidade. Isso gera evento de assiduidade.
11. O gestor pode bloquear motorista ou veículo por manutenção, documentação ou outro impedimento.
12. Se o veículo/conjunto estiver indisponível, o motorista não pode receber carga.
13. Não é necessária uma confirmação mecânica separada pelo motorista.
14. A recusa ou indisponibilidade depois de selecionado faz o motorista perder a vez **somente na operação atual**. Não altera permanentemente a posição de fila nem cria penalidade automática para operações futuras. O evento e o motivo devem ser registrados.
15. Em cada dia, motoristas aptos que ainda não receberam uma operação têm prioridade sobre os que já receberam uma ou mais operações nesse dia. As voltas de uma mesma operação não contam como novas operações. Entre motoristas no mesmo grupo, considerar a combinação de assiduidade, menor número de operações e maior tempo de espera.
16. O equilíbrio de oportunidades usa uma janela móvel dos últimos 30 dias, contando operações distintas, não voltas/cargas individuais.

## Algoritmo de distribuição
Para cada operação (que pode conter várias voltas/cargas individuais):
1. Filtrar motoristas ativos/aprovados, com habilitação adequada e válida, disponibilidade confirmada na data, conjunto fixo ativo, sem bloqueio e sem conflito de horário.
2. Considerar apenas o conjunto fixo associado ao motorista. Substituição temporária só pode ocorrer após autorização explícita do gestor e registro auditável.
3. Primeiro separar os elegíveis em dois grupos: (a) zero operações atribuídas no dia; (b) uma ou mais operações atribuídas no dia. O grupo (a) vem primeiro. As voltas de uma mesma operação permanecem vinculadas à operação e não disparam uma nova distribuição de prioridade.
4. Dentro de cada grupo, ordenar pela combinação de:
   - assiduidade observada em janela móvel de 30 dias (dias com disponibilidade confirmada e dias efetivamente trabalhados, mantendo os dois componentes identificáveis);
   - menor número de operações distintas nos últimos 30 dias;
   - maior tempo desde a entrada na fila;
   - data/hora da última carga atribuída como desempate;
   - nome/ID para resultado determinístico.
5. Não usar valor do frete para pontuar prioridade. A fórmula/pesos numéricos da combinação de assiduidade ainda devem ser calibrados com o gestor antes de influenciar uma escala real; até lá, não inventar pontuação nem usá-la para sobrepor regras explícitas.
6. Recusa/indisponibilidade: marcar o motorista como não elegível apenas para a operação em questão e tentar o próximo elegível. Registrar recusa/indisponibilidade, motivo e autor. Não rebaixar a posição global da fila por esse evento.
7. Oferta não equivale a operação confirmada. Registrar aceite/recusa/expiração; após confirmação do gestor, associar operação, motorista e conjunto. As voltas subsequentes dessa mesma operação herdam essa associação, salvo substituição autorizada pelo gestor.
8. O gestor pode sobrescrever a ordem por urgência, com justificativa obrigatória e trilha de auditoria.
9. Se não houver elegíveis ou ninguém aceitar no prazo configurado, alertar a administração.

## Dados e automações
- As guias `DISPONIBILIDADE_DIARIA`, `FILA_MOTORISTAS`, `OFERTAS_CARGAS` e `EVENTOS_ESCALA` guardam a estrutura de dados para disponibilidade, fila, ofertas e auditoria.
- A confirmação diária deve ser idempotente: uma confirmação por motorista/data; lembretes às 06:00, 12:00 e 18:00 apenas para quem ainda não confirmou.
- A contagem de operações distintas no dia e nos últimos 30 dias deve derivar dos registros confirmados, usando um identificador estável de operação. Nunca contar cada volta como nova operação.
- O projeto precisa definir fuso horário da planilha/projeto e configurar gatilhos de lembrete. Nenhum gatilho deve ser considerado ativo apenas por existir nesta especificação.
- O prazo de aceite/expiração da oferta ainda precisa ser configurado pelo gestor.

## Situação de implementação
- A especificação acima registra as decisões provisórias solicitadas.
- Foram adicionadas funções auxiliares determinísticas em `Code.gs` para classificar elegibilidade por carga atual, priorizar quem ainda não recebeu carga no dia, contar operações distintas numa janela móvel de 30 dias e produzir a ordem-base sem pontuação inventada de assiduidade.
- Essas funções são auxiliares e ainda precisam ser integradas ao fluxo de criação/atribuição de escalas, interface administrativa, autenticação do motorista, auditoria de ponta a ponta e gatilhos de lembrete. Não significa que o sistema esteja implantado nem validado em produção.
- A fórmula/pesos de assiduidade, prazo de aceite e fuso/gatilhos precisam ser confirmados antes da ativação operacional.

## Segurança
O portal do motorista precisa de autenticação própria e autorização no servidor. Não basta esconder menus administrativos. Não expor endpoints de disponibilidade/oferta ao motorista até que autenticação, autorização por identidade e validação server-side estejam implementadas.


## Esclarecimento operacional recebido em 27/10/2026
Bruno esclareceu que, em uma operação de navio, o caminhoneiro pode realizar de 1 a 30 voltas. A unidade de distribuição e de justiça é a **operação**, não cada carga/volta. Uma operação deve ter um identificador próprio e pode agrupar várias voltas; a atribuição do motorista/conjunto ocorre no nível da operação e é herdada pelas voltas. A escala só deve abrir nova decisão de distribuição quando houver uma nova operação, e não a cada volta.
