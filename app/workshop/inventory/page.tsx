import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getWorkshopProducts, getStockEntries, getStockExits } from "@/actions/workshopActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { InventoryClient } from "@/components/workshop/inventory-client";

export const revalidate = 0;

export default async function WorkshopInventoryPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Apenas Administradores, Operacional e Financeiro podem gerenciar estoque de peças
  if (profile.role !== "admin" && profile.role !== "operacional" && profile.role !== "financeiro") {
    redirect("/dashboard");
  }

  let products: any[] = [];
  let entries: any[] = [];
  let exits: any[] = [];

  try {
    products = await getWorkshopProducts();
    entries = await getStockEntries();
    exits = await getStockExits();
  } catch (error) {
    console.error("Failed to load workshop inventory dependency data:", error);
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
      <InventoryClient
        initialProducts={products}
        initialEntries={entries}
        initialExits={exits}
        userProfile={userProfile}
      />
    </SidebarLayout>
  );
}
