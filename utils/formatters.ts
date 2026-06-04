// =========================================================================
// FORMATADORES DE MOEDA, DATAS E QUILOMETRAGEM (PADRÃO BRASILEIRO)
// =========================================================================

/**
 * Formata um valor numérico para Moeda Real (BRL): R$ 125.000,00
 */
export function formatCurrency(value: number | string): string {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(amount)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export const formatBRL = formatCurrency;

/**
 * Formata quilometragem: 28.500 km
 */
export function formatMileage(km: number | string): string {
  const mileage = typeof km === "string" ? parseInt(km, 10) : km;
  if (isNaN(mileage)) return "0 km";
  return `${new Intl.NumberFormat("pt-BR").format(mileage)} km`;
}

/**
 * Formata data ISO para padrão brasileiro: DD/MM/AAAA
 */
export function formatDate(dateString?: string | Date): string {
  if (!dateString) return "-";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-";
  
  // Ajuste para fuso horário local para evitar retrocesso de data em fusos negativos
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

/**
 * Formata data e hora ISO para padrão brasileiro: DD/MM/AAAA às HH:MM
 */
export function formatDateTime(dateString?: string | Date): string {
  if (!dateString) return "-";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "-";
  
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  
  const formattedTime = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${formattedDate} às ${formattedTime}`;
}

/**
 * Retorna as iniciais de um nome (ex: "Carlos Henrique" -> "CH")
 */
export function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
