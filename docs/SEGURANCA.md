# Segurança e proteção de dados

## Credenciais

- Nunca registrar senhas em código-fonte, documentação, planilha compartilhada ou logs permanentes.
- As senhas temporárias são geradas no bootstrap e impressas no registro de execução; copie-as para um canal seguro e apague/limpe o acesso aos logs conforme a política da organização.
- A nova senha exige 12 caracteres ou mais e troca temporária obrigatória.
- As senhas ficam armazenadas como SHA-256 com salt individual. Para produção, recomenda-se autenticação provida por identidade Google/Workspace ou um mecanismo de autenticação com KDF apropriado (por exemplo, scrypt/Argon2/PBKDF2 com parâmetros adequados) e política de recuperação segura. Hash SHA-256 simples não é a escolha ideal para armazenamento de senhas em produção.
- As sessões de aplicação usam token aleatório e cache de servidor com expiração; a sessão é mantida apenas na memória do navegador e desaparece ao recarregar.

## Autorização

- Funções de cadastro, listagem, métricas e alteração de status exigem sessão autenticada e papel `ADMIN`.
- Os módulos em desenvolvimento são apenas placeholders.
- Restrinja o acesso à implantação e à planilha; não compartilhe links de dados com motoristas.
- O acesso aos cadastros deve ser revisado periodicamente.

## Dados pessoais

CNH, CPF, contato de emergência e telefone são dados pessoais. Antes de inserir dados reais:
- defina finalidade, base legal, retenção e processo de atendimento aos titulares conforme a LGPD;
- minimize os campos coletados;
- restrinja quem pode visualizar a planilha e os logs;
- não armazene imagens de documentos enquanto não houver necessidade e controles aprovados;
- evite enviar dados pessoais para ferramentas externas ou chats de suporte;
- crie procedimento de correção, exportação e exclusão quando aplicável.

## Riscos e limitações conhecidos

- A camada atual de senha é apropriada apenas para um MVP de validação, não é uma revisão completa de segurança.
- Apps Script e Sheets têm cotas, limites de concorrência e comportamento que devem ser avaliados com o volume real.
- A autenticação própria no Apps Script precisa de revisão especializada antes de uma implantação pública ou operacional crítica.
- O valor de status e alguns campos do formulário são validados no servidor, mas o sistema ainda não possui prevenção avançada contra corrida concorrente em cadastros simultâneos.
- A URL externa da foto usada na tela de login é apenas decoração; substitua por imagem licenciada/gerida pela empresa se desejado.
