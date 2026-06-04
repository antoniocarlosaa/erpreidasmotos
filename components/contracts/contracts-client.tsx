"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getContracts, deleteContract } from "@/actions/contractActions";
import { Contract, ContractStatus } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Calendar,
  Share2,
} from "lucide-react";
import { formatCPF } from "@/utils/validators";
import { formatCurrency, formatDate } from "@/utils/formatters";

// Status definitions and styles
export const CONTRACT_STATUS_DETAILS: Record<
  ContractStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  AGUARDANDO_INICIAR: {
    label: "Aguardando Iniciar",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  AGUARDANDO_COMPRADOR_FINALIZAR: {
    label: "Aguardando Comprador",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  AGUARDANDO_VENDEDOR: {
    label: "Aguardando Vendedor",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
  },
  FALTA_PAGAMENTO_DE_ENTRADA: {
    label: "Aguardando Entrada",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  AGUARDANDO_VENDEDOR_DAR_ENTRADA: {
    label: "Pós-Venda Pendente",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  DADOS_ENVIADOS_PROPRIETARIO: {
    label: "Dados enviado ao proprietário, aguardando",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    border: "border-pink-500/20",
  },
  EM_PROCESSO_DE_TRANSFERENCIA: {
    label: "Em Transferência",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  DOCUMENTAÇÃO_PENDENTE: {
    label: "Doc Pendente",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
  },
  AGUARDANDO_DESPACHANTE: {
    label: "Despachante",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  AGUARDANDO_FINALIZACAO: {
    label: "Vistoria / Final",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
  },
  TRANSFERÊNCIA_CONCLUÍDA: {
    label: "Concluído",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  TRANSFERÊNCIA_CANCELADA: {
    label: "Cancelado",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
  },
  AGUARDANDO_ENTRADA: {
    label: "Aguardando Entrada",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  DUT_AGUARDANDO_RECONHECER_VENDEDOR: {
    label: "DUT - Aguardando Reconhecer Vendedor",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  DUT_AGUARDANDO_RECONHECER_COMPRADOR: {
    label: "DUT - Aguardando Reconhecer Comprador",
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    border: "border-fuchsia-500/20",
  },
  DUT_AGUARDANDO_VISTORIA: {
    label: "DUT - Aguardando Vistoria",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
  },
  DUT_AGUARDANDO_FINALIZAR_TAXAS_DETRAN: {
    label: "DUT - Aguardando Finalizar Taxas Detran",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
  },
  AGUARDANDO_ATPVE_GERAR: {
    label: "Aguardando ATPVE Gerar",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
  },
  AGUARDANDO_ATPVE_RECONHECER_COMPRADOR: {
    label: "Aguardando ATPVE Reconhecer Comprador",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
};

export function getModalityLabel(contract: Contract) {
  if (contract.modality === "vista") {
    return "Venda à Vista";
  }
  if (contract.modality === "repasse") {
    return "Venda de Repasse";
  }
  if (contract.modality === "compra") {
    return "Só Compra";
  }
  if (contract.modality === "consignado") {
    return "Consignação";
  }
  if (contract.modality === "financiada") {
    const text = contract.negotiation_agreement || "";
    const match = text.match(/Banco\s+([^.,\n]+)/i);
    let bankName = match ? match[1].trim() : "";
    if (bankName.toLowerCase().includes("valor")) {
      bankName = bankName.split(/valor/i)[0].trim();
    }
    return bankName ? `Venda Financiada (${bankName})` : "Venda Financiada";
  }
  if (contract.modality === "compra_venda") {
    const text = contract.negotiation_agreement || "";
    const isFinanced = text.toLowerCase().includes("financiado");
    if (isFinanced) {
      const match = text.match(/financiado\s+pelo\s+(?:banco\s+)?([^.,\n]+)/i);
      let bankName = match ? match[1].trim() : "";
      if (bankName.toLowerCase().includes("valor")) {
        bankName = bankName.split(/valor/i)[0].trim();
      }
      return bankName ? `Compra e Venda Financiada (${bankName})` : "Compra e Venda Financiada";
    }
    return "Compra e Venda à Vista";
  }
  return contract.modality || "Outro";
}

interface ContractsClientProps {
  initialContracts: { data: Contract[]; count: number };
  userRole: string;
}

export function ContractsClient({ initialContracts, userRole }: ContractsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [page, setPage] = useState(0);
  const limit = 10;

  // Clipboard share states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Query React Query
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ["contracts", debouncedSearch, statusFilter, page],
    queryFn: () =>
      getContracts({
        search: debouncedSearch,
        status: statusFilter !== "todos" ? (statusFilter as ContractStatus) : undefined,
        limit,
        offset: page * limit,
      }),
    initialData:
      debouncedSearch === "" && statusFilter === "todos" && page === 0 ? initialContracts : undefined,
  });

  const contracts = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setIsDeleteOpen(false);
      setSelectedContract(null);
      router.refresh();
    },
  });

  const handleDeletePrompt = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDeleteOpen(true);
  };

  const handleCopyLink = (contractId: string) => {
    const origin = window.location.origin;
    const link = `${origin}/contracts/${contractId}/sign`;
    navigator.clipboard.writeText(link);
    setCopiedId(contractId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: ContractStatus) => {
    const details = CONTRACT_STATUS_DETAILS[status];
    if (!details) return null;
    return (
      <Badge className={`${details.bg} ${details.text} ${details.border} border font-semibold`}>
        {details.label}
      </Badge>
    );
  };

  const getModalityBadge = (contract: Contract) => {
    const label = getModalityLabel(contract);
    let colorClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"; // default / repasse
    
    if (contract.modality === "vista") {
      colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (contract.modality === "financiada") {
      colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    } else if (contract.modality === "compra_venda") {
      const isFinanced = contract.negotiation_agreement?.toLowerCase().includes("financiado");
      colorClass = isFinanced 
        ? "bg-violet-500/10 text-violet-400 border-violet-500/20" 
        : "bg-blue-500/10 text-blue-400 border-blue-500/20";
    } else if (contract.modality === "compra") {
      colorClass = "bg-pink-500/10 text-pink-400 border-pink-500/20";
    } else if (contract.modality === "consignado") {
      colorClass = "bg-teal-500/10 text-teal-400 border-teal-500/20";
    }
    
    return (
      <Badge variant="outline" className={`${colorClass} border font-semibold text-[10px] uppercase tracking-wider`}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar cliente, veículo, CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/60"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-card/60 border-border/40 text-foreground">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 text-foreground border-border/40">
              <SelectItem value="todos">Todos Status</SelectItem>
              {Object.entries(CONTRACT_STATUS_DETAILS).map(([statusKey, val]) => (
                <SelectItem key={statusKey} value={statusKey}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Link href="/contracts/new">
          <Button className="gap-2 font-semibold">
            <Plus size={16} />
            Novo Contrato
          </Button>
        </Link>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="font-semibold w-[90px]">Contrato</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Veículo</TableHead>
                <TableHead className="font-semibold">Operação</TableHead>
                <TableHead className="font-semibold">Valor Total</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <span className="text-sm text-muted-foreground mt-2 block">
                      Buscando contratos de venda...
                    </span>
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Nenhum contrato cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} className="border-border/40 hover:bg-secondary/20">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      #{contract.contract_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">{contract.client?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {contract.client ? formatCPF(contract.client.cpf) : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {contract.vehicle?.brand} {contract.vehicle?.model}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {contract.vehicle?.plate} • {contract.vehicle?.year}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getModalityBadge(contract)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          {formatCurrency(contract.total_value)}
                        </p>
                        {contract.down_payment > 0 && (
                          <p className="text-[10px] text-emerald-400">
                            Sinal: {formatCurrency(contract.down_payment)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1 font-mono">
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-sans tracking-wide">
                            {contract.modality === "compra" ? "Compra" : contract.modality === "consignado" ? "Consignação" : "Venda"}
                          </span>
                          <span className="text-foreground">
                            {contract.modality === "compra"
                              ? (contract.purchase_date ? formatDate(contract.purchase_date) : formatDate(contract.created_at))
                              : contract.modality === "consignado"
                              ? formatDate(contract.created_at)
                              : (contract.sale_date ? formatDate(contract.sale_date) : formatDate(contract.created_at))}
                          </span>
                        </div>
                        {contract.down_payment_date && (
                          <div className="text-[10px] text-emerald-400 font-semibold">
                            Entrada: {formatDate(contract.down_payment_date)}
                          </div>
                        )}
                        {contract.completion_date && (
                          <div className="text-[10px] text-blue-400 font-semibold">
                            Conclusão: {formatDate(contract.completion_date)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* Copy digital signature link */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleCopyLink(contract.id)}
                          title="Copiar Link de Assinatura"
                        >
                          {copiedId === contract.id ? (
                            <Check size={14} className="text-emerald-400 animate-pulse" />
                          ) : (
                            <Share2 size={14} />
                          )}
                        </Button>

                        <Link href={`/contracts/${contract.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-cyan-500/10 hover:text-cyan-400"
                            title="Visualizar Contrato"
                          >
                            <Eye size={14} />
                          </Button>
                        </Link>

                        {userRole === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeletePrompt(contract)}
                            title="Remover Contrato"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {contracts.length} de {totalCount} contratos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} /> Excluir Contrato de Venda
            </DialogTitle>
            <DialogDescription>
              Atenção! A exclusão do contrato removerá todas as parcelas financeiras vinculadas e
              redefinirá o status do veículo para <strong className="text-foreground">Disponível</strong>.
              Tem certeza que deseja excluir o Contrato #{selectedContract?.contract_number}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedContract) {
                  await deleteMutation.mutateAsync(selectedContract.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
