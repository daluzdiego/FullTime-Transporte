# Checklist de testes — MVP

Executar com dados fictícios, em implantação de teste, antes de cadastrar dados reais.

## Bootstrap e login

- [ ] Executar `configurarSistemaFullTime()` uma única vez.
- [ ] Confirmar URL da planilha e criação das cinco abas.
- [ ] Confirmar que Diego e Bruno constam em `USUARIOS` com papel `ADMIN`.
- [ ] Entrar com cada senha temporária e trocar por uma senha pessoal.
- [ ] Confirmar que a senha anterior não funciona após a troca.
- [ ] Testar senha errada e usuário desconhecido.
- [ ] Encerrar sessão e confirmar retorno ao login.
- [ ] Confirmar que recarregar a página exige login novamente.

## Motoristas

- [ ] Criar um motorista com dados fictícios válidos.
- [ ] Confirmar status `PENDENTE_REVISAO`.
- [ ] Pesquisar por nome e telefone.
- [ ] Filtrar por status.
- [ ] Confirmar que CPF está mascarado na listagem.
- [ ] Tentar inserir o mesmo CPF novamente; o sistema deve bloquear.
- [ ] Tentar CPF inválido, CNH sem validade ou categoria inválida.
- [ ] Editar um cadastro e confirmar os valores atualizados.
- [ ] Aprovar, inativar e reativar.
- [ ] Confirmar entradas de auditoria para ações administrativas.

## Caminhões

- [ ] Criar caminhão de teste com placa válida.
- [ ] Confirmar status `PENDENTE_REVISAO`.
- [ ] Tentar cadastrar a mesma placa novamente; o sistema deve bloquear.
- [ ] Testar placa inválida, ano inválido e capacidade zero/negativa.
- [ ] Testar RENAVAM vazio e com 11 dígitos; valor incorreto deve ser recusado.
- [ ] Pesquisar por placa/modelo e filtrar por status.
- [ ] Editar, aprovar, inativar e reativar.
- [ ] Confirmar auditoria.

## Interface e responsividade

- [ ] Testar em navegador de computador.
- [ ] Testar layout em viewport estreita / celular.
- [ ] Testar navegação lateral no celular.
- [ ] Confirmar que os botões têm área de toque clara e espaçamento.
- [ ] Testar foco por teclado e mensagens de erro.
- [ ] Verificar que os demais módulos exibem **EM DESENVOLVIMENTO**.

## Segurança e operação

- [ ] Confirmar que não há senhas reais no código nem no Git.
- [ ] Restringir compartilhamento da planilha.
- [ ] Restringir acesso da implantação.
- [ ] Não cadastrar documentos reais até aprovação dos controles de segurança.
- [ ] Testar com duas sessões administrativas antes de uso conjunto.
- [ ] Documentar como restaurar a base e recuperar acesso.
