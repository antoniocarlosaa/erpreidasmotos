import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getWorkshopMaintenances, getWorkshopAppointments, getWorkshopProducts } from "@/actions/workshopActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { WorkshopClient } from "@/components/workshop/workshop-client";
import { hasPermission } from "@/utils/permissions";

export const revalidate = 0;

export default async function WorkshopPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  const hasAccess = hasPermission(
    profile.role,
    "acessar_oficina",
    profile.company?.permissions
  );

  if (!hasAccess) {
    redirect("/dashboard");
  }

  let maintenances: any[] = [];
  let appointments: any[] = [];
  let products: any[] = [];

  try {
    maintenances = await getWorkshopMaintenances();
    appointments = await getWorkshopAppointments();
    products = await getWorkshopProducts();
  } catch (error) {
    console.error("Failed to load workshop dependency data:", error);
  }

  const userProfile = {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    company: profile.company
      ? {
          name: profile.company.name,
          permissions: profile.company.permissions || null,
        }
      : undefined,
  };

  return (
    <SidebarLayout userProfile={userProfile}>
      <WorkshopClient
        initialMaintenances={maintenances}
        initialAppointments={appointments}
        initialProducts={products}
        userProfile={userProfile}
      />
    </SidebarLayout>
  );
}
