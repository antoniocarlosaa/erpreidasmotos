import { UserRole } from "@/types";

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  vendedor: [
    "dashboard_grafico_categoria",
    "gerenciar_clientes",
    "gerenciar_veiculos",
    "gerenciar_contratos",
    "gerenciar_pos_venda"
  ],
  operacional: [
    "dashboard_grafico_categoria",
    "gerenciar_pos_venda",
    "acessar_oficina",
    "acessar_estoque_pecas"
  ],
  financeiro: [
    "dashboard_faturamento",
    "dashboard_ticket_medio",
    "dashboard_grafico_vendas",
    "dashboard_grafico_caixa",
    "dashboard_grafico_projecao",
    "dashboard_grafico_categoria",
    "dashboard_recent_contracts",
    "dashboard_recent_transactions",
    "acessar_financeiro",
    "acessar_estoque_pecas"
  ],
  admin: [
    "dashboard_faturamento",
    "dashboard_ticket_medio",
    "dashboard_grafico_vendas",
    "dashboard_grafico_caixa",
    "dashboard_grafico_projecao",
    "dashboard_grafico_categoria",
    "dashboard_recent_contracts",
    "dashboard_recent_transactions",
    "acessar_financeiro",
    "gerenciar_clientes",
    "gerenciar_veiculos",
    "gerenciar_contratos",
    "gerenciar_pos_venda",
    "acessar_oficina",
    "acessar_estoque_pecas"
  ]
};

export function hasPermission(
  role: UserRole,
  permission: string,
  companyPermissions?: Record<string, string[]> | null
): boolean {
  if (role === "admin") return true;
  const rolePerms = companyPermissions?.[role] || DEFAULT_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
}
