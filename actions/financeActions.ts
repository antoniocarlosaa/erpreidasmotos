"use server";

import { db } from "@/lib/firebase/admin";
import { financialService } from "@/services/financialService";
import { auditService } from "@/services/auditService";
import { PaymentMethod } from "@/types";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./authActions";

export async function getPayments(contractId: string) {
  return financialService.getPaymentsByContractId(db, contractId);
}

export async function getAllPayments() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  const allPayments = await financialService.getAllPayments(db);
  return allPayments.filter((p) => p.contract?.company_id === user.company_id);
}

export async function confirmPayment(
  paymentId: string,
  params: {
    payment_method: PaymentMethod;
  }
) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const payment = await financialService.confirmPayment(db, paymentId, {
    payment_method: params.payment_method,
    received_by: user.id,
  });

  if (payment) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "CONFIRM_PAYMENT",
      details: { payment_id: paymentId, amount: payment.amount, method: params.payment_method },
    });
  }

  revalidatePath("/finance");
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  return payment;
}

export async function getFinancialEntries(filters = {}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  return financialService.getEntries(db, user.company_id, filters);
}

export async function createExpense(params: {
  amount: number;
  description: string;
  category: string;
  entry_date: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const entry = await financialService.createExpense(db, {
    ...params,
    company_id: user.company_id,
  });

  if (entry) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "CREATE_EXPENSE",
      details: { entry_id: entry.id, amount: entry.amount, category: entry.category },
    });
  }

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return entry;
}

export async function deleteFinancialEntry(entryId: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  if (user.role !== "admin") {
    throw new Error("Apenas administradores podem excluir lançamentos financeiros.");
  }

  // Obter o lançamento antes de excluir para auditoria e validação
  const entryDoc = await db.collection("financial_entries").doc(entryId).get();
  if (!entryDoc.exists) {
    throw new Error("Lançamento financeiro não encontrado.");
  }
  const entryData = entryDoc.data();
  if (entryData?.company_id !== user.company_id) {
    throw new Error("Não autorizado a excluir este lançamento.");
  }

  await db.collection("financial_entries").doc(entryId).delete();

  await auditService.logAction(db, {
    user_id: user.id,
    company_id: user.company_id,
    action: "DELETE_FINANCIAL_ENTRY",
    details: { entry_id: entryId, amount: entryData?.amount, type: entryData?.type, description: entryData?.description },
  });

  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return true;
}
