import React from "react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getContractById, getContractSignatures } from "@/actions/contractActions";
import { getPayments } from "@/actions/financeActions";
import { getCompanyDetails } from "@/actions/settingsActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { ContractDetailClient } from "@/components/contracts/contract-detail-client";

export const revalidate = 0;

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  const contract = await getContractById(id);
  if (!contract) {
    notFound();
  }

  const payments = await getPayments(id);
  const signatures = await getContractSignatures(id);

  let company = null;
  try {
    company = await getCompanyDetails();
  } catch (error) {
    console.error("Error loading company details for contract:", error);
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
      <ContractDetailClient
        contract={contract}
        initialPayments={payments}
        initialSignatures={signatures}
        userProfile={profile}
        company={company}
      />
    </SidebarLayout>
  );
}
