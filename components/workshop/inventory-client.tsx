"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWorkshopProducts,
  saveWorkshopProduct,
  deleteWorkshopProduct,
  registerStockEntry,
  registerStockExit,
  getStockEntries,
  getStockExits
} from "@/actions/workshopActions";
import {
  WorkshopProduct,
  WorkshopEntry,
  WorkshopExit
} from "@/types";
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
  Coins,
  Package,
  Plus,
  Search,
  Trash2,
  Edit2,
  Loader2,
  AlertTriangle,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Archive,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/formatters";

interface InventoryClientProps {
  initialProducts: WorkshopProduct[];
  initialEntries: WorkshopEntry[];
  initialExits: WorkshopExit[];
  userProfile: {
    name: string;
    role: string;
  };
}

export function InventoryClient({
  initialProducts,
  initialEntries,
  initialExits,
  userProfile
}: InventoryClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pecas");
  const [search, setSearch] = useState("");

  // Product Query
  const { data: products = [] } = useQuery({
    queryKey: ["workshopProducts"],
    queryFn: () => getWorkshopProducts(),
    initialData: initialProducts,
  });

  // Entries Query
  const { data: entries = [] } = useQuery({
    queryKey: ["stockEntries"],
    queryFn: () => getStockEntries(),
    initialData: initialEntries,
  });

  // Exits Query
  const { data: exits = [] } = useQuery({
    queryKey: ["stockExits"],
    queryFn: () => getStockExits(),
    initialData: initialExits,
  });

  // Dialog States
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form States - Product
  const [selectedProduct, setSelectedProduct] = useState<WorkshopProduct | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodVehicle, setProdVehicle] = useState("");
  const [prodCategory, setProdCategory] = useState("Motor");
  const [prodStock, setProdStock] = useState("0");
  const [prodUnitValue, setProdUnitValue] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Form States - Entry (Compra)
  const [entryProductId, setEntryProductId] = useState("");
  const [entryQty, setEntryQty] = useState("1");
  const [entryInvoiceValue, setEntryInvoiceValue] = useState("");
  const [entryInvoiceNumber, setEntryInvoiceNumber] = useState("");
  const [entryBuyer, setEntryBuyer] = useState(userProfile.name);
  const [entryStore, setEntryStore] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  // Form States - Exit (Consumo)
  const [exitRecipient, setExitRecipient] = useState("");
  const [exitDestination, setExitDestination] = useState("Oficina");
  const [exitDate, setExitDate] = useState(new Date().toISOString().split("T")[0]);
  const [exitItems, setExitItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 }
  ]);
  const [isSavingExit, setIsSavingExit] = useState(false);

  // Filter products by search query
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.vehicleModel.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Product Mutations
  const saveProductMutation = useMutation({
    mutationFn: (data: any) => saveWorkshopProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopProducts"] });
      setIsProductOpen(false);
      resetProductForm();
      router.refresh();
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => deleteWorkshopProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopProducts"] });
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      router.refresh();
    }
  });

  // Entry Mutation
  const saveEntryMutation = useMutation({
    mutationFn: (data: any) => registerStockEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopProducts"] });
      queryClient.invalidateQueries({ queryKey: ["stockEntries"] });
      setIsEntryOpen(false);
      resetEntryForm();
      router.refresh();
    }
  });

  // Exit Mutation
  const saveExitMutation = useMutation({
    mutationFn: (data: any) => registerStockExit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshopProducts"] });
      queryClient.invalidateQueries({ queryKey: ["stockExits"] });
      setIsExitOpen(false);
      resetExitForm();
      router.refresh();
    }
  });

  // Helpers
  const resetProductForm = () => {
    setSelectedProduct(null);
    setProdName("");
    setProdVehicle("");
    setProdCategory("Motor");
    setProdStock("0");
    setProdUnitValue("");
  };

  const resetEntryForm = () => {
    setEntryProductId("");
    setEntryQty("1");
    setEntryInvoiceValue("");
    setEntryInvoiceNumber("");
    setEntryStore("");
    setEntryDate(new Date().toISOString().split("T")[0]);
  };

  const resetExitForm = () => {
    setExitRecipient("");
    setExitDestination("Oficina");
    setExitDate(new Date().toISOString().split("T")[0]);
    setExitItems([{ productId: "", quantity: 1 }]);
  };

  const handleOpenNewProduct = () => {
    resetProductForm();
    setIsProductOpen(true);
  };

  const handleOpenEditProduct = (prod: WorkshopProduct) => {
    setSelectedProduct(prod);
    setProdName(prod.name);
    setProdVehicle(prod.vehicleModel);
    setProdCategory(prod.category);
    setProdStock(String(prod.stock));
    setProdUnitValue(String(prod.unitValue));
    setIsProductOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodVehicle || !prodUnitValue) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSavingProduct(true);
    try {
      await saveProductMutation.mutateAsync({
        id: selectedProduct?.id,
        name: prodName,
        vehicleModel: prodVehicle,
        category: prodCategory,
        stock: Number(prodStock),
        unitValue: Number(prodUnitValue),
      });
      alert("Peça salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProductPrompt = (prod: WorkshopProduct) => {
    setSelectedProduct(prod);
    setIsDeleteOpen(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProductMutation.mutateAsync(selectedProduct.id);
      alert("Peça removida com sucesso do estoque!");
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryProductId || !entryQty || !entryInvoiceNumber || !entryInvoiceValue) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSavingEntry(true);
    try {
      await saveEntryMutation.mutateAsync({
        productId: entryProductId,
        quantity: Number(entryQty),
        invoiceValue: Number(entryInvoiceValue),
        invoiceNumber: entryInvoiceNumber,
        buyerName: entryBuyer,
        storeName: entryStore,
        date: entryDate,
      });
      alert("Entrada de estoque registrada e saldo atualizado!");
    } catch (err: any) {
      alert("Erro ao registrar: " + err.message);
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleSaveExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitRecipient || !exitDestination) {
      alert("Preencha o destinatário e o destino.");
      return;
    }

    // Validar itens
    const invalidItem = exitItems.some((item) => !item.productId || Number(item.quantity) <= 0);
    if (invalidItem) {
      alert("Selecione os produtos e preencha quantidades maiores que zero.");
      return;
    }

    setIsSavingExit(true);
    try {
      await saveExitMutation.mutateAsync({
        recipient: exitRecipient,
        destination: exitDestination,
        date: exitDate,
        items: exitItems,
      });
      alert("Saída de estoque registrada com sucesso!");
    } catch (err: any) {
      alert("Erro ao registrar saída: " + err.message);
    } finally {
      setIsSavingExit(false);
    }
  };

  const handleAddExitItemField = () => {
    setExitItems([...exitItems, { productId: "", quantity: 1 }]);
  };

  const handleRemoveExitItemField = (index: number) => {
    if (exitItems.length === 1) return;
    setExitItems(exitItems.filter((_, idx) => idx !== index));
  };

  const handleExitItemChange = (index: number, field: string, val: any) => {
    setExitItems(
      exitItems.map((item, idx) => {
        if (idx === index) {
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Archive className="text-primary" /> Estoque de Peças e Acessórios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie o almoxarifado da sua oficina: cadastre peças, registre notas de entrada e consumo operacional.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsExitOpen(true)} className="gap-1.5 text-xs h-9 bg-card border-red-500/20 text-red-400 hover:bg-red-950/20">
            <ArrowDownLeft size={14} /> Registrar Consumo (Saída)
          </Button>
          <Button variant="outline" onClick={() => setIsEntryOpen(true)} className="gap-1.5 text-xs h-9 bg-card border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/20">
            <ArrowUpRight size={14} /> Registrar Compra (Entrada)
          </Button>
          <Button onClick={handleOpenNewProduct} className="gap-1.5 text-xs h-9 font-semibold">
            <Plus size={14} /> Cadastrar Nova Peça
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full max-w-lg bg-zinc-900 border border-border/40 p-1 rounded-lg h-auto gap-1">
          <TabsTrigger value="pecas" className="rounded-md font-semibold text-xs gap-1.5">
            <Package size={14} /> Saldo de Peças
          </TabsTrigger>
          <TabsTrigger value="entradas" className="rounded-md font-semibold text-xs gap-1.5">
            <ArrowUpRight size={14} /> Histórico de Entradas
          </TabsTrigger>
          <TabsTrigger value="saidas" className="rounded-md font-semibold text-xs gap-1.5">
            <ArrowDownLeft size={14} /> Histórico de Consumo
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SALDO DE PEÇAS */}
        <TabsContent value="pecas" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por peça, aplicação ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/60"
            />
          </div>

          <Card className="glass-card border-white/5">
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="font-semibold">Peça / Produto</TableHead>
                    <TableHead className="font-semibold">Categoria</TableHead>
                    <TableHead className="font-semibold">Modelo Aplicado</TableHead>
                    <TableHead className="font-semibold">Estoque Físico</TableHead>
                    <TableHead className="font-semibold">Valor Unitário</TableHead>
                    <TableHead className="font-semibold">Valor Total em Estoque</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma peça encontrada no estoque.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((prod) => (
                      <TableRow key={prod.id} className="border-border/40 hover:bg-secondary/10">
                        <TableCell className="font-bold text-foreground">{prod.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-zinc-800/40 text-foreground border-zinc-700/50">
                            {prod.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{prod.vehicleModel}</TableCell>
                        <TableCell className="font-mono">
                          <span className={`font-bold ${prod.stock <= 2 ? "text-red-400" : prod.stock <= 5 ? "text-amber-400" : "text-foreground"}`}>
                            {prod.stock} un
                          </span>
                          {prod.stock <= 2 && (
                            <span className="block text-[9px] text-red-500 font-sans font-normal mt-0.5">Estoque Baixo!</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{formatCurrency(prod.unitValue)}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">
                          {formatCurrency(prod.stock * prod.unitValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Edit2 size={13} />
                            </Button>
                            {userProfile.role === "admin" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProductPrompt(prod)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={13} />
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
        </TabsContent>

        {/* TAB 2: HISTÓRICO DE ENTRADAS */}
        <TabsContent value="entradas" className="mt-4">
          <Card className="glass-card border-white/5">
            <CardContent className="p-0">
              <Table className="text-xs font-sans">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Peça</TableHead>
                    <TableHead className="font-semibold">Qtd Entrada</TableHead>
                    <TableHead className="font-semibold">Valor da Peça</TableHead>
                    <TableHead className="font-semibold">Total Calculado</TableHead>
                    <TableHead className="font-semibold">Nº Nota Fiscal</TableHead>
                    <TableHead className="font-semibold">Valor da Nota</TableHead>
                    <TableHead className="font-semibold">Fornecedor / Loja</TableHead>
                    <TableHead className="font-semibold">Comprador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma nota de entrada registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((ent) => (
                      <TableRow key={ent.id} className="border-border/40 hover:bg-secondary/10">
                        <TableCell className="font-mono text-muted-foreground">{formatDate(ent.date)}</TableCell>
                        <TableCell className="font-bold text-foreground">
                          {ent.productName}
                          <span className="block text-[10px] text-muted-foreground font-normal">{ent.vehicleModel}</span>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-400">+{ent.quantity} un</TableCell>
                        <TableCell className="font-mono">{formatCurrency(ent.totalValue / ent.quantity)}</TableCell>
                        <TableCell className="font-mono font-bold text-foreground">{formatCurrency(ent.totalValue)}</TableCell>
                        <TableCell className="font-mono font-semibold">{ent.invoiceNumber}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">{formatCurrency(ent.invoiceValue)}</TableCell>
                        <TableCell className="font-medium text-foreground">{ent.storeName || "N/A"}</TableCell>
                        <TableCell className="text-muted-foreground">{ent.buyerName}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: HISTÓRICO DE CONSUMO (SAÍDAS) */}
        <TabsContent value="saidas" className="mt-4">
          <Card className="glass-card border-white/5">
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Destinatário</TableHead>
                    <TableHead className="font-semibold">Finalidade / OS</TableHead>
                    <TableHead className="font-semibold">Quantidade Peças</TableHead>
                    <TableHead className="font-semibold">Itens Retirados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum registro de consumo ou saída encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    exits.map((ex) => (
                      <TableRow key={ex.id} className="border-border/40 hover:bg-secondary/10">
                        <TableCell className="font-mono text-muted-foreground">{formatDate(ex.date)}</TableCell>
                        <TableCell className="font-bold text-foreground">{ex.recipient}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-zinc-800/40 text-foreground border-zinc-700/50">
                            {ex.destination}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-red-400">-{ex.totalVolumes} un</TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex flex-wrap gap-1">
                            {ex.items.map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-[9px] bg-black/40 border-white/5 text-muted-foreground">
                                {item.productName} ({item.quantity}x)
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: CADASTRAR / EDITAR PEÇA */}
      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground text-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary">
              <Package size={20} /> {selectedProduct ? "Editar Peça" : "Cadastrar Nova Peça"}
            </DialogTitle>
            <DialogDescription>
              Insira os dados da peça para estoque da oficina.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name">Nome da Peça / Produto *</Label>
              <Input
                id="prod-name"
                placeholder="Ex: Pastilha de Freio Cobreq"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="bg-black/30 h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-vehicle">Aplicação (Modelo Veículo) *</Label>
                <Input
                  id="prod-vehicle"
                  placeholder="Ex: Titan 160 / Fan 150"
                  value={prodVehicle}
                  onChange={(e) => setProdVehicle(e.target.value)}
                  className="bg-black/30 h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-category">Categoria *</Label>
                <Select value={prodCategory} onValueChange={setProdCategory}>
                  <SelectTrigger className="bg-black/30 h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-xs">
                    <SelectItem value="Motor">Motor & Transmissão</SelectItem>
                    <SelectItem value="Freio">Sistema de Freios</SelectItem>
                    <SelectItem value="Suspensao">Suspensão & Rodas</SelectItem>
                    <SelectItem value="Eletrica">Elétrica & Ignição</SelectItem>
                    <SelectItem value="Acessorio">Acessórios / Estética</SelectItem>
                    <SelectItem value="Oleo">Óleos & Fluidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-stock">Estoque Inicial (unidades)</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  className="bg-black/30 h-10 font-mono"
                  disabled={!!selectedProduct} // Bloqueado na edição para forçar uso de notas de entrada/saída
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-value">Preço Unitário de Venda (R$) *</Label>
                <Input
                  id="prod-value"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={prodUnitValue}
                  onChange={(e) => setProdUnitValue(e.target.value)}
                  className="bg-black/30 h-10 font-mono"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsProductOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingProduct} className="h-9 text-xs font-semibold">
                {isSavingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Peça
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: REGISTRAR COMPRA (ENTRADA) */}
      <Dialog open={isEntryOpen} onOpenChange={setIsEntryOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground text-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <ArrowUpRight size={20} /> Registrar Entrada de Compra (NF)
            </DialogTitle>
            <DialogDescription>
              Dê entrada em um lote de peças e atualize o estoque físico automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEntry} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="entry-product">Selecione o Produto/Peça *</Label>
              <Select value={entryProductId} onValueChange={setEntryProductId}>
                <SelectTrigger className="bg-black/30 h-10">
                  <SelectValue placeholder="Escolha a peça..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-xs">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.vehicleModel}) - Estoque atual: {p.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry-qty">Quantidade Comprada *</Label>
                <Input
                  id="entry-qty"
                  type="number"
                  min="1"
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                  className="bg-black/30 h-10 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entry-invoice-val">Valor Total Pago (R$) *</Label>
                <Input
                  id="entry-invoice-val"
                  type="number"
                  step="0.01"
                  placeholder="Valor total da NF"
                  value={entryInvoiceValue}
                  onChange={(e) => setEntryInvoiceValue(e.target.value)}
                  className="bg-black/30 h-10 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry-nf">Nº Nota Fiscal *</Label>
                <Input
                  id="entry-nf"
                  placeholder="Número do documento"
                  value={entryInvoiceNumber}
                  onChange={(e) => setEntryInvoiceNumber(e.target.value)}
                  className="bg-black/30 h-10 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entry-date">Data de Entrada</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="bg-black/30 h-10 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry-store">Fornecedor / Loja Parceira</Label>
                <Input
                  id="entry-store"
                  placeholder="Ex: Distribuidora Honda"
                  value={entryStore}
                  onChange={(e) => setEntryStore(e.target.value)}
                  className="bg-black/30 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entry-buyer">Comprador Responsável</Label>
                <Input
                  id="entry-buyer"
                  value={entryBuyer}
                  onChange={(e) => setEntryBuyer(e.target.value)}
                  className="bg-black/30 h-10"
                  disabled
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEntryOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingEntry} className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSavingEntry && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Entrada
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: REGISTRAR CONSUMO (SAÍDA) */}
      <Dialog open={isExitOpen} onOpenChange={setIsExitOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-border/40 text-foreground text-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-400">
              <ArrowDownLeft size={20} /> Registrar Consumo / Baixa de Peças
            </DialogTitle>
            <DialogDescription>
              Utilize esta tela para registrar a retirada de peças para uso na oficina ou venda direta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveExit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exit-recipient">Destinatário (Quem retirou) *</Label>
                <Input
                  id="exit-recipient"
                  placeholder="Ex: Mecânico Francisco"
                  value={exitRecipient}
                  onChange={(e) => setExitRecipient(e.target.value)}
                  className="bg-black/30 h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exit-dest">Finalidade / Destino *</Label>
                <Input
                  id="exit-dest"
                  placeholder="Ex: OS #1002 ou Venda Balcão"
                  value={exitDestination}
                  onChange={(e) => setExitDestination(e.target.value)}
                  className="bg-black/30 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exit-date">Data da Retirada</Label>
              <Input
                id="exit-date"
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="bg-black/30 h-10 max-w-[200px] font-mono"
              />
            </div>

            <div className="space-y-3 border-t border-border/20 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-bold">Peças Retiradas do Estoque</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddExitItemField} className="text-[10px] h-7">
                  + Adicionar Item
                </Button>
              </div>

              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                {exitItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Produto / Peça</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(val) => handleExitItemChange(index, "productId", val)}
                      >
                        <SelectTrigger className="bg-black/30 h-9">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-foreground border-border/40 text-xs">
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} disabled={p.stock <= 0}>
                              {p.name} ({p.vehicleModel}) - Estoque: {p.stock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleExitItemChange(index, "quantity", Number(e.target.value))}
                        className="bg-black/30 h-9 font-mono"
                      />
                    </div>

                    {exitItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExitItemField(index)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsExitOpen(false)} className="h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingExit} className="h-9 text-xs font-semibold bg-red-600 hover:bg-red-750 text-white">
                {isSavingExit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Saída (Baixa)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: DELETAR PEÇA */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} /> Excluir Registro de Peça
            </DialogTitle>
            <DialogDescription>
              Atenção! Esta ação removerá permanentemente o produto <strong className="text-foreground">{selectedProduct?.name}</strong> do catálogo de peças.
              Tem certeza que deseja excluir esta peça?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteProduct}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
