# FullTime — Transporte e Consultoria

Aplicação web para gestão de operações de transporte, frota, motoristas, escala e execução individual de viagens.

## Modelo de negócio

- **CLIENTES** e **LOCAIS** são cadastros mestres reutilizáveis.\n- **OPERAÇÃO** é a unidade de planejamento e controle: cliente vinculado, serviço, locais de origem/destino, volume, prazo, janela, prioridade e total previsto de viagens.
- **PARTICIPAÇÃO_OPERACOES** liga uma operação ao motorista e ao conjunto veicular designados. Cada participação guarda a meta de viagens e toneladas daquele motorista.
- **VIAGENS** são execuções individuais, cada uma com ID, sequência, motorista, conjunto, peso, horários, estado e observações.
- **EVENTOS_VIAGEM** registra cada marco operacional com data/hora, responsável e origem do registro.
- **DOCUMENTOS_VIAGEM** e **TICKETS** guardam evidências e comprovantes vinculados à execução.
- Frota canônica: **MOTORISTAS**, **CAVALOS**, **CARRETAS** e **CONJUNTOS**.

Não existem módulos operacionais independentes chamados `CAMINHOES` ou `CARGAS`. As antigas guias, quando existentes, são legado preservado e não fazem parte do fluxo ativo.

## Regras essenciais

- A soma das viagens previstas nas participações ativas deve ser igual ao total previsto da operação.
- A soma dos volumes atribuídos às participações deve fechar o volume planejado da operação.
- A quantidade mínima de viagens por participação é calculada por `ceil(volume atribuído / capacidade útil aprovada do conjunto)`.
- Capacidade útil não é PBTC.
- Motorista e conjunto não podem executar viagens simultâneas.
- Viagens concluídas não são apagadas; correções exigem trilha de auditoria.
- Solicitações multicanal só viram operações depois de revisão e aprovação explícita.
- A IA não pode preencher lacunas por suposição: campos ambíguos ou ausentes ficam pendentes.
- A planilha do Bruno é interface de integração do cliente; a base nativa FullTime é a fonte de verdade.

## Tecnologia

- Google Apps Script como backend e aplicação web.
- Google Sheets como persistência inicial.
- HTML, CSS e JavaScript no frontend.

## Arquivos principais

- `Code.gs`: autenticação, cadastros, planejamento, escala e ciclo de vida de viagens.
- `Index.html`: interface administrativa, solicitações, frota, operações e viagens.
- `SolicitacoesFullTime.gs`: recebimento, revisão, aprovação e conversão de solicitação em operação.
- `InterpretacaoSolicitacoesFullTime.gs`: interpretação assistida por IA; não aprova nem cria operação automaticamente.
- `WhatsAppTickets.gs`: recebimento e retenção de evidências do WhatsApp.
- `IntegracaoDriveCliente.gs`: integração com ambiente Drive do cliente.
- `docs/FULLTIME_MODELO_OPERACIONAL_OPERACOES_VIAGENS.md`: contrato funcional e relacional do modelo de operação e viagem.
- `docs/FULLTIME_PLANO_MASSA_FICTICIA_TESTES_CARGA.md`: plano de geração de massa sintética e teste de desempenho.\n- `docs/FULLTIME_CONTINUIDADE_TECNICA_2026-11-06.md`: registro das correções, commits, validações pendentes e próximas etapas.

## Estado de implementação

A branch contém a transição inicial para o modelo OPERAÇÃO → PARTICIPAÇÃO → VIAGEM, com schemas e endpoints de início, eventos e conclusão de viagens, além de validações de distribuição de metas. Ainda requer revisão estática integral, testes automatizados no Apps Script, conexão das telas do portal do motorista, revisão de integrações e homologação controlada. Não considerar pronta para operação crítica nem implantada até concluir esses passos.

## Segurança e migração

- Nenhuma limpeza de dados reais foi executada.
- Guias legadas não são apagadas automaticamente.
- Não executar rotinas antigas de geração de dados no Drive do Bruno.
- A guia protegida `CAVALOS-BRUNO` permanece estritamente fora de leitura, enumeração, escrita e limpeza.
- Migrações de cabeçalhos são prévia-first e não devem ser executadas sem backup, revisão e autorização explícita.

## Instalação e implantação

Consulte os documentos de instalação, segurança e homologação antes de publicar. Alterações no GitHub não significam implantação automática no Apps Script.
