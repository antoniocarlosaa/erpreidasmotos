"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleFullDetails,
  getVehiclesWithDetails,
  addVehicleCost,
  deleteVehicleCost,
  updateVehiclePublication,
} from "@/actions/vehicleActions";
import { createContract } from "@/actions/contractActions";
import { Vehicle, VehicleCategory, VehicleStatus, VehicleCost } from "@/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Car,
  Bike,
  Grid,
  List,
  Upload,
  AlertTriangle,
  FileCheck,
  Calendar,
  Layers,
  Image as ImageIcon,
  X,
  TrendingUp,
  DollarSign,
  Clock,
  Activity,
  ShieldCheck,
  Zap,
  Wrench,
  Percent,
  Coins,
  FileCode,
  ArrowRight,
  Share2,
  Bell,
  Gauge,
  CheckCircle,
  Settings,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { formatPlate } from "@/utils/validators";
import { formatCurrency, formatMileage } from "@/utils/formatters";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";

const parseNumberField = (value: any): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  let str = String(value).trim();
  if (!str) return 0;
  if (str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = str.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      str = str.replace(".", "");
    }
  }
  return Number(str) || 0;
};

const vehicleSchema = z.object({
  brand: z.string().optional().or(z.literal("")),
  model: z.string().optional().or(z.literal("")),
  version: z.string().optional().or(z.literal("")),
  year: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(new Date().getFullYear()),
  color: z.string().optional().or(z.literal("")),
  plate: z.string().min(7, "Placa inválida").max(8, "Placa inválida"),
  renavam: z.string().length(11, "Renavam deve ter exatamente 11 dígitos"),
  chassis: z.string().optional().or(z.literal("")),
  mileage: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  category: z.enum(["carro", "moto"]),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([]),
  status: z.enum(["disponivel", "vendido", "reservado", "em_preparacao", "aguardando_documentacao"]).default("disponivel"),

  // Origem do veículo
  owner_name: z.string().optional().or(z.literal("")),
  owner_cpf: z.string().optional().or(z.literal("")),
  owner_phone: z.string().optional().or(z.literal("")),
  nickname: z.string().optional(),

  // Itens entregues
  items_delivered: z.object({
    manual: z.boolean().default(false),
    spare_key: z.boolean().default(false),
    dut: z.boolean().default(false),
    atpv: z.boolean().default(false),
    crlv: z.boolean().default(false),
    power_of_attorney: z.boolean().default(false),
    clearance: z.boolean().default(false),
    zero_km: z.boolean().default(false),
  }),

  // Débitos do veículo
  has_fines: z.boolean().default(false),
  fines_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  has_ipva: z.boolean().default(false),
  ipva_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  
  // Custo cartório
  notary_payment_type: z.enum(["cliente_paga_fora", "loja_assume", "descontar_avaliacao"]).default("cliente_paga_fora"),
  notary_discount_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),

  // Possui quitação? (anterior financiamento)
  has_financing: z.boolean().default(false),
  financing_type: z.enum(["financiamento", "consorcio"]).default("financiamento"),
  financing_bank: z.string().optional().or(z.literal("")),
  financing_payout: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),

  // Estado do veículo
  condition: z.enum([
    "nada_a_fazer",
    "revisao_simples",
    "troca_pecas",
    "funilaria",
    "pintura",
    "mecanica",
    "eletrica",
    "preparacao_completa"
  ]).default("nada_a_fazer"),
  condition_notes: z.string().optional().or(z.literal("")),

  // Corretagem
  has_broker: z.boolean().default(false),
  broker_name: z.string().optional().or(z.literal("")),
  broker_phone: z.string().optional().or(z.literal("")),
  broker_commission: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),

  // Procuração
  has_power_of_attorney: z.boolean().default(false),
  power_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  power_payer: z.enum(["loja", "proprietario"]).default("loja"),

  // Avaliação e Fechamento
  appraisal_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  purchase_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  notary_costs: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),

  // Novas Taxas
  dispatch_fee: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  sale_intention_fee: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  registration_fee: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  transfer_fee: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
  cancellation_fee: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),

  // Estoque
  entry_date: z.string().optional().or(z.literal("")).default(new Date().toISOString().split("T")[0]),
  sale_date: z.string().optional().or(z.literal("")),

  // Consignado e Fotos Prontas
  photos_ready: z.array(z.string()).default([]),
  entry_modality: z.enum(["compra", "consignado"]).default("compra"),
  consignation_period_days: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(60),
  consignation_owner_value: z.preprocess((val) => parseNumberField(val), z.number()).optional().default(0),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehiclesClientProps {
  initialVehicles: { data: Vehicle[]; count: number };
  userRole: string;
}

export function VehiclesClient({ initialVehicles, userRole }: VehiclesClientProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inventario");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(0);
  const limit = 12;

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [activeFormTab, setActiveFormTab] = useState("form-basicos");

  // New cost form state
  const [costDescription, setCostDescription] = useState("");
  const [costDate, setCostDate] = useState(new Date().toISOString().split("T")[0]);
  const [costLocation, setCostLocation] = useState("");
  const [costValue, setCostValue] = useState("");
  const [addingCost, setAddingCost] = useState(false);

  // External catalog integration state
  const [globalCatalogUrl, setGlobalCatalogUrl] = useState("https://api.meucatalogo.com.br/v1/vehicles");
  const [globalCatalogToken, setGlobalCatalogToken] = useState("");
  const [savingCatalogSettings, setSavingCatalogSettings] = useState(false);

  // Selected vehicle in CUSTOS tab
  const [selectedCostVehicleId, setSelectedCostVehicleId] = useState<string>("");

  // Custom image url input state
  const [newImageUrl, setNewImageUrl] = useState("");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [newImageUrlReady, setNewImageUrlReady] = useState("");
  const [formPhotosReady, setFormPhotosReady] = useState<string[]>([]);

  // Local sale price input in Custos tab
  const [localSalePrice, setLocalSalePrice] = useState<string>("");

  // Load publication configs from local storage on mount
  useEffect(() => {
    const url = localStorage.getItem("catalog_url");
    const token = localStorage.getItem("catalog_token");
    if (url) setGlobalCatalogUrl(url);
    if (token) setGlobalCatalogToken(token);
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Query: basic vehicles (paginated)
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ["vehicles", debouncedSearch, categoryFilter, statusFilter, page],
    queryFn: () =>
      getVehicles({
        search: debouncedSearch,
        category: categoryFilter !== "todos" ? categoryFilter : undefined,
        status: statusFilter !== "todos" ? statusFilter : undefined,
        limit,
        offset: page * limit,
      }),
    initialData:
      debouncedSearch === "" && categoryFilter === "todos" && statusFilter === "todos" && page === 0
        ? initialVehicles
        : undefined,
  });

  // Query: vehicles with full details (for dashboard, publication, costs tabs)
  const { data: vehiclesWithDetails = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ["vehiclesWithDetails"],
    queryFn: () => getVehiclesWithDetails(),
  });

  const vehicles = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      brand: "",
      model: "",
      version: "",
      year: new Date().getFullYear(),
      color: "",
      plate: "",
      renavam: "",
      chassis: "",
      mileage: 0,
      value: 0,
      category: "carro",
      notes: "",
      photos: [],
      status: "disponivel",

      owner_name: "",
      owner_cpf: "",
      owner_phone: "",
      nickname: "",

      items_delivered: {
        manual: false,
        spare_key: false,
        dut: false,
        atpv: false,
        crlv: false,
        power_of_attorney: false,
        clearance: false,
        zero_km: false,
      },

      has_fines: false,
      fines_value: 0,
      has_ipva: false,
      ipva_value: 0,
      has_financing: false,
      financing_type: "financiamento",
      financing_bank: "",
      financing_payout: 0,

      condition: "nada_a_fazer",
      condition_notes: "",

      has_broker: false,
      broker_name: "",
      broker_phone: "",
      broker_commission: 0,

      has_power_of_attorney: false,
      power_value: 0,
      power_payer: "loja",

      appraisal_value: 0,
      purchase_value: 0,
      notary_costs: 0,
      notary_payment_type: "cliente_paga_fora",
      notary_discount_value: 0,

      dispatch_fee: 0,
      sale_intention_fee: 0,
      registration_fee: 0,
      transfer_fee: 0,
      cancellation_fee: 0,

      entry_date: new Date().toISOString().split("T")[0],
      sale_date: "",
      photos_ready: [],
      entry_modality: "compra",
      consignation_period_days: 60,
      consignation_owner_value: 0,
    },
  });

  // Watch for real-time calculations
  const watchAppraisalValue = watch("appraisal_value");
  const watchPurchaseValue = watch("purchase_value");
  const watchHasFines = watch("has_fines");
  const watchFinesValue = watch("fines_value");
  const watchHasIpva = watch("has_ipva");
  const watchIpvaValue = watch("ipva_value");
  const watchHasFinancing = watch("has_financing");
  const watchFinancingType = watch("financing_type");
  const watchFinancingBank = watch("financing_bank");
  const watchFinancingPayout = watch("financing_payout");
  const watchHasBroker = watch("has_broker");
  const watchBrokerCommission = watch("broker_commission");
  const watchHasPowerOfAttorney = watch("has_power_of_attorney");
  const watchPowerValue = watch("power_value");
  const watchPowerPayer = watch("power_payer");
  const watchNotaryCosts = watch("notary_costs");
  const watchNotaryPaymentType = watch("notary_payment_type");
  const watchNotaryDiscountValue = watch("notary_discount_value");

  // Novas taxas
  const watchDispatchFee = watch("dispatch_fee");
  const watchSaleIntentionFee = watch("sale_intention_fee");
  const watchRegistrationFee = watch("registration_fee");
  const watchTransferFee = watch("transfer_fee");
  const watchCancellationFee = watch("cancellation_fee");

  // Consignado watches
  const watchEntryModality = watch("entry_modality");
  const watchConsignationPeriodDays = watch("consignation_period_days");
  const watchConsignationOwnerValue = watch("consignation_owner_value");
  const watchVehicleValue = watch("value");

  // Explicit number conversion using the localization-aware parser
  const numAppraisal = parseNumberField(watchAppraisalValue);
  const numPurchase = parseNumberField(watchPurchaseValue);
  const numVehicleValue = parseNumberField(watchVehicleValue);
  const numConsignationOwner = parseNumberField(watchConsignationOwnerValue);
  const estimatedConsignationCommission = Math.max(0, numVehicleValue - numConsignationOwner);
  const numFines = watchHasFines ? parseNumberField(watchFinesValue) : 0;
  const numIpva = watchHasIpva ? parseNumberField(watchIpvaValue) : 0;
  const numFinancing = watchHasFinancing ? parseNumberField(watchFinancingPayout) : 0;
  const numBroker = watchHasBroker ? parseNumberField(watchBrokerCommission) : 0;
  const numPower = parseNumberField(watchPowerValue); // Descontado direto
  const numNotaryDiscount = watchNotaryPaymentType === "descontar_avaliacao" ? parseNumberField(watchNotaryCosts) : 0;
  const numNotaryCost = (watchNotaryPaymentType === "loja_assume" || watchNotaryPaymentType === "descontar_avaliacao") ? parseNumberField(watchNotaryCosts) : 0;

  const numDispatch = parseNumberField(watchDispatchFee);
  const numSaleIntention = parseNumberField(watchSaleIntentionFee);
  const numRegistration = parseNumberField(watchRegistrationFee);
  const numTransfer = parseNumberField(watchTransferFee);
  const numCancellation = parseNumberField(watchCancellationFee);

  // Real-time calculated properties (always in Brazilian Real)
  // Líquido Cliente Payout é baseado estritamente na AVALIAÇÃO menos taxas
  const calculatedNetClientValue = numAppraisal - numFines - numIpva - numFinancing - numNotaryDiscount - numPower - numBroker - numDispatch - numSaleIntention - numRegistration - numTransfer - numCancellation;
  
  // Custo base de entrada do estoque = Valor de Avaliação (como base de tudo)
  const calculatedRealEntryCost = numAppraisal;

  const plateValue = watch("plate");
  const watchZeroKm = watch("items_delivered.zero_km");

  // Apply plate formatting dynamically
  useEffect(() => {
    if (plateValue) {
      setValue("plate", formatPlate(plateValue), { shouldValidate: true });
    }
  }, [plateValue, setValue]);

  // Handle 0km vehicle rules
  useEffect(() => {
    if (watchZeroKm) {
      setValue("mileage", 0);
      setValue("condition", "nada_a_fazer");
      setValue("has_fines", false);
      setValue("fines_value", 0);
      setValue("has_ipva", false);
      setValue("ipva_value", 0);
      setValue("has_financing", false);
      setValue("financing_payout", 0);
      setValue("notary_payment_type", "cliente_paga_fora");
      setValue("notary_costs", 0);
      setValue("has_broker", false);
      setValue("broker_commission", 0);
      setValue("has_power_of_attorney", false);
      setValue("power_value", 0);
      setValue("dispatch_fee", 0);
      setValue("sale_intention_fee", 0);
      setValue("registration_fee", 0);
      setValue("transfer_fee", 0);
      setValue("cancellation_fee", 0);
    }
  }, [watchZeroKm, setValue]);

  // Handle Photo additions (Base64 file or direct URL)
  const handleAddImageUrl = () => {
    if (newImageUrl.trim() && newImageUrl.startsWith("http")) {
      const updatedPhotos = [...formPhotos, newImageUrl.trim()];
      setFormPhotos(updatedPhotos);
      setValue("photos", updatedPhotos);
      setNewImageUrl("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const updatedPhotos = [...formPhotos, base64String];
        setFormPhotos(updatedPhotos);
        setValue("photos", updatedPhotos);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = formPhotos.filter((_, i) => i !== index);
    setFormPhotos(updatedPhotos);
    setValue("photos", updatedPhotos);
  };

  const handleAddImageUrlReady = () => {
    if (newImageUrlReady.trim() && newImageUrlReady.startsWith("http")) {
      const updatedPhotos = [...formPhotosReady, newImageUrlReady.trim()];
      setFormPhotosReady(updatedPhotos);
      setValue("photos_ready", updatedPhotos);
      setNewImageUrlReady("");
    }
  };

  const handleFileUploadReady = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const updatedPhotos = [...formPhotosReady, base64String];
        setFormPhotosReady(updatedPhotos);
        setValue("photos_ready", updatedPhotos);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhotoReady = (index: number) => {
    const updatedPhotos = formPhotosReady.filter((_, i) => i !== index);
    setFormPhotosReady(updatedPhotos);
    setValue("photos_ready", updatedPhotos);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (vals: any) => createVehicle(vals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });
      setIsFormOpen(false);
      reset();
      setFormPhotos([]);
      setFormPhotosReady([]);
      alert("Veículo cadastrado com sucesso!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, vals }: { id: string; vals: any }) => updateVehicle(id, vals),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });
      setIsFormOpen(false);
      setSelectedVehicle(null);
      reset();
      setFormPhotos([]);
      setFormPhotosReady([]);
      alert("Cadastro de veículo atualizado com sucesso!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });
      setIsDeleteOpen(false);
      setSelectedVehicle(null);
      alert("Veículo excluído do estoque!");
    },
  });

  const onSubmit = async (values: VehicleFormValues) => {
    const payload = {
      brand: values.brand || "",
      model: values.model || "",
      version: values.version || "",
      year: values.year || new Date().getFullYear(),
      color: values.color || "",
      plate: values.plate,
      renavam: values.renavam,
      chassis: values.chassis || "",
      mileage: values.mileage || 0,
      value: values.value || 0,
      category: values.category,
      notes: values.notes || "",
      photos: values.photos,
      photos_ready: values.photos_ready || [],
      entry_modality: values.entry_modality || "compra",
      consignation_period_days: values.entry_modality === "consignado" ? (values.consignation_period_days || 0) : null,
      consignation_owner_value: values.entry_modality === "consignado" ? (values.consignation_owner_value || 0) : null,
      status: values.status,

      owner_name: values.owner_name || "",
      owner_cpf: values.owner_cpf || "",
      owner_phone: values.owner_phone || "",
      nickname: values.nickname || "",

      items_delivered: values.items_delivered,

      condition: values.condition,
      condition_notes: values.condition_notes || "",

      appraisal_value: values.appraisal_value || 0,
      purchase_value: values.purchase_value || 0,
      notary_costs: values.notary_costs || 0,
      notary_payment_type: values.notary_payment_type,
      notary_discount_value: values.notary_payment_type === "descontar_avaliacao" ? (values.notary_costs || 0) : 0,

      dispatch_fee: values.dispatch_fee || 0,
      sale_intention_fee: values.sale_intention_fee || 0,
      registration_fee: values.registration_fee || 0,
      transfer_fee: values.transfer_fee || 0,
      cancellation_fee: values.cancellation_fee || 0,

      debts: {
        has_fines: values.has_fines,
        fines_value: values.has_fines ? (values.fines_value || 0) : 0,
        has_ipva: values.has_ipva,
        ipva_value: values.has_ipva ? (values.ipva_value || 0) : 0,
        has_financing: values.has_financing,
        financing_type: values.has_financing ? values.financing_type : "financiamento",
        financing_bank: values.has_financing ? (values.financing_bank || "") : "",
        financing_payout: values.has_financing ? (values.financing_payout || 0) : 0,
      },

      broker: {
        has_broker: values.has_broker,
        broker_name: values.has_broker ? (values.broker_name || "") : "",
        broker_phone: values.has_broker ? (values.broker_phone || "") : "",
        broker_commission: values.has_broker ? (values.broker_commission || 0) : 0,
      },

      power_of_attorney: {
        has_power: values.has_power_of_attorney,
        power_value: values.has_power_of_attorney ? (values.power_value || 0) : 0,
        power_payer: values.has_power_of_attorney ? values.power_payer : "loja",
      },

      stock_metrics: {
        entry_date: values.entry_date || new Date().toISOString().split("T")[0],
        sale_date: values.status === "vendido" ? values.sale_date || new Date().toISOString().split("T")[0] : "",
        days_in_stock: 0,
      },
    };
 
    if (selectedVehicle) {
      await updateMutation.mutateAsync({ id: selectedVehicle.id, vals: payload });
    } else {
      const createdVehicle = await createMutation.mutateAsync(payload);
      if (createdVehicle && createdVehicle.id) {
        try {
          if (values.entry_modality === "consignado") {
            await createContract({
              client: {
                name: values.owner_name || `Proprietário Anterior (${values.plate})`,
                cpf: values.owner_cpf || "00000000000",
                phone: values.owner_phone || "",
              },
              vehicle_id: createdVehicle.id,
              modality: "consignado",
              total_value: parseNumberField(values.value),
              appraised_value: parseNumberField(values.value),
              net_value: parseNumberField(values.consignation_owner_value),
              purchase_date: values.entry_date || new Date().toISOString().split("T")[0],
              status: "AGUARDANDO_INICIAR",
              consignation_period_days: parseNumberField(values.consignation_period_days),
              consignation_owner_value: parseNumberField(values.consignation_owner_value),
              notes: `Contrato de consignação gerado automaticamente no cadastro do veículo. Prazo acordado: ${values.consignation_period_days} dias. Valor mínimo proprietário: R$ ${values.consignation_owner_value}.`,
              custom_clauses: [
                `Fica acordado o prazo de consignação de ${values.consignation_period_days} dias, onde a LOJA (Consignatária) envidará esforços para a venda do veículo pelo valor estimado de R$ ${values.value}.`,
                `Fica garantido ao Consignante o valor líquido mínimo de R$ ${values.consignation_owner_value} livre de custos operacionais básicos acordados.`
              ],
              former_owner_name: values.owner_name || "",
              former_owner_cpf: values.owner_cpf || "",
              former_owner_phone: values.owner_phone || "",
              fines_debt: parseNumberField(values.fines_value) + parseNumberField(values.ipva_value),
              bank_payout: parseNumberField(values.financing_payout),
              broker_name: values.has_broker ? values.broker_name : "",
              broker_phone: values.has_broker ? values.broker_phone : "",
              has_dut: values.items_delivered?.dut || false,
              has_spare_key: values.items_delivered?.spare_key || false,
              has_manual: values.items_delivered?.manual || false,
            });
          } else {
            await createContract({
              client: {
                name: values.owner_name || `Proprietário Anterior (${values.plate})`,
                cpf: values.owner_cpf || "00000000000",
                phone: values.owner_phone || "",
              },
              vehicle_id: createdVehicle.id,
              modality: "compra",
              total_value: parseNumberField(values.appraisal_value),
              appraised_value: parseNumberField(values.appraisal_value),
              net_value: calculatedNetClientValue,
              purchase_date: values.entry_date || new Date().toISOString().split("T")[0],
              status: "AGUARDANDO_INICIAR",
              notes: "Contrato de compra gerado automaticamente no cadastro do veículo. O veículo será transferido para o novo cliente comprador assim que a revenda for realizada.",
              custom_clauses: [
                "Fica expressamente acordado que a transferência de propriedade do veículo ora adquirido pela LOJA para seu nome ou de terceiros ocorrerá exclusivamente no momento da revenda do bem para um novo cliente comprador final."
              ],
              former_owner_name: values.owner_name || "",
              former_owner_cpf: values.owner_cpf || "",
              former_owner_phone: values.owner_phone || "",
              fines_debt: parseNumberField(values.fines_value) + parseNumberField(values.ipva_value),
              bank_payout: parseNumberField(values.financing_payout),
              broker_name: values.has_broker ? values.broker_name : "",
              broker_phone: values.has_broker ? values.broker_phone : "",
              has_dut: values.items_delivered?.dut || false,
              has_spare_key: values.items_delivered?.spare_key || false,
              has_manual: values.items_delivered?.manual || false,
            });
          }
        } catch (contractErr) {
          console.error("Erro ao emitir contrato automático:", contractErr);
        }
      }
    }
  };

  const handleEdit = async (vehicle: Vehicle) => {
    try {
      setSelectedVehicle(vehicle);
      const fullVehicle = await getVehicleFullDetails(vehicle.id);
      if (fullVehicle) {
        setSelectedVehicle(fullVehicle);
        setFormPhotos(fullVehicle.photos || []);
        setFormPhotosReady(fullVehicle.photos_ready || []);
        reset({
          brand: fullVehicle.brand,
          model: fullVehicle.model,
          version: fullVehicle.version || "",
          year: fullVehicle.year,
          color: fullVehicle.color,
          plate: fullVehicle.plate,
          renavam: fullVehicle.renavam,
          chassis: fullVehicle.chassis || "",
          mileage: fullVehicle.mileage,
          value: fullVehicle.value,
          category: fullVehicle.category,
          notes: fullVehicle.notes || "",
          photos: fullVehicle.photos || [],
          status: fullVehicle.status,

          owner_name: fullVehicle.owner_name || "",
          owner_cpf: fullVehicle.owner_cpf || "",
          owner_phone: fullVehicle.owner_phone || "",
          nickname: fullVehicle.nickname || "",

          items_delivered: {
            manual: fullVehicle.items_delivered?.manual || false,
            spare_key: fullVehicle.items_delivered?.spare_key || false,
            dut: fullVehicle.items_delivered?.dut || false,
            atpv: fullVehicle.items_delivered?.atpv || false,
            crlv: fullVehicle.items_delivered?.crlv || false,
            power_of_attorney: fullVehicle.items_delivered?.power_of_attorney || false,
            clearance: fullVehicle.items_delivered?.clearance || false,
            zero_km: fullVehicle.items_delivered?.zero_km || false,
          },

          has_fines: fullVehicle.debts?.has_fines || false,
          fines_value: fullVehicle.debts?.fines_value || 0,
          has_ipva: fullVehicle.debts?.has_ipva || false,
          ipva_value: fullVehicle.debts?.ipva_value || 0,
          has_financing: fullVehicle.debts?.has_financing || false,
          financing_type: fullVehicle.debts?.financing_type || "financiamento",
          financing_bank: fullVehicle.debts?.financing_bank || "",
          financing_payout: fullVehicle.debts?.financing_payout || 0,

          condition: fullVehicle.condition || "nada_a_fazer",
          condition_notes: fullVehicle.condition_notes || "",

          has_broker: fullVehicle.broker?.has_broker || false,
          broker_name: fullVehicle.broker?.broker_name || "",
          broker_phone: fullVehicle.broker?.broker_phone || "",
          broker_commission: fullVehicle.broker?.broker_commission || 0,

          has_power_of_attorney: fullVehicle.power_of_attorney?.has_power || false,
          power_value: fullVehicle.power_of_attorney?.power_value || 0,
          power_payer: fullVehicle.power_of_attorney?.power_payer || "loja",

          appraisal_value: fullVehicle.appraisal_value || 0,
          purchase_value: fullVehicle.purchase_value || 0,
          notary_costs: fullVehicle.notary_costs || 0,
          notary_payment_type: fullVehicle.notary_payment_type || "cliente_paga_fora",
          notary_discount_value: fullVehicle.notary_discount_value || 0,

          dispatch_fee: fullVehicle.dispatch_fee || 0,
          sale_intention_fee: fullVehicle.sale_intention_fee || 0,
          registration_fee: fullVehicle.registration_fee || 0,
          transfer_fee: fullVehicle.transfer_fee || 0,
          cancellation_fee: fullVehicle.cancellation_fee || 0,

          entry_date: fullVehicle.stock_metrics?.entry_date || new Date().toISOString().split("T")[0],
          sale_date: fullVehicle.stock_metrics?.sale_date || "",
          photos_ready: fullVehicle.photos_ready || [],
          entry_modality: fullVehicle.entry_modality || "compra",
          consignation_period_days: fullVehicle.consignation_period_days || 60,
          consignation_owner_value: fullVehicle.consignation_owner_value || 0,
        });
        setActiveFormTab("form-basicos");
        setIsFormOpen(true);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do veículo:", error);
    }
  };

  const handleDeletePrompt = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const handleViewDetails = async (vehicle: Vehicle) => {
    try {
      setSelectedVehicle(vehicle);
      const fullVehicle = await getVehicleFullDetails(vehicle.id);
      if (fullVehicle) {
        setSelectedVehicle(fullVehicle);
        setIsDetailOpen(true);
      }
    } catch (err) {
      console.error("Erro ao obter dados do veículo:", err);
    }
  };

  const handleAddNew = () => {
    setSelectedVehicle(null);
    setFormPhotos([]);
    setFormPhotosReady([]);
    reset({
      brand: "",
      model: "",
      version: "",
      year: new Date().getFullYear(),
      color: "",
      plate: "",
      renavam: "",
      chassis: "",
      mileage: 0,
      value: 0,
      category: "carro",
      notes: "",
      photos: [],
      status: "disponivel",

      owner_name: "",
      owner_cpf: "",
      owner_phone: "",
      nickname: "",

      items_delivered: {
        manual: false,
        spare_key: false,
        dut: false,
        atpv: false,
        crlv: false,
        power_of_attorney: false,
        clearance: false,
        zero_km: false,
      },

      has_fines: false,
      fines_value: 0,
      has_ipva: false,
      ipva_value: 0,
      has_financing: false,
      financing_type: "financiamento",
      financing_bank: "",
      financing_payout: 0,

      condition: "nada_a_fazer",
      condition_notes: "",

      has_broker: false,
      broker_name: "",
      broker_phone: "",
      broker_commission: 0,

      has_power_of_attorney: false,
      power_value: 0,
      power_payer: "loja",

      appraisal_value: 0,
      purchase_value: 0,
      notary_costs: 0,
      notary_payment_type: "cliente_paga_fora",
      notary_discount_value: 0,

      entry_date: new Date().toISOString().split("T")[0],
      sale_date: "",
      photos_ready: [],
      entry_modality: "compra",
      consignation_period_days: 60,
      consignation_owner_value: 0,
    });
    setActiveFormTab("form-basicos");
    setIsFormOpen(true);
  };

  // Helper for status badges
  const getStatusBadge = (status: VehicleStatus) => {
    switch (status) {
      case "disponivel":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">Disponível</Badge>;
      case "reservado":
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">Reservado</Badge>;
      case "vendido":
        return <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Vendido</Badge>;
      case "em_preparacao":
        return <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">Em Preparação</Badge>;
      case "aguardando_documentacao":
        return <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">Aguardando Documentação</Badge>;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: VehicleCategory) => {
    return category === "carro" ? <Car size={16} className="text-cyan-400" /> : <Bike size={16} className="text-purple-400" />;
  };

  // Helper calculations for days in stock
  const calculateDaysInStock = (entryDate?: string, saleDate?: string) => {
    if (!entryDate) return 0;
    const start = new Date(entryDate);
    const end = saleDate ? new Date(saleDate) : new Date("2026-06-01"); // Using current system date from prompt
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Find currently selected vehicle in Costs tab
  const costVehicle = vehiclesWithDetails.find((v: any) => v.id === selectedCostVehicleId);

  // Compute values for selected cost vehicle
  const costVehicleFines = costVehicle?.debts?.has_fines ? Number(costVehicle?.debts?.fines_value || 0) : 0;
  const costVehicleIpva = costVehicle?.debts?.has_ipva ? Number(costVehicle?.debts?.ipva_value || 0) : 0;
  const costVehicleFinancing = costVehicle?.debts?.has_financing ? Number(costVehicle?.debts?.financing_payout || 0) : 0;
  const costVehicleBroker = costVehicle?.broker?.has_broker ? Number(costVehicle?.broker?.broker_commission || 0) : 0;
  const costVehiclePower = (costVehicle?.power_of_attorney?.has_power && costVehicle?.power_of_attorney?.power_payer === "loja") ? Number(costVehicle?.power_of_attorney?.power_value || 0) : 0;
  const costVehicleNotary = Number(costVehicle?.notary_costs || 0);

  const costVehicleRealEntry = Number(costVehicle?.purchase_value || 0) + costVehicleFines + costVehicleIpva + costVehicleFinancing + costVehicleBroker + costVehicleNotary;
  const costVehicleExpensesTotal = costVehicle?.costs ? costVehicle.costs.reduce((sum: number, c: VehicleCost) => sum + Number(c.value), 0) : 0;
  const costVehicleTotalInvestment = costVehicleRealEntry + costVehicleExpensesTotal;
  
  const costVehicleSalePrice = Number(costVehicle?.value || 0);
  const costVehicleProfit = costVehicleSalePrice - costVehicleTotalInvestment;
  const costVehicleMargin = costVehicleSalePrice > 0 ? (costVehicleProfit / costVehicleSalePrice) * 100 : 0;
  const costVehicleRoi = costVehicleTotalInvestment > 0 ? (costVehicleProfit / costVehicleTotalInvestment) * 100 : 0;

  const costVehicleDays = calculateDaysInStock(costVehicle?.stock_metrics?.entry_date, costVehicle?.stock_metrics?.sale_date);

  // Synchronize local sale price with selected cost vehicle
  useEffect(() => {
    if (costVehicle) {
      setLocalSalePrice(String(costVehicle.value || 0));
    } else {
      setLocalSalePrice("");
    }
  }, [costVehicle]);

  // Handle adding cost in Costs Tab
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCostVehicleId || !costDescription || !costValue) return;

    setAddingCost(true);
    try {
      await addVehicleCost({
        vehicle_id: selectedCostVehicleId,
        description: costDescription,
        date: costDate,
        service_location: costLocation,
        value: Number(costValue),
      });
      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });
      setCostDescription("");
      setCostLocation("");
      setCostValue("");
      setCostDate(new Date().toISOString().split("T")[0]);
      alert("Despesa de oficina lançada com sucesso!");
    } catch (err) {
      console.error("Erro ao lançar despesa:", err);
    } finally {
      setAddingCost(false);
    }
  };

  // Handle deleting cost in Costs Tab
  const handleDeleteCost = async (costId: string) => {
    if (!selectedCostVehicleId) return;
    try {
      await deleteVehicleCost(costId, selectedCostVehicleId);
      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });
      alert("Despesa de oficina excluída com sucesso!");
    } catch (err) {
      console.error("Erro ao deletar despesa:", err);
    }
  };

  // Handle updating sale price in Costs Tab
  const handleUpdateSalePrice = async (newPrice: number) => {
    if (!selectedCostVehicleId) return;
    try {
      await updateVehicle(selectedCostVehicleId, { value: newPrice });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });
      alert("Preço de venda atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar preço de venda:", err);
      alert("Erro ao atualizar preço de venda.");
    }
  };

  // Handle saving online catalog settings
  const handleSaveCatalogSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCatalogSettings(true);
    
    // Limpa espaços, barras duplicadas no final e converte tudo para minúsculo (evita erro 405 de URL em caixa alta)
    let sanitizedUrl = globalCatalogUrl.trim().toLowerCase().replace(/\/+$/, "");

    // Correção automática se o usuário informou o link do site (/vehicles) em vez da rota de API (/api/vehicles)
    if (sanitizedUrl.includes("catalogoexclusivemotos.vercel.app") && !sanitizedUrl.includes("/api/")) {
      if (sanitizedUrl.endsWith("/vehicles")) {
        sanitizedUrl = sanitizedUrl.replace("/vehicles", "/api/vehicles");
      } else {
        sanitizedUrl = `${sanitizedUrl}/api/vehicles`;
      }
    }

    setGlobalCatalogUrl(sanitizedUrl);
    localStorage.setItem("catalog_url", sanitizedUrl);
    localStorage.setItem("catalog_token", globalCatalogToken);
    setTimeout(() => {
      setSavingCatalogSettings(false);
      alert("Configurações de integração salvas com sucesso no navegador! A URL foi corrigida e formatada automaticamente.");
    }, 500);
  };

  // Handle publishing toggle per vehicle
  const handleTogglePublish = async (vehicleId: string, currentStatus: boolean) => {
    const actionLabel = !currentStatus ? "publicar" : "despublicar";
    try {
      const res = await updateVehiclePublication(vehicleId, {
        publish_catalog: !currentStatus,
        catalog_url: globalCatalogUrl,
        catalog_token: globalCatalogToken,
      });

      queryClient.invalidateQueries({ queryKey: ["vehiclesWithDetails"] });

      if (res && res.success) {
        if (res.catalogSynced) {
          alert(`Veículo ${!currentStatus ? "publicado" : "removido"} e sincronizado no catálogo online com sucesso!`);
        } else {
          if (res.catalogError && res.catalogError.includes("não informada")) {
            alert(`Veículo ${!currentStatus ? "publicado" : "removido"} localmente. Configure a URL da API para ativar a sincronização automática.`);
          } else {
            alert(`Salvo localmente, mas falhou ao sincronizar com o catálogo online: ${res.catalogError || "Erro desconhecido"}. Verifique se a URL e o Token estão corretos.`);
          }
        }
      } else {
        alert(`Erro ao tentar ${actionLabel} o veículo no banco de dados local.`);
      }
    } catch (err: any) {
      console.error("Erro ao alterar status de publicação:", err);
      alert(`Erro ao tentar ${actionLabel} o veículo: ${err.message || "Erro desconhecido"}`);
    }
  };

  // ==========================================
  // DASHBOARD CALCULATIONS (RECHARTS)
  // ==========================================
  const activeVehicles = vehiclesWithDetails.filter((v: any) => v.status !== "vendido");
  
  // Total Invested in Stock
  const totalInvestedInStock = activeVehicles.reduce((sum: number, v: any) => {
    const vFines = v.debts?.has_fines ? Number(v.debts?.fines_value || 0) : 0;
    const vIpva = v.debts?.has_ipva ? Number(v.debts?.ipva_value || 0) : 0;
    const vFinancing = v.debts?.has_financing ? Number(v.debts?.financing_payout || 0) : 0;
    const vBroker = v.broker?.has_broker ? Number(v.broker?.broker_commission || 0) : 0;
    const vNotary = Number(v.notary_costs || 0);
    const entry = Number(v.purchase_value || 0) + vFines + vIpva + vFinancing + vBroker + vNotary;
    const maint = v.costs ? v.costs.reduce((s: number, c: any) => s + Number(c.value), 0) : 0;
    return sum + entry + maint;
  }, 0);

  // Total Market Value in Stock
  const totalStockMarketValue = activeVehicles.reduce((sum: number, v: any) => sum + Number(v.value || 0), 0);

  // Potential Profit
  const potentialProfitInStock = totalStockMarketValue - totalInvestedInStock;

  // Sold count vs In stock count
  const vehiclesSold = vehiclesWithDetails.filter((v: any) => v.status === "vendido");
  const vehiclesSoldCount = vehiclesSold.length;
  const vehiclesInStockCount = activeVehicles.length;

  // Average days in stock
  const stockDaysSum = vehiclesWithDetails.reduce((sum: number, v: any) => {
    return sum + calculateDaysInStock(v.stock_metrics?.entry_date, v.stock_metrics?.sale_date);
  }, 0);
  const averageDaysInStock = vehiclesWithDetails.length > 0 ? Math.ceil(stockDaysSum / vehiclesWithDetails.length) : 0;

  // Alertas de estoque count
  const vehicles30d = activeVehicles.filter((v: any) => calculateDaysInStock(v.stock_metrics?.entry_date) >= 30 && calculateDaysInStock(v.stock_metrics?.entry_date) < 60).length;
  const vehicles60d = activeVehicles.filter((v: any) => calculateDaysInStock(v.stock_metrics?.entry_date) >= 60 && calculateDaysInStock(v.stock_metrics?.entry_date) < 90).length;
  const vehicles90d = activeVehicles.filter((v: any) => calculateDaysInStock(v.stock_metrics?.entry_date) >= 90).length;

  // Charts data preparation
  // 1. Status Chart
  const chartStatusData = [
    { name: "Disponível", value: vehiclesWithDetails.filter((v: any) => v.status === "disponivel").length },
    { name: "Reservado", value: vehiclesWithDetails.filter((v: any) => v.status === "reservado").length },
    { name: "Vendido", value: vehiclesSoldCount },
  ].filter(d => d.value > 0);

  // 2. Rentability by Vehicle
  const chartRentabilityByVehicle = activeVehicles.slice(0, 10).map((v: any) => {
    const vFines = v.debts?.has_fines ? Number(v.debts?.fines_value || 0) : 0;
    const vIpva = v.debts?.has_ipva ? Number(v.debts?.ipva_value || 0) : 0;
    const vFinancing = v.debts?.has_financing ? Number(v.debts?.financing_payout || 0) : 0;
    const vBroker = v.broker?.has_broker ? Number(v.broker?.broker_commission || 0) : 0;
    const vNotary = Number(v.notary_costs || 0);
    const investment = Number(v.purchase_value || 0) + vFines + vIpva + vFinancing + vBroker + vNotary + (v.costs ? v.costs.reduce((s: number, c: any) => s + Number(c.value), 0) : 0);
    const profit = Number(v.value || 0) - investment;
    return {
      name: `${v.brand} ${v.model} (${v.plate})`,
      "Lucro Potencial": profit,
      "Investimento Total": investment,
    };
  });

  // 3. Rentability by Brand
  const brandsGroup: Record<string, { brand: string; profit: number; count: number }> = {};
  activeVehicles.forEach((v: any) => {
    const vFines = v.debts?.has_fines ? Number(v.debts?.fines_value || 0) : 0;
    const vIpva = v.debts?.has_ipva ? Number(v.debts?.ipva_value || 0) : 0;
    const vFinancing = v.debts?.has_financing ? Number(v.debts?.financing_payout || 0) : 0;
    const vBroker = v.broker?.has_broker ? Number(v.broker?.broker_commission || 0) : 0;
    const vNotary = Number(v.notary_costs || 0);
    const investment = Number(v.purchase_value || 0) + vFines + vIpva + vFinancing + vBroker + vNotary + (v.costs ? v.costs.reduce((s: number, c: any) => s + Number(c.value), 0) : 0);
    const profit = Number(v.value || 0) - investment;

    if (!brandsGroup[v.brand]) {
      brandsGroup[v.brand] = { brand: v.brand, profit: 0, count: 0 };
    }
    brandsGroup[v.brand].profit += profit;
    brandsGroup[v.brand].count += 1;
  });
  const chartRentabilityByBrand = Object.values(brandsGroup);

  // 4. Maintenance Costs per Vehicle
  const chartCostsPerVehicle = activeVehicles
    .map((v: any) => {
      const maint = v.costs ? v.costs.reduce((s: number, c: any) => s + Number(c.value), 0) : 0;
      return {
        name: `${v.model} (${v.plate})`,
        "Custo de Manutenção": maint,
      };
    })
    .filter(d => d["Custo de Manutenção"] > 0)
    .slice(0, 10);

  const COLORS_CHART = ["#00f0ff", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#e11d48"];

  return (
    <div className="space-y-6">
      {/* Upper Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/40 border border-border/40 p-1 rounded-xl mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="inventario" className="rounded-lg font-bold text-sm px-4 py-2.5 flex items-center gap-2">
            <Car size={16} />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="custos" className="rounded-lg font-bold text-sm px-4 py-2.5 flex items-center gap-2">
            <Coins size={16} />
            Custos e Despesas
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="rounded-lg font-bold text-sm px-4 py-2.5 flex items-center gap-2">
            <TrendingUp size={16} />
            Dashboard de Estoque
          </TabsTrigger>
          <TabsTrigger value="publicacao" className="rounded-lg font-bold text-sm px-4 py-2.5 flex items-center gap-2">
            <Share2 size={16} />
            Publicação
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: INVENTÁRIO (EXISTING AND EXPANDED GRID LIST) */}
        <TabsContent value="inventario" className="space-y-6">
          {/* Top filters and view controls */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2 flex-1 max-w-4xl">
              {/* Search bar */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por modelo, marca ou placa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-card/60"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] bg-card/60 border-border/40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 text-foreground">
                  <SelectItem value="todos">Todas Categorias</SelectItem>
                  <SelectItem value="carro">Carros</SelectItem>
                  <SelectItem value="moto">Motos</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-card/60 border-border/40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 text-foreground">
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action and view controls */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="flex bg-secondary/20 p-0.5 rounded-lg border border-border/40">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid")}
                  title="Visualização em Grade"
                >
                  <Grid size={16} />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("table")}
                  title="Visualização em Tabela"
                >
                  <List size={16} />
                </Button>
              </div>

              <Button onClick={handleAddNew} className="gap-2 font-semibold">
                <Plus size={16} />
                Adicionar Veículo
              </Button>
            </div>
          </div>

          {/* Main Grid or Table view */}
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Buscando inventário de veículos...</p>
            </div>
          ) : vehicles.length === 0 ? (
            <Card className="glass-card border-white/5 py-12 text-center text-muted-foreground">
              Nenhum veículo encontrado com os filtros selecionados.
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {vehicles.map((vehicle) => {
                const detail = vehiclesWithDetails.find((v: any) => v.id === vehicle.id);
                const days = calculateDaysInStock(
                  detail?.stock_metrics?.entry_date || vehicle.created_at?.split("T")[0],
                  detail?.stock_metrics?.sale_date
                );

                // Compute values for this vehicle
                const appraisal = Number(detail?.appraisal_value || 0);
                const expensesTotal = detail?.costs ? detail.costs.reduce((sum: number, c: VehicleCost) => sum + Number(c.value), 0) : 0;
                const totalInvested = expensesTotal;
                const totalCost = appraisal + totalInvested;
                const salePrice = Number(vehicle.value || 0);
                const profit = salePrice - totalCost;
                const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

                return (
                  <Card
                    key={vehicle.id}
                    className="glass-card overflow-hidden border-white/5 group hover:border-primary/20 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative aspect-video w-full bg-secondary/30 overflow-hidden flex items-center justify-center">
                      {(vehicle.photos_ready && vehicle.photos_ready.length > 0) ? (
                        <img
                          src={vehicle.photos_ready[0]}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=600&auto=format&fit=crop&q=60";
                          }}
                        />
                      ) : vehicle.photos && vehicle.photos.length > 0 ? (
                        <img
                          src={vehicle.photos[0]}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=600&auto=format&fit=crop&q=60";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground/45 gap-1.5 p-4">
                          <ImageIcon size={32} />
                          <span className="text-xs">Sem foto</span>
                        </div>
                      )}
                      {/* Badges on top */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        {getStatusBadge(vehicle.status)}
                        {vehicle.status !== "vendido" && (
                          <Badge className={`font-semibold ${days >= 90 ? "bg-red-500/90 text-white animate-pulse" : days >= 60 ? "bg-orange-500/80 text-white" : days >= 30 ? "bg-amber-500/80 text-white" : "bg-black/50 text-white"}`}>
                            {days} dias em estoque
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-2.5 right-2.5 bg-black/75 px-2 py-0.5 rounded text-[11px] font-mono border border-white/10 text-white">
                        {vehicle.plate}
                      </div>
                    </div>

                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                            {getCategoryIcon(vehicle.category)}
                            {vehicle.brand}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">{vehicle.year}</span>
                        </div>
                        <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {vehicle.model}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 border-t border-border/20 pt-2">
                          <span>KM: {formatMileage(vehicle.mileage)}</span>
                          <span className="capitalize">{vehicle.color}</span>
                        </div>

                        {/* Composição Financeira */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 mt-3 border-t border-dashed border-border/20">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase font-semibold">Compra (Aval.)</span>
                            <span className="font-bold text-foreground">{formatCurrency(appraisal)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase font-semibold">Custos e Despesas</span>
                            <span className="font-bold text-red-400">{formatCurrency(expensesTotal)}</span>
                          </div>
                          <div className="flex flex-col col-span-2 border-t border-border/10 pt-1.5">
                            <div className="flex justify-between items-center text-[10px] mb-1 font-semibold text-cyan-400">
                              <span>Total Investido:</span>
                              <span>{formatCurrency(totalInvested)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-bold text-primary mb-1">
                              <span>Valor de Venda:</span>
                              <span className="text-xs">{formatCurrency(salePrice)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-zinc-900 text-[10px]">
                              <span className="text-muted-foreground font-semibold">Lucro Estimado:</span>
                              <span className={`font-black ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {formatCurrency(profit)} ({margin.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t border-border/20 pt-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleViewDetails(vehicle)}
                            title="Detalhes"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400"
                            onClick={() => handleEdit(vehicle)}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </Button>
                          {userRole === "admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeletePrompt(vehicle)}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="glass-card border-white/5">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="font-semibold">Modelo</TableHead>
                      <TableHead className="font-semibold">Placa</TableHead>
                      <TableHead className="font-semibold">Compra (Aval.)</TableHead>
                      <TableHead className="font-semibold">Custos e Despesas</TableHead>
                      <TableHead className="font-semibold">Total Investido</TableHead>
                      <TableHead className="font-semibold">Preço Venda</TableHead>
                      <TableHead className="font-semibold">Margem / Lucro</TableHead>
                      <TableHead className="font-semibold">Tempo Estoque</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => {
                      const detail = vehiclesWithDetails.find((v: any) => v.id === vehicle.id);
                      const days = calculateDaysInStock(
                        detail?.stock_metrics?.entry_date || vehicle.created_at?.split("T")[0],
                        detail?.stock_metrics?.sale_date
                      );

                      // Compute values for this vehicle
                      const appraisal = Number(detail?.appraisal_value || 0);
                      const expensesTotal = detail?.costs ? detail.costs.reduce((sum: number, c: VehicleCost) => sum + Number(c.value), 0) : 0;
                      const totalInvested = expensesTotal;
                      const totalCost = appraisal + totalInvested;
                      const salePrice = Number(vehicle.value || 0);
                      const profit = salePrice - totalCost;
                      const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

                      return (
                        <TableRow key={vehicle.id} className="border-border/40 hover:bg-secondary/20">
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded overflow-hidden bg-secondary/30 hidden sm:block">
                                {(vehicle.photos_ready && vehicle.photos_ready.length > 0) ? (
                                  <img src={vehicle.photos_ready[0]} alt="" className="object-cover w-full h-full" />
                                ) : vehicle.photos && vehicle.photos.length > 0 ? (
                                  <img src={vehicle.photos[0]} alt="" className="object-cover w-full h-full" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={12} /></div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground">{vehicle.model}</p>
                                <p className="text-xs text-muted-foreground">{vehicle.brand} • {vehicle.year}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">{vehicle.plate}</TableCell>
                          
                          <TableCell className="font-semibold text-foreground">{formatCurrency(appraisal)}</TableCell>
                          <TableCell className="font-semibold text-red-400">{formatCurrency(expensesTotal)}</TableCell>
                          <TableCell className="font-semibold text-cyan-400">{formatCurrency(totalInvested)}</TableCell>
                          <TableCell className="font-semibold text-primary">{formatCurrency(salePrice)}</TableCell>
                          <TableCell className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {margin.toFixed(0)}% ({formatCurrency(profit)})
                          </TableCell>

                          <TableCell>
                            {vehicle.status === "vendido" ? (
                              <span className="text-xs text-muted-foreground">Vendido</span>
                            ) : (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${days >= 90 ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" : days >= 60 ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : days >= 30 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-muted-foreground"}`}>
                                {days} dias
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleViewDetails(vehicle)}
                                title="Detalhes"
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400"
                                onClick={() => handleEdit(vehicle)}
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </Button>
                              {userRole === "admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeletePrompt(vehicle)}
                                  title="Remover"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {vehicles.length} de {totalCount} veículos cadastrados
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
        </TabsContent>

        {/* Tab 2: CUSTOS E DESPESAS */}
        <TabsContent value="custos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: search and metadata */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Buscar Veículo</CardTitle>
                  <CardDescription>Selecione um veículo por placa ou modelo para lançar e gerenciar despesas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="search-cost-vehicle">Veículo *</Label>
                    <Select value={selectedCostVehicleId} onValueChange={setSelectedCostVehicleId}>
                      <SelectTrigger className="bg-black/30 border-border/40 text-foreground w-full">
                        <SelectValue placeholder="Selecione um veículo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-foreground max-h-[300px]">
                        {vehiclesWithDetails.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.brand} {v.model} - {v.plate} ({v.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {costVehicle && (
                    <div className="border-t border-border/30 pt-4 space-y-4">
                      {/* Short details */}
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest block">
                          {costVehicle.brand}
                        </span>
                        <h4 className="text-lg font-bold text-foreground">{costVehicle.model}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-mono text-[10px]">
                            {costVehicle.plate}
                          </Badge>
                          {getStatusBadge(costVehicle.status)}
                        </div>
                      </div>

                      {/* Stock Info Alert */}
                      <div className={`p-3 rounded-lg border flex items-center gap-3 ${costVehicleDays >= 90 ? "bg-red-500/10 text-red-400 border-red-500/20" : costVehicleDays >= 60 ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : costVehicleDays >= 30 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20"}`}>
                        <Clock size={18} className={costVehicleDays >= 90 ? "animate-bounce" : ""} />
                        <div className="text-xs">
                          <p className="font-bold">{costVehicleDays} Dias em Estoque</p>
                          <p className="text-muted-foreground/80 mt-0.5">Entrada: {costVehicle.stock_metrics?.entry_date || "N/A"}</p>
                        </div>
                      </div>

                      {/* Quick updates */}
                      <div className="space-y-2">
                        <Label htmlFor="cost-sale-price" className="text-xs font-semibold">Editar Preço de Venda (R$)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="cost-sale-price"
                            type="text"
                            value={localSalePrice}
                            onChange={(e) => setLocalSalePrice(e.target.value)}
                            className="bg-black/30 text-primary font-bold text-sm h-9"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUpdateSalePrice(parseNumberField(localSalePrice))}
                            className="h-9 px-4 font-semibold text-xs gap-1"
                          >
                            Salvar
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Digite o novo valor e clique em Salvar para atualizar.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right side: costs, profitability, inputs */}
            <div className="lg:col-span-2 space-y-6">
              {costVehicle ? (
                <>
                  {/* Real-time Profitability Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="glass-card border-white/5 bg-secondary/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/2.5 rounded-full blur-[20px]" />
                      <CardHeader className="pb-1.5">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custo de Entrada</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-lg font-bold text-foreground block">{formatCurrency(costVehicleRealEntry)}</span>
                        <span className="text-[9px] text-muted-foreground">Valor pago + débitos e taxas</span>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 bg-secondary/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/2.5 rounded-full blur-[20px]" />
                      <CardHeader className="pb-1.5">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Investimento Total</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-lg font-extrabold text-cyan-400 block">{formatCurrency(costVehicleTotalInvestment)}</span>
                        <span className="text-[9px] text-muted-foreground">Entrada + {costVehicle.costs?.length || 0} despesas ({formatCurrency(costVehicleExpensesTotal)})</span>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 bg-secondary/5 relative overflow-hidden col-span-2 md:col-span-1">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/2.5 rounded-full blur-[20px]" />
                      <CardHeader className="pb-1.5">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lucro Líquido</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-lg font-black block ${costVehicleProfit > 0 ? "text-emerald-400" : "text-rose-500"}`}>
                            {formatCurrency(costVehicleProfit)}
                          </span>
                          <span className="text-xs">
                            {costVehicleProfit > 0 && costVehicleMargin >= 10 ? "🟢" : costVehicleProfit > 0 ? "🟡" : "🔴"}
                          </span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">Margin: {costVehicleMargin.toFixed(1)}% | ROI: {costVehicleRoi.toFixed(1)}%</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Add cost and table details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add cost form */}
                    <div className="md:col-span-1">
                      <Card className="glass-card border-white/5">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Lançar Despesa</CardTitle>
                          <CardDescription>Lançar custos de serviços, peças, etc.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleAddCost} className="space-y-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="cost-desc" className="text-xs">Descrição *</Label>
                              <Input
                                id="cost-desc"
                                placeholder="ex: Pintura, Troca de Óleo"
                                value={costDescription}
                                onChange={(e) => setCostDescription(e.target.value)}
                                className="bg-black/30 h-9 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="cost-val" className="text-xs">Valor R$ *</Label>
                              <Input
                                id="cost-val"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={costValue}
                                onChange={(e) => setCostValue(e.target.value)}
                                className="bg-black/30 h-9 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="cost-date" className="text-xs">Data Serviço *</Label>
                              <Input
                                id="cost-date"
                                type="date"
                                value={costDate}
                                onChange={(e) => setCostDate(e.target.value)}
                                className="bg-black/30 h-9 text-xs"
                                required
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="cost-loc" className="text-xs">Local / Oficina</Label>
                              <Input
                                id="cost-loc"
                                placeholder="ex: Mecânica Silva"
                                value={costLocation}
                                onChange={(e) => setCostLocation(e.target.value)}
                                className="bg-black/30 h-9 text-xs"
                              />
                            </div>

                            <Button type="submit" className="w-full font-semibold h-9" disabled={addingCost}>
                              {addingCost && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Gravar Despesa
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Nota Fiscal Tone-on-Tone Expenses List */}
                    <div className="md:col-span-2 space-y-4">
                      <Card className="glass-card border-white/5 h-full flex flex-col">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Extrato de Custos (Estilo Nota Fiscal)</CardTitle>
                          <CardDescription>Ficha completa de composição de custos, despesas de oficina e regularização.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 p-4">
                          <div className="border border-zinc-900 rounded-xl overflow-hidden bg-black/60 shadow-lg font-mono text-xs">
                            {/* Header */}
                            <div className="bg-zinc-900/60 px-4 py-2 text-[10px] font-bold text-muted-foreground border-b border-zinc-900 uppercase tracking-widest flex justify-between">
                              <span>Item / Descrição do Custo</span>
                              <span>Valor</span>
                            </div>

                            {/* Items list */}
                            <div className="divide-y divide-zinc-900/60 max-h-[280px] overflow-y-auto">
                              {/* 1. Base cost row */}
                              <div className="flex justify-between items-center px-4 py-3 bg-zinc-950/80 hover:bg-zinc-900/10 transition-colors">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-foreground uppercase tracking-wide">CUSTO DE COMPRA (BASE)</span>
                                  <span className="text-[9px] text-muted-foreground">Preço base do veículo + débitos quitados e taxas iniciais</span>
                                </div>
                                <span className="font-bold text-emerald-400">{formatCurrency(costVehicleRealEntry)}</span>
                              </div>

                              {/* 2. Expenses items rows */}
                              {(!costVehicle.costs || costVehicle.costs.length === 0) ? (
                                <div className="text-center py-6 text-muted-foreground/60 text-[10px]">Nenhuma despesa de oficina lançada ainda.</div>
                              ) : (
                                costVehicle.costs.map((c: VehicleCost, idx: number) => {
                                  const isEven = idx % 2 === 0;
                                  return (
                                    <div key={c.id} className={`flex justify-between items-center px-4 py-3 ${isEven ? "bg-zinc-900/10" : "bg-black/20"} hover:bg-zinc-900/20 transition-colors group`}>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-foreground uppercase">{c.description}</span>
                                        <span className="text-[9px] text-muted-foreground">
                                          {c.date} {c.service_location ? `• ${c.service_location}` : ""}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold text-foreground">{formatCurrency(c.value)}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 rounded bg-zinc-900/40 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                          onClick={() => handleDeleteCost(c.id)}
                                        >
                                          <Trash2 size={12} />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Totals footer */}
                            <div className="bg-zinc-950/80 border-t border-zinc-900 p-4 space-y-2">
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-wider">
                                <span>Valor Gasto em Manutenção (Oficina):</span>
                                <span className="font-bold text-foreground">{formatCurrency(costVehicleExpensesTotal)}</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-zinc-900 pt-2 font-bold uppercase tracking-wider text-xs">
                                <span className="text-cyan-400">Valor Total da Moto (Somando Tudo):</span>
                                <span className="text-sm font-black text-cyan-400">{formatCurrency(costVehicleTotalInvestment)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Profitability Suggestion Alert Box */}
                      {costVehicleProfit >= 0 ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex gap-3 items-start animate-fadeIn">
                          <CheckCircle className="shrink-0 text-emerald-400 mt-0.5" size={16} />
                          <div className="text-xs">
                            <p className="font-bold text-emerald-400 uppercase tracking-wide">Rentabilidade Saudável</p>
                            <p className="text-muted-foreground/80 mt-1">
                              O preço de venda estimado de <strong>{formatCurrency(costVehicleSalePrice)}</strong> cobre todos os custos de aquisição e manutenção.
                            </p>
                            <p className="mt-1">
                              Margem de Lucro Esperada: <strong className="text-emerald-400">{costVehicleMargin.toFixed(1)}%</strong> ({formatCurrency(costVehicleProfit)} líquido).
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex gap-3 items-start animate-fadeIn">
                          <AlertTriangle className="shrink-0 text-red-400 mt-0.5" size={16} />
                          <div className="text-xs">
                            <p className="font-bold text-red-400 uppercase tracking-wide">⚠️ Atenção: Prejuízo Detectado nas Despesas</p>
                            <p className="text-muted-foreground/80 mt-1">
                              O investimento acumulado na moto ({formatCurrency(costVehicleTotalInvestment)}) superou o preço de venda estimado ({formatCurrency(costVehicleSalePrice)}), gerando um prejuízo líquido de <strong className="text-red-400">{formatCurrency(Math.abs(costVehicleProfit))}</strong>.
                            </p>
                            <p className="font-semibold text-foreground mt-2">
                              💡 Sugestão ERP: Recomendamos reajustar o Preço de Venda para no mínimo <strong className="text-emerald-400">{formatCurrency(Math.ceil(costVehicleTotalInvestment * 1.15 / 100) * 100)}</strong> para reestabelecer uma margem de lucro de 15% sobre o investimento total.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <Card className="glass-card border-white/5 py-24 text-center text-muted-foreground font-sans">
                  Por favor, busque e selecione um veículo acima para gerenciar os custos.
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: DASHBOARD DE ESTOQUE (RECHARTS GRAPHICS) */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Metrics KPI cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/2.5 rounded-full blur-[20px] group-hover:bg-primary/5 transition-all" />
              <CardHeader className="pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Investido em Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-foreground">{formatCurrency(totalInvestedInStock)}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Veículos ativos no pátio</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/2.5 rounded-full blur-[20px] group-hover:bg-cyan-500/5 transition-all" />
              <CardHeader className="pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor Estimado de Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-cyan-400">{formatCurrency(totalStockMarketValue)}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Preço total de venda potencial</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/2.5 rounded-full blur-[20px] group-hover:bg-emerald-500/5 transition-all" />
              <CardHeader className="pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lucro Líquido Potencial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-400">{formatCurrency(potentialProfitInStock)}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Retorno esperado sob estoque atual</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/2.5 rounded-full blur-[20px] group-hover:bg-amber-500/5 transition-all" />
              <CardHeader className="pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tempo Médio de Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-400">{averageDaysInStock} dias</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Média geral desde a data de entrada</p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Alerts Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card border-white/5 bg-amber-500/5 border-amber-500/10">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Clock size={14} /> Alerta 30 dias de estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-foreground">{vehicles30d} veículos</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5 bg-orange-500/5 border-orange-500/10">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-orange-400 flex items-center gap-1.5">
                  <Clock size={14} /> Alerta 60 dias de estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-foreground">{vehicles60d} veículos</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5 bg-red-500/5 border-red-500/15">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-bold uppercase text-red-500 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="animate-bounce" /> Alerta Crítico (90+ dias)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-red-500">{vehicles90d} veículos</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 1: Profitability per Vehicle */}
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Lucro Potencial por Veículo
                </CardTitle>
                <CardDescription>Top 10 veículos ativos ordenados por lucro potencial projetado</CardDescription>
              </CardHeader>
              <CardContent className="h-80 pb-4">
                {chartRentabilityByVehicle.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem veículos ativos no estoque.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRentabilityByVehicle} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9} tickLine={false} />
                      <YAxis
                        stroke="#a1a1aa"
                        fontSize={9}
                        tickLine={false}
                        tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Lucro Potencial"]}
                        contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                      />
                      <Bar dataKey="Lucro Potencial" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Rentability by Brand */}
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-purple-400">
                  <span className="h-2 w-2 rounded-full bg-purple-400" /> Lucro por Marca
                </CardTitle>
                <CardDescription>Agrupado por fabricante de veículo no pátio</CardDescription>
              </CardHeader>
              <CardContent className="h-80 pb-4">
                {chartRentabilityByBrand.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem marcas para analisar.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRentabilityByBrand} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                      <XAxis dataKey="brand" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                      <YAxis
                        stroke="#a1a1aa"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Lucro Total"]}
                        contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                      />
                      <Bar dataKey="profit" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 3: Stock Status Pie */}
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Distribuição de Status
                </CardTitle>
                <CardDescription>Proporção do inventário por estado de disponibilidade</CardDescription>
              </CardHeader>
              <CardContent className="h-80 flex flex-col items-center justify-center pb-4">
                {chartStatusData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados disponíveis.</div>
                ) : (
                  <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value} veículos`, "Quantidade"]}
                          contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 4: Maintenance Costs per Vehicle */}
            <Card className="glass-card border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-rose-500">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Custos de Oficina por Veículo
                </CardTitle>
                <CardDescription>Soma de manutenções adicionais lançadas por veículo no estoque</CardDescription>
              </CardHeader>
              <CardContent className="h-80 pb-4">
                {chartCostsPerVehicle.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">Nenhuma manutenção lançada.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartCostsPerVehicle} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={9} tickLine={false} />
                      <YAxis
                        stroke="#a1a1aa"
                        fontSize={9}
                        tickLine={false}
                        tickFormatter={(v) => `R$${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Custo Lançado"]}
                        contentStyle={{ backgroundColor: "#0c111d", borderColor: "#27272a" }}
                      />
                      <Bar dataKey="Custo de Manutenção" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: INTEGRAÇÃO E PUBLICAÇÃO NO CATÁLOGO ONLINE */}
        <TabsContent value="publicacao" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Config Card */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="glass-card border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Settings size={18} /> Configurações de API / Webhook
                  </CardTitle>
                  <CardDescription>Cadastre as credenciais do seu catálogo online externo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveCatalogSettings} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="webhook-url">URL do Endpoint do Catálogo</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        placeholder="https://api.seucatalogo.com/v1/vehicles"
                        value={globalCatalogUrl}
                        onChange={(e) => setGlobalCatalogUrl(e.target.value)}
                        className="bg-black/30 text-xs"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground">Endpoint externo que receberá chamadas REST HTTP POST quando ativado.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="webhook-token">Token de Integração (Bearer)</Label>
                      <Input
                        id="webhook-token"
                        type="password"
                        placeholder="Senha ou Chave de API externa"
                        value={globalCatalogToken}
                        onChange={(e) => setGlobalCatalogToken(e.target.value)}
                        className="bg-black/30 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">Enviado no cabeçalho HTTP Authorization.</p>
                    </div>

                    <Button type="submit" className="w-full font-semibold" disabled={savingCatalogSettings}>
                      {savingCatalogSettings && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Salvar Integração
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* API Integration Guide Card */}
              <Card className="glass-card border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Integração com a Vercel
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[11px] leading-relaxed text-muted-foreground space-y-2">
                  <p>
                    Seu catálogo online (como um site Next.js hospedado na <strong>Vercel</strong>) pode se sincronizar em tempo real com este ERP.
                  </p>
                  <div className="space-y-1 bg-black/25 p-3 rounded-lg border border-border/30 font-sans">
                    <p className="font-bold text-foreground">Passo a Passo:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Crie uma rota de API no seu site (ex: <code className="text-primary font-mono text-[9px]">/api/vehicles</code>).</li>
                      <li>Configure essa rota para receber requisições do tipo <strong>POST</strong>.</li>
                      <li>Valide o cabeçalho <code className="text-primary font-mono text-[9px]">Authorization: Bearer &lt;Token&gt;</code> para garantir segurança.</li>
                      <li>Salve os dados recebidos no banco de dados do seu catálogo online.</li>
                    </ol>
                  </div>
                  <p className="text-[10px] italic">
                    O ERP enviará toda a ficha técnica do veículo e links de fotos sempre que você alternar o status de publicação ao lado.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* List and toggle Card */}
            <div className="lg:col-span-2">
              <Card className="glass-card border-white/5 h-full">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Sincronização de Veículos</CardTitle>
                  <CardDescription>Ative ou desative o status de publicação no catálogo online. O sistema enviará dados atualizados ao mudar.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {vehiclesWithDetails.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs font-sans">Nenhum veículo disponível para sincronização.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/40 hover:bg-transparent">
                          <TableHead className="font-semibold text-xs">Veículo</TableHead>
                          <TableHead className="font-semibold text-xs">Placa</TableHead>
                          <TableHead className="font-semibold text-xs">Valor Venda</TableHead>
                          <TableHead className="font-semibold text-xs">Status Estoque</TableHead>
                          <TableHead className="font-semibold text-xs text-center w-[160px]">Status Catálogo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehiclesWithDetails.map((v: any) => {
                          const isPublished = v.publication?.publish_catalog || false;
                          return (
                            <TableRow key={v.id} className="border-border/40 hover:bg-secondary/10">
                              <TableCell className="font-semibold text-xs text-foreground">
                                {v.brand} {v.model} ({v.year})
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{v.plate}</TableCell>
                              <TableCell className="font-semibold text-xs text-primary">{formatCurrency(v.value)}</TableCell>
                              <TableCell>{getStatusBadge(v.status)}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant={isPublished ? "secondary" : "outline"}
                                  size="sm"
                                  onClick={() => handleTogglePublish(v.id, isPublished)}
                                  className={`text-[10px] font-semibold h-7 px-3 flex items-center justify-center gap-1.5 mx-auto ${isPublished ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30" : ""}`}
                                >
                                  {isPublished ? (
                                    <>
                                      <CheckCircle size={10} /> Publicado
                                    </>
                                  ) : (
                                    "Não Publicado"
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog for add / edit vehicle */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-border/40 text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedVehicle ? "Editar Cadastro de Veículo" : "Cadastrar Novo Veículo (Entrada de Estoque)"}
            </DialogTitle>
            <DialogDescription>
              Complete a ficha de entrada, dados de origem, itens recebidos, débitos anteriores e corretagem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
              <TabsList className="bg-black/30 border border-border/40 p-0.5 rounded-lg mb-4 flex overflow-x-auto h-auto gap-0.5">
                <TabsTrigger value="form-basicos" className="text-xs py-1.5 px-3">Dados Básicos</TabsTrigger>
                <TabsTrigger value="form-origem" className="text-xs py-1.5 px-3">Origem e Itens</TabsTrigger>
                <TabsTrigger value="form-financeiro" className="text-xs py-1.5 px-3">Custos, Valores e Estado</TabsTrigger>
                <TabsTrigger value="form-fotos" className="text-xs py-1.5 px-3 font-semibold text-teal-400 border border-teal-500/10 data-[state=active]:bg-teal-500/10 data-[state=active]:border-teal-500/30 flex items-center gap-1.5">
                  <Sparkles size={12} /> Fotos e Divulgação
                </TabsTrigger>
              </TabsList>

              {/* Form Tab 1: Dados Básicos */}
              <TabsContent value="form-basicos" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select
                      defaultValue={selectedVehicle?.category || "carro"}
                      onValueChange={(val) => setValue("category", val as VehicleCategory)}
                    >
                      <SelectTrigger className="bg-black/30 border-border/40 text-foreground">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-foreground">
                        <SelectItem value="carro">Carro</SelectItem>
                        <SelectItem value="moto">Moto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="brand">Marca / Fabricante</Label>
                    <Input id="brand" placeholder="ex: Honda, Toyota" {...register("brand")} className="bg-black/30" />
                    {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" placeholder="ex: Civic, Biz 125" {...register("model")} className="bg-black/30" />
                    {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="version">Versão</Label>
                    <Input id="version" placeholder="ex: EXL 2.0 Flex, ES" {...register("version")} className="bg-black/30" />
                    {errors.version && <p className="text-xs text-destructive">{errors.version.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="year">Ano Fabricação/Modelo</Label>
                    <Input id="year" type="text" placeholder="ex: 2022" {...register("year")} className="bg-black/30" />
                    {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="color">Cor Predominante</Label>
                    <Input id="color" placeholder="ex: Preto, Branco" {...register("color")} className="bg-black/30" />
                    {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="plate">Placa Mercosul/Antiga *</Label>
                    <Input id="plate" placeholder="ex: ABC1D23" {...register("plate")} className="bg-black/30 uppercase" />
                    {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="renavam">Renavam (11 dígitos) *</Label>
                    <Input id="renavam" placeholder="Nº do Registro Nacional" {...register("renavam")} maxLength={11} className="bg-black/30" />
                    {errors.renavam && <p className="text-xs text-destructive">{errors.renavam.message}</p>}
                  </div>

                  <div className="space-y-1.5 font-mono">
                    <Label htmlFor="chassis">Chassi (17 dígitos VIN)</Label>
                    <Input id="chassis" placeholder="Nº de identificação" {...register("chassis")} maxLength={17} className="bg-black/30 uppercase" />
                    {errors.chassis && <p className="text-xs text-destructive">{errors.chassis.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mileage">Quilometragem (KM)</Label>
                    <Input id="mileage" type="text" placeholder="KM" {...register("mileage")} disabled={watchZeroKm} className="bg-black/30 disabled:opacity-60" />
                    {errors.mileage && <p className="text-xs text-destructive">{errors.mileage.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status">Status de Disponibilidade</Label>
                    <Select
                      defaultValue={selectedVehicle?.status || "disponivel"}
                      onValueChange={(val) => setValue("status", val as VehicleStatus)}
                    >
                      <SelectTrigger className="bg-black/30 border-border/40 text-foreground">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-foreground border-zinc-800">
                        <SelectItem value="disponivel">Disponível</SelectItem>
                        <SelectItem value="em_preparacao">Em Preparação</SelectItem>
                        <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
                        <SelectItem value="reservado">Reservado</SelectItem>
                        <SelectItem value="vendido">Vendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notas Gerais / Acessórios / Observações</Label>
                  <Textarea id="notes" placeholder="Detalhes de conservação, opcionais inclusos, etc..." {...register("notes")} className="bg-black/30 border-border/40 h-20 text-xs" />
                </div>

              </TabsContent>

              {/* Form Tab 2: Origem e Itens entregues */}
              <TabsContent value="form-origem" className="space-y-4">
                <Card className="glass-card border-white/5 p-4 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Origem do Veículo (Proprietário Anterior)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="owner_name">Nome do Proprietário</Label>
                      <Input id="owner_name" placeholder="ex: João da Silva" {...register("owner_name")} className="bg-black/30" />
                      {errors.owner_name && <p className="text-xs text-destructive">{errors.owner_name.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="owner_cpf">CPF do Proprietário</Label>
                      <Input id="owner_cpf" placeholder="CPF sem pontos" {...register("owner_cpf")} maxLength={11} className="bg-black/30" />
                      {errors.owner_cpf && <p className="text-xs text-destructive">{errors.owner_cpf.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="owner_phone">Telefone do Proprietário</Label>
                      <Input id="owner_phone" placeholder="ex: 98981223344" {...register("owner_phone")} className="bg-black/30" />
                      {errors.owner_phone && <p className="text-xs text-destructive">{errors.owner_phone.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nickname">Apelido / Referência de Localização (Interno)</Label>
                    <Input id="nickname" placeholder="ex: Bros do Zé Mecânico da Vila Cafeteira" {...register("nickname")} className="bg-black/30" />
                    <p className="text-[10px] text-muted-foreground">Referência informal usada internamente para localizar o veículo.</p>
                  </div>
                </Card>

                {/* Checkbox Checklist de itens entregues */}
                <Card className="glass-card border-white/5 p-4 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Itens Entregues com o Veículo (SIM / NÃO)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { key: "manual", label: "Manual do Proprietário" },
                      { key: "spare_key", label: "Chave Reserva" },
                      { key: "dut", label: "DUT físico" },
                      { key: "atpv", label: "ATPV-e" },
                      { key: "crlv", label: "CRLV" },
                      { key: "power_of_attorney", label: "Procuração" },
                      { key: "clearance", label: "Nada Consta (Débitos)" },
                      { key: "zero_km", label: "Veículo 0km" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-border/20">
                        <Label htmlFor={`item-${item.key}`} className="text-xs cursor-pointer">{item.label}</Label>
                        <input
                          id={`item-${item.key}`}
                          type="checkbox"
                          defaultChecked={selectedVehicle?.items_delivered?.[item.key] || false}
                          {...register(`items_delivered.${item.key}` as any)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-zinc-950"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              {/* Form Tab 3: Valores, Custos, Estado e Entrada (Nota Fiscal de Entrada) */}
              <TabsContent value="form-financeiro" className="space-y-6">
                <div className="border border-dashed border-zinc-700/60 rounded-xl p-6 bg-zinc-950/40 relative space-y-6">
                  {/* Hidden Input for purchase_value to preserve DB compatibility */}
                  <input type="hidden" {...register("purchase_value")} value={watchAppraisalValue || 0} />

                  {/* Nota Fiscal Header */}
                  <div className="flex justify-between items-center border-b border-dashed border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border transition-all ${
                        watchEntryModality === "consignado"
                          ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {watchEntryModality === "consignado" ? <ClipboardList size={18} /> : <FileCheck size={18} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                          {watchEntryModality === "consignado"
                            ? "Ficha de Consignação e Intermediação"
                            : "Ficha de Avaliação e Descontos Financeiros"}
                        </h3>
                        <p className="text-[9px] text-muted-foreground uppercase">
                          {watchEntryModality === "consignado"
                            ? "Registro de Consignação e Prazo Contratual"
                            : "Registro de Operação de Compra e Detalhamento de Custo"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-mono px-2.5 py-1 border rounded bg-zinc-900/60 uppercase font-semibold transition-all ${
                        watchEntryModality === "consignado"
                          ? "text-teal-400 border-teal-850"
                          : "text-muted-foreground border-zinc-850"
                      }`}>
                        {watchEntryModality === "consignado" ? "Consignação" : "Entrada Estoque"}
                      </span>
                    </div>
                  </div>

                  {/* Modality Picker */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Modalidade de Entrada</Label>
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setValue("entry_modality", "compra")}
                        className={`py-2 text-xs font-bold uppercase rounded-md transition-all ${
                          watchEntryModality !== "consignado"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Compra Direta
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue("entry_modality", "consignado")}
                        className={`py-2 text-xs font-bold uppercase rounded-md transition-all ${
                          watchEntryModality === "consignado"
                            ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Consignação
                      </button>
                    </div>
                  </div>

                  {watchEntryModality !== "consignado" ? (
                    <>
                      {/* Seção 1: Valores de Aquisição */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <span className="w-1 h-3 bg-emerald-400 rounded-sm"></span>
                          {watchZeroKm ? "1. Valor de Compra (Base)" : "1. Valor de Avaliação (Base)"}
                        </div>
                        <div className="grid grid-cols-1 gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-lg">
                          <div className="space-y-1.5">
                            <Label htmlFor="appraisal_value" className="text-xs text-muted-foreground font-semibold">
                              {watchZeroKm ? "Valor de Compra (R$) *" : "Valor de Avaliação (R$) *"}
                            </Label>
                            <Input id="appraisal_value" type="text" placeholder="0,00" {...register("appraisal_value")} className="bg-black/40 text-emerald-400 font-bold border-emerald-500/20 focus:border-emerald-500 h-9" />
                            <p className="text-[9px] text-muted-foreground">
                              {watchZeroKm 
                                ? "Preço bruto de aquisição do veículo pela concessionária." 
                                : "Toda a operação de compra, contratos e taxas é calculada com base neste valor de avaliação."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!watchZeroKm && (
                        <>
                          {/* Seção 2: Débitos e Regularizações */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              <span className="w-1 h-3 bg-emerald-400 rounded-sm"></span>
                              2. Débitos e Deduções (A Descontar do Cliente)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Fines */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Multas?</Label>
                                  <Select
                                    value={watchHasFines ? "sim" : "nao"}
                                    onValueChange={(val) => setValue("has_fines", val === "sim")}
                                  >
                                    <SelectTrigger className="w-[70px] h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                      <SelectItem value="sim">Sim</SelectItem>
                                      <SelectItem value="nao">Não</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {watchHasFines && (
                                  <div className="space-y-1.5 animate-fadeIn">
                                    <Label htmlFor="fines_value" className="text-[9px] text-muted-foreground">Valor das Multas (R$)</Label>
                                    <Input id="fines_value" type="text" placeholder="0,00" {...register("fines_value")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                                  </div>
                                )}
                              </Card>

                              {/* IPVA */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">IPVA?</Label>
                                  <Select
                                    value={watchHasIpva ? "sim" : "nao"}
                                    onValueChange={(val) => setValue("has_ipva", val === "sim")}
                                  >
                                    <SelectTrigger className="w-[70px] h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                      <SelectItem value="sim">Sim</SelectItem>
                                      <SelectItem value="nao">Não</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {watchHasIpva && (
                                  <div className="space-y-1.5 animate-fadeIn">
                                    <Label htmlFor="ipva_value" className="text-[9px] text-muted-foreground">Valor IPVA (R$)</Label>
                                    <Input id="ipva_value" type="text" placeholder="0,00" {...register("ipva_value")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                                  </div>
                                )}
                              </Card>

                              {/* Quitação */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Quitação?</Label>
                                  <Select
                                    value={watchHasFinancing ? "sim" : "nao"}
                                    onValueChange={(val) => setValue("has_financing", val === "sim")}
                                  >
                                    <SelectTrigger className="w-[70px] h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                      <SelectItem value="sim">Sim</SelectItem>
                                      <SelectItem value="nao">Não</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {watchHasFinancing && (
                                  <div className="space-y-2 animate-fadeIn">
                                    <div className="space-y-1">
                                      <Label className="text-[8px] text-muted-foreground">Tipo</Label>
                                      <Select
                                        value={watchFinancingType || "financiamento"}
                                        onValueChange={(val) => setValue("financing_type", val as any)}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                          <SelectItem value="financiamento">Financiamento</SelectItem>
                                          <SelectItem value="consorcio">Consórcio</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[8px] text-muted-foreground">Banco</Label>
                                      <Select
                                        value={watchFinancingBank || ""}
                                        onValueChange={(val) => setValue("financing_bank", val)}
                                      >
                                        <SelectTrigger className="h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                          <SelectValue placeholder="Banco" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                          <SelectItem value="HONDA">HONDA</SelectItem>
                                          <SelectItem value="BV">BV</SelectItem>
                                          <SelectItem value="BRADESCO">BRADESCO</SelectItem>
                                          <SelectItem value="PAN">PAN</SelectItem>
                                          <SelectItem value="SANTANDER">SANTANDER</SelectItem>
                                          <SelectItem value="YAMAHA">YAMAHA</SelectItem>
                                          <SelectItem value="SUZUKI">SUZUKI</SelectItem>
                                          <SelectItem value="OMNI">OMNI</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label htmlFor="financing_payout" className="text-[8px] text-muted-foreground">Saldo Quitação (R$)</Label>
                                      <Input id="financing_payout" type="text" placeholder="0,00" {...register("financing_payout")} className="bg-black/40 h-6 text-xs border-zinc-800" />
                                    </div>
                                  </div>
                                )}
                              </Card>

                              {/* Custos Cartório */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-3">
                                <div className="flex flex-col space-y-1">
                                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Cartório</Label>
                                  <Select
                                    value={watchNotaryPaymentType || "cliente_paga_fora"}
                                    onValueChange={(val) => setValue("notary_payment_type", val as any)}
                                  >
                                    <SelectTrigger className="h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                      <SelectItem value="cliente_paga_fora">Cliente paga por fora</SelectItem>
                                      <SelectItem value="loja_assume">Loja assume</SelectItem>
                                      <SelectItem value="descontar_avaliacao">Descontar da avaliação</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(watchNotaryPaymentType === "loja_assume" || watchNotaryPaymentType === "descontar_avaliacao") && (
                                  <div className="space-y-1.5 animate-fadeIn">
                                    <Label htmlFor="notary_costs" className="text-[9px] text-muted-foreground">Valor Taxa (R$)</Label>
                                    <Input id="notary_costs" type="text" placeholder="0,00" {...register("notary_costs")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                                  </div>
                                )}
                              </Card>
                            </div>
                          </div>

                          {/* Seção 3: Corretor e Procuração */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              <span className="w-1 h-3 bg-emerald-400 rounded-sm"></span>
                              3. Custos Operacionais (Corretagem & Procuração)
                            </div>
                            <Card className="bg-black/35 border-zinc-900 p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Corretagem */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">Intermediação de Corretor?</Label>
                                    <Select
                                      value={watchHasBroker ? "sim" : "nao"}
                                      onValueChange={(val) => setValue("has_broker", val === "sim")}
                                    >
                                      <SelectTrigger className="w-[75px] h-6 text-[10px] bg-zinc-900/60 border-zinc-800">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-[10px]">
                                        <SelectItem value="sim">Sim</SelectItem>
                                        <SelectItem value="nao">Não</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {watchHasBroker && (
                                    <div className="grid grid-cols-2 gap-2.5 animate-fadeIn">
                                      <div className="space-y-1">
                                        <Label htmlFor="broker_name" className="text-[9px] text-muted-foreground">Nome Corretor</Label>
                                        <Input id="broker_name" {...register("broker_name")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor="broker_phone" className="text-[9px] text-muted-foreground">Telefone</Label>
                                        <Input id="broker_phone" {...register("broker_phone")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                                      </div>
                                      <div className="space-y-1 col-span-2">
                                        <Label htmlFor="broker_commission" className="text-[9px] text-muted-foreground font-semibold">Comissão Corretor (R$)</Label>
                                        <Input id="broker_commission" type="text" placeholder="0,00" {...register("broker_commission")} className="bg-black/40 h-7 text-xs text-primary font-semibold border-zinc-800" />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Procuração */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">Procuração do Cartório</Label>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label htmlFor="power_value" className="text-[9px] text-muted-foreground font-semibold">Valor Procuração (R$)</Label>
                                    <Input id="power_value" type="text" placeholder="0,00" {...register("power_value")} className="bg-black/40 h-7 text-xs text-primary border-zinc-800" />
                                    <p className="text-[9px] text-muted-foreground">Valor cobrado pela procuração que será descontado do cliente.</p>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </div>

                          {/* Seção 4: Outras Taxas e Serviços Operacionais */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                              <span className="w-1 h-3 bg-emerald-400 rounded-sm"></span>
                              4. Taxas e Serviços Operacionais (A Descontar do Cliente)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                              {/* Despachante */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-1.5">
                                <Label htmlFor="dispatch_fee" className="text-[10px] font-bold uppercase text-muted-foreground">Serviço Despachante (R$)</Label>
                                <Input id="dispatch_fee" type="text" placeholder="0,00" {...register("dispatch_fee")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                              </Card>

                              {/* Intenção de Venda */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-1.5">
                                <Label htmlFor="sale_intention_fee" className="text-[10px] font-bold uppercase text-muted-foreground">Intenção de Venda (R$)</Label>
                                <Input id="sale_intention_fee" type="text" placeholder="0,00" {...register("sale_intention_fee")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                              </Card>

                              {/* Emplacamento */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-1.5">
                                <Label htmlFor="registration_fee" className="text-[10px] font-bold uppercase text-muted-foreground">Emplacamento (R$)</Label>
                                <Input id="registration_fee" type="text" placeholder="0,00" {...register("registration_fee")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                              </Card>

                              {/* Transferência */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-1.5">
                                <Label htmlFor="transfer_fee" className="text-[10px] font-bold uppercase text-muted-foreground">Transferência (R$)</Label>
                                <Input id="transfer_fee" type="text" placeholder="0,00" {...register("transfer_fee")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                              </Card>

                              {/* Taxa de Cancelamento */}
                              <Card className="bg-black/35 border-zinc-900 p-4 space-y-1.5">
                                <Label htmlFor="cancellation_fee" className="text-[10px] font-bold uppercase text-muted-foreground">Taxa Cancelamento (R$)</Label>
                                <Input id="cancellation_fee" type="text" placeholder="0,00" {...register("cancellation_fee")} className="bg-black/40 h-7 text-xs border-zinc-800" />
                              </Card>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Seção 1: Dados da Consignação */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                          <span className="w-1 h-3 bg-teal-400 rounded-sm"></span>
                          1. Dados da Consignação
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-lg">
                          <div className="space-y-1.5">
                            <Label htmlFor="value" className="text-xs text-muted-foreground font-semibold">
                              Valor Estimado de Venda (R$) *
                            </Label>
                            <Input
                              id="value"
                              type="text"
                              placeholder="0,00"
                              {...register("value")}
                              className="bg-black/40 text-teal-400 font-bold border-teal-500/20 focus:border-teal-500 h-9"
                            />
                            <p className="text-[9px] text-muted-foreground">
                              Preço estimado de comercialização final no catálogo.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="consignation_owner_value" className="text-xs text-muted-foreground font-semibold">
                              Valor Líquido Proprietário (R$) *
                            </Label>
                            <Input
                              id="consignation_owner_value"
                              type="text"
                              placeholder="0,00"
                              {...register("consignation_owner_value")}
                              className="bg-black/40 text-teal-400 font-bold border-teal-500/20 focus:border-teal-500 h-9"
                            />
                            <p className="text-[9px] text-muted-foreground">
                              Valor líquido garantido a ser repassado ao proprietário após a venda.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="consignation_period_days" className="text-xs text-muted-foreground font-semibold">
                              Prazo de Consignação (Dias) *
                            </Label>
                            <Input
                              id="consignation_period_days"
                              type="text"
                              placeholder="60"
                              {...register("consignation_period_days")}
                              className="bg-black/40 text-teal-400 font-bold border-teal-500/20 focus:border-teal-500 h-9"
                            />
                            <p className="text-[9px] text-muted-foreground">
                              Tempo de vigência acordado para manter o veículo consignado (ex: 60 dias).
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Seção 5: Estado do Veículo (Consolidado) */}
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                      watchEntryModality === "consignado" ? "text-teal-400" : "text-emerald-400"
                    }`}>
                      <span className={`w-1 h-3 rounded-sm ${
                        watchEntryModality === "consignado" ? "bg-teal-400" : "bg-emerald-400"
                      }`}></span>
                      {watchEntryModality === "consignado" ? "2. Estado de Conservação e Preparação" : "5. Estado de Conservação e Preparação"}
                    </div>
                    <Card className="bg-black/35 border-zinc-900 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="condition" className="text-xs text-muted-foreground">Status de Reparação/Preparação</Label>
                          <Select
                            disabled={watchZeroKm}
                            value={watch("condition") || "nada_a_fazer"}
                            onValueChange={(val) => setValue("condition", val as any)}
                          >
                            <SelectTrigger className="bg-black/40 border-zinc-800 text-foreground w-full h-9 disabled:opacity-60">
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 text-foreground border-zinc-800 text-xs">
                              <SelectItem value="nada_a_fazer">Nada a fazer</SelectItem>
                              <SelectItem value="revisao_simples">Revisão simples</SelectItem>
                              <SelectItem value="troca_pecas">Troca de peças</SelectItem>
                              <SelectItem value="funilaria">Funilaria</SelectItem>
                              <SelectItem value="pintura">Pintura</SelectItem>
                              <SelectItem value="mecanica">Mecânica</SelectItem>
                              <SelectItem value="eletrica">Elétrica</SelectItem>
                              <SelectItem value="preparacao_completa">Preparação completa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="condition_notes" className="text-xs text-muted-foreground">Observações do Estado</Label>
                          <Textarea id="condition_notes" placeholder="Descreva aqui o estado físico geral, avarias ou reparos mecânicos/estéticos necessários..." {...register("condition_notes")} className="bg-black/40 border-zinc-800 text-xs h-9 min-h-[36px]" />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Seção 6: Datas */}
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                      watchEntryModality === "consignado" ? "text-teal-400" : "text-emerald-400"
                    }`}>
                      <span className={`w-1 h-3 rounded-sm ${
                        watchEntryModality === "consignado" ? "bg-teal-400" : "bg-emerald-400"
                      }`}></span>
                      {watchEntryModality === "consignado" ? "3. Data de Entrada no Estoque" : "6. Data de Entrada no Estoque"}
                    </div>
                    <Card className="bg-black/35 border-zinc-900 p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="entry_date" className="text-xs text-muted-foreground">Data de Entrada no Estoque *</Label>
                        <Input id="entry_date" type="date" {...register("entry_date")} className="bg-black/40 border-zinc-800 text-muted-foreground h-9" />
                        {errors.entry_date && <p className="text-xs text-destructive">{errors.entry_date.message}</p>}
                      </div>
                    </Card>
                  </div>

                  {/* Seção 7: Preço de Venda Definido */}
                  {watchEntryModality !== "consignado" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                        <span className="w-1 h-3 bg-primary rounded-sm"></span>
                        7. Preço de Venda Final (Definir Após Avaliar Custos)
                      </div>
                      <Card className="bg-black/35 border-primary/20 p-4">
                        <div className="space-y-1.5 max-w-sm">
                          <Label htmlFor="value" className="text-xs font-bold text-primary">Preço de Venda Sugerido / Estimado (R$)</Label>
                          <Input id="value" type="text" placeholder="0,00" {...register("value")} className="bg-black/40 text-primary font-bold border-primary/20 focus:border-primary h-9" />
                          <p className="text-[9px] text-muted-foreground">Preço de comercialização definido para este veículo.</p>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Seção 8: Totais Financeiros (Visual Nota Fiscal) */}
                  <div className="mt-8 pt-6 border-t border-dashed border-zinc-800">
                    <div className="text-center mb-4">
                      <span className={`text-[10px] font-mono uppercase bg-zinc-900/80 px-4 py-1.5 border rounded-full font-semibold transition-all ${
                        watchEntryModality === "consignado"
                          ? "text-teal-400 border-teal-500/20"
                          : "text-muted-foreground border-zinc-800"
                      }`}>
                        {watchEntryModality === "consignado"
                          ? "Cálculo de Comissão / Resumo Financeiro da Consignação"
                          : "Cálculo de Payout / Resumo Financeiro da Entrada"}
                      </span>
                    </div>
                    
                    {watchEntryModality !== "consignado" ? (
                      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-black/60 shadow-lg font-mono text-xs max-w-2xl mx-auto">
                        <div className="p-5 space-y-3">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase pb-1.5 border-b border-zinc-900">
                            Demonstrativo de Payout (Líquido Cliente)
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">
                              {watchZeroKm ? "Valor de Compra:" : "Valor de Avaliação:"}
                            </span>
                            <span className="font-bold text-foreground">{formatCurrency(numAppraisal)}</span>
                          </div>
                          {!watchZeroKm && (
                            <>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">(-) Multas e Débitos IPVA:</span>
                                <span className="text-red-400">-{formatCurrency(numFines + numIpva)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">(-) Quitação Bancária:</span>
                                <span className="text-red-400">-{formatCurrency(numFinancing)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">(-) Comissão Corretor:</span>
                                <span className="text-red-400">-{formatCurrency(numBroker)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">(-) Cartório (Dedução):</span>
                                <span className="text-red-400">-{formatCurrency(numNotaryDiscount)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground">(-) Custo Procuração:</span>
                                <span className="text-red-400">-{formatCurrency(numPower)}</span>
                              </div>
                            </>
                          )}
                          {(numDispatch > 0 || numSaleIntention > 0 || numRegistration > 0 || numTransfer > 0 || numCancellation > 0) && (
                            <div className="pt-2 border-t border-zinc-900/60 space-y-1.5">
                              <div className="text-[9px] font-bold text-muted-foreground uppercase">Outras Deduções de Taxas</div>
                              {numDispatch > 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-muted-foreground">Serviço de Despachante:</span>
                                  <span className="text-red-400">-{formatCurrency(numDispatch)}</span>
                                </div>
                              )}
                              {numSaleIntention > 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-muted-foreground">Intenção de Venda:</span>
                                  <span className="text-red-400">-{formatCurrency(numSaleIntention)}</span>
                                </div>
                              )}
                              {numRegistration > 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-muted-foreground">Emplacamento:</span>
                                  <span className="text-red-400">-{formatCurrency(numRegistration)}</span>
                                </div>
                              )}
                              {numTransfer > 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-muted-foreground">Transferência:</span>
                                  <span className="text-red-400">-{formatCurrency(numTransfer)}</span>
                                </div>
                              )}
                              {numCancellation > 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-muted-foreground">Taxa de Cancelamento:</span>
                                  <span className="text-red-400">-{formatCurrency(numCancellation)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2.5 border-t border-zinc-900 text-sm">
                            <span className="text-emerald-400 font-extrabold">(=) VALOR A PAGAR CLIENTE:</span>
                            <span className="text-base font-black text-emerald-400">{formatCurrency(calculatedNetClientValue)}</span>
                          </div>
                        </div>
                        
                        {/* Barcode Decoration */}
                        <div className="bg-zinc-950 p-4 text-center border-t border-zinc-900 flex flex-col items-center justify-center gap-1.5">
                          <div className="h-6 flex items-center justify-center tracking-[0.3em] font-sans font-normal text-zinc-800 text-[10px] select-none">
                            ||||| | || ||||| | |||| ||| | ||||| || ||| || ||| |||| |
                          </div>
                          <span className="text-[7.5px] text-zinc-600 uppercase font-mono tracking-wider">
                            DOCUMENTO AUXILIAR DE ENTRADA (ERP REI DAS MOTOS)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-teal-500/20 rounded-xl overflow-hidden bg-black/60 shadow-lg font-mono text-xs max-w-2xl mx-auto transition-all animate-fadeIn">
                        <div className="p-5 space-y-3">
                          <div className="text-[10px] font-bold text-teal-400 uppercase pb-1.5 border-b border-zinc-900">
                            Demonstrativo de Consignação (Estimativa de Intermediação)
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">Valor Estimado de Venda:</span>
                            <span className="font-bold text-foreground">{formatCurrency(numVehicleValue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">(-) Valor Líquido Proprietário:</span>
                            <span className="font-bold text-foreground">{formatCurrency(numConsignationOwner)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2.5 border-t border-zinc-900 text-sm">
                            <span className="text-teal-400 font-extrabold">(=) ESTIMATIVA COMISSÃO (SOBREPREÇO):</span>
                            <span className="text-base font-black text-teal-400">{formatCurrency(estimatedConsignationCommission)}</span>
                          </div>
                        </div>
                        
                        {/* Barcode Decoration */}
                        <div className="bg-zinc-950 p-4 text-center border-t border-zinc-900 flex flex-col items-center justify-center gap-1.5">
                          <div className="h-6 flex items-center justify-center tracking-[0.3em] font-sans font-normal text-teal-950 text-[10px] select-none font-semibold">
                            ||||| | || ||||| | |||| ||| | ||||| || ||| || ||| |||| |
                          </div>
                          <span className="text-[7.5px] text-teal-600/70 uppercase font-mono tracking-wider">
                            CONTRATO DE CONSIGNAÇÃO (ERP REI DAS MOTOS)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Form Tab 4: Fotos e Divulgação (Mídia e Catálogo) */}
              <TabsContent value="form-fotos" className="space-y-6 animate-fadeIn">
                {/* Visual Eye-Catching Header Banner */}
                <div className="border border-dashed border-teal-500/30 rounded-xl p-5 bg-teal-950/20 text-teal-400 flex items-start gap-3.5">
                  <Sparkles className="mt-0.5 shrink-0 text-teal-400" size={18} />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-teal-300">Galeria de Divulgação & Catálogo Online</h4>
                    <p className="text-[10px] text-teal-300/80 mt-1 leading-relaxed">
                      Sinalize e prepare o veículo para o catálogo digital. Fotos profissionais do catálogo (pronto para venda) são enviadas diretamente para a divulgação nos canais online e anúncios da loja.
                    </p>
                  </div>
                </div>

                <div className="border border-dashed border-zinc-700/60 rounded-xl p-6 bg-zinc-950/40 space-y-6">
                  {/* Gallery 1: Entrada / Vistoria */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                      <ClipboardList size={14} className="text-muted-foreground" /> 1. Fotos de Entrada (Vistoria de Estoque)
                    </h4>
                    <p className="text-[10px] text-amber-500 font-semibold leading-relaxed max-w-2xl bg-amber-500/5 border border-amber-500/10 p-2 rounded">
                      ⚠️ OBS: Registre o estado atual do veículo na entrada física do estoque (detalhes, avarias, vistoria geral).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="border border-dashed border-border/60 rounded-lg p-4 flex flex-col items-center justify-center bg-black/10 hover:bg-black/30 transition-all relative">
                        <Upload size={20} className="text-muted-foreground mb-2" />
                        <span className="text-[10px] text-muted-foreground font-semibold">Carregar Imagens de Entrada</span>
                        <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>

                      <div className="flex flex-col justify-center space-y-2">
                        <Label htmlFor="img-url-entrada" className="text-[10px]">Cole URL direta da imagem</Label>
                        <div className="flex gap-2">
                          <Input id="img-url-entrada" placeholder="https://exemplo.com/foto-vistoria.jpg" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="bg-black/30 flex-1 text-xs h-8" />
                          <Button type="button" variant="outline" size="sm" onClick={handleAddImageUrl} className="h-8 text-xs px-3">Adicionar</Button>
                        </div>
                      </div>
                    </div>

                    {formPhotos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 bg-secondary/5 border border-border/40 p-3 rounded-lg">
                        {formPhotos.map((photoUrl, idx) => (
                          <div key={idx} className="relative aspect-video w-full rounded overflow-hidden border border-border/40 group/photo">
                            <img src={photoUrl} alt="" className="object-cover w-full h-full" />
                            <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-0.5 hover:bg-red-700 transition-colors opacity-0 group-hover/photo:opacity-100"><X size={8} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gallery 2: Catálogo / Pronto para venda */}
                  <div className="space-y-3 pt-4 border-t border-border/25">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                      <Sparkles size={14} className="text-emerald-400" /> 2. Fotos do Catálogo (Pronto para Venda / Publicação)
                    </h4>
                    <p className="text-[10px] text-emerald-400 font-semibold leading-relaxed max-w-2xl bg-emerald-500/5 border border-emerald-500/10 p-2 rounded">
                      ✨ IMPORTANTE: Estas são as fotos que serão enviadas para o catálogo online e anúncios. Carregue fotos tratadas, limpas e profissionais do veículo.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="border border-dashed border-border/60 rounded-lg p-4 flex flex-col items-center justify-center bg-black/10 hover:bg-black/30 transition-all relative">
                        <Upload size={20} className="text-emerald-400/80 mb-2" />
                        <span className="text-[10px] text-muted-foreground font-semibold">Carregar Imagens do Catálogo</span>
                        <input type="file" multiple accept="image/*" onChange={handleFileUploadReady} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>

                      <div className="flex flex-col justify-center space-y-2">
                        <Label htmlFor="img-url-catalogo" className="text-[10px]">Cole URL direta da imagem de catálogo</Label>
                        <div className="flex gap-2">
                          <Input id="img-url-catalogo" placeholder="https://exemplo.com/foto-pronto.jpg" value={newImageUrlReady} onChange={(e) => setNewImageUrlReady(e.target.value)} className="bg-black/30 flex-1 text-xs h-8" />
                          <Button type="button" variant="outline" size="sm" onClick={handleAddImageUrlReady} className="h-8 text-xs px-3">Adicionar</Button>
                        </div>
                      </div>
                    </div>

                    {formPhotosReady.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 bg-secondary/5 border border-border/40 p-3 rounded-lg">
                        {formPhotosReady.map((photoUrl, idx) => (
                          <div key={idx} className="relative aspect-video w-full rounded overflow-hidden border border-emerald-500/20 group/photo-ready">
                            <img src={photoUrl} alt="" className="object-cover w-full h-full" />
                            <button type="button" onClick={() => removePhotoReady(idx)} className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-0.5 hover:bg-red-700 transition-colors opacity-0 group-hover/photo-ready:opacity-100"><X size={8} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t border-border/20 flex items-center justify-between sm:justify-between w-full">
              {activeFormTab === "form-basicos" && (
                <>
                  <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={async () => {
                    const isValid = await trigger(["plate", "renavam"]);
                    if (isValid) {
                      setActiveFormTab("form-origem");
                    }
                  }} className="font-semibold gap-1">
                    Próximo <ArrowRight size={14} />
                  </Button>
                </>
              )}
              {activeFormTab === "form-origem" && (
                <>
                  <Button type="button" variant="ghost" onClick={() => setActiveFormTab("form-basicos")} disabled={isSubmitting}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={() => setActiveFormTab("form-financeiro")} className="font-semibold gap-1">
                    Próximo <ArrowRight size={14} />
                  </Button>
                </>
              )}
              {activeFormTab === "form-financeiro" && (
                <>
                  <Button type="button" variant="ghost" onClick={() => setActiveFormTab("form-origem")} disabled={isSubmitting}>
                    Voltar
                  </Button>
                  <Button type="button" onClick={() => setActiveFormTab("form-fotos")} className="font-semibold gap-1 bg-teal-600 hover:bg-teal-700 text-white">
                    Próximo (Fotos) <ArrowRight size={14} />
                  </Button>
                </>
              )}
              {activeFormTab === "form-fotos" && (
                <>
                  <Button type="button" variant="ghost" onClick={() => setActiveFormTab("form-financeiro")} disabled={isSubmitting}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="font-semibold bg-primary hover:bg-primary/90 text-white">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedVehicle ? "Salvar Alterações" : "Cadastrar Veículo"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-border/40 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} /> Excluir Veículo
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o veículo{" "}
              <strong className="text-foreground">{selectedVehicle?.brand} {selectedVehicle?.model}</strong> (Placa: {selectedVehicle?.plate})?
              Esta ação removerá permanentemente o veículo, seus débitos, custos de oficina e publicação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (selectedVehicle) {
                  await deleteMutation.mutateAsync(selectedVehicle.id);
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

      {/* Dialog for view vehicle details */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-border/40 text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Car className="text-primary" /> Ficha Técnica e Histórico de Entrada
            </DialogTitle>
          </DialogHeader>

          {selectedVehicle && (
            <div className="space-y-6 mt-2">
              {/* Photo galleries tabs */}
              <Tabs defaultValue="galeria-catalogo" className="w-full">
                <TabsList className="bg-black/30 border border-border/40 p-0.5 rounded-lg mb-3 flex gap-0.5 w-full justify-start">
                  <TabsTrigger value="galeria-catalogo" className="text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold">
                    <Sparkles size={14} className="text-emerald-400" /> Fotos do Catálogo (Pronto para Venda)
                  </TabsTrigger>
                  <TabsTrigger value="galeria-entrada" className="text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold">
                    <ClipboardList size={14} className="text-muted-foreground" /> Fotos de Entrada (Vistoria)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="galeria-catalogo" className="space-y-2 mt-0">
                  {selectedVehicle.photos_ready && selectedVehicle.photos_ready.length > 0 ? (
                    <div className="space-y-2">
                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/40 bg-black/40">
                        <img
                          src={selectedVehicle.photos_ready[0]}
                          alt="Catálogo"
                          className="object-contain w-full h-full"
                        />
                      </div>
                      {selectedVehicle.photos_ready.length > 1 && (
                        <div className="grid grid-cols-6 gap-2">
                          {selectedVehicle.photos_ready.slice(1).map((photoUrl: string, idx: number) => (
                            <div key={idx} className="aspect-video rounded overflow-hidden border border-border/30">
                              <img src={photoUrl} alt="" className="object-cover w-full h-full" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg bg-secondary/15 flex flex-col items-center justify-center text-muted-foreground/60 border border-border/30 p-4">
                      <ImageIcon size={36} className="mb-2 text-muted-foreground/40" />
                      <span className="text-xs font-semibold">Sem fotos prontas no catálogo</span>
                      <span className="text-[10px] text-muted-foreground/50 mt-1">Edite o veículo para enviar as fotos prontas para publicação online</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="galeria-entrada" className="space-y-2 mt-0">
                  {selectedVehicle.photos && selectedVehicle.photos.length > 0 ? (
                    <div className="space-y-2">
                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/40 bg-black/40">
                        <img
                          src={selectedVehicle.photos[0]}
                          alt="Vistoria Entrada"
                          className="object-contain w-full h-full"
                        />
                      </div>
                      {selectedVehicle.photos.length > 1 && (
                        <div className="grid grid-cols-6 gap-2">
                          {selectedVehicle.photos.slice(1).map((photoUrl: string, idx: number) => (
                            <div key={idx} className="aspect-video rounded overflow-hidden border border-border/30">
                              <img src={photoUrl} alt="" className="object-cover w-full h-full" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg bg-secondary/15 flex flex-col items-center justify-center text-muted-foreground/60 border border-border/30 p-4">
                      <ImageIcon size={36} className="mb-2" />
                      <span className="text-xs">Sem fotos de vistoria</span>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Technical Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 border-t border-b border-border/30 py-4 text-xs">
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Marca</p>
                  <p className="font-semibold text-foreground">{selectedVehicle.brand}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Modelo</p>
                  <p className="font-semibold text-foreground">{selectedVehicle.model}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Versão</p>
                  <p className="font-semibold text-foreground">{selectedVehicle.version || "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Ano</p>
                  <p className="font-semibold text-foreground">{selectedVehicle.year}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Placa</p>
                  <p className="font-mono font-bold text-primary">{selectedVehicle.plate}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Cor</p>
                  <p className="font-semibold text-foreground capitalize">{selectedVehicle.color}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Quilometragem</p>
                  <p className="font-semibold text-foreground">{formatMileage(selectedVehicle.mileage)}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Status atual</p>
                  <div className="mt-0.5">{getStatusBadge(selectedVehicle.status)}</div>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Renavam</p>
                  <p className="font-mono text-foreground">{selectedVehicle.renavam}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-bold text-muted-foreground uppercase">Chassi (VIN)</p>
                  <p className="font-mono text-foreground">{selectedVehicle.chassis}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase">Categoria</p>
                  <p className="font-semibold text-foreground capitalize flex items-center gap-1">
                    {getCategoryIcon(selectedVehicle.category)}
                    {selectedVehicle.category}
                  </p>
                </div>
              </div>

              {/* Origem e checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-2">
                  <h4 className="font-bold text-primary uppercase border-b border-border/20 pb-1">Origem do Proprietário</h4>
                  <p><span className="text-muted-foreground">Nome:</span> <strong className="text-foreground">{selectedVehicle.owner_name || "-"}</strong></p>
                  <p><span className="text-muted-foreground">CPF:</span> <strong className="text-foreground">{selectedVehicle.owner_cpf || "-"}</strong></p>
                  <p><span className="text-muted-foreground">Telefone:</span> <strong className="text-foreground">{selectedVehicle.owner_phone || "-"}</strong></p>
                  {selectedVehicle.nickname && <p><span className="text-muted-foreground">Apelido/Referência:</span> <strong className="text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded">{selectedVehicle.nickname}</strong></p>}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-primary uppercase border-b border-border/20 pb-1">Itens Entregues</h4>
                  <div className="grid grid-cols-2 gap-y-1">
                    {selectedVehicle.items_delivered && Object.entries(selectedVehicle.items_delivered).map(([key, val]) => (
                      <p key={key} className="flex items-center gap-1.5 capitalize text-muted-foreground">
                        <span className={val ? "text-emerald-400" : "text-rose-500"}>{val ? "✓" : "✗"}</span> {key.replace(/_/g, " ")}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Finance details */}
              {(() => {
                const selectedVehicleFines = selectedVehicle.debts?.has_fines ? Number(selectedVehicle.debts?.fines_value || 0) : 0;
                const selectedVehicleIpva = selectedVehicle.debts?.has_ipva ? Number(selectedVehicle.debts?.ipva_value || 0) : 0;
                const selectedVehicleFinancing = selectedVehicle.debts?.has_financing ? Number(selectedVehicle.debts?.financing_payout || 0) : 0;
                const selectedVehicleBroker = selectedVehicle.broker?.has_broker ? Number(selectedVehicle.broker?.broker_commission || 0) : 0;
                const selectedVehiclePower = (selectedVehicle.power_of_attorney?.has_power && selectedVehicle.power_of_attorney?.power_payer === "loja") ? Number(selectedVehicle.power_of_attorney?.power_value || 0) : 0;
                const selectedVehicleNotary = selectedVehicle.notary_payment_type === "descontar_avaliacao" ? Number(selectedVehicle.notary_costs || 0) : 0;
                
                const selectedVehicleDispatch = Number(selectedVehicle.dispatch_fee || 0);
                const selectedVehicleSaleIntention = Number(selectedVehicle.sale_intention_fee || 0);
                const selectedVehicleRegistration = Number(selectedVehicle.registration_fee || 0);
                const selectedVehicleTransfer = Number(selectedVehicle.transfer_fee || 0);
                const selectedVehicleCancellation = Number(selectedVehicle.cancellation_fee || 0);

                const selectedVehicleNetClient = (selectedVehicle.appraisal_value || 0) 
                  - selectedVehicleFines 
                  - selectedVehicleIpva 
                  - selectedVehicleFinancing 
                  - selectedVehicleNotary 
                  - selectedVehiclePower 
                  - selectedVehicleBroker 
                  - selectedVehicleDispatch 
                  - selectedVehicleSaleIntention 
                  - selectedVehicleRegistration 
                  - selectedVehicleTransfer 
                  - selectedVehicleCancellation;

                const selectedVehicleExpensesTotal = selectedVehicle.costs ? selectedVehicle.costs.reduce((sum: number, c: any) => sum + Number(c.value), 0) : 0;
                const selectedVehicleTotalInvestment = selectedVehicleExpensesTotal;
                const selectedVehicleTotalCost = (selectedVehicle.appraisal_value || 0) + selectedVehicleExpensesTotal;
                const selectedVehicleSalePrice = Number(selectedVehicle.value || 0);
                const selectedVehicleProfit = selectedVehicleSalePrice - selectedVehicleTotalCost;
                const selectedVehicleMargin = selectedVehicleSalePrice > 0 ? (selectedVehicleProfit / selectedVehicleSalePrice) * 100 : 0;

                if (selectedVehicle.entry_modality === "consignado") {
                  const salePrice = Number(selectedVehicle.value || 0);
                  const ownerValue = Number(selectedVehicle.consignation_owner_value || 0);
                  const estimatedCommission = Math.max(0, salePrice - ownerValue);
                  const periodDays = selectedVehicle.consignation_period_days || 60;
                  const selectedVehicleExpensesTotal = selectedVehicle.costs ? selectedVehicle.costs.reduce((sum: number, c: any) => sum + Number(c.value), 0) : 0;
                  const totalCost = ownerValue + selectedVehicleExpensesTotal;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-teal-950/20 p-4 rounded-lg border border-teal-500/20">
                      <div className="space-y-2">
                        <h4 className="font-bold text-teal-400 uppercase pb-1 border-b border-teal-500/10 flex items-center gap-1.5">
                          <Coins size={14} /> Modalidade Consignação
                        </h4>
                        <p><span className="text-muted-foreground">Valor Estimado de Venda:</span> <strong className="text-foreground">{formatCurrency(salePrice)}</strong></p>
                        <p><span className="text-muted-foreground">Valor Garantido ao Proprietário:</span> <strong className="text-foreground">{formatCurrency(ownerValue)}</strong></p>
                        <p><span className="text-muted-foreground">Prazo de Consignação:</span> <strong className="text-foreground">{periodDays} dias</strong></p>
                        
                        <div className="pt-1.5 border-t border-teal-500/10">
                          <p className="text-teal-400 font-bold"><span className="text-muted-foreground">Comissão Estimada da Loja:</span> {formatCurrency(estimatedCommission)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-bold text-foreground uppercase pb-1 border-b border-border/10">Custos Internos & Manutenção</h4>
                        <p><span className="text-muted-foreground font-semibold">Custos e Despesas (Manutenção):</span> <strong className="text-red-400">{formatCurrency(selectedVehicleExpensesTotal)}</strong></p>
                        <p className="text-muted-foreground/80 text-[10px]">A comissão estimada é calculada subtraindo o valor garantido do proprietário do valor de venda sugerido. Despesas de manutenção no estoque reduzem o lucro líquido real da comissão.</p>
                        
                        <div className="pt-2 border-t border-border/10 space-y-1">
                          <p className="text-cyan-400 font-bold"><span className="text-muted-foreground">Custo Total Consignado + Prep:</span> {formatCurrency(totalCost)}</p>
                          <p className="text-emerald-400 font-bold"><span className="text-muted-foreground">Lucro Líquido Estimado da Loja:</span> {formatCurrency(Math.max(0, estimatedCommission - selectedVehicleExpensesTotal))}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-secondary/10 p-4 rounded-lg border border-border/30">
                    <div className="space-y-2">
                      <h4 className="font-bold text-foreground uppercase pb-1 border-b border-border/10">Compra & Custos Iniciais</h4>
                      <p><span className="text-muted-foreground">Avaliação:</span> <strong className="text-foreground">{formatCurrency(selectedVehicle.appraisal_value || 0)}</strong></p>
                      <p><span className="text-muted-foreground">Custos de Cartório:</span> <strong className="text-foreground">{formatCurrency(selectedVehicle.notary_costs || 0)}</strong></p>
                      {selectedVehicle.power_of_attorney?.has_power && (
                        <p><span className="text-muted-foreground">Procuração ({selectedVehicle.power_of_attorney.power_payer}):</span> <strong className="text-foreground">{formatCurrency(selectedVehicle.power_of_attorney.power_value || 0)}</strong></p>
                      )}
                      
                      {/* Novas Taxas */}
                      {selectedVehicleDispatch > 0 && <p><span className="text-muted-foreground">Serviço de Despachante:</span> <strong className="text-foreground">{formatCurrency(selectedVehicleDispatch)}</strong></p>}
                      {selectedVehicleSaleIntention > 0 && <p><span className="text-muted-foreground">Intenção de Venda:</span> <strong className="text-foreground">{formatCurrency(selectedVehicleSaleIntention)}</strong></p>}
                      {selectedVehicleRegistration > 0 && <p><span className="text-muted-foreground">Emplacamento:</span> <strong className="text-foreground">{formatCurrency(selectedVehicleRegistration)}</strong></p>}
                      {selectedVehicleTransfer > 0 && <p><span className="text-muted-foreground">Transferência:</span> <strong className="text-foreground">{formatCurrency(selectedVehicleTransfer)}</strong></p>}
                      {selectedVehicleCancellation > 0 && <p><span className="text-muted-foreground">Taxa de Cancelamento:</span> <strong className="text-foreground">{formatCurrency(selectedVehicleCancellation)}</strong></p>}
                      
                      <div className="pt-1.5 border-t border-border/10">
                        <p className="text-emerald-400 font-bold"><span className="text-muted-foreground">Líquido a Pagar Cliente:</span> {formatCurrency(selectedVehicleNetClient)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-foreground uppercase pb-1 border-b border-border/10">Débitos, Oficina & Margem</h4>
                      {selectedVehicle.debts?.has_fines ? (
                        <p><span className="text-muted-foreground">Multas Pendentes:</span> <strong className="text-rose-400">{formatCurrency(selectedVehicle.debts.fines_value || 0)}</strong></p>
                      ) : <p><span className="text-muted-foreground">Multas:</span> <span className="text-emerald-400 font-semibold">Sem Débitos</span></p>}

                      {selectedVehicle.debts?.has_ipva ? (
                        <p><span className="text-muted-foreground">IPVA Pendente:</span> <strong className="text-rose-400">{formatCurrency(selectedVehicle.debts.ipva_value || 0)}</strong></p>
                      ) : <p><span className="text-muted-foreground">IPVA:</span> <span className="text-emerald-400 font-semibold">Em Dia</span></p>}

                      {selectedVehicle.debts?.has_financing && (
                        <p><span className="text-muted-foreground">Financiamento ({selectedVehicle.debts.financing_bank}):</span> <strong className="text-rose-400">{formatCurrency(selectedVehicle.debts.financing_payout || 0)}</strong></p>
                      )}

                      {selectedVehicle.broker?.has_broker && (
                        <p><span className="text-muted-foreground">Corretor ({selectedVehicle.broker.broker_name}):</span> <strong className="text-foreground">{formatCurrency(selectedVehicle.broker.broker_commission || 0)}</strong></p>
                      )}
                      
                      <div className="pt-2 border-t border-border/10 space-y-1">
                        <p><span className="text-muted-foreground font-semibold">Custos e Despesas (Manutenção):</span> <strong className="text-red-400">{formatCurrency(selectedVehicleExpensesTotal)}</strong></p>
                        <p className="text-cyan-400 font-bold"><span className="text-muted-foreground">Total Investido (Estoque):</span> {formatCurrency(selectedVehicleTotalInvestment)}</p>
                        <p className="text-primary font-bold"><span className="text-muted-foreground">Preço de Venda Estimado:</span> {formatCurrency(selectedVehicleSalePrice)}</p>
                        <p className={`font-black ${selectedVehicleProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          <span className="text-muted-foreground">Margem/Lucro Estimado:</span> {formatCurrency(selectedVehicleProfit)} ({selectedVehicleMargin.toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* State and Observations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <h4 className="font-bold text-primary uppercase pb-1 border-b border-border/20">Estado de Conservação</h4>
                  <p className="mt-1 capitalize"><span className="text-muted-foreground">Status do veículo:</span> <strong className="text-foreground">{selectedVehicle.condition?.replace(/_/g, " ") || "-"}</strong></p>
                  {selectedVehicle.condition_notes && (
                    <div className="bg-secondary/15 p-2 rounded border border-border/30 mt-2 text-muted-foreground leading-relaxed">
                      {selectedVehicle.condition_notes}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-primary uppercase pb-1 border-b border-border/20">Datas & Tempo de Pátio</h4>
                  <p className="mt-1"><span className="text-muted-foreground">Entrada:</span> <strong className="text-foreground">{selectedVehicle.stock_metrics?.entry_date || "-"}</strong></p>
                  <p><span className="text-muted-foreground">Venda:</span> <strong className="text-foreground">{selectedVehicle.stock_metrics?.sale_date || "Ainda no estoque"}</strong></p>
                  <p className="text-sm font-black text-cyan-400 mt-2">Dias em estoque: {calculateDaysInStock(selectedVehicle.stock_metrics?.entry_date, selectedVehicle.stock_metrics?.sale_date)} dias</p>
                </div>
              </div>

              {/* Notes */}
              {selectedVehicle.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Observações Gerais</h4>
                  <div className="bg-secondary/15 border border-border/40 p-3 rounded-lg text-muted-foreground text-xs whitespace-pre-line leading-relaxed">
                    {selectedVehicle.notes}
                  </div>
                </div>
              )}

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
