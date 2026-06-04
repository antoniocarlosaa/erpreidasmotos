import { transferRepository } from "@/repositories/transferRepository";
import { contractRepository } from "@/repositories/contractRepository";
import { vehicleRepository } from "@/repositories/vehicleRepository";
import { TransferProcess, ContractStatus } from "@/types";

export const transferService = {
  async getById(supabase: any, id: string): Promise<TransferProcess | null> {
    return transferRepository.getById(supabase, id);
  },

  async getByContractId(supabase: any, contractId: string): Promise<TransferProcess | null> {
    return transferRepository.getByContractId(supabase, contractId);
  },

  async list(supabase: any) {
    return transferRepository.list(supabase);
  },

  /**
   * Inicializa o processo de transferência operacional pós-venda
   */
  async startTransferProcess(
    supabase: any,
    params: {
      contract_id: string;
      responsible_id: string | null;
      forwarded_to?: string;
      entry_date: string;
      notes?: string;
    }
  ): Promise<TransferProcess | null> {
    // 1. Criar o processo
    const process = await transferRepository.create(supabase, {
      contract_id: params.contract_id,
      responsible_id: params.responsible_id,
      forwarded_to: params.forwarded_to,
      entry_date: params.entry_date,
      notes: params.notes,
    });

    if (!process) throw new Error("Erro ao iniciar processo de transferência.");

    // 2. Atualizar status do contrato para EM_PROCESSO_DE_TRANSFERENCIA
    await contractRepository.update(supabase, params.contract_id, {
      status: "EM_PROCESSO_DE_TRANSFERENCIA",
    });

    // 3. Adicionar primeiro log da timeline
    await transferRepository.addStatusLog(supabase, {
      transfer_process_id: process.id,
      previous_status: "AGUARDANDO_VENDEDOR_DAR_ENTRADA",
      new_status: "EM_PROCESSO_DE_TRANSFERENCIA",
      changed_by: params.responsible_id,
      notes: params.notes || "Processo de transferência de propriedade iniciado no sistema.",
    });

    return process;
  },

  /**
   * Atualiza o andamento do processo de transferência e sincroniza com o contrato e veículo
   */
  async updateTransferStatus(
    supabase: any,
    processId: string,
    params: {
      new_status: ContractStatus;
      changed_by: string | null;
      notes?: string;
      forwarded_to?: string;
      receipt_url?: string;
    }
  ): Promise<TransferProcess | null> {
    const process = await transferRepository.getById(supabase, processId);
    if (!process) throw new Error("Processo de transferência não encontrado.");

    const contract = process.contract;
    if (!contract) throw new Error("Contrato associado ao processo não encontrado.");

    // 1. Adicionar log da timeline
    await transferRepository.addStatusLog(supabase, {
      transfer_process_id: processId,
      previous_status: contract.status,
      new_status: params.new_status,
      changed_by: params.changed_by,
      notes: params.notes || `Alteração operacional de status para: ${params.new_status}`,
    });

    // 2. Atualizar o processo (recebimento, encaminhamento, etc)
    const updateData: Partial<TransferProcess> = {};
    if (params.forwarded_to !== undefined) updateData.forwarded_to = params.forwarded_to;
    if (params.receipt_url !== undefined) updateData.receipt_url = params.receipt_url;
    if (params.notes !== undefined) updateData.notes = params.notes;

    const updatedProcess = await transferRepository.update(supabase, processId, updateData);

    // 3. Atualizar status do contrato
    await contractRepository.update(supabase, contract.id, {
      status: params.new_status,
    });

    // 4. Se a transferência foi CONCLUÍDA, atualizamos o status do veículo para VENDIDO (pátio -> histórico definitivo)
    if (params.new_status === "TRANSFERÊNCIA_CONCLUÍDA") {
      await vehicleRepository.update(supabase, contract.vehicle_id, {
        status: "vendido",
      });
    }

    return updatedProcess;
  },

  async getStatusLogs(supabase: any, processId: string) {
    return transferRepository.getStatusLogs(supabase, processId);
  },
};
