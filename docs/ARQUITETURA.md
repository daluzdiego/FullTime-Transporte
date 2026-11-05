# Arquitetura — Full Time Transporte

## Objetivo
O sistema recebe operações, mantém cadastros e vínculos veiculares, identifica motoristas elegíveis segundo as políticas gerais e específicas de cada cliente e oferece cada operação individualmente aos motoristas, seguindo uma fila geral. O primeiro motorista que aceitar confirma automaticamente a escala. O administrador configura, acompanha e trata exceções; não escolhe manualmente o motorista no fluxo normal.

## Regras operacionais aprovadas
1. Uma oferta fica disponível ao motorista por **2 horas**, contadas a partir do envio efetivo da oferta.
2. Se não houver resposta dentro do prazo, a oferta expira e o sistema avança automaticamente para o próximo motorista elegível.
3. Se o motorista recusar, sua posição vai para o final da fila geral.
4. A fila é geral, mas a elegibilidade e a ordenação devem respeitar prioridades e requisitos específicos do cliente e da operação.
5. Quando o motorista aceita, a escala é confirmada automaticamente.
6. A aceitação deve ser atômica: somente uma oferta pode vencer para a mesma vaga/operação; ofertas concorrentes devem ser encerradas ou invalidadas de forma consistente.
7. Toda oferta, resposta, expiração, avanço de fila e confirmação deve permanecer auditável.

## Componentes
- `Code.gs`: autenticação, autorização, validação, persistência, adaptador da planilha de origem, políticas, fila, ofertas, escala e auditoria.
- `Index.html`: interface administrativa e portal autenticado do motorista.
- Planilha operacional: cadastros e dados da operação.
- Planilha de origem do Bruno: fonte dos cadastros sincronizados, sem duplicar guias desnecessariamente.
- Integração WhatsApp (fase posterior): entrega do aviso com link seguro para a oferta; o canal de comunicação não será responsável pela decisão nem pela integridade da fila.

## Modelo conceitual
### Motorista
Cadastro, telefone validado, credenciais de acesso, status operacional, habilitação documental e identificador externo estável. O motorista acessa apenas suas próprias ofertas e pode aceitar ou recusar dentro do prazo.

### Veículos
Cavalo mecânico e carretas com placa, situação, capacidade e documentação. Capacidade útil não deve ser calculada por soma nominal sem validar limites legais e operacionais do conjunto.

### Vínculo veicular
Associação vigente entre motorista e cavalo mecânico, com carretas opcionais. O vínculo é configurado no cadastro, não na tela de escala. Toda troca deve preservar um retrato dos veículos utilizados em cada escala histórica.

### Operação e carga
A operação contém, no mínimo, cliente, origem, destino e quantidade. Também deve conter os dados necessários à execução, como data, horário, tipo de operação, peso por carga e requisitos. É necessário manter clara a diferença entre operação, carga/vaga e viagem realizada. O sistema deve saber quantas vagas precisam ser preenchidas e impedir que uma operação seja considerada concluída antes disso.

### Políticas do cliente
Regras configuráveis por cliente e, quando aplicável, por operação: tipos de conjunto permitidos, documentação exigida, capacidade, categoria de CNH, restrições de local/operação, prioridades e demais critérios confirmados pela empresa. Critérios não definidos não podem ser inventados pelo motor.

### Fila geral
A fila é única, com posição e histórico por motorista. Para cada operação, o motor percorre a fila e filtra os motoristas que atendem aos requisitos do cliente e da operação. Recusa ou expiração move o motorista para o final da fila, respeitando as regras de elegibilidade. A regra exata de desempate e eventual tratamento de ofertas simultâneas precisa ser documentada antes da produção.

### Oferta de operação
Cada oferta deve registrar pelo menos: ID, operação/vaga, motorista, posição na fila no momento da oferta, conjunto/vínculo considerado, criada/enviada em, expira em, status, respondida em, resposta e motivo de recusa. Estados mínimos: PENDENTE_ENVIO, ENVIADA, ENTREGUE (quando o provedor informar), ACEITA, RECUSADA, EXPIRADA, CANCELADA e FALHA_ENVIO. O status de entrega é informativo; a resposta do motorista é a decisão operacional.

### Escala automática
O motor deve:
1. identificar a vaga/operação que precisa de motorista;
2. percorrer a fila geral e selecionar o primeiro motorista elegível para aquela operação;
3. resolver o vínculo veicular vigente;
4. validar motorista, cavalo, carretas, documentos, capacidade, restrições e conflitos;
5. criar uma oferta individual com prazo de duas horas;
6. ao receber ACEITA, confirmar a escala automaticamente e reservar motorista/veículos;
7. ao receber RECUSADA ou ao expirar, registrar o evento, mover o motorista para o final da fila e ofertar ao próximo elegível;
8. encerrar a busca quando a vaga for preenchida ou quando não houver candidatos elegíveis, sinalizando o administrador;
9. gravar snapshot de motorista e placas/IDs dos veículos na escala;
10. impedir dupla alocação incompatível de motorista ou veículo, inclusive em execuções simultâneas;
11. registrar motivo da seleção e motivos de inelegibilidade;
12. manter auditoria sem apagar ofertas ou escalas históricas.

### Portal do motorista
O motorista recebe um link seguro, autentica-se e visualiza os detalhes da oferta destinada a ele. Pode aceitar ou recusar até a expiração. Não escolhe carga, não altera a fila e não acessa dados de outros motoristas. Credenciais e senhas nunca devem ser enviadas em texto aberto pelo WhatsApp.

### Notificações
Na fase de integração, o WhatsApp enviará aviso de nova oferta com link seguro. A oferta e o prazo devem existir no sistema antes do envio. Falha no WhatsApp não pode apagar a oferta nem corromper a fila; deve gerar estado de falha e permitir reenvio/contingência administrativa.

## Integração Bruno → sistema
O adaptador lê por cabeçalho normalizado. IDs externos de motorista, cavalo e carretas devem mapear para os campos internos equivalentes. Placas e CPF/nome podem ajudar no diagnóstico, nunca substituir silenciosamente um ID ambíguo. Registros sem correspondência devem ficar pendentes de revisão.

## Estado de implementação
Há estruturas e funções de operações, candidatos, participações e histórico, mas isso não equivale ao fluxo de oferta e aceite automático. A geração automática, fila, expiração de duas horas, portal do motorista, proteção contra concorrência e integração WhatsApp ainda precisam ser implementados e testados de ponta a ponta. A disponibilidade diária do motorista não será tratada como confirmação prévia obrigatória; impedimentos e indisponibilidades deverão ser mantidos por controles administrativos e políticas operacionais.

## Limitações e segurança
Google Sheets e Apps Script têm cotas e limites de concorrência. O fluxo de aceite, expiração e avanço de fila precisa usar bloqueio transacional (LockService) e revalidar a vaga e os recursos no momento da confirmação. Antes de operação crítica, realizar testes simultâneos, revisar autenticação, recuperação de conta, backup, restauração, LGPD e observabilidade.
