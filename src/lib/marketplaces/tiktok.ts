import "server-only";

import { createHmac } from "node:crypto";
import type { MarketplaceOverview } from "./types";

const apiBase = process.env.TIKTOK_SHOP_API_BASE ?? "https://open-api.tiktokglobalshop.com";

function config() {
  const appKey = process.env.TIKTOK_SHOP_APP_KEY;
  const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;
  const authorizationUrl = process.env.TIKTOK_SHOP_AUTH_URL;
  if (!appKey || !appSecret || !authorizationUrl) throw new Error("Configure as credenciais e a URL de autorização do TikTok Shop.");
  return { appKey, appSecret, authorizationUrl };
}

export function tiktokAuthorizationUrl(state: string) {
  const { authorizationUrl } = config();
  const url = new URL(authorizationUrl);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeTiktokCode(code: string) {
  const { appKey, appSecret } = config();
  const url = new URL("https://auth.tiktok-shops.com/api/v2/token/get");
  url.search = new URLSearchParams({ app_key: appKey, app_secret: appSecret, auth_code: code, grant_type: "authorized_code" }).toString();
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as { code?: number; message?: string; data?: { access_token: string; refresh_token: string; access_token_expire_in?: number; open_id?: string } };
  if (!response.ok || payload.code !== 0 || !payload.data?.access_token) throw new Error(payload.message ?? "O TikTok Shop recusou a autorização.");
  return payload.data;
}

export async function refreshTiktokToken(refreshToken: string) {
  const { appKey, appSecret } = config();
  const url = new URL("https://auth.tiktok-shops.com/api/v2/token/refresh");
  url.search = new URLSearchParams({ app_key: appKey, app_secret: appSecret, refresh_token: refreshToken, grant_type: "refresh_token" }).toString();
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as { code?: number; message?: string; data?: { access_token: string; refresh_token: string; access_token_expire_in?: number; open_id?: string } };
  if (!response.ok || payload.code !== 0 || !payload.data?.access_token) throw new Error(payload.message ?? "Não foi possível renovar o token do TikTok Shop.");
  return payload.data;
}

function signedUrl(path: string, query: Record<string, string> = {}, body = "") {
  const { appKey, appSecret } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = new URLSearchParams({ app_key: appKey, timestamp: String(timestamp), ...query });
  const base = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}${value}`).join("");
  const sign = createHmac("sha256", appSecret).update(`${appSecret}${path}${base}${body}${appSecret}`).digest("hex");
  params.set("sign", sign);
  return `${apiBase}${path}?${params}`;
}

type TikTokResponse<T> = { code?: number; message?: string; data?: T };

async function tiktokRequest<T>(
  path: string,
  token: string,
  options: { method?: "GET" | "POST"; query?: Record<string, string>; body?: Record<string, unknown> } = {},
) {
  const body = options.body ? JSON.stringify(options.body) : "";
  const response = await fetch(signedUrl(path, options.query, body), {
    method: options.method ?? "GET",
    headers: { "x-tts-access-token": token, "Content-Type": "application/json" },
    body: body || undefined,
    cache: "no-store",
  });
  const payload = await response.json() as TikTokResponse<T>;
  if (!response.ok || payload.code !== 0) throw new Error(payload.message ?? `TikTok Shop retornou ${response.status}.`);
  return payload.data;
}

export async function syncTiktok(token: string): Promise<MarketplaceOverview & { shopCipher?: string }> {
  const shopsPath = process.env.TIKTOK_SHOPS_PATH ?? "/authorization/202309/shops";
  const shops = await tiktokRequest<{ shops?: Array<{ id?: string; cipher?: string; name?: string }> }>(shopsPath, token);
  const shop = shops?.shops?.[0];
  if (!shop?.cipher) {
    throw new Error("Nenhuma loja do TikTok Shop foi autorizada para este aplicativo.");
  }

  const productsPath = process.env.TIKTOK_PRODUCTS_PATH ?? "/product/202309/products/search";
  const ordersPath = process.env.TIKTOK_ORDERS_PATH ?? "/order/202309/orders/search";
  const commonQuery = { shop_cipher: shop.cipher, page_size: "100" };
  const [products, orders] = await Promise.all([
    tiktokRequest<{ total_count?: number; products?: unknown[] }>(productsPath, token, {
      method: "POST",
      query: commonQuery,
      body: {},
    }),
    tiktokRequest<{
      total_count?: number;
      orders?: Array<{
        payment?: {
          total_amount?: string | number;
          original_total_product_price?: string | number;
          sub_total?: string | number;
        };
      }>;
    }>(ordersPath, token, {
      method: "POST",
      query: { ...commonQuery, sort_field: "create_time", sort_order: "DESC" },
      body: {},
    }),
  ]);
  const orderList = orders?.orders ?? [];
  const revenue = orderList.reduce((total, order) => {
    const payment = order.payment;
    return total + Number(payment?.total_amount ?? payment?.original_total_product_price ?? payment?.sub_total ?? 0);
  }, 0);

  return {
    account: shop.name ?? "TikTok Shop",
    shopCipher: shop.cipher,
    products: products?.total_count ?? products?.products?.length ?? 0,
    orders: orderList.length,
    revenue,
  };
}
