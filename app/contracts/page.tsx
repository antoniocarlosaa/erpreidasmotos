import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getContracts } from "@/actions/contractActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { ContractsClient } from "@/components/contracts/contracts-client";

import { Contract } from "@/types";

export const revalidate = 0; // Fresh database records for contracts list

export default async function ContractsPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Pre-load contracts lists on the server
  let initialContracts: { data: Contract[]; count: number } = { data: [], count: 0 };
  try {
    initialContracts = await getContracts({ limit: 10, offset: 0 });
  } catch (error) {
    console.error("Failed to load contracts on server:", error);
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
      <ContractsClient initialContracts={initialContracts} userRole={profile.role} />
    </SidebarLayout>
  );
}
