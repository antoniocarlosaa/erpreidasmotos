"use server";

import { db } from "@/lib/firebase/admin";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";
import { auditService } from "@/services/auditService";
import {
  WorkshopProduct,
  WorkshopEntry,
  WorkshopExit,
  WorkshopMaintenance,
  WorkshopAppointment,
  WorkshopMaintenanceStatus,
} from "@/types";

// ==========================================
// 1. GERENCIAMENTO DE PRODUTOS / PEÇAS
// ==========================================

export async function getWorkshopProducts() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const snap = await db.collection("products")
      .where("company_id", "==", user.company_id)
      .get();

    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return list as WorkshopProduct[];
  } catch (error) {
    console.error("Erro ao obter produtos do estoque:", error);
    return [];
  }
}

export async function saveWorkshopProduct(data: {
  id?: string;
  name: string;
  vehicleModel: string;
  category: string;
  stock: number;
  unitValue: number;
  imageUrl?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  const nowStr = new Date().toISOString();
  const id = data.id || crypto.randomUUID();

  try {
    const productData = {
      company_id: user.company_id,
      name: data.name,
      vehicleModel: data.vehicleModel,
      category: data.category,
      stock: Number(data.stock),
      unitValue: Number(data.unitValue),
      imageUrl: data.imageUrl || "",
      updated_at: nowStr,
    };

    if (data.id) {
      await db.collection("products").doc(id).update(productData);
      
      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "UPDATE_WORKSHOP_PRODUCT",
        details: { product_id: id, name: data.name },
      });
    } else {
      const newProduct = {
        ...productData,
        created_at: nowStr,
      };
      await db.collection("products").doc(id).set(newProduct);

      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "CREATE_WORKSHOP_PRODUCT",
        details: { product_id: id, name: data.name },
      });
    }

    revalidatePath("/workshop/inventory");
    revalidatePath("/workshop");
    return { success: true, id };
  } catch (error: any) {
    console.error("Erro ao salvar produto:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteWorkshopProduct(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") throw new Error("Não autorizado.");

  try {
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) return { success: false, error: "Produto não encontrado." };
    
    const pData = doc.data();
    await db.collection("products").doc(id).delete();

    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "DELETE_WORKSHOP_PRODUCT",
      details: { product_id: id, name: pData?.name },
    });

    revalidatePath("/workshop/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir produto:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 2. ENTRADAS E SAÍDAS DO ESTOQUE
// ==========================================

export async function registerStockEntry(data: {
  productId: string;
  quantity: number;
  invoiceValue: number;
  invoiceNumber: string;
  buyerName: string;
  storeName: string;
  date: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const productRef = db.collection("products").doc(data.productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) return { success: false, error: "Produto não encontrado." };

    const product = productDoc.data() as WorkshopProduct;
    const nowStr = new Date().toISOString();
    const entryId = crypto.randomUUID();

    const entryQty = Number(data.quantity);
    const unitValue = product.unitValue;
    const totalValue = entryQty * unitValue;

    // 1. Criar o registro de entrada
    const newEntry: Omit<WorkshopEntry, "id"> = {
      company_id: user.company_id,
      productId: data.productId,
      productName: product.name,
      vehicleModel: product.vehicleModel,
      category: product.category,
      quantity: entryQty,
      totalValue,
      invoiceValue: Number(data.invoiceValue),
      invoiceNumber: data.invoiceNumber,
      buyerName: data.buyerName,
      storeName: data.storeName,
      date: data.date || nowStr.split("T")[0],
      authorUid: user.id,
      created_at: nowStr,
    };

    await db.collection("entries").doc(entryId).set(newEntry);

    // 2. Atualizar o estoque físico do produto
    await productRef.update({
      stock: product.stock + entryQty,
      updated_at: nowStr,
    });

    // 3. Log de auditoria
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "REGISTER_WORKSHOP_ENTRY",
      details: { product_name: product.name, quantity: entryQty, invoice: data.invoiceNumber },
    });

    revalidatePath("/workshop/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao registrar entrada de peça:", error);
    return { success: false, error: error.message };
  }
}

export async function registerStockExit(data: {
  recipient: string;
  destination: string;
  date: string;
  items: { productId: string; quantity: number }[];
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const nowStr = new Date().toISOString();
    const exitId = crypto.randomUUID();
    const processedItems: any[] = [];
    let totalVolumes = 0;

    const batch = db.batch();

    // 1. Processar cada item da saída
    for (const item of data.items) {
      const pRef = db.collection("products").doc(item.productId);
      const pDoc = await pRef.get();
      if (!pDoc.exists) throw new Error(`Produto ID ${item.productId} não encontrado.`);

      const product = pDoc.data() as WorkshopProduct;
      const exitQty = Number(item.quantity);

      if (product.stock < exitQty) {
        throw new Error(`Estoque insuficiente de ${product.name}. Disponível: ${product.stock}, Solicitado: ${exitQty}`);
      }

      // Decrementar estoque
      batch.update(pRef, {
        stock: product.stock - exitQty,
        updated_at: nowStr,
      });

      processedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: exitQty,
        vehicleModel: product.vehicleModel,
        unitValue: product.unitValue,
      });

      totalVolumes += exitQty;
    }

    // 2. Salvar documento de saída
    const newExit = {
      company_id: user.company_id,
      recipient: data.recipient,
      destination: data.destination,
      date: data.date || nowStr.split("T")[0],
      items: processedItems,
      totalVolumes,
      authorUid: user.id,
      created_at: nowStr,
    };

    batch.set(db.collection("exits").doc(exitId), newExit);
    await batch.commit();

    // 3. Log de auditoria
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "REGISTER_WORKSHOP_EXIT",
      details: { recipient: data.recipient, total_items: processedItems.length, total_volumes: totalVolumes },
    });

    revalidatePath("/workshop/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao registrar saída de peça:", error);
    return { success: false, error: error.message };
  }
}

export async function getStockEntries() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const snap = await db.collection("entries")
      .where("company_id", "==", user.company_id)
      .get();
    
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenar por data desc
    list.sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    return list as WorkshopEntry[];
  } catch (error) {
    console.error("Erro ao obter entradas:", error);
    return [];
  }
}

export async function getStockExits() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const snap = await db.collection("exits")
      .where("company_id", "==", user.company_id)
      .get();
    
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenar por data desc
    list.sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    return list as WorkshopExit[];
  } catch (error) {
    console.error("Erro ao obter saídas:", error);
    return [];
  }
}

// ==========================================
// 3. ORDENS DE SERVIÇO (OS) / MANUTENÇÃO
// ==========================================

export async function getWorkshopMaintenances() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const snap = await db.collection("maintenances")
      .where("company_id", "==", user.company_id)
      .get();

    const list = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        let mechanic = undefined;
        if (data.authorUid) {
          const uDoc = await db.collection("users").doc(data.authorUid).get().catch(() => null);
          if (uDoc && uDoc.exists) {
            mechanic = { id: uDoc.id, ...uDoc.data() } as any;
          }
        }
        return {
          id: doc.id,
          ...data,
          mechanic,
        };
      })
    );

    // Ordenar por data desc (recente primeiro)
    list.sort((a: any, b: any) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
    return list as WorkshopMaintenance[];
  } catch (error) {
    console.error("Erro ao obter ordens de serviço:", error);
    return [];
  }
}

export async function saveWorkshopMaintenance(data: {
  id?: string;
  vehiclePlate: string;
  vehicleModel: string;
  date: string;
  exitDate?: string;
  takenBy?: string;
  workshop?: string;
  mechanicName?: string;
  partsTaken: any[];
  partsRequested: any[];
  deliveryDate?: string;
  observation?: string;
  status: WorkshopMaintenanceStatus;
  startDate?: string;
  conclusionDate?: string;
  clientName?: string;
  clientPhone?: string;
  vehicleYear?: string;
  vehicleKm?: string;
  serviceRequested?: string;
  laborValue?: number;
  isUrgent?: boolean;
  exitRegistered?: boolean;
  imageUrl?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  const nowStr = new Date().toISOString();
  const id = data.id || crypto.randomUUID();

  try {
    // Processar peças aplicadas (dar baixa no estoque se for uma OS nova e finalizada ou se mudou para finalizada e não deu baixa ainda)
    const needsInventoryDeduction = data.exitRegistered === false && data.status === "Finalizada" && data.partsTaken.length > 0;
    
    if (needsInventoryDeduction) {
      const batch = db.batch();
      for (const part of data.partsTaken) {
        const pRef = db.collection("products").doc(part.productId);
        const pDoc = await pRef.get();
        if (pDoc.exists) {
          const pData = pDoc.data() as WorkshopProduct;
          const qty = Number(part.quantity);
          batch.update(pRef, {
            stock: Math.max(0, pData.stock - qty),
            updated_at: nowStr,
          });
        }
      }
      
      // Registrar um doc de saída física referente a essa OS
      const exitId = crypto.randomUUID();
      const exitDoc: Omit<WorkshopExit, "id"> = {
        company_id: user.company_id,
        recipient: data.clientName || "Oficina",
        destination: `OS #${id.substring(0, 8)}`,
        date: nowStr.split("T")[0],
        items: data.partsTaken,
        totalVolumes: data.partsTaken.reduce((sum, item) => sum + Number(item.quantity), 0),
        authorUid: user.id,
        created_at: nowStr,
      };
      batch.set(db.collection("exits").doc(exitId), exitDoc);
      await batch.commit();
    }

    const maintenanceData: any = {
      company_id: user.company_id,
      vehiclePlate: data.vehiclePlate,
      vehicleModel: data.vehicleModel,
      date: data.date || nowStr.split("T")[0],
      exitDate: data.exitDate || "",
      takenBy: data.takenBy || "",
      workshop: data.workshop || "",
      mechanicName: data.mechanicName || user.name,
      partsTaken: data.partsTaken,
      partsRequested: data.partsRequested,
      deliveryDate: data.deliveryDate || "",
      observation: data.observation || "",
      status: data.status,
      startDate: data.startDate || (data.status === "Em execução" ? nowStr : ""),
      conclusionDate: data.conclusionDate || (data.status === "Finalizada" ? nowStr : ""),
      clientName: data.clientName || "",
      clientPhone: data.clientPhone || "",
      vehicleYear: data.vehicleYear || "",
      vehicleKm: data.vehicleKm || "",
      serviceRequested: data.serviceRequested || "",
      laborValue: Number(data.laborValue || 0),
      isUrgent: Boolean(data.isUrgent),
      exitRegistered: needsInventoryDeduction ? true : (data.exitRegistered ?? false),
      imageUrl: data.imageUrl || "",
      updated_at: nowStr,
    };

    if (data.id) {
      await db.collection("maintenances").doc(id).update(maintenanceData);

      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "UPDATE_OS",
        details: { os_id: id, plate: data.vehiclePlate, status: data.status },
      });
    } else {
      const newOS = {
        ...maintenanceData,
        authorUid: user.id,
        created_at: nowStr,
      };
      await db.collection("maintenances").doc(id).set(newOS);

      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "CREATE_OS",
        details: { os_id: id, plate: data.vehiclePlate, status: data.status },
      });
    }

    revalidatePath("/workshop");
    return { success: true, id };
  } catch (error: any) {
    console.error("Erro ao salvar ordem de serviço:", error);
    return { success: false, error: error.message };
  }
}

export async function updateWorkshopMaintenanceStatus(id: string, status: WorkshopMaintenanceStatus) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const nowStr = new Date().toISOString();
    const osRef = db.collection("maintenances").doc(id);
    const osDoc = await osRef.get();
    if (!osDoc.exists) return { success: false, error: "Ordem de serviço não encontrada." };

    const updateFields: any = {
      status,
      updated_at: nowStr,
    };

    if (status === "Em execução") {
      updateFields.startDate = nowStr;
    } else if (status === "Finalizada") {
      updateFields.conclusionDate = nowStr;
      updateFields.exitDate = nowStr.split("T")[0];
    }

    await osRef.update(updateFields);

    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "UPDATE_OS_STATUS",
      details: { os_id: id, status },
    });

    revalidatePath("/workshop");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao alterar status da OS:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteWorkshopMaintenance(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") throw new Error("Não autorizado.");

  try {
    const doc = await db.collection("maintenances").doc(id).get();
    if (!doc.exists) return { success: false, error: "Ordem de serviço não encontrada." };

    const osData = doc.data();
    await db.collection("maintenances").doc(id).delete();

    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "DELETE_OS",
      details: { os_id: id, plate: osData?.vehiclePlate },
    });

    revalidatePath("/workshop");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir OS:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// 4. AGENDAMENTOS DE OFICINA
// ==========================================

export async function getWorkshopAppointments() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    const snap = await db.collection("appointments")
      .where("company_id", "==", user.company_id)
      .get();

    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenar por data asc
    list.sort((a: any, b: any) => new Date(`${a.date}T${a.time || "00:00"}`).getTime() - new Date(`${b.date}T${b.time || "00:00"}`).getTime());
    return list as WorkshopAppointment[];
  } catch (error) {
    console.error("Erro ao obter agendamentos:", error);
    return [];
  }
}

export async function saveWorkshopAppointment(data: {
  id?: string;
  time: string;
  date: string;
  title: string;
  clientName?: string;
  vehicleModel?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  const nowStr = new Date().toISOString();
  const id = data.id || crypto.randomUUID();

  try {
    const apptData = {
      company_id: user.company_id,
      time: data.time,
      date: data.date,
      title: data.title,
      clientName: data.clientName || "",
      vehicleModel: data.vehicleModel || "",
      updated_at: nowStr,
    };

    if (data.id) {
      await db.collection("appointments").doc(id).update(apptData);
    } else {
      const newAppt = {
        ...apptData,
        created_at: nowStr,
      };
      await db.collection("appointments").doc(id).set(newAppt);
    }

    revalidatePath("/workshop");
    return { success: true, id };
  } catch (error: any) {
    console.error("Erro ao salvar agendamento:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteWorkshopAppointment(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) throw new Error("Não autorizado.");

  try {
    await db.collection("appointments").doc(id).delete();
    revalidatePath("/workshop");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir agendamento:", error);
    return { success: false, error: error.message };
  }
}
