require("dotenv").config();
const admin = require("firebase-admin");
const crypto = require("crypto");

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

if (!projectId || !clientEmail || !privateKey) {
  console.error("Erro: Variáveis de ambiente do Firebase ausentes no arquivo .env");
  console.error("Certifique-se de configurar: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = admin.firestore();
const auth = admin.auth();

const companyId = '8c6bd99a-eb2b-42fa-9d10-40e1f7c32e95';

async function seed() {
  console.log("Iniciando semeadura do Firebase...");

  // 1. Criar Empresa
  console.log("Criando empresa...");
  await db.collection("companies").doc(companyId).set({
    name: 'AutoPrime Multimarcas Ltda',
    document: '12.345.678/0001-90',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  });

  // 2. Criar Usuários no Auth e no Firestore
  const mockUsers = [
    {
      uid: '00000000-0000-0000-0000-000000000001',
      name: 'Carlos Henrique (Admin)',
      email: 'admin@autoprime.com.br',
      role: 'admin'
    },
    {
      uid: '00000000-0000-0000-0000-000000000002',
      name: 'Lucas Mendes (Vendas)',
      email: 'vendedor@autoprime.com.br',
      role: 'vendedor'
    },
    {
      uid: '00000000-0000-0000-0000-000000000003',
      name: 'Mariana Costa (Operacional)',
      email: 'operacional@autoprime.com.br',
      role: 'operacional'
    },
    {
      uid: '00000000-0000-0000-0000-000000000004',
      name: 'Ricardo Souza (Financeiro)',
      email: 'financeiro@autoprime.com.br',
      role: 'financeiro'
    }
  ];

  for (const mu of mockUsers) {
    console.log(`Criando usuário: ${mu.name}...`);
    try {
      // Deletar se já existir no Auth para evitar conflitos de duplicação
      try {
        await auth.deleteUser(mu.uid);
        console.log(`Usuário antigo deletado do Auth: ${mu.email}`);
      } catch (e) {}

      await auth.createUser({
        uid: mu.uid,
        email: mu.email,
        password: 'senha_teste_123',
        displayName: mu.name
      });
      console.log(`Usuário criado no Auth: ${mu.email}`);
    } catch (e) {
      console.warn(`Aviso ao criar no Auth: ${e.message}`);
    }

    await db.collection("users").doc(mu.uid).set({
      company_id: companyId,
      name: mu.name,
      email: mu.email,
      role: mu.role,
      created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // 3. Clientes
  console.log("Criando clientes...");
  const clients = [
    {
      id: '1a111111-1111-1111-1111-111111111111',
      name: 'Rodrigo Lima Silva',
      cpf: '12345678900',
      rg: 'MG-12.345.678',
      cnh: '12345678900',
      birth_date: '1988-05-12',
      address: 'Av. dos Holandeses, 120 - Apto 302',
      neighborhood: 'Ponta do Farol',
      city: 'São Luís',
      zip_code: '65071380',
      state: 'MA',
      phone: '98981223344',
      whatsapp: '98981223344',
      email: 'rodrigo.lima@gmail.com'
    },
    {
      id: '2b222222-2222-2222-2222-222222222222',
      name: 'Beatriz Albuquerque Cruz',
      cpf: '98765432111',
      rg: 'SP-98.765.432',
      cnh: '98765432101',
      birth_date: '1995-10-24',
      address: 'Rua das Palmeiras, 45',
      neighborhood: 'Jardim Renascença',
      city: 'São Luís',
      zip_code: '65075440',
      state: 'MA',
      phone: '98991887766',
      whatsapp: '98991887766',
      email: 'beatriz.cruz@yahoo.com.br'
    },
    {
      id: '3c333333-3333-3333-3333-333333333333',
      name: 'Fernando Mendes Oliveira',
      cpf: '45678912322',
      rg: 'MA-5.678.912',
      cnh: '45678912322',
      birth_date: '1975-01-30',
      address: 'Rua do Alecrim, 1500',
      neighborhood: 'Cohafuma',
      city: 'São Luís',
      zip_code: '65070000',
      state: 'MA',
      phone: '98988771122',
      whatsapp: '98988771122',
      email: 'fernando.oliveira@outlook.com'
    }
  ];

  for (const c of clients) {
    const { id, ...data } = c;
    await db.collection("clients").doc(id).set({
      company_id: companyId,
      ...data,
      created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // 4. Veículos
  console.log("Criando veículos...");
  const vehicles = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      brand: 'Toyota',
      model: 'Corolla XEi 2.0 Flex',
      year: 2022,
      color: 'Prata',
      plate: 'HPX-1020',
      renavam: '12345678901',
      chassis: '9BRBD3HE4N1111111',
      mileage: 28500,
      value: 125000.00,
      category: 'carro',
      notes: 'Único dono, revisões em dia na concessionária, laudo cautelar aprovado.',
      photos: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&auto=format&fit=crop&q=60'],
      status: 'vendido'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      brand: 'Honda',
      model: 'Civic Touring 1.5 Turbo',
      year: 2021,
      color: 'Preto',
      plate: 'NHJ-4050',
      renavam: '98765432109',
      chassis: '9BRFC1FK6M2222222',
      mileage: 42000,
      value: 139900.00,
      category: 'carro',
      notes: 'Teto solar, faróis em LED, multimídia com CarPlay, pneus novos.',
      photos: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60'],
      status: 'disponivel'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      brand: 'BMW',
      model: 'F 850 GS Premium',
      year: 2023,
      color: 'Branca/Azul',
      plate: 'KLO-8990',
      renavam: '45678901234',
      chassis: '9BRWB1A09P3333333',
      mileage: 8200,
      value: 68900.00,
      category: 'moto',
      notes: 'Painel TFT, aquecedor de manoplas, controle de tração, protetor de motor.',
      photos: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=60'],
      status: 'disponivel'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      brand: 'Jeep',
      model: 'Compass Longitude 2.0 Diesel',
      year: 2020,
      color: 'Cinza Metallic',
      plate: 'OIR-5620',
      renavam: '65432109876',
      chassis: '9BRCA4FC2L4444444',
      mileage: 65000,
      value: 118000.00,
      category: 'carro',
      notes: 'Tração 4x4, bancos de couro marrom, som Beats, revisado recentemente.',
      photos: ['https://images.unsplash.com/photo-1539722011707-636c4f2e185c?w=800&auto=format&fit=crop&q=60'],
      status: 'vendido'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      brand: 'Yamaha',
      model: 'MT-09 ABS',
      year: 2022,
      color: 'Azul Icon Blue',
      plate: 'NIO-3040',
      renavam: '78901234567',
      chassis: '9BRRE1B03M5555555',
      mileage: 11500,
      value: 55000.00,
      category: 'moto',
      notes: 'Quickshifter bidirecional, slider de motor, escapamento esportivo instalado.',
      photos: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=60'],
      status: 'vendido'
    }
  ];

  for (const v of vehicles) {
    const { id, ...data } = v;
    await db.collection("vehicles").doc(id).set({
      company_id: companyId,
      ...data,
      created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // 5. Contadores para contratos
  console.log("Configurando contadores sequenciais de contratos...");
  await db.collection("counters").doc(`${companyId}_contracts`).set({
    current: 1003 // Para que o próximo seja o 1004
  });

  // 6. Contratos
  console.log("Criando contratos...");
  const contracts = [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      client_id: '1a111111-1111-1111-1111-111111111111',
      vehicle_id: '11111111-1111-1111-1111-111111111111',
      seller_id: '00000000-0000-0000-0000-000000000002',
      contract_number: 1001,
      total_value: 125000.00,
      down_payment: 50000.00,
      installments_count: 12,
      interest_rate: 1.25,
      warranty_text: 'Garantia legal de 90 dias para motor e câmbio nos termos do Art. 26 do Código de Defesa do Consumidor.',
      notes: 'Venda realizada com financiamento aprovado pelo banco Itaú. Entrada em PIX.',
      status: 'TRANSFERÊNCIA_CONCLUÍDA',
      version: 1,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'c2222222-2222-2222-2222-222222222222',
      client_id: '2b222222-2222-2222-2222-222222222222',
      vehicle_id: '44444444-4444-4444-4444-444444444444',
      seller_id: '00000000-0000-0000-0000-000000000002',
      contract_number: 1002,
      total_value: 118000.00,
      down_payment: 20000.00,
      installments_count: 24,
      interest_rate: 1.49,
      warranty_text: 'Garantia contratual estendida AutoPrime de 180 dias para motor, câmbio e sistema de ar-condicionado.',
      notes: 'Entrada em dinheiro e saldo parcelado via boleto da loja.',
      status: 'EM_PROCESSO_DE_TRANSFERENCIA',
      version: 1,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'c3333333-3333-3333-3333-333333333333',
      client_id: '3c333333-3333-3333-3333-333333333333',
      vehicle_id: '55555555-5555-5555-5555-555555555555',
      seller_id: '00000000-0000-0000-0000-000000000002',
      contract_number: 1003,
      total_value: 55000.00,
      down_payment: 15000.00,
      installments_count: 6,
      interest_rate: 0.99,
      warranty_text: 'Garantia legal de 90 dias de motor e caixa.',
      notes: 'Pendente de recolher assinatura digital do comprador para início do processo de transferência.',
      status: 'AGUARDANDO_COMPRADOR_FINALIZAR',
      version: 1,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const cn of contracts) {
    const { id, ...data } = cn;
    await db.collection("contracts").doc(id).set({
      company_id: companyId,
      ...data
    });
  }

  // 7. Assinaturas
  console.log("Criando assinaturas...");
  const signatures = [
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
      ip_address: '191.220.15.104',
      signed_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'São Luís, MA, Brasil',
      role: 'comprador'
    },
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
      ip_address: '191.220.15.1',
      signed_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'São Luís, MA, Brasil',
      role: 'vendedor'
    },
    {
      contract_id: 'c2222222-2222-2222-2222-222222222222',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
      ip_address: '177.25.10.82',
      signed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
      location: 'São José de Ribamar, MA, Brasil',
      role: 'comprador'
    },
    {
      contract_id: 'c2222222-2222-2222-2222-222222222222',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAD52...',
      ip_address: '191.220.15.1',
      signed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: 'São Luís, MA, Brasil',
      role: 'vendedor'
    }
  ];

  for (const s of signatures) {
    const id = crypto.randomUUID();
    await db.collection("signatures").doc(id).set(s);
  }

  // 8. Processos de Transferência
  console.log("Criando processos de transferência...");
  const transferProcesses = [
    {
      id: 't1111111-1111-1111-1111-111111111111',
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      responsible_id: '00000000-0000-0000-0000-000000000003',
      forwarded_to: 'Despachante VIP - Centro',
      entry_date: '2026-05-02',
      notes: 'Documentação enviada por motoboy. Placas novas Mercosul instaladas.',
      receipt_url: 'https://example.com/receipt-corolla.pdf',
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 't2222222-2222-2222-2222-222222222222',
      contract_id: 'c2222222-2222-2222-2222-222222222222',
      responsible_id: '00000000-0000-0000-0000-000000000003',
      forwarded_to: 'Cartório do 1º Ofício',
      entry_date: '2026-05-18',
      notes: 'Aguardando liberação da restrição fiduciária do banco anterior para emissão do novo DUT eletrônico.',
      receipt_url: null,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const tp of transferProcesses) {
    const { id, ...data } = tp;
    await db.collection("transfer_process").doc(id).set(data);
  }

  // 9. Logs de Status de Transferência
  console.log("Criando logs de status de transferência...");
  const transferLogs = [
    {
      transfer_process_id: 't1111111-1111-1111-1111-111111111111',
      previous_status: 'AGUARDANDO_VENDEDOR_DAR_ENTRADA',
      new_status: 'EM_PROCESSO_DE_TRANSFERENCIA',
      changed_by: '00000000-0000-0000-0000-000000000003',
      notes: 'Entrada dada no despachante credenciado.',
      created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transfer_process_id: 't1111111-1111-1111-1111-111111111111',
      previous_status: 'EM_PROCESSO_DE_TRANSFERENCIA',
      new_status: 'TRANSFERÊNCIA_CONCLUÍDA',
      changed_by: '00000000-0000-0000-0000-000000000003',
      notes: 'CRV digital emitido pelo DETRAN/MA. Venda totalmente finalizada.',
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transfer_process_id: 't2222222-2222-2222-2222-222222222222',
      previous_status: 'AGUARDANDO_VENDEDOR_DAR_ENTRADA',
      new_status: 'DOCUMENTAÇÃO_PENDENTE',
      changed_by: '00000000-0000-0000-0000-000000000003',
      notes: 'Compradora precisa levar o ATPV-e no cartório para reconhecer firma por autenticidade.',
      created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      transfer_process_id: 't2222222-2222-2222-2222-222222222222',
      previous_status: 'DOCUMENTAÇÃO_PENDENTE',
      new_status: 'EM_PROCESSO_DE_TRANSFERENCIA',
      changed_by: '00000000-0000-0000-0000-000000000003',
      notes: 'Firma reconhecida em cartório e documento digitalizado anexado.',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const tl of transferLogs) {
    const id = crypto.randomUUID();
    await db.collection("transfer_status_logs").doc(id).set(tl);
  }

  // 10. Pagamentos (Parcelas)
  console.log("Criando parcelas financeiras...");
  const payments = [
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      amount: 50000.00,
      due_date: '2026-04-28',
      paid_at: '2026-04-28',
      payment_method: 'pix',
      status: 'PAGO',
      installment_number: 0,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      amount: 6934.50,
      due_date: '2026-05-28',
      paid_at: '2026-05-28',
      payment_method: 'boleto',
      status: 'PAGO',
      installment_number: 1,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      amount: 6934.50,
      due_date: '2026-06-28',
      paid_at: null,
      payment_method: null,
      status: 'PENDENTE',
      installment_number: 2,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      contract_id: 'c2222222-2222-2222-2222-222222222222',
      amount: 20000.00,
      due_date: '2026-05-15',
      paid_at: '2026-05-16',
      payment_method: 'transferencia_bancaria',
      status: 'PAGO',
      installment_number: 0,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      contract_id: 'c2222222-2222-2222-2222-222222222222',
      amount: 4900.00,
      due_date: '2026-06-15',
      paid_at: null,
      payment_method: null,
      status: 'PENDENTE',
      installment_number: 1,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const p of payments) {
    const id = crypto.randomUUID();
    await db.collection("payments").doc(id).set(p);
  }

  // 11. Entradas Financeiras (Fluxo de Caixa)
  console.log("Criando fluxo de caixa...");
  const financialEntries = [
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      type: 'RECEITA',
      amount: 50000.00,
      description: 'Recebimento de Entrada - Contrato Corolla #1001',
      entry_date: '2026-04-28',
      category: 'Venda de Veículo'
    },
    {
      contract_id: 'c1111111-1111-1111-1111-111111111111',
      type: 'RECEITA',
      amount: 6934.50,
      description: 'Pagamento Parcela 01 - Contrato Corolla #1001',
      entry_date: '2026-05-28',
      category: 'Financiamento'
    },
    {
      contract_id: 'c2222222-2222-2222-2222-222222222222',
      type: 'RECEITA',
      amount: 20000.00,
      description: 'Recebimento de Entrada - Contrato Jeep Compass #1002',
      entry_date: '2026-05-16',
      category: 'Venda de Veículo'
    },
    {
      contract_id: null,
      type: 'DESPESA',
      amount: 350.00,
      description: 'Pagamento Despachante - Taxa DETRAN Placa Mercosul Corolla',
      entry_date: '2026-05-03',
      category: 'Serviços de Terceiros'
    },
    {
      contract_id: null,
      type: 'DESPESA',
      amount: 1800.00,
      description: 'Limpeza, higienização e polimento de veículos (Serviço Mensal)',
      entry_date: '2026-05-10',
      category: 'Manutenção do Pátio'
    }
  ];

  for (const fe of financialEntries) {
    const id = crypto.randomUUID();
    await db.collection("financial_entries").doc(id).set({
      company_id: companyId,
      ...fe,
      created_at: new Date().toISOString()
    });
  }

  // 12. Logs de Auditoria
  console.log("Criando logs de auditoria...");
  const logs = [
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      action: 'LOGIN',
      ip_address: '191.220.15.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      details: { status: "success", message: "Admin logado com sucesso" },
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      user_id: '00000000-0000-0000-0000-000000000002',
      action: 'CREATE_CONTRACT',
      ip_address: '191.220.15.30',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      details: { contract_id: "c3333333-3333-3333-3333-333333333333", vehicle_plate: "NIO-3040" },
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  for (const l of logs) {
    const id = crypto.randomUUID();
    await db.collection("logs").doc(id).set({
      company_id: companyId,
      ...l
    });
  }

  console.log("Semeadura concluída com sucesso!");
}

seed().catch(err => {
  console.error("Erro fatal na semeadura:", err);
  process.exit(1);
});
