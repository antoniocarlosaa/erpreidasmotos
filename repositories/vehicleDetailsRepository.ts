import { db } from "@/lib/firebase/admin";
import {
  VehicleCost,
  VehicleDebt,
  VehicleBroker,
  VehiclePower,
  VehicleStockMetrics,
  VehiclePublication
} from "@/types";

export const vehicleDetailsRepository = {
  // Costs/Expenses
  async getCosts(vehicleId: string): Promise<VehicleCost[]> {
    try {
      const snap = await db
        .collection("vehicle_costs")
        .where("vehicle_id", "==", vehicleId)
        .get();
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as VehicleCost);
      // Sort by date desc
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return list;
    } catch (error) {
      console.error("Error fetching vehicle costs:", error);
      return [];
    }
  },

  async addCost(cost: Omit<VehicleCost, "id" | "created_at">): Promise<VehicleCost | null> {
    try {
      const nowStr = new Date().toISOString();
      const docRef = await db.collection("vehicle_costs").add({
        ...cost,
        created_at: nowStr,
      });
      return { id: docRef.id, ...cost, created_at: nowStr } as VehicleCost;
    } catch (error) {
      console.error("Error adding vehicle cost:", error);
      return null;
    }
  },

  async deleteCost(costId: string): Promise<boolean> {
    try {
      await db.collection("vehicle_costs").doc(costId).delete();
      return true;
    } catch (error) {
      console.error("Error deleting vehicle cost:", error);
      return false;
    }
  },

  // Debts
  async getDebts(vehicleId: string): Promise<VehicleDebt | null> {
    try {
      const doc = await db.collection("vehicle_debts").doc(vehicleId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as VehicleDebt;
    } catch (error) {
      console.error("Error fetching vehicle debts:", error);
      return null;
    }
  },

  async saveDebts(vehicleId: string, companyId: string, debts: Partial<Omit<VehicleDebt, "id" | "vehicle_id" | "company_id">>): Promise<boolean> {
    try {
      await db.collection("vehicle_debts").doc(vehicleId).set(
        {
          vehicle_id: vehicleId,
          company_id: companyId,
          ...debts,
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Error saving vehicle debts:", error);
      return false;
    }
  },

  // Brokers
  async getBroker(vehicleId: string): Promise<VehicleBroker | null> {
    try {
      const doc = await db.collection("vehicle_brokers").doc(vehicleId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as VehicleBroker;
    } catch (error) {
      console.error("Error fetching vehicle broker:", error);
      return null;
    }
  },

  async saveBroker(vehicleId: string, companyId: string, broker: Partial<Omit<VehicleBroker, "id" | "vehicle_id" | "company_id">>): Promise<boolean> {
    try {
      await db.collection("vehicle_brokers").doc(vehicleId).set(
        {
          vehicle_id: vehicleId,
          company_id: companyId,
          ...broker,
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Error saving vehicle broker:", error);
      return false;
    }
  },

  // Powers
  async getPower(vehicleId: string): Promise<VehiclePower | null> {
    try {
      const doc = await db.collection("vehicle_powers").doc(vehicleId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as VehiclePower;
    } catch (error) {
      console.error("Error fetching vehicle power:", error);
      return null;
    }
  },

  async savePower(vehicleId: string, companyId: string, power: Partial<Omit<VehiclePower, "id" | "vehicle_id" | "company_id">>): Promise<boolean> {
    try {
      await db.collection("vehicle_powers").doc(vehicleId).set(
        {
          vehicle_id: vehicleId,
          company_id: companyId,
          ...power,
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Error saving vehicle power:", error);
      return false;
    }
  },

  // Stock Metrics
  async getStockMetrics(vehicleId: string): Promise<VehicleStockMetrics | null> {
    try {
      const doc = await db.collection("vehicle_stock_metrics").doc(vehicleId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as VehicleStockMetrics;
    } catch (error) {
      console.error("Error fetching vehicle stock metrics:", error);
      return null;
    }
  },

  async saveStockMetrics(
    vehicleId: string,
    companyId: string,
    metrics: Partial<Omit<VehicleStockMetrics, "id" | "vehicle_id" | "company_id">>
  ): Promise<boolean> {
    try {
      await db.collection("vehicle_stock_metrics").doc(vehicleId).set(
        {
          vehicle_id: vehicleId,
          company_id: companyId,
          ...metrics,
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Error saving vehicle stock metrics:", error);
      return false;
    }
  },

  // Publications
  async getPublication(vehicleId: string): Promise<VehiclePublication | null> {
    try {
      const doc = await db.collection("vehicle_publications").doc(vehicleId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as VehiclePublication;
    } catch (error) {
      console.error("Error fetching vehicle publication:", error);
      return null;
    }
  },

  async savePublication(
    vehicleId: string,
    companyId: string,
    publication: Partial<Omit<VehiclePublication, "id" | "vehicle_id" | "company_id">>
  ): Promise<boolean> {
    try {
      await db.collection("vehicle_publications").doc(vehicleId).set(
        {
          vehicle_id: vehicleId,
          company_id: companyId,
          ...publication,
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Error saving vehicle publication:", error);
      return false;
    }
  },
};
