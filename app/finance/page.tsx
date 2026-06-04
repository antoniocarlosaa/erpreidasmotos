import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getFinancialEntries, getAllPayments } from "@/actions/financeActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { FinanceClient } from "@/components/finance/finance-client";

export const revalidate = 0; // Real-time data loading for financial updates

export default async function FinancePage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Apenas Administradores e Financeiro podem acessar esta página
  if (profile.role !== "admin" && profile.role !== "financeiro") {
    redirect("/dashboard");
  }

  let entries: any[] = [];
  let payments: any[] = [];

  try {
    entries = await getFinancialEntries();
    payments = await getAllPayments();
  } catch (error) {
    console.error("Erro ao carregar dados financeiros no servidor:", error);
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
      <FinanceClient 
        initialEntries={entries} 
        initialPayments={payments} 
        userRole={profile.role}
      />
    </SidebarLayout>
  );
}
