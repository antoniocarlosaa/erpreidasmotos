// =========================================================================
// VALIDATORES E MÁSCARAS DE DOCUMENTOS BRASILEIROS
// =========================================================================

/**
 * Remove qualquer caractere não numérico
 */
export function cleanMask(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validação algorítmica de CPF
 */
export function validateCPF(cpf: string): boolean {
  const clean = cleanMask(cpf);
  if (clean.length !== 11) return false;

  // Elimina CPFs conhecidos inválidos
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;

  return true;
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const clean = cleanMask(cpf).slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

/**
 * Aplica máscara de Telefone / WhatsApp: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(phone: string): string {
  const clean = cleanMask(phone).slice(0, 11);
  if (clean.length <= 2) return clean.length > 0 ? `(${clean}` : "";
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

/**
 * Aplica máscara de CEP: 00000-000
 */
export function formatCEP(cep: string): string {
  const clean = cleanMask(cep).slice(0, 8);
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

/**
 * Formata Placa de Veículo no padrão Mercosul ou Antigo
 */
export function formatPlate(plate: string): string {
  // Remove caracteres especiais e limita a 7
  return plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
}
