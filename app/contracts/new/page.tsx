import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getClients } from "@/actions/clientActions";
import { getVehicles } from "@/actions/vehicleActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { ContractFormClient } from "@/components/contracts/contract-form-client";

export const revalidate = 0;

export default async function NewContractPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Pre-load active clients and available vehicles for contract generation
  let clients: any[] = [];
  let vehicles: any[] = [];

  try {
    const clientsRes = await getClients({ limit: 1000 });
    clients = clientsRes.data;
    
    const vehiclesRes = await getVehicles({ limit: 1000 });
    vehicles = vehiclesRes.data;
  } catch (error) {
    console.error("Error fetching dependencies for new contract:", error);
  }

  const userProfile = {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    company: profile.company
      ? {
          name: profile.company.name,
        }
      : undefined,
  };

  return (
    <SidebarLayout userProfile={userProfile}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Elaborar Contrato de Venda</h2>
          <p className="text-sm text-muted-foreground">
            Configure as regras de financiamento, dados cadastrais do comprador e termos de garantia.
          </p>
        </div>
        <ContractFormClient clients={clients} vehicles={vehicles} />
      </div>
    </SidebarLayout>
  );
}
