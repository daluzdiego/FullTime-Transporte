# Testes gratuitos do FullTime

## Requisitos
- Node.js 20 ou superior.
- Nenhuma conta paga, cartão, banco hospedado ou API externa.
- Clone do repositório e checkout da branch de trabalho.

## Executar
```bash
npm run test:static
```

Os testes leem `Code.gs` e `Index.html` diretamente. Eles verificam:
1. se as chamadas remotas identificadas no HTML existem no backend;
2. se helpers com sufixo `_` não são chamados diretamente pela interface;
3. se a superfície global sem token permanece igual à linha de base documentada;
4. se o repositório ainda usa o acesso global legado, evitando confundir a auditoria com isolamento multi-tenant já implementado.

## Limites
Esta é a primeira camada de testes estáticos. Ela não executa Apps Script, não valida permissões reais de implantação, não comprova segurança, não testa concorrência e não substitui testes de integração com PostgreSQL/RLS. Não executar funções de preparação/migração em planilhas reais.

Quando endpoints forem protegidos ou removidos, atualizar primeiro a matriz de autorização e depois a linha de base deste teste, mantendo o histórico da mudança.
