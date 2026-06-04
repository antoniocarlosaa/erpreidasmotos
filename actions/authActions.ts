"use server";

import { db, auth } from "@/lib/firebase/admin";
import { UserProfile, UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

function translateFirebaseError(errorMsg: string) {
  if (errorMsg.includes("EMAIL_NOT_FOUND") || errorMsg.includes("INVALID_PASSWORD") || errorMsg.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "E-mail ou senha incorretos.";
  }
  if (errorMsg.includes("USER_DISABLED")) {
    return "Esta conta de usuário foi desativada.";
  }
  if (errorMsg.includes("EMAIL_EXISTS")) {
    return "Este endereço de e-mail já está sendo utilizado.";
  }
  if (errorMsg.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    return "Acesso bloqueado temporariamente devido a muitas tentativas falhas. Tente mais tarde.";
  }
  return `Erro na autenticação: ${errorMsg}`;
}

export async function login(formData: any) {
  const email = formData.email;
  const password = formData.password;

  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios." };
  }

  try {
    // 1. Autenticar usuário via REST API do Firebase Auth para obter o ID Token no servidor
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY não configurada no servidor.");
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const authData = await response.json();

    if (authData.error) {
      return { error: translateFirebaseError(authData.error.message) };
    }

    const idToken = authData.idToken;
    const uid = authData.localId;

    // 2. Criar cookie de sessão seguro usando o Firebase Admin SDK
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    // 3. Obter perfil do usuário do Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    let profile = null;
    if (userDoc.exists) {
      profile = { id: userDoc.id, ...userDoc.data() } as UserProfile;
    }

    revalidatePath("/", "layout");

    return { success: true, user: { id: uid, email }, profile };
  } catch (err: any) {
    console.error("Erro no login:", err);
    return { error: err.message || "Erro inesperado ao entrar." };
  }
}

export async function logout() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("__session");

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Erro no logout:", err);
    return { error: err.message || "Erro ao deslogar." };
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) return null;

    // Verificar e validar o cookie de sessão no Firebase Admin
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    // Buscar perfil do usuário no Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return null;

    const profileData = userDoc.data() as Omit<UserProfile, "id">;
    const profile = { id: userDoc.id, ...profileData } as UserProfile;

    // Carregar informações da empresa vinculada
    let company = null;
    if (profile.company_id) {
      const companyDoc = await db.collection("companies").doc(profile.company_id).get();
      if (companyDoc.exists) {
        company = { id: companyDoc.id, ...companyDoc.data() };
      }
    }

    return { ...profile, company } as any;
  } catch (error) {
    // Cookie inválido ou expirado
    console.error("Erro ao obter usuário atual:", error);
    return null;
  }
}

export async function register(formData: any) {
  const email = formData.email;
  const password = formData.password;
  const name = formData.name;
  const role = formData.role || "vendedor";

  if (!email || !password || !name) {
    return { error: "Nome, e-mail e senha são obrigatórios." };
  }

  try {
    // 1. Criar o usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Definir ou criar a empresa (Tenancy)
    let companyId = formData.company_id;
    if (!companyId) {
      // Buscar a primeira empresa cadastrada no Firestore
      const companiesSnap = await db.collection("companies").limit(1).get();
      if (!companiesSnap.empty) {
        companyId = companiesSnap.docs[0].id;
      } else {
        // Se não houver nenhuma empresa, criar uma padrão
        const companyRef = await db.collection("companies").add({
          name: "Minha Empresa ERP",
          document: "00.000.000/0001-00",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        companyId = companyRef.id;
      }
    }

    // 3. Gravar o perfil do usuário na coleção 'users' no Firestore
    const nowStr = new Date().toISOString();
    await db.collection("users").doc(userRecord.uid).set({
      company_id: companyId,
      name,
      email,
      role: role as UserRole,
      created_at: nowStr,
      updated_at: nowStr,
    });

    return { success: true, user: { id: userRecord.uid, email } };
  } catch (err: any) {
    console.error("Erro no cadastro:", err);
    return { error: err.message || "Erro inesperado ao registrar." };
  }
}
