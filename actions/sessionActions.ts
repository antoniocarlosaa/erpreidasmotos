"use server";

import { db } from "@/lib/firebase/admin";
import { getCurrentUser } from "./authActions";
import { headers } from "next/headers";
import { auditService } from "@/services/auditService";

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    return "Celular";
  }
  return "Computador";
}

export async function registerSession(sessionId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.company_id) return { success: false, error: "N├úo autorizado." };

  const now = new Date();
  const nowStr = now.toISOString();

  let ipAddress = "127.0.0.1";
  let userAgent = "unknown";

  try {
    const headerList = await headers();
    userAgent = headerList.get("user-agent") || "unknown";
    ipAddress =
      headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headerList.get("x-real-ip") ||
      "127.0.0.1";
  } catch (e) {
    console.warn("Could not retrieve headers for session registration:", e);
  }

  const deviceType = getDeviceType(userAgent);

  if (sessionId) {
    try {
      const sessDoc = await db.collection("sessions").doc(sessionId).get();
      if (sessDoc.exists) {
        const sessData = sessDoc.data();
        if (sessData) {
          const lastActive = new Date(sessData.last_active_at);
          const diffMin = (now.getTime() - lastActive.getTime()) / (1000 * 60);

          if (diffMin < 30 && sessData.status === "ativo") {
            await db.collection("sessions").doc(sessionId).update({
              last_active_at: nowStr,
            });
            return { success: true, sessionId };
          }
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar sess├úo existente:", err);
    }
  }

  // Criar nova sess├úo
  const newId = crypto.randomUUID();
  try {
    await db.collection("sessions").doc(newId).set({
      company_id: user.company_id,
      user_id: user.id,
      login_at: nowStr,
      last_active_at: nowStr,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      status: "ativo",
    });

    // Gravar log de login na auditoria geral
    await auditService.logAction(db, {
      user_id: user.id,
      company_id: user.company_id,
      action: "LOGIN",
      details: {
        session_id: newId,
        device_type: deviceType,
        ip_address: ipAddress,
      },
    });

    return { success: true, sessionId: newId };
  } catch (error: any) {
    console.error("Erro ao criar nova sess├úo:", error);
    return { success: false, error: error.message };
  }
}

export async function closeSession(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  try {
    const nowStr = new Date().toISOString();
    const sessRef = db.collection("sessions").doc(sessionId);
    const doc = await sessRef.get();
    if (doc.exists) {
      await sessRef.update({
        status: "desconectado",
        last_active_at: nowStr,
      });

      // Gravar log de logout
      await auditService.logAction(db, {
        user_id: user.id,
        company_id: user.company_id,
        action: "LOGOUT",
        details: {
          session_id: sessionId,
        },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao fechar sess├úo:", error);
    return { success: false };
  }
}

export async function getCompanySessions(limit = 100) {
  const user = await getCurrentUser();
  if (!user || !user.company_id || user.role !== "admin") {
    throw new Error("N├úo autorizado.");
  }

  try {
    const snap = await db.collection("sessions")
      .where("company_id", "==", user.company_id)
      .get();

    const sessions = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        let userProfile = undefined;
        if (data.user_id) {
          const uDoc = await db.collection("users").doc(data.user_id).get().catch(() => null);
          if (uDoc && uDoc.exists) {
            userProfile = { id: uDoc.id, ...uDoc.data() } as any;
          }
        }

        return {
          id: doc.id,
          ...data,
          user: userProfile,
        };
      })
    );

    // Ordenar por login desc
    sessions.sort((a: any, b: any) => new Date(b.login_at).getTime() - new Date(a.login_at).getTime());

    return sessions.slice(0, limit);
  } catch (error) {
    console.error("Erro ao obter sess├Áes:", error);
    return [];
  }
}
