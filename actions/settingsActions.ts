"use server";

import { db, auth } from "@/lib/firebase/admin";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/types";
import { auditService } from "@/services/auditService";
import { contractRepository } from "@/repositories/contractRepository";

export async function getCompanyDetails() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  
  const doc = await db.collection("companies").doc(user.company_id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as any;
}

export async function updateCompanyDetails(data: {
  name: string;
  document: string;
  address?: string;
  phone?: string;
  email?: string;
  admin_signature?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("Não autorizado.");
  }

  await db.collection("companies").doc(user.company_id).update({
    ...data,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getCompanyEmployees() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const snap = await db.collection("users")
    .where("company_id", "==", user.company_id)
    .get();

  const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return list as any[];
}

export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("Não autorizado.");
  }

  try {
    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
    });

    const nowStr = new Date().toISOString();
    await db.collection("users").doc(userRecord.uid).set({
      company_id: user.company_id,
      name: data.name,
      email: data.email,
      role: data.role,
      created_at: nowStr,
      updated_at: nowStr,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao cadastrar funcionário:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(employeeId: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("Não autorizado.");
  }

  if (employeeId === user.id) {
    return { success: false, error: "Você não pode excluir a sua própria conta." };
  }

  try {
    // Excluir do Firebase Auth se possível (silencioso caso falhe)
    await auth.deleteUser(employeeId).catch(() => {});
    // Excluir do Firestore
    await db.collection("users").doc(employeeId).delete();

    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir funcionário:", error);
    return { success: false, error: error.message };
  }
}

export async function getCompanyAuditLogs(limit = 100) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("Não autorizado.");
  }
  return auditService.listLogs(db, user.company_id, limit);
}

export async function resetCompanyData() {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("Não autorizado.");
  }

  try {
    const companyId = user.company_id;

    // 1. Obter todos os contratos da empresa
    const contractsSnap = await db.collection("contracts")
      .where("company_id", "==", companyId)
      .get();

    // Para cada contrato, executar a exclusão em cascata
    for (const doc of contractsSnap.docs) {
      await contractRepository.delete(db, doc.id);
    }

    // 2. Deletar todos os clientes da empresa
    const clientsSnap = await db.collection("clients")
      .where("company_id", "==", companyId)
      .get();
    
    // Deletar em lotes (máximo 500 por lote, mas para reset comum deve ser pequeno)
    if (!clientsSnap.empty) {
      const clientBatch = db.batch();
      clientsSnap.docs.forEach(doc => clientBatch.delete(doc.ref));
      await clientBatch.commit();
    }

    // 3. Deletar lançamentos financeiros da empresa
    const entriesSnap = await db.collection("financial_entries")
      .where("company_id", "==", companyId)
      .get();
    
    if (!entriesSnap.empty) {
      const entryBatch = db.batch();
      entriesSnap.docs.forEach(doc => entryBatch.delete(doc.ref));
      await entryBatch.commit();
    }

    // 4. Deletar todos os logs de auditoria da empresa
    const logsSnap = await db.collection("logs")
      .where("company_id", "==", companyId)
      .get();
    
    if (!logsSnap.empty) {
      const logsBatch = db.batch();
      logsSnap.docs.forEach(doc => logsBatch.delete(doc.ref));
      await logsBatch.commit();
    }

    // 5. Atualizar o status de todos os veículos restantes da empresa para "disponivel"
    const vehiclesSnap = await db.collection("vehicles")
      .where("company_id", "==", companyId)
      .get();

    if (!vehiclesSnap.empty) {
      const vehicleBatch = db.batch();
      vehiclesSnap.docs.forEach(doc => {
        vehicleBatch.update(doc.ref, {
          status: "disponivel",
          updated_at: new Date().toISOString()
        });
      });
      await vehicleBatch.commit();
    }

    // Gravar o log da ação de reset como o primeiro log após a limpeza
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: companyId,
      action: "RESET_COMPANY_DATA",
      details: { reset_by: user.name, timestamp: new Date().toISOString() }
    });

    revalidatePath("/settings");
    revalidatePath("/finance");
    revalidatePath("/contracts");
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao resetar dados da empresa:", error);
    return { success: false, error: error.message };
  }
}

export async function clearAuditLogs() {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("Não autorizado.");
  }

  try {
    const companyId = user.company_id;

    // Obter todos os logs da empresa
    const logsSnap = await db.collection("logs")
      .where("company_id", "==", companyId)
      .get();
    
    if (!logsSnap.empty) {
      const logsBatch = db.batch();
      logsSnap.docs.forEach(doc => logsBatch.delete(doc.ref));
      await logsBatch.commit();
    }

    // Gravar o log da ação de limpeza como o primeiro log após a limpeza
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: companyId,
      action: "CLEAR_AUDIT_LOGS",
      details: { cleared_by: user.name, timestamp: new Date().toISOString() }
    });

    revalidatePath("/settings");

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao limpar logs de auditoria:", error);
    return { success: false, error: error.message };
  }
}
