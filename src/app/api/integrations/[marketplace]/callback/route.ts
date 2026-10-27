import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { MarketplaceConnection, MarketplaceKey } from "@/lib/business-types";
import { marketplaceMeta } from "@/lib/business-types";
import { encryptSecret } from "@/lib/auth";
import { companyFilter, getCompanyContext } from "@/lib/company";
import { exchangeMercadoLivreCode, syncMercadoLivre } from "@/lib/marketplaces/mercado-livre";
import { exchangeShopeeCode, syncShopee } from "@/lib/marketplaces/shopee";
import { exchangeTiktokCode, syncTiktok } from "@/lib/marketplaces/tiktok";
import { marketplaceTokenExpiry } from "@/lib/marketplaces/types";

function finish(request: Request, marketplace: string, status: "success" | "error", message?: string) {
  const url = new URL("/lojas", request.url);
  url.searchParams.set("integration", status);
  url.searchParams.set("marketplace", marketplace);
  if (message) url.searchParams.set("message", message.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(request: Request, context: RouteContext<"/api/integrations/[marketplace]/callback">) {
  const company = await getCompanyContext();
  const { marketplace } = await context.params;
  if (!company || !(marketplace in marketplaceMeta)) return finish(request, marketplace, "error", "Sessão ou canal inválido.");
  const id = marketplace as MarketplaceKey;
  const params = new URL(request.url).searchParams;
  const cookieStore = await cookies();
  const savedState = cookieStore.get(`oauth_state_${id}`)?.value;
  const returnedState = params.get("state");
  if (!savedState || (id !== "shopee" && savedState !== returnedState)) return finish(request, id, "error", "A autorização expirou. Tente conectar novamente.");

  try {
    const code = params.get("code");
    if (!code) throw new Error(params.get("error_description") ?? "Código de autorização não recebido.");
    let connection: MarketplaceConnection;
    let auth: Record<string, unknown>;
    if (id === "mercadoLivre") {
      const token = await exchangeMercadoLivreCode(code);
      const overview = await syncMercadoLivre(token.access_token);
      connection = { id, ...marketplaceMeta[id], status: "connected", ...overview, lastSync: new Date().toISOString() };
      auth = { marketplace: id, accessToken: encryptSecret(token.access_token), refreshToken: encryptSecret(token.refresh_token), expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(), externalUserId: String(token.user_id) };
    } else if (id === "shopee") {
      const shopId = Number(params.get("shop_id"));
      if (!shopId) throw new Error("A Shopee não retornou o identificador da loja.");
      const token = await exchangeShopeeCode(code, shopId);
      const overview = await syncShopee(token.access_token, String(shopId));
      connection = { id, ...marketplaceMeta[id], status: "connected", ...overview, lastSync: new Date().toISOString() };
      auth = { marketplace: id, accessToken: encryptSecret(token.access_token), refreshToken: encryptSecret(token.refresh_token), expiresAt: new Date(Date.now() + token.expire_in * 1000).toISOString(), shopId: String(shopId) };
    } else {
      const token = await exchangeTiktokCode(code);
      const overview = await syncTiktok(token.access_token);
      connection = { id, ...marketplaceMeta[id], status: "connected", account: overview.account, products: overview.products, orders: overview.orders, revenue: overview.revenue, lastSync: new Date().toISOString() };
      auth = { marketplace: id, accessToken: encryptSecret(token.access_token), refreshToken: encryptSecret(token.refresh_token), expiresAt: marketplaceTokenExpiry(token.access_token_expire_in), externalUserId: token.open_id, shopCipher: overview.shopCipher };
    }
    await company.db.collection("connections").updateOne(
      { $and: [{ id }, companyFilter(company.companyId)] },
      { $set: { ...connection, auth, companyId: company.companyId, ownerId: company.companyId } },
      { upsert: true },
    );
    cookieStore.delete(`oauth_state_${id}`);
    return finish(request, id, "success");
  } catch (error) {
    console.error(`Falha no callback ${id}:`, error instanceof Error ? error.message : "erro desconhecido");
    return finish(request, id, "error", error instanceof Error ? error.message : "Falha ao concluir a conexão.");
  }
}
