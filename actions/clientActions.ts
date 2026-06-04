"use server";

import { db } from "@/lib/firebase/admin";
import { clientService } from "@/services/clientService";
import { auditService } from "@/services/auditService";
import { Client } from "@/types";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./authActions";

export async function getClients(filters = {}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  return clientService.list(db, { ...filters, company_id: user.company_id });
}

export async function getClientById(id: string) {
  return clientService.getById(db, id);
}

export async function createClient(clientData: Omit<Client, "id" | "company_id" | "created_at" | "updated_at">) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.company_id) {
      throw new Error("Não autorizado.");
    }

    const client = await clientService.create(db, {
      ...clientData,
      company_id: user.company_id,
    });

    if (client) {
      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "CREATE_CLIENT",
        details: { client_id: client.id, client_name: client.name },
      });
    }

    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error: any) {
    console.error("Erro ao cadastrar cliente:", error);
    return { success: false, error: error.message || "Erro ao cadastrar cliente." };
  }
}

export async function updateClient(id: string, clientData: Partial<Omit<Client, "id" | "company_id" | "created_at" | "updated_at">>) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.company_id) {
      throw new Error("Não autorizado.");
    }

    const client = await clientService.update(db, id, clientData);

    if (client) {
      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "UPDATE_CLIENT",
        details: { client_id: id, updated_fields: Object.keys(clientData) },
      });
    }

    revalidatePath("/clients");
    return { success: true, data: client };
  } catch (error: any) {
    console.error("Erro ao atualizar cliente:", error);
    return { success: false, error: error.message || "Erro ao atualizar cliente." };
  }
}

export async function deleteClient(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  // Load client details before deleting
  const client = await clientService.getById(db, id);

  const success = await clientService.delete(db, id);

  if (success && client) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "DELETE_CLIENT",
      details: { 
        client_id: id,
        name: client.name,
        cpf: client.cpf
      },
    });
  }

  revalidatePath("/clients");
  return success;
}
