import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getTransferProcesses } from "@/actions/transferActions";
import { getContracts } from "@/actions/contractActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { TransferClient } from "@/components/transfer/transfer-client";

export const revalidate = 0;

export default async function TransferPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Pre-load transfer processes and contracts on the server
  let initialProcesses: any[] = [];
  let signPendingContracts: any[] = [];

  try {
    initialProcesses = await getTransferProcesses();
    const allContracts = await getContracts({ limit: 100 });
    signPendingContracts = (allContracts.data || []).filter(
      (c) =>
        c.status === "AGUARDANDO_VENDEDOR_DAR_ENTRADA" ||
        c.status === "FALTA_PAGAMENTO_DE_ENTRADA"
    );
  } catch (error) {
    console.error("Failed to load transfer page data on server:", error);
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
      <TransferClient
        initialProcesses={initialProcesses}
        signPendingContracts={signPendingContracts}
        userRole={profile.role}
      />
    </SidebarLayout>
  );
}
