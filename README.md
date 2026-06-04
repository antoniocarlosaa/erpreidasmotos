# ERP Automotivo - Gestão de Carros e Motos

Um sistema ERP de alto padrão, moderno e completo, projetado especificamente para concessionárias e lojas de veículos (carros e motos). Desenvolvido com **Next.js 15**, **React 19**, **TypeScript** e **Supabase (PostgreSQL)**, o sistema utiliza arquitetura corporativa moderna com **Clean Architecture**, **Service Layer**, **Repository Pattern** e segurança robusta via **Row Level Security (RLS)** para isolamento multi-empresa (Multi-tenancy).

---

## 🚀 Funcionalidades Principais

*   **📊 Dashboard Gerencial**: KPIs analíticos em tempo real (Faturamento, Ticket Médio, Conversão, Estoque) com gráficos dinâmicos de fluxo de caixa e funis operacionais construídos com Recharts.
*   **🚗 Gestão de Estoque (Veículos)**: Cadastro completo de carros e motos com ficha técnica (chassi, renavam, placa formatada, quilometragem) e galeria de fotos integrada ao Supabase Storage.
*   **👤 Cadastro de Clientes**: CRM integrado com validações completas (máscaras de CPF, WhatsApp e telefones) e controle de dados cadastrais.
*   **📝 Contratos e Vendas**: Gerador de contratos dinâmicos com autosave em LocalStorage, controle de versões de minutas e cálculo em tempo real de parcelas via Tabela Price (com juros amortizados).
*   **✍️ Assinatura Eletrônica Digital**: Assinatura na tela do comprador e vendedor com coleta de metadados de validade jurídica (IP, User Agent, geolocalização e data/hora), gerando contratos carimbados e em conformidade.
*   **🚚 Timeline Pós-Venda e Kanban**: Fluxo de transferência veicular visual em Kanban drag-and-drop auditável com logs automáticos de movimentações para controle operacional.
*   **💰 Controle Financeiro**: Fluxo de caixa com categorização de despesas operacionais e acompanhamento individualizado de parcelas contratuais (baixas de recebíveis integradas ao caixa).

---

## 🛠️ Stack Tecnológica

*   **Core**: Next.js 15 (App Router), React 19, TypeScript
*   **Estilização**: Tailwind CSS com tema Dark-First Premium (Glassmorphism e Glow effects)
*   **Interface e Componentes**: shadcn/ui (Button, Card, Input, Textarea, Dialog, Select, Tabs, Badge, Table)
*   **Ícones**: Lucide Icons
*   **Gerenciamento de Formulários**: React Hook Form + Zod (Validação de schemas)
*   **Dados e Estado**: TanStack React Query v5 (cache, queries e mutações em tempo real) + Supabase JS Client
*   **Geração de Documentos**: PDF-Lib (incorporação de assinaturas base64 diretamente na minuta contratual)
*   **Gráficos**: Recharts
*   **Banco de Dados & Autenticação**: Supabase PostgreSQL com Row Level Security (RLS) e Auth

---

## 📁 Estrutura de Pastas (Clean Architecture)

```text
├── actions/             # Next.js Server Actions (mutações seguras)
├── app/                 # Rotas do Next.js (App Router)
│   └── (rotas)/         # Telas da aplicação (Dashboard, Clientes, Veículos, Financeiro, etc.)
├── components/          # Componentes reutilizáveis e de página
│   ├── ui/              # Componentes de base (Shadcn/ui)
│   ├── contracts/       # Formulários e detalhes de contratos
│   ├── finance/         # Livro de caixa e tabelas de parcelas
│   └── ...
├── services/            # Camada de Regras de Negócio (Services)
├── repositories/        # Camada de Acesso a Dados (Supabase CRUD & Queries)
├── types/               # Tipagens e DTOs do TypeScript
├── utils/               # Validadores, máscaras e formatadores auxiliares
├── supabase/            # Arquivos SQL de Banco de Dados (Schema e Seeds)
└── middleware.ts        # Proteção de rotas com base nos níveis de acesso dos perfis
```

---

## 🔧 Configuração e Inicialização Local

### 1. Requisitos Prévios
*   Node.js (v18.x ou superior)
*   Conta no [Supabase](https://supabase.com)

### 2. Configurando o Banco de Dados (Supabase)
No painel do seu projeto Supabase, acesse o **SQL Editor** e execute:
1.  **Esquema de Tabelas (`supabase/schema.sql`)**: Copie e cole todo o conteúdo do arquivo [supabase/schema.sql](file:///c:/Users/REI%20DAS%20MOTOS%20SLZ/Desktop/PROJETOS%20DEV%20/PROJETOS/contrato/supabase/schema.sql) para estruturar as tabelas, índices e funções de RLS.
2.  **Dados Fictícios (`supabase/seed.sql`)**: Opcionalmente, copie e cole o conteúdo de [supabase/seed.sql](file:///c:/Users/REI%20DAS%20MOTOS%20SLZ/Desktop/PROJETOS%20DEV%20/PROJETOS/contrato/supabase/seed.sql) para popular o banco com uma empresa modelo ("AutoPrime Multimarcas"), usuários de teste com papéis específicos, clientes fictícios, estoque de veículos e transações de demonstração.

### 3. Variáveis de Ambiente
Renomeie o arquivo `.env.example` para `.env` no diretório raiz do projeto e configure as credenciais do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-publica
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-admin
```

> 🚨 **Importante**: A chave `SUPABASE_SERVICE_ROLE_KEY` é usada exclusivamente no lado do servidor (Server Actions) para permitir assinaturas de contratos públicas por clientes que não possuem conta cadastrada no ERP.

### 4. Instalando Dependências e Rodando o Projeto

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 👥 Credenciais de Teste (Usuários Seed)

Caso tenha executado o script de `seed.sql`, você pode logar com os seguintes perfis:

| Perfil / Cargo | E-mail | Senha | Acessos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@autoprime.com` | `123456` | Acesso total a todas as áreas, incluindo KPIs e auditoria. |
| **Vendedor** | `vendedor@autoprime.com` | `123456` | Registro de clientes, estoque e novas propostas. |
| **Financeiro** | `financeiro@autoprime.com` | `123456` | Controle de parcelas, livro de caixa e fluxo financeiro. |
| **Operacional** | `operacional@autoprime.com` | `123456` | Timeline de transferências e Kanban de pós-venda. |

---

## 📦 Deploy em Produção (Vercel)

1.  Crie um novo projeto na [Vercel](https://vercel.com).
2.  Importe o repositório git correspondente.
3.  Configure as variáveis de ambiente em **Settings > Environment Variables** idênticas às do seu arquivo `.env`.
4.  Clique em **Deploy**. O projeto Next.js 15 será otimizado de forma nativa pela Vercel.

---

## 📄 Licença

Este software é fornecido exclusivamente para fins comerciais internos e de demonstração operacional do ERP.
