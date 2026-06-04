import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getVehicles } from "@/actions/vehicleActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { VehiclesClient } from "@/components/vehicles/vehicles-client";

import { Vehicle } from "@/types";

export const revalidate = 0; // Fresh database records for list navigation

export default async function VehiclesPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Pre-load vehicles lists on the server
  let initialVehicles: { data: Vehicle[]; count: number } = { data: [], count: 0 };
  try {
    initialVehicles = await getVehicles({ limit: 10, offset: 0 });
  } catch (error) {
    console.error("Failed to load vehicles on server:", error);
  }

  // Format profile for layout
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
      <VehiclesClient initialVehicles={initialVehicles} userRole={profile.role} />
    </SidebarLayout>
  );
}
