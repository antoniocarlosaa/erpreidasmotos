"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL, formatDate } from "@/utils/formatters";
import { createExpense, confirmPayment, deleteFinancialEntry } from "@/actions/financeActions";
import { FinancialEntry, Payment, PaymentMethod } from "@/types";

interface FinanceClientProps {
  initialEntries: FinancialEntry[];
  initialPayments: any[]; // Payment with contract details loaded
  userRole: string;
}

const COLORS = ["#00f0ff", "#a855f7", "#3b82f6", "#e11d48", "#10b981", "#f59e0b"];

export function FinanceClient({ initialEntries, initialPayments, userRole }: FinanceClientProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<FinancialEntry[]>(initialEntries);
  const [payments, setPayments] = useState<any[]>(initialPayments);

  // Filtros de Livro de Caixa (Lançamentos)
  const [entrySearch, setEntrySearch] = useState("");
  const [entryType, setEntryType] = useState<string>("ALL");
  const [entryCategory, setEntryCategory] = useState<string>("ALL");

  // Filtros de Parcelas
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("ALL");

  // State para Modais
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [confirmPayMethod, setConfirmPayMethod] = useState<PaymentMethod>("pix");

  // State para Exclusão de Lançamento
  const [isDeleteEntryOpen, setIsDeleteEntryOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

  // Form de Nova Despesa
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    description: "",
    category: "Administrativo",
    entry_date: new Date().toISOString().split("T")[0],
  });

  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  // Categorias de despesas pré-definidas
  const expenseCategories = [
    "Administrativo",
    "Comissão de Venda",
    "Manutenção de Veículos",
    "Marketing / Anúncios",
    "Impostos e Taxas",
    "Limpeza / Preparação",
    "Outros",
  ];

  // =========================================================================
  // PROCESSAMENTO DE DADOS E CÁLCULO DE KPIs
  // =========================================================================

  const kpis = useMemo(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;

    entries.forEach((e) => {
      if (e.type === "RECEITA") {
        totalReceitas += Number(e.amount);
      } else {
        totalDespesas += Number(e.amount);
      }
    });

    const saldoAtual = totalReceitas - totalDespesas;

    // Calcular parcelas pendentes (não pagas e atrasadas)
    let projecoesReceber = 0;
    let projecoesPagar = 0;
    payments.forEach((p) => {
      if (p.status === "PENDENTE" || p.status === "ATRASADO") {
        if (p.is_refund) {
          projecoesPagar += Number(p.amount);
        } else {
          projecoesReceber += Number(p.amount);
        }
      }
    });

    return {
      totalReceitas,
      totalDespesas,
      saldoAtual,
      projecoesReceber,
      saldoProjetado: saldoAtual + projecoesReceber - projecoesPagar,
    };
  }, [entries, payments]);

  // Agrupamento dos lançamentos dos últimos 6 meses para o Gráfico de Barras
  const chartCashFlow = useMemo(() => {
    const months: Record<string, { name: string; receitas: number; despesas: number }> = {};
    
    // Inicializar os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const key = d.toISOString().substring(0, 7); // Formato YYYY-MM
      months[key] = { name: label, receitas: 0, despesas: 0 };
    }

    entries.forEach((entry) => {
      const key = entry.entry_date.substring(0, 7);
      if (months[key]) {
        if (entry.type === "RECEITA") {
          months[key].receitas += Number(entry.amount);
        } else {
          months[key].despesas += Number(entry.amount);
        }
      }
    });

    return Object.values(months);
  }, [entries]);

  // Divisão de Despesas por Categoria para o Gráfico Donut
  const chartCategories = useMemo(() => {
    const categories: Record<string, number> = {};
    entries
      .filter((e) => e.type === "DESPESA")
      .forEach((e) => {
        categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
      });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
    }));
  }, [entries]);

  // Filtragem de Lançamentos
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        e.description.toLowerCase().includes(entrySearch.toLowerCase()) ||
        e.category.toLowerCase().includes(entrySearch.toLowerCase());
      const matchesType = entryType === "ALL" || e.type === entryType;
      const matchesCategory = entryCategory === "ALL" || e.category === entryCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [entries, entrySearch, entryType, entryCategory]);

  // Filtragem de Parcelas
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const clientName = p.contract?.client?.name || "";
      const contractNum = String(p.contract?.contract_number || "");
      const vehicleModel = p.contract?.vehicle?.model || "";

      const matchesSearch =
        clientName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        contractNum.includes(paymentSearch) ||
        vehicleModel.toLowerCase().includes(paymentSearch.toLowerCase());

      const matchesStatus = paymentStatus === "ALL" || p.status === paymentStatus;

      return matchesSearch && matchesStatus;
    });
  }, [payments, paymentSearch, paymentStatus]);

  // =========================================================================
  // HANDLERS E SUBMISSÕES
  // =========================================================================

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description || !expenseForm.entry_date) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const value = parseFloat(expenseForm.amount.replace(",", "."));
    if (isNaN(value) || value <= 0) {
      alert("O valor da despesa deve ser maior que zero.");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const newEntry = await createExpense({
        amount: value,
        description: expenseForm.description,
        category: expenseForm.category,
        entry_date: expenseForm.entry_date,
      });

      if (newEntry) {
        setEntries((prev) => [newEntry, ...prev]);
        setIsExpenseOpen(false);
        // Reset form
        setExpenseForm({
          amount: "",
          description: "",
          category: "Administrativo",
          entry_date: new Date().toISOString().split("T")[0],
        });
        alert("Despesa cadastrada com sucesso!");
      }
    } catch (error: any) {
      alert(`Erro ao cadastrar despesa: ${error.message}`);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleOpenConfirmDialog = (payment: any) => {
    setSelectedPayment(payment);
    setConfirmPayMethod("pix");
    setIsConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;

    setIsSubmittingConfirm(true);
    try {
      const updated = await confirmPayment(selectedPayment.id, {
        payment_method: confirmPayMethod,
      });

      if (updated) {
        // Atualizar lista local de parcelas
        setPayments((prev) =>
          prev.map((p) => (p.id === selectedPayment.id ? { ...p, status: "PAGO", paid_at: updated.paid_at, payment_method: confirmPayMethod } : p))
        );

        // Atualizar livro de caixa (inserindo nova receita/despesa correspondente)
        const isRefund = selectedPayment.is_refund === true;
        const isDownPayment = selectedPayment.installment_number === 0;
        
        let type: "RECEITA" | "DESPESA" = "RECEITA";
        let category = isDownPayment ? "Entrada Veículo" : "Parcela Financiamento";
        let description = "";

        if (isRefund) {
          type = "DESPESA";
          category = "Troco/Volta Cliente";
          description = `Devolução de Troco/Volta - Contrato #${selectedPayment.contract?.contract_number} (Cliente: ${selectedPayment.contract?.client?.name})`;
        } else {
          description = isDownPayment
            ? `Entrada recebida - Contrato #${selectedPayment.contract?.contract_number} (Cliente: ${selectedPayment.contract?.client?.name})`
            : `Recebimento Parcela ${selectedPayment.installment_number}/${selectedPayment.contract?.installments_count} - Contrato #${selectedPayment.contract?.contract_number}`;
        }

        const fakeNewEntry: FinancialEntry = {
          id: Math.random().toString(), // fake ID para renderizar localmente até recarregar
          company_id: selectedPayment.contract?.company_id || "",
          contract_id: selectedPayment.contract?.id || null,
          type,
          amount: selectedPayment.amount,
          description,
          entry_date: new Date().toISOString().split("T")[0],
          category,
          created_at: new Date().toISOString(),
        };

        setEntries((prev) => [fakeNewEntry, ...prev]);
        setIsConfirmOpen(false);
        setSelectedPayment(null);
        alert("Pagamento confirmado e registrado no caixa!");
      }
    } catch (error: any) {
      alert(`Erro ao confirmar pagamento: ${error.message}`);
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const handleDeleteEntryPrompt = (entry: FinancialEntry) => {
    setSelectedEntry(entry);
    setIsDeleteEntryOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    setIsDeletingEntry(true);
    try {
      const success = await deleteFinancialEntry(selectedEntry.id);
      if (success) {
        setEntries((prev) => prev.filter((e) => e.id !== selectedEntry.id));
        setIsDeleteEntryOpen(false);
        setSelectedEntry(null);
        alert("Lançamento financeiro excluído com sucesso!");
        router.refresh();
      }
    } catch (error: any) {
      alert(`Erro ao excluir lançamento: ${error.message}`);
    } finally {
      setIsDeletingEntry(false);
    }
  };

  // Status badges formatters
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "PAGO":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 font-semibold">
            <CheckCircle size={12} /> Pago
          </Badge>
        );
      case "ATRASADO":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 gap-1 font-semibold animate-pulse">
            <AlertCircle size={12} /> Atrasado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1 font-semibold">
            <Clock size={12} /> Pendente
          </Badge>
        );
    }
  };

  const getMethodLabel = (method?: PaymentMethod) => {
    if (!method) return "-";
    const labels: Record<PaymentMethod, string> = {
      dinheiro: "Dinheiro",
      pix: "Pix",
      cartao_credito: "Crédito",
      boleto: "Boleto",
      transferencia_bancaria: "Transferência",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-zinc-900 via-zinc-950 to-black p-6 relative overflow-hidden glass-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <TrendingUp className="text-primary" size={24} />
              Gestão Financeira e Caixa
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Monitore o fluxo de caixa, registre despesas operacionais e acompanhe o cronograma de parcelas contratuais.
            </p>
          </div>
          <Button
            onClick={() => setIsExpenseOpen(true)}
            className="bg-primary hover:bg-primary/95 text-white font-bold gap-2 px-5 py-2.5 h-11 self-start sm:self-center shrink-0 shadow-lg shadow-primary/20"
          >
            <PlusCircle size={18} />
            Lançar Despesa
          </Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Receita Realizada */}
        <Card className="glass-card border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/2.5 rounded-full blur-[30px]" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Receitas Realizadas
            </CardTitle>
            <div className="rounded-lg p-2 border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <ArrowUpRight size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-400">
              {formatBRL(kpis.totalReceitas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de receitas entradas no caixa</p>
          </CardContent>
        </Card>

        {/* Despesa Realizada */}
        <Card className="glass-card border-white/5 relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/2.5 rounded-full blur-[30px]" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Despesas Pagas
            </CardTitle>
            <div className="rounded-lg p-2 border bg-red-500/10 border-red-500/20 text-red-400">
              <ArrowDownRight size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-red-400">
              {formatBRL(kpis.totalDespesas)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Custos operacionais e administrativos</p>
          </CardContent>
        </Card>

        {/* Saldo Operacional */}
        <Card className="glass-card border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/2.5 rounded-full blur-[30px]" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Saldo Atual em Caixa
            </CardTitle>
            <div className="rounded-lg p-2 border bg-primary/10 border-primary/20 text-primary">
              <DollarSign size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tracking-tight ${kpis.saldoAtual >= 0 ? "text-primary" : "text-red-400"}`}>
              {formatBRL(kpis.saldoAtual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Disponibilidade financeira líquida</p>
          </CardContent>
        </Card>

        {/* Projeção Financeira */}
        <Card className="glass-card border-white/5 relative overflow-hidden group hover:border-cyan-400/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/2.5 rounded-full blur-[30px]" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Saldo Projetado
            </CardTitle>
            <div className="rounded-lg p-2 border bg-cyan-400/10 border-cyan-400/20 text-cyan-400">
              <Layers size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-cyan-400">
              {formatBRL(kpis.saldoProjetado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saldo atual + parcelas a receber</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Consolidados */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Comparativo Fluxo de Caixa */}
        <Card className="glass-card border-white/5 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Fluxo de Caixa Mensal
            </CardTitle>
            <CardDescription>Visualização comparativa de Receitas vs Despesas realizadas por competência de mês</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pb-2">
            {chartCashFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCashFlow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatBRL(Number(value)),
                      name === "receitas" ? "Receitas" : "Despesas",
                    ]}
                    contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                Nenhum lançamento no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Divisão de Despesas */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-400" /> Distribuição de Despesas
            </CardTitle>
            <CardDescription>Participação de despesas pagas por categoria</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center pb-2">
            {chartCategories.length > 0 ? (
              <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={chartCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatBRL(Number(value)), "Desembolso"]}
                      contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legendas customizadas simples */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] text-muted-foreground mt-1 max-h-[20%] overflow-y-auto">
                  {chartCategories.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[80px]" title={c.name}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs flex flex-col items-center gap-2 text-center">
                <AlertCircle size={24} className="text-muted-foreground/55" />
                Nenhuma despesa registrada para detalhar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principais: Livro de Caixa vs Parcelas */}
      <Tabs defaultValue="caixa" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-secondary/35 border border-border/50 rounded-lg p-1">
          <TabsTrigger value="caixa" className="text-xs font-semibold py-2">
            Livro de Caixa (Geral)
          </TabsTrigger>
          <TabsTrigger value="parcelas" className="text-xs font-semibold py-2">
            Parcelas e Recebíveis
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Livro de Caixa */}
        <TabsContent value="caixa" className="mt-4 space-y-4">
          {/* Barra de Filtros Livro de Caixa */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 border border-border/40 p-4 rounded-xl">
            <div className="flex flex-1 w-full md:w-auto items-center gap-3 bg-secondary/20 border border-border/60 px-3 py-1.5 rounded-lg">
              <Search className="text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Buscar por descrição ou categoria..."
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-full"
              />
            </div>
            
            <div className="flex flex-wrap w-full md:w-auto items-center gap-3 self-end md:self-center">
              <div className="flex items-center gap-2">
                <Filter className="text-muted-foreground" size={14} />
                <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
              </div>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger className="w-[120px] h-9 text-xs bg-secondary/25 border-border">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="RECEITA">Receitas</SelectItem>
                  <SelectItem value="DESPESA">Despesas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={entryCategory} onValueChange={setEntryCategory}>
                <SelectTrigger className="w-[160px] h-9 text-xs bg-secondary/25 border-border">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL">Todas Categorias</SelectItem>
                  <SelectItem value="Entrada Veículo">Entrada Veículo</SelectItem>
                  <SelectItem value="Parcela Financiamento">Parcela Financiamento</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="rounded-xl border border-border/40 bg-card/25 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/25 text-muted-foreground font-semibold uppercase tracking-wider h-11">
                    <th className="px-5">Data</th>
                    <th className="px-5">Tipo</th>
                    <th className="px-5">Categoria</th>
                    <th className="px-5">Descrição</th>
                    <th className="px-5 text-right">Valor</th>
                    {userRole === "admin" && <th className="px-5 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEntries.length > 0 ? (
                    filteredEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-secondary/10 h-12 transition-colors">
                        <td className="px-5 font-medium whitespace-nowrap">{formatDate(e.entry_date)}</td>
                        <td className="px-5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              e.type === "RECEITA"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                          >
                            <span className={`h-1 w-1 rounded-full ${e.type === "RECEITA" ? "bg-emerald-400" : "bg-red-400"}`} />
                            {e.type}
                          </span>
                        </td>
                        <td className="px-5 font-semibold text-muted-foreground">{e.category}</td>
                        <td className="px-5 font-medium text-foreground max-w-sm truncate" title={e.description}>
                          {e.description}
                        </td>
                        <td className={`px-5 text-right font-bold text-sm ${e.type === "RECEITA" ? "text-emerald-400" : "text-red-400"}`}>
                          {e.type === "RECEITA" ? "+" : "-"} {formatBRL(e.amount)}
                        </td>
                        {userRole === "admin" && (
                          <td className="px-5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteEntryPrompt(e)}
                              title="Excluir Lançamento"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={userRole === "admin" ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        Nenhum lançamento financeiro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Cronograma de Parcelas / Contas a Receber */}
        <TabsContent value="parcelas" className="mt-4 space-y-4">
          {/* Filtros Parcelas */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 border border-border/40 p-4 rounded-xl">
            <div className="flex flex-1 w-full md:w-auto items-center gap-3 bg-secondary/20 border border-border/60 px-3 py-1.5 rounded-lg">
              <Search className="text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente, contrato ou veículo..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-full"
              />
            </div>
            
            <div className="flex items-center gap-3 self-end md:self-center">
              <div className="flex items-center gap-2">
                <Filter className="text-muted-foreground" size={14} />
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
              </div>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary/25 border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendentes</SelectItem>
                  <SelectItem value="PAGO">Pagos</SelectItem>
                  <SelectItem value="ATRASADO">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Parcelas */}
          <div className="rounded-xl border border-border/40 bg-card/25 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/25 text-muted-foreground font-semibold uppercase tracking-wider h-11">
                    <th className="px-5">Contrato</th>
                    <th className="px-5">Comprador</th>
                    <th className="px-5">Veículo</th>
                    <th className="px-5">Nº Parcela</th>
                    <th className="px-5">Vencimento</th>
                    <th className="px-5">Status</th>
                    <th className="px-5">Forma / Pagamento</th>
                    <th className="px-5 text-right">Valor</th>
                    <th className="px-5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((p) => {
                      const isDownPayment = p.installment_number === 0;
                      return (
                        <tr key={p.id} className="hover:bg-secondary/10 h-12 transition-colors">
                          <td className="px-5 font-semibold text-primary whitespace-nowrap">
                            #{p.contract?.contract_number || "N/A"}
                          </td>
                          <td className="px-5 font-medium text-foreground whitespace-nowrap">
                            {p.contract?.client?.name || "Desconhecido"}
                          </td>
                          <td className="px-5 text-muted-foreground whitespace-nowrap">
                            {p.contract?.vehicle ? `${p.contract.vehicle.brand} ${p.contract.vehicle.model}` : "N/A"}
                          </td>
                          <td className="px-5 font-semibold">
                            {p.is_refund ? (
                              <span className="text-blue-400 font-bold">Volta (Troco)</span>
                            ) : isDownPayment ? (
                              <span className="text-cyan-400 font-bold">Entrada (Sinal)</span>
                            ) : (
                              `Parc. ${p.installment_number}/${p.contract?.installments_count || 1}`
                            )}
                          </td>
                          <td className="px-5 font-medium whitespace-nowrap">{formatDate(p.due_date)}</td>
                          <td className="px-5">{getPaymentStatusBadge(p.status)}</td>
                          <td className="px-5 whitespace-nowrap">
                            {p.status === "PAGO" ? (
                              <span className="text-foreground">
                                {getMethodLabel(p.payment_method)} em {formatDate(p.paid_at)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-5 text-right font-bold text-sm text-foreground">
                            {formatBRL(p.amount)}
                          </td>
                          <td className="px-5 text-center">
                            {(p.status === "PENDENTE" || p.status === "ATRASADO") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenConfirmDialog(p)}
                                className="h-7 text-[10px] font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15"
                              >
                                Dar Baixa
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma parcela encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          DIÁLOGO: LANÇAMENTO DE DESPESA
         ========================================================================= */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="bg-card border-border max-w-md text-foreground">
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-primary uppercase tracking-wider">
                Registrar Nova Despesa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Insira os dados do pagamento efetuado para controle do livro de caixa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-2">
              <div className="space-y-1">
                <Label htmlFor="expense-amount" className="text-xs font-bold text-muted-foreground">
                  Valor da Despesa (R$)*
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                    R$
                  </span>
                  <Input
                    id="expense-amount"
                    placeholder="0,00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="pl-9 bg-secondary/15 border-border h-10 text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="expense-category" className="text-xs font-bold text-muted-foreground">
                  Categoria da Despesa*
                </Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(val) => setExpenseForm((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger id="expense-category" className="bg-secondary/15 border-border h-10 text-sm">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="expense-date" className="text-xs font-bold text-muted-foreground">
                  Data do Lançamento*
                </Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseForm.entry_date}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, entry_date: e.target.value }))}
                  className="bg-secondary/15 border-border h-10 text-sm focus-visible:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="expense-desc" className="text-xs font-bold text-muted-foreground">
                  Descrição / Histórico*
                </Label>
                <textarea
                  id="expense-desc"
                  placeholder="Ex: Pagamento de conta de energia da loja principal"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-[70px] rounded-lg border border-border bg-secondary/15 p-3 text-sm focus-visible:ring-primary text-foreground outline-none resize-none"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border/30 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsExpenseOpen(false)}
                className="text-xs h-9 border border-border text-muted-foreground hover:bg-secondary/40"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingExpense}
                className="text-xs h-9 bg-primary hover:bg-primary/95 text-white font-bold px-4"
              >
                {isSubmittingExpense ? "Registrando..." : "Registrar Saída"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIÁLOGO: CONFIRMAÇÃO DE RECEBIMENTO DE PARCELA
         ========================================================================= */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-sm text-foreground">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <FileCheck size={18} /> Confirmar Recebimento
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Você está dando baixa no pagamento de uma parcela contrátil. Escolha o método de recebimento efetuado.
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="bg-secondary/15 border border-border/40 p-3.5 rounded-lg space-y-2.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Contrato:</span>
                  <span className="font-bold text-foreground">#{selectedPayment.contract?.contract_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comprador:</span>
                  <span className="font-semibold text-foreground truncate max-w-[180px]">
                    {selectedPayment.contract?.client?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Referente a:</span>
                  <span className="font-semibold text-foreground">
                    {selectedPayment.is_refund ? "Devolução de Troco/Volta" : selectedPayment.installment_number === 0 ? "Entrada" : `Parcela ${selectedPayment.installment_number}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-2 text-sm">
                  <span className="font-bold text-foreground font-semibold">
                    {selectedPayment.is_refund ? "Valor a Pagar (Volta):" : "Valor a Receber:"}
                  </span>
                  <span className={`font-extrabold ${selectedPayment.is_refund ? "text-blue-400" : "text-emerald-400"}`}>
                    {formatBRL(selectedPayment.amount)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5 my-2">
              <Label htmlFor="confirm-method" className="text-xs font-bold text-muted-foreground">
                Forma de Recebimento*
              </Label>
              <Select
                value={confirmPayMethod}
                onValueChange={(val) => setConfirmPayMethod(val as PaymentMethod)}
              >
                <SelectTrigger id="confirm-method" className="bg-secondary/15 border-border h-10 text-sm">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="pix">Pix (Transferência instantânea)</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                  <SelectItem value="transferencia_bancaria">TED / DOC / Transferência Bancária</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="boleto">Boleto Bancário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 border-t border-border/30 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsConfirmOpen(false)}
                className="text-xs h-9 border border-border text-muted-foreground hover:bg-secondary/40"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isSubmittingConfirm}
                className={`text-xs h-9 font-bold px-4 ${
                  selectedPayment?.is_refund 
                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {isSubmittingConfirm ? "Processando..." : selectedPayment?.is_refund ? "Confirmar Volta Paga" : "Confirmar Recebido"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excluir Lançamento confirmation Dialog */}
      <Dialog open={isDeleteEntryOpen} onOpenChange={setIsDeleteEntryOpen}>
        <DialogContent className="bg-card border-border max-w-md text-foreground">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-destructive uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={18} /> Excluir Lançamento Financeiro
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Atenção! Esta ação removerá definitivamente o lançamento do fluxo de caixa.
              </DialogDescription>
            </DialogHeader>

            {selectedEntry && (
              <div className="bg-secondary/15 border border-border/40 p-3.5 rounded-lg space-y-2.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Descrição:</span>
                  <span className="font-bold text-foreground truncate max-w-[240px]" title={selectedEntry.description}>
                    {selectedEntry.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Categoria:</span>
                  <span className="font-semibold text-foreground">{selectedEntry.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data:</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedEntry.entry_date)}</span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-2 text-sm">
                  <span className="font-bold text-foreground font-semibold">Valor:</span>
                  <span className={`font-extrabold ${selectedEntry.type === "RECEITA" ? "text-emerald-400" : "text-red-400"}`}>
                    {selectedEntry.type === "RECEITA" ? "+" : "-"} {formatBRL(selectedEntry.amount)}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-border/30 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteEntryOpen(false)}
                className="text-xs h-9 border border-border text-muted-foreground hover:bg-secondary/40"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDeleteEntry}
                disabled={isDeletingEntry}
                className="text-xs h-9 font-bold px-4 bg-destructive hover:bg-destructive/95 text-white"
              >
                {isDeletingEntry ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
