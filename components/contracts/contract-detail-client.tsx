"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";
import { Contract, Payment, Signature, UserProfile, PaymentMethod, ContractStatus } from "@/types";
import {
  getContractSignatures,
  generateContractPDF,
  generateContractDOCX,
  signContract,
  getContractChecklist,
  saveContractChecklist,
  getContractTimeline,
  getContractWarranty,
  getContractReview,
  updateContractReview,
  getContractTransfer,
  updateContractTransfer,
  getContractTransferLogs,
  generateDeliveryTermPDF,
} from "@/actions/contractActions";
import { getPayments, confirmPayment } from "@/actions/financeActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  User,
  Car,
  FileText,
  DollarSign,
  PenTool,
  Printer,
  ChevronLeft,
  Calendar,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Wrench,
  ShieldCheck,
  GitCommit,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatCPF } from "@/utils/validators";
import { formatCurrency, formatDate, formatDateTime, formatMileage } from "@/utils/formatters";
import { CONTRACT_STATUS_DETAILS, getModalityLabel } from "./contracts-client";

interface ContractDetailClientProps {
  contract: Contract;
  initialPayments: Payment[];
  initialSignatures: Signature[];
  userProfile: UserProfile;
  company?: {
    id: string;
    name: string;
    admin_signature?: string;
  } | null;
}

const mandatoryChecklistItems = [
  "Moto revisada", "Óleo trocado", "Farol baixo", "Farol alto", "Seta dianteira",
  "Seta traseira", "Luz de freio", "Lâmpada de placa", "Lâmpada painel", "Retrovisores",
  "Freio dianteiro", "Freio traseiro", "Transmissão", "Chaves", "Documentação",
  "Painel", "Pneu dianteiro", "Pneu traseiro", "Buzina", "Combustível", "Bateria"
];

export function ContractDetailClient({
  contract,
  initialPayments,
  initialSignatures,
  userProfile,
  company,
}: ContractDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("minuta");
  
  // Dialogs
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  
  // Downloads
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingTerm, setIsDownloadingTerm] = useState(false);

  // Signatures canvas references
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [signingRole, setSigningRole] = useState<"client_checklist" | "inspector_checklist" | "contract_seller">("contract_seller");

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<any[]>(
    mandatoryChecklistItems.map(name => ({ name, status: "CONFORME", notes: "" }))
  );
  const [buyerChecklistSig, setBuyerChecklistSig] = useState<string>("");
  const [inspectorChecklistSig, setInspectorChecklistSig] = useState<string>("");

  // Transfer Form state
  const [transferForm, setTransferForm] = useState({
    forwarded_to: "despachante",
    notes: "",
    status: contract.status,
    receipt_url: "",
  });

  // Revisions Modal state
  const [selectedRevision, setSelectedRevision] = useState<any | null>(null);
  const [revKmInput, setRevKmInput] = useState<number>(0);
  const [isRevModalOpen, setIsRevModalOpen] = useState(false);

  // Queries
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", contract.id],
    queryFn: () => getPayments(contract.id),
    initialData: initialPayments,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures", contract.id],
    queryFn: () => getContractSignatures(contract.id),
    initialData: initialSignatures,
  });

  const { data: checklist, refetch: refetchChecklist } = useQuery({
    queryKey: ["checklist", contract.id],
    queryFn: () => getContractChecklist(contract.id),
  });

  const { data: transferProcess, refetch: refetchTransfer } = useQuery({
    queryKey: ["transfer", contract.id],
    queryFn: () => getContractTransfer(contract.id),
  });

  const { data: transferLogs = [], refetch: refetchTransferLogs } = useQuery({
    queryKey: ["transferLogs", contract.id],
    queryFn: () => getContractTransferLogs(contract.id),
  });

  const { data: timeline = [], refetch: refetchTimeline } = useQuery({
    queryKey: ["timeline", contract.id],
    queryFn: () => getContractTimeline(contract.id),
  });

  const { data: warranty } = useQuery({
    queryKey: ["warranty", contract.id],
    queryFn: () => getContractWarranty(contract.id),
  });

  const { data: review, refetch: refetchReview } = useQuery({
    queryKey: ["review", contract.id],
    queryFn: () => getContractReview(contract.id),
  });

  const buyerSignature = signatures.find((s) => s.role === "comprador");
  const sellerSignature = signatures.find((s) => s.role === "vendedor");

  // Sync checklist state when loaded
  useEffect(() => {
    if (checklist) {
      if (checklist.items) setChecklistItems(checklist.items);
      if (checklist.buyer_signature) setBuyerChecklistSig(checklist.buyer_signature);
      if (checklist.inspector_signature) setInspectorChecklistSig(checklist.inspector_signature);
    }
  }, [checklist]);

  // Sync transfer form status when loaded
  useEffect(() => {
    if (transferProcess) {
      setTransferForm({
        forwarded_to: transferProcess.forwarded_to || "despachante",
        notes: transferProcess.notes || "",
        status: contract.status,
        receipt_url: transferProcess.receipt_url || "",
      });
    }
  }, [transferProcess, contract.status]);

  // Mutations
  const signMutation = useMutation({
    mutationFn: (params: Parameters<typeof signContract>[0]) => signContract(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures", contract.id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["timeline", contract.id] });
      setIsSignOpen(false);
      refetchTimeline();
      router.refresh();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ paymentId, method }: { paymentId: string; method: PaymentMethod }) =>
      confirmPayment(paymentId, { payment_method: method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", contract.id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["timeline", contract.id] });
      setIsConfirmPaymentOpen(false);
      setSelectedPayment(null);
      refetchTimeline();
      router.refresh();
    },
  });

  const saveChecklistMutation = useMutation({
    mutationFn: (payload: any) => saveContractChecklist(payload),
    onSuccess: () => {
      refetchChecklist();
      refetchTimeline();
      alert("Vistoria e checklist digital gravados com sucesso!");
    },
  });

  const updateTransferMutation = useMutation({
    mutationFn: (payload: any) => updateContractTransfer(contract.id, payload),
    onSuccess: () => {
      refetchTransfer();
      refetchTransferLogs();
      refetchTimeline();
      router.refresh();
      alert("Status de transferência operacional atualizado com sucesso!");
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: (payload: { reviewId: string; revisions: any[] }) =>
      updateContractReview(payload.reviewId, payload.revisions, contract.id),
    onSuccess: () => {
      refetchReview();
      refetchTimeline();
      setIsRevModalOpen(false);
      alert("Status da troca de óleo atualizado!");
    },
  });

  const handleCopyLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/contracts/${contract.id}/sign`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const base64 = await generateContractPDF(contract.id);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `contrato_${contract.contract_number}.pdf`;
      link.click();
    } catch (error) {
      console.error(error);
      alert("Falha ao exportar documento PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setIsDownloadingDocx(true);
    try {
      const base64 = await generateContractDOCX(contract.id);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `contrato_${contract.contract_number}.docx`;
      link.click();
    } catch (error) {
      console.error(error);
      alert("Falha ao exportar minuta Word.");
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const handleDownloadChecklistTerm = async () => {
    if (!checklist) {
      alert("Nenhum checklist registrado para gerar termo.");
      return;
    }
    setIsDownloadingTerm(true);
    try {
      const base64 = await generateDeliveryTermPDF(contract.id);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `termo_vistoria_entrega_${contract.contract_number}.pdf`;
      link.click();
    } catch (error) {
      console.error(error);
      alert("Falha ao exportar termo de vistoria.");
    } finally {
      setIsDownloadingTerm(false);
    }
  };

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSignSave = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      alert("Por favor, forneça a assinatura no quadro.");
      return;
    }

    const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");

    let ipAddress = "127.0.0.1";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      ipAddress = data.ip;
    } catch (e) {}

    if (signingRole === "contract_seller") {
      await signMutation.mutateAsync({
        contract_id: contract.id,
        signature_data: dataUrl,
        role: "vendedor",
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        location: "Console Administrativo ERP",
      });
    } else if (signingRole === "client_checklist") {
      setBuyerChecklistSig(dataUrl);
      setIsSignOpen(false);
    } else if (signingRole === "inspector_checklist") {
      setInspectorChecklistSig(dataUrl);
      setIsSignOpen(false);
    }
  };

  const handleUseSavedAdminSignature = async () => {
    if (!company?.admin_signature) return;

    let ipAddress = "127.0.0.1";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      ipAddress = data.ip;
    } catch (e) {}

    await signMutation.mutateAsync({
      contract_id: contract.id,
      signature_data: company.admin_signature,
      role: "vendedor",
      ip_address: ipAddress,
      user_agent: navigator.userAgent,
      location: "Assinatura Automática ADM",
    });
  };

  const handleSaveChecklist = () => {
    saveChecklistMutation.mutate({
      contract_id: contract.id,
      items: checklistItems,
      buyer_signature: buyerChecklistSig,
      inspector_signature: inspectorChecklistSig,
      inspector_id: userProfile.id,
      inspector_name: userProfile.name,
    });
  };

  const handleUpdateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    updateTransferMutation.mutate(transferForm);
  };

  const handleCompleteRevision = () => {
    if (!review) return;
    const updatedRevisions = review.revisions.map((r: any) => {
      if (r.number === selectedRevision.number) {
        return {
          ...r,
          km_actual: Number(revKmInput),
          completed_date: new Date().toISOString().split("T")[0],
          status: "concluida" as const,
        };
      }
      return r;
    });

    updateReviewMutation.mutate({
      reviewId: review.id,
      revisions: updatedRevisions,
    });
  };

  const getStatusBadge = () => {
    const details = CONTRACT_STATUS_DETAILS[contract.status];
    if (!details) return null;
    return (
      <Badge className={`${details.bg} ${details.text} ${details.border} border font-bold text-xs px-3 py-0.5`}>
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
      <Badge variant="outline" className={`${colorClass} border font-semibold text-[10px] uppercase tracking-wider px-2.5 py-0.5`}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/contracts">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronLeft size={20} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Contrato #{contract.contract_number}
              </h2>
              {getStatusBadge()}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground font-semibold">Operação:</span>
              {getModalityBadge(contract)}
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs text-muted-foreground font-mono">
                Emitido em {formatDate(contract.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 text-xs h-9 bg-card/60"
            onClick={handleCopyLink}
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copied ? "Copiado" : "Link Comprador"}
          </Button>

          <Button
            variant="outline"
            className="gap-2 text-xs h-9 bg-card/60"
            onClick={handleDownloadDOCX}
            disabled={isDownloadingDocx}
          >
            {isDownloadingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Baixar DOCX
          </Button>

          <Button
            variant="outline"
            className="gap-2 text-xs h-9 bg-card/60"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            Exportar PDF
          </Button>

          {!sellerSignature && (userProfile.role === "admin" || userProfile.role === "vendedor") && (
            <Button
              onClick={() => {
                setSigningRole("contract_seller");
                setIsSignOpen(true);
              }}
              className="gap-2 text-xs h-9 font-semibold"
            >
              <PenTool size={14} /> Assinar Contrato
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-card/40 border border-border/40 p-1 mb-6 rounded-lg">
          <TabsTrigger value="minuta" className="text-xs py-2.5">Minuta Contratual</TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs py-2.5">Checklist Digital</TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs py-2.5">Transferência</TabsTrigger>
          <TabsTrigger value="pos_venda" className="text-xs py-2.5">Garantia & Troca de Óleo</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs py-2.5">Timeline Operacional</TabsTrigger>
        </TabsList>

        {/* TAB 1: Minuta e Detalhes Tradicionais */}
        <TabsContent value="minuta" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card border-white/5">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <User size={16} /> {contract.modality === "compra" ? "Vendedor (Cliente)" : contract.modality === "consignado" ? "Consignante (Cliente)" : "Comprador (Cliente)"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-xs space-y-2 leading-relaxed text-muted-foreground">
                    <p className="text-sm font-bold text-foreground">{contract.client?.name}</p>
                    <p>CPF: <span className="font-mono text-foreground">{contract.client ? formatCPF(contract.client.cpf) : ""}</span></p>
                    {contract.client?.rg && <p>RG: <span className="text-foreground">{contract.client.rg}</span></p>}
                    {contract.client?.cnh && <p>CNH: <span className="text-foreground">{contract.client.cnh}</span></p>}
                    {contract.client?.email && <p>E-mail: <span className="text-foreground">{contract.client.email}</span></p>}
                    {contract.client?.phone && <p>Telefone: <span className="text-foreground">{contract.client.phone}</span></p>}
                    {contract.client?.whatsapp && <p>WhatsApp: <span className="text-foreground">{contract.client.whatsapp}</span></p>}
                    {contract.client?.address && (
                      <p className="border-t border-border/20 pt-2 mt-2">
                        Endereço: <span className="text-foreground">{contract.client.address}, {contract.client.neighborhood}, {contract.client.city}/{contract.client.state}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass-card border-white/5">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Car size={16} /> {contract.modality === "compra" ? "Veículo Adquirido" : contract.modality === "consignado" ? "Veículo em Consignação" : "Veículo Vendido"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 text-xs space-y-2 leading-relaxed text-muted-foreground">
                    <p className="text-sm font-bold text-foreground">
                      {contract.vehicle?.brand} {contract.vehicle?.model}
                    </p>
                    <p>Ano: <span className="text-foreground">{contract.vehicle?.year}</span></p>
                    <p>Placa: <span className="font-mono text-foreground font-semibold">{contract.vehicle?.plate}</span></p>
                    <p>Cor: <span className="text-foreground capitalize">{contract.vehicle?.color}</span></p>
                    <p>Quilometragem: <span className="text-foreground">{contract.vehicle ? formatMileage(contract.vehicle.mileage) : ""}</span></p>
                    <p>Renavam: <span className="font-mono text-foreground">{contract.vehicle?.renavam}</span></p>
                    <p>Chassi: <span className="font-mono text-foreground">{contract.vehicle?.chassis}</span></p>
                    <p className="border-t border-border/20 pt-2 mt-2 font-bold text-foreground">
                      {contract.modality === "consignado" ? "Valor Estimado de Venda" : "Valor Negociado"}: {formatCurrency(contract.total_value)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Condições comerciais */}
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <DollarSign size={16} /> Condições Comerciais & Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-xs">
                  {contract.modality === "consignado" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-border/30">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Valor Estimado de Venda</span>
                        <span className="text-base font-extrabold text-foreground">{formatCurrency(contract.total_value)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Valor Líquido Consignante</span>
                        <span className="text-base font-extrabold text-emerald-400">{formatCurrency(contract.consignation_owner_value || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Comissão Estimada (Excedente)</span>
                        <span className="text-base font-bold text-foreground">
                          {formatCurrency(Math.max(0, contract.total_value - (contract.consignation_owner_value || 0)))}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Prazo de Vigência</span>
                        <span className="text-base font-bold text-foreground">{contract.consignation_period_days || 0} dias</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-border/30">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">{contract.modality === "compra" ? "Valor da Compra" : "Valor Total da Venda"}</span>
                        <span className="text-base font-extrabold text-foreground">{formatCurrency(contract.total_value)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Sinal / Entrada</span>
                        <span className="text-base font-extrabold text-emerald-400">{formatCurrency(contract.down_payment)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Parcelas Amortizadas</span>
                        <span className="text-base font-bold text-foreground">{contract.installments_count}x</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Taxa de Juros</span>
                        <span className="text-base font-bold text-foreground">{contract.interest_rate}% am</span>
                      </div>
                    </div>
                  )}

                  {contract.former_owner_name && (
                    <div className="py-3 border-b border-border/20">
                      <p className="text-muted-foreground">
                        Proprietário Anterior (Histórico): <span className="font-semibold text-foreground">{contract.former_owner_name}</span> {contract.former_owner_cpf && `(CPF: ${formatCPF(contract.former_owner_cpf)})`}
                      </p>
                    </div>
                  )}

                  {(contract.payment_method || contract.has_remaining_balance || contract.negotiation_agreement) && (
                    <div className="py-3 border-b border-border/20 space-y-2">
                      {contract.payment_method && (
                        <p className="text-muted-foreground">
                          Forma de Pagamento Principal:{" "}
                          <span className="font-semibold text-foreground">
                            {contract.payment_method === "pix" && "PIX"}
                            {contract.payment_method === "especie" && "Espécie (Dinheiro)"}
                            {contract.payment_method === "cartao_parcelado" && "Cartão Parcelado"}
                            {contract.payment_method === "cartao_debit" && "Cartão de Débito"}
                            {contract.payment_method === "multiplo" && "Múltiplas Formas"}
                          </span>
                        </p>
                      )}
                      {(contract.has_remaining_balance || contract.negotiation_agreement) && (
                        <div className="space-y-1 bg-primary/5 border border-primary/20 p-3 rounded-lg">
                          <p className="text-primary font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                            📝 Acordo de Negociação / Pagamento
                          </p>
                          <p className="text-muted-foreground leading-relaxed">
                            {contract.negotiation_agreement || "Não detalhado na proposta."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {contract.warranty_text && (
                    <div className="pt-4">
                      <h4 className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1">
                        <FileText size={12} className="text-primary" /> Cláusula de Garantia Concedida
                      </h4>
                      <p className="text-muted-foreground leading-relaxed italic bg-black/25 p-3 rounded-lg border border-border/40">
                        {contract.warranty_text}
                      </p>
                    </div>
                  )}

                  {contract.custom_clauses && contract.custom_clauses.length > 0 && (
                    <div className="pt-4 border-t border-border/20 mt-4 space-y-2">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-primary" /> Cláusulas Específicas
                      </h4>
                      <ol className="space-y-1.5 pl-4 list-decimal text-muted-foreground">
                        {contract.custom_clauses.map((clause, idx) => (
                          <li key={idx} className="leading-relaxed">{clause}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Parcelas */}
              {contract.modality !== "consignado" && (
                <Card className="glass-card border-white/5">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Calendar size={16} /> Cronograma Financeiro de Recebimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40">
                          <TableHead className="font-semibold text-xs">Parcela</TableHead>
                          <TableHead className="font-semibold text-xs">Vencimento</TableHead>
                          <TableHead className="font-semibold text-xs">Valor</TableHead>
                          <TableHead className="font-semibold text-xs">Pagamento</TableHead>
                          <TableHead className="font-semibold text-xs">Método</TableHead>
                          <TableHead className="font-semibold text-xs">Status</TableHead>
                          <TableHead className="font-semibold text-xs text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p) => (
                          <TableRow key={p.id} className="border-border/40 hover:bg-secondary/10">
                            <TableCell className="font-bold text-xs">
                               {p.is_refund ? (
                                 <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px]">VOLTA (TROCO)</Badge>
                               ) : p.installment_number === 0 ? (
                                 <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">SINAL</Badge>
                               ) : (
                                 `Parcela #${p.installment_number}`
                               )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(p.due_date)}</TableCell>
                            <TableCell className="font-semibold text-foreground">{formatCurrency(p.amount)}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : "-"}</TableCell>
                            <TableCell className="capitalize text-muted-foreground text-xs">{p.payment_method ? p.payment_method.replace("_", " ") : "-"}</TableCell>
                            <TableCell>
                              {p.status === "PAGO" ? (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">Pago</Badge>
                              ) : p.status === "ATRASADO" ? (
                                <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-[10px]">Atrasado</Badge>
                              ) : (
                                <Badge className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 text-[10px]">Pendente</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {p.status !== "PAGO" && (userProfile.role === "financeiro" || userProfile.role === "admin") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold px-2 py-0 hover:bg-emerald-500/10 hover:text-emerald-400"
                                  onClick={() => {
                                    setSelectedPayment(p);
                                    setIsConfirmPaymentOpen(true);
                                  }}
                                >
                                  Dar Baixa
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Assinaturas */}
            <div className="space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <PenTool size={16} /> Status das Assinaturas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6 text-xs text-muted-foreground">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2">
                      <span className="font-bold text-foreground">
                        {contract.modality === "compra" ? "Assinatura Comprador (Loja)" : contract.modality === "consignado" ? "Assinatura Consignante (Cliente)" : "Assinatura Comprador (Cliente)"}
                      </span>
                      {buyerSignature ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Concluída</Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">Pendente</Badge>
                      )}
                    </div>
                    {buyerSignature ? (
                      <div className="space-y-2">
                        <div className="aspect-video w-full rounded bg-white p-2 border border-border/30 overflow-hidden flex items-center justify-center">
                          <img src={buyerSignature.signature_data} alt="Assinatura Comprador" className="object-contain max-h-full" />
                        </div>
                        <div className="space-y-1 text-[10px] font-mono leading-tight">
                          <p>IP: <span className="text-foreground">{buyerSignature.ip_address}</span></p>
                          <p>Data: <span className="text-foreground">{formatDateTime(buyerSignature.signed_at)}</span></p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-secondary/10 border border-dashed border-border/40 rounded flex flex-col items-center justify-center text-center gap-2">
                        <Clock size={20} className="text-amber-400/60" />
                        <p className="text-[10px] leading-relaxed">
                          {contract.modality === "compra" 
                            ? "Aguardando colheita digital no link móvel do vendedor (cliente)."
                            : contract.modality === "consignado"
                            ? "Aguardando colheita digital no link móvel do consignante (cliente)."
                            : "Aguardando colheita digital no link móvel do comprador."}
                        </p>
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleCopyLink}>Copiar Link</Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2">
                      <span className="font-bold text-foreground">
                        {contract.modality === "compra" ? "Assinatura Vendedor (Cliente)" : contract.modality === "consignado" ? "Assinatura Consignatário (Loja)" : "Assinatura Vendedor (Loja)"}
                      </span>
                      {sellerSignature ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Concluída</Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">Pendente</Badge>
                      )}
                    </div>
                    {sellerSignature ? (
                      <div className="space-y-2">
                        <div className="aspect-video w-full rounded bg-white p-2 border border-border/30 overflow-hidden flex items-center justify-center">
                          <img src={sellerSignature.signature_data} alt="Assinatura Vendedor" className="object-contain max-h-full" />
                        </div>
                        <div className="space-y-1 text-[10px] font-mono leading-tight">
                          <p>IP: <span className="text-foreground">{sellerSignature.ip_address}</span></p>
                          <p>Data: <span className="text-foreground">{formatDateTime(sellerSignature.signed_at)}</span></p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-secondary/10 border border-dashed border-border/40 rounded flex flex-col items-center justify-center text-center gap-2">
                        <Lock size={20} className="text-muted-foreground/60" />
                        <p className="text-[10px] leading-relaxed">
                          {contract.modality === "consignado"
                            ? "A assinatura digital do representante legal da concessionária (consignatário) deve ser inserida."
                            : "A assinatura digital do representante legal da concessionária deve ser inserida."}
                        </p>
                        {(userProfile.role === "admin" || userProfile.role === "vendedor") && (
                          <Button size="sm" className="h-7 text-[10px]" onClick={() => {
                            setSigningRole("contract_seller");
                            setIsSignOpen(true);
                          }}>Assinar Agora</Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card de Datas de Controle */}
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Calendar size={16} /> Datas de Controle
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  {/* Data da Venda ou Compra */}
                  <div className="flex justify-between items-center py-1.5 border-b border-border/10">
                    <span className="text-muted-foreground">
                      {contract.modality === "compra" 
                        ? "Data da Compra" 
                        : contract.modality === "consignado" 
                        ? "Data da Consignação" 
                        : "Data da Venda"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {contract.modality === "compra" 
                        ? (contract.purchase_date ? formatDate(contract.purchase_date) : "-")
                        : contract.modality === "consignado"
                        ? formatDate(contract.created_at)
                        : (contract.sale_date ? formatDate(contract.sale_date) : "-")}
                    </span>
                  </div>

                  {/* Data da Entrada */}
                  <div className="flex justify-between items-center py-1.5 border-b border-border/10">
                    <span className="text-muted-foreground">Data da Entrada</span>
                    <span className="font-semibold text-foreground text-emerald-400">
                      {contract.down_payment_date ? formatDate(contract.down_payment_date) : "Pendente"}
                    </span>
                  </div>

                  {/* Data de Finalização */}
                  <div className="flex justify-between items-center py-1.5 border-b border-border/10">
                    <span className="text-muted-foreground">Data de Finalização</span>
                    <span className="font-semibold text-foreground">
                      {contract.completion_date ? formatDate(contract.completion_date) : "Em andamento"}
                    </span>
                  </div>

                  {/* Histórico de Atualizações */}
                  {contract.status_dates && Object.keys(contract.status_dates).length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-2">Histórico de Status</span>
                      <div className="relative border-l border-border/40 pl-3.5 ml-1 space-y-3.5">
                        {Object.entries(contract.status_dates)
                          .sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
                          .map(([statusKey, timestamp]) => {
                            const statusDetail = CONTRACT_STATUS_DETAILS[statusKey as ContractStatus] || {
                              label: statusKey,
                              bg: "bg-zinc-500/10",
                              text: "text-zinc-400",
                              border: "border-zinc-500/20"
                            };
                            return (
                              <div key={statusKey} className="relative text-[11px]">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[19.5px] top-1 w-2 h-2 rounded-full bg-primary border border-background" />
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center justify-between font-sans">
                                    <span className={`font-semibold ${statusDetail.text}`}>
                                      {statusDetail.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {formatDateTime(timestamp)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Checklist Digital e Termo de Entrega */}
        <TabsContent value="checklist" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Wrench size={16} /> Itens Vistoriados na Entrega
                    </CardTitle>
                    <CardDescription>Configure o checklist do veículo de forma digital.</CardDescription>
                  </div>
                  {checklist && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadChecklistTerm}
                      disabled={isDownloadingTerm}
                      className="gap-1 text-xs h-8"
                    >
                      {isDownloadingTerm ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
                      Termo de Entrega (PDF)
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="font-semibold text-xs">Item Vistoriado</TableHead>
                        <TableHead className="font-semibold text-xs">Status da Vistoria</TableHead>
                        <TableHead className="font-semibold text-xs">Observações do Item</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checklistItems.map((item, idx) => (
                        <TableRow key={item.name} className="border-border/40 hover:bg-secondary/5">
                          <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {["CONFORME", "NAO_CONFORME", "AVARIADO"].map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...checklistItems];
                                    updated[idx].status = status;
                                    setChecklistItems(updated);
                                  }}
                                  className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                                    item.status === status
                                      ? status === "CONFORME"
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                        : status === "NAO_CONFORME"
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                        : "bg-red-500/20 text-red-400 border-red-500/40"
                                      : "bg-black/10 border-border/20 text-muted-foreground hover:bg-secondary/40"
                                  }`}
                                >
                                  {status === "CONFORME" ? "Conforme" : status === "NAO_CONFORME" ? "Ñ Conf" : "Avariado"}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Observação específica..."
                              value={item.notes || ""}
                              onChange={(e) => {
                                const updated = [...checklistItems];
                                updated[idx].notes = e.target.value;
                                setChecklistItems(updated);
                              }}
                              className="h-7 text-[10px] bg-black/25 text-foreground max-w-[200px]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="p-6 border-t border-border/40 bg-secondary/5 flex justify-end">
                    <Button onClick={handleSaveChecklist} disabled={saveChecklistMutation.isPending} className="font-semibold gap-1 text-xs">
                      {saveChecklistMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                      Salvar Checklist Digital
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Checklist Signatures (1 col) */}
            <div className="space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <PenTool size={16} /> Assinatura do Laudo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6 text-xs text-muted-foreground">
                  <div className="space-y-3">
                    <Label className="font-bold text-foreground">1. Assinatura do Cliente Comprador</Label>
                    {buyerChecklistSig ? (
                      <div className="space-y-2">
                        <div className="aspect-video w-full rounded bg-white p-2 border border-border/30 overflow-hidden flex items-center justify-center">
                          <img src={buyerChecklistSig} alt="Assinatura Comprador Checklist" className="object-contain max-h-full" />
                        </div>
                        <Button variant="outline" size="sm" className="h-6 w-full text-[10px]" onClick={() => setBuyerChecklistSig("")}>
                          Refazer Assinatura
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-9 gap-1.5"
                        onClick={() => {
                          setSigningRole("client_checklist");
                          setIsSignOpen(true);
                        }}
                      >
                        <PenTool size={12} /> Colher Assinatura Cliente
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Label className="font-bold text-foreground">2. Assinatura do Responsável Vistoriador</Label>
                    {inspectorChecklistSig ? (
                      <div className="space-y-2">
                        <div className="aspect-video w-full rounded bg-white p-2 border border-border/30 overflow-hidden flex items-center justify-center">
                          <img src={inspectorChecklistSig} alt="Assinatura Vistoriador" className="object-contain max-h-full" />
                        </div>
                        <Button variant="outline" size="sm" className="h-6 w-full text-[10px]" onClick={() => setInspectorChecklistSig("")}>
                          Refazer Assinatura
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-9 gap-1.5"
                        onClick={() => {
                          setSigningRole("inspector_checklist");
                          setIsSignOpen(true);
                        }}
                      >
                        <PenTool size={12} /> Assinar como Vistoriador
                      </Button>
                    )}
                  </div>

                  {checklist && (
                    <div className="border-t border-border/20 pt-4 text-[10px] text-muted-foreground/80 space-y-1">
                      <p>Vistoriado por: <span className="font-semibold text-foreground">{checklist.inspector_name || "N/A"}</span></p>
                      <p>Data de Entrega: <span className="font-semibold text-foreground">{formatDate(checklist.created_at)}</span></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Processo de Transferência Operacional */}
        <TabsContent value="transfer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Clock size={16} /> Acompanhamento de Transferência
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleUpdateTransfer} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Encaminhado para</Label>
                        <Select
                          value={transferForm.forwarded_to}
                          onValueChange={(val) => setTransferForm({ ...transferForm, forwarded_to: val })}
                        >
                          <SelectTrigger className="bg-black/30 border-border/40 h-10">
                            <SelectValue placeholder="Selecione o Destino" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 text-foreground border border-border/40 text-xs">
                            <SelectItem value="ex_proprietario">Ex-Proprietário</SelectItem>
                            <SelectItem value="despachante">Despachante Credenciado</SelectItem>
                            <SelectItem value="corretor">Corretor de Seguros</SelectItem>
                            <SelectItem value="comprador">Comprador Final</SelectItem>
                            <SelectItem value="financeira">Financeira / Banco</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Status Operacional do Processo</Label>
                        <Select
                          value={transferForm.status}
                          onValueChange={(val) => setTransferForm({ ...transferForm, status: val as ContractStatus })}
                        >
                          <SelectTrigger className="bg-black/30 border-border/40 h-10 font-semibold">
                            <SelectValue placeholder="Selecione o Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 text-foreground border border-border/40 text-xs">
                            <SelectItem value="AGUARDANDO_VENDEDOR_DAR_ENTRADA">Aguardando vendedor dar entrada</SelectItem>
                            <SelectItem value="AGUARDANDO_ENTRADA">Aguardando Entrada</SelectItem>
                            <SelectItem value="DADOS_ENVIADOS_PROPRIETARIO">Dados enviado ao proprietário, aguardando</SelectItem>
                            <SelectItem value="DUT_AGUARDANDO_RECONHECER_VENDEDOR">DUT - Aguardando Reconhecer Vendedor</SelectItem>
                            <SelectItem value="DUT_AGUARDANDO_RECONHECER_COMPRADOR">DUT - Aguardando Reconhecer Comprador</SelectItem>
                            <SelectItem value="DUT_AGUARDANDO_VISTORIA">DUT - Aguardando Vistoria</SelectItem>
                            <SelectItem value="DUT_AGUARDANDO_FINALIZAR_TAXAS_DETRAN">DUT - Aguardando Finalizar Taxas Detran</SelectItem>
                            <SelectItem value="AGUARDANDO_ATPVE_GERAR">Aguardando ATPVE Gerar</SelectItem>
                            <SelectItem value="AGUARDANDO_ATPVE_RECONHECER_COMPRADOR">Aguardando ATPVE Reconhecer Comprador</SelectItem>
                            <SelectItem value="AGUARDANDO_COMPRADOR_FINALIZAR">Aguardando comprador finalizar</SelectItem>
                            <SelectItem value="AGUARDANDO_DESPACHANTE">Aguardando despachante</SelectItem>
                            <SelectItem value="DOCUMENTAÇÃO_PENDENTE">Documentação pendente</SelectItem>
                            <SelectItem value="FALTA_PAGAMENTO_DE_ENTRADA">Falta pagamento de entrada</SelectItem>
                            <SelectItem value="EM_PROCESSO_DE_TRANSFERENCIA">Em transferência</SelectItem>
                            <SelectItem value="TRANSFERÊNCIA_CONCLUÍDA">Transferência concluída</SelectItem>
                            <SelectItem value="TRANSFERÊNCIA_CANCELADA">Transferência cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <Label>URL do Comprovante ou Recibo Eletrônico (Opcional)</Label>
                        <Input
                          type="text"
                          placeholder="https://exemplo.com/recibo.pdf"
                          value={transferForm.receipt_url}
                          onChange={(e) => setTransferForm({ ...transferForm, receipt_url: e.target.value })}
                          className="bg-black/30 text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Notas e Instruções do Processo de Transferência</Label>
                        <Textarea
                          rows={3}
                          placeholder="Digite aqui anotações operacionais, taxas pagas, despachante responsável, pendências no DETRAN..."
                          value={transferForm.notes}
                          onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                          className="bg-black/30 text-xs leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={updateTransferMutation.isPending} className="font-semibold text-xs gap-1">
                        {updateTransferMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                        Atualizar Operação de Transferência
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Histórico da transferência */}
            <div className="space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Clock size={16} /> Histórico de Alterações
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[350px] overflow-y-auto">
                  {transferLogs.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground/50 py-8">Nenhuma alteração registrada ainda.</div>
                  ) : (
                    <div className="space-y-4">
                      {transferLogs.map((log: any) => (
                        <div key={log.id} className="text-xs border-b border-border/20 last:border-b-0 pb-3 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{formatDateTime(log.created_at)}</span>
                          </div>
                          <p className="font-bold text-foreground">
                            {log.previous_status ? `${log.previous_status} -> ` : ""}{log.new_status}
                          </p>
                          {log.notes && <p className="text-muted-foreground font-sans text-[11px] leading-snug italic">&quot;{log.notes}&quot;</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Pós-Venda (Garantia & Revisões) */}
        <TabsContent value="pos_venda" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Garantia ativa/vencida */}
            <Card className="glass-card border-white/5 flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <ShieldCheck size={16} /> Acompanhamento de Garantia
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs space-y-4 flex-grow">
                {warranty ? (
                  <div className="space-y-3 leading-relaxed text-muted-foreground">
                    <div className="flex items-center justify-between pb-2 border-b border-border/20">
                      <span className="font-bold text-foreground">Status da Garantia:</span>
                      {warranty.status === "ativa" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold">ATIVA</Badge>
                      ) : warranty.status === "proxima_vencimento" ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-extrabold">PRÓXIMA DO VENCIMENTO</Badge>
                      ) : (
                        <Badge className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 font-extrabold">VENCIDA</Badge>
                      )}
                    </div>
                    <p>Tipo de Cobertura: <span className="text-foreground capitalize font-semibold">{warranty.type.replace("_", " e ")}</span></p>
                    <p>Prazo da Garantia: <span className="text-foreground font-semibold">{warranty.period_days} dias</span></p>
                    <div className="grid grid-cols-2 gap-4 bg-black/25 p-3 rounded-lg border border-border/40 text-center font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Data Início:</span>
                        <span className="text-foreground font-bold">{formatDate(warranty.start_date)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Data Fim:</span>
                        <span className="text-foreground font-bold">{formatDate(warranty.end_date)}</span>
                      </div>
                    </div>
                    {warranty.status === "ativa" && (
                      <p className="text-[10px] text-muted-foreground/60 italic mt-2 text-center">
                        * A garantia legal cobrirá motor e caixa de câmbio contra defeitos pré-existentes até a data final informada.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground/50 py-12">Nenhuma garantia registrada no contrato.</div>
                )}
              </CardContent>
            </Card>

            {/* Controle de Trocas de Óleo */}
            <Card className="glass-card border-white/5 flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Wrench size={16} /> Controle de Trocas de Óleo (Lembretes)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs flex-grow">
                {review ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/20 text-muted-foreground">
                      <span className="font-semibold text-foreground">KM de Entrega:</span>
                      <span className="font-mono text-sm font-bold text-primary">{formatMileage(review.km_delivery)} km</span>
                    </div>

                    <div className="space-y-3">
                      {review.revisions.map((rev: any) => (
                        <div key={rev.number} className="flex items-center justify-between bg-black/25 p-3 rounded-lg border border-border/40 hover:bg-black/35 transition-colors">
                          <div className="space-y-0.5">
                            <h5 className="font-bold text-foreground text-xs">Troca de Óleo #{rev.number}</h5>
                            <p className="text-muted-foreground text-[10px] font-mono">Esperado com: {formatMileage(rev.km_expected)} km</p>
                            {rev.km_actual && <p className="text-emerald-400 text-[10px] font-mono">Realizado com: {formatMileage(rev.km_actual)} km</p>}
                            {rev.completed_date && <p className="text-muted-foreground text-[9px]">Data: {formatDate(rev.completed_date)}</p>}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {rev.status === "concluida" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[9px] gap-1 px-2.5 h-6">
                                <Check size={10} /> Concluída
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-semibold border-primary/40 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedRevision(rev);
                                  setRevKmInput(rev.km_expected);
                                  setIsRevModalOpen(true);
                                }}
                              >
                                Dar Baixa
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground/50 py-12">Nenhum controle de troca de óleo iniciado.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: Timeline Operacional */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <GitCommit size={16} /> Linha do Tempo Operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground/50 py-12">Nenhum registro operacional na timeline.</div>
              ) : (
                <div className="relative pl-6 border-l-2 border-border/30 space-y-6 ml-4">
                  {timeline.map((event: any) => (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 border-2 border-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            <Sparkles size={12} className="text-primary" />
                            {event.event_type.replace("_", " ")}
                          </h5>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatDateTime(event.created_at)}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {event.description}
                        </p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground/50 font-mono">
                          <span>Usuário: {event.user_name || "Comprador (IP)"}</span>
                          <span>•</span>
                          <span>IP: {event.ip_address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Signature Canvas Dialog for checklist / contract */}
      <Dialog open={isSignOpen} onOpenChange={setIsSignOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PenTool className="text-primary" />
              {signingRole === "contract_seller" && "Assinar Contrato de Venda"}
              {signingRole === "client_checklist" && "Assinatura do Cliente Comprador"}
              {signingRole === "inspector_checklist" && "Assinatura do Vistoriador Responsável"}
            </DialogTitle>
            <DialogDescription>
              {signingRole === "contract_seller"
                ? "Desenhe sua assinatura para consolidar o contrato de venda."
                : "Desenhe a assinatura na tela para vincular ao laudo de vistoria."}
            </DialogDescription>
          </DialogHeader>

          {signingRole === "contract_seller" && company?.admin_signature && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex flex-col gap-2">
              <span className="text-xs font-bold text-foreground">Assinatura Padrão do Administrador Cadastrada</span>
              <div className="aspect-video w-full rounded bg-white p-2 border border-border/30 overflow-hidden flex items-center justify-center">
                <img src={company.admin_signature} alt="Assinatura Cadastrada" className="object-contain max-h-full" />
              </div>
              <Button
                type="button"
                onClick={handleUseSavedAdminSignature}
                disabled={signMutation.isPending}
                className="w-full text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 size={14} /> Usar Assinatura Cadastrada (Assinar Auto)
              </Button>
            </div>
          )}

          <div className="my-4 border border-border/40 rounded bg-white">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                width: 380,
                height: 180,
                className: "signature-pad w-full rounded",
              }}
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button type="button" variant="ghost" onClick={handleClearSignature} size="sm">
              Limpar Quadro
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsSignOpen(false)} size="sm">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSignSave}
                disabled={signMutation.isPending}
                size="sm"
                className="font-semibold"
              >
                Confirmar Assinatura
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revisions Completion Dialog */}
      <Dialog open={isRevModalOpen} onOpenChange={setIsRevModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Wrench className="text-primary" /> Concluir Troca de Óleo Recomendada #{selectedRevision?.number}
            </DialogTitle>
            <DialogDescription>
              Insira a quilometragem observada no painel do veículo ao dar entrada na oficina.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-1.5 text-xs">
              <Label>Quilometragem (KM) na Entrada *</Label>
              <Input
                type="number"
                value={revKmInput}
                onChange={(e) => setRevKmInput(Number(e.target.value))}
                className="bg-black/30 h-10 text-sm font-mono font-bold"
              />
              <p className="text-[10px] text-muted-foreground/60 italic">
                * KM esperado: {selectedRevision ? formatMileage(selectedRevision.km_expected) : 0} km.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsRevModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-foreground font-semibold size-sm"
              onClick={handleCompleteRevision}
              disabled={updateReviewMutation.isPending}
            >
              {updateReviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Troca de Óleo Feita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isConfirmPaymentOpen} onOpenChange={setIsConfirmPaymentOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="text-primary" /> {selectedPayment?.is_refund ? "Confirmar Devolução de Valor (Volta)" : "Confirmar Recebimento de Valor"}
            </DialogTitle>
            <DialogDescription>
              {selectedPayment?.is_refund ? (
                <>
                  Confirme a devolução da <strong>Volta/Troco</strong> no valor de <strong className="text-foreground">{selectedPayment ? formatCurrency(selectedPayment.amount) : ""}</strong> ao cliente.
                </>
              ) : (
                <>
                  Confirme a liquidação da{" "}
                  {selectedPayment?.installment_number === 0 ? "Entrada/Sinal" : `Parcela #${selectedPayment?.installment_number}`}{" "}
                  no valor de <strong className="text-foreground">{selectedPayment ? formatCurrency(selectedPayment.amount) : ""}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-1.5 text-xs">
              <Label htmlFor="payment_method">Método de Liquidação</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger className="bg-black/30 border border-border/40 text-foreground h-10">
                  <SelectValue placeholder="Selecione o Método" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 text-foreground border border-border/40 text-xs">
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  <SelectItem value="transferencia_bancaria">TED / DOC</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button
              className={`${selectedPayment?.is_refund ? "bg-blue-500 hover:bg-blue-600" : "bg-emerald-500 hover:bg-emerald-600"} text-white font-semibold size-sm`}
              onClick={async () => {
                if (selectedPayment) {
                  await paymentMutation.mutateAsync({
                    paymentId: selectedPayment.id,
                    method: paymentMethod,
                  });
                }
              }}
              disabled={paymentMutation.isPending}
            >
              {paymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedPayment?.is_refund ? "Confirmar Volta Paga" : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
