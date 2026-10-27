import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

const protectedRoutes = ["/painel", "/projetos", "/filamentos", "/compras", "/equipe", "/catalogo", "/lojas", "/calculadora", "/calculos", "/configuracao"];
const authRoutes = ["/login", "/cadastro"];

export async function proxy(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isProtected && !session) return NextResponse.redirect(new URL("/login", request.url));
  if (authRoutes.includes(pathname) && session) return NextResponse.redirect(new URL("/painel", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/projetos/:path*", "/filamentos/:path*", "/compras/:path*", "/equipe/:path*", "/catalogo/:path*", "/lojas/:path*", "/calculadora/:path*", "/calculos/:path*", "/configuracao/:path*", "/login", "/cadastro"],
};
