import type { MarketplaceKey } from "@/lib/business-types";
import { decryptSecret, encryptSecret } from "@/lib/auth";
import { companyFilter, getCompanyContext } from "@/lib/company";
import { isStoredMarketplaceAuth, marketplaceTokenExpiry } from "@/lib/marketplaces/types";
import { refreshMercadoLivreToken, syncMercadoLivre } from "@/lib/marketplaces/mercado-livre";
import { refreshShopeeToken, syncShopee } from "@/lib/marketplaces/shopee";
import { refreshTiktokToken, syncTiktok } from "@/lib/marketplaces/tiktok";

export async function POST(_request: Request, context: RouteContext<"/api/integrations/[marketplace]/sync">) {
  const company = await getCompanyContext();
  if (!company) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { marketplace } = await context.params;
  if (!(["mercadoLivre", "shopee", "tiktok"] as string[]).includes(marketplace)) return Response.json({ error: "Canal inválido" }, { status: 400 });
  const id = marketplace as MarketplaceKey;
  try {
    const stored = await company.db.collection("connections").findOne({ $and: [{ id }, companyFilter(company.companyId)] });
    if (!stored || !isStoredMarketplaceAuth(stored.auth, id)) {
      return Response.json({ error: "Esta loja ainda não passou pela autorização oficial. Conecte novamente." }, { status: 409 });
    }
    const auth = stored.auth;
    let accessToken = decryptSecret(auth.accessToken);
    const shouldRefresh = auth.expiresAt && new Date(auth.expiresAt).getTime() < Date.now() + 5 * 60 * 1000;
    if (shouldRefresh && auth.refreshToken) {
      const refreshToken = decryptSecret(auth.refreshToken);
      if (id === "mercadoLivre") {
        const token = await refreshMercadoLivreToken(refreshToken); accessToken = token.access_token;
        auth.accessToken = encryptSecret(token.access_token); auth.refreshToken = encryptSecret(token.refresh_token); auth.expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
      } else if (id === "shopee" && auth.shopId) {
        const token = await refreshShopeeToken(refreshToken, Number(auth.shopId)); accessToken = token.access_token;
        auth.accessToken = encryptSecret(token.access_token); auth.refreshToken = encryptSecret(token.refresh_token); auth.expiresAt = new Date(Date.now() + token.expire_in * 1000).toISOString();
      } else if (id === "tiktok") {
        const token = await refreshTiktokToken(refreshToken); accessToken = token.access_token;
        auth.accessToken = encryptSecret(token.access_token); auth.refreshToken = encryptSecret(token.refresh_token); auth.expiresAt = marketplaceTokenExpiry(token.access_token_expire_in);
      }
    }
    const overview = id === "mercadoLivre" ? await syncMercadoLivre(accessToken) : id === "shopee" && auth.shopId ? await syncShopee(accessToken, auth.shopId) : await syncTiktok(accessToken);
    const update = { account: overview.account, products: overview.products, orders: overview.orders, revenue: overview.revenue, lastSync: new Date().toISOString(), status: "connected", auth };
    await company.db.collection("connections").updateOne({ $and: [{ id }, companyFilter(company.companyId)] }, { $set: update });
    return Response.json({ ...stored, ...update, id, auth: undefined, _id: undefined, ownerId: undefined });
  } catch (error) {
    console.error(`Falha ao sincronizar ${id}:`, error instanceof Error ? error.message : "erro desconhecido");
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao sincronizar a loja." }, { status: 502 });
  }
}
