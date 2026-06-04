"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCompanyDetails, createEmployee, deleteEmployee, resetCompanyData, clearAuditLogs } from "@/actions/settingsActions";
import { UserRole, AuditLog } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Building2,
  Users,
  UserPlus,
  Trash2,
  Save,
  Loader2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/utils/formatters";

const renderActionDescription = (log: any) => {
  const details = log.details || {};
  switch (log.action) {
    case "CREATE_CLIENT":
      return `Cadastrou o cliente: ${details.client_name || details.name || "N/A"}`;
    case "UPDATE_CLIENT":
      return `Atualizou dados do cliente ID: ${details.client_id || "N/A"} (Campos: ${(details.updated_fields || []).join(", ") || "N/A"})`;
    case "DELETE_CLIENT":
      return `Excluiu o cliente: ${details.name || "N/A"} (CPF: ${details.cpf || "N/A"})`;
      
    case "CREATE_CONTRACT":
      return `Criou o contrato de número: ${details.contract_number || "N/A"} (Modalidade: ${details.modality || "N/A"})`;
    case "UPDATE_CONTRACT":
      return `Atualizou o contrato de número: ${details.contract_number || "N/A"} (Status: ${details.status || "N/A"})`;
    case "DELETE_CONTRACT":
      return `Excluiu o contrato nº: ${details.contract_number || "N/A"} (Cliente: ${details.client_name || "N/A"}, Veículo: ${details.vehicle_model || ""} - Placa: ${details.vehicle_plate || ""})`;
    case "ADD_SIGNATURE":
    case "REGISTER_SIGNATURE":
      return `Registrou assinatura no contrato de número: ${details.contract_number || "N/A"} (${details.role || "N/A"})`;
      
    case "CREATE_VEHICLE":
      return `Cadastrou o veículo: ${details.brand || ""} ${details.model || ""} (Placa: ${details.plate || "N/A"})`;
    case "UPDATE_VEHICLE":
      return `Atualizou dados do veículo ID: ${details.vehicle_id || "N/A"} (Campos: ${(details.updated_fields || []).join(", ") || "N/A"})`;
    case "DELETE_VEHICLE":
      return `Excluiu o veículo: ${details.brand || ""} ${details.model || ""} (Placa: ${details.plate || "N/A"})`;

    case "CREATE_FINANCIAL_ENTRY":
      return `Registrou lançamento financeiro (${details.type || "N/A"}): ${details.description || "N/A"} no valor de R$ ${details.amount || 0}`;
    case "DELETE_FINANCIAL_ENTRY":
      return `Excluiu lançamento financeiro ID: ${details.entry_id || "N/A"}`;

    case "RESET_COMPANY_DATA":
      return `Realizou reset geral dos dados do sistema`;
    case "CLEAR_AUDIT_LOGS":
      return `Limpou os logs de auditoria da concessionária`;

    case "CREATE_TRANSFER_PROCESS":
      return `Iniciou processo de transferência para o contrato ID: ${details.contract_id || "N/A"}`;
    case "UPDATE_TRANSFER_STATUS":
      return `Atualizou status de transferência para: ${details.new_status || "N/A"}`;

    default:
      return log.action + (log.details ? ` - ${JSON.stringify(log.details)}` : "");
  }
};

interface SettingsClientProps {
  company: {
    id: string;
    name: string;
    document: string;
    address?: string;
    phone?: string;
    email?: string;
    admin_signature?: string;
  } | null;
  initialEmployees: any[];
  initialAuditLogs: any[];
}

export function SettingsClient({ company, initialEmployees, initialAuditLogs }: SettingsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("company");

  const sigCanvasRef = useRef<SignatureCanvas>(null);

  // Company states
  const [companyName, setCompanyName] = useState(company?.name || "");
  const [companyDocument, setCompanyDocument] = useState(company?.document || "");
  const [companyAddress, setCompanyAddress] = useState(company?.address || "");
  const [companyPhone, setCompanyPhone] = useState(company?.phone || "");
  const [companyEmail, setCompanyEmail] = useState(company?.email || "");
  const [adminSignature, setAdminSignature] = useState(company?.admin_signature || "");

  // Employee states
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpPassword, setNewEmpPassword] = useState("");
  const [newEmpRole, setNewEmpRole] = useState<UserRole>("vendedor");

  // Loading / Error states
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Audit Logs & Reset states
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleClearLogs = async () => {
    if (!confirm("Tem certeza que deseja limpar permanentemente todos os logs de auditoria da sua concessionária? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    try {
      const res = await clearAuditLogs();
      if (res.success) {
        alert("Logs de auditoria limpos com sucesso!");
        setAuditLogs([]);
        router.refresh();
      } else {
        alert(`Erro ao limpar logs: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Erro inesperado: ${err.message}`);
    }
  };

  const handleResetSystem = async () => {
    if (resetConfirmText !== "ZERAR") {
      alert("Por favor, digite ZERAR para confirmar.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetCompanyData();
      if (res.success) {
        alert("Sistema zerado com sucesso! Todos os valores, contratos e logs foram limpos.");
        setIsResetOpen(false);
        setResetConfirmText("");
        router.refresh();
        window.location.reload();
      } else {
        alert(`Erro ao resetar o sistema: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Erro inesperado: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    vendedor: "Vendedor",
    operacional: "Operacional",
    financeiro: "Financeiro",
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !companyDocument) {
      alert("Nome da loja e CNPJ/CPF são obrigatórios.");
      return;
    }

    setIsUpdatingCompany(true);
    try {
      const res = await updateCompanyDetails({
        name: companyName,
        document: companyDocument,
        address: companyAddress,
        phone: companyPhone,
        email: companyEmail,
        admin_signature: adminSignature,
      });

      if (res.success) {
        alert("Configurações da empresa atualizadas com sucesso!");
        router.refresh();
      }
    } catch (err: any) {
      alert(`Erro ao atualizar: ${err.message}`);
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpEmail || !newEmpPassword) {
      alert("Preencha todos os campos do funcionário.");
      return;
    }
    if (newEmpPassword.length < 6) {
      alert("A senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    setIsCreatingEmployee(true);
    try {
      const res = await createEmployee({
        name: newEmpName,
        email: newEmpEmail,
        password: newEmpPassword,
        role: newEmpRole,
      });

      if (res.success) {
        alert("Funcionário cadastrado com sucesso!");
        // Limpar formulário
        setNewEmpName("");
        setNewEmpEmail("");
        setNewEmpPassword("");
        setNewEmpRole("vendedor");
        
        // Atualizar lista local
        router.refresh();
        // Recarregar os funcionários da base
        window.location.reload();
      } else {
        alert(`Falha ao cadastrar: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o funcionário ${name}?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteEmployee(id);
      if (res.success) {
        alert("Funcionário removido com sucesso!");
        setEmployees(employees.filter(e => e.id !== id));
        router.refresh();
      } else {
        alert(`Erro: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Erro ao remover: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Building2 className="text-primary" /> Configurações de Empresa e Usuários
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie os dados cadastrais da sua loja que serão impressos nos contratos e cadastre novos funcionários com níveis de acesso.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full max-w-lg bg-zinc-900 border border-border/40 p-1 rounded-lg h-auto gap-1">
          <TabsTrigger value="company" className="rounded-md font-semibold text-xs gap-1.5">
            <Building2 size={14} /> Dados da Loja
          </TabsTrigger>
          <TabsTrigger value="employees" className="rounded-md font-semibold text-xs gap-1.5">
            <Users size={14} /> Equipe (ADM / Funcionários)
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-md font-semibold text-xs gap-1.5">
            <ShieldCheck size={14} /> Auditoria e Logs
          </TabsTrigger>
        </TabsList>

        {/* DADOS DA EMPRESA */}
        <TabsContent value="company" className="mt-4">
          <Card className="glass-card border-white/5 max-w-3xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <FileText size={16} /> Ficha Cadastral da Empresa
              </CardTitle>
              <CardDescription>
                Estes dados serão incorporados no cabeçalho e termos de compromisso de todos os seus contratos de compra e venda gerados.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateCompany}>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="company-name">Nome da Loja / Razão Social *</Label>
                    <Input
                      id="company-name"
                      placeholder="Ex: AutoPrime Multimarcas Ltda"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-black/30 h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company-doc">CNPJ ou CPF da Empresa *</Label>
                    <Input
                      id="company-doc"
                      placeholder="Ex: 00.000.000/0001-00"
                      value={companyDocument}
                      onChange={(e) => setCompanyDocument(e.target.value)}
                      className="bg-black/30 h-10 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="company-address">Endereço Completo</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company-address"
                        placeholder="Ex: Av. dos Holandeses, 10 - Calhau, São Luís - MA"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        className="bg-black/30 h-10 pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company-phone">Telefone / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company-phone"
                        placeholder="Ex: (98) 99123-4567"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        className="bg-black/30 h-10 pl-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="company-email">E-mail Comercial de Contato</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="Ex: contato@autoprime.com.br"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="bg-black/30 h-10 pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/20 pt-4 mt-4">
                  <Label className="text-foreground font-bold text-xs">Assinatura Digital do Administrador (Padrão para Contratos)</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Desenhe sua assinatura padrão abaixo. Ela será pré-carregada para permitir que você assine contratos como vendedor de forma automática com um único clique.
                  </p>
                  {adminSignature ? (
                    <div className="space-y-2 max-w-sm">
                      <div className="aspect-video w-full rounded bg-white p-2 border border-border/30 overflow-hidden flex items-center justify-center relative">
                        <img src={adminSignature} alt="Assinatura ADM" className="object-contain max-h-full" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7"
                        onClick={() => setAdminSignature("")}
                      >
                        Substituir Assinatura
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-sm">
                      <div className="border border-border/40 rounded bg-white overflow-hidden">
                        <SignatureCanvas
                          ref={sigCanvasRef}
                          penColor="black"
                          canvasProps={{
                            width: 380,
                            height: 140,
                            className: "signature-pad w-full rounded",
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-7"
                          onClick={() => sigCanvasRef.current?.clear()}
                        >
                          Limpar
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-[10px] h-7 font-bold"
                          onClick={() => {
                            if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
                              const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
                              setAdminSignature(dataUrl);
                            } else {
                              alert("Desenhe sua assinatura antes de confirmar.");
                            }
                          }}
                        >
                          Confirmar Desenho
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-6 border-t border-border/40 bg-secondary/5 flex justify-end gap-3">
                <Button type="submit" disabled={isUpdatingCompany} className="font-semibold gap-1.5 text-xs">
                  {isUpdatingCompany ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Salvar Alterações
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* EQUIPE E FUNCIONÁRIOS */}
        <TabsContent value="employees" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lista de funcionários (2 colunas) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Users size={16} /> Colaboradores Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">E-mail</TableHead>
                        <TableHead className="font-semibold">Cargo</TableHead>
                        <TableHead className="font-semibold text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp.id} className="border-border/40 hover:bg-secondary/10">
                          <TableCell className="font-bold text-foreground">{emp.name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono">{emp.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                              {roleLabels[emp.role] || emp.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                              disabled={deletingId === emp.id}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Remover Acesso"
                            >
                              {deletingId === emp.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Formulário de cadastro (1 coluna) */}
            <div className="space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <UserPlus size={16} /> Novo Cadastro ADM / Funcionário
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleCreateEmployee}>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-name">Nome Completo *</Label>
                      <Input
                        id="emp-name"
                        placeholder="Nome do funcionário"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        className="bg-black/30 h-10"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="emp-email">E-mail de Login *</Label>
                      <Input
                        id="emp-email"
                        type="email"
                        placeholder="email@empresa.com"
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        className="bg-black/30 h-10 font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="emp-pass">Senha Provisória *</Label>
                      <Input
                        id="emp-pass"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newEmpPassword}
                        onChange={(e) => setNewEmpPassword(e.target.value)}
                        className="bg-black/30 h-10"
                        minLength={6}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="emp-role">Cargo / Perfil de Acesso *</Label>
                      <Select
                        value={newEmpRole}
                        onValueChange={(val) => setNewEmpRole(val as UserRole)}
                      >
                        <SelectTrigger className="bg-black/30 h-10">
                          <SelectValue placeholder="Selecione o Cargo" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-foreground border border-border/40 text-xs">
                          <SelectItem value="vendedor">Vendedor (Cadastro Vendas/Inventário)</SelectItem>
                          <SelectItem value="operacional">Operador Pós-Venda (Kanban/Transferência)</SelectItem>
                          <SelectItem value="financeiro">Financeiro (Baixas/Fluxo de Parcelas)</SelectItem>
                          <SelectItem value="admin">Administrador (Acesso total + Configurações)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/40 bg-secondary/5 flex justify-end">
                    <Button type="submit" disabled={isCreatingEmployee} className="w-full font-semibold gap-1.5 text-xs">
                      {isCreatingEmployee ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UserPlus size={14} />
                      )}
                      Registrar Acesso ADM
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* AUDITORIA E LOGS */}
        <TabsContent value="auditoria" className="mt-4 space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <ShieldCheck size={16} /> Registro de Atividades (Auditoria)
                </CardTitle>
                <CardDescription>
                  Histórico detalhado das ações executadas pelos usuários no sistema para fins de auditoria interna.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                className="text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-950/20 hover:text-red-300"
              >
                Limpar Logs
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="font-semibold">Data / Hora</TableHead>
                      <TableHead className="font-semibold">Colaborador</TableHead>
                      <TableHead className="font-semibold">Ação</TableHead>
                      <TableHead className="font-semibold">IP / Dispositivo</TableHead>
                      <TableHead className="font-semibold">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum registro de auditoria encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log: any) => (
                        <TableRow key={log.id} className="border-b border-border/40 hover:bg-secondary/10">
                          <TableCell className="font-mono whitespace-nowrap text-muted-foreground">
                            {formatDate(log.created_at)} {log.created_at.split("T")[1]?.substring(0, 8)}
                          </TableCell>
                          <TableCell className="font-bold text-foreground">
                            {log.user?.name || "Sistema / Externo"}
                            <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                              {log.user?.email || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono bg-zinc-800/40 text-foreground border-zinc-700/50">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {log.ip_address}
                            <span className="block text-[9px] truncate max-w-[120px]" title={log.user_agent}>
                              {log.user_agent}
                            </span>
                          </TableCell>
                          <TableCell className="text-foreground max-w-md font-medium" title={log.details ? JSON.stringify(log.details) : undefined}>
                            {renderActionDescription(log)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* DANGER ZONE */}
          <Card className="border-red-500/20 bg-red-950/10">
            <CardHeader className="pb-3 border-b border-red-500/20">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                <AlertTriangle size={16} /> Zona de Perigo - Limpeza de Banco de Dados
              </CardTitle>
              <CardDescription className="text-xs text-red-300">
                Ações irreversíveis de manutenção e limpeza. Apenas o administrador da concessionária pode executar.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <p className="text-muted-foreground">
                Ao selecionar a opção abaixo, o sistema limpará **permanentemente** todos os dados de vendas, contratos, parcelas a receber,
                clientes e logs de auditoria vinculados a esta empresa.
                Os veículos cadastrados no pátio serão preservados e retornarão para o status **Disponível**.
              </p>
              <div className="flex items-center justify-between border-t border-border/20 pt-4">
                <div>
                  <h4 className="font-bold text-foreground">Zerar Todos os Dados do ERP</h4>
                  <p className="text-[10px] text-muted-foreground">Limpa contratos, fluxo de caixa, parcelas e clientes.</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsResetOpen(true)}
                  className="font-bold text-xs h-9 bg-red-600 hover:bg-red-700"
                >
                  Zerar Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-red-900/40 text-foreground text-xs">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
                <AlertTriangle size={20} /> Reset Geral do Sistema
              </DialogTitle>
              <DialogDescription className="text-sm text-red-200">
                Atenção! Esta ação apagará permanentemente todos os contratos, parcelas, clientes, 
                lançamentos financeiros e logs da sua loja. Os veículos serão mantidos e resetados para o status &quot;Disponível&quot;.
                <strong>Essa ação NÃO poderá ser desfeita!</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 py-2">
              <Label htmlFor="reset-confirm-input" className="text-xs text-muted-foreground font-bold">
                Digite <span className="text-foreground underline">ZERAR</span> para confirmar:
              </Label>
              <Input
                id="reset-confirm-input"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="border-red-900/40 focus-visible:ring-red-500 h-10 uppercase font-mono"
                placeholder="Digite ZERAR"
              />
            </div>
            
            <DialogFooter className="pt-2 border-t border-border/30 gap-2">
              <Button variant="ghost" onClick={() => setIsResetOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={resetConfirmText !== "ZERAR" || isResetting}
                onClick={handleResetSystem}
                className="h-9 text-xs font-bold"
              >
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Reset Geral
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
