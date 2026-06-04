"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getTransferProcesses,
  startTransferProcess,
  updateTransferStatus,
  getTransferLogs,
} from "@/actions/transferActions";
import { getContracts } from "@/actions/contractActions";
import { Contract, TransferProcess, ContractStatus, TransferStatusLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  FolderOpen,
  User,
  Car,
  Clock,
  CheckCircle,
  FileCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Calendar,
  Building,
  Upload,
  ExternalLink,
  History
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface TransferClientProps {
  initialProcesses: TransferProcess[];
  signPendingContracts: Contract[];
  userRole: string;
}

interface KanbanItem {
  contractId: string;
  processId?: string; // undefined if not started
  title: string;
  clientName: string;
  contractNumber: number;
  status: ContractStatus;
  plate: string;
  value: number;
  entryDate?: string;
  responsibleName?: string;
  forwardedTo?: string;
  receiptUrl?: string;
  notes?: string;
}

interface Column {
  id: ContractStatus;
  title: string;
  description: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
}

const COLUMNS: Column[] = [
  {
    id: "AGUARDANDO_ENTRADA",
    title: "Aguardando Entrada",
    description: "Sinal ou entrada financeira pendente",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    dotColor: "bg-rose-400",
  },
  {
    id: "FALTA_PAGAMENTO_DE_ENTRADA",
    title: "Sinal Pendente",
    description: "Aguardando entrada financeira",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    dotColor: "bg-amber-400",
  },
  {
    id: "AGUARDANDO_VENDEDOR_DAR_ENTRADA",
    title: "Aguardando Início",
    description: "Assinado, aguarda início operacional",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    dotColor: "bg-blue-400",
  },
  {
    id: "DADOS_ENVIADOS_PROPRIETARIO",
    title: "Enviado Proprietário",
    description: "Dados enviado ao proprietário, aguardando",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/20",
    dotColor: "bg-pink-400",
  },
  {
    id: "DUT_AGUARDANDO_RECONHECER_VENDEDOR",
    title: "DUT - Reconhecer Vendedor",
    description: "Aguardando assinatura reconhecida do vendedor",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    dotColor: "bg-purple-400",
  },
  {
    id: "DUT_AGUARDANDO_RECONHECER_COMPRADOR",
    title: "DUT - Reconhecer Comprador",
    description: "Aguardando assinatura reconhecida do comprador",
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    border: "border-fuchsia-500/20",
    dotColor: "bg-fuchsia-400",
  },
  {
    id: "DUT_AGUARDANDO_VISTORIA",
    title: "DUT - Vistoria",
    description: "Aguardando vistoria veicular",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
    dotColor: "bg-teal-400",
  },
  {
    id: "DUT_AGUARDANDO_FINALIZAR_TAXAS_DETRAN",
    title: "DUT - Taxas Detran",
    description: "Aguardando finalização das taxas do Detran",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
    dotColor: "bg-sky-400",
  },
  {
    id: "AGUARDANDO_ATPVE_GERAR",
    title: "Aguardando ATPVE Gerar",
    description: "Aguardando geração do ATPVE eletrônico",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    dotColor: "bg-violet-400",
  },
  {
    id: "AGUARDANDO_ATPVE_RECONHECER_COMPRADOR",
    title: "ATPVE - Reconhecer Comprador",
    description: "Aguardando reconhecimento de firma do comprador",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    dotColor: "bg-emerald-400",
  },
  {
    id: "EM_PROCESSO_DE_TRANSFERENCIA",
    title: "Em Transferência",
    description: "Coleta de assinaturas reconhecidas",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    dotColor: "bg-cyan-400",
  },
  {
    id: "DOCUMENTAÇÃO_PENDENTE",
    title: "Doc Pendente",
    description: "Exigências de cartório ou Detran",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    dotColor: "bg-rose-400",
  },
  {
    id: "AGUARDANDO_DESPACHANTE",
    title: "Despachante",
    description: "Processamento junto ao órgão",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    dotColor: "bg-purple-400",
  },
  {
    id: "TRANSFERÊNCIA_CONCLUÍDA",
    title: "Concluído",
    description: "Veículo transferido e entregue",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    dotColor: "bg-emerald-400",
  },
];

export function TransferClient({ initialProcesses, signPendingContracts, userRole }: TransferClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Dialog States
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KanbanItem | null>(null);
  
  // Start form states
  const [startNotes, setStartNotes] = useState("");
  const [forwardedTo, setForwardedTo] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  // Detail dialog update states
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateForwardedTo, setUpdateForwardedTo] = useState("");
  const [atpveBase64, setAtpveBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: processes = [] } = useQuery({
    queryKey: ["transfer-processes"],
    queryFn: getTransferProcesses,
    initialData: initialProcesses,
  });

  const { data: contractsData } = useQuery({
    queryKey: ["contracts-for-transfer"],
    queryFn: () => getContracts({ limit: 100 }),
    initialData: { data: signPendingContracts, count: signPendingContracts.length },
  });

  const pendingContracts = (contractsData?.data || []).filter(
    (c) =>
      (c.status === "AGUARDANDO_VENDEDOR_DAR_ENTRADA" ||
        c.status === "FALTA_PAGAMENTO_DE_ENTRADA" ||
        c.status === "AGUARDANDO_ENTRADA") &&
      !processes.some((p) => p.contract_id === c.id)
  );

  // Load status logs for selected item
  const [timelineLogs, setTimelineLogs] = useState<TransferStatusLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isDetailOpen && selectedItem?.processId) {
      setLoadingLogs(true);
      getTransferLogs(selectedItem.processId)
        .then((logs) => {
          setTimelineLogs(logs);
        })
        .catch((err) => console.error("Error loading logs:", err))
        .finally(() => setLoadingLogs(false));
    } else {
      setTimelineLogs([]);
    }
  }, [isDetailOpen, selectedItem]);

  // Mutations
  const startMutation = useMutation({
    mutationFn: (params: Parameters<typeof startTransferProcess>[0]) => startTransferProcess(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-processes"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-for-transfer"] });
      setIsStartOpen(false);
      setStartNotes("");
      setForwardedTo("");
      router.refresh();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ processId, params }: { processId: string; params: Parameters<typeof updateTransferStatus>[1] }) =>
      updateTransferStatus(processId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-processes"] });
      queryClient.invalidateQueries({ queryKey: ["contracts-for-transfer"] });
      setIsDetailOpen(false);
      setUpdateNotes("");
      setAtpveBase64(null);
      router.refresh();
    },
  });

  // Consolidate list of all Kanban items
  const kanbanItems: KanbanItem[] = [];

  // 1. Add unsigned/entry contracts
  pendingContracts.forEach((c) => {
    kanbanItems.push({
      contractId: c.id,
      title: c.vehicle ? `${c.vehicle.brand} ${c.vehicle.model}` : "Veículo",
      clientName: c.client?.name || "Cliente",
      contractNumber: c.contract_number,
      status: c.status,
      plate: c.vehicle?.plate || "N/A",
      value: c.total_value,
    });
  });

  // 2. Add processes
  processes.forEach((p) => {
    if (p.contract) {
      kanbanItems.push({
        contractId: p.contract_id,
        processId: p.id,
        title: p.contract.vehicle ? `${p.contract.vehicle.brand} ${p.contract.vehicle.model}` : "Veículo",
        clientName: p.contract.client?.name || "Cliente",
        contractNumber: p.contract.contract_number,
        status: p.contract.status,
        plate: p.contract.vehicle?.plate || "N/A",
        value: p.contract.total_value,
        entryDate: p.entry_date,
        responsibleName: p.responsible?.name || "Operador",
        forwardedTo: p.forwarded_to,
        receiptUrl: p.receipt_url,
        notes: p.notes,
      });
    }
  });

  // Handlers for HTML5 Drag & Drop
  const handleDragStart = (e: React.DragEvent, item: KanbanItem) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        contractId: item.contractId,
        processId: item.processId,
        status: item.status,
      })
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ContractStatus) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;

    const data = JSON.parse(dataStr) as { contractId: string; processId?: string; status: ContractStatus };

    if (data.status === targetStatus) return;

    if (!data.processId) {
      // Contract needs process initialization
      if (
        targetStatus === "EM_PROCESSO_DE_TRANSFERENCIA" ||
        targetStatus === "DOCUMENTAÇÃO_PENDENTE" ||
        targetStatus === "AGUARDANDO_DESPACHANTE"
      ) {
        // Encontre o item correspondente para preencher o formulário inicial
        const matched = kanbanItems.find((k) => k.contractId === data.contractId);
        if (matched) {
          setSelectedItem(matched);
          setIsStartOpen(true);
        }
      } else {
        alert("Para mover esse contrato, você deve primeiro arrastá-lo para 'Em Transferência' para iniciar o fluxo operacional.");
      }
    } else {
      // Já possui processo criado, atualiza status
      await updateMutation.mutateAsync({
        processId: data.processId,
        params: {
          new_status: targetStatus,
          notes: `Atualização de coluna via Kanban: ${targetStatus}`,
        },
      });
    }
  };

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    await startMutation.mutateAsync({
      contract_id: selectedItem.contractId,
      entry_date: entryDate,
      forwarded_to: forwardedTo,
      notes: startNotes,
    });
  };

  // Convert ATPV-e document to base64
  const handleAtpveUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAtpveBase64(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDetailUpdate = async (newStatus?: ContractStatus) => {
    if (!selectedItem?.processId) return;

    await updateMutation.mutateAsync({
      processId: selectedItem.processId,
      params: {
        new_status: newStatus || selectedItem.status,
        forwarded_to: updateForwardedTo || selectedItem.forwardedTo,
        receipt_url: atpveBase64 || selectedItem.receiptUrl,
        notes: updateNotes || undefined,
      },
    });
  };

  const openDetails = (item: KanbanItem) => {
    setSelectedItem(item);
    setUpdateForwardedTo(item.forwardedTo || "");
    setUpdateNotes("");
    setAtpveBase64(null);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderOpen className="text-primary" /> Kanban Operacional - Pós-Venda
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe o andamento da documentação e transferência de veículos dos contratos fechados.
          </p>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const itemsInCol = kanbanItems.filter((i) => i.status === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col min-w-[200px] h-[75vh] rounded-lg bg-zinc-950/40 border border-white/5 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/40 bg-zinc-950/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    {col.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{col.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-black/40 border-border/40 h-5 px-1.5">
                  {itemsInCol.length}
                </Badge>
              </div>

              {/* Column Cards */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {itemsInCol.map((item) => (
                  <Card
                    key={item.contractId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="glass-card hover:border-primary/20 border-white/5 cursor-grab active:cursor-grabbing text-xs space-y-2.5 p-3 group transition-all duration-300"
                    onClick={() => openDetails(item)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted-foreground">#{item.contractNumber}</span>
                      {item.processId ? (
                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-semibold">
                          Processo
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-semibold">
                          Novo
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors flex items-center gap-1">
                        <Car size={11} className="text-muted-foreground" /> {item.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 flex items-center gap-1 mt-0.5">
                        <User size={11} className="text-muted-foreground" /> {item.clientName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/20 pt-2 text-[10px]">
                      <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                      <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded font-mono border border-border/20 text-muted-foreground">
                        {item.plate}
                      </span>
                    </div>

                    {item.forwardedTo && (
                      <div className="bg-black/30 border border-border/20 rounded p-1 text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Building size={10} className="text-primary shrink-0" />
                        <span className="truncate">{item.forwardedTo}</span>
                      </div>
                    )}
                  </Card>
                ))}

                {itemsInCol.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/20 rounded-lg text-muted-foreground/30 text-[10px]">
                    Arraste cartões aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Process Dialog */}
      <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="text-primary" /> Iniciar Processo de Transferência
            </DialogTitle>
            <DialogDescription>
              Inicialize a movimentação oficial dos papéis de transferência para o veículo{" "}
              <strong>{selectedItem?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStartSubmit} className="space-y-4 my-2">
            <div className="space-y-1">
              <Label htmlFor="entry_date">Data de Entrada *</Label>
              <Input
                id="entry_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="bg-black/30"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="forwarded_to">Despachante / Cartório Responsável</Label>
              <Input
                id="forwarded_to"
                placeholder="ex: Despachante AutoSul / 2º Ofício"
                value={forwardedTo}
                onChange={(e) => setForwardedTo(e.target.value)}
                className="bg-black/30"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="start_notes">Observações Iniciais</Label>
              <Textarea
                id="start_notes"
                placeholder="Indique observações como pendências de taxas, vistoria agendada, etc."
                value={startNotes}
                onChange={(e: any) => setStartNotes(e.target.value)}
                className="bg-black/30 h-20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsStartOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={startMutation.isPending} className="font-semibold">
                {startMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Processo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Detail / Update Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-border/40 text-foreground max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderOpen className="text-primary" /> Ficha Operacional pós-venda
            </DialogTitle>
            <DialogDescription>
              Acompanhamento de trâmites operacionais, envio do comprovante ATPV-e e histórico de auditoria.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6 my-2 text-xs">
              {/* Ficha Resumo */}
              <div className="grid grid-cols-2 gap-4 border-b border-border/20 pb-4 leading-relaxed text-muted-foreground">
                <div>
                  <p className="font-bold text-foreground">Veículo</p>
                  <p>{selectedItem.title} ({selectedItem.plate})</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Comprador</p>
                  <p>{selectedItem.clientName}</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Valor Total</p>
                  <p className="font-semibold text-primary">{formatCurrency(selectedItem.value)}</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Status Atual</p>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                    {selectedItem.status}
                  </Badge>
                </div>
              </div>

              {/* Form de atualização */}
              {selectedItem.processId ? (
                <div className="space-y-4 bg-zinc-900/50 p-4 border border-border/40 rounded-lg">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                    Atualizar Informações Operacionais
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="update_forwarded_to">Responsável Externo (Despachante)</Label>
                      <Input
                        id="update_forwarded_to"
                        value={updateForwardedTo}
                        onChange={(e) => setUpdateForwardedTo(e.target.value)}
                        className="bg-black/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Documento ATPV-e / Comprovante</Label>
                      <div className="flex gap-2">
                        {selectedItem.receiptUrl ? (
                          <a
                            href={selectedItem.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-3 rounded hover:bg-primary/20 transition-all font-semibold shrink-0"
                          >
                            <ExternalLink size={12} /> Ver Atual
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground flex items-center shrink-0">Nenhum enviado</span>
                        )}

                        <div className="relative flex-1">
                          <Button variant="outline" className="w-full text-xs gap-1.5 h-10 border-border/40 bg-black/25">
                            <Upload size={12} />
                            {atpveBase64 ? "Substituir" : "Enviar ATPV-e"}
                          </Button>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleAtpveUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="update_notes">Inserir Nova Nota Operational / Justificativa</Label>
                    <Textarea
                      id="update_notes"
                      placeholder="Adicione um detalhe de andamento..."
                      value={updateNotes}
                      onChange={(e: any) => setUpdateNotes(e.target.value)}
                      className="bg-black/30 h-16"
                    />
                  </div>

                  <div className="flex gap-2 justify-end border-t border-border/20 pt-3">
                    {/* Botões rápidos para avançar status direto daqui */}
                    {selectedItem.status === "AGUARDANDO_VENDEDOR_DAR_ENTRADA" && (
                      <Button
                        type="button"
                        className="text-[10px] h-8 bg-pink-600 hover:bg-pink-700 text-white font-semibold animate-in fade-in duration-200"
                        onClick={() => handleDetailUpdate("DADOS_ENVIADOS_PROPRIETARIO")}
                        disabled={updateMutation.isPending}
                      >
                        Enviar p/ Proprietário
                      </Button>
                    )}
                    {selectedItem.status === "DADOS_ENVIADOS_PROPRIETARIO" && (
                      <Button
                        type="button"
                        className="text-[10px] h-8 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold animate-in fade-in duration-200"
                        onClick={() => handleDetailUpdate("EM_PROCESSO_DE_TRANSFERENCIA")}
                        disabled={updateMutation.isPending}
                      >
                        Iniciar Transferência
                      </Button>
                    )}
                    {selectedItem.status === "EM_PROCESSO_DE_TRANSFERENCIA" && (
                      <Button
                        type="button"
                        variant="destructive"
                        className="text-[10px] h-8 font-semibold"
                        onClick={() => handleDetailUpdate("DOCUMENTAÇÃO_PENDENTE")}
                        disabled={updateMutation.isPending}
                      >
                        Pendenciar Documento
                      </Button>
                    )}
                    {selectedItem.status === "DOCUMENTAÇÃO_PENDENTE" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-[10px] h-8 border-border/40 font-semibold"
                        onClick={() => handleDetailUpdate("EM_PROCESSO_DE_TRANSFERENCIA")}
                        disabled={updateMutation.isPending}
                      >
                        Resolver Pendências
                      </Button>
                    )}
                    {selectedItem.status !== "AGUARDANDO_DESPACHANTE" && selectedItem.status !== "TRANSFERÊNCIA_CONCLUÍDA" && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-[10px] h-8 font-semibold"
                        onClick={() => handleDetailUpdate("AGUARDANDO_DESPACHANTE")}
                        disabled={updateMutation.isPending}
                      >
                        Enviar p/ Despachante
                      </Button>
                    )}
                    {selectedItem.status !== "TRANSFERÊNCIA_CONCLUÍDA" && (
                      <Button
                        type="button"
                        className="text-[10px] h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                        onClick={() => handleDetailUpdate("TRANSFERÊNCIA_CONCLUÍDA")}
                        disabled={updateMutation.isPending}
                      >
                        Finalizar Transferência
                      </Button>
                    )}
                    <Button
                      type="button"
                      className="text-[10px] h-8 font-semibold"
                      variant="outline"
                      onClick={() => handleDetailUpdate()}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Salvar Notas
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex flex-col items-center justify-center text-center gap-2 text-amber-400">
                  <AlertCircle size={24} />
                  <p>Este contrato ainda não tem processo de transferência iniciado.</p>
                  <Button
                    size="sm"
                    className="mt-2 text-xs font-semibold"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setIsStartOpen(true);
                    }}
                  >
                    Iniciar Operação de Transferência
                  </Button>
                </div>
              )}

              {/* Timeline Audit Logs */}
              {selectedItem.processId && (
                <div className="space-y-3">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                    <History size={13} className="text-primary" /> Histórico de Movimentações (Auditoria)
                  </h4>

                  {loadingLogs ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : timelineLogs.length === 0 ? (
                    <p className="text-muted-foreground italic text-center py-2">Nenhum log operacional registrado.</p>
                  ) : (
                    <div className="relative pl-4 border-l border-border/40 space-y-4">
                      {timelineLogs.map((log) => (
                        <div key={log.id} className="relative space-y-1">
                          <span className="absolute -left-[20px] top-1 h-2 w-2 rounded-full bg-primary border border-zinc-950" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {log.new_status}
                            </span>
                            {log.previous_status && (
                              <>
                                <ArrowRight size={10} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">
                                  {log.previous_status}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-muted-foreground leading-normal">{log.notes}</p>
                          <p className="text-[9px] text-muted-foreground/60 font-mono">
                            Modificado por {log.user?.name || "Sistema"} em {formatDate(log.created_at)} às {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
