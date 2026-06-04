import { db } from "@/lib/firebase/admin";
import { Vehicle } from "@/types";

export type VehicleFilters = {
  search?: string;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
  company_id?: string;
};

export const vehicleRepository = {
  async getById(firebaseDb: any, id: string): Promise<Vehicle | null> {
    try {
      const doc = await db.collection("vehicles").doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as Vehicle;
    } catch (error) {
      console.error("Error fetching vehicle by id:", error);
      return null;
    }
  },

  async getByPlate(firebaseDb: any, plate: string): Promise<Vehicle | null> {
    try {
      const snap = await db.collection("vehicles").where("plate", "==", plate).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() } as Vehicle;
    } catch (error) {
      console.error("Error fetching vehicle by plate:", error);
      return null;
    }
  },

  async list(
    firebaseDb: any,
    filters: VehicleFilters = {}
  ): Promise<{ data: Vehicle[]; count: number }> {
    try {
      const snap = await db.collection("vehicles").get();
      let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Vehicle);

      // Filtro de Busca (Modelo, Marca ou Placa)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        list = list.filter(
          v =>
            v.model.toLowerCase().includes(searchLower) ||
            v.brand.toLowerCase().includes(searchLower) ||
            v.plate.toLowerCase().includes(searchLower)
        );
      }

      // Filtro por status
      if (filters.status) {
        list = list.filter(v => v.status === filters.status);
      }

      // Filtro por categoria
      if (filters.category) {
        list = list.filter(v => v.category === filters.category);
      }

      // Filtro por concessionária (tenant isolation)
      if ((filters as any).company_id) {
        list = list.filter(v => v.company_id === (filters as any).company_id);
      }

      // Ordenar por data de criação (mais novos primeiro)
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const totalCount = list.length;
      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 10;
      const paginatedList = list.slice(offset, offset + limit);

      return { data: paginatedList, count: totalCount };
    } catch (error) {
      console.error("Error listing vehicles:", error);
      return { data: [], count: 0 };
    }
  },

  async create(firebaseDb: any, vehicle: Omit<Vehicle, "id" | "created_at" | "updated_at">): Promise<Vehicle | null> {
    try {
      const nowStr = new Date().toISOString();
      const id = crypto.randomUUID();
      const vehicleData = {
        ...vehicle,
        created_at: nowStr,
        updated_at: nowStr,
      };
      await db.collection("vehicles").doc(id).set(vehicleData);
      return { id, ...vehicleData } as Vehicle;
    } catch (error: any) {
      console.error("Error creating vehicle:", error);
      throw new Error(error.message);
    }
  },

  async update(firebaseDb: any, id: string, vehicle: Partial<Omit<Vehicle, "id" | "created_at" | "updated_at">>): Promise<Vehicle | null> {
    try {
      const nowStr = new Date().toISOString();
      const vehicleData = {
        ...vehicle,
        updated_at: nowStr,
      };
      await db.collection("vehicles").doc(id).update(vehicleData);
      const updatedDoc = await db.collection("vehicles").doc(id).get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as Vehicle;
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      throw new Error(error.message);
    }
  },

  async delete(firebaseDb: any, id: string): Promise<boolean> {
    try {
      await db.collection("vehicles").doc(id).delete();
      return true;
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      return false;
    }
  },
};
