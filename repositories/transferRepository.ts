import { db } from "@/lib/firebase/admin";
import { TransferProcess, TransferStatusLog } from "@/types";

export const transferRepository = {
  async getById(firebaseDb: any, id: string): Promise<TransferProcess | null> {
    try {
      const doc = await db.collection("transfer_process").doc(id).get();
      if (!doc.exists) return null;
      const data = doc.data();

      let contract = undefined;
      let responsible = undefined;

      if (data?.contract_id) {
        const cDoc = await db.collection("contracts").doc(data.contract_id).get();
        if (cDoc.exists) {
          const cData = cDoc.data();
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

          contract = {
            id: cDoc.id,
            ...cData,
            client,
            vehicle,
          };
        }
      }

      if (data?.responsible_id) {
        const rDoc = await db.collection("users").doc(data.responsible_id).get();
        if (rDoc.exists) {
          responsible = { id: rDoc.id, ...rDoc.data() };
        }
      }

      return {
        id: doc.id,
        ...data,
        contract,
        responsible,
      } as TransferProcess;
    } catch (error) {
      console.error("Error fetching transfer process by id:", error);
      return null;
    }
  },

  async getByContractId(firebaseDb: any, contractId: string): Promise<TransferProcess | null> {
    try {
      const snap = await db.collection("transfer_process")
        .where("contract_id", "==", contractId)
        .limit(1)
        .get();

      if (snap.empty) return null;
      const doc = snap.docs[0];
      const data = doc.data();

      let responsible = undefined;
      if (data?.responsible_id) {
        const rDoc = await db.collection("users").doc(data.responsible_id).get();
        if (rDoc.exists) {
          responsible = { id: rDoc.id, ...rDoc.data() };
        }
      }

      return {
        id: doc.id,
        ...data,
        responsible,
      } as TransferProcess;
    } catch (error) {
      console.error("Error fetching transfer process by contractId:", error);
      return null;
    }
  },

  async list(firebaseDb: any): Promise<TransferProcess[]> {
    try {
      const snap = await db.collection("transfer_process").get();

      const processes = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();
          let contract = undefined;
          let responsible = undefined;

          if (data.contract_id) {
            const cDoc = await db.collection("contracts").doc(data.contract_id).get();
            if (cDoc.exists) {
              const cData = cDoc.data();
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

              contract = {
                id: cDoc.id,
                ...cData,
                client,
                vehicle,
              };
            }
          }

          if (data.responsible_id) {
            const rDoc = await db.collection("users").doc(data.responsible_id).get();
            if (rDoc.exists) {
              responsible = { id: rDoc.id, ...rDoc.data() };
            }
          }

          return {
            id: doc.id,
            ...data,
            contract,
            responsible,
          } as TransferProcess;
        })
      );

      // Ordenar por data de atualização desc (mais recentes primeiro)
      processes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return processes;
    } catch (error) {
      console.error("Error listing transfer processes:", error);
      return [];
    }
  },

  async create(
    firebaseDb: any,
    process: Omit<TransferProcess, "id" | "created_at" | "updated_at">
  ): Promise<TransferProcess | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const processData = {
        ...process,
        created_at: nowStr,
        updated_at: nowStr,
      };
      await db.collection("transfer_process").doc(id).set(processData);
      return { id, ...processData } as TransferProcess;
    } catch (error: any) {
      console.error("Error creating transfer process:", error);
      throw new Error(error.message);
    }
  },

  async update(
    firebaseDb: any,
    id: string,
    process: Partial<Omit<TransferProcess, "id" | "contract_id" | "created_at" | "updated_at">>
  ): Promise<TransferProcess | null> {
    try {
      const nowStr = new Date().toISOString();
      const processData = {
        ...process,
        updated_at: nowStr,
      };
      await db.collection("transfer_process").doc(id).update(processData);
      const updatedDoc = await db.collection("transfer_process").doc(id).get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as TransferProcess;
    } catch (error: any) {
      console.error("Error updating transfer process:", error);
      throw new Error(error.message);
    }
  },

  async addStatusLog(
    firebaseDb: any,
    log: Omit<TransferStatusLog, "id" | "created_at">
  ): Promise<TransferStatusLog | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const logData = {
        ...log,
        created_at: nowStr,
      };
      await db.collection("transfer_status_logs").doc(id).set(logData);
      return { id, ...logData } as TransferStatusLog;
    } catch (error) {
      console.error("Error adding transfer status log:", error);
      return null;
    }
  },

  async getStatusLogs(firebaseDb: any, processId: string): Promise<TransferStatusLog[]> {
    try {
      const snap = await db.collection("transfer_status_logs")
        .where("transfer_process_id", "==", processId)
        .get();

      const logs = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();
          let userProfile = undefined;

          if (data.changed_by) {
            const uDoc = await db.collection("users").doc(data.changed_by).get();
            if (uDoc.exists) {
              userProfile = { id: uDoc.id, ...uDoc.data() } as any;
            }
          }

          return {
            id: doc.id,
            ...data,
            user: userProfile,
          } as TransferStatusLog;
        })
      );

      // Ordenar por data de criação desc
      logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return logs;
    } catch (error) {
      console.error("Error fetching transfer status logs:", error);
      return [];
    }
  },
};
