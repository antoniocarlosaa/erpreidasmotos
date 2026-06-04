"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Lock, Mail, User, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("senha_teste_123");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("vendedor");

  const mockUsers = [
    {
      role: "admin",
      label: "Administrador",
      email: "admin@autoprime.com.br",
      desc: "Acesso total aos relatórios, logs e configurações.",
    },
    {
      role: "vendedor",
      label: "Vendedor",
      email: "vendedor@autoprime.com.br",
      desc: "Gestão de veículos, clientes e contratos.",
    },
    {
      role: "operacional",
      label: "Operações",
      email: "operacional@autoprime.com.br",
      desc: "Acompanhamento de despachante e vistorias.",
    },
    {
      role: "financeiro",
      label: "Financeiro",
      email: "financeiro@autoprime.com.br",
      desc: "Reconciliação e fluxo de parcelas.",
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await login({ email: loginEmail, password: loginPassword });
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Login realizado com sucesso! Redirecionando...");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: registerRole,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Conta criada com sucesso! Você já pode entrar.");
        setLoginEmail(registerEmail);
        setLoginPassword(registerPassword);
        // Limpar campos
        setRegisterName("");
        setRegisterEmail("");
        setRegisterPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao registrar.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email: string) => {
    setLoginEmail(email);
    setLoginPassword("senha_teste_123");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-zinc-950 to-black">
      {/* Background visual accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center gap-2 mb-8 z-10">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <Car size={28} className="animate-pulse" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-primary via-cyan-400 to-indigo-400 bg-clip-text text-transparent text-center uppercase leading-tight">
          Gerenciador de Contratos
          <span className="block text-lg font-bold text-muted-foreground mt-1">e Transferências</span>
        </h1>
        <p className="text-xs text-muted-foreground font-medium text-center max-w-sm mt-1">
          Gestão Inteligente de Vendas, Contratos e Pós-Venda de Veículos
        </p>
      </div>

      {/* Tabs container */}
      <div className="w-full max-w-md z-10">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-zinc-900 border border-border/40 p-1 rounded-lg">
            <TabsTrigger value="login" className="rounded-md font-semibold text-sm">Entrar</TabsTrigger>
            <TabsTrigger value="register" className="rounded-md font-semibold text-sm">Criar Conta</TabsTrigger>
          </TabsList>

          {/* LOGIN CONTENT */}
          <TabsContent value="login">
            <Card className="glass-card shadow-2xl border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Acessar o Sistema</CardTitle>
                <CardDescription>Insira suas credenciais ou escolha um perfil de teste abaixo.</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={16} className="shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nome@empresa.com.br"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-9 bg-black/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Senha de acesso</Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-9 bg-black/40"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? "Entrando..." : "Entrar no Painel"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Test Accounts Quick Select */}
            <div className="mt-6 space-y-3">
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perfis de Teste Rápidos (Seed)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {mockUsers.map((mu) => (
                  <button
                    key={mu.role}
                    type="button"
                    onClick={() => fillCredentials(mu.email)}
                    className="flex flex-col text-left p-3 rounded-lg border border-border/40 bg-zinc-900/60 hover:bg-secondary/40 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-primary" />
                      {mu.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{mu.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* REGISTER CONTENT */}
          <TabsContent value="register">
            <Card className="glass-card shadow-2xl border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Registrar Conta</CardTitle>
                <CardDescription>Cadastre-se para criar seu perfil corporativo no sistema.</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={16} className="shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="João da Silva"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="pl-9 bg-black/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">E-mail corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="nome@empresa.com.br"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-9 bg-black/40"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Senha de acesso (mínimo 6 chars)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-9 bg-black/40"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-role">Cargo / Perfil Operacional</Label>
                    <Select value={registerRole} onValueChange={setRegisterRole}>
                      <SelectTrigger className="bg-black/40">
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                        <SelectItem value="operacional">Operador / Pós-Venda</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? "Cadastrando..." : "Criar Conta Corporativa"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
