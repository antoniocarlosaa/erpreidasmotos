import { db } from "@/lib/firebase/admin";
import { Contract, ContractVersion, Signature, ContractStatus } from "@/types";

export type ContractFilters = {
  search?: string; // CPF, Nome, Placa, Número do contrato
  status?: ContractStatus;
  limit?: number;
  offset?: number;
};

// Auxiliar para preencher relacionamentos em um contrato
async function populateContractRelations(contractId: string, data: any) {
  let client = undefined;
  let vehicle = undefined;
  let seller = undefined;

  if (data.client_id) {
    const clDoc = await db.collection("clients").doc(data.client_id).get();
    if (clDoc.exists) client = { id: clDoc.id, ...clDoc.data() };
  }
  if (data.vehicle_id) {
    const vDoc = await db.collection("vehicles").doc(data.vehicle_id).get();
    if (vDoc.exists) vehicle = { id: vDoc.id, ...vDoc.data() };
  }
  if (data.seller_id) {
    const sDoc = await db.collection("users").doc(data.seller_id).get();
    if (sDoc.exists) {
      const sData = sDoc.data() as any;
      let company = undefined;
      if (sData.company_id) {
        const coDoc = await db.collection("companies").doc(sData.company_id).get();
        if (coDoc.exists) {
          company = { id: coDoc.id, ...coDoc.data() };
        }
      }
      seller = { id: sDoc.id, ...sData, company };
    }
  }

  return {
    id: contractId,
    ...data,
    client,
    vehicle,
    seller,
  } as Contract;
}

export const contractRepository = {
  async getById(firebaseDb: any, id: string): Promise<Contract | null> {
    try {
      const doc = await db.collection("contracts").doc(id).get();
      if (!doc.exists) return null;
      return await populateContractRelations(doc.id, doc.data());
    } catch (error) {
      console.error("Error fetching contract by id:", error);
      return null;
    }
  },

  async list(
    firebaseDb: any,
    filters: ContractFilters = {}
  ): Promise<{ data: Contract[]; count: number }> {
    try {
      const snap = await db.collection("contracts").get();
      
      let contracts = await Promise.all(
        snap.docs.map(async (doc) => {
          return await populateContractRelations(doc.id, doc.data());
        })
      );

      // Filtro de status
      if (filters.status) {
        contracts = contracts.filter(c => c.status === filters.status);
      }

      // Filtro de busca (CPF, Nome, Placa, Modelo ou Número do contrato)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const isNumber = /^\d+$/.test(filters.search);

        if (isNumber) {
          const searchNum = parseInt(filters.search, 10);
          contracts = contracts.filter(c => c.contract_number === searchNum);
        } else {
          contracts = contracts.filter(
            (c) =>
              c.client?.name.toLowerCase().includes(searchLower) ||
              c.client?.cpf.toLowerCase().includes(searchLower) ||
              c.vehicle?.plate.toLowerCase().includes(searchLower) ||
              c.vehicle?.model.toLowerCase().includes(searchLower)
          );
        }
      }

      // Ordenar por data de criação (mais novos primeiro)
      contracts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const totalCount = contracts.length;
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 10;
      const paginatedList = contracts.slice(offset, offset + limit);

      return { data: paginatedList, count: totalCount };
    } catch (error) {
      console.error("Error listing contracts:", error);
      return { data: [], count: 0 };
    }
  },

  async create(
    firebaseDb: any,
    contract: Omit<Contract, "id" | "contract_number" | "version" | "created_at" | "updated_at">
  ): Promise<Contract | null> {
    try {
      const companyId = contract.company_id;
      const counterRef = db.collection("counters").doc(`${companyId}_contracts`);

      // 1. Obter número sequencial de contrato de forma transacional e atômica por empresa
      const contractNumber = await db.runTransaction(async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        let current = 1000;
        if (counterSnap.exists) {
          current = counterSnap.data()?.current ?? 1000;
        }
        const next = current + 1;
        transaction.set(counterRef, { current: next }, { merge: true });
        return next;
      });

      const nowStr = new Date().toISOString();
      const todayStr = nowStr.split("T")[0];
      const id = crypto.randomUUID();

      const initialStatus = "AGUARDANDO_INICIAR";

      const contractData: any = {
        ...contract,
        status: initialStatus,
        contract_number: contractNumber,
        version: 1,
        created_at: nowStr,
        updated_at: nowStr,
        status_updated_at: nowStr,
        status_dates: {
          [initialStatus]: nowStr
        }
      };

      if (contract.modality === "compra") {
        if (!contractData.purchase_date) {
          contractData.purchase_date = todayStr;
        }
      } else {
        if (!contractData.sale_date) {
          contractData.sale_date = todayStr;
        }
      }

      await db.collection("contracts").doc(id).set(contractData);
      return { id, ...contractData } as Contract;
    } catch (error: any) {
      console.error("Error creating contract:", error);
      throw new Error(error.message);
    }
  },

  async update(
    firebaseDb: any,
    id: string,
    contract: Partial<Omit<Contract, "id" | "contract_number" | "created_at" | "updated_at">>,
    userId?: string
  ): Promise<Contract | null> {
    try {
      const current = await this.getById(firebaseDb, id);
      if (!current) throw new Error("Contrato não encontrado para atualização.");

      const nextVersion = current.version + 1;
      const nowStr = new Date().toISOString();

      const contractData: any = {
        ...contract,
        version: nextVersion,
        updated_at: nowStr,
      };

      if (contract.status && contract.status !== current.status) {
        contractData.status_updated_at = nowStr;
        contractData.status_dates = {
          ...(current.status_dates || {}),
          [contract.status]: nowStr
        };

        if (contract.status === "TRANSFERÊNCIA_CONCLUÍDA") {
          contractData.completion_date = nowStr.split("T")[0];
        }
      }

      await db.collection("contracts").doc(id).update(contractData);

      if (userId) {
        const changes: Record<string, any> = {};
        Object.keys(contract).forEach((key) => {
          const k = key as keyof typeof contract;
          if (current[k] !== contract[k]) {
            changes[key] = {
              old: current[k],
              new: contract[k],
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await this.createVersion(firebaseDb, {
            contract_id: id,
            version: current.version,
            changes,
            updated_by: userId,
          });
        }
      }

      const updatedDoc = await db.collection("contracts").doc(id).get();
      return await populateContractRelations(id, updatedDoc.data());
    } catch (error: any) {
      console.error("Error updating contract:", error);
      throw new Error(error.message);
    }
  },

  async createVersion(
    firebaseDb: any,
    version: Omit<ContractVersion, "id" | "created_at">
  ): Promise<ContractVersion | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const versionData = {
        ...version,
        created_at: nowStr,
      };
      await db.collection("contract_versions").doc(id).set(versionData);
      return { id, ...versionData } as ContractVersion;
    } catch (error) {
      console.error("Error saving contract version:", error);
      return null;
    }
  },

  async addSignature(
    firebaseDb: any,
    signature: Omit<Signature, "id" | "signed_at">
  ): Promise<Signature | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const signatureData = {
        ...signature,
        signed_at: nowStr,
      };
      await db.collection("signatures").doc(id).set(signatureData);
      return { id, ...signatureData } as Signature;
    } catch (error: any) {
      console.error("Error adding signature:", error);
      throw new Error(error.message);
    }
  },

  async getSignatures(firebaseDb: any, contractId: string): Promise<Signature[]> {
    try {
      const snap = await db.collection("signatures")
        .where("contract_id", "==", contractId)
        .get();

      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Signature);
    } catch (error) {
      console.error("Error fetching signatures:", error);
      return [];
    }
  },

  async delete(firebaseDb: any, id: string): Promise<boolean> {
    try {
      // 1. Buscar todas as assinaturas vinculadas
      const sigs = await db.collection("signatures").where("contract_id", "==", id).get();
      
      // 2. Buscar todas as versões de contrato vinculadas
      const versions = await db.collection("contract_versions").where("contract_id", "==", id).get();

      // 3. Buscar parcelas/pagamentos vinculados
      const payments = await db.collection("payments").where("contract_id", "==", id).get();

      // 4. Buscar lançamentos do fluxo de caixa vinculados
      const financialEntries = await db.collection("financial_entries").where("contract_id", "==", id).get();

      // 5. Buscar garantias vinculadas
      const warranties = await db.collection("contract_warranties").where("contract_id", "==", id).get();

      // 6. Buscar revisões vinculadas
      const reviews = await db.collection("contract_reviews").where("contract_id", "==", id).get();

      // 7. Buscar checklists de vistoria vinculados
      const checklists = await db.collection("contract_checklists").where("contract_id", "==", id).get();

      // 8. Buscar eventos de linha do tempo vinculados
      const timelines = await db.collection("contract_timelines").where("contract_id", "==", id).get();

      // 9. Buscar processos de transferência vinculados
      const transferProcesses = await db.collection("transfer_process").where("contract_id", "==", id).get();

      // 10. Buscar logs de alteração de status de transferência vinculados
      const transferLogs = await db.collection("transfer_status_logs").where("transfer_process_id", "==", id).get();

      const batch = db.batch();

      // Excluir todos os registros em lote (batch delete)
      sigs.docs.forEach(doc => batch.delete(doc.ref));
      versions.docs.forEach(doc => batch.delete(doc.ref));
      payments.docs.forEach(doc => batch.delete(doc.ref));
      financialEntries.docs.forEach(doc => batch.delete(doc.ref));
      warranties.docs.forEach(doc => batch.delete(doc.ref));
      reviews.docs.forEach(doc => batch.delete(doc.ref));
      checklists.docs.forEach(doc => batch.delete(doc.ref));
      timelines.docs.forEach(doc => batch.delete(doc.ref));
      transferProcesses.docs.forEach(doc => batch.delete(doc.ref));
      transferLogs.docs.forEach(doc => batch.delete(doc.ref));

      // Excluir processo de transferência pelo id direto (caso o id seja igual ao id do contrato)
      batch.delete(db.collection("transfer_process").doc(id));

      // Por fim, excluir o próprio contrato
      batch.delete(db.collection("contracts").doc(id));

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error deleting contract:", error);
      return false;
    }
  },
};
