import { contractRepository, ContractFilters } from "@/repositories/contractRepository";
import { vehicleRepository } from "@/repositories/vehicleRepository";
import { financialRepository } from "@/repositories/financialRepository";
import { Contract, Payment, ContractStatus, Signature } from "@/types";

export const contractService = {
  async getById(supabase: any, id: string): Promise<Contract | null> {
    return contractRepository.getById(supabase, id);
  },

  async list(supabase: any, filters: ContractFilters = {}) {
    return contractRepository.list(supabase, filters);
  },

  /**
   * Cálculo de parcela com Tabela Price (Juros Compostos)
   */
  calculatePMT(financedAmount: number, interestRatePercent: number, months: number): number {
    if (financedAmount <= 0) return 0;
    if (months <= 0) return financedAmount;
    if (interestRatePercent <= 0) return financedAmount / months;

    const i = interestRatePercent / 100;
    const pmt = (financedAmount * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
    return Number(pmt.toFixed(2));
  },

  /**
   * Cria um novo contrato e gera o cronograma de parcelas e reserva o veículo
   */
  async createContract(
    supabase: any,
    contractData: Omit<Contract, "id" | "contract_number" | "version" | "created_at" | "updated_at">
  ): Promise<Contract | null> {
    // Caso especial de Compra de Veículo (a loja está adquirindo do cliente)
    if (contractData.modality === "compra") {
      const createdContract = await contractRepository.create(supabase, {
        ...contractData,
        status: "AGUARDANDO_INICIAR", // Inicializa como Aguardando Iniciar
      });
      if (!createdContract) throw new Error("Falha ao cadastrar o contrato de compra.");

      // Registrar o pagamento pendente que a loja deve realizar para o vendedor (Valor Líquido)
      await financialRepository.createPayments(supabase, [
        {
          contract_id: createdContract.id,
          amount: contractData.net_value || contractData.total_value,
          due_date: contractData.purchase_date || new Date().toISOString().split("T")[0],
          status: "PENDENTE",
          installment_number: 1,
        }
      ]);

      return createdContract;
    }

    // Caso especial de Consignação (o cliente deixa o veículo na loja)
    if (contractData.modality === "consignado") {
      const createdContract = await contractRepository.create(supabase, {
        ...contractData,
        status: "AGUARDANDO_INICIAR",
      });
      if (!createdContract) throw new Error("Falha ao cadastrar o contrato de consignação.");

      // Garante que o status do veículo fica como "disponivel" no estoque
      await vehicleRepository.update(supabase, contractData.vehicle_id, {
        status: "disponivel",
      });

      return createdContract;
    }

    // 1. Verificar se veículo está disponível
    const vehicle = await vehicleRepository.getById(supabase, contractData.vehicle_id);
    if (!vehicle) throw new Error("Veículo não encontrado.");
    
    if (vehicle.status !== "disponivel") {
      // Verifica se o veículo está realmente associado a algum contrato ativo.
      // Se não houver contrato, o status "reservado" veio de uma tentativa fracassada anterior.
      const contractsSnap = await supabase
        .collection("contracts")
        .where("vehicle_id", "==", contractData.vehicle_id)
        .limit(1)
        .get();
        
      if (contractsSnap.empty) {
        // Reseta o status para disponível e prossegue
        await vehicleRepository.update(supabase, contractData.vehicle_id, {
          status: "disponivel",
        });
        vehicle.status = "disponivel";
      } else {
        throw new Error("Veículo já está reservado ou vendido.");
      }
    }

    // 2. Criar contrato (inicializado em AGUARDANDO_INICIAR)
    const createdContract = await contractRepository.create(supabase, {
      ...contractData,
      status: "AGUARDANDO_INICIAR",
    });

    if (!createdContract) throw new Error("Falha ao cadastrar o contrato.");

    // Se for Compra e Venda (Troca), cadastra o veículo de troca de volta no estoque
    if (contractData.modality === "compra_venda" && (contractData as any).trade_brand_model) {
      const brandStr = (contractData as any).trade_brand_model.split(" ")[0] || "Marca";
      const modelStr = (contractData as any).trade_brand_model.split(" ").slice(1).join(" ") || (contractData as any).trade_brand_model;
      
      const clientDoc = await supabase.collection("clients").doc(contractData.client_id).get().catch(() => null);
      const clientData = clientDoc && clientDoc.exists ? clientDoc.data() : null;

      await vehicleRepository.create(supabase, {
        company_id: contractData.company_id,
        brand: brandStr,
        model: modelStr,
        year: Number((contractData as any).trade_year) || new Date().getFullYear(),
        color: (contractData as any).trade_color || "Não informada",
        plate: (contractData as any).trade_plate || "SEM-PLACA",
        renavam: (contractData as any).trade_renavam || "",
        chassis: (contractData as any).trade_chassis || "",
        mileage: Number((contractData as any).trade_mileage) || 0,
        value: Number((contractData as any).trade_value) || 0,
        category: (contractData as any).trade_category || "moto",
        status: "disponivel",
        entry_modality: "compra",
        photos: [],
        photos_ready: [],
        owner_name: clientData?.name || "",
        owner_cpf: clientData?.cpf || "",
        owner_phone: clientData?.phone || clientData?.whatsapp || "",
        notes: `Veículo recebido na troca no contrato nº ${createdContract.contract_number}.`,
      });
    }

    // 3. Dar baixa no veículo (status vendido) e salvar dados da venda
    await vehicleRepository.update(supabase, contractData.vehicle_id, {
      status: "vendido",
      sale_date: new Date().toISOString().split("T")[0],
      sold_by_name: (contractData as any).seller_name || "Vendedor",
      payment_method: contractData.payment_method || "Não informado",
      sale_modality: contractData.modality || "Não informada",
    });

    // 4. Gerar Parcelas no Módulo Financeiro
    const paymentsToCreate: Omit<Payment, "id" | "created_at">[] = [];

    if (contractData.modality === "compra_venda") {
      const tradeVal = (contractData as any).trade_value || 0;
      const cashVal = (contractData as any).trade_cash || 0;
      const pixVal = (contractData as any).trade_pix || 0;
      const cardVal = (contractData as any).trade_card || 0;
      const financedVal = (contractData as any).trade_financed || 0;

      // 1. Registro da Entrada (Veículo de Troca)
      if (tradeVal > 0) {
        paymentsToCreate.push({
          contract_id: createdContract.id,
          amount: tradeVal,
          due_date: new Date().toISOString().split("T")[0],
          status: "PAGO", // Veículo de troca entra como pago
          payment_method: "pix",
          installment_number: 0, // 0 = Entrada
        });
      }

      // 2. Registro de pagamentos feitos no ato
      if (cashVal > 0) {
        paymentsToCreate.push({
          contract_id: createdContract.id,
          amount: cashVal,
          due_date: new Date().toISOString().split("T")[0],
          status: "PAGO",
          payment_method: "dinheiro",
          installment_number: 101, // Identificador de pagamento no ato
        });
      }
      if (pixVal > 0) {
        paymentsToCreate.push({
          contract_id: createdContract.id,
          amount: pixVal,
          due_date: new Date().toISOString().split("T")[0],
          status: "PAGO",
          payment_method: "pix",
          installment_number: 102,
        });
      }
      if (cardVal > 0) {
        paymentsToCreate.push({
          contract_id: createdContract.id,
          amount: cardVal,
          due_date: new Date().toISOString().split("T")[0],
          status: "PAGO",
          payment_method: "cartao_credito",
          installment_number: 103,
        });
      }
      if (financedVal > 0) {
        paymentsToCreate.push({
          contract_id: createdContract.id,
          amount: financedVal,
          due_date: new Date().toISOString().split("T")[0],
          status: "PENDENTE",
          payment_method: "transferencia_bancaria",
          installment_number: 104,
        });
      }

      // 3. Parcelas do Saldo Restante (se houver)
      const remainingVal = (contractData as any).remaining_balance || 0;
      if (remainingVal > 0) {
        const installments = (contractData as any).remaining_installments || 1;
        const installmentAmount = Number((remainingVal / installments).toFixed(2));
        const method = (contractData as any).remaining_method || "pix";

        let payMethod: PaymentMethod = "pix";
        if (method === "especie") payMethod = "dinheiro";
        else if (method === "cartao_parcelado") payMethod = "cartao_credito";
        else if (method === "cheque") payMethod = "transferencia_bancaria";
        else if (method === "boleto") payMethod = "boleto";

        const today = new Date();
        const limitDateStr = (contractData as any).remaining_due_date;
        const limitDate = limitDateStr ? new Date(limitDateStr) : null;

        for (let i = 1; i <= installments; i++) {
          let dueDate = new Date(today);
          dueDate.setMonth(today.getMonth() + i);
          if (limitDate && dueDate > limitDate && i === installments) {
            dueDate = limitDate;
          }

          paymentsToCreate.push({
            contract_id: createdContract.id,
            amount: installmentAmount,
            due_date: dueDate.toISOString().split("T")[0],
            status: "PENDENTE",
            payment_method: payMethod,
            installment_number: i,
          });
        }
      }
    } else {
      const financedAmount = contractData.total_value - contractData.down_payment;

      // Parcela de Entrada (se houver)
      if (contractData.down_payment > 0) {
        paymentsToCreate.push({
          contract_id: createdContract.id,
          amount: contractData.down_payment,
          due_date: new Date().toISOString().split("T")[0], // Vence hoje
          status: "PENDENTE",
          installment_number: 0, // 0 = Entrada
        });
      }

      // Parcelas de Financiamento
      if (contractData.installments_count > 0 && financedAmount > 0) {
        const pmtAmount = this.calculatePMT(
          financedAmount,
          contractData.interest_rate,
          contractData.installments_count
        );

        const today = new Date();
        for (let i = 1; i <= contractData.installments_count; i++) {
          // Vencimentos mensais subsequentes
          const dueDate = new Date(today);
          dueDate.setMonth(today.getMonth() + i);

          paymentsToCreate.push({
            contract_id: createdContract.id,
            amount: pmtAmount,
            due_date: dueDate.toISOString().split("T")[0],
            status: "PENDENTE",
            installment_number: i,
          });
        }
      }
    }

    if (paymentsToCreate.length > 0) {
      const createdPayments = await financialRepository.createPayments(supabase, paymentsToCreate);

      // Criar lançamentos no fluxo de caixa (financial_entries) para pagamentos que entram como PAGO diretamente
      const companyId = createdContract.company_id;
      const todayStr = new Date().toISOString().split("T")[0];

      for (const p of createdPayments) {
        if (p.status === "PAGO") {
          let category = "Recebimento Contrato";
          let description = `Recebimento - Contrato #${createdContract.contract_number} (Cliente: ${clientData?.name || "Cliente"})`;

          if (p.installment_number === 0) {
            category = "Entrada Veículo";
            description = `Entrada recebida (Veículo de Troca) - Contrato #${createdContract.contract_number} (Cliente: ${clientData?.name || "Cliente"})`;
          } else if (p.installment_number === 101) {
            category = "Entrada Dinheiro";
            description = `Recebimento no ato (Espécie) - Contrato #${createdContract.contract_number} (Cliente: ${clientData?.name || "Cliente"})`;
          } else if (p.installment_number === 102) {
            category = "Entrada PIX";
            description = `Recebimento no ato (PIX) - Contrato #${createdContract.contract_number} (Cliente: ${clientData?.name || "Cliente"})`;
          } else if (p.installment_number === 103) {
            category = "Entrada Cartão";
            description = `Recebimento no ato (Cartão) - Contrato #${createdContract.contract_number} (Cliente: ${clientData?.name || "Cliente"})`;
          }

          await financialRepository.createEntry(supabase, {
            company_id: companyId,
            contract_id: createdContract.id,
            type: "RECEITA",
            amount: p.amount,
            description,
            entry_date: todayStr,
            category,
          });
        }
      }

      // Se for Compra e Venda (Troca), registrar também a despesa de aquisição do veículo recebido na troca
      if (contractData.modality === "compra_venda") {
        const tradeVal = (contractData as any).trade_value || 0;
        if (tradeVal > 0) {
          await financialRepository.createEntry(supabase, {
            company_id: companyId,
            contract_id: createdContract.id,
            type: "DESPESA",
            amount: tradeVal,
            description: `Aquisição por Troca (Entrada no Estoque) - Contrato #${createdContract.contract_number} (Veículo: ${(contractData as any).trade_brand_model}, Cliente: ${clientData?.name || "Cliente"})`,
            entry_date: todayStr,
            category: "Compra Veículo",
          });
        }
      }
    }

    // Gerar Parcela de Volta/Troco separado se aplicável
    if (contractData.refund_value && contractData.refund_value > 0) {
      await financialRepository.createPayments(supabase, [
        {
          contract_id: createdContract.id,
          amount: contractData.refund_value,
          due_date: contractData.refund_due_date || new Date().toISOString().split("T")[0],
          status: "PENDENTE",
          installment_number: 999,
          is_refund: true,
        } as any
      ]);
    }

    return createdContract;
  },

  async updateContract(
    supabase: any,
    id: string,
    contractData: Partial<Omit<Contract, "id" | "contract_number" | "created_at" | "updated_at">>,
    userId?: string
  ): Promise<Contract | null> {
    return contractRepository.update(supabase, id, contractData, userId);
  },

  /**
   * Registra a assinatura digital e avança o status do contrato
   */
  async registerSignature(
    supabase: any,
    signature: Omit<Signature, "id" | "signed_at">
  ): Promise<Signature | null> {
    // 1. Registrar a assinatura
    const createdSignature = await contractRepository.addSignature(supabase, signature);
    
    // 2. Verificar se ambas assinaturas (comprador e vendedor) foram colhidas
    const contract = await contractRepository.getById(supabase, signature.contract_id);
    if (!contract) throw new Error("Contrato não encontrado.");

    const signatures = await contractRepository.getSignatures(supabase, signature.contract_id);
    const hasBuyer = signatures.some((s) => s.role === "comprador");
    const hasSeller = signatures.some((s) => s.role === "vendedor");

    let nextStatus: ContractStatus = contract.status;

    if (signature.role === "comprador" && !hasSeller) {
      nextStatus = "AGUARDANDO_VENDEDOR"; // Aguardando vendedor assinar
    } else if (hasBuyer && hasSeller) {
      // Ambas assinaturas foram concluídas!
      // Se houver entrada pendente, avança para FALTA PAGAMENTO DE ENTRADA, senão aguarda o vendedor dar entrada na transferência
      if (contract.down_payment > 0) {
        nextStatus = "AGUARDANDO_ENTRADA";
      } else {
        nextStatus = "AGUARDANDO_VENDEDOR_DAR_ENTRADA";
      }
    }

    if (nextStatus !== contract.status) {
      await contractRepository.update(supabase, contract.id, {
        status: nextStatus,
      });
    }

    return createdSignature;
  },

  async delete(supabase: any, id: string): Promise<boolean> {
    // Liberar o veículo antes de excluir o contrato se ele estivesse reservado
    const contract = await contractRepository.getById(supabase, id);
    if (contract && contract.vehicle_id) {
      // Validar se o veículo ainda existe antes de tentar atualizar seu status
      const vehicleDoc = await supabase.collection("vehicles").doc(contract.vehicle_id).get().catch(() => null);
      if (vehicleDoc && vehicleDoc.exists) {
        await vehicleRepository.update(supabase, contract.vehicle_id, {
          status: "disponivel",
        }).catch((err: any) => console.error("Error updating vehicle status on contract delete:", err));
      }
    }
    return contractRepository.delete(supabase, id);
  },
};
