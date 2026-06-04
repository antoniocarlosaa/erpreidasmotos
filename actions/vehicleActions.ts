"use server";

import { db } from "@/lib/firebase/admin";
import { vehicleService } from "@/services/vehicleService";
import { vehicleDetailsRepository } from "@/repositories/vehicleDetailsRepository";
import { auditService } from "@/services/auditService";
import { Vehicle } from "@/types";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./authActions";

export async function getVehicles(filters = {}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  return vehicleService.list(db, { ...filters, company_id: user.company_id });
}

export async function getVehicleById(id: string) {
  return vehicleService.getById(db, id);
}

export async function getVehicleFullDetails(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  return vehicleService.getFullDetails(db, id);
}

export async function getVehiclesWithDetails() {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  const result = await vehicleService.list(db, { limit: 1000, company_id: user.company_id });
  const vehicles = result.data;

  const vehiclesWithDetails = await Promise.all(
    vehicles.map(async (v) => {
      try {
        return await vehicleService.getFullDetails(db, v.id);
      } catch (err) {
        console.error(`Error loading details for vehicle ${v.id}:`, err);
        return {
          ...v,
          debts: { has_fines: false, fines_value: 0, has_ipva: false, ipva_value: 0, has_financing: false, financing_bank: "", financing_payout: 0 },
          broker: { has_broker: false, broker_name: "", broker_phone: "", broker_commission: 0 },
          power_of_attorney: { has_power: false, power_value: 0, power_payer: "loja" },
          stock_metrics: { entry_date: v.created_at?.split("T")[0] || new Date().toISOString().split("T")[0], sale_date: "", days_in_stock: 0 },
          publication: { publish_catalog: false, catalog_url: "", catalog_token: "" },
          costs: [],
        };
      }
    })
  );

  return vehiclesWithDetails;
}

export async function createVehicle(vehicleData: any) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const vehicle = await vehicleService.create(db, {
    ...vehicleData,
    company_id: user.company_id,
  });

  if (vehicle) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "CREATE_VEHICLE",
      details: { vehicle_id: vehicle.id, model: vehicle.model, plate: vehicle.plate },
    });
  }

  revalidatePath("/vehicles");
  return vehicle;
}

export async function updateVehicle(id: string, vehicleData: any) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const vehicle = await vehicleService.update(db, id, {
    ...vehicleData,
    company_id: user.company_id,
  });

  if (vehicle) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "UPDATE_VEHICLE",
      details: { vehicle_id: id, updated_fields: Object.keys(vehicleData) },
    });
  }

  revalidatePath("/vehicles");
  return vehicle;
}

export async function deleteVehicle(id: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  // Load vehicle details before deleting
  const vehicle = await vehicleService.getById(db, id);

  const success = await vehicleService.delete(db, id);

  if (success && vehicle) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "DELETE_VEHICLE",
      details: { 
        vehicle_id: id,
        brand: vehicle.brand,
        model: vehicle.model,
        plate: vehicle.plate
      },
    });
  }

  revalidatePath("/vehicles");
  return success;
}

// Despesas do veículo
export async function addVehicleCost(costData: {
  vehicle_id: string;
  description: string;
  date: string;
  service_location: string;
  value: number;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  const cost = await vehicleDetailsRepository.addCost({
    ...costData,
    company_id: user.company_id,
  });

  if (cost) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "ADD_VEHICLE_COST",
      details: { vehicle_id: costData.vehicle_id, cost_id: cost.id, value: costData.value },
    });
  }

  revalidatePath("/vehicles");
  return cost;
}

export async function deleteVehicleCost(costId: string, vehicleId: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }
  const success = await vehicleDetailsRepository.deleteCost(costId);

  if (success) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "DELETE_VEHICLE_COST",
      details: { vehicle_id: vehicleId, cost_id: costId },
    });
  }

  revalidatePath("/vehicles");
  return success;
}

// Publicação em catálogo online
export async function updateVehiclePublication(vehicleId: string, publishData: {
  publish_catalog: boolean;
  catalog_url?: string;
  catalog_token?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) {
    throw new Error("Não autorizado.");
  }

  const success = await vehicleDetailsRepository.savePublication(vehicleId, user.company_id, publishData);
  
  if (success) {
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "UPDATE_VEHICLE_PUBLICATION",
      details: { vehicle_id: vehicleId, publish_catalog: publishData.publish_catalog },
    });

    if (publishData.catalog_url) {
      // Limpa espaços em branco, barras no final e converte tudo para minúsculo (evita erro 405 de URL em caixa alta)
      let sanitizedUrl = publishData.catalog_url.trim().toLowerCase().replace(/\/+$/, "");

      // Correção automática se o usuário informou o link do site (/vehicles) em vez da rota de API (/api/vehicles)
      if (sanitizedUrl.includes("catalogoexclusivemotos.vercel.app") && !sanitizedUrl.includes("/api/")) {
        if (sanitizedUrl.endsWith("/vehicles")) {
          sanitizedUrl = sanitizedUrl.replace("/vehicles", "/api/vehicles");
        } else {
          sanitizedUrl = `${sanitizedUrl}/api/vehicles`;
        }
      }

      const vehicle = await vehicleService.getFullDetails(db, vehicleId);
      if (vehicle) {
        const payload = {
          id: vehicleId,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          value: vehicle.value,
          photos: (vehicle.photos_ready && vehicle.photos_ready.length > 0) ? vehicle.photos_ready : (vehicle.photos || []),
          color: vehicle.color,
          mileage: vehicle.mileage,
          version: vehicle.version || "",
          plate: vehicle.plate,
          publish_catalog: publishData.publish_catalog,
        };

        try {
          console.log(`Sending publication to catalog: ${sanitizedUrl}`, payload);
          
          const response = await fetch(sanitizedUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${publishData.catalog_token || ""}`,
            },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            console.warn("External catalog endpoint returned non-ok status:", response.status);
            revalidatePath("/vehicles");
            return {
              success: true,
              catalogSynced: false,
              catalogError: `Servidor externo retornou HTTP ${response.status}`,
            };
          }
          
          revalidatePath("/vehicles");
          return { success: true, catalogSynced: true };
        } catch (fetchError: any) {
          console.error("Failed to post vehicle to online catalog external endpoint:", fetchError);
          revalidatePath("/vehicles");
          return {
            success: true,
            catalogSynced: false,
            catalogError: fetchError.message || "Erro de conexão/rede",
          };
        }
      }
    }
    
    revalidatePath("/vehicles");
    return { success: true, catalogSynced: false, catalogError: "URL do catálogo externa não informada" };
  }

  revalidatePath("/vehicles");
  return { success: false };
}

