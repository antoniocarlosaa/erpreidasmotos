-- =========================================================================
-- ERP AUTOMOTIVO - SCHEMA COMPLETO (SUPABASE / POSTGRESQL)
-- =========================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpeza prévia (opcional para desenvolvimento)
-- DROP TABLE IF EXISTS attachments CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS logs CASCADE;
-- DROP TABLE IF EXISTS financial_entries CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS transfer_status_logs CASCADE;
-- DROP TABLE IF EXISTS transfer_process CASCADE;
-- DROP TABLE IF EXISTS signatures CASCADE;
-- DROP TABLE IF EXISTS contract_versions CASCADE;
-- DROP TABLE IF EXISTS contracts CASCADE;
-- DROP TABLE IF EXISTS vehicles CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS companies CASCADE;

-- 1. COMPANIES (Tenants)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document TEXT UNIQUE, -- CNPJ
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. USERS (Profiles do ERP vinculados ao Supabase Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Referência direta a auth.users.id (sem FK no Supabase para evitar bloqueios de sistema, ou com FK opcional)
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'vendedor', 'operacional', 'financeiro')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. CLIENTS
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    rg TEXT,
    cnh TEXT,
    birth_date DATE,
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    zip_code TEXT,
    state TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_cpf_per_company UNIQUE (company_id, cpf)
);

-- 4. VEHICLES
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    color TEXT NOT NULL,
    plate TEXT NOT NULL,
    renavam TEXT NOT NULL,
    chassis TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    value NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('carro', 'moto')),
    notes TEXT,
    photos TEXT[] DEFAULT '{}' NOT NULL,
    photos_ready TEXT[] DEFAULT '{}' NOT NULL,
    status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido', 'reservado')),
    entry_modality TEXT NOT NULL DEFAULT 'compra',
    consignation_period_days INTEGER,
    consignation_owner_value NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. CONTRACTS
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contract_number BIGSERIAL NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_value NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    installments_count INTEGER DEFAULT 1 NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    warranty_text TEXT,
    notes TEXT,
    custom_clauses TEXT[] DEFAULT '{}' NOT NULL,
    status TEXT NOT NULL DEFAULT 'AGUARDANDO_VENDEDOR_DAR_ENTRADA' CHECK (status IN (
        'AGUARDANDO_COMPRADOR_FINALIZAR',
        'AGUARDANDO_VENDEDOR_DAR_ENTRADA',
        'AGUARDANDO_FINALIZACAO',
        'AGUARDANDO_DESPACHANTE',
        'AGUARDANDO_VENDEDOR',
        'FALTA_PAGAMENTO_DE_ENTRADA',
        'EM_PROCESSO_DE_TRANSFERENCIA',
        'DOCUMENTAÇÃO_PENDENTE',
        'TRANSFERÊNCIA_CONCLUÍDA'
    )),
    version INTEGER DEFAULT 1 NOT NULL,
    modality TEXT NOT NULL DEFAULT 'vista',
    consignation_period_days INTEGER,
    consignation_owner_value NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_contract_number_per_company UNIQUE (company_id, contract_number)
);

-- 6. CONTRACT_VERSIONS
CREATE TABLE contract_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    changes JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. SIGNATURES
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    signature_data TEXT NOT NULL, -- Imagem PNG base64
    ip_address TEXT NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_agent TEXT NOT NULL,
    location TEXT, -- Geolocalização aproximada em formato de texto/JSON
    role TEXT NOT NULL CHECK (role IN ('comprador', 'vendedor')),
    CONSTRAINT unique_signature_per_role UNIQUE (contract_id, role)
);

-- 8. TRANSFER_PROCESS (Acompanhamento operacional pós-venda)
CREATE TABLE transfer_process (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,
    forwarded_to TEXT, -- ex: "Despachante Silva", "Detran", etc.
    entry_date DATE NOT NULL,
    notes TEXT,
    receipt_url TEXT, -- Documento comprovante no Storage
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 9. TRANSFER_STATUS_LOGS
CREATE TABLE transfer_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_process_id UUID NOT NULL REFERENCES transfer_process(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10. PAYMENTS (Controle financeiro de parcelas de contratos)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at DATE,
    payment_method TEXT CHECK (payment_method IN ('dinheiro', 'pix', 'cartao_credito', 'boleto', 'transferencia_bancaria')),
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'ATRASADO')),
    installment_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 11. FINANCIAL_ENTRIES (Transações gerais de caixa - Receitas / Despesas)
CREATE TABLE financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('RECEITA', 'DESPESA')),
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    entry_date DATE NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 12. LOGS DE AUDITORIA
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 13. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 14. ATTACHMENTS
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =========================================================================
-- ÍNDICES DE PERFORMANCE E BUSCA
-- =========================================================================
CREATE INDEX idx_clients_cpf ON clients (company_id, cpf);
CREATE INDEX idx_clients_name ON clients (company_id, name);
CREATE INDEX idx_vehicles_plate ON vehicles (company_id, plate);
CREATE INDEX idx_vehicles_chassis ON vehicles (company_id, chassis);
CREATE INDEX idx_contracts_status ON contracts (company_id, status);
CREATE INDEX idx_payments_due_date ON payments (due_date);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_financial_entries_date ON financial_entries (company_id, entry_date);
CREATE INDEX idx_logs_created_at ON logs (company_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;

-- =========================================================================
-- TRIGO DE DATA DE ATUALIZAÇÃO (updated_at)
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_process_updated_at BEFORE UPDATE ON transfer_process FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- SINCRONIZAÇÃO AUTOMÁTICA DE USUÁRIOS DO AUTH DO SUPABASE
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_company_id UUID;
    v_company_name TEXT;
    v_user_role TEXT;
    v_user_name TEXT;
BEGIN
    -- Obter metadados enviados no cadastro
    v_user_name := COALESCE(new.raw_user_meta_data->>'name', 'Usuário Novo');
    v_user_role := COALESCE(new.raw_user_meta_data->>'role', 'vendedor');
    
    -- Verificar se temos um company_id ou criar uma nova empresa se não enviado
    IF new.raw_user_meta_data->>'company_id' IS NOT NULL THEN
        v_company_id := (new.raw_user_meta_data->>'company_id')::UUID;
    ELSE
        -- Se não tiver empresa no metadata, tenta buscar a primeira cadastrada ou cria uma fictícia
        SELECT id INTO v_company_id FROM companies LIMIT 1;
        IF v_company_id IS NULL THEN
            INSERT INTO companies (name) VALUES ('Minha Empresa ERP') RETURNING id INTO v_company_id;
        END IF;
    END IF;

    INSERT INTO public.users (id, company_id, name, email, role, created_at, updated_at)
    VALUES (
        new.id,
        v_company_id,
        v_user_name,
        new.email,
        v_user_role,
        now(),
        now()
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger vinculando a tabela auth.users à tabela public.users
-- Nota: Isso requer privilégios de superusuário no Supabase (executado no console SQL)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS MULTIEMPRESA
-- =========================================================================
-- Habilitar RLS em todas as tabelas de dados
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 1. Política para tabela USERS (usuários podem ver a si mesmos e outros da mesma empresa)
CREATE POLICY users_isolation ON users
    FOR ALL
    USING (
        id = auth.uid() OR 
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- 2. Política genérica para tabelas com vinculação direta a company_id
CREATE POLICY clients_isolation ON clients
    FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY vehicles_isolation ON vehicles
    FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY contracts_isolation ON contracts
    FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY financial_entries_isolation ON financial_entries
    FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY logs_isolation ON logs
    FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY notifications_isolation ON notifications
    FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- 3. Políticas para tabelas dependentes (vinculadas por chaves estrangeiras)
CREATE POLICY contract_versions_isolation ON contract_versions
    FOR ALL
    USING (contract_id IN (SELECT id FROM contracts));

CREATE POLICY signatures_isolation ON signatures
    FOR ALL
    USING (contract_id IN (SELECT id FROM contracts));

CREATE POLICY transfer_process_isolation ON transfer_process
    FOR ALL
    USING (contract_id IN (SELECT id FROM contracts));

CREATE POLICY transfer_status_logs_isolation ON transfer_status_logs
    FOR ALL
    USING (transfer_process_id IN (SELECT id FROM transfer_process));

CREATE POLICY payments_isolation ON payments
    FOR ALL
    USING (contract_id IN (SELECT id FROM contracts));

CREATE POLICY attachments_isolation ON attachments
    FOR ALL
    USING (
        contract_id IN (SELECT id FROM contracts) OR
        client_id IN (SELECT id FROM clients) OR
        vehicle_id IN (SELECT id FROM vehicles)
    );
