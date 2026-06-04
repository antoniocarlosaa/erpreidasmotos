"use server";

import { db } from "@/lib/firebase/admin";
import { getCurrentUser } from "./authActions";
import { Client, Vehicle, Contract } from "@/types";

export async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  // 1. CARREGAR CONTRATOS DA EMPRESA E SEUS RELACIONAMENTOS (VEÍCULO E CLIENTE)
  const contractsSnap = await db.collection("contracts")
    .where("company_id", "==", user.company_id)
    .get();

  const contracts = await Promise.all(
    contractsSnap.docs.map(async (doc) => {
      const cData = doc.data() as Contract;
      const { id: _, ...restData } = cData;
      let vehicle = undefined;
      let client = undefined;

      if (cData.vehicle_id) {
        const vDoc = await db.collection("vehicles").doc(cData.vehicle_id).get();
        if (vDoc.exists) {
          vehicle = { id: vDoc.id, ...vDoc.data() } as Vehicle;
        }
      }
      if (cData.client_id) {
        const clDoc = await db.collection("clients").doc(cData.client_id).get();
        if (clDoc.exists) {
          client = { id: clDoc.id, ...clDoc.data() } as Client;
        }
      }

      return {
        id: doc.id,
        ...restData,
        vehicle,
        client,
      };
    })
  );

  // 2. CARREGAR VEÍCULOS NO PÁTIO
  const vehiclesSnap = await db.collection("vehicles")
    .where("company_id", "==", user.company_id)
    .get();
  const vehicles = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 3. CARREGAR LANÇAMENTOS FINANCEIROS
  const entriesSnap = await db.collection("financial_entries")
    .where("company_id", "==", user.company_id)
    .get();
  const financialEntries = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 4. CARREGAR PARCELAS A VENCER (PROJEÇÃO)
  const paymentsSnap = await db.collection("payments")
    .where("status", "==", "PENDENTE")
    .get();

  const payments = await Promise.all(
    paymentsSnap.docs.map(async (doc) => {
      const pData = doc.data();
      let contract = undefined;
      if (pData.contract_id) {
        const cDoc = await db.collection("contracts").doc(pData.contract_id).get();
        if (cDoc.exists) {
          contract = { company_id: cDoc.data()?.company_id };
        }
      }
      return {
        id: doc.id,
        ...pData,
        contract,
      };
    })
  );

  const companyPayments = payments.filter(
    (p: any) => p.contract?.company_id === user.company_id
  );

  // =========================================================================
  // CARREGAR E PROCESSAR PÓS-VENDA (GARANTIAS E REVISÕES)
  // =========================================================================
  const activeContractIds = contracts
    .filter(
      (c: any) =>
        c.status !== "AGUARDANDO_INICIAR" &&
        c.status !== "AGUARDANDO_COMPRADOR_FINALIZAR" &&
        c.status !== "AGUARDANDO_VENDEDOR" &&
        c.status !== "TRANSFERÊNCIA_CANCELADA"
    )
    .map(c => c.id);
  
  let activeWarranties = 0;
  let expiredWarranties = 0;
  const activeWarrantiesList: any[] = [];
  
  if (activeContractIds.length > 0) {
    const warrantiesSnap = await db.collection("contract_warranties").get();
    warrantiesSnap.docs.forEach(doc => {
      const wData = doc.data();
      if (activeContractIds.includes(wData.contract_id)) {
        const contract = contracts.find(c => c.id === wData.contract_id);
        const clientName = contract?.client?.name || "Cliente N/A";
        const vehicleInfo = contract?.vehicle 
          ? `${contract.vehicle.brand} ${contract.vehicle.model} (${contract.vehicle.plate})` 
          : "Veículo N/A";

        if (wData.status === "ativa" || wData.status === "proxima_vencimento") {
          activeWarranties++;

          let remainingDays = 0;
          if (wData.end_date) {
            const end = new Date(wData.end_date).getTime();
            const now = new Date().getTime();
            const diff = end - now;
            remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
          }

          activeWarrantiesList.push({
            id: doc.id,
            contract_id: wData.contract_id,
            contract_number: contract?.contract_number || "N/A",
            clientName,
            vehicleInfo,
            type: wData.type || "motor_cambio",
            start_date: wData.start_date ? wData.start_date.split("T")[0] : "N/A",
            end_date: wData.end_date ? wData.end_date.split("T")[0] : "N/A",
            remainingDays,
            status: wData.status,
          });
        } else {
          expiredWarranties++;
        }
      }
    });
  }

  let scheduledReviewsCount = 0;
  let completedReviewsCount = 0;
  const pendingReviewsList: any[] = [];

  if (activeContractIds.length > 0) {
    const reviewsSnap = await db.collection("contract_reviews").get();
    reviewsSnap.docs.forEach(doc => {
      const rData = doc.data();
      if (activeContractIds.includes(rData.contract_id)) {
        const contract = contracts.find(c => c.id === rData.contract_id);
        const clientName = contract?.client?.name || "Cliente N/A";
        const vehicleInfo = contract?.vehicle 
          ? `${contract.vehicle.brand} ${contract.vehicle.model} (${contract.vehicle.plate})` 
          : "Veículo N/A";
        
        rData.revisions.forEach((rev: any) => {
          if (rev.status === "programada") {
            scheduledReviewsCount++;
            pendingReviewsList.push({
              id: doc.id,
              contract_id: rData.contract_id,
              clientName,
              vehicleInfo,
              revisionNumber: rev.number,
              km_expected: rev.km_expected,
              status: rev.status,
            });
          } else if (rev.status === "concluida") {
            completedReviewsCount++;
          }
        });
      }
    });
  }

  // =========================================================================
  // PROCESSAMENTO DE KPIs
  // =========================================================================
  const allContracts = contracts || [];
  const allVehicles = vehicles || [];
  const entries = (financialEntries || []).filter(
    (entry: any) => !entry.contract_id || activeContractIds.includes(entry.contract_id)
  );

  const soldContracts = allContracts.filter(
    (c: any) => 
      c.status !== "AGUARDANDO_COMPRADOR_FINALIZAR" && 
      c.status !== "AGUARDANDO_VENDEDOR" && 
      c.status !== "AGUARDANDO_INICIAR"
  );

  const totalSold = soldContracts.reduce((sum, c: any) => sum + Number(c.total_value), 0);
  const finishedContractsCount = allContracts.filter((c: any) => c.status === "TRANSFERÊNCIA_CONCLUÍDA").length;
  const pendingContractsCount = allContracts.filter(
    (c: any) => 
      c.status !== "TRANSFERÊNCIA_CONCLUÍDA" && 
      c.status !== "AGUARDANDO_COMPRADOR_FINALIZAR" &&
      c.status !== "AGUARDANDO_VENDEDOR" &&
      c.status !== "AGUARDANDO_INICIAR"
  ).length;

  const pendingTransfersCount = allContracts.filter(
    (c: any) =>
      c.status === "EM_PROCESSO_DE_TRANSFERENCIA" ||
      c.status === "AGUARDANDO_DESPACHANTE" ||
      c.status === "DOCUMENTAÇÃO_PENDENTE"
  ).length;

  const pendingDownPaymentsCount = allContracts.filter((c: any) => c.status === "FALTA_PAGAMENTO_DE_ENTRADA").length;
  const vehiclesInStock = allVehicles.filter((v: any) => v.status === "disponivel").length;
  const vehiclesSold = allVehicles.filter((v: any) => v.status === "vendido").length;

  const ticketMedio = soldContracts.length > 0 ? totalSold / soldContracts.length : 0;

  // Cálculo de Tempo Médio de Finalização
  let avgCompletionDays = "4.5 dias";
  const completedWithTime = allContracts.filter(
    (c: any) => c.status === "TRANSFERÊNCIA_CONCLUÍDA" && c.updated_at && c.created_at
  );
  if (completedWithTime.length > 0) {
    const totalDiff = completedWithTime.reduce((sum, c: any) => {
      const start = new Date(c.created_at).getTime();
      const end = new Date(c.updated_at).getTime();
      return sum + (end - start);
    }, 0);
    const avgMs = totalDiff / completedWithTime.length;
    const avgDays = avgMs / (1000 * 60 * 60 * 24);
    avgCompletionDays = `${avgDays.toFixed(1)} dias`;
  }

  // =========================================================================
  // DADOS PARA GRÁFICOS
  // =========================================================================
  
  // A. Vendas Mensais (últimos 6 meses)
  const monthsBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const salesByMonthMap: Record<string, number> = {};

  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = `${monthsBR[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
    salesByMonthMap[label] = 0;
  }

  soldContracts.forEach((c: any) => {
    const date = new Date(c.created_at);
    const label = `${monthsBR[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
    if (salesByMonthMap[label] !== undefined) {
      salesByMonthMap[label] += Number(c.total_value);
    }
  });

  const chartSales = Object.entries(salesByMonthMap).map(([name, valor]) => ({
    name,
    valor,
  }));

  // B. Contratos por Status
  const statusCounts: Record<string, number> = {
    "Aguardando Assinatura": 0,
    "Aguardando Sinal": 0,
    "Em Transferência": 0,
    "Finalizado": 0,
  };

  allContracts.forEach((c: any) => {
    if (
      c.status === "AGUARDANDO_COMPRADOR_FINALIZAR" || 
      c.status === "AGUARDANDO_VENDEDOR" || 
      c.status === "AGUARDANDO_INICIAR"
    ) {
      statusCounts["Aguardando Assinatura"]++;
    } else if (c.status === "FALTA_PAGAMENTO_DE_ENTRADA") {
      statusCounts["Aguardando Sinal"]++;
    } else if (c.status === "TRANSFERÊNCIA_CONCLUÍDA") {
      statusCounts["Finalizado"]++;
    } else {
      statusCounts["Em Transferência"]++;
    }
  });

  const chartStatus = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // C. Projeção Financeira
  const projectionMap: Record<string, number> = {};
  for (let i = 0; i < 4; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const label = `${monthsBR[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
    projectionMap[label] = 0;
  }

  companyPayments.forEach((p: any) => {
    const dueDate = new Date(p.due_date);
    const fixedLabel = `${monthsBR[dueDate.getMonth()]}/${String(dueDate.getFullYear()).slice(-2)}`;
    if (projectionMap[fixedLabel] !== undefined) {
      projectionMap[fixedLabel] += Number(p.amount);
    }
  });

  const chartProjection = Object.entries(projectionMap).map(([name, valor]) => ({
    name,
    valor,
  }));

  // D. Fluxo de Caixa Realizado (Entradas vs Saídas)
  const cashFlowMap: Record<string, { receitas: number; despesas: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = `${monthsBR[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
    cashFlowMap[label] = { receitas: 0, despesas: 0 };
  }

  entries.forEach((entry: any) => {
    const date = new Date(entry.entry_date);
    const label = `${monthsBR[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
    if (cashFlowMap[label] !== undefined) {
      if (entry.type === "RECEITA") {
        cashFlowMap[label].receitas += Number(entry.amount);
      } else {
        cashFlowMap[label].despesas += Number(entry.amount);
      }
    }
  });

  const chartCashFlow = Object.entries(cashFlowMap).map(([name, flow]) => ({
    name,
    receitas: flow.receitas,
    despesas: flow.despesas,
  }));

  // E. Categoria de Veículos Vendidos
  let countCarros = 0;
  let countMotos = 0;

  soldContracts.forEach((c: any) => {
    if (c.vehicle?.category === "carro") {
      countCarros++;
    } else if (c.vehicle?.category === "moto") {
      countMotos++;
    }
  });

  const chartCategory = [
    { name: "Carros", value: countCarros },
    { name: "Motos", value: countMotos },
  ];

  const recentContracts = [...contracts]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      contract_number: c.contract_number,
      clientName: c.client?.name || "N/A",
      vehicleInfo: c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model} (${c.vehicle.plate})` : "N/A",
      total_value: Number(c.total_value || 0),
      modality: c.modality,
      status: c.status,
      created_at: c.created_at
    }));

  return {
    kpis: {
      totalSold,
      finishedContractsCount,
      pendingContractsCount,
      pendingTransfersCount,
      pendingDownPaymentsCount,
      vehiclesInStock,
      vehiclesSold,
      ticketMedio,
      avgCompletionDays,
      activeWarranties,
      expiredWarranties,
      scheduledReviewsCount,
    },
    charts: {
      chartSales,
      chartStatus,
      chartProjection,
      chartCashFlow,
      chartCategory,
      chartWarranties: [
        { name: "Ativas", value: activeWarranties },
        { name: "Vencidas", value: expiredWarranties },
      ],
      chartReviews: [
        { name: "Programadas", value: scheduledReviewsCount },
        { name: "Concluídas", value: completedReviewsCount },
      ],
      pendingReviewsList: pendingReviewsList.slice(0, 5),
      activeWarrantiesList: activeWarrantiesList.slice(0, 5),
      recentContracts,
      recentTransactions: [...entries]
        .sort((a: any, b: any) => new Date(b.entry_date || 0).getTime() - new Date(a.entry_date || 0).getTime())
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount || 0),
          type: t.type,
          category: t.category,
          entry_date: t.entry_date,
          payment_method: t.payment_method
        })),
    },
  };
}
