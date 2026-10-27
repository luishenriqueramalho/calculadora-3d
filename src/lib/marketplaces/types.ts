import type { MarketplaceKey } from "@/lib/business-types";

export type EncryptedValue = { encrypted: string; iv: string; tag: string };

export type StoredMarketplaceAuth = {
  marketplace: MarketplaceKey;
  accessToken: EncryptedValue;
  refreshToken?: EncryptedValue;
  expiresAt?: string;
  externalUserId?: string;
  shopId?: string;
  shopCipher?: string;
};

export type MarketplaceOverview = {
  account: string;
  orders: number;
  revenue: number;
  products: number;
};

function isEncryptedValue(value: unknown): value is EncryptedValue {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EncryptedValue>;
  return Boolean(candidate.encrypted && candidate.iv && candidate.tag);
}

export function isStoredMarketplaceAuth(value: unknown, marketplace?: MarketplaceKey): value is StoredMarketplaceAuth {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredMarketplaceAuth>;
  if (marketplace && candidate.marketplace !== marketplace) return false;
  if (!candidate.marketplace || !isEncryptedValue(candidate.accessToken) || !isEncryptedValue(candidate.refreshToken)) return false;
  if (candidate.marketplace === "shopee" && !candidate.shopId) return false;
  return true;
}

export function marketplaceTokenExpiry(value: number | undefined, fallbackSeconds = 86_400) {
  const expiresIn = value ?? fallbackSeconds;
  const milliseconds = expiresIn > 1_000_000_000
    ? expiresIn * 1000
    : Date.now() + expiresIn * 1000;

  return new Date(milliseconds).toISOString();
}
