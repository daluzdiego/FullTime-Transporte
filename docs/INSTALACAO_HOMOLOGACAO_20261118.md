# Instalação da cópia de código na homologação — 2026-11-18

## IDs confirmados

- Projeto Apps Script de produção (origem somente para leitura): `1Dc8RuKNXXx42Hm3XZGRujKBjyhQvIZyXb7NiIlSHbaT_ctwB2fUP0ZxG`
- Projeto Apps Script de homologação (destino): `1UhGHxKcZF6g9OdueUfy7gnaPZATLRzNCSH8AYGUybC_aBaGk5L0Swn-W`
- Planilha operacional de homologação: `1zWx_QhRqqIXyu3hRs7VUhj2scRnkmIbZiUfS6ylcU-w`
- Planilha de autenticação de homologação: `1VcUJtpMX4EgmLCnyD4peDMq7kUqBjMLMyJ2SmF4BVR0`
- Planilha Bruno de homologação: `1dsfK0wlE6aSYWkVhYMonrOd_7gS-tsJ6JDAF8KCDHks`

## Procedimento seguro com clasp

O Apps Script Editor não é alterado por commits GitHub. A transferência do código para o projeto de homologação deve ser feita com `clasp` autenticado pela conta autorizada.

1. Criar uma pasta local vazia e clonar o código do projeto de produção **sem fazer push para ele**:
   ```powershell
   New-Item -ItemType Directory -Force C:\FullTime-Homologacao | Out-Null
   Set-Location C:\FullTime-Homologacao
   clasp clone 1Dc8RuKNXXx42Hm3XZGRujKBjyhQvIZyXb7NiIlSHbaT_ctwB2fUP0ZxG
   ```
2. Em outra pasta, clonar esta branch do GitHub:
   ```powershell
   Set-Location C:\
   git clone --branch homologacao/instalacao-segura-20261118 https://github.com/daluzdiego/FullTime-Transporte.git FullTime-Repo-Homologacao
   ```
3. Copiar os arquivos versionados para a pasta clonada do Apps Script, sobrepondo os arquivos de mesmo nome e mantendo módulos locais que não existam no repositório:
   ```powershell
   Copy-Item C:\FullTime-Repo-Homologacao\apps-script\* C:\FullTime-Homologacao\ -Recurse -Force
   ```
   Revise especialmente `Code.gs`, `Index.html`, `MotorConvocacaoAutomaticaFullTime.gs`, `PortalMotoristaFullTime.gs` e `CentroOperacoesFullTime.gs`.
4. Alterar **somente** o campo `scriptId` de `.clasp.json` para o ID do projeto de homologação:
   ```powershell
   $p = Get-Content C:\FullTime-Homologacao\.clasp.json -Raw | ConvertFrom-Json
   $p.scriptId = '1UhGHxKcZF6g9OdueUfy7gnaPZATLRzNCSH8AYGUybC_aBaGk5L0Swn-W'
   $p | ConvertTo-Json -Depth 10 | Set-Content C:\FullTime-Homologacao\.clasp.json -Encoding UTF8
   ```
5. Confirmar o destino antes do push:
   ```powershell
   Get-Content C:\FullTime-Homologacao\.clasp.json
   Set-Location C:\FullTime-Homologacao
   clasp status
   ```
   O `scriptId` precisa ser exatamente o ID de homologação acima. Se aparecer o ID de produção, **pare e não execute push**.
6. Enviar os arquivos ao projeto de homologação:
   ```powershell
   clasp push -f
   ```

## Proteções obrigatórias

- Nunca executar `clasp push` enquanto `.clasp.json` apontar para produção.
- Não executar `configurarSistemaFullTime`, rotinas de limpeza, geração de massa, exclusão de contas ou arquivamento de guias durante a instalação.
- Não executar `conectarPlanilhaOperacionalFullTime` como rotina de configuração. O código foi ajustado para ler a propriedade já configurada sem substituí-la por um ID fixo.
- Não implantar uma nova versão Web App nesta etapa. `clasp push` atualiza o código-fonte do projeto; implantação é uma etapa separada.
- Depois do push, executar primeiro a auditoria somente leitura das propriedades e dos cabeçalhos. Só então iniciar H01–H10 com dados fictícios.
- A disponibilidade da oferta no portal não comprova envio por WhatsApp ou e-mail.

## Alteração de segurança nesta branch

`apps-script/Code.gs` não contém mais o ID fixo da planilha de produção nas funções de conexão e auditoria do contrato. A conexão agora lê `FT_REGISTRY_DATABASE_ID` e valida que a base operacional e a base de autenticação são diferentes, sem sobrescrever propriedades.
