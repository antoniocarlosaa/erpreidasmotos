"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/actions/clientActions";
import { Client } from "@/types";
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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  UserPlus,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { validateCPF, formatCPF, formatPhone, formatCEP, cleanMask } from "@/utils/validators";

const clientSchema = z.object({
  name: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  cpf: z.string().refine((val) => validateCPF(val), "CPF informado é inválido"),
  rg: z.string().optional(),
  cnh: z.string().optional(),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  state: z.string().max(2, "Máximo de 2 caracteres").optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Formato de e-mail inválido").or(z.literal("")).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientsClientProps {
  initialClients: { data: Client[]; count: number };
  userRole: string;
}

export function ClientsClient({ initialClients, userRole }: ClientsClientProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 10;

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
    queryKey: ["clients", debouncedSearch, page],
    queryFn: () => getClients({ search: debouncedSearch, limit, offset: page * limit }),
    initialData: debouncedSearch === "" && page === 0 ? initialClients : undefined,
  });

  const clients = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      rg: "",
      cnh: "",
      birth_date: "",
      address: "",
      neighborhood: "",
      city: "",
      zip_code: "",
      state: "",
      phone: "",
      whatsapp: "",
      email: "",
    },
  });

  const cpfValue = watch("cpf");
  const phoneValue = watch("phone");
  const whatsappValue = watch("whatsapp");
  const zipValue = watch("zip_code");

  // Apply masks dynamically
  useEffect(() => {
    if (cpfValue) setValue("cpf", formatCPF(cpfValue), { shouldValidate: true });
  }, [cpfValue, setValue]);

  useEffect(() => {
    if (phoneValue) setValue("phone", formatPhone(phoneValue));
  }, [phoneValue, setValue]);

  useEffect(() => {
    if (whatsappValue) setValue("whatsapp", formatPhone(whatsappValue));
  }, [whatsappValue, setValue]);

  useEffect(() => {
    if (zipValue) setValue("zip_code", formatCEP(zipValue));
  }, [zipValue, setValue]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (vals: ClientFormValues) => createClient(vals),
    onSuccess: (res: any) => {
      if (res && res.success === false) {
        alert(`Erro ao cadastrar cliente: ${res.error}`);
        return;
      }
      alert("Cliente cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsFormOpen(false);
      reset();
    },
    onError: (err: any) => {
      alert(`Erro ao cadastrar cliente: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, vals }: { id: string; vals: ClientFormValues }) => updateClient(id, vals),
    onSuccess: (res: any) => {
      if (res && res.success === false) {
        alert(`Erro ao atualizar cliente: ${res.error}`);
        return;
      }
      alert("Cliente atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsFormOpen(false);
      setSelectedClient(null);
      reset();
    },
    onError: (err: any) => {
      alert(`Erro ao atualizar cliente: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: (res: any) => {
      alert("Cliente excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsDeleteOpen(false);
      setSelectedClient(null);
    },
    onError: (err: any) => {
      alert(`Erro ao excluir cliente: ${err.message}`);
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    const cleanedValues = {
      ...values,
      cpf: cleanMask(values.cpf),
      phone: values.phone ? cleanMask(values.phone) : undefined,
      whatsapp: values.whatsapp ? cleanMask(values.whatsapp) : undefined,
      zip_code: values.zip_code ? cleanMask(values.zip_code) : undefined,
    };

    if (selectedClient) {
      await updateMutation.mutateAsync({ id: selectedClient.id, vals: cleanedValues });
    } else {
      await createMutation.mutateAsync(cleanedValues);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    reset({
      name: client.name,
      cpf: formatCPF(client.cpf),
      rg: client.rg || "",
      cnh: client.cnh || "",
      birth_date: client.birth_date || "",
      address: client.address || "",
      neighborhood: client.neighborhood || "",
      city: client.city || "",
      zip_code: client.zip_code ? formatCEP(client.zip_code) : "",
      state: client.state || "",
      phone: client.phone ? formatPhone(client.phone) : "",
      whatsapp: client.whatsapp ? formatPhone(client.whatsapp) : "",
      email: client.email || "",
    });
    setIsFormOpen(true);
  };

  const handleDeletePrompt = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteOpen(true);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    reset({
      name: "",
      cpf: "",
      rg: "",
      cnh: "",
      birth_date: "",
      address: "",
      neighborhood: "",
      city: "",
      zip_code: "",
      state: "",
      phone: "",
      whatsapp: "",
      email: "",
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/60"
          />
        </div>
        <Button onClick={handleAddNew} className="gap-2 font-semibold">
          <UserPlus size={16} />
          Cadastrar Cliente
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">CPF</TableHead>
                <TableHead className="font-semibold">WhatsApp</TableHead>
                <TableHead className="font-semibold">Localidade</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <span className="text-sm text-muted-foreground mt-2 block">Buscando clientes...</span>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum cliente cadastrado com estes termos.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="border-border/40 hover:bg-secondary/20">
                    <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCPF(client.cpf)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.whatsapp ? formatPhone(client.whatsapp) : client.phone ? formatPhone(client.phone) : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.city && client.state ? `${client.city}/${client.state}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleViewDetails(client)}
                          title="Visualizar detalhes"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400"
                          onClick={() => handleEdit(client)}
                          title="Editar cadastro"
                        >
                          <Edit2 size={14} />
                        </Button>
                        {userRole === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeletePrompt(client)}
                            title="Remover cliente"
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {clients.length} de {totalCount} clientes cadastrados
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

      {/* dialog for add / edit client */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedClient ? "Editar Cadastro de Cliente" : "Cadastrar Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente abaixo. Campos com * são de preenchimento obrigatório.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" placeholder="Nome Completo" {...register("name")} className="bg-black/30" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF * (Validação Ativa)</Label>
                <Input id="cpf" placeholder="000.000.000-00" {...register("cpf")} className="bg-black/30" />
                {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" placeholder="Identidade" {...register("rg")} className="bg-black/30" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnh">CNH</Label>
                <Input id="cnh" placeholder="Nº da Carteira de Habilitação" {...register("cnh")} className="bg-black/30" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input id="birth_date" type="date" {...register("birth_date")} className="bg-black/30" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" placeholder="email@provedor.com" {...register("email")} className="bg-black/30" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone Fixo</Label>
                <Input id="phone" placeholder="(00) 0000-0000" {...register("phone")} className="bg-black/30" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp / Celular</Label>
                <Input id="whatsapp" placeholder="(00) 90000-0000" {...register("whatsapp")} className="bg-black/30" />
              </div>
            </div>

            <div className="border-t border-border/30 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Endereço Residencial</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="address">Logradouro e Número</Label>
                  <Input id="address" placeholder="Rua, Av, Travessa..." {...register("address")} className="bg-black/30" />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input id="neighborhood" placeholder="Bairro" {...register("neighborhood")} className="bg-black/30" />
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input id="zip_code" placeholder="00000-000" {...register("zip_code")} className="bg-black/30" />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" placeholder="Cidade" {...register("city")} className="bg-black/30" />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input id="state" placeholder="ex: MA" {...register("state")} maxLength={2} className="bg-black/30 uppercase" />
                  {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/20">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedClient ? "Salvar Alterações" : "Adicionar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog for delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} /> Excluir Cliente
            </DialogTitle>
            <DialogDescription>
              Esta operação é irreversível. Tem certeza que deseja remover o cadastro do cliente{" "}
              <strong className="text-foreground">{selectedClient?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedClient) {
                  await deleteMutation.mutateAsync(selectedClient.id);
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

      {/* dialog for view client details */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="text-primary" /> Ficha Cadastral do Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-4 text-sm mt-2">
              <div className="grid grid-cols-2 gap-y-3 border-b border-border/40 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</p>
                  <p className="font-semibold text-foreground">{selectedClient.name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CPF</p>
                  <p className="font-mono text-foreground">{formatCPF(selectedClient.cpf)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RG</p>
                  <p className="text-foreground">{selectedClient.rg || "Não cadastrado"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CNH</p>
                  <p className="text-foreground">{selectedClient.cnh || "Não cadastrado"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nascimento</p>
                  <p className="text-foreground">
                    {selectedClient.birth_date ? new Date(selectedClient.birth_date + "T00:00:00").toLocaleDateString("pt-BR") : "Não informado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</p>
                  <p className="text-foreground truncate">{selectedClient.email || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                  <p className="text-foreground">{selectedClient.whatsapp ? formatPhone(selectedClient.whatsapp) : "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefone Fixo</p>
                  <p className="text-foreground">{selectedClient.phone ? formatPhone(selectedClient.phone) : "Não informado"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Endereço Residencial</h4>
                <div className="bg-secondary/10 border border-border/40 p-3 rounded-lg space-y-1">
                  <p className="text-foreground font-medium">{selectedClient.address || "Sem endereço cadastrado"}</p>
                  {(selectedClient.neighborhood || selectedClient.zip_code) && (
                    <p className="text-muted-foreground text-xs">
                      {selectedClient.neighborhood && `Bairro: ${selectedClient.neighborhood}`}
                      {selectedClient.zip_code && ` | CEP: ${formatCEP(selectedClient.zip_code)}`}
                    </p>
                  )}
                  {selectedClient.city && (
                    <p className="text-muted-foreground text-xs">
                      {selectedClient.city}/{selectedClient.state || "MA"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button onClick={() => setIsDetailOpen(false)} className="font-semibold">
                  Fechar Ficha
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
