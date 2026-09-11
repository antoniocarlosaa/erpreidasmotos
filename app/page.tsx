"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/actions/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Lock, Mail, AlertCircle, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("senha_teste_123");

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
      }
    } catch (err: any) {
      setError(err.message || "Erro inesperado ao entrar.");
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-primary via-cyan-400 to-indigo-400 bg-clip-text text-transparent text-center uppercase leading-tight font-sans">
          MEU ESTOQUE V1.9
        </h1>
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground/80 text-center uppercase max-w-md mt-1">
          GERENCIADOR DE ESTOQUE, VENDAS E POS VENDA
        </p>
      </div>

      {/* Login container */}
      <div className="w-full max-w-md z-10">
            <Card className="glass-card shadow-2xl border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Acessar o Sistema</CardTitle>
                <CardDescription>Insira suas credenciais para acessar o painel.</CardDescription>
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
                        placeholder="nome@reidasmotos.com.br"
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

      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-[10px] text-muted-foreground/45 font-medium z-10 space-y-1">
        <p className="font-semibold tracking-wider text-muted-foreground/60 uppercase">
          MEU ESTOQUE V1.9 (GERENCIADOR DE ESTOQUE, VENDAS E POS VENDA)
        </p>
        <p>
          CRIADOR ANTONIO CARLOS &bull; CONTATO: 98 98148-9667 &bull; EMAIL: ANTONIOCARLOSAANDRADE@GMAIL.COM
        </p>
      </div>
    </div>
  );
}
