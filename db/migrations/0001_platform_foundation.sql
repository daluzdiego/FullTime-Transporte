-- FullTime SaaS — migration 0001: fundação de plataforma e tenancy
-- Rascunho versionado; NÃO executar em produção antes de revisão e ambiente de desenvolvimento.
-- Nenhuma tabela operacional de Bruno é migrada por esta migration.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT tenants_tax_id_unique UNIQUE (tax_id)
);

-- Identidade global: a mesma pessoa pode participar de mais de uma empresa.
-- A autenticação real será delegada ao provedor de identidade; não armazenar senha aqui.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_provider TEXT NOT NULL,
  identity_subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','BLOCKED','DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identity_provider, identity_subject)
);

-- O vínculo usuário/empresa define papel e permissões dentro daquele tenant.
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role_code TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'INVITED'
    CHECK (status IN ('INVITED','ACTIVE','SUSPENDED','REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id),
  UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_status
  ON tenant_memberships (user_id, status);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE RESTRICT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guardar somente referência/nome do segredo no Secret Manager, nunca o segredo em si.
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  provider_code TEXT NOT NULL,
  external_account_ref TEXT,
  secret_resource_name TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DISABLED'
    CHECK (status IN ('DISABLED','PENDING','ACTIVE','ERROR','REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_code)
);

CREATE TABLE IF NOT EXISTS tenant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_code TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correlation_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_tenant_time
  ON tenant_audit_log (tenant_id, occurred_at DESC);

-- O contexto é definido exclusivamente pelo backend após validar identidade e membership.
-- Sem contexto (ou com UUID inválido), a consulta não encontra linhas autorizadas.
CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID
$$;

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_memberships_isolation ON tenant_memberships
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_settings_isolation ON tenant_settings
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_integrations_isolation ON tenant_integrations
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_audit_isolation ON tenant_audit_log
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

COMMIT;

-- IMPORTANTE:
-- 1. O papel da aplicação não pode ser superuser nem possuir BYPASSRLS.
-- 2. O backend deve iniciar transação e executar SET LOCAL app.tenant_id = '<uuid>'
--    somente depois de validar o usuário e sua membership ativa.
-- 3. A resolução inicial da membership exige fluxo backend controlado; não expor
--    consultas globais de memberships ao navegador.
-- 4. Não criar policies permissivas adicionais sem teste negativo de isolamento.
-- 5. Esta migration ainda não inclui dados operacionais, faturamento ou regras de Bruno.
