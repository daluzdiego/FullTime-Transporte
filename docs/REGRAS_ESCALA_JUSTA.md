# Especificação operacional — escala justa da Full Time

## Decisões confirmadas pelo Bruno
1. Cada motorista usa sempre o mesmo cavalo mecânico e as carretas ficam fixas no conjunto.
2. Um motorista não utiliza o conjunto de outro por conta própria. Substituição por ausência exige registro e autorização do gestor.
3. A ordem base considera o tempo desde que o motorista entrou na fila.
4. Se dois motoristas forem aptos, priorizar quem está há mais tempo aguardando, e usar quantidade de viagens para equilibrar oportunidades. Não comparar apenas valor do frete.
5. Não existem reservas fixas por cliente, rota ou tipo de carga.
6. O gestor pode alterar a ordem por necessidade operacional; deve registrar o motivo, que Bruno chamou de “preferência no trabalho”.
7. O motorista selecionado fica automaticamente associado ao conjunto fixo dele.
8. Troca após confirmação requer autorização do gestor.
9. Disponibilidade precisa ser confirmada diariamente. Os horários citados foram 06:00, 12:00 e 18:00; confirmar se são três confirmações por dia ou janelas de lembrete/check-in.
10. O motorista pode registrar imprevisto depois de confirmar disponibilidade. Isso afeta a assiduidade.
11. O gestor pode bloquear motorista ou veículo por manutenção, documentação ou outro impedimento.
12. Se o veículo estiver indisponível, o motorista fica indisponível para a escala.
13. O motorista não precisa confirmar separadamente as condições mecânicas do veículo.
14. O gestor pode alterar a fila por urgência, registrando a justificativa.

## Algoritmo de distribuição proposto
Para cada carga:
1. Filtrar motoristas ativos e aprovados, com CNH válida para a operação, disponibilidade confirmada no dia, veículo e conjunto ativos, sem bloqueio e sem conflito de horário.
2. Considerar apenas o conjunto fixo associado ao motorista. Substituição temporária só entra após autorização administrativa explícita e registro.
3. Ordenar os elegíveis por:
   - primeiro: menor número de viagens concluídas no período de equilíbrio configurado;
   - segundo: maior tempo desde a entrada na fila;
   - terceiro: data/hora da última carga atribuída, para desempate;
   - quarto: nome/ID, para resultado determinístico.
4. O gestor pode sobrescrever a ordem, exigindo justificativa obrigatória. Guardar ordem original, escolhido, autor, data/hora e justificativa.
5. A oferta não equivale a escala confirmada. Registrar aceite/recusa/expiração. Após a confirmação do gestor, associar carga, motorista e conjunto e impedir conflitos.
6. Se não houver elegíveis ou ninguém aceitar dentro do prazo configurado, alertar a administração.

## Regras de assiduidade e exceções
- Confirmação de disponibilidade e mudança para indisponível devem ter timestamp e autor.
- Uma indisponibilidade inesperada após confirmação deve gerar evento de assiduidade, mas a penalidade quantitativa não deve ser inventada: o gestor precisa definir se haverá perda de posição por uma carga, por um período ou reinserção ao final da fila.
- Recusar uma carga específica também foi indicado como perda de prioridade, mas a duração e a forma exata ainda precisam ser definidas antes de automatizar penalidade.
- Registrar todos os eventos de fila, oferta, recusa, indisponibilidade, override e troca de motorista/veículo.

## Pontos ainda sem decisão
1. O que acontece com a prioridade após recusar uma carga: vai para o fim da fila apenas para essa carga, perde a vez até receber uma carga, ou fica penalizado por um período?
2. Como quantificar assiduidade: dias disponíveis confirmados, dias efetivamente trabalhados, ou combinação? A resposta ainda não foi dada.
3. Quando há mais de uma carga no mesmo dia, um motorista que já trabalhou pode receber outra antes de motoristas aptos sem viagem naquele dia? As duas perguntas sobre essa regra ficaram sem resposta.
4. 06:00, 12:00 e 18:00 são três check-ins obrigatórios, três janelas de lembrete, ou horários de corte para tipos diferentes de disponibilidade?
5. Definir prazo de aceite de uma oferta e prazo de expiração.
6. Definir o período usado para contar viagens: dia, semana, mês ou janela móvel.

## Segurança
O portal de motorista precisa ter autenticação própria e autorização no servidor. Não basta esconder os menus administrativos. Até o portal de motorista e os métodos server-side estarem prontos, não publicar endpoints de disponibilidade/oferta como se fossem acessíveis com segurança.
