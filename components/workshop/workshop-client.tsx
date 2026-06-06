"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkshopMaintenances,
  saveWorkshopMaintenance,
  updateWorkshopMaintenanceStatus,
  deleteWorkshopMaintenance,
  getWorkshopAppointments,
  saveWorkshopAppointment,
  deleteWorkshopAppointment,
  getWorkshopProducts,
} from "@/actions/workshopActions";
import {
  WorkshopMaintenance,
  WorkshopAppointment,
  WorkshopProduct,
  WorkshopMaintenanceStatus
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wrench,
  Calendar,
  Plus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  AlertTriangle,
  FileText,
  User,
  Clock,
  Printer,
  ChevronRight,
  Phone,
  Layers,
  Check,
  Bike,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";

// Status configuration for OS
const OS_STATUS_DETAILS: Record<
  WorkshopMaintenanceStatus,
  { label: string; bg: string; text: string; border: string; barColor: string }
> = {
  "Aguardando vez": {
    label: "Fila de Espera",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    barColor: "bg-blue-500",
  },
  "Entrada": {
    label: "Entrada/Pátio",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
    barColor: "bg-zinc-500",
  },
  "Diagnóstico": {
    label: "Diagnóstico",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    barColor: "bg-purple-500",
  },
  "Aguardando peça": {
    label: "Aguardando Peça",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    barColor: "bg-amber-500",
  },
  "Em execução": {
    label: "Em Execução",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
    barColor: "bg-indigo-500",
  },
  "Finalizada": {
    label: "Pronta / Finalizada",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
    barColor: "bg-teal-500",
  },
  "Concluída": {
    label: "Entregue / Concluída",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    barColor: "bg-emerald-500",
  },
  "Entregue": {
    label: "Entregue / Concluída",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    barColor: "bg-emerald-500",
  },
};

interface WorkshopClientProps {
  initialMaintenances: WorkshopMaintenance[];
  initialAppointments: WorkshopAppointment[];
  initialProducts: WorkshopProduct[];
  userProfile: {
    name: string;
    role: string;
  };
}

export function WorkshopClient({
  initialMaintenances,
  initialAppointments,
  initialProducts,
  userProfile
}: WorkshopClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("os");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // React Query Queries
  const { data: maintenances = [] } = useQuery({
    queryKey: ["workshopMaintenances"],
    queryFn: () => getWorkshopMaintenances(),
    initialData: initialMaintenances,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["workshopAppointments"],
    queryFn: () => getWorkshopAppointments(),
    initialData: initialAppointments,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["workshopProducts"],
    queryFn: () => getWorkshopProducts(),
    initialData: initialProducts,
  });

  // Modal / Dialog States
  const [isOSOpen, setIsOSOpen] = useState(false);
  const [isOSDetailOpen, setIsOSDetailOpen] = useState(false);
  const [isApptOpen, setIsApptOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form States - Ordem de Serviço (OS)
  const [selectedOS, setSelectedOS] = useState<WorkshopMaintenance | null>(null);
  const [osPlate, setOsPlate] = useState("");
  const [osModel, setOsModel] = useState("");
  const [osYear, setOsYear] = useState("");
  const [osKm, setOsKm] = useState("");
  const [osClientName, setOsClientName] = useState("");
  const [osClientPhone, setOsClientPhone] = useState("");
  const [osMechanicName, setOsMechanicName] = useState(userProfile.name);
  const [osServiceRequested, setOsServiceRequested] = useState("");
  const [osLaborValue, setOsLaborValue] = useState("");
  const [osObservation, setOsObservation] = useState("");
  const [osIsUrgent, setOsIsUrgent] = useState(false);
  const [osStatus, setOsStatus] = useState<WorkshopMaintenanceStatus>("Aguardando vez");
  const [osPartsTaken, setOsPartsTaken] = useState<{ productId: string; quantity: number }[]>([]);
  const [osPartsRequested, setOsPartsRequested] = useState<{ name: string; value: number }[]>([]);
  const [isSavingOS, setIsSavingOS] = useState(false);

  // Form States - Agendamento (Appointment)
  const [apptTitle, setApptTitle] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptClientName, setApptClientName] = useState("");
  const [apptVehicleModel, setApptVehicleModel] = useState("");
  const [isSavingAppt, setIsSavingAppt] = useState(false);

  // Filter OS items
  const filteredOS = maintenances.filter((os) => {
    const query = search.toLowerCase();
    const matchesSearch =
      os.vehiclePlate.toLowerCase().includes(query) ||
      os.vehicleModel.toLowerCase().includes(query) ||
      (os.clientName || "").toLowerCase().includes(query) ||
      (os.mechanicName || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "todos" ||
      os.status === statusFilter ||
      (statusFilter === "ativo" && os.status !== "Finalizada" && os.status !== "Concluída" && os.status !== "Entregue");

    return matchesSearch && matchesStatus;
  });

  // OS Mutations
  const saveOSMutation = useMutation({
    mutationFn: (data: any) => saveWorkshopMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopMaintenances"] });
      queryClient.invalidateQueries({ queryKey: ["workshopProducts"] });
      setIsOSOpen(false);
      resetOSForm();
      router.refresh();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkshopMaintenanceStatus }) =>
      updateWorkshopMaintenanceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopMaintenances"] });
      router.refresh();
    }
  });

  const deleteOSMutation = useMutation({
    mutationFn: (id: string) => deleteWorkshopMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopMaintenances"] });
      setIsDeleteOpen(false);
      setSelectedOS(null);
      router.refresh();
    }
  });

  // Appointment Mutations
  const saveApptMutation = useMutation({
    mutationFn: (data: any) => saveWorkshopAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopAppointments"] });
      setIsApptOpen(false);
      resetApptForm();
      router.refresh();
    }
  });

  const deleteApptMutation = useMutation({
    mutationFn: (id: string) => deleteWorkshopAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopAppointments"] });
      router.refresh();
    }
  });

  // Helpers
  const resetOSForm = () => {
    setSelectedOS(null);
    setOsPlate("");
    setOsModel("");
    setOsYear("");
    setOsKm("");
    setOsClientName("");
    setOsClientPhone("");
    setOsMechanicName(userProfile.name);
    setOsServiceRequested("");
    setOsLaborValue("");
    setOsObservation("");
    setOsIsUrgent(false);
    setOsStatus("Aguardando vez");
    setOsPartsTaken([]);
    setOsPartsRequested([]);
  };

  const resetApptForm = () => {
    setApptTitle("");
    setApptDate("");
    setApptTime("");
    setApptClientName("");
    setApptVehicleModel("");
  };

  const handleOpenNewOS = () => {
    resetOSForm();
    setIsOSOpen(true);
  };

  const handleOpenEditOS = (os: WorkshopMaintenance) => {
    setSelectedOS(os);
    setOsPlate(os.vehiclePlate);
    setOsModel(os.vehicleModel);
    setOsYear(os.vehicleYear || "");
    setOsKm(os.vehicleKm || "");
    setOsClientName(os.clientName || "");
    setOsClientPhone(os.clientPhone || "");
    setOsMechanicName(os.mechanicName || "");
    setOsServiceRequested(os.serviceRequested || "");
    setOsLaborValue(String(os.laborValue || ""));
    setOsObservation(os.observation || "");
    setOsIsUrgent(!!os.isUrgent);
    setOsStatus(os.status);
    setOsPartsTaken(os.partsTaken || []);
    setOsPartsRequested(os.partsRequested || []);
    setIsOSOpen(true);
  };

  const handleOpenOSDetail = (os: WorkshopMaintenance) => {
    setSelectedOS(os);
    setIsOSDetailOpen(true);
  };

  const handleSaveOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osPlate || !osModel || !osServiceRequested) {
      alert("Placa, modelo e serviço solicitado são obrigatórios.");
      return;
    }

    setIsSavingOS(true);
    try {
      await saveOSMutation.mutateAsync({
        id: selectedOS?.id,
        vehiclePlate: osPlate.toUpperCase(),
        vehicleModel: osModel,
        vehicleYear: osYear,
        vehicleKm: osKm,
        clientName: osClientName,
        clientPhone: osClientPhone,
        mechanicName: osMechanicName,
        serviceRequested: osServiceRequested,
        laborValue: Number(osLaborValue || 0),
        observation: osObservation,
        isUrgent: osIsUrgent,
        status: osStatus,
        partsTaken: osPartsTaken,
        partsRequested: osPartsRequested,
        exitRegistered: selectedOS?.exitRegistered || false,
      });
      alert("Ordem de Serviço salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar OS: " + err.message);
    } finally {
      setIsSavingOS(false);
    }
  };

  const handleStatusChange = async (id: string, status: WorkshopMaintenanceStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status });
    } catch (err: any) {
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  const handleDeleteOSPrompt = (os: WorkshopMaintenance) => {
    setSelectedOS(os);
    setIsDeleteOpen(true);
  };

  const handleConfirmDeleteOS = async () => {
    if (!selectedOS) return;
    try {
      await deleteOSMutation.mutateAsync(selectedOS.id);
      alert("Ordem de serviço removida!");
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleSaveAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptTitle || !apptDate || !apptTime) {
      alert("Preencha título, data e horário do agendamento.");
      return;
    }

    setIsSavingAppt(true);
    try {
      await saveApptMutation.mutateAsync({
        title: apptTitle,
        date: apptDate,
        time: apptTime,
        clientName: apptClientName,
        vehicleModel: apptVehicleModel,
      });
      alert("Agendamento salvo!");
    } catch (err: any) {
      alert("Erro ao salvar agendamento: " + err.message);
    } finally {
      setIsSavingAppt(false);
    }
  };

  const handleDeleteAppt = async (id: string) => {
    if (!confirm("Deseja realmente remover este agendamento?")) return;
    try {
      await deleteApptMutation.mutateAsync(id);
    } catch (err: any) {
      alert("Erro ao excluir agendamento: " + err.message);
    }
  };

  // Add Part fields inside OS Form
  const handleAddFormPartTaken = () => {
    setOsPartsTaken([...osPartsTaken, { productId: "", quantity: 1 }]);
  };

  const handleRemoveFormPartTaken = (idx: number) => {
    setOsPartsTaken(osPartsTaken.filter((_, i) => i !== idx));
  };

  const handleFormPartTakenChange = (idx: number, field: string, val: any) => {
    setOsPartsTaken(
      osPartsTaken.map((p, i) => {
        if (i === idx) return { ...p, [field]: val };
        return p;
      })
    );
  };

  const handleAddFormPartRequested = () => {
    setOsPartsRequested([...osPartsRequested, { name: "", value: 0 }]);
  };

  const handleRemoveFormPartRequested = (idx: number) => {
    setOsPartsRequested(osPartsRequested.filter((_, i) => i !== idx));
  };

  const handleFormPartRequestedChange = (idx: number, field: string, val: any) => {
    setOsPartsRequested(
      osPartsRequested.map((p, i) => {
        if (i === idx) return { ...p, [field]: val };
        return p;
      })
    );
  };

  // Printing OS Receipt
  const handlePrintOS = () => {
    if (!selectedOS) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const partsValue = (selectedOS.partsTaken || []).reduce(
      (sum, item) => sum + Number(item.unitValue || 0) * Number(item.quantity),
      0
    ) + (selectedOS.partsRequested || []).reduce((sum, item) => sum + Number(item.value), 0);

    const labor = Number(selectedOS.laborValue || 0);
    const totalOS = partsValue + labor;

    const htmlContent = `
      <html>
        <head>
          <title>Ordem de Serviço - REI DAS MOTOS</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 13px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; text-transform: uppercase; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 8px; font-size: 11px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { text-align: left; padding: 6px; border-bottom: 1px solid #ddd; }
            th { background: #f2f2f2; font-weight: bold; }
            .total { text-align: right; font-weight: bold; font-size: 15px; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 60px; text-align: center; }
            .sig-line { border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>Ordem de Serviço de Manutenção</h1>
            <p>REI DAS MOTOS SLZ - Oficina Especializada</p>
            <p>OS ID: ${selectedOS.id.substring(0, 8).toUpperCase()} • Data: ${formatDate(selectedOS.date)}</p>
          </div>

          <div class="section">
            <div class="section-title">Dados do Cliente & Veículo</div>
            <div class="grid">
              <div>
                <p><strong>Cliente:</strong> ${selectedOS.clientName || "N/A"}</p>
                <p><strong>Telefone:</strong> ${selectedOS.clientPhone || "N/A"}</p>
              </div>
              <div>
                <p><strong>Veículo:</strong> ${selectedOS.vehicleModel}</p>
                <p><strong>Placa:</strong> ${selectedOS.vehiclePlate}</p>
                <p><strong>Quilometragem:</strong> ${selectedOS.vehicleKm ? `${selectedOS.vehicleKm} km` : "N/A"}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Serviço Solicitado / Diagnóstico</div>
            <p style="white-space: pre-line;">${selectedOS.serviceRequested}</p>
            ${selectedOS.observation ? `<p><strong>Observações:</strong> ${selectedOS.observation}</p>` : ""}
          </div>

          <div class="section">
            <div class="section-title">Peças Aplicadas e Serviços</div>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Quantidade</th>
                  <th>Valor Unitário</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${(selectedOS.partsTaken || []).map(item => `
                  <tr>
                    <td>${item.productName}</td>
                    <td>${item.quantity} un</td>
                    <td>R$ ${(item.unitValue || 0).toFixed(2)}</td>
                    <td>R$ ${(item.quantity * (item.unitValue || 0)).toFixed(2)}</td>
                  </tr>
                `).join("")}
                ${(selectedOS.partsRequested || []).map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td>1 un</td>
                    <td>R$ ${(item.value || 0).toFixed(2)}</td>
                    <td>R$ ${(item.value || 0).toFixed(2)}</td>
                  </tr>
                `).join("")}
                <tr>
                  <td>Mão de Obra (Mecânica/Elétrica)</td>
                  <td>1</td>
                  <td>R$ ${labor.toFixed(2)}</td>
                  <td>R$ ${labor.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="total">
            Valor Total da OS: R$ ${totalOS.toFixed(2)}
          </div>

          <div class="signatures">
            <div class="sig-line">Assinatura do Responsável (Oficina)</div>
            <div class="sig-line">Assinatura do Cliente</div>
          </div>

          <div class="footer">
            <p>Obrigado pela preferência! Garantia de serviços conforme termos internos da loja.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="text-primary" /> Centro de Serviços & Oficina
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie revisões preventivas, abertura de Ordens de Serviço (OS) de mecânica e agendamentos de clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsApptOpen(true)} className="gap-1.5 text-xs h-9 bg-card border-border/40">
            <Calendar size={14} /> + Agendar Revisão
          </Button>
          <Button onClick={handleOpenNewOS} className="gap-1.5 text-xs h-9 font-semibold">
            <Plus size={14} /> Nova Ordem de Serviço (OS)
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 w-full max-w-sm bg-zinc-900 border border-border/40 p-1 rounded-lg h-auto gap-1">
          <TabsTrigger value="os" className="rounded-md font-semibold text-xs gap-1.5">
            <Wrench size={14} /> Ordens de Serviço (OS)
          </TabsTrigger>
          <TabsTrigger value="agenda" className="rounded-md font-semibold text-xs gap-1.5">
            <Calendar size={14} /> Agenda da Oficina
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ORDENS DE SERVIÇO */}
        <TabsContent value="os" className="mt-4 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-1 gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por placa, modelo de moto ou cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card/60"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-card/60 border-border/40 text-foreground">
                  <SelectValue placeholder="Status OS" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-xs">
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="ativo">OS Ativas (Em aberto)</SelectItem>
                  {Object.entries(OS_STATUS_DETAILS).map(([stKey, val]) => (
                    <SelectItem key={stKey} value={stKey}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {/* Columns of Board: Fila, Diagnostico, Em Execucao, Aguardando Peca, Finalizada */}
            {(["Aguardando vez", "Diagnóstico", "Em execução", "Aguardando peça", "Finalizada"] as WorkshopMaintenanceStatus[]).map((status) => {
              const columnOS = filteredOS.filter((os) => os.status === status);
              const colDetails = OS_STATUS_DETAILS[status];

              return (
                <div key={status} className="bg-zinc-950/40 border border-border/30 rounded-xl p-3 min-w-[220px] flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-1">
                    <span className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${colDetails.barColor}`} />
                      {colDetails.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-zinc-900 border-zinc-800 text-muted-foreground font-semibold px-2">
                      {columnOS.length}
                    </Badge>
                  </div>

                  <div className="flex-1 space-y-3 min-h-[300px] overflow-y-auto pr-0.5">
                    {columnOS.length === 0 ? (
                      <div className="h-24 flex items-center justify-center border border-dashed border-border/20 rounded-lg text-[10px] text-muted-foreground">
                        Nenhuma OS nesta etapa
                      </div>
                    ) : (
                      columnOS.map((os) => {
                        const partsCost = (os.partsTaken || []).reduce((s, p) => s + (p.unitValue || 0) * p.quantity, 0) +
                                          (os.partsRequested || []).reduce((s, p) => s + Number(p.value), 0);
                        const totalCost = partsCost + (os.laborValue || 0);

                        return (
                          <Card
                            key={os.id}
                            className={`glass-card border-white/5 hover:border-primary/20 transition-all duration-300 relative group overflow-hidden ${os.isUrgent ? "border-red-500/30" : ""}`}
                          >
                            {os.isUrgent && (
                              <div className="absolute top-0 inset-x-0 h-[2px] bg-red-500 animate-pulse" />
                            )}
                            <CardHeader className="p-3 pb-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold bg-zinc-900 text-foreground border border-zinc-800 px-1.5 py-0.5 rounded uppercase">
                                  {os.vehiclePlate}
                                </span>
                                {os.isUrgent && (
                                  <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-1.5 py-0">
                                    Urgente!
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-bold text-xs text-foreground mt-1.5 line-clamp-1">
                                {os.vehicleModel}
                              </h4>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 text-[10px] text-muted-foreground space-y-1 leading-relaxed">
                              <p>Mec: <span className="text-foreground font-semibold">{os.mechanicName}</span></p>
                              <p>Cli: <span className="text-foreground">{os.clientName || "N/A"}</span></p>
                              <p className="font-mono font-bold text-primary text-[11px] border-t border-border/10 pt-1.5 mt-1">
                                {formatCurrency(totalCost)}
                              </p>
                            </CardContent>
                            <CardFooter className="p-2 pt-0 border-t border-border/10 flex justify-between bg-black/10">
                              <Select
                                value={os.status}
                                onValueChange={(val) => handleStatusChange(os.id, val as WorkshopMaintenanceStatus)}
                              >
                                <SelectTrigger className="h-7 text-[9px] bg-transparent border-transparent px-1 focus:ring-0 max-w-[100px] text-muted-foreground hover:text-foreground font-semibold">
                                  <SelectValue placeholder="Mudar Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-[10px]">
                                  {Object.entries(OS_STATUS_DETAILS).map(([st, v]) => (
                                    <SelectItem key={st} value={st}>
                                      {v.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenOSDetail(os)}
                                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                >
                                  <Eye size={12} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditOS(os)}
                                  className="h-7 w-7 text-muted-foreground hover:text-blue-400 hover:bg-blue-950/20"
                                >
                                  <Edit2 size={12} />
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 2: AGENDA DA OFICINA */}
        <TabsContent value="agenda" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Lista de agendamentos */}
            <div className="md:col-span-2 space-y-4">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Calendar size={16} /> Próximos Serviços Agendados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="font-semibold">Data / Horário</TableHead>
                        <TableHead className="font-semibold">Serviço / Título</TableHead>
                        <TableHead className="font-semibold">Cliente</TableHead>
                        <TableHead className="font-semibold">Moto</TableHead>
                        <TableHead className="font-semibold text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum agendamento de serviço na oficina.
                          </TableCell>
                        </TableRow>
                      ) : (
                        appointments.map((appt) => (
                          <TableRow key={appt.id} className="border-border/40 hover:bg-secondary/10">
                            <TableCell className="font-mono text-foreground font-semibold">
                              {formatDate(appt.date)} às {appt.time}
                            </TableCell>
                            <TableCell className="font-bold text-foreground">{appt.title}</TableCell>
                            <TableCell className="text-muted-foreground">{appt.clientName || "N/A"}</TableCell>
                            <TableCell className="font-medium text-foreground">{appt.vehicleModel || "N/A"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteAppt(appt.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Agendar novo */}
            <div className="space-y-4">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Calendar size={16} /> Novo Agendamento
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleSaveAppt}>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label htmlFor="appt-title">Título / Serviço *</Label>
                      <Input
                        id="appt-title"
                        placeholder="Ex: Troca de Óleo / Revisão 5.000 KM"
                        value={apptTitle}
                        onChange={(e) => setApptTitle(e.target.value)}
                        className="bg-black/30 h-10"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="appt-date">Data *</Label>
                        <Input
                          id="appt-date"
                          type="date"
                          value={apptDate}
                          onChange={(e) => setApptDate(e.target.value)}
                          className="bg-black/30 h-10 font-mono"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="appt-time">Horário *</Label>
                        <Input
                          id="appt-time"
                          type="time"
                          value={apptTime}
                          onChange={(e) => setApptTime(e.target.value)}
                          className="bg-black/30 h-10 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="appt-client">Cliente</Label>
                      <Input
                        id="appt-client"
                        placeholder="Nome do cliente"
                        value={apptClientName}
                        onChange={(e) => setApptClientName(e.target.value)}
                        className="bg-black/30 h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="appt-vehicle">Modelo da Moto</Label>
                      <Input
                        id="appt-vehicle"
                        placeholder="Ex: Titan 160 2022"
                        value={apptVehicleModel}
                        onChange={(e) => setApptVehicleModel(e.target.value)}
                        className="bg-black/30 h-10"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/40 bg-secondary/5 flex justify-end">
                    <Button type="submit" disabled={isSavingAppt} className="w-full font-semibold gap-1.5 text-xs">
                      {isSavingAppt ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Calendar size={14} />
                      )}
                      Salvar na Agenda
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: CRIAR OU EDITAR ORDEM DE SERVIÇO (OS) */}
      <Dialog open={isOSOpen} onOpenChange={setIsOSOpen}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-border/40 text-foreground text-xs overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <Wrench size={20} /> {selectedOS ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
            </DialogTitle>
            <DialogDescription>
              Abra ou atualize os dados do serviço de mecânica na oficina.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOS} className="space-y-4 pt-2">
            
            {/* DADOS DO CLIENTE */}
            <div className="border border-border/20 rounded-xl p-3 bg-black/10 space-y-3">
              <span className="font-bold text-[10px] uppercase text-primary tracking-wide block">Ficha do Cliente</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="os-client">Nome do Cliente</Label>
                  <Input
                    id="os-client"
                    placeholder="Nome completo"
                    value={osClientName}
                    onChange={(e) => setOsClientName(e.target.value)}
                    className="bg-black/30 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="os-phone">Telefone / WhatsApp</Label>
                  <Input
                    id="os-phone"
                    placeholder="Ex: (98) 99123-4567"
                    value={osClientPhone}
                    onChange={(e) => setOsClientPhone(e.target.value)}
                    className="bg-black/30 h-9 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* DADOS DO VEÍCULO */}
            <div className="border border-border/20 rounded-xl p-3 bg-black/10 space-y-3">
              <span className="font-bold text-[10px] uppercase text-primary tracking-wide block">Informações do Veículo</span>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="os-plate">Placa da Moto *</Label>
                  <Input
                    id="os-plate"
                    placeholder="ABC-1234 / ABC1D23"
                    value={osPlate}
                    onChange={(e) => setOsPlate(e.target.value)}
                    className="bg-black/30 h-9 font-mono uppercase"
                    required
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="os-model">Marca / Modelo *</Label>
                  <Input
                    id="os-model"
                    placeholder="Ex: Honda CG 160 Fan"
                    value={osModel}
                    onChange={(e) => setOsModel(e.target.value)}
                    className="bg-black/30 h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="os-year">Ano / Modelo</Label>
                  <Input
                    id="os-year"
                    placeholder="Ex: 2021"
                    value={osYear}
                    onChange={(e) => setOsYear(e.target.value)}
                    className="bg-black/30 h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="os-km">Quilometragem Atual</Label>
                  <Input
                    id="os-km"
                    placeholder="Ex: 12500"
                    value={osKm}
                    onChange={(e) => setOsKm(e.target.value)}
                    className="bg-black/30 h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="os-mechanic">Mecânico Responsável</Label>
                  <Input
                    id="os-mechanic"
                    placeholder="Ex: Francisco"
                    value={osMechanicName}
                    onChange={(e) => setOsMechanicName(e.target.value)}
                    className="bg-black/30 h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="os-status">Etapa do Serviço *</Label>
                  <Select
                    value={osStatus}
                    onValueChange={(val) => setOsStatus(val as WorkshopMaintenanceStatus)}
                  >
                    <SelectTrigger className="bg-black/30 h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-xs">
                      {Object.entries(OS_STATUS_DETAILS).map(([stKey, val]) => (
                        <SelectItem key={stKey} value={stKey}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SERVIÇO E VALOR */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="os-srv">Serviço Solicitado / Reclamação do Cliente *</Label>
                <Textarea
                  id="os-srv"
                  placeholder="Ex: Troca de relação, vela e barulho no motor."
                  value={osServiceRequested}
                  onChange={(e) => setOsServiceRequested(e.target.value)}
                  className="bg-black/30 min-h-[70px] text-xs"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="os-labor">Valor da Mão de Obra (R$)</Label>
                  <Input
                    id="os-labor"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={osLaborValue}
                    onChange={(e) => setOsLaborValue(e.target.value)}
                    className="bg-black/30 h-9 font-mono"
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="os-urgent"
                    checked={osIsUrgent}
                    onChange={(e) => setOsIsUrgent(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-black/40 text-primary accent-red-600 focus:ring-0"
                  />
                  <Label htmlFor="os-urgent" className="text-red-400 font-bold cursor-pointer">
                    Marcar como URGENTE
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="os-obs">Observações Internas (Diagnóstico/Avarias)</Label>
              <Input
                id="os-obs"
                placeholder="Ex: Roda traseira levemente empenada, pastilha gasta."
                value={osObservation}
                onChange={(e) => setOsObservation(e.target.value)}
                className="bg-black/30 h-9"
              />
            </div>

            {/* PEÇAS APLICADAS DO ESTOQUE */}
            <div className="border border-border/20 rounded-xl p-3 bg-black/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase text-primary tracking-wide block">Peças Aplicadas (Almoxarifado)</span>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFormPartTaken} className="text-[9px] h-6 px-2">
                  + Lançar Peça do Estoque
                </Button>
              </div>

              {osPartsTaken.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">
                  Nenhuma peça de estoque vinculada a esta OS.
                </p>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {osPartsTaken.map((part, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Produto / Peça no Estoque</Label>
                        <Select
                          value={part.productId}
                          onValueChange={(val) => handleFormPartTakenChange(idx, "productId", val)}
                        >
                          <SelectTrigger className="bg-black/30 h-8">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-xs">
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>
                                {p.name} ({p.vehicleModel}) - R$ {p.unitValue}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => handleFormPartTakenChange(idx, "quantity", Number(e.target.value))}
                          className="bg-black/30 h-8 font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFormPartTaken(idx)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PEÇAS COMPRADAS EXCEÇÃO / SOLICITADAS */}
            <div className="border border-border/20 rounded-xl p-3 bg-black/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase text-primary tracking-wide block">Peças Compradas Fora (Serviços Externos / Outros)</span>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFormPartRequested} className="text-[9px] h-6 px-2">
                  + Lançar Custo de Peça Externa
                </Button>
              </div>

              {osPartsRequested.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">
                  Nenhum serviço ou peça externa registrada.
                </p>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {osPartsRequested.map((part, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Nome da Peça / Serviço Externo</Label>
                        <Input
                          placeholder="Ex: Kit pistão importado / Retífica de cilindro"
                          value={part.name}
                          onChange={(e) => handleFormPartRequestedChange(idx, "name", e.target.value)}
                          className="bg-black/30 h-8"
                          required
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Custo (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={part.value || ""}
                          onChange={(e) => handleFormPartRequestedChange(idx, "value", Number(e.target.value))}
                          className="bg-black/30 h-8 font-mono"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFormPartRequested(idx)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsOSOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingOS} className="h-9 text-xs font-semibold">
                {isSavingOS && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Ordem de Serviço
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: VISUALIZAÇÃO COMPLETA DE DETALHES DA OS */}
      <Dialog open={isOSDetailOpen} onOpenChange={setIsOSDetailOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-border/40 text-foreground text-xs overflow-y-auto max-h-[85vh]">
          {selectedOS && (
            <div className="space-y-6">
              <DialogHeader className="border-b border-border/40 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-foreground">
                      Ordem de Serviço #{selectedOS.id.substring(0, 8).toUpperCase()}
                    </DialogTitle>
                    {selectedOS.isUrgent && (
                      <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-bold animate-pulse text-[9px]">
                        URGENTE
                      </Badge>
                    )}
                  </div>
                  <Badge className={`${OS_STATUS_DETAILS[selectedOS.status].bg} ${OS_STATUS_DETAILS[selectedOS.status].text} ${OS_STATUS_DETAILS[selectedOS.status].border} border font-bold text-[10px]`}>
                    {OS_STATUS_DETAILS[selectedOS.status].label}
                  </Badge>
                </div>
                <DialogDescription className="font-mono text-[10px] text-muted-foreground mt-1.5">
                  Abertura: {formatDate(selectedOS.date)} • Mecânico: {selectedOS.mechanicName}
                </DialogDescription>
              </DialogHeader>

              {/* Ficha Cliente/Moto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/20 p-4 border border-border/20 rounded-xl">
                <div className="space-y-1.5 leading-relaxed text-muted-foreground">
                  <span className="font-bold text-[10px] uppercase text-primary tracking-wide block mb-1">Cliente</span>
                  <p className="text-sm font-bold text-foreground">{selectedOS.clientName || "N/A"}</p>
                  {selectedOS.clientPhone && (
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                      <Phone size={12} className="text-muted-foreground" /> {selectedOS.clientPhone}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 leading-relaxed text-muted-foreground">
                  <span className="font-bold text-[10px] uppercase text-primary tracking-wide block mb-1">Veículo / Moto</span>
                  <p className="text-sm font-bold text-foreground">{selectedOS.vehicleModel}</p>
                  <p>Placa: <span className="font-mono text-foreground font-semibold">{selectedOS.vehiclePlate}</span></p>
                  {selectedOS.vehicleYear && <p>Ano: <span className="text-foreground">{selectedOS.vehicleYear}</span></p>}
                  {selectedOS.vehicleKm && <p>KM Atual: <span className="text-foreground font-mono">{selectedOS.vehicleKm} km</span></p>}
                </div>
              </div>

              {/* Serviço Solicitado */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] uppercase text-primary tracking-wide block">Serviço Solicitado / Diagnóstico</span>
                <div className="bg-card/40 border border-border/30 rounded-xl p-4 text-foreground text-xs leading-relaxed whitespace-pre-line">
                  {selectedOS.serviceRequested}
                </div>
                {selectedOS.observation && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    <strong>Notas do Mecânico:</strong> {selectedOS.observation}
                  </p>
                )}
              </div>

              {/* Peças e Valores */}
              <div className="space-y-3">
                <span className="font-bold text-[10px] uppercase text-primary tracking-wide block">Lista de Peças e Custos</span>
                <div className="border border-border/20 rounded-xl overflow-hidden bg-black/10">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-900/40 border-b border-border/30 text-muted-foreground uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="p-3">Descrição Item</th>
                        <th className="p-3">Qtd</th>
                        <th className="p-3">Valor Unitário</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {/* Peças retiradas */}
                      {(selectedOS.partsTaken || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-foreground">{item.productName}</td>
                          <td className="p-3 font-mono">{item.quantity} un</td>
                          <td className="p-3 font-mono">{formatCurrency(item.unitValue || 0)}</td>
                          <td className="p-3 font-mono font-bold text-right text-foreground">
                            {formatCurrency(item.quantity * (item.unitValue || 0))}
                          </td>
                        </tr>
                      ))}
                      {/* Peças compradas fora */}
                      {(selectedOS.partsRequested || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-foreground">{item.name} (Serviço Externo)</td>
                          <td className="p-3 font-mono">1 un</td>
                          <td className="p-3 font-mono">{formatCurrency(item.value)}</td>
                          <td className="p-3 font-mono font-bold text-right text-foreground">
                            {formatCurrency(item.value)}
                          </td>
                        </tr>
                      ))}
                      {/* Mão de Obra */}
                      <tr>
                        <td className="p-3 font-semibold text-foreground">Mão de Obra Mecânica / Elétrica</td>
                        <td className="p-3 font-mono">1</td>
                        <td className="p-3 font-mono">{formatCurrency(selectedOS.laborValue || 0)}</td>
                        <td className="p-3 font-mono font-bold text-right text-foreground">
                          {formatCurrency(selectedOS.laborValue || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Resumo financeiro da OS */}
                <div className="flex justify-between items-center border-t border-border/30 pt-4 mt-2">
                  <div className="text-[10px] text-muted-foreground leading-snug">
                    <p>Status Financeiro: <Badge variant="outline" className={`text-[9px] font-bold ${selectedOS.status === "Finalizada" || selectedOS.status === "Concluída" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-muted-foreground border-zinc-700"}`}>{selectedOS.status === "Finalizada" || selectedOS.status === "Concluída" ? "Faturado" : "Aberto"}</Badge></p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Valor Total da OS</span>
                    <span className="text-lg font-black text-primary font-mono">
                      {formatCurrency(
                        (selectedOS.partsTaken || []).reduce((s, p) => s + (p.unitValue || 0) * p.quantity, 0) +
                        (selectedOS.partsRequested || []).reduce((s, p) => s + Number(p.value), 0) +
                        (selectedOS.laborValue || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé de Detalhe */}
              <div className="flex justify-end gap-2 border-t border-border/30 pt-4 bg-secondary/5">
                {userProfile.role === "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteOSPrompt(selectedOS)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Excluir OS permanentemente"
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
                <Button variant="outline" className="gap-1.5 text-xs h-9 bg-card" onClick={handlePrintOS}>
                  <Printer size={14} /> Imprimir Ficha OS
                </Button>
                <Button onClick={() => setIsOSDetailOpen(false)} className="text-xs h-9 font-semibold">
                  Fechar Visualização
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: DELETAR OS */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} /> Excluir Ordem de Serviço
            </DialogTitle>
            <DialogDescription>
              Atenção! Esta ação apagará permanentemente todos os registros, custos e peças associadas à OS do veículo <strong className="text-foreground">{selectedOS?.vehicleModel} ({selectedOS?.vehiclePlate})</strong>.
              Tem certeza que deseja excluir esta OS?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteOS}
              disabled={deleteOSMutation.isPending}
            >
              {deleteOSMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
