import "server-only";

import type { MarketplaceOverview } from "./types";

const apiBase = "https://api.mercadolibre.com";

function config() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET;
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Configure as credenciais do Mercado Livre no servidor.");
  return { clientId, clientSecret, redirectUri };
}

export function mercadoLivreAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = config();
  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, state }).toString();
  return url.toString();
}

export async function exchangeMercadoLivreCode(code: string) {
  const { clientId, clientSecret, redirectUri } = config();
  const response = await fetch(`${apiBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  if (!response.ok) throw new Error("O Mercado Livre recusou a troca do código de autorização.");
  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user_id: number }>;
}

export async function refreshMercadoLivreToken(refreshToken: string) {
  const { clientId, clientSecret } = config();
  const response = await fetch(`${apiBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error("Não foi possível renovar o token do Mercado Livre.");
  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user_id: number }>;
}

async function mlGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Mercado Livre retornou ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function syncMercadoLivre(token: string): Promise<MarketplaceOverview> {
  const user = await mlGet<{ id: number; nickname: string }>("/users/me", token);
  const [items, orders] = await Promise.all([
    mlGet<{ paging?: { total?: number }; results?: string[] }>(`/users/${user.id}/items/search?status=active&limit=1`, token),
    mlGet<{ results?: Array<{ paid_amount?: number; total_amount?: number }> }>(`/orders/search?seller=${user.id}&order.status=paid&sort=date_desc&limit=50`, token),
  ]);
  const results = orders.results ?? [];
  return {
    account: user.nickname,
    products: items.paging?.total ?? items.results?.length ?? 0,
    orders: results.length,
    revenue: results.reduce((sum, order) => sum + (order.paid_amount ?? order.total_amount ?? 0), 0),
  };
}
