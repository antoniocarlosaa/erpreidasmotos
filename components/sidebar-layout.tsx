"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/actions/authActions";
import {
  LayoutDashboard,
  Users,
  Car,
  FileText,
  TrendingUp,
  FileCheck,
  LogOut,
  Menu,
  X,
  Bell,
  User as UserIcon,
  ShoppingCart,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarLayoutProps {
  children: React.ReactNode;
  userProfile: {
    name: string;
    email: string;
    role: "admin" | "vendedor" | "operacional" | "financeiro";
    company?: {
      name: string;
    };
  };
}

export function SidebarLayout({ children, userProfile }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    vendedor: "Vendedor",
    operacional: "Operações / Pós-Venda",
    financeiro: "Financeiro",
  };

  const allItems = [
    {
      name: "Veículos",
      href: "/vehicles",
      icon: Car,
      roles: ["admin", "vendedor"],
      colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
      iconColor: "text-cyan-400",
    },
    {
      name: "Venda",
      href: "/contracts/new",
      icon: ShoppingCart,
      roles: ["admin", "vendedor"],
      colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      iconColor: "text-emerald-400",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "vendedor", "operacional", "financeiro"],
      colorClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      iconColor: "text-indigo-400",
    },
    {
      name: "Clientes",
      href: "/clients",
      icon: Users,
      roles: ["admin", "vendedor"],
      colorClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      iconColor: "text-blue-400",
    },
    {
      name: "Contratos",
      href: "/contracts",
      icon: FileText,
      roles: ["admin", "vendedor"],
      colorClass: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      iconColor: "text-purple-400",
    },
    {
      name: "Pós-Venda (CRM)",
      href: "/transfer",
      icon: FileCheck,
      roles: ["admin", "operacional"],
      colorClass: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      iconColor: "text-rose-400",
    },
    {
      name: "Financeiro",
      href: "/finance",
      icon: TrendingUp,
      roles: ["admin", "financeiro"],
      colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      iconColor: "text-amber-400",
    },
    {
      name: "Configurações",
      href: "/settings",
      icon: Settings,
      roles: ["admin"],
      colorClass: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
      iconColor: "text-zinc-400",
    },
  ];

  const filteredItems = allItems.filter((item) =>
    item.roles.includes(userProfile.role)
  );

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      router.push("/login");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      {/* Premium ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_70%_20%,rgba(6,182,212,0.045),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.04),transparent_45%)]" />

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-tight bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent uppercase leading-tight">
                Gerenciador de Contratos
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground leading-tight">
                e Transferências
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Company Title */}
        {userProfile.company?.name && (
          <div className="px-6 py-3 border-b border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Empresa
            </p>
            <p className="text-sm font-medium text-foreground truncate">
              {userProfile.company.name}
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-zinc-800/40 text-foreground border border-zinc-800/50"
                    : "text-muted-foreground hover:bg-zinc-900/30 hover:text-foreground border border-transparent"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div className={`p-1.5 rounded-lg border transition-all ${
                  isActive
                    ? (item as any).colorClass
                    : "bg-zinc-950/40 border-zinc-900 text-muted-foreground group-hover:bg-zinc-900/40 group-hover:border-zinc-800"
                }`}>
                  <Icon size={15} className={`transition-colors ${isActive ? "" : `group-hover:${(item as any).iconColor}`}`} />
                </div>
                <span className="transition-colors">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer User Info */}
        <div className="mt-auto border-t border-border p-4 bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold border border-primary/20">
              {getInitials(userProfile.name)}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {userProfile.name}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabels[userProfile.role] || userProfile.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-4 w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs py-2 h-9"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            <span>Sair do ERP</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/40 backdrop-blur-md px-6 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-secondary md:hidden"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base font-semibold md:text-lg text-foreground">
              {pathname === "/dashboard"
                ? "Painel Gerencial"
                : pathname.startsWith("/clients")
                ? "Gestão de Clientes"
                : pathname.startsWith("/vehicles")
                ? "Inventário de Veículos"
                : pathname.startsWith("/contracts/new")
                ? "Nova Venda / Elaborar Contrato"
                : pathname.startsWith("/contracts")
                ? "Contratos e Vendas"
                : pathname.startsWith("/transfer")
                ? "Timeline & CRM de Transferências"
                : pathname.startsWith("/finance")
                ? "Fluxo Financeiro"
                : pathname.startsWith("/settings")
                ? "Configurações do Sistema"
                : "Sistema ERP"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell placeholder */}
            <button className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary/60 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary pulse-active" />
            </button>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="items-center gap-2 hidden sm:flex">
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border/40">
                {roleLabels[userProfile.role]}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-6 md:p-8 bg-background">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
