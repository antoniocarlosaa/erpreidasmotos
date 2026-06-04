"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  TrendingUp,
  DollarSign,
  Car,
  FileCheck,
  Activity,
  Clock,
  ShieldCheck,
  Zap,
  Wrench,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatMileage } from "@/utils/formatters";
import Link from "next/link";

interface DashboardClientProps {
  data: {
    kpis: {
      totalSold: number;
      finishedContractsCount: number;
      pendingContractsCount: number;
      pendingTransfersCount: number;
      pendingDownPaymentsCount: number;
      vehiclesInStock: number;
      vehiclesSold: number;
      ticketMedio: number;
      avgCompletionDays: string;
      activeWarranties: number;
      expiredWarranties: number;
      scheduledReviewsCount: number;
    };
    charts: {
      chartSales: Array<{ name: string; valor: number }>;
      chartStatus: Array<{ name: string; value: number }>;
      chartProjection: Array<{ name: string; valor: number }>;
      chartCashFlow: Array<{ name: string; receitas: number; despesas: number }>;
      chartCategory: Array<{ name: string; value: number }>;
      // Novos gráficos e dados do pós-venda
      chartWarranties: Array<{ name: string; value: number }>;
      chartReviews: Array<{ name: string; value: number }>;
      pendingReviewsList: Array<{
        id: string;
        contract_id: string;
        clientName: string;
        vehicleInfo: string;
        revisionNumber: number;
        km_expected: number;
        status: string;
      }>;
      activeWarrantiesList: Array<{
        id: string;
        contract_id: string;
        contract_number: number;
        clientName: string;
        vehicleInfo: string;
        type: string;
        start_date: string;
        end_date: string;
        remainingDays: number;
        status: string;
      }>;
      recentContracts: Array<{
        id: string;
        contract_number: number;
        clientName: string;
        vehicleInfo: string;
        total_value: number;
        modality: string;
        status: string;
        created_at: string;
      }>;
      recentTransactions: Array<{
        id: string;
        description: string;
        amount: number;
        type: string;
        category: string;
        entry_date: string;
        payment_method: string;
      }>;
    };
  };
}

const COLORS = ["#00f0ff", "#a855f7", "#3b82f6", "#e11d48", "#10b981", "#f59e0b"];
const WARRANTY_COLORS = ["#10b981", "#ef4444"];
const REVIEW_COLORS = ["#f59e0b", "#3b82f6"];

export function DashboardClient({ data }: DashboardClientProps) {
  const { kpis, charts } = data;

  const kpiCards = [
    {
      title: "Faturamento Total",
      value: formatBRL(kpis.totalSold),
      desc: "Receitas de contratos fechados",
      icon: DollarSign,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Ticket Médio",
      value: formatBRL(kpis.ticketMedio),
      desc: "Média por veículo vendido",
      icon: TrendingUp,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      title: "Estoque Disponível",
      value: `${kpis.vehiclesInStock} unid.`,
      desc: "Prontos para comercialização",
      icon: Car,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Vendas Concluídas",
      value: `${kpis.finishedContractsCount} contr.`,
      desc: "Transferência e entrega finalizadas",
      icon: FileCheck,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      title: "Em Transferência",
      value: `${kpis.pendingTransfersCount} proc.`,
      desc: "Fases operacionais e despachante",
      icon: Activity,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Garantias Ativas",
      value: `${kpis.activeWarranties} garantias`,
      desc: "Monitoramento de pós-venda",
      icon: ShieldCheck,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-zinc-900 via-zinc-950 to-black p-6 relative overflow-hidden glass-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px]" />
        <div className="flex flex-col gap-2 relative z-10">
          <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
            <Zap className="text-primary animate-pulse" size={24} />
            Visão Geral dos Negócios
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Acompanhe em tempo real o fluxo de vendas, prazos de transferência operacionais e prazos de garantia de pós-venda.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="glass-card border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/2.5 rounded-full blur-[30px] group-hover:bg-primary/5 transition-all" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 border ${card.color}`}>
                  <Icon size={16} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid - Vendas e Finanças */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Sales Area Chart */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Vendas Recentes
            </CardTitle>
            <CardDescription>Valor mensal de contratos fechados nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.chartSales} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  formatter={(value) => [formatBRL(Number(value)), "Vendas"]}
                  contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                  labelStyle={{ color: "#a1a1aa", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="valor" stroke="var(--primary)" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Realized Cash Flow Bar Chart */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Fluxo de Caixa Realizado
            </CardTitle>
            <CardDescription>Comparativo de Receitas vs Despesas realizadas nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.chartCashFlow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
          </CardContent>
        </Card>

        {/* Financial Receivables Projection */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> Projeção de Recebíveis
            </CardTitle>
            <CardDescription>Expectativa de entradas das parcelas a vencer nos próximos 4 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.chartProjection} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <Tooltip
                  formatter={(value) => [formatBRL(Number(value)), "A Receber"]}
                  contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                />
                <Line type="monotone" dataKey="valor" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Projeção" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Share Donut Chart */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-purple-400">
              <span className="h-2 w-2 rounded-full bg-purple-400" /> Vendas por Categoria
            </CardTitle>
            <CardDescription>Distribuição de veículos vendidos (Carro vs Moto)</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center pb-4">
            <div className="w-full h-[80%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.chartCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.chartCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} unidades`, "Quantidade"]}
                    contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW SECTION: Pós-Venda e CRM */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Wrench size={16} className="text-primary" />
          Acompanhamento do Pós-Venda & Garantias
        </h3>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Donut Garantias */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Garantias de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56 pb-2 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.chartWarranties}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.chartWarranties.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={WARRANTY_COLORS[index % WARRANTY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} garantias`, "Quantidade"]}
                    contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Revisões */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <Wrench size={14} className="text-amber-400" /> Status de Trocas de Óleo
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.chartReviews} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#ffffff08" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9} />
                  <YAxis stroke="#a1a1aa" fontSize={9} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value} trocas`, "Total"]}
                    contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[3, 3, 0, 0]}>
                    {charts.chartReviews.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={REVIEW_COLORS[index % REVIEW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lembretes de Revisão List */}
          <Card className="glass-card border-white/5 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <AlertCircle size={14} className="text-primary animate-pulse" />
                Lembretes da Próxima Troca de Óleo (Pós-Venda)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex-grow overflow-y-auto max-h-[220px]">
              {charts.pendingReviewsList.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground/40 py-12">Nenhuma troca de óleo pendente agendada.</div>
              ) : (
                <div className="space-y-3">
                  {charts.pendingReviewsList.map((rev) => (
                    <Link
                      key={rev.id}
                      href={`/contracts/${rev.contract_id}`}
                      className="block p-2 bg-black/30 border border-border/40 rounded hover:border-primary/40 transition-colors text-[10px] space-y-0.5 leading-snug"
                    >
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>Troca de Óleo #{rev.revisionNumber}</span>
                        <span className="text-[9px] text-primary">{formatMileage(rev.km_expected)} km</span>
                      </div>
                      <p className="text-muted-foreground font-sans truncate">Cliente: {rev.clientName}</p>
                      <p className="text-muted-foreground/60 font-sans truncate text-[9px]">Veículo: {rev.vehicleInfo}</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NEW SECTION: Transparência de Dados (Origem dos Gráficos) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Contratos Recentes */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" /> Contratos Recentes (Origem do Gráfico de Vendas)
            </CardTitle>
            <CardDescription>Os últimos 5 contratos gerados no sistema que alimentam o gráfico de vendas.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!charts.recentContracts || charts.recentContracts.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground/40 py-8 font-sans">Nenhum contrato recente cadastrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <th className="pb-2">Contrato</th>
                      <th className="pb-2">Cliente / Veículo</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {charts.recentContracts.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-2.5 font-bold">
                          <Link href={`/contracts/${c.id}`} className="text-primary hover:underline">
                            #{c.contract_number}
                          </Link>
                        </td>
                        <td className="py-2.5">
                          <div className="text-foreground font-sans font-semibold">{c.clientName}</div>
                          <div className="text-[9px] text-muted-foreground">{c.vehicleInfo}</div>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.modality === "compra" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                            {c.modality === "compra" ? "COMPRA" : "VENDA"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-foreground">
                          {formatBRL(c.total_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Garantias Ativas (Origem do KPI de Garantias) */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> Garantias Ativas (Origem do KPI de Garantias)
            </CardTitle>
            <CardDescription>As 5 garantias ativas mais recentes no pós-venda.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!charts.activeWarrantiesList || charts.activeWarrantiesList.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground/40 py-8 font-sans">Nenhuma garantia ativa cadastrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <th className="pb-2">Contrato</th>
                      <th className="pb-2">Cliente / Veículo</th>
                      <th className="pb-2">Vencimento</th>
                      <th className="pb-2 text-right">Prazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {charts.activeWarrantiesList.map((w) => (
                      <tr key={w.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-2.5 font-bold">
                          <Link href={`/contracts/${w.contract_id}`} className="text-primary hover:underline">
                            #{w.contract_number}
                          </Link>
                        </td>
                        <td className="py-2.5">
                          <div className="text-foreground font-sans font-semibold">{w.clientName}</div>
                          <div className="text-[9px] text-muted-foreground">{w.vehicleInfo}</div>
                        </td>
                        <td className="py-2.5 text-foreground font-sans">
                          {w.end_date}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${w.remainingDays <= 15 ? "text-rose-400" : "text-emerald-400"}`}>
                          {w.remainingDays} dias
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lançamentos Financeiros Recentes */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Fluxo de Caixa Recente (Origem do Gráfico de Caixa)
            </CardTitle>
            <CardDescription>As últimas 5 movimentações no livro de caixa que alimentam o gráfico comparativo.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!charts.recentTransactions || charts.recentTransactions.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground/40 py-8 font-sans">Nenhuma movimentação financeira recente.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <th className="pb-2">Data</th>
                      <th className="pb-2">Descrição / Categoria</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {charts.recentTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-2.5 text-muted-foreground">
                          {t.entry_date}
                        </td>
                        <td className="py-2.5">
                          <div className="text-foreground font-sans font-semibold">{t.description}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">{t.category} {t.payment_method ? `• ${t.payment_method}` : ""}</div>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.type === "RECEITA" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-bold ${t.type === "RECEITA" ? "text-emerald-400" : "text-red-400"}`}>
                          {t.type === "RECEITA" ? "+" : "-"}{formatBRL(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
