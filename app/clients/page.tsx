import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getClients } from "@/actions/clientActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { ClientsClient } from "@/components/clients/clients-client";

import { Client } from "@/types";

export const revalidate = 0; // Fresh database records for list navigation

export default async function ClientsPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Pre-load clients lists on the server
  let initialClients: { data: Client[]; count: number } = { data: [], count: 0 };
  try {
    initialClients = await getClients({ limit: 10, offset: 0 });
  } catch (error) {
    console.error("Failed to load clients on server:", error);
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
      <ClientsClient initialClients={initialClients} userRole={profile.role} />
    </SidebarLayout>
  );
}
