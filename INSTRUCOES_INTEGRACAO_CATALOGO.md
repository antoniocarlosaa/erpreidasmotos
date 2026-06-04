# Guia de Configuração Rápida: Integração de Catálogo ERP 🚀

Este guia serve para você criar e integrar um **novo catálogo online** a um **novo ERP** de maneira instantânea (indo direto ao ponto e sem erros de RLS ou permissão).

---

## 📋 Passo a Passo para Novos Projetos

### Passo 1: Configurar o Banco de Dados do Catálogo (Supabase)
1. Crie o novo projeto no **Supabase** para o novo catálogo.
2. Acesse o **SQL Editor** no menu lateral esquerdo.
3. Clique em **New Query** (Nova Consulta).
4. Abra o arquivo [supabase_integration_setup.sql](file:///c:/Users/REI%20DAS%20MOTOS%20SLZ/Desktop/PROJETOS%20DEV/PROJETOS/erps/lojareidamotos/supabase_integration_setup.sql) da raiz deste projeto, copie todo o código e cole no SQL Editor do Supabase.
5. Clique em **Run** (Executar).
   * *Isso criará a tabela `vehicles`, o storage bucket para fotos e liberará os acessos de escrita/leitura sem travas de RLS.*

---

### Passo 2: Configurar o Token e Credenciais na Vercel (Catálogo)
1. Acesse o painel da **Vercel** e abra o projeto do **Catálogo** recém-duplicado.
2. Vá em **Settings** > **Environment Variables**.
3. Adicione as seguintes variáveis de ambiente:
   * `VITE_SUPABASE_URL` -> URL do seu Supabase.
   * `VITE_SUPABASE_ANON_KEY` -> Anon Key pública do seu Supabase.
   * `VITE_API_TOKEN` -> Crie uma senha secreta para segurança da integração (Exemplo: `novaloja2026`). 
     * *Esta mesma senha será inserida dentro do painel do ERP.*

---

### Passo 3: Ativar a Integração no ERP
1. Acesse o painel do seu **ERP** (local ou na Vercel).
2. Faça login com o usuário administrador da loja.
3. Acesse o menu **Veículos** e clique na aba **Publicação** (ou ícone de engrenagem de integração).
4. Preencha os dois campos:
   * **URL do Endpoint do Catálogo:** A URL da API do seu catálogo (Exemplo: `https://catalogo-novaloja.vercel.app/api/vehicles`).
   * **Token de Integração (Bearer):** A senha secreta que você configurou no Passo 2 (Exemplo: `novaloja2026`).
5. Clique em **Salvar Integração**.
   * *Pronto! O ERP salvará essa configuração na nuvem sob o ID da empresa atual e ela estará sincronizada em todos os computadores e celulares conectados.*

---

## 🛠️ Detalhes das Melhorias Inclusas no Código do ERP
Este ERP já possui os seguintes recursos automáticos prontos para uso:
* **Compressão no Cliente (Canvas):** Imagens anexadas no celular ou PC são compactadas para qualidade JPEG e no máximo 1024px, reduzindo-as para cerca de **80KB** para evitar estourar o limite de 1MB do Firestore por documento.
* **Notificação de Mutations:** Diálogos e spinners de carregamento com avisos detalhados de sucesso ou falha ao salvar modificações de veículos.
* **Cálculo Dinâmico de Estoque:** Dias em estoque calculados a partir da data de hoje de forma dinâmica em fuso horário de meia-noite local, sem datas estáticas no código.
