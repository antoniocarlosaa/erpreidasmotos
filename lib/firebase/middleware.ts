import { NextResponse, type NextRequest } from "next/server";

// Função leve e compatível com Edge para decodificar JWT
function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    // Decodifica a parte do payload do JWT (segunda parte)
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload;
  } catch (error) {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const sessionCookie = request.cookies.get("__session")?.value;
  
  if (!sessionCookie) {
    return { response: NextResponse.next(), user: null };
  }

  const payload = decodeJwt(sessionCookie);
  if (!payload) {
    return { response: NextResponse.next(), user: null };
  }

  // Verifica expiração (exp está em segundos)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < currentTimestamp) {
    // Cookie expirado
    const response = NextResponse.next();
    response.cookies.delete("__session");
    return { response, user: null };
  }

  // Usuário autenticado
  const user = {
    id: payload.sub || payload.uid || "",
    email: payload.email || "",
  };

  return { response: NextResponse.next(), user };
}
