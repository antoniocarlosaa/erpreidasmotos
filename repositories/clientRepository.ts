import { db } from "@/lib/firebase/admin";
import { Client } from "@/types";

export type ClientFilters = {
  search?: string;
  limit?: number;
  offset?: number;
  company_id?: string;
};

export const clientRepository = {
  async getById(firebaseDb: any, id: string): Promise<Client | null> {
    try {
      const doc = await db.collection("clients").doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as Client;
    } catch (error) {
      console.error("Error fetching client by id:", error);
      return null;
    }
  },

  async getByCPF(firebaseDb: any, cpf: string): Promise<Client | null> {
    try {
      const snap = await db.collection("clients").where("cpf", "==", cpf).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() } as Client;
    } catch (error) {
      console.error("Error fetching client by CPF:", error);
      return null;
    }
  },

  async list(
    firebaseDb: any,
    filters: ClientFilters = {}
  ): Promise<{ data: Client[]; count: number }> {
    try {
      // Como o Firestore não possui pesquisa 'like' textual em múltiplos campos nativa,
      // buscamos todos os clientes da coleção e filtramos/ordenamos em memória.
      // O volume de clientes é pequeno por concessionária (multi-tenant).
      const snap = await db.collection("clients").get();
      let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Client);

      // Filtro de Busca por Nome ou CPF
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        list = list.filter(
          c => c.name.toLowerCase().includes(searchLower) || c.cpf.toLowerCase().includes(searchLower)
        );
      }

      // Filtro por concessionária (tenant isolation)
      if ((filters as any).company_id) {
        list = list.filter(c => c.company_id === (filters as any).company_id);
      }

      // Ordenação padrão por nome (ascendente)
      list.sort((a, b) => a.name.localeCompare(b.name));

      const totalCount = list.length;
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 10;
      const paginatedList = list.slice(offset, offset + limit);

      return { data: paginatedList, count: totalCount };
    } catch (error) {
      console.error("Error listing clients:", error);
      return { data: [], count: 0 };
    }
  },

  async create(firebaseDb: any, client: Omit<Client, "id" | "created_at" | "updated_at">): Promise<Client | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const clientData = {
        ...client,
        created_at: nowStr,
        updated_at: nowStr,
      };
      await db.collection("clients").doc(id).set(clientData);
      return { id, ...clientData } as Client;
    } catch (error: any) {
      console.error("Error creating client:", error);
      throw new Error(error.message);
    }
  },

  async update(firebaseDb: any, id: string, client: Partial<Omit<Client, "id" | "created_at" | "updated_at">>): Promise<Client | null> {
    try {
      const nowStr = new Date().toISOString();
      const clientData = {
        ...client,
        updated_at: nowStr,
      };
      await db.collection("clients").doc(id).update(clientData);
      const updatedDoc = await db.collection("clients").doc(id).get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as Client;
    } catch (error: any) {
      console.error("Error updating client:", error);
      throw new Error(error.message);
    }
  },

  async delete(firebaseDb: any, id: string): Promise<boolean> {
    try {
      await db.collection("clients").doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting client:", error);
      return false;
    }
  },
};
