# FullTime — cenários de aceite do MVP operacional

**Data:** 2026-11-10  
**Status:** casos definidos; ainda não executados

## Massa fictícia padrão
- Empresa Alfa e Empresa Beta (tenants separados).
- Operação OP-ALFA-001 com clientes fictícios Cliente A e Cliente B.
- Lote A: origem Porto X, destino Cidade Y, 600 t, 10 vagas ofertadas.
- Lote B: origem Porto X, destino Cidade Z, 240 t, 4 vagas ofertadas.
- Conjuntos: capacidades úteis de 30 t, 25 t, 20 t e 15 t.
- Motoristas e placas totalmente fictícios.
- Início da operação: data/hora fixa de teste, sem depender do relógio real.

## Casos funcionais

| ID | Cenário | Resultado esperado |
|---|---|---|
| OP-001 | Criar operação com dois clientes | Operação guarda os dois clientes sem duplicar operação |
| OP-002 | Criar dois lotes para clientes distintos | Cada lote mantém seu cliente, destino, volume e vagas |
| OP-003 | Cliente sem lote | Bloquear publicação da escala ou exigir lote, conforme regra final |
| OP-004 | Lote com mínimo/máximo não atendido | Impedir aprovação e explicar divergência |
| ES-001 | Sugerir viagens com capacidades diferentes | Distribuição respeita capacidade de cada conjunto e volume |
| ES-002 | Editar manualmente metas | Aceitar se totais e capacidades forem válidos; registrar auditoria |
| ES-003 | Redistribuir viagens de motorista indisponível | Redistribuir saldo sem duplicar ou perder viagens |
| ES-004 | Transferir motorista entre lotes | Encerrar vínculo anterior e criar novo histórico |
| ES-005 | Motorista em duas operações simultâneas | Bloquear segunda designação |
| ES-006 | Incluir motorista após início | Permitir com autorização e recalcular saldo pendente |
| FL-001 | Registrar chegada de motorista | Registrar timestamp real e ordenar por chegada |
| FL-002 | Liberar primeiro grupo | Somente responsável autorizado pode liberar |
| FL-003 | Antes de completar seis horas | Grupo restante permanece bloqueado, salvo override auditado |
| FL-004 | Completar seis horas desde início | Tornar elegível a liberação do grupo restante |
| VI-001 | Tentar concluir sem descarga | Bloquear conclusão |
| VI-002 | Confirmar descarga e ticket | Concluir viagem, registrar peso real e evidência |
| VI-003 | Peso real variável por viagem | Aceitar valor dentro das regras de capacidade/saldo |
| VI-004 | Iniciar nova viagem sem retorno à origem | Bloquear |
| VI-005 | Lote concluído com outro pendente | Permitir concluir lote sem fechar operação |
| VI-006 | Encerrar operação com lote pendente | Permitir apenas com decisão explícita e registrar pendência |
| OF-001 | Motorista recusa convite | Marcar recusa e convidar próximo elegível conforme regra |
| OF-002 | Convite expira | Marcar expirado e seguir regra de reposição |
| OF-003 | Motorista desiste após aceitar | Executar fluxo ainda pendente de definição |
| EV-001 | Atraso ou falha mecânica | Registrar evento, responsável e consequência |
| EV-002 | Alterar escala confirmada | Somente responsável autorizado, com histórico |

## Casos de segurança multiempresa

| ID | Tentativa | Resultado esperado |
|---|---|---|
| TEN-001 | Usuário Alfa consulta operação Beta pelo ID | Nenhum dado de Beta retornado |
| TEN-002 | Usuário Alfa altera lote Beta por ID conhecido | Negar sem modificar Beta |
| TEN-003 | Usuário Alfa solicita documento Beta | Negar/ausência de recurso |
| TEN-004 | Usuário Alfa exporta relatório Beta | Nenhuma linha de Beta |
| TEN-005 | Sessão expirada ou revogada | Negar leitura e escrita |
| TEN-006 | Payload troca tenantId no navegador | Backend ignora/rejeita tenant não autorizado |
| TEN-007 | Usuário com acesso a duas empresas troca contexto | Validar membership a cada contexto |
| TEN-008 | Execução sem tenant no contexto | Falhar fechado; não retornar dados globais |

## Regras de execução
- Fixtures 100% fictícias e determinísticas.
- Não apontar testes para planilhas reais.
- Notificações, WhatsApp, e-mail, armazenamento e OCR simulados.
- Cada caso deve registrar resultado, evidência e versão testada.
- Casos dependentes de resposta pendente ficam marcados como BLOQUEADOS_POR_REGRA, não como aprovados.
- Nenhum teste foi executado por este documento; é uma especificação de aceite.
