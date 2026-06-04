import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getCompanyDetails, getCompanyEmployees, getCompanyAuditLogs } from "@/actions/settingsActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { SettingsClient } from "@/components/settings/settings-client";

export const revalidate = 0;

export default async function SettingsPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Apenas Administradores podem gerenciar configurações da empresa e funcionários
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  let company = null;
  let employees: any[] = [];
  let auditLogs: any[] = [];

  try {
    company = await getCompanyDetails();
    employees = await getCompanyEmployees();
    auditLogs = await getCompanyAuditLogs();
  } catch (error) {
    console.error("Failed to load settings dependency data:", error);
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
      <SettingsClient company={company} initialEmployees={employees} initialAuditLogs={auditLogs} />
    </SidebarLayout>
  );
}
