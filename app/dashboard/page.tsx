import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/authActions";
import { getDashboardData } from "@/actions/dashboardActions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const revalidate = 0; // Disable server caching for real-time dashboard updates

export default async function DashboardPage() {
  const profile = await getCurrentUser();

  if (!profile) {
    redirect("/login");
  }

  // Obter dados estatísticos do banco
  let dashboardData;
  try {
    dashboardData = await getDashboardData();
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    // Fallback em caso de dados vazios ou erro no banco
    dashboardData = {
      kpis: {
        totalSold: 0,
        finishedContractsCount: 0,
        pendingContractsCount: 0,
        pendingTransfersCount: 0,
        pendingDownPaymentsCount: 0,
        vehiclesInStock: 0,
        vehiclesSold: 0,
        ticketMedio: 0,
        avgCompletionDays: "0 dias",
        activeWarranties: 0,
        expiredWarranties: 0,
        scheduledReviewsCount: 0,
      },
      charts: {
        chartSales: [],
        chartStatus: [],
        chartProjection: [],
        chartCashFlow: [],
        chartCategory: [],
        chartWarranties: [],
        chartReviews: [],
        pendingReviewsList: [],
        activeWarrantiesList: [],
        recentContracts: [],
        recentTransactions: [],
      },
    };
  }

  // Format user profile for sidebar
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
      <DashboardClient data={dashboardData} />
    </SidebarLayout>
  );
}
