import { auditRepository } from "@/repositories/auditRepository";
import { headers } from "next/headers";

export const auditService = {
  /**
   * Registra uma ação no log de auditoria capturando IP e User-Agent do cabeçalho
   */
  async logAction(
    supabase: any,
    params: {
      user_id: string | null;
      company_id: string | null;
      action: string;
      details?: Record<string, any>;
    }
  ): Promise<boolean> {
    let ipAddress = "unknown";
    let userAgent = "unknown";

    try {
      // Capturar cabeçalhos de requisição em tempo de execução no Next.js Server
      const headerList = await headers();
      userAgent = headerList.get("user-agent") || "unknown";
      
      // Tentar obter o IP real por trás do proxy (Vercel/Cloudflare)
      ipAddress =
        headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
        headerList.get("x-real-ip") ||
        "127.0.0.1";
    } catch (e) {
      // Pode falhar se chamado no lado do cliente ou sem contexto HTTP
      console.warn("Could not retrieve HTTP request headers for audit log:", e);
    }

    const log = await auditRepository.createLog(supabase, {
      company_id: params.company_id,
      user_id: params.user_id,
      action: params.action,
      ip_address: ipAddress,
      user_agent: userAgent,
      details: params.details,
    });

    return log !== null;
  },

  async listLogs(supabase: any, companyId: string, limit = 100) {
    return auditRepository.listLogs(supabase, companyId, limit);
  },
};
