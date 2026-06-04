-- =========================================================================
-- 🚀 SCRIPT DE CONFIGURAÇÃO RÁPIDA DO SUPABASE PARA O CATÁLOGO ONLINE 🚀
-- Execute este script no "SQL Editor" do seu novo projeto Supabase.
-- Ele cria a tabela de veículos, o bucket de mídias e configura a segurança.
-- =========================================================================

-- 1. CRIAR A TABELA DE VEÍCULOS (Se não existir)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC,
    price_text TEXT,
    type TEXT DEFAULT 'MOTOS',
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    video_url TEXT,
    videos TEXT[] DEFAULT '{}',
    is_sold BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_promo_semana BOOLEAN DEFAULT false,
    is_promo_mes BOOLEAN DEFAULT false,
    is_zero_km BOOLEAN DEFAULT false,
    specs TEXT,
    km INTEGER,
    year TEXT,
    color TEXT,
    category TEXT,
    displacement TEXT,
    transmission TEXT,
    fuel TEXT,
    motor TEXT,
    is_single_owner BOOLEAN DEFAULT false,
    has_dut BOOLEAN DEFAULT false,
    has_manual BOOLEAN DEFAULT false,
    has_spare_key BOOLEAN DEFAULT false,
    has_revisoes BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_repasse BOOLEAN DEFAULT false,
    plate_last3 TEXT,
    sales_photo_url TEXT,
    sold_at TIMESTAMP WITH TIME ZONE,
    image_position TEXT DEFAULT '50% 50%'
);

-- 2. DESATIVAR RLS (ROW LEVEL SECURITY) NA TABELA
-- Como a API do Catálogo roda do lado do servidor (ou via chave pública anon),
-- desativar a segurança RLS é a forma mais rápida e garantida de permitir a sincronização.
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;

-- 3. CRIAR BUCKET PARA ARMAZENAMENTO DE FOTOS (Opcional - caso use Storage do Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle-media', 'vehicle-media', true)
ON CONFLICT (id) DO NOTHING;

-- 4. LIBERAR ACESSO AO STORAGE DE MÍDIAS (Se RLS do Storage estiver ativo)
CREATE POLICY "Liberar Upload Geral" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'vehicle-media');
CREATE POLICY "Liberar Leitura Geral" ON storage.objects FOR SELECT TO public USING (bucket_id = 'vehicle-media');
CREATE POLICY "Liberar Atualizacao Geral" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'vehicle-media');

-- 5. CONFIRMAÇÃO DE SUCESSO
SELECT 'PRONTO! Supabase configurado com sucesso para a integração.' as status;
