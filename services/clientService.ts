import { clientRepository, ClientFilters } from "@/repositories/clientRepository";
import { Client } from "@/types";
import { validateCPF, cleanMask } from "@/utils/validators";

export const clientService = {
  async getById(supabase: any, id: string): Promise<Client | null> {
    return clientRepository.getById(supabase, id);
  },

  async list(supabase: any, filters: ClientFilters = {}) {
    return clientRepository.list(supabase, filters);
  },

  async create(supabase: any, clientData: Omit<Client, "id" | "created_at" | "updated_at">): Promise<Client | null> {
    // 1. Limpar e Validar CPF
    const rawCpf = cleanMask(clientData.cpf);
    if (!validateCPF(rawCpf)) {
      throw new Error("CPF inválido. Por favor, verifique os dígitos informados.");
    }

    // 2. Verificar duplicidade de CPF na mesma empresa
    const existing = await clientRepository.getByCPF(supabase, rawCpf);
    if (existing && existing.company_id === clientData.company_id) {
      throw new Error(`CPF ${clientData.cpf} já cadastrado para outro cliente nesta concessionária.`);
    }

    // 3. Normalizar dados
    const normalizedClient = {
      ...clientData,
      cpf: rawCpf,
      phone: clientData.phone ? cleanMask(clientData.phone) : undefined,
      whatsapp: clientData.whatsapp ? cleanMask(clientData.whatsapp) : undefined,
      zip_code: clientData.zip_code ? cleanMask(clientData.zip_code) : undefined,
    };

    return clientRepository.create(supabase, normalizedClient);
  },

  async update(
    supabase: any,
    id: string,
    clientData: Partial<Omit<Client, "id" | "created_at" | "updated_at">>
  ): Promise<Client | null> {
    // Se CPF estiver sendo atualizado, fazemos as devidas validações
    if (clientData.cpf) {
      const rawCpf = cleanMask(clientData.cpf);
      if (!validateCPF(rawCpf)) {
        throw new Error("CPF inválido.");
      }
      
      const existing = await clientRepository.getByCPF(supabase, rawCpf);
      if (existing && existing.id !== id && existing.company_id === existing.company_id) {
        throw new Error(`CPF ${clientData.cpf} já cadastrado para outro cliente.`);
      }
      clientData.cpf = rawCpf;
    }

    if (clientData.phone) clientData.phone = cleanMask(clientData.phone);
    if (clientData.whatsapp) clientData.whatsapp = cleanMask(clientData.whatsapp);
    if (clientData.zip_code) clientData.zip_code = cleanMask(clientData.zip_code);

    return clientRepository.update(supabase, id, clientData);
  },

  async delete(supabase: any, id: string): Promise<boolean> {
    return clientRepository.delete(supabase, id);
  },
};
