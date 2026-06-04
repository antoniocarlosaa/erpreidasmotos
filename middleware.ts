import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/firebase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const path = request.nextUrl.pathname;

  // Rotas públicas que não requerem login
  const isLoginPage = path === "/login" || path === "/";
  // O link de assinatura do cliente deve ser público para que ele assine do celular dele
  const isPublicSignPage = /^\/contracts\/[^/]+\/sign$/.test(path);

  // Definir se a rota de destino deve ser protegida
  const isProtectedRoute = 
    path.startsWith("/dashboard") ||
    path.startsWith("/clients") ||
    path.startsWith("/vehicles") ||
    path.startsWith("/contracts") ||
    path.startsWith("/transfer") ||
    path.startsWith("/finance") ||
    path.startsWith("/admin");

  if (isProtectedRoute && !isPublicSignPage) {
    if (!user) {
      // Redireciona para o login se não autenticado
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (isLoginPage && user) {
    // Redireciona para o painel se já estiver logado
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

// Configurar correspondência de rotas para otimização do Next.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
