-- =========================================================================
-- ERP AUTOMOTIVO - DADOS INICIAIS (SEED)
-- =========================================================================

-- 1. COMPANIES (Empresa Principal)
INSERT INTO companies (id, name, document, created_at, updated_at)
VALUES (
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'AutoPrime Multimarcas Ltda',
    '12.345.678/0001-90',
    now() - INTERVAL '60 days',
    now() - INTERVAL '60 days'
);

-- 2. USERS (Perfis vinculados a usuários mock do Supabase Auth)
-- Mock UUIDs representativos dos papéis
INSERT INTO users (id, company_id, name, email, role, created_at, updated_at)
VALUES 
(
    '00000000-0000-0000-0000-000000000001', -- Admin User
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Carlos Henrique (Admin)',
    'admin@autoprime.com.br',
    'admin',
    now() - INTERVAL '50 days',
    now() - INTERVAL '50 days'
),
(
    '00000000-0000-0000-0000-000000000002', -- Vendedor
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Lucas Mendes (Vendas)',
    'vendedor@autoprime.com.br',
    'vendedor',
    now() - INTERVAL '50 days',
    now() - INTERVAL '50 days'
),
(
    '00000000-0000-0000-0000-000000000003', -- Operacional
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Mariana Costa (Operacional)',
    'operacional@autoprime.com.br',
    'operacional',
    now() - INTERVAL '50 days',
    now() - INTERVAL '50 days'
),
(
    '00000000-0000-0000-0000-000000000004', -- Financeiro
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Ricardo Souza (Financeiro)',
    'financeiro@autoprime.com.br',
    'financeiro',
    now() - INTERVAL '50 days',
    now() - INTERVAL '50 days'
);

-- 3. CLIENTS (Clientes cadastrados para simulação)
INSERT INTO clients (id, company_id, name, cpf, rg, cnh, birth_date, address, neighborhood, city, zip_code, state, phone, whatsapp, email, created_at, updated_at)
VALUES
(
    '1a111111-1111-1111-1111-111111111111',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Rodrigo Lima Silva',
    '123.456.789-00',
    'MG-12.345.678',
    '12345678900',
    '1988-05-12',
    'Av. dos Holandeses, 120 - Apto 302',
    'Ponta do Farol',
    'São Luís',
    '65071-380',
    'MA',
    '(98) 98122-3344',
    '(98) 98122-3344',
    'rodrigo.lima@gmail.com',
    now() - INTERVAL '40 days',
    now() - INTERVAL '40 days'
),
(
    '2b222222-2222-2222-2222-222222222222',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Beatriz Albuquerque Cruz',
    '987.654.321-11',
    'SP-98.765.432',
    '98765432101',
    '1995-10-24',
    'Rua das Palmeiras, 45',
    'Jardim Renascença',
    'São Luís',
    '65075-440',
    'MA',
    '(98) 99188-7766',
    '(98) 99188-7766',
    'beatriz.cruz@yahoo.com.br',
    now() - INTERVAL '30 days',
    now() - INTERVAL '30 days'
),
(
    '3c333333-3333-3333-3333-333333333333',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Fernando Mendes Oliveira',
    '456.789.123-22',
    'MA-5.678.912',
    '45678912322',
    '1975-01-30',
    'Rua do Alecrim, 1500',
    'Cohafuma',
    'São Luís',
    '65070-000',
    'MA',
    '(98) 98877-1122',
    '(98) 98877-1122',
    'fernando.oliveira@outlook.com',
    now() - INTERVAL '20 days',
    now() - INTERVAL '20 days'
);

-- 4. VEHICLES (Veículos no Pátio / Vendidos)
INSERT INTO vehicles (id, company_id, brand, model, year, color, plate, renavam, chassis, mileage, value, category, notes, photos, status, created_at, updated_at)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Toyota',
    'Corolla XEi 2.0 Flex',
    2022,
    'Prata',
    'HPX-1020',
    '12345678901',
    '9BRBD3HE4N1111111',
    28500,
    125000.00,
    'carro',
    'Único dono, revisões em dia na concessionária, laudo cautelar aprovado.',
    ARRAY['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&auto=format&fit=crop&q=60'],
    'vendido',
    now() - INTERVAL '40 days',
    now() - INTERVAL '40 days'
),
(
    '22222222-2222-2222-2222-222222222222',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Honda',
    'Civic Touring 1.5 Turbo',
    2021,
    'Preto',
    'NHJ-4050',
    '98765432109',
    '9BRFC1FK6M2222222',
    42000,
    139900.00,
    'carro',
    'Teto solar, faróis em LED, multimídia com CarPlay, pneus novos.',
    ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60'],
    'disponivel',
    now() - INTERVAL '35 days',
    now() - INTERVAL '35 days'
),
(
    '33333333-3333-3333-3333-333333333333',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'BMW',
    'F 850 GS Premium',
    2023,
    'Branca/Azul',
    'KLO-8990',
    '45678901234',
    '9BRWB1A09P3333333',
    8200,
    68900.00,
    'moto',
    'Painel TFT, aquecedor de manoplas, controle de tração, protetor de motor.',
    ARRAY['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=60'],
    'disponivel',
    now() - INTERVAL '30 days',
    now() - INTERVAL '30 days'
),
(
    '44444444-4444-4444-4444-444444444444',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Jeep',
    'Compass Longitude 2.0 Diesel',
    2020,
    'Cinza Metallic',
    'OIR-5620',
    '65432109876',
    '9BRCA4FC2L4444444',
    65000,
    118000.00,
    'carro',
    'Tração 4x4, bancos de couro marrom, som Beats, revisado recentemente.',
    ARRAY['https://images.unsplash.com/photo-1539722011707-636c4f2e185c?w=800&auto=format&fit=crop&q=60'],
    'vendido',
    now() - INTERVAL '25 days',
    now() - INTERVAL '25 days'
),
(
    '55555555-5555-5555-5555-555555555555',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'Yamaha',
    'MT-09 ABS',
    2022,
    'Azul Icon Blue',
    'NIO-3040',
    '78901234567',
    '9BRRE1B03M5555555',
    11500,
    55000.00,
    'moto',
    'Quickshifter bidirecional, slider de motor, escapamento esportivo instalado.',
    ARRAY['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=60'],
    'vendido',
    now() - INTERVAL '15 days',
    now() - INTERVAL '15 days'
);

-- 5. CONTRACTS (Contratos criados)
-- Contrato 1: Concluído (Toyota Corolla para Rodrigo)
INSERT INTO contracts (id, company_id, client_id, vehicle_id, seller_id, total_value, down_payment, installments_count, interest_rate, warranty_text, notes, status, created_at, updated_at)
VALUES (
    'c1111111-1111-1111-1111-111111111111',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    '1a111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000002',
    125000.00,
    50000.00,
    12,
    1.25,
    'Garantia legal de 90 dias para motor e câmbio nos termos do Art. 26 do Código de Defesa do Consumidor.',
    'Venda realizada com financiamento aprovado pelo banco Itaú. Entrada em PIX.',
    'TRANSFERÊNCIA_CONCLUÍDA',
    now() - INTERVAL '30 days',
    now() - INTERVAL '20 days'
);

-- Contrato 2: Em Transferência (Jeep Compass para Beatriz)
INSERT INTO contracts (id, company_id, client_id, vehicle_id, seller_id, total_value, down_payment, installments_count, interest_rate, warranty_text, notes, status, created_at, updated_at)
VALUES (
    'c2222222-2222-2222-2222-222222222222',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    '2b222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000002',
    118000.00,
    20000.00,
    24,
    1.49,
    'Garantia contratual estendida AutoPrime de 180 dias para motor, câmbio e sistema de ar-condicionado.',
    'Entrada em dinheiro e saldo parcelado via boleto da loja.',
    'EM_PROCESSO_DE_TRANSFERENCIA',
    now() - INTERVAL '15 days',
    now() - INTERVAL '5 days'
);

-- Contrato 3: Aguardando Assinaturas (Yamaha MT-09 para Fernando)
INSERT INTO contracts (id, company_id, client_id, vehicle_id, seller_id, total_value, down_payment, installments_count, interest_rate, warranty_text, notes, status, created_at, updated_at)
VALUES (
    'c3333333-3333-3333-3333-333333333333',
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    '3c333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000002',
    55000.00,
    15000.00,
    6,
    0.99,
    'Garantia legal de 90 dias de motor e caixa.',
    'Pendente de recolher assinatura digital do comprador para início do processo de transferência.',
    'AGUARDANDO_COMPRADOR_FINALIZAR',
    now() - INTERVAL '3 days',
    now() - INTERVAL '1 days'
);

-- 6. SIGNATURES (Assinaturas coletadas)
-- Assinaturas Contrato 1 (Comprador e Vendedor)
INSERT INTO signatures (id, contract_id, signature_data, ip_address, signed_at, user_agent, location, role)
VALUES
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
    '191.220.15.104',
    now() - INTERVAL '29 days',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'São Luís, MA, Brasil',
    'comprador'
),
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
    '191.220.15.1',
    now() - INTERVAL '29 days',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'São Luís, MA, Brasil',
    'vendedor'
);

-- Assinaturas Contrato 2 (Comprador e Vendedor)
INSERT INTO signatures (id, contract_id, signature_data, ip_address, signed_at, user_agent, location, role)
VALUES
(
    gen_random_uuid(),
    'c2222222-2222-2222-2222-222222222222',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
    '177.25.10.82',
    now() - INTERVAL '14 days',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    'São José de Ribamar, MA, Brasil',
    'comprador'
),
(
    gen_random_uuid(),
    'c2222222-2222-2222-2222-222222222222',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
    '191.220.15.1',
    now() - INTERVAL '14 days',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'São Luís, MA, Brasil',
    'vendedor'
);

-- 7. TRANSFER_PROCESS (Acompanhamento)
-- Processo de Transferência para Corolla (Concluído)
INSERT INTO transfer_process (id, contract_id, responsible_id, forwarded_to, entry_date, notes, receipt_url, created_at, updated_at)
VALUES (
    't1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000003',
    'Despachante VIP - Centro',
    '2026-05-02',
    'Documentação enviada por motoboy. Placas novas Mercosul instaladas.',
    'https://example.com/receipt-corolla.pdf',
    now() - INTERVAL '25 days',
    now() - INTERVAL '20 days'
);

-- Processo de Transferência para Jeep Compass (Em trâmite)
INSERT INTO transfer_process (id, contract_id, responsible_id, forwarded_to, entry_date, notes, receipt_url, created_at, updated_at)
VALUES (
    't2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000003',
    'Cartório do 1º Ofício',
    '2026-05-18',
    'Aguardando liberação da restrição fiduciária do banco anterior para emissão do novo DUT eletrônico.',
    NULL,
    now() - INTERVAL '10 days',
    now() - INTERVAL '5 days'
);

-- 8. TRANSFER_STATUS_LOGS
INSERT INTO transfer_status_logs (id, transfer_process_id, previous_status, new_status, changed_by, notes, created_at)
VALUES
(
    gen_random_uuid(),
    't1111111-1111-1111-1111-111111111111',
    'AGUARDANDO_VENDEDOR_DAR_ENTRADA',
    'EM_PROCESSO_DE_TRANSFERENCIA',
    '00000000-0000-0000-0000-000000000003',
    'Entrada dada no despachante credenciado.',
    now() - INTERVAL '24 days'
),
(
    gen_random_uuid(),
    't1111111-1111-1111-1111-111111111111',
    'EM_PROCESSO_DE_TRANSFERENCIA',
    'TRANSFERÊNCIA_CONCLUÍDA',
    '00000000-0000-0000-0000-000000000003',
    'CRV digital emitido pelo DETRAN/MA. Venda totalmente finalizada.',
    now() - INTERVAL '20 days'
),
(
    gen_random_uuid(),
    't2222222-2222-2222-2222-222222222222',
    'AGUARDANDO_VENDEDOR_DAR_ENTRADA',
    'DOCUMENTAÇÃO_PENDENTE',
    '00000000-0000-0000-0000-000000000003',
    'Compradora precisa levar o ATPV-e no cartório para reconhecer firma por autenticidade.',
    now() - INTERVAL '9 days'
),
(
    gen_random_uuid(),
    't2222222-2222-2222-2222-222222222222',
    'DOCUMENTAÇÃO_PENDENTE',
    'EM_PROCESSO_DE_TRANSFERENCIA',
    '00000000-0000-0000-0000-000000000003',
    'Firma reconhecida em cartório e documento digitalizado anexado.',
    now() - INTERVAL '5 days'
);

-- 9. PAYMENTS (Parcelas de Contratos)
-- Contrato 1: Entrada e 12 Parcelas (Entrada Paga, Parcela 1 Paga)
INSERT INTO payments (id, contract_id, amount, due_date, paid_at, payment_method, status, installment_number, created_at)
VALUES
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    50000.00,
    '2026-04-28',
    '2026-04-28',
    'pix',
    'PAGO',
    0, -- Entrada
    now() - INTERVAL '30 days'
),
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    6934.50, -- Valor amortizado + juros
    '2026-05-28',
    '2026-05-28',
    'boleto',
    'PAGO',
    1,
    now() - INTERVAL '30 days'
),
(
    gen_random_uuid(),
    'c1111111-1111-1111-1111-111111111111',
    6934.50,
    '2026-06-28',
    NULL,
    NULL,
    'PENDENTE',
    2,
    now() - INTERVAL '30 days'
);

-- Contrato 2: Entrada e 24 Parcelas (Pendente de Entrada)
INSERT INTO payments (id, contract_id, amount, due_date, paid_at, payment_method, status, installment_number, created_at)
VALUES
(
    gen_random_uuid(),
    'c2222222-2222-2222-2222-222222222222',
    20000.00,
    '2026-05-15',
    '2026-05-16',
    'transferencia_bancaria',
    'PAGO',
    0, -- Entrada
    now() - INTERVAL '15 days'
),
(
    gen_random_uuid(),
    'c2222222-2222-2222-2222-222222222222',
    4900.00,
    '2026-06-15',
    NULL,
    NULL,
    'PENDENTE',
    1,
    now() - INTERVAL '15 days'
);

-- 10. FINANCIAL_ENTRIES (Transações Gerais)
INSERT INTO financial_entries (id, company_id, contract_id, type, amount, description, entry_date, category, created_at)
VALUES
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'c1111111-1111-1111-1111-111111111111',
    'RECEITA',
    50000.00,
    'Recebimento de Entrada - Contrato Corolla #1001',
    '2026-04-28',
    'Venda de Veículo',
    now() - INTERVAL '30 days'
),
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'c1111111-1111-1111-1111-111111111111',
    'RECEITA',
    6934.50,
    'Pagamento Parcela 01 - Contrato Corolla #1001',
    '2026-05-28',
    'Financiamento',
    now() - INTERVAL '30 days'
),
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    'c2222222-2222-2222-2222-222222222222',
    'RECEITA',
    20000.00,
    'Recebimento de Entrada - Contrato Jeep Compass #1002',
    '2026-05-16',
    'Venda de Veículo',
    now() - INTERVAL '15 days'
),
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    NULL,
    'DESPESA',
    350.00,
    'Pagamento Despachante - Taxa DETRAN Placa Mercosul Corolla',
    '2026-05-03',
    'Serviços de Terceiros',
    now() - INTERVAL '25 days'
),
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    NULL,
    'DESPESA',
    1800.00,
    'Limpeza, higienização e polimento de veículos (Serviço Mensal)',
    '2026-05-10',
    'Manutenção do Pátio',
    now() - INTERVAL '18 days'
);

-- 11. AUDIT LOGS
INSERT INTO logs (id, company_id, user_id, action, ip_address, user_agent, details, created_at)
VALUES
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    '00000000-0000-0000-0000-000000000001',
    'LOGIN',
    '191.220.15.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    '{"status": "success", "message": "Admin logado com sucesso"}',
    now() - INTERVAL '10 days'
),
(
    gen_random_uuid(),
    '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95',
    '00000000-0000-0000-0000-000000000002',
    'CREATE_CONTRACT',
    '191.220.15.30',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
    '{"contract_id": "c3333333-3333-3333-3333-333333333333", "vehicle_plate": "NIO-3040"}',
    now() - INTERVAL '3 days'
);
