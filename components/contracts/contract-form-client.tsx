"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createContract } from "@/actions/contractActions";
import { Client, Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Car,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatMileage } from "@/utils/formatters";
import { formatCPF } from "@/utils/validators";

const defaultWarrantyText =
  "O VENDEDOR concede ao COMPRADOR garantia legal de 90 (noventa) dias para motor e caixa de câmbio, nos termos do artigo 26, inciso II, da Lei nº 8.078/90 (Código de Defesa do Consumidor). A garantia não cobre itens de desgaste natural ou danos decorrentes de mau uso, imperícia ou falta de manutenção preventiva por parte do comprador.";

const contractSchema = z.object({
  client_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  total_value: z.coerce.number().min(1, "O valor total deve ser maior que zero"),
  down_payment: z.coerce.number().min(0, "O valor do sinal não pode ser negativo"),
  installments_count: z.coerce.number().min(0, "A quantidade de parcelas não pode ser negativa"),
  interest_rate: z.coerce.number().min(0, "A taxa de juros não pode ser negativa"),
  warranty_text: z.string().min(5, "Insira um termo de garantia adequado"),
  notes: z.string().optional(),
  
  // Novos campos
  modality: z.enum(["vista", "financiada", "compra_venda", "repasse", "compra", "consignado"]),
  former_owner_name: z.string().optional(),
  former_owner_cpf: z.string().optional(),
  delivery_km: z.coerce.number().min(0, "Quilometragem inválida"),
  warranty_period_days: z.coerce.number().min(0, "Prazo inválido"),
  warranty_type: z.enum(["motor_cambio", "personalizada"]),
  payment_method: z.enum(["pix", "especie", "cartao_parcelado", "cartao_debit", "multiplo"]).optional(),
  has_remaining_balance: z.boolean().optional(),
  negotiation_agreement: z.string().optional(),
  consignation_period_days: z.coerce.number().min(1, "O prazo deve ser maior que zero").optional().default(60),
  consignation_owner_value: z.coerce.number().min(0, "O valor mínimo não pode ser negativo").optional().default(0),
});

type ContractFormValues = z.infer<typeof contractSchema>;

interface ContractFormClientProps {
  clients: Client[];
  vehicles: Vehicle[];
}

export function ContractFormClient({ clients, vehicles }: ContractFormClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [customClauses, setCustomClauses] = useState<string[]>([]);
  const [newClause, setNewClause] = useState("");
  
  // Toggles de inline registration
  const [clientRegType, setClientRegType] = useState<"existing" | "new">("existing");
  const [vehicleRegType, setVehicleRegType] = useState<"existing" | "manual">("manual");
  const [patioFilter, setPatioFilter] = useState<"todos" | "carro" | "moto">("todos");

  const [cashVal, setCashVal] = useState(0);
  const [pixValState, setPixValState] = useState(0);
  const [creditVal, setCreditVal] = useState(0);
  const [debitVal, setDebitVal] = useState(0);

  // Compra Modality states
  const [purchaseAppraisedVal, setPurchaseAppraisedVal] = useState(0);
  const [purchaseFinesVal, setPurchaseFinesVal] = useState(0);
  const [purchaseDetranVal, setPurchaseDetranVal] = useState(0);
  const [purchaseFinancingVal, setPurchaseFinancingVal] = useState(0);
  const [purchaseDateVal, setPurchaseDateVal] = useState("");

  // Financiamento Banco
  const [selectedBank, setSelectedBank] = useState("SANTANDER");
  const [customBank, setCustomBank] = useState("");

  // Veículo Recebido na Troca (Compra e Venda)
  const [tradeBrandModel, setTradeBrandModel] = useState("");
  const [tradePlate, setTradePlate] = useState("");
  const [tradeValue, setTradeValue] = useState(0);
  const [tradeFinanced, setTradeFinanced] = useState(0);
  const [tradeBank, setTradeBank] = useState("SANTANDER");
  const [tradeCustomBank, setTradeCustomBank] = useState("");
  const [tradeCash, setTradeCash] = useState(0);
  const [tradePix, setTradePix] = useState(0);
  const [tradeCard, setTradeCard] = useState(0);

  // Acréscimo e Saldo Devedor Detalhado
  const [cardSurcharge, setCardSurcharge] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [remainingInstallments, setRemainingInstallments] = useState(1);
  const [remainingDueDate, setRemainingDueDate] = useState("");
  const [remainingMethod, setRemainingMethod] = useState("pix");
  const [remainingNotes, setRemainingNotes] = useState("");

  // Troco / Volta devido ao cliente (quando tradeValue > totalValue + cardSurcharge)
  const [tradeRefundMethod, setTradeRefundMethod] = useState("pix");
  const [tradeRefundValue, setTradeRefundValue] = useState(0);
  const [tradeRefundDueDate, setTradeRefundDueDate] = useState("");
  const [tradeRefundPixKey, setTradeRefundPixKey] = useState("");
  const [tradeRefundNotes, setTradeRefundNotes] = useState("");

  // Busca de veículo no banco de dados
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showVehicleResults, setShowVehicleResults] = useState(false);

  const handleSelectVehicle = (v: Vehicle) => {
    setNewVehicleData({
      brand: v.brand,
      model: v.model,
      year: v.year,
      color: v.color,
      plate: v.plate,
      renavam: v.renavam || "",
      chassis: v.chassis || "",
      mileage: v.mileage || 0,
      value: v.value || 0,
      category: v.category as "carro" | "moto",
      notes: v.notes || "",
    });
    setValue("vehicle_id", v.id);
    setVehicleRegType("existing");
    setVehicleSearch(`${v.brand} ${v.model} (${v.plate})`);
    setShowVehicleResults(false);

    if (modality !== "compra") {
      setValue("total_value", v.value);
    }

    if (v.items_delivered?.zero_km) {
      setValue("delivery_km", 0);
      setValue("warranty_type", "personalizada");
      setValue("warranty_period_days", 365);
      setValue("warranty_text", "GARANTIA DA FABRICANTE: Veículo novo (0km), coberto integralmente pela garantia original fornecida diretamente pela fabricante, conforme prazos e termos constantes no manual de garantia entregue com o veículo.");
    } else {
      setValue("delivery_km", v.mileage);
      setValue("warranty_type", "motor_cambio");
      setValue("warranty_period_days", 90);
      setValue("warranty_text", defaultWarrantyText);
    }
  };

  const handleClearVehicleSearch = () => {
    setVehicleSearch("");
    setNewVehicleData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      plate: "",
      renavam: "",
      chassis: "",
      mileage: 0,
      value: 0,
      category: "moto",
      notes: "",
    });
    setValue("vehicle_id", "");
    setValue("total_value", 0);
    setValue("delivery_km", 0);
    setValue("warranty_type", "motor_cambio");
    setValue("warranty_period_days", 90);
    setValue("warranty_text", defaultWarrantyText);
    setVehicleRegType("manual");
    setShowVehicleResults(false);
  };

  // Dados de novo cliente inline
  const [newClientData, setNewClientData] = useState({
    name: "",
    cpf: "",
    rg: "",
    cnh: "",
    birth_date: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "MA",
    zip_code: "",
    phone: "",
    whatsapp: "",
    email: "",
  });

  // Dados de novo veículo inline
  const [newVehicleData, setNewVehicleData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    plate: "",
    renavam: "",
    chassis: "",
    mileage: 0,
    value: 0,
    category: "moto" as "carro" | "moto",
    notes: "",
  });

  // Real-time PMT calculation state
  const [pmtValue, setPmtValue] = useState(0);
  const [financedAmount, setFinancedAmount] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema) as any,
    defaultValues: {
      client_id: "",
      vehicle_id: "",
      total_value: 0,
      down_payment: 0,
      installments_count: 1,
      interest_rate: 0,
      warranty_text: defaultWarrantyText,
      notes: "",
      modality: "vista",
      former_owner_name: "",
      former_owner_cpf: "",
      delivery_km: 0,
      warranty_period_days: 90,
      warranty_type: "motor_cambio",
      payment_method: "pix",
      has_remaining_balance: false,
      negotiation_agreement: "",
      consignation_period_days: 60,
      consignation_owner_value: 0,
    },
  });

  const modality = watch("modality");
  const selectedClientId = watch("client_id");
  const selectedVehicleId = watch("vehicle_id");
  const totalValue = watch("total_value");
  const consignationOwnerValue = watch("consignation_owner_value");
  const estimatedConsignationCommission = Math.max((totalValue || 0) - (consignationOwnerValue || 0), 0);
  const downPayment = watch("down_payment");
  const installmentsCount = watch("installments_count");
  const interestRate = watch("interest_rate");
  const deliveryKm = watch("delivery_km");
  const warrantyPeriodDays = watch("warranty_period_days");
  const warrantyType = watch("warranty_type");
  const paymentMethod = watch("payment_method");
  const hasRemainingBalance = watch("has_remaining_balance");

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const isZeroKm = vehicleRegType === "existing" && selectedVehicle?.items_delivered?.zero_km;

  // Sincronizar valor do veículo selecionado do estoque com o formulário
  useEffect(() => {
    if (vehicleRegType === "existing" && selectedVehicle) {
      if (modality !== "compra") {
        setValue("total_value", selectedVehicle.value);
      }
      if (selectedVehicle.items_delivered?.zero_km) {
        setValue("delivery_km", 0);
      } else {
        setValue("delivery_km", selectedVehicle.mileage);
      }
    }
  }, [selectedVehicleId, vehicleRegType, setValue, selectedVehicle, modality]);

  // Sincronizar valor do veículo manual com o formulário
  useEffect(() => {
    if (vehicleRegType === "manual") {
      if (modality !== "compra") {
        setValue("total_value", newVehicleData.value);
      }
      setValue("delivery_km", newVehicleData.mileage);
    }
  }, [newVehicleData.value, newVehicleData.mileage, vehicleRegType, setValue, modality]);

  // Sincronizar valor do troco padrão devida ao cliente
  useEffect(() => {
    const diff = tradeValue - (Number(totalValue) + Number(cardSurcharge));
    if (diff > 0) {
      setTradeRefundValue(Number(diff.toFixed(2)));
    } else {
      setTradeRefundValue(0);
    }
  }, [tradeValue, totalValue, cardSurcharge]);

  // Autocomplete de veículo caso a placa digitada manualmente corresponda a um veículo disponível no banco
  useEffect(() => {
    if (vehicleRegType === "manual" && newVehicleData.plate) {
      const cleanInput = newVehicleData.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (cleanInput.length >= 7) {
        const matchedVehicle = vehicles.find(
          (v) => v.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === cleanInput
        );
        if (matchedVehicle) {
          handleSelectVehicle(matchedVehicle);
        }
      }
    }
  }, [newVehicleData.plate, vehicleRegType, vehicles]);

  // Se for modalidade Repasse ou Compra, atualizar o termo de garantia automaticamente
  useEffect(() => {
    if (modality === "repasse") {
      setValue("warranty_period_days", 0);
      setValue("warranty_type", "personalizada");
      setValue("warranty_text", "TERMO DE COMPRA NO ESTADO (SEM GARANTIA MUNICÍPAL OU DE PÁTIO): O comprador declara formalmente ter vistoriado o veículo e estar plenamente ciente de que a transação é realizada na modalidade de REPASSE, no estado de conservação em que se encontra, isento de garantias adicionais mecânicas de motor e caixa, assumindo inteiramente o custo de eventuais reparos ou manutenções.");
    } else if (modality === "compra") {
      setValue("warranty_period_days", 0);
      setValue("warranty_type", "personalizada");
      setValue("warranty_text", "CONTRATO DE COMPRA: Operação de aquisição de veículo pela concessionária. Não aplicável termo de garantia convencional.");
    } else if (modality === "consignado") {
      setValue("warranty_period_days", 0);
      setValue("warranty_type", "personalizada");
      setValue("warranty_text", "CONTRATO DE CONSIGNAÇÃO: Veículo recebido em regime de consignação para intermediação de venda. Não se aplica garantia de venda neste instrumento.");
    } else {
      const isZeroKm = vehicleRegType === "existing" && selectedVehicle?.items_delivered?.zero_km;
      if (isZeroKm) {
        setValue("delivery_km", 0);
        setValue("warranty_type", "personalizada");
        setValue("warranty_period_days", 365);
        setValue("warranty_text", "GARANTIA DA FABRICANTE: Veículo novo (0km), coberto integralmente pela garantia original fornecida diretamente pela fabricante, conforme prazos e termos constantes no manual de garantia entregue com o veículo.");
      } else {
        setValue("warranty_period_days", 90);
        setValue("warranty_type", "motor_cambio");
        setValue("warranty_text", defaultWarrantyText);
      }
    }
  }, [modality, setValue, selectedVehicle, vehicleRegType]);

  // Calcular PMT e financiamento
  useEffect(() => {
    const financed = Math.max(totalValue - downPayment, 0);
    setFinancedAmount(financed);

    if (financed <= 0) {
      setPmtValue(0);
      return;
    }
    if (installmentsCount <= 1) {
      setPmtValue(financed);
      return;
    }
    if (interestRate <= 0) {
      setPmtValue(financed / installmentsCount);
      return;
    }

    const i = interestRate / 100;
    const pmt = (financed * i * Math.pow(1 + i, installmentsCount)) / (Math.pow(1 + i, installmentsCount) - 1);
    setPmtValue(Number(pmt.toFixed(2)));
  }, [totalValue, downPayment, installmentsCount, interestRate]);

  const handleAddClause = () => {
    if (newClause.trim()) {
      setCustomClauses([...customClauses, newClause.trim()]);
      setNewClause("");
    }
  };

  const handleRemoveClause = (idx: number) => {
    setCustomClauses(customClauses.filter((_, i) => i !== idx));
  };

  const mutation = useMutation({
    mutationFn: (vals: ContractFormValues) => {
      const remaining = vals.total_value - (cashVal + pixValState + creditVal + debitVal);
      const payload: any = {
        ...vals,
        custom_clauses: customClauses,
        status: "AGUARDANDO_INICIAR",
      };

      if (vals.modality === "vista" || vals.modality === "repasse") {
        payload.down_payment = 0;
        const totalWithSurcharge = vals.total_value + cardSurcharge;
        const paidAmount = cashVal + pixValState + creditVal + debitVal;
        const remaining = Math.max(totalWithSurcharge - paidAmount, 0);
        
        payload.has_remaining_balance = remaining > 0;
        
        let agreement = `Venda ${vals.modality === "repasse" ? "de Repasse" : "à Vista"}. Valor do Veículo: R$ ${formatCurrency(vals.total_value)}.`;
        if (cardSurcharge > 0) {
          agreement += ` Juros/Acréscimo do Cartão: R$ ${formatCurrency(cardSurcharge)}. Valor Total: R$ ${formatCurrency(totalWithSurcharge)}.`;
        }
        
        const details = [];
        if (cashVal > 0) details.push(`R$ ${formatCurrency(cashVal)} em Espécie`);
        if (pixValState > 0) details.push(`R$ ${formatCurrency(pixValState)} no PIX`);
        if (creditVal > 0) details.push(`R$ ${formatCurrency(creditVal)} no Cartão de Crédito`);
        if (debitVal > 0) details.push(`R$ ${formatCurrency(debitVal)} no Cartão de Débito`);
        
        if (details.length > 0) {
          agreement += ` Pagamentos no ato: ${details.join(", ")}.`;
        }
        
        if (remaining > 0) {
          const methodLabel = remainingMethod === "pix" ? "PIX" :
                              remainingMethod === "especie" ? "Espécie" :
                              remainingMethod === "cartao_parcelado" ? "Cartão Parcelado" :
                              remainingMethod === "promissoria" ? "Promissória" :
                              remainingMethod === "cheque" ? "Cheque" :
                              remainingMethod === "boleto" ? "Boleto" : remainingMethod;
                              
          agreement += ` Saldo devedor a quitar: R$ ${formatCurrency(remaining)} em ${remainingInstallments}x no ${methodLabel}`;
          if (remainingDueDate) {
            const formattedDate = new Date(remainingDueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            agreement += ` com data limite de conclusão para ${formattedDate}`;
          }
          agreement += ".";
          if (remainingNotes) {
            agreement += ` OBS do saldo: ${remainingNotes}.`;
          }
        } else {
          agreement += " Valor totalmente quitado no ato.";
        }
        payload.negotiation_agreement = agreement;
      }

      if (vals.modality === "compra") {
        payload.total_value = purchaseAppraisedVal;
        payload.appraised_value = purchaseAppraisedVal;
        payload.fines_debt = purchaseFinesVal;
        payload.detran_debt = purchaseDetranVal;
        payload.bank_payout = purchaseFinancingVal;
        payload.net_value = purchaseAppraisedVal - purchaseFinesVal - purchaseDetranVal - purchaseFinancingVal;
        payload.purchase_date = purchaseDateVal || new Date().toISOString().split("T")[0];
        
        let agreement = `Contrato de Compra de Veículo. Valor de Compra/Avaliação Bruta: R$ ${formatCurrency(purchaseAppraisedVal)}.`;
        const deductions = [];
        if (purchaseFinesVal > 0) deductions.push(`Multas a pagar: R$ ${formatCurrency(purchaseFinesVal)}`);
        if (purchaseDetranVal > 0) deductions.push(`Débitos Detran/IPVA: R$ ${formatCurrency(purchaseDetranVal)}`);
        if (purchaseFinancingVal > 0) deductions.push(`Quitação de Financiamento: R$ ${formatCurrency(purchaseFinancingVal)}`);
        
        if (deductions.length > 0) {
          agreement += ` Deduções retidas: ${deductions.join(", ")}.`;
        }
        agreement += ` Líquido a Pagar ao Cliente: R$ ${formatCurrency(payload.net_value)}.`;
        payload.negotiation_agreement = agreement;
        
        payload.down_payment = 0;
        payload.interest_rate = 0;
        payload.installments_count = 1;
      }

      if (vals.modality === "consignado") {
        payload.total_value = vals.total_value;
        payload.consignation_period_days = vals.consignation_period_days;
        payload.consignation_owner_value = vals.consignation_owner_value;
        payload.down_payment = 0;
        payload.interest_rate = 0;
        payload.installments_count = 1;
        
        const agreement = `Contrato de Consignação. Valor Estimado de Venda: R$ ${formatCurrency(vals.total_value)}. Prazo de Consignação: ${vals.consignation_period_days} dias. Valor Líquido Garantido ao Proprietário: R$ ${formatCurrency(vals.consignation_owner_value)}. Comissão Estimada da Loja: R$ ${formatCurrency(Math.max(vals.total_value - vals.consignation_owner_value, 0))}.`;
        payload.negotiation_agreement = agreement;
      }

      if (vals.modality === "financiada") {
        payload.interest_rate = 0; // Juros sempre 0 conforme solicitação
        const bankName = selectedBank === "Outro" ? customBank : selectedBank;
        payload.negotiation_agreement = `Venda Financiada pelo Banco ${bankName}. Valor financiado: R$ ${formatCurrency(vals.total_value - vals.down_payment)} em ${vals.installments_count}x.`;
      }

      if (vals.modality === "compra_venda") {
        const totalWithSurcharge = vals.total_value + cardSurcharge;
        const paidComplement = tradeValue + tradeCash + tradePix + tradeCard + tradeFinanced;
        const remaining = Math.max(totalWithSurcharge - paidComplement, 0);
        
        payload.down_payment = Math.min(tradeValue, vals.total_value); // O valor do veículo da troca entra como Entrada/Sinal, limitado ao valor da compra
        payload.interest_rate = 0;
        payload.has_remaining_balance = remaining > 0;
        
        let agreement = `Compra e Venda com Recebimento de Veículo de Troca. Valor do Veículo Vendido: R$ ${formatCurrency(vals.total_value)}.`;
        if (cardSurcharge > 0) {
          agreement += ` Juros/Acréscimo do Cartão: R$ ${formatCurrency(cardSurcharge)}. Valor Total: R$ ${formatCurrency(totalWithSurcharge)}.`;
        }
        
        agreement += ` Loja recebeu o veículo ${tradeBrandModel} (Placa: ${tradePlate}) no valor de R$ ${formatCurrency(tradeValue)}.`;
        
        const details = [];
        if (tradeValue <= totalWithSurcharge) {
          if (tradeFinanced > 0) {
            const bankName = tradeBank === "Outro" ? tradeCustomBank : tradeBank;
            details.push(`R$ ${formatCurrency(tradeFinanced)} financiado pelo ${bankName}`);
          }
          if (tradeCash > 0) details.push(`R$ ${formatCurrency(tradeCash)} em Espécie`);
          if (tradePix > 0) details.push(`R$ ${formatCurrency(tradePix)} no PIX`);
          if (tradeCard > 0) details.push(`R$ ${formatCurrency(tradeCard)} no Cartão`);
          
          if (details.length > 0) {
            agreement += ` Complemento de pagamento no ato: ${details.join(", ")}.`;
          }
        }
        
        if (remaining > 0 && tradeValue <= totalWithSurcharge) {
          const methodLabel = remainingMethod === "pix" ? "PIX" :
                              remainingMethod === "especie" ? "Espécie" :
                              remainingMethod === "cartao_parcelado" ? "Cartão Parcelado" :
                              remainingMethod === "promissoria" ? "Promissória" :
                              remainingMethod === "cheque" ? "Cheque" :
                              remainingMethod === "boleto" ? "Boleto" : remainingMethod;
                              
          agreement += ` Saldo devedor restante a quitar: R$ ${formatCurrency(remaining)} em ${remainingInstallments}x no ${methodLabel}`;
          if (remainingDueDate) {
            const formattedDate = new Date(remainingDueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            agreement += ` com data limite de conclusão para ${formattedDate}`;
          }
          agreement += ".";
          if (remainingNotes) {
            agreement += ` OBS do saldo: ${remainingNotes}.`;
          }
        } else if (tradeValue > totalWithSurcharge) {
          const refundMethodLabel = tradeRefundMethod === "pix" ? "PIX" :
                                    tradeRefundMethod === "especie" ? "Espécie" :
                                    tradeRefundMethod === "transferencia" ? "Transferência Bancária" : tradeRefundMethod;
          agreement += ` Como o veículo de troca superou o valor de venda, a loja devolverá a volta (troco) de R$ ${formatCurrency(tradeRefundValue)} ao cliente via ${refundMethodLabel}`;
          if (tradeRefundDueDate) {
            const formattedRefundDate = new Date(tradeRefundDueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" });
            agreement += ` agendado para ${formattedRefundDate}`;
          }
          if (tradeRefundPixKey) {
            agreement += ` (Dados/Chave: ${tradeRefundPixKey})`;
          }
          agreement += ".";
          if (tradeRefundNotes) {
            agreement += ` OBS do troco: ${tradeRefundNotes}.`;
          }
          
          payload.refund_value = tradeRefundValue;
          payload.refund_method = tradeRefundMethod;
          if (tradeRefundDueDate) payload.refund_due_date = tradeRefundDueDate;
          if (tradeRefundPixKey) payload.refund_pix_key = tradeRefundPixKey;
          if (tradeRefundNotes) payload.refund_notes = tradeRefundNotes;
        } else {
          agreement += " Restante totalmente quitado conforme detalhado.";
        }
        payload.negotiation_agreement = agreement;
      }

      if (clientRegType === "new") {
        payload.client = newClientData;
      }
      if (vehicleRegType === "manual") {
        payload.vehicle = newVehicleData;
      }
      
      return createContract(payload);
    },
    onSuccess: (res: any) => {
      if (res && res.success === false) {
        alert(`Falha ao registrar o contrato: ${res.error}`);
        return;
      }
      const contract = res?.data || res;
      if (contract && contract.id) {
        router.push(`/contracts/${contract.id}`);
      } else {
        router.push("/contracts");
      }
    },
    onError: (err: any) => {
      alert(`Falha ao registrar o contrato: ${err.message}`);
    },
  });

  const onSubmit = (values: ContractFormValues) => {
    mutation.mutate(values);
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    const messages = Object.entries(errors)
      .map(([field, err]: any) => {
        const fieldName = 
          field === "total_value" ? "Valor Total" : 
          field === "installments_count" ? "Número de Parcelas" :
          field === "warranty_text" ? "Cláusula de Garantia" :
          field === "delivery_km" ? "KM de Entrega" : field;
        return `${fieldName}: ${err.message || "Valor inválido"}`;
      })
      .join("\n");
    alert(`Por favor, corrija os erros de validação antes de gerar a proposta:\n\n${messages}`);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (clientRegType === "existing" && !selectedClientId) {
        alert((modality === "compra" || modality === "consignado") ? "Selecione um cliente vendedor/consignante ou cadastre um novo." : "Selecione um cliente comprador ou cadastre um novo.");
        return;
      }
      if (clientRegType === "new" && (!newClientData.name || !newClientData.cpf)) {
        alert("Preencha o Nome e CPF do novo cliente.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (vehicleRegType === "existing" && !selectedVehicleId) {
        alert("Selecione um veículo do estoque ou digite os dados manuais.");
        return;
      }
      if (vehicleRegType === "manual" && (!newVehicleData.brand || !newVehicleData.model || !newVehicleData.plate)) {
        alert("Preencha Marca, Modelo e Placa do veículo.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (modality === "compra") {
        if (purchaseAppraisedVal <= 0) {
          alert("Insira o valor de compra do veículo.");
          return;
        }
      } else if (modality === "consignado") {
        if (totalValue <= 0) {
          alert("Insira o valor estimado de venda.");
          return;
        }
        if (consignationOwnerValue <= 0) {
          alert("Insira o valor mínimo garantido ao proprietário.");
          return;
        }
        if (consignationOwnerValue >= totalValue) {
          alert("O valor mínimo do proprietário deve ser menor que o valor estimado de venda.");
          return;
        }
      } else {
        if (totalValue <= 0) {
          alert("Insira o valor total da venda.");
          return;
        }
      }
      setStep(4);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.brand.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Card Area */}
      <Card className="lg:col-span-2 glass-card border-white/5 flex flex-col justify-between min-h-[580px]">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileCheck className="text-primary" />
              Elaborar Contrato Comercial
            </CardTitle>
            <div className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded">
              Passo {step} de 4
            </div>
          </div>
          <CardDescription>
            Crie contratos sob medida selecionando a modalidade e informando compradores e veículos de forma dinâmica.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 flex-grow">
          {/* STEP 1: Modalidade & Comprador */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Modalidade Cards */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {(modality === "compra" || modality === "consignado") ? "1. Modalidade de Entrada" : "1. Modalidade da Venda"}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { id: "vista", label: "Venda à Vista", desc: "Pagamento imediato" },
                    { id: "financiada", label: "Financiada", desc: "Financiamento bancário" },
                    { id: "compra_venda", label: "Compra e Venda", desc: "Envolve veículo na troca" },
                    { id: "repasse", label: "Repasse", desc: "Venda sem garantia de pátio" },
                    { id: "compra", label: "Compra de Veículo", desc: "Loja adquirindo veículo" },
                    { id: "consignado", label: "Consignação", desc: "Veículo consignado na loja" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setValue("modality", m.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                        modality === m.id
                          ? "bg-accent/25 border-primary text-primary font-bold shadow-md shadow-primary/10"
                          : "border-border/30 bg-black/10 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                      }`}
                    >
                      <span className="text-xs">{m.label}</span>
                      <span className="text-[9px] text-muted-foreground font-normal mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Cliente Existente / Novo */}
              <div className="space-y-4 border-t border-border/20 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    {(modality === "compra" || modality === "consignado") ? "2. Vendedor / Consignante (Cliente)" : "2. Comprador (Cliente)"}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={clientRegType === "existing" ? "default" : "outline"}
                      onClick={() => setClientRegType("existing")}
                      className="text-xs h-7 px-3"
                    >
                      Buscar Cadastrado
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={clientRegType === "new" ? "default" : "outline"}
                      onClick={() => setClientRegType("new")}
                      className="text-xs h-7 px-3"
                    >
                      Cadastrar Novo
                    </Button>
                  </div>
                </div>

                {clientRegType === "existing" ? (
                  <div className="space-y-2">
                    <Select
                      value={selectedClientId || undefined}
                      onValueChange={(val) => setValue("client_id", val)}
                    >
                      <SelectTrigger className="bg-black/30 border-border/40 text-foreground h-10">
                        <SelectValue placeholder="Selecione o Cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-foreground border-border/40 max-h-[250px]">
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({formatCPF(c.cpf)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-secondary/15 rounded-lg border border-border/40 text-xs">
                    <div className="space-y-1.5">
                      <Label>Nome Completo *</Label>
                      <Input
                        type="text"
                        placeholder="Nome Completo do Cliente"
                        value={newClientData.name}
                        onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                        className="bg-black/30 h-9 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>CPF *</Label>
                        <Input
                          type="text"
                          placeholder="Somente números"
                          value={newClientData.cpf}
                          onChange={(e) => setNewClientData({ ...newClientData, cpf: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Celular / WhatsApp *</Label>
                        <Input
                          type="text"
                          placeholder="(98) 99999-9999"
                          value={newClientData.whatsapp}
                          onChange={(e) => setNewClientData({ ...newClientData, whatsapp: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>RG</Label>
                        <Input
                          type="text"
                          value={newClientData.rg}
                          onChange={(e) => setNewClientData({ ...newClientData, rg: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>CNH</Label>
                        <Input
                          type="text"
                          value={newClientData.cnh}
                          onChange={(e) => setNewClientData({ ...newClientData, cnh: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Data de Nasc.</Label>
                        <Input
                          type="date"
                          value={newClientData.birth_date}
                          onChange={(e) => setNewClientData({ ...newClientData, birth_date: e.target.value })}
                          className="bg-black/30 h-9 text-xs text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Endereço Residencial</Label>
                        <Input
                          type="text"
                          placeholder="Rua, número, apto..."
                          value={newClientData.address}
                          onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bairro</Label>
                        <Input
                          type="text"
                          value={newClientData.neighborhood}
                          onChange={(e) => setNewClientData({ ...newClientData, neighborhood: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Cidade</Label>
                        <Input
                          type="text"
                          value={newClientData.city}
                          onChange={(e) => setNewClientData({ ...newClientData, city: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>UF</Label>
                        <Input
                          type="text"
                          maxLength={2}
                          value={newClientData.state}
                          onChange={(e) => setNewClientData({ ...newClientData, state: e.target.value.toUpperCase() })}
                          className="bg-black/30 h-9 text-xs text-center"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>CEP</Label>
                        <Input
                          type="text"
                          placeholder="65000-000"
                          value={newClientData.zip_code}
                          onChange={(e) => setNewClientData({ ...newClientData, zip_code: e.target.value })}
                          className="bg-black/30 h-9 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        placeholder="exemplo@gmail.com"
                        value={newClientData.email}
                        onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                        className="bg-black/30 h-9 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Veículo */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Consultar Veículo Cadastrado (Placa ou Modelo)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Digite a placa ou o modelo para buscar no banco de dados..."
                    value={vehicleSearch}
                    onChange={(e) => {
                      setVehicleSearch(e.target.value);
                      setShowVehicleResults(true);
                    }}
                    onFocus={() => setShowVehicleResults(true)}
                    className="bg-black/30 h-10 text-xs"
                  />
                  {vehicleSearch && (
                    <button
                      type="button"
                      onClick={handleClearVehicleSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      Limpar
                    </button>
                  )}

                  {showVehicleResults && vehicleSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-border/40 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredVehicles.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">
                          Nenhum veículo cadastrado encontrado com &quot;{vehicleSearch}&quot;. Continue digitando abaixo para cadastrar como novo.
                        </div>
                      ) : (
                        <div className="p-1.5 space-y-1">
                          <div className="text-[9px] text-muted-foreground px-2 py-1 uppercase font-bold tracking-wider">Motos e Carros no Banco de Dados</div>
                          {filteredVehicles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleSelectVehicle(v)}
                              className="w-full text-left p-2 hover:bg-secondary/40 rounded flex items-center justify-between text-xs transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{v.brand} {v.model}</span>
                                <span className="text-[10px] text-muted-foreground">Cor: {v.color} | KM: {v.mileage}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {v.status !== "disponivel" && (
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    v.status === "reservado"
                                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                      : "bg-red-500/10 text-red-500 border border-red-500/20"
                                  }`}>
                                    {v.status === "reservado" ? "Reservado" : "Vendido"}
                                  </span>
                                )}
                                <span className="bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                                  {v.plate}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {vehicleRegType === "existing" && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center justify-between animate-in fade-in duration-200">
                  <span>
                    <strong>✓ Veículo selecionado do banco de dados:</strong> {newVehicleData.brand} {newVehicleData.model} (Placa: {newVehicleData.plate})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearVehicleSearch}
                    className="h-6 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 text-[10px] px-2"
                  >
                    Limpar / Novo
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Ficha do Veículo Vendido</Label>
              </div>

              <div className="space-y-3 p-4 bg-secondary/15 rounded-lg border border-border/40 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Categoria *</Label>
                    <Select
                      value={newVehicleData.category}
                      onValueChange={(val) => setNewVehicleData({ ...newVehicleData, category: val as any })}
                    >
                      <SelectTrigger className="bg-black/30 border-border/40 h-9 text-xs">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-foreground border border-border/40 text-xs">
                        <SelectItem value="moto">Moto</SelectItem>
                        <SelectItem value="carro">Carro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marca *</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Honda"
                      value={newVehicleData.brand}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, brand: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modelo *</Label>
                    <Input
                      type="text"
                      placeholder="Ex: XRE 300"
                      value={newVehicleData.model}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, model: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ano Modelo *</Label>
                    <Input
                      type="number"
                      value={newVehicleData.year}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, year: Number(e.target.value) })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor *</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Vermelha"
                      value={newVehicleData.color}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, color: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Placa *</Label>
                    <Input
                      type="text"
                      placeholder="Ex: HPX-1020"
                      value={newVehicleData.plate}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, plate: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>KM Atual *</Label>
                    <Input
                      type="number"
                      value={newVehicleData.mileage}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, mileage: Number(e.target.value) })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Chassi</Label>
                    <Input
                      type="text"
                      placeholder="17 caracteres"
                      value={newVehicleData.chassis}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, chassis: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Renavam *</Label>
                    <Input
                      type="text"
                      placeholder="11 dígitos"
                      value={newVehicleData.renavam}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, renavam: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Valor do Negócio (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor acordado"
                      value={newVehicleData.value}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, value: Number(e.target.value) })}
                      className="bg-black/30 h-9 text-xs text-primary font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observações do Veículo</Label>
                    <Input
                      type="text"
                      placeholder="Acessórios, revisões feitas..."
                      value={newVehicleData.notes}
                      onChange={(e) => setNewVehicleData({ ...newVehicleData, notes: e.target.value })}
                      className="bg-black/30 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Condições Financeiras */}
          {step === 3 && (
            modality === "compra" ? (
              <div className="space-y-6">
                <div className="flex flex-col space-y-1 border-b border-border/20 pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-primary">Detalhamento Financeiro da Compra</h3>
                  <span className="text-[11px] text-muted-foreground">Informe o valor bruto acordado para compra e as deduções a serem retidas pela loja.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="purchase_appraised" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Valor de Compra / Avaliação Bruta (R$) *</Label>
                    <Input
                      id="purchase_appraised"
                      type="number"
                      step="0.01"
                      value={purchaseAppraisedVal || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPurchaseAppraisedVal(val);
                        setValue("total_value", val);
                      }}
                      className="bg-black/30 text-lg font-bold text-foreground h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="purchase_date" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Data da Operação de Compra *</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={purchaseDateVal}
                      onChange={(e) => setPurchaseDateVal(e.target.value)}
                      className="bg-black/30 text-xs h-11 text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4 space-y-4">
                  <Label className="font-bold text-xs uppercase tracking-wider text-primary">Deduções de Dívidas / Encargos do Veículo</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 text-xs">
                      <Label htmlFor="purchase_detran">IPVA / Licenciamento a Deduzir (R$)</Label>
                      <Input
                        id="purchase_detran"
                        type="number"
                        step="0.01"
                        value={purchaseDetranVal || ""}
                        onChange={(e) => setPurchaseDetranVal(Number(e.target.value))}
                        className="bg-black/30 h-10 text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <Label htmlFor="purchase_fines">Multas a Pagar a Deduzir (R$)</Label>
                      <Input
                        id="purchase_fines"
                        type="number"
                        step="0.01"
                        value={purchaseFinesVal || ""}
                        onChange={(e) => setPurchaseFinesVal(Number(e.target.value))}
                        className="bg-black/30 h-10 text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <Label htmlFor="purchase_financing">Quitação de Financiamento a Deduzir (R$)</Label>
                      <Input
                        id="purchase_financing"
                        type="number"
                        step="0.01"
                        value={purchaseFinancingVal || ""}
                        onChange={(e) => setPurchaseFinancingVal(Number(e.target.value))}
                        className="bg-black/30 h-10 text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950/60 rounded-lg border border-border/40 space-y-3 mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign size={14} className="text-primary" /> Demonstrativo de Liquidação
                  </h4>
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Valor de Avaliação / Compra Bruta:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(purchaseAppraisedVal)}</span>
                    </div>
                    {purchaseDetranVal > 0 && (
                      <div className="flex items-center justify-between text-red-400">
                        <span>Dedução IPVA / Licenciamento (-):</span>
                        <span className="font-mono font-bold">-{formatCurrency(purchaseDetranVal)}</span>
                      </div>
                    )}
                    {purchaseFinesVal > 0 && (
                      <div className="flex items-center justify-between text-red-400">
                        <span>Dedução Multas (-):</span>
                        <span className="font-mono font-bold">-{formatCurrency(purchaseFinesVal)}</span>
                      </div>
                    )}
                    {purchaseFinancingVal > 0 && (
                      <div className="flex items-center justify-between text-red-400">
                        <span>Dedução Quitação Financiamento (-):</span>
                        <span className="font-mono font-bold">-{formatCurrency(purchaseFinancingVal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border/20 pt-2 font-bold text-sm">
                      <span className="text-foreground">Líquido a Pagar ao Cliente:</span>
                      <span className="font-mono text-emerald-400 font-extrabold text-lg">{formatCurrency(purchaseAppraisedVal - purchaseFinesVal - purchaseDetranVal - purchaseFinancingVal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : modality === "consignado" ? (
              <div className="space-y-6">
                <div className="flex flex-col space-y-1 border-b border-border/20 pb-3">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-primary">Detalhamento Financeiro da Consignação</h3>
                  <span className="text-[11px] text-muted-foreground">Informe os valores estimados de venda, o valor mínimo líquido garantido ao proprietário e o prazo em dias.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="total_value" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Valor Estimado de Venda (R$) *</Label>
                    <Input
                      id="total_value"
                      type="number"
                      step="0.01"
                      {...register("total_value")}
                      className="bg-black/30 text-lg font-bold text-foreground h-11"
                    />
                    {errors.total_value && <p className="text-xs text-destructive">{errors.total_value.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="consignation_owner_value" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Valor Líquido Garantido ao Proprietário (R$) *</Label>
                    <Input
                      id="consignation_owner_value"
                      type="number"
                      step="0.01"
                      {...register("consignation_owner_value")}
                      className="bg-black/30 text-lg font-bold text-emerald-400 h-11"
                    />
                    {errors.consignation_owner_value && <p className="text-xs text-destructive">{errors.consignation_owner_value.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="consignation_period_days" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Prazo Contratual de Consignação (Dias) *</Label>
                    <Input
                      id="consignation_period_days"
                      type="number"
                      {...register("consignation_period_days")}
                      className="bg-black/30 text-xs h-11"
                    />
                    {errors.consignation_period_days && <p className="text-xs text-destructive">{errors.consignation_period_days.message}</p>}
                  </div>
                </div>

                <div className="p-4 bg-zinc-950/60 rounded-lg border border-border/40 space-y-3 mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign size={14} className="text-primary" /> Demonstrativo da Intermediação Comercial (Comissão)
                  </h4>
                  <div className="space-y-2 text-xs pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Valor Estimado de Venda na Loja:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(totalValue || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Valor Líquido Garantido ao Proprietário (-):</span>
                      <span className="font-mono font-bold">-{formatCurrency(consignationOwnerValue || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/20 pt-2 font-bold text-sm">
                      <span className="text-foreground">Comissão / Sobrepreço Estimado da Loja:</span>
                      <span className="font-mono text-primary font-extrabold text-lg">{formatCurrency(estimatedConsignationCommission)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="total_value" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Valor Acordado de Venda (R$)</Label>
                    <Input
                      id="total_value"
                      type="number"
                      step="0.01"
                      {...register("total_value")}
                      className="bg-black/30 text-lg font-bold text-foreground h-11"
                    />
                    {errors.total_value && <p className="text-xs text-destructive">{errors.total_value.message}</p>}
                  </div>

                  {modality !== "vista" && modality !== "compra_venda" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="down_payment" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Entrada / Sinal (R$)</Label>
                      <Input
                        id="down_payment"
                        type="number"
                        step="0.01"
                        {...register("down_payment")}
                        className="bg-black/30 text-lg font-bold text-emerald-400 h-11"
                      />
                      {errors.down_payment && <p className="text-xs text-destructive">{errors.down_payment.message}</p>}
                    </div>
                  )}

                  {(modality === "vista" || modality === "repasse") && (
                    <div className="col-span-1 sm:col-span-2 border-t border-border/20 pt-4 mt-2 space-y-6">
                      <div className="flex flex-col space-y-1">
                        <Label className="font-bold text-xs uppercase tracking-wider text-primary">1. Detalhamento do Pagamento no Ato (Entradas)</Label>
                        <span className="text-[10px] text-muted-foreground">Informe os valores pagos pelo cliente no momento da venda.</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                        <div className="space-y-1.5 text-xs">
                          <Label htmlFor="cash_val">Espécie (Dinheiro) (R$)</Label>
                          <Input
                            id="cash_val"
                            type="number"
                            step="0.01"
                            value={cashVal || ""}
                            onChange={(e) => setCashVal(Number(e.target.value))}
                            className="bg-black/30 h-10 text-foreground"
                          />
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <Label htmlFor="pix_val">PIX (R$)</Label>
                          <Input
                            id="pix_val"
                            type="number"
                            step="0.01"
                            value={pixValState || ""}
                            onChange={(e) => setPixValState(Number(e.target.value))}
                            className="bg-black/30 h-10 text-foreground"
                          />
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <Label htmlFor="credit_val">Cartão de Crédito (R$)</Label>
                          <Input
                            id="credit_val"
                            type="number"
                            step="0.01"
                            value={creditVal || ""}
                            onChange={(e) => setCreditVal(Number(e.target.value))}
                            className="bg-black/30 h-10 text-foreground"
                          />
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <Label htmlFor="debit_val">Cartão de Débito (R$)</Label>
                          <Input
                            id="debit_val"
                            type="number"
                            step="0.01"
                            value={debitVal || ""}
                            onChange={(e) => setDebitVal(Number(e.target.value))}
                            className="bg-black/30 h-10 text-foreground"
                          />
                        </div>
                        <div className="space-y-1.5 text-xs col-span-2 sm:col-span-1">
                          <Label htmlFor="card_surcharge">Juros / Acréscimo do Cartão (R$)</Label>
                          <Input
                            id="card_surcharge"
                            type="number"
                            step="0.01"
                            placeholder="Juros adicionados ao cartão"
                            value={cardSurcharge || ""}
                            onChange={(e) => setCardSurcharge(Number(e.target.value))}
                            className="bg-black/30 h-10 text-amber-400 font-bold"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-secondary/10 rounded-lg border border-border/40 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">Valor Acordado do Veículo:</span>
                          <span className="font-mono font-bold text-foreground">{formatCurrency(totalValue || 0)}</span>
                        </div>
                        {cardSurcharge > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-amber-400">Juros/Acréscimo do Cartão (+):</span>
                            <span className="font-mono font-bold text-amber-400">+{formatCurrency(cardSurcharge)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs border-t border-border/20 pt-2 font-bold">
                          <span className="text-foreground">Total Geral a Quitar:</span>
                          <span className="font-mono text-sm text-primary">{formatCurrency(Number(totalValue) + Number(cardSurcharge))}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">Pago no Ato:</span>
                          <span className="font-mono text-foreground">{formatCurrency(cashVal + pixValState + creditVal + debitVal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs border-t border-border/20 pt-2 font-extrabold">
                          <span className="text-muted-foreground">Saldo Restante a Quitar:</span>
                          <span className={`font-mono text-sm ${
                            (Number(totalValue) + Number(cardSurcharge) - (cashVal + pixValState + creditVal + debitVal)) > 0 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {formatCurrency(Math.max(Number(totalValue) + Number(cardSurcharge) - (cashVal + pixValState + creditVal + debitVal), 0))}
                          </span>
                        </div>
                      </div>

                      {Math.max(Number(totalValue) + Number(cardSurcharge) - (cashVal + pixValState + creditVal + debitVal), 0) > 0 && (
                        <div className="p-4 bg-zinc-950/40 rounded-lg border border-amber-500/20 space-y-4 animate-in fade-in duration-200">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            ⚠️ Saldo Devedor Detalhado (A Pagar Depois)
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5 text-xs">
                              <Label>Forma de Pagamento do Saldo *</Label>
                              <Select
                                value={remainingMethod}
                                onValueChange={(val) => setRemainingMethod(val)}
                              >
                                <SelectTrigger className="bg-black/30 border-border/40 text-foreground h-9 text-xs">
                                  <SelectValue placeholder="Escolha a forma" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border border-border/40 text-foreground text-xs">
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="especie">Espécie (Dinheiro)</SelectItem>
                                  <SelectItem value="cartao_parcelado">Cartão Parcelado</SelectItem>
                                  <SelectItem value="promissoria">Promissória</SelectItem>
                                  <SelectItem value="cheque">Cheque</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-1.5 text-xs">
                              <Label>Quantidade de Parcelas *</Label>
                              <Input
                                type="number"
                                min={1}
                                value={remainingInstallments}
                                onChange={(e) => setRemainingInstallments(Number(e.target.value))}
                                className="bg-black/30 h-9 text-foreground text-xs"
                              />
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <Label>Data Limite para Conclusão *</Label>
                              <Input
                                type="date"
                                value={remainingDueDate}
                                onChange={(e) => setRemainingDueDate(e.target.value)}
                                className="bg-black/30 h-9 text-foreground text-xs text-muted-foreground"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <Label>Como foi acordado (Observações do Saldo Devedor)</Label>
                            <Input
                              type="text"
                              placeholder="Ex: R$ 2.000 para pagar em 4x no cartão de juros por fora na data X"
                              value={remainingNotes}
                              onChange={(e) => setRemainingNotes(e.target.value)}
                              className="bg-black/30 h-9 text-xs text-foreground"
                            />
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Box de Resumo Financeiro */}
              {modality === "financiada" && (
                <div className="p-4 bg-black/40 rounded-lg border border-border/40 space-y-3 mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign size={14} /> Amortização em Tempo Real (Price)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Valor Financiado:</span>
                      <span className="font-semibold text-foreground text-sm">{formatCurrency(financedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Parcelamento:</span>
                      <span className="font-semibold text-foreground text-sm">{installmentsCount}x</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Valor da Parcela:</span>
                      <span className="font-bold text-primary text-sm">{formatCurrency(pmtValue)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações Extras se modalidade for Compra/Troca ou Repasse */}
              {(modality === "compra_venda" || modality === "repasse") && (
                <div className="border-t border-border/20 pt-4 space-y-3">
                  <Label className="text-sm font-semibold">Dados de Histórico do Antigo Proprietário (Se houver)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Proprietário Anterior</Label>
                      <Input
                        type="text"
                        placeholder="Ex: João da Silva"
                        {...register("former_owner_name")}
                        className="bg-black/30 h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CPF ou CNPJ do Proprietário Anterior</Label>
                      <Input
                        type="text"
                        placeholder="Somente números"
                        {...register("former_owner_cpf")}
                        className="bg-black/30 h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Forma de Pagamento & Saldo Devedor */}
              {modality !== "vista" && modality !== "compra_venda" && (
                <div className="border-t border-border/20 pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Forma de Pagamento Principal</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(val) => setValue("payment_method", val as any)}
                      >
                        <SelectTrigger className="bg-black/30 border-border/40 text-foreground h-11">
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-border/40 text-foreground">
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="especie">Espécie (Dinheiro)</SelectItem>
                          <SelectItem value="cartao_parcelado">Cartão Parcelado</SelectItem>
                          <SelectItem value="cartao_debit">Cartão de Débito</SelectItem>
                          <SelectItem value="multiplo">Múltiplas Formas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-3 pt-6">
                      <input
                        id="has_remaining_balance"
                        type="checkbox"
                        checked={hasRemainingBalance || false}
                        onChange={(e) => setValue("has_remaining_balance", e.target.checked)}
                        className="h-5 w-5 rounded border-border/40 bg-black/30 text-primary focus:ring-primary/20 accent-primary"
                      />
                      <Label htmlFor="has_remaining_balance" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                        Negociar Saldo Devedor (Falta Dinheiro)?
                      </Label>
                    </div>
                  </div>

                  {hasRemainingBalance && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <Label htmlFor="negotiation_agreement" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Como foi acordada a negociação do saldo devedor?
                      </Label>
                      <Textarea
                        id="negotiation_agreement"
                        placeholder="Descreva aqui os detalhes da negociação do saldo devedor (ex: parcelamento direto, cheque para 30 dias, promissória, etc.)"
                        {...register("negotiation_agreement")}
                        rows={3}
                        className="bg-black/30 border-border/40 text-sm leading-relaxed"
                      />
                      {errors.negotiation_agreement && <p className="text-xs text-destructive">{errors.negotiation_agreement.message}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

          {/* STEP 4: Termos, Garantia & Entrega */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="delivery_km">Quilometragem (KM) de Entrega *</Label>
                  <Input
                    id="delivery_km"
                    type="number"
                    readOnly={isZeroKm}
                    {...register("delivery_km")}
                    className={`bg-black/30 text-xs h-9 ${isZeroKm ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                  <p className="text-[10px] text-muted-foreground/60">
                    Calcula automaticamente as trocas de óleo de 500, 1000 e 2000 km.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="warranty_period_days">Prazo de Garantia (Dias) *</Label>
                  <Input
                    id="warranty_period_days"
                    type="number"
                    disabled={modality === "repasse" || modality === "compra" || modality === "consignado"}
                    {...register("warranty_period_days")}
                    className={`bg-black/30 text-xs h-9 ${(modality === "repasse" || modality === "compra" || modality === "consignado") ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {modality !== "repasse" && modality !== "compra" && modality !== "consignado" && (
                <div className="space-y-1.5">
                  <Label>Tipo de Garantia Concedida</Label>
                  <Select
                    value={warrantyType}
                    onValueChange={(val) => setValue("warranty_type", val as any)}
                  >
                    <SelectTrigger className="bg-black/30 border-border/40 text-xs h-9">
                      <SelectValue placeholder="Selecione o tipo de garantia" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-border/40 text-xs">
                      <SelectItem value="motor_cambio">Motor e Caixa (Legal CDC)</SelectItem>
                      <SelectItem value="personalizada">Garantia Customizada Completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {modality !== "compra" && modality !== "consignado" && (
                <div className="space-y-1.5">
                  <Label htmlFor="warranty_text">Texto de Cláusula de Garantia *</Label>
                  <Textarea
                    id="warranty_text"
                    rows={4}
                    {...register("warranty_text")}
                    className="bg-black/30 border-border/40 text-xs leading-relaxed"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações do Contrato</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Pendências, observações internas ou acordos extras..."
                  {...register("notes")}
                  className="bg-black/30 border-border/40 text-xs"
                />
              </div>

              {/* Cláusulas Personalizadas */}
              <div className="border-t border-border/20 pt-4 space-y-3 text-xs">
                <Label className="font-semibold text-sm">Cláusulas Personalizadas Adicionais</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar cláusula (ex: O licenciamento 2026 está pago pelo vendedor...)"
                    value={newClause}
                    onChange={(e) => setNewClause(e.target.value)}
                    className="bg-black/30 text-xs h-9"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddClause} className="h-9">
                    <Plus size={16} />
                  </Button>
                </div>

                {customClauses.length > 0 && (
                  <ul className="space-y-2 bg-secondary/15 p-3 rounded-lg border border-border/40">
                    {customClauses.map((clause, idx) => (
                      <li key={idx} className="flex justify-between items-start gap-4 text-[11px] text-muted-foreground border-b border-border/20 last:border-b-0 pb-1.5 last:pb-0">
                        <span>{idx + 1}. {clause}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClause(idx)}
                          className="text-destructive hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {/* Action Buttons */}
        <div className="border-t border-border/40 p-6 flex justify-between bg-secondary/5">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={16} className="mr-1" /> Voltar
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => router.push("/contracts")}>
              Cancelar
            </Button>
          )}

          {step < 4 ? (
            <Button type="button" onClick={handleNextStep} className="gap-1.5">
              Próximo <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit(onSubmit, onInvalid)}
              disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 font-bold"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {modality === "repasse" ? "Registrar Termo de Repasse" : "Gerar Proposta e Enviar"}
            </Button>
          )}
        </div>
      </Card>

      {/* Real-time Draft View (Aesthetics) */}
      <Card className="glass-card border-white/5 flex flex-col justify-between max-h-[620px]">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText size={14} /> Minuta do Contrato
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-5 flex-grow text-[10px] leading-relaxed text-muted-foreground/80 space-y-3 overflow-y-auto font-mono">
          <div className="text-center font-bold text-foreground text-[11px] uppercase mb-2 flex flex-col items-center">
            <span>
              {modality === "vista"
                ? "RECIBO CONTRATO DE VENDA DE VEÍCULO USADO"
                : modality === "compra_venda"
                ? "RECIBO CONTRATO DE COMPRA E VENDA DE VEÍCULO"
                : modality === "financiada"
                ? "CONTRATO DE COMPRA E VENDA DE VEÍCULO COM FINANCIAMENTO"
                : modality === "repasse"
                ? "TERMO DE COMPRA E VENDA DE VEÍCULO NO ESTADO (REPASSE)"
                : modality === "compra"
                ? "CONTRATO DE COMPRA DE VEÍCULO (AQUISIÇÃO)"
                : modality === "consignado"
                ? "CONTRATO DE CONSIGNAÇÃO DE VEÍCULO AUTOMOTOR"
                : "CONTRATO DE COMPRA E VENDA DE VEÍCULO"}
            </span>
            <span className="text-[9px] text-primary border border-primary/30 px-1 py-0.5 rounded mt-1 font-normal uppercase font-sans">
              MODALIDADE: {modality}
            </span>
          </div>

          <p>
            <strong>PARTES:</strong>
            <br />
            {modality === "compra" ? (
              <>
                - <strong>VENDEDOR (CLIENTE):</strong> {clientRegType === "existing" ? (
                  selectedClient ? <span className="text-foreground underline">{selectedClient.name} (CPF: {formatCPF(selectedClient.cpf)})</span> : <span className="italic text-muted-foreground/45">[Selecione o Vendedor]</span>
                ) : (
                  newClientData.name ? <span className="text-foreground underline">{newClientData.name} (CPF: {newClientData.cpf})</span> : <span className="italic text-muted-foreground/45">[Preencha os dados do vendedor]</span>
                )}
                <br />
                - <strong>COMPRADOR:</strong> Empresa Cadastrada (conforme Configurações).
              </>
            ) : modality === "consignado" ? (
              <>
                - <strong>CONSIGNANTE (CLIENTE):</strong> {clientRegType === "existing" ? (
                  selectedClient ? <span className="text-foreground underline">{selectedClient.name} (CPF: {formatCPF(selectedClient.cpf)})</span> : <span className="italic text-muted-foreground/45">[Selecione o Consignante]</span>
                ) : (
                  newClientData.name ? <span className="text-foreground underline">{newClientData.name} (CPF: {newClientData.cpf})</span> : <span className="italic text-muted-foreground/45">[Preencha os dados do cliente]</span>
                )}
                <br />
                - <strong>CONSIGNATÁRIO:</strong> Empresa Cadastrada (conforme Configurações).
              </>
            ) : (
              <>
                - <strong>VENDEDOR:</strong> Empresa Cadastrada (conforme Configurações).
                <br />
                - <strong>COMPRADOR:</strong> {clientRegType === "existing" ? (
                  selectedClient ? <span className="text-foreground underline">{selectedClient.name} (CPF: {formatCPF(selectedClient.cpf)})</span> : <span className="italic text-muted-foreground/45">[Selecione o Comprador]</span>
                ) : (
                  newClientData.name ? <span className="text-foreground underline">{newClientData.name} (CPF: {newClientData.cpf})</span> : <span className="italic text-muted-foreground/45">[Preencha os dados do cliente]</span>
                )}
              </>
            )}
          </p>

          <p>
            <strong>OBJETO DE COMPRA:</strong>
            <br />
            {vehicleRegType === "existing" ? (
              selectedVehicle ? (
                <span className="text-foreground">
                  Veículo {selectedVehicle.brand} {selectedVehicle.model}, placa {selectedVehicle.plate}, cor {selectedVehicle.color}, ano {selectedVehicle.year}, renavam {selectedVehicle.renavam}.
                </span>
              ) : (
                <span className="italic text-muted-foreground/45">[Selecione o Veículo do Estoque]</span>
              )
            ) : (
              newVehicleData.brand ? (
                <span className="text-foreground">
                  Veículo {newVehicleData.brand} {newVehicleData.model}, placa {newVehicleData.plate}, cor {newVehicleData.color}, ano {newVehicleData.year}, renavam {newVehicleData.renavam}.
                </span>
              ) : (
                <span className="italic text-muted-foreground/45">[Preencha os dados do veículo]</span>
              )
            )}
          </p>

          <p>
            <strong>CRONOGRAMA FINANCEIRO:</strong>
            <br />
            - Preço Total: <strong>{formatCurrency(totalValue || 0)}</strong>
            {(modality === "vista" || modality === "repasse") && (
              <>
                <br />
                - Forma de Pagamento: <strong>{modality === "repasse" ? "Repasse" : "À Vista"}</strong>
                {cardSurcharge > 0 && (
                  <>
                    <br />
                    - Juros/Acréscimo do Cartão: <strong>{formatCurrency(cardSurcharge)}</strong>
                    <br />
                    - Valor Total Ajustado: <strong>{formatCurrency(Number(totalValue) + Number(cardSurcharge))}</strong>
                  </>
                )}
                {(cashVal > 0 || pixValState > 0 || creditVal > 0 || debitVal > 0) && (
                  <>
                    <br />
                    - Detalhes do Pagamento no Ato:
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[9px]">
                      {cashVal > 0 && <li>Espécie: <strong>{formatCurrency(cashVal)}</strong></li>}
                      {pixValState > 0 && <li>PIX: <strong>{formatCurrency(pixValState)}</strong></li>}
                      {creditVal > 0 && <li>Cartão de Crédito: <strong>{formatCurrency(creditVal)}</strong></li>}
                      {debitVal > 0 && <li>Cartão de Débito: <strong>{formatCurrency(debitVal)}</strong></li>}
                    </ul>
                  </>
                )}
                {Math.max(Number(totalValue) + Number(cardSurcharge) - (cashVal + pixValState + creditVal + debitVal), 0) > 0 && (
                  <>
                    <br />
                    - Saldo a Quitar: <strong className="text-amber-400">{formatCurrency(Math.max(Number(totalValue) + Number(cardSurcharge) - (cashVal + pixValState + creditVal + debitVal), 0))}</strong>
                    <br />
                    - Parcelamento do Saldo: <strong>{remainingInstallments}x</strong> no <strong>{remainingMethod.toUpperCase()}</strong>
                    {remainingDueDate && (
                      <>
                        <br />
                        - Conclusão / Vencimento: <strong>{new Date(remainingDueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {modality === "financiada" && (
              <>
                <br />
                - Entrada / Sinal: <strong>{formatCurrency(downPayment || 0)}</strong>
                <br />
                - Financiamento: <strong>{formatCurrency(Math.max(totalValue - downPayment, 0))}</strong> parcelado em <strong>{installmentsCount}x</strong> de <strong>{formatCurrency(pmtValue)}</strong>.
                <br />
                - Banco Financiador: <strong>{selectedBank === "Outro" ? customBank : selectedBank}</strong>
              </>
            )}
            {modality === "compra_venda" && (
              <>
                <br />
                - Forma de Pagamento: <strong>Compra e Venda (Troca)</strong>
                {cardSurcharge > 0 && (
                  <>
                    <br />
                    - Juros/Acréscimo do Cartão: <strong>{formatCurrency(cardSurcharge)}</strong>
                    <br />
                    - Valor Total Ajustado: <strong>{formatCurrency(Number(totalValue) + Number(cardSurcharge))}</strong>
                  </>
                )}
                <br />
                - Recebido na Troca: <strong>{tradeBrandModel || "[Veículo da Troca]"}</strong> pelo valor de <strong>{formatCurrency(tradeValue || 0)}</strong>
                {(tradeCash > 0 || tradePix > 0 || tradeCard > 0 || tradeFinanced > 0) && (
                  <>
                    <br />
                    - Detalhamento Complementar:
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-[9px]">
                      {tradeCash > 0 && <li>Espécie: <strong>{formatCurrency(tradeCash)}</strong></li>}
                      {tradePix > 0 && <li>PIX: <strong>{formatCurrency(tradePix)}</strong></li>}
                      {tradeCard > 0 && <li>Cartão: <strong>{formatCurrency(tradeCard)}</strong></li>}
                      {tradeFinanced > 0 && (
                        <li>Financiamento: <strong>{formatCurrency(tradeFinanced)}</strong> pelo <strong>{tradeBank === "Outro" ? tradeCustomBank : tradeBank}</strong></li>
                      )}
                    </ul>
                  </>
                )}
                {Math.max(Number(totalValue) + Number(cardSurcharge) - (tradeValue + tradeFinanced + tradeCash + tradePix + tradeCard), 0) > 0 && (
                  <>
                    <br />
                    - Saldo a Quitar: <strong className="text-amber-400">{formatCurrency(Math.max(Number(totalValue) + Number(cardSurcharge) - (tradeValue + tradeFinanced + tradeCash + tradePix + tradeCard), 0))}</strong>
                    <br />
                    - Parcelamento do Saldo: <strong>{remainingInstallments}x</strong> no <strong>{remainingMethod.toUpperCase()}</strong>
                    {remainingDueDate && (
                      <>
                        <br />
                        - Conclusão / Vencimento: <strong>{new Date(remainingDueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {modality === "compra" && (
              <>
                <br />
                - Valor de Compra / Avaliação Bruta: <strong>{formatCurrency(purchaseAppraisedVal)}</strong>
                {purchaseDetranVal > 0 && (
                  <>
                    <br />
                    - Dedução IPVA/Detran (-): <strong>{formatCurrency(purchaseDetranVal)}</strong>
                  </>
                )}
                {purchaseFinesVal > 0 && (
                  <>
                    <br />
                    - Dedução Multas (-): <strong>{formatCurrency(purchaseFinesVal)}</strong>
                  </>
                )}
                {purchaseFinancingVal > 0 && (
                  <>
                    <br />
                    - Dedução Quitação de Financiamento (-): <strong>{formatCurrency(purchaseFinancingVal)}</strong>
                  </>
                )}
                <br />
                - Líquido a Pagar ao Cliente: <strong className="text-emerald-400">{formatCurrency(purchaseAppraisedVal - purchaseFinesVal - purchaseDetranVal - purchaseFinancingVal)}</strong>
              </>
            )}
            {modality === "consignado" && (
              <>
                <br />
                - Tipo de Operação: <strong>Consignação de Veículo</strong>
                <br />
                - Valor Estimado de Venda: <strong>{formatCurrency(totalValue || 0)}</strong>
                <br />
                - Valor Líquido Garantido ao Proprietário: <strong>{formatCurrency(consignationOwnerValue || 0)}</strong>
                <br />
                - Comissão de Intermediação Estimada: <strong>{formatCurrency(estimatedConsignationCommission)}</strong>
                <br />
                - Prazo Contratual de Consignação: <strong>{watch("consignation_period_days")} dias</strong>
              </>
            )}
          </p>

          {(modality === "compra_venda" || modality === "repasse") && watch("former_owner_name") && (
            <p>
              <strong>HISTÓRICO / REGISTRO:</strong>
              <br />
              - Proprietário Anterior: {watch("former_owner_name")} (CPF: {watch("former_owner_cpf") || "N/A"})
            </p>
          )}

          <p>
            <strong>GARANTIA:</strong>
            <br />
            {modality === "repasse" ? (
              <span className="text-red-400 font-bold">VEÍCULO EM ESTADO DE REPASSE COMERCIAL (ISENTO DE GARANTIAS DE PÁTIO/MECÂNICA).</span>
            ) : modality === "consignado" ? (
              <span className="text-emerald-400">VEÍCULO EM REGIME DE CONSIGNAÇÃO (ISENTO DE GARANTIA DE VENDA NESTE INSTRUMENTO).</span>
            ) : (
              <span>Garantia de <strong>{warrantyPeriodDays} dias</strong>. Tipo: {warrantyType === "motor_cambio" ? "Motor e Câmbio (CDC)" : "Customizada completa"}.</span>
            )}
          </p>

          {deliveryKm > 0 && modality !== "repasse" && (
            <p>
              <strong>PROGRAMAÇÃO DE TROCA DE ÓLEO:</strong>
              <br />
              - KM Entrega: {deliveryKm} km
              <br />
              - 1ª Troca de Óleo (500km): com {Number(deliveryKm) + 500} km
              <br />
              - 2ª Troca de Óleo (1000km): com {Number(deliveryKm) + 1000} km
              <br />
              - 3ª Troca de Óleo (2000km): com {Number(deliveryKm) + 2000} km
            </p>
          )}

          {customClauses.length > 0 && (
            <div>
              <strong>CLÁUSULAS ADICIONAIS:</strong>
              <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                {customClauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            </div>
          )}

          <p className="border-t border-border/30 pt-2 text-[9px] italic text-muted-foreground/60">
            * Minuta provisória em tempo real. Os links oficiais de assinatura criptográfica e as notificações de e-mail e WhatsApp serão gerados assim que o contrato for consolidado no banco.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
