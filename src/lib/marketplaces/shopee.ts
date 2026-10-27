import "server-only";

import { createHmac } from "node:crypto";
import type { MarketplaceOverview } from "./types";

const apiBase = process.env.SHOPEE_API_BASE ?? "https://partner.shopeemobile.com";

function config() {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  const redirectUri = process.env.SHOPEE_REDIRECT_URI;
  if (!partnerId || !partnerKey || !redirectUri) throw new Error("Configure as credenciais da Shopee no servidor.");
  return { partnerId: Number(partnerId), partnerKey, redirectUri };
}

function sign(path: string, timestamp: number, suffix = "") {
  const { partnerId, partnerKey } = config();
  return createHmac("sha256", partnerKey).update(`${partnerId}${path}${timestamp}${suffix}`).digest("hex");
}

export function shopeeAuthorizationUrl() {
  const { partnerId, redirectUri } = config();
  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const url = new URL(`${apiBase}${path}`);
  url.search = new URLSearchParams({ partner_id: String(partnerId), timestamp: String(timestamp), sign: sign(path, timestamp), redirect: redirectUri }).toString();
  return url.toString();
}

export async function exchangeShopeeCode(code: string, shopId: number) {
  const { partnerId } = config();
  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await fetch(`${apiBase}${path}?${new URLSearchParams({ partner_id: String(partnerId), timestamp: String(timestamp), sign: sign(path, timestamp) })}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, shop_id: shopId, partner_id: partnerId }),
  });
  const data = await response.json() as { access_token?: string; refresh_token?: string; expire_in?: number; error?: string; message?: string };
  if (!response.ok || !data.access_token) throw new Error(data.message ?? data.error ?? "A Shopee recusou a autorização.");
  return data as { access_token: string; refresh_token: string; expire_in: number };
}

export async function refreshShopeeToken(refreshToken: string, shopId: number) {
  const { partnerId } = config();
  const path = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await fetch(`${apiBase}${path}?${new URLSearchParams({ partner_id: String(partnerId), timestamp: String(timestamp), sign: sign(path, timestamp) })}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken, shop_id: shopId, partner_id: partnerId }),
  });
  const data = await response.json() as { access_token?: string; refresh_token?: string; expire_in?: number; error?: string; message?: string };
  if (!response.ok || !data.access_token) throw new Error(data.message ?? data.error ?? "Não foi possível renovar o token da Shopee.");
  return data as { access_token: string; refresh_token: string; expire_in: number };
}

async function shopeeGet<T>(path: string, token: string, shopId: string, params: Record<string, string> = {}): Promise<T> {
  const { partnerId } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const common = { partner_id: String(partnerId), timestamp: String(timestamp), access_token: token, shop_id: shopId };
  const url = new URL(`${apiBase}${path}`);
  url.search = new URLSearchParams({ ...common, sign: sign(path, timestamp, `${token}${shopId}`), ...params }).toString();
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json() as { error?: string; message?: string };
  if (!response.ok || data.error) throw new Error(data.message ?? data.error ?? `Shopee retornou ${response.status}.`);
  return data as T;
}

export async function syncShopee(token: string, shopId: string): Promise<MarketplaceOverview> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 15 * 24 * 60 * 60;
  const [shop, products, orders] = await Promise.all([
    shopeeGet<{ response?: { shop_name?: string } }>("/api/v2/shop/get_shop_info", token, shopId),
    shopeeGet<{ response?: { total_count?: number; item?: unknown[] } }>("/api/v2/product/get_item_list", token, shopId, { offset: "0", page_size: "1", item_status: "NORMAL" }),
    shopeeGet<{ response?: { order_list?: Array<{ order_sn: string; order_status?: string }> } }>("/api/v2/order/get_order_list", token, shopId, { time_range_field: "create_time", time_from: String(from), time_to: String(now), page_size: "100" }),
  ]);
  const orderList = orders.response?.order_list ?? [];
  const orderBatches = Array.from({ length: Math.ceil(orderList.length / 50) }, (_, index) => (
    orderList.slice(index * 50, (index + 1) * 50)
  ));
  const orderDetails = orderBatches.length
    ? await Promise.all(orderBatches.map((batch) => shopeeGet<{ response?: { order_list?: Array<{ total_amount?: number | string }> } }>(
        "/api/v2/order/get_order_detail",
        token,
        shopId,
        {
          order_sn_list: batch.map((order) => order.order_sn).join(","),
          response_optional_fields: "total_amount",
        },
      )))
    : [];
  const detailedOrders = orderDetails.flatMap((details) => details.response?.order_list ?? []);
  const revenue = detailedOrders.reduce(
    (total, order) => total + Number(order.total_amount ?? 0),
    0,
  );

  return {
    account: shop.response?.shop_name ?? `Loja ${shopId}`,
    products: products.response?.total_count ?? products.response?.item?.length ?? 0,
    orders: orderList.length,
    revenue,
  };
}
