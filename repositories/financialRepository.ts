import { db } from "@/lib/firebase/admin";
import { Payment, FinancialEntry, Contract } from "@/types";

export type FinancialSummaryFilters = {
  startDate?: string;
  endDate?: string;
};

export const financialRepository = {
  // =========================================================================
  // PARCELAS / PAGAMENTOS DO CONTRATO
  // =========================================================================
  async getPaymentsByContractId(firebaseDb: any, contractId: string): Promise<Payment[]> {
    try {
      const snap = await db.collection("payments")
        .where("contract_id", "==", contractId)
        .get();

      const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Payment);
      
      // Ordenação por número da parcela (installment_number) ascendente
      payments.sort((a, b) => a.installment_number - b.installment_number);
      return payments;
    } catch (error) {
      console.error("Error fetching payments by contract:", error);
      return [];
    }
  },

  async getAllPayments(firebaseDb: any): Promise<(Payment & { contract?: Contract })[]> {
    try {
      const snap = await db.collection("payments").get();
      
      // Carregar contratos e seus relacionamentos relacionados em paralelo
      const paymentsWithContracts = await Promise.all(
        snap.docs.map(async (doc) => {
          const paymentData = doc.data() as Omit<Payment, "id">;
          let contractWithDetails = undefined;

          if (paymentData.contract_id) {
            const cDoc = await db.collection("contracts").doc(paymentData.contract_id).get();
            if (cDoc.exists) {
              const cData = cDoc.data();
              
              // Buscar cliente e veículo vinculados ao contrato
              let client = undefined;
              let vehicle = undefined;

              if (cData?.client_id) {
                const clDoc = await db.collection("clients").doc(cData.client_id).get();
                if (clDoc.exists) client = { id: clDoc.id, ...clDoc.data() };
              }

              if (cData?.vehicle_id) {
                const vDoc = await db.collection("vehicles").doc(cData.vehicle_id).get();
                if (vDoc.exists) vehicle = { id: vDoc.id, ...vDoc.data() };
              }

              contractWithDetails = {
                id: cDoc.id,
                ...cData,
                client,
                vehicle,
              } as any;
            }
          }

          return {
            id: doc.id,
            ...paymentData,
            contract: contractWithDetails,
          } as Payment & { contract?: Contract };
        })
      );

      // Ordenar por data de vencimento (due_date) ascendente
      paymentsWithContracts.sort((a, b) => a.due_date.localeCompare(b.due_date));
      return paymentsWithContracts;
    } catch (error) {
      console.error("Error fetching all payments:", error);
      return [];
    }
  },

  async createPayments(
    firebaseDb: any,
    payments: Omit<Payment, "id" | "created_at">[]
  ): Promise<Payment[]> {
    try {
      const nowStr = new Date().toISOString();
      const batch = db.batch();
      const createdPayments: Payment[] = [];

      payments.forEach((payment) => {
        const id = crypto.randomUUID();
        const paymentData = {
          ...payment,
          created_at: nowStr,
        };
        const ref = db.collection("payments").doc(id);
        batch.set(ref, paymentData);
        createdPayments.push({ id, ...paymentData } as Payment);
      });

      await batch.commit();
      return createdPayments;
    } catch (error: any) {
      console.error("Error creating payments:", error);
      throw new Error(error.message);
    }
  },

  async updatePayment(
    firebaseDb: any,
    id: string,
    payment: Partial<Omit<Payment, "id" | "contract_id" | "created_at">>
  ): Promise<Payment | null> {
    try {
      await db.collection("payments").doc(id).update(payment);
      const updatedDoc = await db.collection("payments").doc(id).get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as Payment;
    } catch (error: any) {
      console.error("Error updating payment:", error);
      throw new Error(error.message);
    }
  },

  // =========================================================================
  // FLUXO DE CAIXA GERAL (RECEITAS / DESPESAS)
  // =========================================================================
  async getEntries(
    firebaseDb: any,
    companyId: string,
    filters: FinancialSummaryFilters = {}
  ): Promise<FinancialEntry[]> {
    try {
      const snap = await db.collection("financial_entries")
        .where("company_id", "==", companyId)
        .get();
      let entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FinancialEntry);

      if (filters.startDate) {
        entries = entries.filter(e => e.entry_date >= filters.startDate!);
      }

      if (filters.endDate) {
        entries = entries.filter(e => e.entry_date <= filters.endDate!);
      }

      // Ordenar por data da transação desc
      entries.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      return entries;
    } catch (error) {
      console.error("Error fetching financial entries:", error);
      return [];
    }
  },

  async createEntry(
    firebaseDb: any,
    entry: Omit<FinancialEntry, "id" | "created_at">
  ): Promise<FinancialEntry | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const entryData = {
        ...entry,
        created_at: nowStr,
      };
      await db.collection("financial_entries").doc(id).set(entryData);
      return { id, ...entryData } as FinancialEntry;
    } catch (error: any) {
      console.error("Error creating financial entry:", error);
      throw new Error(error.message);
    }
  },
};
