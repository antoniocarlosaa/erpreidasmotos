import { db } from "@/lib/firebase/admin";
import { financialRepository } from "@/repositories/financialRepository";
import { contractRepository } from "@/repositories/contractRepository";
import { Payment, FinancialEntry, PaymentMethod, Contract } from "@/types";

export const financialService = {
  async getPaymentsByContractId(supabase: any, contractId: string): Promise<Payment[]> {
    return financialRepository.getPaymentsByContractId(supabase, contractId);
  },

  async getAllPayments(supabase: any): Promise<(Payment & { contract?: Contract })[]> {
    return financialRepository.getAllPayments(supabase);
  },

  /**
   * Confirma o recebimento de uma parcela ou sinal (entrada)
   */
  async confirmPayment(
    supabase: any,
    paymentId: string,
    params: {
      payment_method: PaymentMethod;
      received_by: string; // UserId
    }
  ): Promise<Payment | null> {
    // 1. Carregar dados da parcela no Firestore
    const paymentDoc = await db.collection("payments").doc(paymentId).get();
    if (!paymentDoc.exists) throw new Error("Parcela não encontrada.");
    const payment = { id: paymentDoc.id, ...paymentDoc.data() } as Payment;

    // 2. Atualizar status da parcela para PAGO
    const updatedPayment = await financialRepository.updatePayment(supabase, paymentId, {
      status: "PAGO",
      paid_at: new Date().toISOString().split("T")[0],
      payment_method: params.payment_method,
    });

    if (!updatedPayment) throw new Error("Erro ao dar baixa na parcela.");

    // 3. Obter contrato associado
    const contract = await contractRepository.getById(supabase, payment.contract_id);
    if (!contract) throw new Error("Contrato associado à parcela não encontrado.");

    // 4. Inserir lançamento de RECEITA ou DESPESA no livro de fluxo de caixa (financial_entries)
    const isRefund = (payment as any).is_refund === true;
    const isDownPayment = payment.installment_number === 0;
    
    let type: "RECEITA" | "DESPESA" = "RECEITA";
    let category = isDownPayment ? "Entrada Veículo" : "Parcela Financiamento";
    let description = "";

    if (isRefund) {
      type = "DESPESA";
      category = "Troco/Volta Cliente";
      description = `Devolução de Troco/Volta - Contrato #${contract.contract_number} (Cliente: ${contract.client?.name})`;
    } else {
      description = isDownPayment
        ? `Entrada recebida - Contrato #${contract.contract_number} (Cliente: ${contract.client?.name})`
        : `Recebimento Parcela ${payment.installment_number}/${contract.installments_count} - Contrato #${contract.contract_number}`;
    }

    await financialRepository.createEntry(supabase, {
      company_id: contract.company_id,
      contract_id: contract.id,
      type,
      amount: payment.amount,
      description,
      entry_date: new Date().toISOString().split("T")[0],
      category,
    });

    // 5. Se for o pagamento da Entrada (parcela 0), registrar data da entrada e avançar status se necessário
    if (isDownPayment) {
      const todayStr = new Date().toISOString().split("T")[0];
      const updateData: any = {
        down_payment_date: todayStr,
      };
      if (contract.status === "FALTA_PAGAMENTO_DE_ENTRADA") {
        updateData.status = "AGUARDANDO_VENDEDOR_DAR_ENTRADA";
      }
      await contractRepository.update(supabase, contract.id, updateData);
    }

    return updatedPayment;
  },

  async getEntries(supabase: any, companyId: string, filters = {}) {
    return financialRepository.getEntries(supabase, companyId, filters);
  },

  /**
   * Cadastra uma despesa administrativa ou operacional (Saída de caixa)
   */
  async createExpense(
    supabase: any,
    params: {
      company_id: string;
      amount: number;
      description: string;
      category: string;
      entry_date: string;
    }
  ): Promise<FinancialEntry | null> {
    if (params.amount <= 0) throw new Error("O valor da despesa deve ser maior que zero.");

    return financialRepository.createEntry(supabase, {
      company_id: params.company_id,
      contract_id: null,
      type: "DESPESA",
      amount: params.amount,
      description: params.description,
      entry_date: params.entry_date,
      category: params.category,
    });
  },
};
