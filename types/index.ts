// =========================================================================
// ERP AUTOMOTIVO - ARQUIVO DE TIPAGENS GLOBAIS E DTOs
// =========================================================================

export type UserRole = "admin" | "vendedor" | "operacional" | "financeiro";

export interface Company {
  id: string;
  name: string;
  document?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  company_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  cpf: string;
  rg?: string;
  cnh?: string;
  birth_date?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  zip_code?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export type VehicleCategory = "carro" | "moto";
export type VehicleStatus = "disponivel" | "vendido" | "reservado" | "em_preparacao" | "aguardando_documentacao";

export interface Vehicle {
  id: string;
  company_id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  renavam: string;
  chassis: string;
  mileage: number;
  value: number;
  category: VehicleCategory;
  notes?: string;
  photos: string[];
  photos_ready?: string[];
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  // Novos campos adicionados para o Módulo Avançado
  version?: string;
  owner_name?: string;
  owner_cpf?: string;
  owner_phone?: string;
  nickname?: string;
  items_delivered?: {
    manual: boolean;
    spare_key: boolean;
    dut: boolean;
    atpv: boolean;
    crlv: boolean;
    power_of_attorney: boolean;
    clearance: boolean;
    zero_km?: boolean;
  };
  dispatch_fee?: number;
  sale_intention_fee?: number;
  registration_fee?: number;
  transfer_fee?: number;
  cancellation_fee?: number;
  condition?: "nada_a_fazer" | "revisao_simples" | "troca_pecas" | "funilaria" | "pintura" | "mecanica" | "eletrica" | "preparacao_completa";
  condition_notes?: string;
  appraisal_value?: number;
  purchase_value?: number;
  notary_costs?: number;
  notary_payment_type?: "cliente_paga_fora" | "loja_assume" | "descontar_avaliacao";
  notary_discount_value?: number;
  entry_modality?: "compra" | "consignado";
  consignation_period_days?: number;
  consignation_owner_value?: number;
}

export interface VehicleCost {
  id: string;
  vehicle_id: string;
  company_id: string;
  description: string;
  date: string;
  service_location: string;
  value: number;
  created_at: string;
}

export interface VehicleDebt {
  id: string;
  vehicle_id: string;
  company_id: string;
  has_fines: boolean;
  fines_value?: number;
  has_ipva: boolean;
  ipva_value?: number;
  has_financing: boolean;
  financing_type?: "financiamento" | "consorcio";
  financing_bank?: string;
  financing_payout?: number;
}

export interface VehicleBroker {
  id: string;
  vehicle_id: string;
  company_id: string;
  has_broker: boolean;
  broker_name?: string;
  broker_phone?: string;
  broker_commission?: number;
}

export interface VehiclePower {
  id: string;
  vehicle_id: string;
  company_id: string;
  has_power: boolean;
  power_value?: number;
  power_payer?: "loja" | "proprietario";
}

export interface VehicleStockMetrics {
  id: string;
  vehicle_id: string;
  company_id: string;
  entry_date?: string;
  sale_date?: string;
  days_in_stock?: number;
}

export interface VehiclePublication {
  id: string;
  vehicle_id: string;
  company_id: string;
  publish_catalog: boolean;
  catalog_url?: string;
  catalog_token?: string;
}

export type ContractStatus =
  | "AGUARDANDO_INICIAR"
  | "AGUARDANDO_COMPRADOR_FINALIZAR"
  | "AGUARDANDO_VENDEDOR_DAR_ENTRADA"
  | "DADOS_ENVIADOS_PROPRIETARIO"
  | "AGUARDANDO_FINALIZACAO"
  | "AGUARDANDO_DESPACHANTE"
  | "AGUARDANDO_VENDEDOR"
  | "FALTA_PAGAMENTO_DE_ENTRADA"
  | "EM_PROCESSO_DE_TRANSFERENCIA"
  | "DOCUMENTAÇÃO_PENDENTE"
  | "TRANSFERÊNCIA_CONCLUÍDA"
  | "TRANSFERÊNCIA_CANCELADA"
  | "DUT_AGUARDANDO_RECONHECER_VENDEDOR"
  | "DUT_AGUARDANDO_RECONHECER_COMPRADOR"
  | "DUT_AGUARDANDO_VISTORIA"
  | "DUT_AGUARDANDO_FINALIZAR_TAXAS_DETRAN"
  | "AGUARDANDO_ATPVE_GERAR"
  | "AGUARDANDO_ATPVE_RECONHECER_COMPRADOR"
  | "AGUARDANDO_ENTRADA";

export interface Contract {
  id: string;
  company_id: string;
  contract_number: number;
  client_id: string;
  vehicle_id: string;
  seller_id: string | null;
  total_value: number;
  down_payment: number;
  installments_count: number;
  interest_rate: number;
  warranty_text?: string;
  notes?: string;
  custom_clauses: string[];
  status: ContractStatus;
  version: number;
  created_at: string;
  updated_at: string;
  // Novos campos para melhorias
  modality: "vista" | "financiada" | "compra_venda" | "repasse" | "compra" | "consignado";
  former_owner_name?: string;
  former_owner_cpf?: string;
  delivery_km?: number;
  warranty_period_days?: number;
  warranty_type?: "motor_cambio" | "personalizada";
  payment_method?: "pix" | "especie" | "cartao_parcelado" | "cartao_debit" | "multiplo";
  has_remaining_balance?: boolean;
  negotiation_agreement?: string;
  consignation_period_days?: number;
  consignation_owner_value?: number;
  // Campos de rastreamento de datas da operação
  sale_date?: string;
  down_payment_date?: string;
  completion_date?: string;
  status_updated_at?: string;
  status_dates?: Record<string, string>;
  // Novos campos de Compra de Veículo
  appraised_value?: number;
  detran_debt?: number;
  fines_debt?: number;
  bank_payout?: number;
  atpve_intention_type?: "descontada" | "cliente_paga" | "loja_assume";
  net_value?: number;
  purchase_date?: string;
  has_dut?: boolean;
  has_spare_key?: boolean;
  has_manual?: boolean;
  former_owner_phone?: string;
  seller_representative_type?: "cliente" | "corretor";
  broker_name?: string;
  broker_phone?: string;
  refund_value?: number;
  refund_method?: "pix" | "especie" | "transferencia";
  refund_due_date?: string;
  refund_pix_key?: string;
  refund_notes?: string;
  // Relacionamentos carregados opcionalmente
  client?: Client;
  vehicle?: Vehicle;
  seller?: UserProfile;
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version: number;
  changes: Record<string, any>;
  updated_by: string | null;
  created_at: string;
}

export interface Signature {
  id: string;
  contract_id: string;
  signature_data: string; // Base64 PNG
  ip_address: string;
  signed_at: string;
  user_agent: string;
  location?: string;
  role: "comprador" | "vendedor";
}

export interface TransferProcess {
  id: string;
  contract_id: string;
  responsible_id: string | null;
  forwarded_to?: string;
  entry_date: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  contract?: Contract;
  responsible?: UserProfile;
}

export interface TransferStatusLog {
  id: string;
  transfer_process_id: string;
  previous_status?: string;
  new_status: string;
  changed_by: string | null;
  notes?: string;
  created_at: string;
  user?: UserProfile;
}

export type PaymentStatus = "PENDENTE" | "PAGO" | "ATRASADO";
export type PaymentMethod = "dinheiro" | "pix" | "cartao_credito" | "boleto" | "transferencia_bancaria";

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  due_date: string;
  paid_at?: string;
  payment_method?: PaymentMethod;
  status: PaymentStatus;
  installment_number: number; // 0 para Entrada, 1..N para parcelas
  created_at: string;
  is_refund?: boolean;
}

export type FinancialEntryType = "RECEITA" | "DESPESA";

export interface FinancialEntry {
  id: string;
  company_id: string;
  contract_id: string | null;
  type: FinancialEntryType;
  amount: number;
  description: string;
  entry_date: string;
  category: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: string;
  user?: UserProfile;
}

export interface AppNotification {
  id: string;
  company_id: string;
  user_id?: string;
  title: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  contract_id?: string;
  client_id?: string;
  vehicle_id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
}

// =========================================================================
// NOVAS INTERFACES PARA MELHORIAS DE CONTRATOS E PÓS-VENDA
// =========================================================================

export interface ContractChecklistItem {
  name: string;
  status: "CONFORME" | "NAO_CONFORME" | "AVARIADO";
  notes?: string;
  photo_url?: string;
}

export interface ContractChecklist {
  id: string;
  contract_id: string;
  items: ContractChecklistItem[];
  buyer_signature?: string; // Base64 PNG
  inspector_signature?: string; // Base64 PNG
  inspector_id: string;
  inspector_name?: string;
  created_at: string;
}

export interface ContractTransferProcess {
  id: string;
  contract_id: string;
  entry_date: string;
  responsible_id: string | null;
  forwarded_to: "ex_proprietario" | "despachante" | "corretor" | "comprador" | "financeira";
  forwarded_name?: string;
  notes?: string;
  attachments?: string[];
  receipts?: string[];
  receipt_url?: string;
  status: ContractStatus;
  updated_at: string;
}

export interface ContractTransferLog {
  id: string;
  contract_id: string;
  changed_by: string | null;
  previous_status?: string;
  new_status: string;
  notes?: string;
  created_at: string;
}

export interface ContractTimeline {
  id: string;
  contract_id: string;
  event_type: string;
  description: string;
  user_id: string | null;
  user_name?: string;
  ip_address: string;
  created_at: string;
}

export interface ContractWarranty {
  id: string;
  contract_id: string;
  type: "motor_cambio" | "personalizada";
  period_days: number;
  start_date: string;
  end_date: string;
  status: "ativa" | "vencida" | "proxima_vencimento";
}

export interface ReviewItem {
  number: number;
  km_expected: number;
  km_actual?: number;
  scheduled_date?: string;
  completed_date?: string;
  status: "programada" | "concluida" | "atrasada";
}

export interface ContractReview {
  id: string;
  contract_id: string;
  km_delivery: number;
  revisions: ReviewItem[];
  created_at: string;
  updated_at: string;
}
