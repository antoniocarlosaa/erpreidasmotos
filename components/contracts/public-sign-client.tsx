"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Contract, Signature } from "@/types";
import { getPublicContractSignatures, signPublicContract, generateContractPDF } from "@/actions/contractActions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  User,
  Car,
  FileText,
  DollarSign,
  PenTool,
  Printer,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Smartphone,
  ShieldCheck
} from "lucide-react";
import { formatCPF } from "@/utils/validators";
import { formatCurrency, formatDate, formatDateTime, formatMileage } from "@/utils/formatters";

interface PublicSignClientProps {
  contract: Contract;
  initialSignatures: Signature[];
}

export function PublicSignClient({ contract, initialSignatures }: PublicSignClientProps) {
  const router = useRouter();
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  
  const [signedSuccessfully, setSignedSuccessfully] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch signatures in real-time
  const { data: signatures = [] } = useQuery({
    queryKey: ["public-signatures", contract.id],
    queryFn: () => getPublicContractSignatures(contract.id),
    initialData: initialSignatures,
  });

  const buyerSignature = signatures.find((s) => s.role === "comprador");
  const sellerSignature = signatures.find((s) => s.role === "vendedor");

  const signMutation = useMutation({
    mutationFn: (params: Parameters<typeof signPublicContract>[0]) => signPublicContract(params),
    onSuccess: () => {
      setSignedSuccessfully(true);
      router.refresh();
    },
  });

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSignSave = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      alert("Por favor, faça seu desenho de assinatura no quadro.");
      return;
    }

    const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");

    let ipAddress = "127.0.0.1";
    let location = "Assinatura via Link Móvel";

    try {
      // Obter IP público
      const resIp = await fetch("https://api.ipify.org?format=json");
      const dataIp = await resIp.json();
      ipAddress = dataIp.ip;

      // Opcional: obter localização aproximada com base no IP
      try {
        const resLoc = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const dataLoc = await resLoc.json();
        if (dataLoc.city && dataLoc.region) {
          location = `${dataLoc.city}, ${dataLoc.region} - ${dataLoc.country_name}`;
        }
      } catch (locErr) {
        console.log("Could not obtain location from IP, using fallback");
      }
    } catch (e) {
      console.log("Error obtaining IP, using default fallback");
    }

    await signMutation.mutateAsync({
      contract_id: contract.id,
      signature_data: dataUrl,
      ip_address: ipAddress,
      user_agent: navigator.userAgent,
      location: location,
    });
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

  const isClientSigned = contract.modality === "compra" ? sellerSignature : buyerSignature;

  // Se já assinou agora ou se a assinatura já constava no banco
  if (signedSuccessfully || isClientSigned) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center p-4">
        <Card className="glass-card border-emerald-500/20 max-w-md w-full text-center p-6 space-y-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={36} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Assinatura Registrada!</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Sua assinatura digital foi colhida e carimbada com sucesso.
              </CardDescription>
            </div>
          </div>

          <div className="border border-border/40 rounded-lg p-4 bg-zinc-950/60 text-left text-xs space-y-2">
            <p className="font-semibold text-foreground border-b border-border/20 pb-1.5 mb-2">Comprovante de Assinatura</p>
            <p><span className="text-muted-foreground">Documento:</span> Contrato de Venda #{contract.contract_number}</p>
            <p><span className="text-muted-foreground">Comprador:</span> {contract.client?.name}</p>
            <p><span className="text-muted-foreground">CPF:</span> {contract.client?.cpf ? formatCPF(contract.client.cpf) : "N/A"}</p>
            {buyerSignature && (
              <>
                <p><span className="text-muted-foreground">IP Registrado:</span> {buyerSignature.ip_address}</p>
                <p><span className="text-muted-foreground">Assinado em:</span> {formatDateTime(buyerSignature.signed_at)}</p>
                {buyerSignature.location && <p><span className="text-muted-foreground">Localização:</span> {buyerSignature.location}</p>}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full gap-2 font-semibold"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              Baixar Contrato em PDF
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Você pode baixar uma cópia assinada deste documento a qualquer momento.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      {/* Top Header Logo */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 pb-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-black text-sm uppercase">
            {((contract.seller as any)?.company?.name || "Gerenciador").substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground uppercase">
              {(contract.seller as any)?.company?.name || "Gerenciador de Contratos"}
            </h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-[-2px]">
              Contratos & Transferências
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px] py-0.5 border-primary/30 text-primary bg-primary/5">
          <Smartphone size={10} /> Link Seguro
        </Badge>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Contract Preview (3 columns) */}
        <div className="md:col-span-3 space-y-6">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <FileText size={16} /> Revisão do {
                  contract.modality === "vista" 
                    ? "Recibo Venda de Veículo Usado" 
                    : contract.modality === "compra_venda" 
                    ? "Recibo Compra e Venda de Veículo" 
                    : contract.modality === "compra"
                    ? "Recibo de Compra de Veículo"
                    : contract.modality === "repasse"
                    ? "Termo de Compra e Venda (Repasse)"
                    : "Contrato de Venda de Veículo"
                }
              </CardTitle>
              <CardDescription className="text-xs">
                Por favor, verifique atentamente todas as informações antes de assinar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-5 leading-relaxed text-muted-foreground">
              
              {/* Partes */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-foreground text-xs uppercase flex items-center gap-1.5">
                  <User size={12} className="text-primary" /> 1. Partes Contratantes
                </h3>
                <div className="bg-black/30 border border-border/20 rounded-lg p-3 space-y-1">
                  <p>
                    <strong className="text-foreground">
                      {contract.modality === "compra" ? "COMPRADOR (LOJA):" : "VENDEDOR (LOJA):"}
                    </strong>{" "}
                    {(contract.seller as any)?.company?.name 
                      ? `${(contract.seller as any).company.name} (Representado por ${contract.seller?.name})`
                      : contract.seller?.name || "Gerenciador de Contratos"}
                  </p>
                  <p>
                    <strong className="text-foreground">
                      {contract.modality === "compra" ? "VENDEDOR (CLIENTE):" : "COMPRADOR (CLIENTE):"}
                    </strong>{" "}
                    {contract.client?.name}
                  </p>
                  <p>CPF: <span className="font-mono">{contract.client ? formatCPF(contract.client.cpf) : ""}</span></p>
                  {contract.client?.email && <p>E-mail: {contract.client.email}</p>}
                </div>
              </div>

              {/* Objeto */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-foreground text-xs uppercase flex items-center gap-1.5">
                  <Car size={12} className="text-primary" /> 2. Objeto do Contrato
                </h3>
                <div className="bg-black/30 border border-border/20 rounded-lg p-3 space-y-1">
                  <p className="text-foreground font-semibold">
                    {contract.vehicle?.brand} {contract.vehicle?.model}
                  </p>
                  <p>Ano: {contract.vehicle?.year} | Cor: <span className="capitalize">{contract.vehicle?.color}</span></p>
                  <p>Placa: <span className="font-mono uppercase font-semibold">{contract.vehicle?.plate}</span></p>
                  <p>Quilometragem: {contract.vehicle ? formatMileage(contract.vehicle.mileage) : ""}</p>
                </div>
              </div>

              {/* Preço e condições */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-foreground text-xs uppercase flex items-center gap-1.5">
                  <DollarSign size={12} className="text-primary" /> 3. Valores e Pagamento
                </h3>
                <div className="bg-black/30 border border-border/20 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between border-b border-border/10 pb-1.5">
                    <span>Valor Total da Venda</span>
                    <strong className="text-foreground">{formatCurrency(contract.total_value)}</strong>
                  </div>
                  {contract.down_payment > 0 && (
                    <div className="flex justify-between border-b border-border/10 pb-1.5">
                      <span>Sinal / Entrada</span>
                      <strong className="text-emerald-400">{formatCurrency(contract.down_payment)}</strong>
                    </div>
                  )}
                  {contract.installments_count > 0 && (
                    <div className="flex justify-between border-b border-border/10 pb-1.5">
                      <span>Financiamento</span>
                      <span>{contract.installments_count} parcelas mensais</span>
                    </div>
                  )}
                  {contract.interest_rate > 0 && (
                    <div className="flex justify-between">
                      <span>Taxa de Juros</span>
                      <span>{contract.interest_rate}% a.m.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Garantia */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-foreground text-xs uppercase flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-primary" /> 4. Termo de Garantia
                </h3>
                <p className="italic bg-black/20 p-2.5 rounded border border-border/20">
                  {contract.warranty_text || 
                    "Garantia legal de 90 dias para motor e caixa de câmbio, em conformidade com o Código de Defesa do Consumidor."}
                </p>
              </div>

              {/* Cláusulas específicas */}
              {contract.custom_clauses && contract.custom_clauses.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-bold text-foreground text-xs uppercase flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-primary" /> 5. Cláusulas Adicionais
                  </h3>
                  <ol className="list-decimal pl-4 space-y-1">
                    {contract.custom_clauses.map((clause, idx) => (
                      <li key={idx} className="pl-1">{clause}</li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Signature Pad Card (2 columns) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card border-primary/20 bg-card/60 shadow-lg shadow-primary/5 sticky top-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <PenTool size={16} /> Assinatura Digital do Comprador
              </CardTitle>
              <CardDescription className="text-xs">
                Desenhe sua assinatura no quadro abaixo usando o dedo ou caneta stylus.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Assine aqui:</Label>
                <div className="border border-border/40 rounded-lg bg-white overflow-hidden aspect-[4/3] w-full max-w-[380px] mx-auto">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="black"
                    canvasProps={{
                      className: "signature-pad w-full h-full cursor-crosshair",
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs bg-zinc-900 border-border/40"
                  onClick={handleClearSignature}
                >
                  Limpar
                </Button>
                <Button
                  type="button"
                  className="flex-1 text-xs font-semibold"
                  onClick={handleSignSave}
                  disabled={signMutation.isPending}
                >
                  {signMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : (
                    <Check size={14} className="mr-1" />
                  )}
                  Assinar Contrato
                </Button>
              </div>

              <div className="border-t border-border/20 pt-4 text-[10px] text-muted-foreground space-y-2.5 leading-normal">
                <div className="flex items-start gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Assinatura Eletrônica Legal:</strong> Em conformidade com a MP nº 2.200-2/2001 e a Lei nº 14.063/2020.
                  </p>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded border border-border/30 font-mono space-y-1">
                  <p className="text-primary font-bold">DADOS DE AUDITORIA:</p>
                  <p>Navegador: Chrome / Mobile Safari</p>
                  <p>Coleta de IP: Automática com geolocalização</p>
                  <p>Timestamp: Horário oficial de Brasília</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
