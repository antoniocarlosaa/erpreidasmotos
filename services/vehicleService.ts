import { vehicleRepository, VehicleFilters } from "@/repositories/vehicleRepository";
import { vehicleDetailsRepository } from "@/repositories/vehicleDetailsRepository";
import { Vehicle } from "@/types";
import { db } from "@/lib/firebase/admin";
import { contractRepository } from "@/repositories/contractRepository";

export const vehicleService = {
  async getById(supabase: any, id: string): Promise<Vehicle | null> {
    return vehicleRepository.getById(supabase, id);
  },

  async getFullDetails(supabase: any, id: string): Promise<any | null> {
    const vehicle = await vehicleRepository.getById(supabase, id);
    if (!vehicle) return null;

    const [debts, broker, power, stock_metrics, publication, costs] = await Promise.all([
      vehicleDetailsRepository.getDebts(id),
      vehicleDetailsRepository.getBroker(id),
      vehicleDetailsRepository.getPower(id),
      vehicleDetailsRepository.getStockMetrics(id),
      vehicleDetailsRepository.getPublication(id),
      vehicleDetailsRepository.getCosts(id),
    ]);

    return {
      ...vehicle,
      debts: debts || { has_fines: false, fines_value: 0, has_ipva: false, ipva_value: 0, has_financing: false, financing_bank: "", financing_payout: 0 },
      broker: broker || { has_broker: false, broker_name: "", broker_phone: "", broker_commission: 0 },
      power_of_attorney: power || { has_power: false, power_value: 0, power_payer: "loja" },
      stock_metrics: stock_metrics || { entry_date: vehicle.created_at?.split("T")[0] || new Date().toISOString().split("T")[0], sale_date: "", days_in_stock: 0 },
      publication: publication || { publish_catalog: false, catalog_url: "", catalog_token: "" },
      costs: costs || [],
    };
  },

  async list(supabase: any, filters: VehicleFilters = {}) {
    return vehicleRepository.list(supabase, filters);
  },

  async create(supabase: any, vehicleData: Omit<Vehicle, "id" | "created_at" | "updated_at"> & {
    debts?: any;
    broker?: any;
    power_of_attorney?: any;
    stock_metrics?: any;
    publication?: any;
  }): Promise<Vehicle | null> {
    // Validações básicas de placa, renavam e chassi
    const plate = vehicleData.plate.toUpperCase().trim();
    const chassis = vehicleData.chassis ? vehicleData.chassis.toUpperCase().trim() : "";
    const renavam = vehicleData.renavam.trim();

    if (plate.length < 7 || plate.length > 8) {
      throw new Error("A placa deve ter formato válido (ex: ABC1234 ou ABC1D23).");
    }

    if (renavam.length !== 11) {
      throw new Error("O Renavam deve possuir exatamente 11 dígitos.");
    }

    if (chassis && chassis.length !== 17) {
      throw new Error("O Chassi deve possuir exatamente 17 caracteres padrão (VIN).");
    }

    const existing = await vehicleRepository.getByPlate(supabase, plate);
    if (existing && existing.company_id === vehicleData.company_id) {
      throw new Error(`Veículo com placa ${plate} já cadastrado nesta concessionária.`);
    }

    // Separar campos das coleções associadas
    const { debts, broker, power_of_attorney, stock_metrics, publication, ...basicVehicle } = vehicleData;

    const normalizedVehicle = {
      ...basicVehicle,
      plate,
      chassis,
      renavam,
    };

    const createdVehicle = await vehicleRepository.create(supabase, normalizedVehicle);
    if (!createdVehicle) return null;

    // Salvar coleções associadas
    const vehicleId = createdVehicle.id;
    const companyId = createdVehicle.company_id;

    await Promise.all([
      vehicleDetailsRepository.saveDebts(vehicleId, companyId, debts || {}),
      vehicleDetailsRepository.saveBroker(vehicleId, companyId, broker || {}),
      vehicleDetailsRepository.savePower(vehicleId, companyId, power_of_attorney || {}),
      vehicleDetailsRepository.saveStockMetrics(vehicleId, companyId, stock_metrics || {
        entry_date: new Date().toISOString().split("T")[0],
        days_in_stock: 0,
      }),
      vehicleDetailsRepository.savePublication(vehicleId, companyId, publication || {}),
    ]);

    return createdVehicle;
  },

  async update(
    supabase: any,
    id: string,
    vehicleData: Partial<Omit<Vehicle, "id" | "created_at" | "updated_at">> & {
      debts?: any;
      broker?: any;
      power_of_attorney?: any;
      stock_metrics?: any;
      publication?: any;
    }
  ): Promise<Vehicle | null> {
    if (vehicleData.plate) {
      vehicleData.plate = vehicleData.plate.toUpperCase().trim();
      const existing = await vehicleRepository.getByPlate(supabase, vehicleData.plate);
      if (existing && existing.id !== id && existing.company_id === vehicleData.company_id) {
        throw new Error(`Veículo com placa ${vehicleData.plate} já cadastrado.`);
      }
    }

    if (vehicleData.chassis) {
      vehicleData.chassis = vehicleData.chassis.toUpperCase().trim();
    }

    // Separar campos associados do corpo básico do veículo
    const { debts, broker, power_of_attorney, stock_metrics, publication, ...basicVehicle } = vehicleData;

    const updatedVehicle = await vehicleRepository.update(supabase, id, basicVehicle);
    if (!updatedVehicle) return null;

    const companyId = updatedVehicle.company_id;

    const promises: Promise<any>[] = [];
    if (debts !== undefined) {
      promises.push(vehicleDetailsRepository.saveDebts(id, companyId, debts));
    }
    if (broker !== undefined) {
      promises.push(vehicleDetailsRepository.saveBroker(id, companyId, broker));
    }
    if (power_of_attorney !== undefined) {
      promises.push(vehicleDetailsRepository.savePower(id, companyId, power_of_attorney));
    }
    if (stock_metrics !== undefined) {
      promises.push(vehicleDetailsRepository.saveStockMetrics(id, companyId, stock_metrics));
    }
    if (publication !== undefined) {
      promises.push(vehicleDetailsRepository.savePublication(id, companyId, publication));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return updatedVehicle;
  },

  async delete(supabase: any, id: string): Promise<boolean> {
    try {
      // 1. Buscar contratos associados ao veículo e excluí-los em cascata
      const contractsSnap = await db.collection("contracts").where("vehicle_id", "==", id).get();
      for (const doc of contractsSnap.docs) {
        await contractRepository.delete(db, doc.id);
      }

      // 2. Buscar custos relacionados e deletar
      const costs = await vehicleDetailsRepository.getCosts(id);
      const deleteCostsPromises = costs.map(c => vehicleDetailsRepository.deleteCost(c.id));
      
      // 3. Deletar coleções vinculadas ao vehicle_id
      const deleteDocsPromises = [
        db.collection("vehicle_debts").doc(id).delete(),
        db.collection("vehicle_brokers").doc(id).delete(),
        db.collection("vehicle_powers").doc(id).delete(),
        db.collection("vehicle_stock_metrics").doc(id).delete(),
        db.collection("vehicle_publications").doc(id).delete(),
      ];

      await Promise.all([...deleteCostsPromises, ...deleteDocsPromises]);
    } catch (err) {
      console.error("Error deleting vehicle associated records:", err);
    }

    return vehicleRepository.delete(supabase, id);
  },
};

