"use server";

import { db } from "@/lib/firebase/admin";
import { transferService } from "@/services/transferService";
import { auditService } from "@/services/auditService";
import { ContractStatus } from "@/types";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./authActions";

export async function getTransferProcesses() {
  return transferService.list(db);
}

export async function getTransferProcessById(id: string) {
  return transferService.getById(db, id);
}

export async function getTransferProcessByContractId(contractId: string) {
  return transferService.getByContractId(db, contractId);
}

export async function startTransferProcess(params: {
  contract_id: string;
  forwarded_to?: string;
  entry_date: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const process = await transferService.startTransferProcess(db, {
    ...params,
    responsible_id: user.id,
  });

  if (process) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "START_TRANSFER_PROCESS",
      details: { process_id: process.id, contract_id: params.contract_id },
    });
  }

  revalidatePath("/transfer");
  revalidatePath("/contracts");
  revalidatePath("/dashboard");
  return process;
}

export async function updateTransferStatus(
  processId: string,
  params: {
    new_status: ContractStatus;
    notes?: string;
    forwarded_to?: string;
    receipt_url?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const process = await transferService.updateTransferStatus(db, processId, {
    ...params,
    changed_by: user.id,
  });

  if (process) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "UPDATE_TRANSFER_STATUS",
      details: { process_id: processId, new_status: params.new_status },
    });
  }

  revalidatePath("/transfer");
  revalidatePath("/contracts");
  revalidatePath("/vehicles");
  revalidatePath("/dashboard");
  return process;
}

export async function getTransferLogs(processId: string) {
  return transferService.getStatusLogs(db, processId);
}
