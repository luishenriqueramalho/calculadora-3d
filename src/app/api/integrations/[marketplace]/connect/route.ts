import { cookies } from "next/headers";
import type { MarketplaceKey } from "@/lib/business-types";
import { marketplaceMeta } from "@/lib/business-types";
import { getSession } from "@/lib/auth";
import { mercadoLivreAuthorizationUrl } from "@/lib/marketplaces/mercado-livre";
import { shopeeAuthorizationUrl } from "@/lib/marketplaces/shopee";
import { tiktokAuthorizationUrl } from "@/lib/marketplaces/tiktok";

export async function GET(_request: Request, context: RouteContext<"/api/integrations/[marketplace]/connect">) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { marketplace } = await context.params;
  if (!(marketplace in marketplaceMeta)) return Response.json({ error: "Canal inválido" }, { status: 400 });
  const id = marketplace as MarketplaceKey;
  const state = crypto.randomUUID();
  try {
    const url = id === "mercadoLivre" ? mercadoLivreAuthorizationUrl(state) : id === "shopee" ? shopeeAuthorizationUrl() : tiktokAuthorizationUrl(state);
    (await cookies()).set(`oauth_state_${id}`, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 10 * 60, path: "/" });
    return Response.json({ url });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Integração não configurada." }, { status: 503 });
  }
}
