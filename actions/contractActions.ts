"use server";

import { db } from "@/lib/firebase/admin";
import { contractService } from "@/services/contractService";
import { auditService } from "@/services/auditService";
import { clientService } from "@/services/clientService";
import { vehicleService } from "@/services/vehicleService";
import { vehicleRepository } from "@/repositories/vehicleRepository";
import { clientRepository } from "@/repositories/clientRepository";
import { Contract, Signature, ContractStatus, ContractChecklist, ContractTransferProcess, ContractReview, ContractWarranty } from "@/types";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./authActions";
import { generatePDF, generateDOCX } from "@/lib/documentGenerator";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function getContracts(filters = {}) {
  return contractService.list(db, filters);
}

export async function getContractById(id: string) {
  return contractService.getById(db, id);
}

export async function createContract(contractData: any) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.company_id) {
      throw new Error("Não autorizado.");
    }

    let clientId = contractData.client_id;
    let vehicleId = contractData.vehicle_id;

    // 1. Cadastro inline de cliente caso seja um novo cliente
    if (contractData.client && !clientId) {
      const rawCpf = (contractData.client.cpf || "").replace(/\D/g, "");
      const existingClient = await clientRepository.getByCPF(db, rawCpf);
      
      if (existingClient && existingClient.company_id === user.company_id) {
        // Se o cliente com esse CPF já existe na concessionária, reaproveita o ID e atualiza os dados
        clientId = existingClient.id;
        await clientService.update(db, existingClient.id, {
          ...contractData.client,
          company_id: user.company_id,
        });
      } else {
        const newClient = await clientService.create(db, {
          ...contractData.client,
          company_id: user.company_id,
        });
        if (!newClient) throw new Error("Erro ao cadastrar cliente inline.");
        clientId = newClient.id;
      }
    }

    // 2. Cadastro inline de veículo caso tenha sido digitado manualmente
    if (contractData.vehicle && !vehicleId) {
      const plate = contractData.vehicle.plate.toUpperCase().trim();
      const existing = await vehicleRepository.getByPlate(db, plate);
      if (existing && existing.company_id === user.company_id) {
        // Deixa a alteração de status para "reservado" ser tratada no contractService.createContract
        vehicleId = existing.id;
      } else {
        const newVehicle = await vehicleService.create(db, {
          ...contractData.vehicle,
          company_id: user.company_id,
          status: "disponivel", // Cria como "disponivel" para passar na validação e ser reservado no contractService
          photos: contractData.vehicle.photos || [],
        });
        if (!newVehicle) throw new Error("Erro ao cadastrar veículo inline.");
        vehicleId = newVehicle.id;
      }
    }

    // 3. Criar proposta de contrato no Firestore
    const contract = await contractService.createContract(db, {
      client_id: clientId,
      vehicle_id: vehicleId,
      total_value: Number(contractData.total_value),
      down_payment: Number(contractData.down_payment || 0),
      installments_count: Number(contractData.installments_count || 0),
      interest_rate: Number(contractData.interest_rate || 0),
      warranty_text: contractData.warranty_text || "",
      notes: contractData.notes || "",
      custom_clauses: contractData.custom_clauses || [],
      status: contractData.status || "AGUARDANDO_INICIAR",
      modality: contractData.modality || "vista",
      former_owner_name: contractData.former_owner_name || "",
      former_owner_cpf: contractData.former_owner_cpf || "",
      delivery_km: Number(contractData.delivery_km || 0),
      warranty_period_days: Number(contractData.warranty_period_days || 90),
      warranty_type: contractData.warranty_type || "motor_cambio",
      payment_method: contractData.payment_method || "pix",
      has_remaining_balance: Boolean(contractData.has_remaining_balance),
      negotiation_agreement: contractData.negotiation_agreement || "",
      company_id: user.company_id,
      seller_id: user.id,
      // Novos campos de Compra de Veículo
      appraised_value: contractData.appraised_value ? Number(contractData.appraised_value) : undefined,
      detran_debt: contractData.detran_debt ? Number(contractData.detran_debt) : undefined,
      fines_debt: contractData.fines_debt ? Number(contractData.fines_debt) : undefined,
      bank_payout: contractData.bank_payout ? Number(contractData.bank_payout) : undefined,
      atpve_intention_type: contractData.atpve_intention_type || undefined,
      net_value: contractData.net_value ? Number(contractData.net_value) : undefined,
      purchase_date: contractData.purchase_date || undefined,
      has_dut: contractData.has_dut !== undefined ? Boolean(contractData.has_dut) : undefined,
      has_spare_key: contractData.has_spare_key !== undefined ? Boolean(contractData.has_spare_key) : undefined,
      has_manual: contractData.has_manual !== undefined ? Boolean(contractData.has_manual) : undefined,
      former_owner_phone: contractData.former_owner_phone || undefined,
      seller_representative_type: contractData.seller_representative_type || undefined,
      broker_name: contractData.broker_name || undefined,
      broker_phone: contractData.broker_phone || undefined,
      // Campos de Consignação
      consignation_period_days: contractData.consignation_period_days ? Number(contractData.consignation_period_days) : undefined,
      consignation_owner_value: contractData.consignation_owner_value ? Number(contractData.consignation_owner_value) : undefined,
    });

    if (contract) {
      // 4. Gravar log de auditoria
      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "CREATE_CONTRACT",
        details: { contract_id: contract.id, total_value: contract.total_value, modality: contract.modality },
      });

      // 5. Inicializar Timeline Operacional
      await logTimelineEvent(contract.id, {
        event_type: "CONTRATO_CRIADO",
        description: `Contrato de venda na modalidade ${contract.modality.toUpperCase()} criado por ${user.name}.`,
        user_id: user.id,
        user_name: user.name,
      });

      // 6. Inicializar Pós-Venda: Garantia
      const warrantyDays = Number(contractData.warranty_period_days || 90);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + warrantyDays);

      await db.collection("contract_warranties").add({
        contract_id: contract.id,
        type: contractData.warranty_type || "motor_cambio",
        period_days: warrantyDays,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: "ativa",
      });

      // 7. Inicializar Pós-Venda: Controle de Revisões Programadas
      const delKm = Number(contractData.delivery_km || 0);
      await db.collection("contract_reviews").add({
        contract_id: contract.id,
        km_delivery: delKm,
        revisions: [
          { number: 1, km_expected: delKm + 500, status: "programada" },
          { number: 2, km_expected: delKm + 1000, status: "programada" },
          { number: 3, km_expected: delKm + 2000, status: "programada" },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 8. Inicializar Processo de Transferência padrão
      await db.collection("transfer_process").doc(contract.id).set({
        contract_id: contract.id,
        entry_date: new Date().toISOString().split("T")[0],
        responsible_id: user.id,
        forwarded_to: "despachante",
        notes: "Processo de transferência de documentos iniciado automaticamente com a criação da proposta.",
        receipt_url: null,
        status: "AGUARDANDO_VENDEDOR_DAR_ENTRADA",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    revalidatePath("/contracts");
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { success: true, data: contract };
  } catch (error: any) {
    console.error("Erro ao registrar proposta:", error);
    return { success: false, error: error.message || "Falha na criação do contrato." };
  }
}

export async function updateContract(
  id: string,
  contractData: Partial<Omit<Contract, "id" | "contract_number" | "company_id" | "created_at" | "updated_at">>
) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const contract = await contractService.updateContract(db, id, contractData, user.id);

  if (contract) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "UPDATE_CONTRACT",
      details: { contract_id: id, updated_fields: Object.keys(contractData) },
    });

    await logTimelineEvent(id, {
      event_type: "CONTRATO_ATUALIZADO",
      description: `Contrato de venda atualizado por ${user.name}. Campos: ${Object.keys(contractData).join(", ")}.`,
      user_id: user.id,
      user_name: user.name,
    });
  }

  revalidatePath(`/contracts/${id}`);
  revalidatePath("/contracts");
  return contract;
}

export async function signContract(params: {
  contract_id: string;
  signature_data: string; // Base64
  role: "comprador" | "vendedor";
  ip_address: string;
  user_agent: string;
  location?: string;
}) {
  const signature = await contractService.registerSignature(db, params);

  if (signature) {
    const user = await getCurrentUser().catch(() => null);
    await auditService.logAction(db, {
      user_id: user ? user.id : null,
      company_id: user ? user.company_id : null,
      action: `SIGN_CONTRACT_${params.role.toUpperCase()}`,
      details: { contract_id: params.contract_id, ip: params.ip_address },
    });

    await logTimelineEvent(params.contract_id, {
      event_type: "CONTRATO_ASSINADO",
      description: `Contrato assinado digitalmente pelo ${params.role.toUpperCase()} (${user ? user.name : "Cliente"}).`,
      user_id: user ? user.id : null,
      user_name: user ? user.name : "Comprador",
    });
  }

  revalidatePath(`/contracts/${params.contract_id}`);
  revalidatePath("/contracts");
  revalidatePath("/transfer");
  revalidatePath("/dashboard");

  return signature;
}

export async function deleteContract(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  // Load contract details before deleting
  const contract = await contractService.getById(db, id);

  const success = await contractService.delete(db, id);

  if (success && contract) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "DELETE_CONTRACT",
      details: { 
        contract_id: id,
        contract_number: contract.contract_number,
        client_name: contract.client?.name || "Desconhecido",
        vehicle_plate: contract.vehicle?.plate || "Desconhecida",
        vehicle_model: contract.vehicle?.model || "Desconhecido"
      },
    });
  }

  revalidatePath("/contracts");
  revalidatePath("/vehicles");
  revalidatePath("/dashboard");
  return success;
}

export async function getContractSignatures(contractId: string) {
  try {
    const snap = await db.collection("signatures")
      .where("contract_id", "==", contractId)
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Signature);
  } catch (error) {
    console.error("Error fetching signatures in action:", error);
    return [];
  }
}

export async function generateContractPDF(contractId: string) {
  const contract = await contractService.getById(db, contractId);
  if (!contract) throw new Error("Contrato não encontrado.");

  const signaturesList = await getContractSignatures(contractId);
  return generatePDF(contract, signaturesList);
}

// =========================================================================
// NOVAS AÇÕES OPERACIONAIS (CHECKLIST, TIMELINE, TRANSFERÊNCIA E PÓS-VENDA)
// =========================================================================

export async function getContractChecklist(contractId: string) {
  try {
    const snap = await db.collection("contract_checklists")
      .where("contract_id", "==", contractId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as ContractChecklist;
  } catch (error) {
    console.error("Erro ao carregar checklist:", error);
    return null;
  }
}

export async function saveContractChecklist(checklistData: {
  contract_id: string;
  items: any[];
  buyer_signature?: string;
  inspector_signature?: string;
  inspector_id: string;
  inspector_name: string;
}) {
  try {
    const snap = await db.collection("contract_checklists")
      .where("contract_id", "==", checklistData.contract_id)
      .limit(1)
      .get();

    const nowStr = new Date().toISOString();
    let resId = "";

    if (snap.empty) {
      const docRef = await db.collection("contract_checklists").add({
        ...checklistData,
        created_at: nowStr,
      });
      resId = docRef.id;
    } else {
      resId = snap.docs[0].id;
      await db.collection("contract_checklists").doc(resId).update({
        items: checklistData.items,
        buyer_signature: checklistData.buyer_signature || snap.docs[0].data().buyer_signature || "",
        inspector_signature: checklistData.inspector_signature || snap.docs[0].data().inspector_signature || "",
        inspector_id: checklistData.inspector_id,
        inspector_name: checklistData.inspector_name,
      });
    }

    // Registrar evento na Timeline
    await logTimelineEvent(checklistData.contract_id, {
      event_type: "CHECKLIST_SALVO",
      description: `Checklist de vistoria de entrega preenchido por ${checklistData.inspector_name}.`,
      user_id: checklistData.inspector_id,
      user_name: checklistData.inspector_name,
    });

    revalidatePath(`/contracts/${checklistData.contract_id}`);
    return { success: true, id: resId };
  } catch (error: any) {
    console.error("Erro ao salvar checklist:", error);
    throw new Error(error.message || "Falha ao gravar vistoria.");
  }
}

export async function getContractTimeline(contractId: string) {
  try {
    const snap = await db.collection("contract_timelines")
      .where("contract_id", "==", contractId)
      .get();
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    list.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return list;
  } catch (error) {
    console.error("Erro ao carregar timeline:", error);
    return [];
  }
}

export async function logTimelineEvent(contractId: string, event: {
  event_type: string;
  description: string;
  user_id: string | null;
  user_name: string;
}) {
  try {
    await db.collection("contract_timelines").add({
      contract_id: contractId,
      event_type: event.event_type,
      description: event.description,
      user_id: event.user_id,
      user_name: event.user_name,
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Erro ao logar evento na timeline:", error);
    return false;
  }
}

export async function getContractWarranty(contractId: string): Promise<ContractWarranty | null> {
  try {
    const snap = await db.collection("contract_warranties")
      .where("contract_id", "==", contractId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as ContractWarranty;
  } catch (error) {
    console.error("Erro ao carregar garantia:", error);
    return null;
  }
}

export async function getContractReview(contractId: string): Promise<ContractReview | null> {
  try {
    const snap = await db.collection("contract_reviews")
      .where("contract_id", "==", contractId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as ContractReview;
  } catch (error) {
    console.error("Erro ao carregar revisões:", error);
    return null;
  }
}

export async function updateContractReview(
  reviewId: string,
  revisions: any[],
  contractId: string
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado.");

  try {
    await db.collection("contract_reviews").doc(reviewId).update({
      revisions,
      updated_at: new Date().toISOString(),
    });

    await logTimelineEvent(contractId, {
      event_type: "TROCA_OLEO_ATUALIZADA",
      description: `Trocas de óleo periódicas do pós-venda atualizadas por ${user.name}.`,
      user_id: user.id,
      user_name: user.name,
    });

    revalidatePath(`/contracts/${contractId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao atualizar trocas de óleo:", error);
    throw new Error(error.message);
  }
}

export async function generateContractDOCX(contractId: string) {
  const contract = await contractService.getById(db, contractId);
  if (!contract) throw new Error("Contrato não encontrado.");

  const signaturesList = await getContractSignatures(contractId);
  const docxBuffer = generateDOCX(contract, signaturesList);
  return docxBuffer.toString("base64");
}

export async function getContractTransfer(contractId: string): Promise<ContractTransferProcess | null> {
  try {
    const snap = await db.collection("transfer_process").doc(contractId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as ContractTransferProcess;
  } catch (error) {
    console.error("Erro ao buscar processo de transferência:", error);
    return null;
  }
}

export async function updateContractTransfer(
  contractId: string,
  transferData: {
    forwarded_to: string;
    notes?: string;
    status: string;
    receipt_url?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado.");

  try {
    const processRef = db.collection("transfer_process").doc(contractId);
    const processSnap = await processRef.get();
    const oldStatus = processSnap.exists ? processSnap.data()?.status || "AGUARDANDO_VENDEDOR_DAR_ENTRADA" : "AGUARDANDO_VENDEDOR_DAR_ENTRADA";

    const updatePayload = {
      forwarded_to: transferData.forwarded_to,
      notes: transferData.notes || "",
      status: transferData.status,
      receipt_url: transferData.receipt_url || null,
      updated_at: new Date().toISOString(),
    };

    await processRef.set(updatePayload, { merge: true });

    // Atualizar status do contrato principal
    await db.collection("contracts").doc(contractId).update({
      status: transferData.status,
      updated_at: new Date().toISOString(),
    });

    // Registrar histórico operacional
    await db.collection("transfer_status_logs").add({
      transfer_process_id: contractId,
      previous_status: oldStatus,
      new_status: transferData.status,
      changed_by: user.id,
      notes: transferData.notes || "Alteração de status do processo de transferência.",
      created_at: new Date().toISOString(),
    });

    // Logar evento na timeline
    await logTimelineEvent(contractId, {
      event_type: "MUDANCA_STATUS",
      description: `Status de transferência alterado de ${oldStatus} para ${transferData.status} por ${user.name}.`,
      user_id: user.id,
      user_name: user.name,
    });

    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/contracts");
    revalidatePath("/transfer");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao atualizar transferência:", error);
    throw new Error(error.message);
  }
}

// Public signature wrapper for the public signing flow
export async function getPublicContractById(id: string) {
  return contractService.getById(db, id);
}

export async function getPublicContractSignatures(contractId: string) {
  return getContractSignatures(contractId);
}

export async function signPublicContract(params: {
  contract_id: string;
  signature_data: string; // Base64
  ip_address: string;
  user_agent: string;
  location?: string;
}) {
  const contract = await contractService.getById(db, params.contract_id);
  if (!contract) throw new Error("Contrato não encontrado.");

  const role = (contract.modality === "compra" || contract.modality === "consignado") ? "vendedor" : "comprador";

  const signature = await contractService.registerSignature(db, {
    ...params,
    role,
  });

  if (signature) {
    await auditService.logAction(db, {
      user_id: null,
      company_id: null,
      action: `SIGN_CONTRACT_${role.toUpperCase()}_PUBLIC`,
      details: { contract_id: params.contract_id, ip: params.ip_address },
    });

    const isConsigned = contract.modality === "consignado";
    await logTimelineEvent(params.contract_id, {
      event_type: "CONTRATO_ASSINADO",
      description: `Contrato assinado digitalmente pelo ${isConsigned ? "CONSIGNANTE" : (role === "vendedor" ? "VENDEDOR (CLIENTE)" : "COMPRADOR")} no link público.`,
      user_id: null,
      user_name: isConsigned ? "Consignante (Link Público)" : (role === "vendedor" ? "Vendedor (Link Público)" : "Comprador (Link Público)"),
    });
  }

  revalidatePath(`/contracts/${params.contract_id}`);
  revalidatePath(`/contracts/${params.contract_id}/sign`);
  revalidatePath("/contracts");
  revalidatePath("/transfer");
  revalidatePath("/dashboard");

  return signature;
}

export async function getContractTransferLogs(contractId: string) {
  try {
    const snap = await db.collection("transfer_status_logs")
      .where("transfer_process_id", "==", contractId)
      .get();
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  } catch (error) {
    console.error("Erro ao buscar logs de transferência:", error);
    return [];
  }
}

export async function generateDeliveryTermPDF(contractId: string) {
  const contract = await contractService.getById(db, contractId);
  if (!contract) throw new Error("Contrato não encontrado.");

  const checklist = await getContractChecklist(contractId);
  if (!checklist) throw new Error("Checklist não preenchido.");

  const pdfDoc = await PDFDocument.create();
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]);
  let y = 800;

  page.drawText("TERMO DE VISTORIA E ENTREGA DO VEÍCULO", {
    x: 50,
    y,
    size: 14,
    font: fontBold,
  });
  y -= 25;

  page.drawText(`Vínculo Contratual: #${contract.contract_number}`, {
    x: 50,
    y,
    size: 10,
    font: fontNormal,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  // Descrição do Veículo
  const vehicle = contract.vehicle;
  page.drawText("1. DADOS DO VEÍCULO ENTREGUE", { x: 50, y, size: 11, font: fontBold });
  y -= 18;
  const desc = `${vehicle?.brand || ""} ${vehicle?.model || ""} - Placa: ${vehicle?.plate || ""} - KM: ${contract.delivery_km || vehicle?.mileage || 0} km`;
  page.drawText(desc, { x: 50, y, size: 9, font: fontNormal });
  y -= 30;

  // Itens vistoriados
  page.drawText("2. ITENS AVALIADOS NA VISTORIA", { x: 50, y, size: 11, font: fontBold });
  y -= 18;

  const items = checklist.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const statusLabel = item.status === "CONFORME" ? "[C] Conforme" : item.status === "NAO_CONFORME" ? "[NC] Não Conforme" : "[AV] Avariado";
    const itemText = `- ${item.name}: ${statusLabel} ${item.notes ? `(${item.notes})` : ""}`;
    
    const xPos = i % 2 === 0 ? 50 : 300;
    page.drawText(itemText.substring(0, 50), { x: xPos, y, size: 8, font: fontNormal });
    
    if (i % 2 === 1) {
      y -= 12;
    }
  }
  if (items.length % 2 !== 0) {
    y -= 12;
  }
  y -= 25;

  // Assinaturas
  page.drawText("3. DECLARAÇÃO DE RECEBIMENTO E CONCORDÂNCIA", { x: 50, y, size: 11, font: fontBold });
  y -= 15;
  const declaration = "O comprador declara receber o veículo acima nas condições descritas neste checklist, atestando o perfeito estado de funcionamento dos itens assinalados.";
  page.drawText(declaration, { x: 50, y, size: 8, font: fontNormal });
  y -= 60;

  page.drawText("ASSINATURA COMPRADOR:", { x: 50, y: y + 45, size: 8, font: fontBold });
  if (checklist.buyer_signature) {
    try {
      const imageBytes = Buffer.from(checklist.buyer_signature.split(",")[1], "base64");
      const pngImage = await pdfDoc.embedPng(imageBytes);
      page.drawImage(pngImage, { x: 50, y: y - 5, width: 120, height: 40 });
    } catch (e) {
      console.error(e);
    }
    page.drawText(contract.client?.name || "N/A", { x: 50, y: y - 15, size: 7, font: fontNormal });
  } else {
    page.drawText("Pendente", { x: 50, y: y + 15, size: 8, font: fontNormal, color: rgb(0.8, 0.2, 0.2) });
  }

  page.drawText("ASSINATURA RESPONSÁVEL VISTORIA:", { x: 300, y: y + 45, size: 8, font: fontBold });
  if (checklist.inspector_signature) {
    try {
      const imageBytes = Buffer.from(checklist.inspector_signature.split(",")[1], "base64");
      const pngImage = await pdfDoc.embedPng(imageBytes);
      page.drawImage(pngImage, { x: 300, y: y - 5, width: 120, height: 40 });
    } catch (e) {
      console.error(e);
    }
    page.drawText(checklist.inspector_name || "Vistoriador", { x: 300, y: y - 15, size: 7, font: fontNormal });
  } else {
    page.drawText("Pendente", { x: 300, y: y + 15, size: 8, font: fontNormal, color: rgb(0.8, 0.2, 0.2) });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}
