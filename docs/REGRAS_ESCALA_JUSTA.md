# Especificação operacional — escala justa da Full Time

## Decisões confirmadas pelo Bruno
1. Cada motorista usa sempre o mesmo cavalo mecânico e as carretas ficam fixas no conjunto.
2. Um motorista não utiliza o conjunto de outro por conta própria. Substituição por ausência exige autorização do gestor e registro de auditoria.
3. A fila considera o tempo desde a entrada do motorista na fila.
4. A distribuição combina assiduidade e quantidade de viagens; o valor do frete não é critério de prioridade.
5. Não existem reservas fixas por cliente, rota ou tipo de carga.
6. O gestor pode alterar a ordem por necessidade operacional, com justificativa obrigatória e registro da ordem original, escolhido, autor, data/hora e motivo (“preferência no trabalho”).
7. O motorista escolhido é associado automaticamente ao seu conjunto fixo.
8. Troca de motorista/conjunto depois da confirmação exige autorização do gestor.
9. Há uma confirmação diária de disponibilidade. Enviar lembretes às 06:00, 12:00 e 18:00; esses horários são lembretes, não três confirmações obrigatórias.
10. O motorista pode informar imprevisto após confirmar disponibilidade. Isso gera evento de assiduidade.
11. O gestor pode bloquear motorista ou veículo por manutenção, documentação ou outro impedimento.
12. Se o veículo/conjunto estiver indisponível, o motorista não pode receber carga.
13. Não é necessária uma confirmação mecânica separada pelo motorista.
14. A recusa ou indisponibilidade depois de selecionado faz o motorista perder a vez **somente na carga atual**. Não altera permanentemente a posição de fila nem cria penalidade automática para cargas futuras. O evento e o motivo devem ser registrados.
15. Em cada dia, motoristas aptos que ainda não receberam carga têm prioridade sobre os que já receberam uma ou mais cargas nesse dia. Entre motoristas no mesmo grupo, considerar a combinação de assiduidade, menor número de viagens e maior tempo de espera.
16. O equilíbrio de viagens usa uma janela móvel dos últimos 30 dias.

## Algoritmo de distribuição
Para cada carga:
1. Filtrar motoristas ativos/aprovados, com habilitação adequada e válida, disponibilidade confirmada na data, conjunto fixo ativo, sem bloqueio e sem conflito de horário.
2. Considerar apenas o conjunto fixo associado ao motorista. Substituição temporária só pode ocorrer após autorização explícita do gestor e registro auditável.
3. Primeiro separar os elegíveis em dois grupos: (a) zero cargas atribuídas no dia; (b) uma ou mais cargas atribuídas no dia. O grupo (a) vem primeiro.
4. Dentro de cada grupo, ordenar pela combinação de:
   - assiduidade observada em janela móvel de 30 dias (dias com disponibilidade confirmada e dias efetivamente trabalhados, mantendo os dois componentes identificáveis);
   - menor número de viagens concluídas nos últimos 30 dias;
   - maior tempo desde a entrada na fila;
   - data/hora da última carga atribuída como desempate;
   - nome/ID para resultado determinístico.
5. Não usar valor do frete para pontuar prioridade. A fórmula/pesos numéricos da combinação de assiduidade ainda devem ser calibrados com o gestor antes de influenciar uma escala real; até lá, não inventar pontuação nem usá-la para sobrepor regras explícitas.
6. Recusa/indisponibilidade: marcar o motorista como não elegível apenas para a carga em questão e tentar o próximo elegível. Registrar recusa/indisponibilidade, motivo e autor. Não rebaixar a posição global da fila por esse evento.
7. Oferta não equivale a escala confirmada. Registrar aceite/recusa/expiração; após confirmação do gestor, associar carga, motorista e conjunto e prevenir conflitos.
8. O gestor pode sobrescrever a ordem por urgência, com justificativa obrigatória e trilha de auditoria.
9. Se não houver elegíveis ou ninguém aceitar no prazo configurado, alertar a administração.

## Dados e automações
- As guias `DISPONIBILIDADE_DIARIA`, `FILA_MOTORISTAS`, `OFERTAS_CARGAS` e `EVENTOS_ESCALA` guardam a estrutura de dados para disponibilidade, fila, ofertas e auditoria.
- A confirmação diária deve ser idempotente: uma confirmação por motorista/data; lembretes às 06:00, 12:00 e 18:00 apenas para quem ainda não confirmou.
- A contagem de cargas no dia e de viagens nos últimos 30 dias deve derivar dos registros operacionais confirmados, não de valores digitados manualmente sem validação.
- O projeto precisa definir fuso horário da planilha/projeto e configurar gatilhos de lembrete. Nenhum gatilho deve ser considerado ativo apenas por existir nesta especificação.
- O prazo de aceite/expiração da oferta ainda precisa ser configurado pelo gestor.

## Situação de implementação
- A especificação acima registra as decisões provisórias solicitadas.
- Foram adicionadas funções auxiliares determinísticas em `Code.gs` para classificar elegibilidade por carga atual, priorizar quem ainda não recebeu carga no dia, contar viagens numa janela móvel de 30 dias e produzir a ordem-base sem pontuação inventada de assiduidade.
- Essas funções são auxiliares e ainda precisam ser integradas ao fluxo de criação/atribuição de escalas, interface administrativa, autenticação do motorista, auditoria de ponta a ponta e gatilhos de lembrete. Não significa que o sistema esteja implantado nem validado em produção.
- A fórmula/pesos de assiduidade, prazo de aceite e fuso/gatilhos precisam ser confirmados antes da ativação operacional.

## Segurança
O portal do motorista precisa de autenticação própria e autorização no servidor. Não basta esconder menus administrativos. Não expor endpoints de disponibilidade/oferta ao motorista até que autenticação, autorização por identidade e validação server-side estejam implementadas.
