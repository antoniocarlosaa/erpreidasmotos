import { db } from "@/lib/firebase/admin";
import { AuditLog } from "@/types";

export const auditRepository = {
  async createLog(
    firebaseDb: any,
    log: Omit<AuditLog, "id" | "created_at">
  ): Promise<AuditLog | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const logData = {
        ...log,
        created_at: nowStr,
      };
      await db.collection("logs").doc(id).set(logData);
      return { id, ...logData } as AuditLog;
    } catch (error) {
      console.error("Error creating audit log:", error);
      return null;
    }
  },

  async listLogs(firebaseDb: any, companyId: string, limit = 100): Promise<AuditLog[]> {
    try {
      const snap = await db.collection("logs")
        .where("company_id", "==", companyId)
        .get();

      // Carregar os perfis de usuários relacionados em paralelo
      const logs = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data() as Omit<AuditLog, "id">;
          let userProfile = undefined;
          
          if (data.user_id) {
            const uDoc = await db.collection("users").doc(data.user_id).get().catch(() => null);
            if (uDoc && uDoc.exists) {
              userProfile = { id: uDoc.id, ...uDoc.data() } as any;
            }
          }
          
          return {
            id: doc.id,
            ...data,
            user: userProfile,
          } as AuditLog;
        })
      );

      // Ordenar por data de criação desc em memória para evitar a necessidade de índice composto
      logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return logs.slice(0, limit);
    } catch (error) {
      console.error("Error listing audit logs:", error);
      return [];
    }
  },
};
