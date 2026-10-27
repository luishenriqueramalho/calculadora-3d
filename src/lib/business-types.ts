export type MarketplaceKey = "mercadoLivre" | "shopee" | "tiktok";

export type MarketplaceStatus = "connected" | "attention" | "disconnected";

export type MarketplaceConnection = {
  id: MarketplaceKey;
  name: string;
  shortName: string;
  status: MarketplaceStatus;
  account?: string;
  orders: number;
  revenue: number;
  products: number;
  lastSync?: string;
};

export type SavedProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "priced" | "published";
  values: {
    hours: string;
    minutes: string;
    printerPower: string;
    energyPrice: string;
    machineCost: string;
    otherCosts: string;
    margin: string;
  };
  filaments: Array<{
    id: string;
    color: string;
    material: string;
    usedWeight: string;
    filamentPrice: string;
    rollWeight: string;
  }>;
  result: {
    material: number;
    energy: number;
    machine: number;
    others: number;
    total: number;
    profit: number;
    price: number;
  };
};

export const orderStatuses = ["quote", "queued", "production", "completed", "delivered"] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  quote: "Em orçamento",
  queued: "Na fila de impressão",
  production: "Em produção",
  completed: "Concluído",
  delivered: "Entregue",
};

export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  cost: number;
};

export type CustomerOrder = {
  id: string;
  customerName: string;
  phone?: string;
  closedAt: string;
  deliveryAt: string;
  status: OrderStatus;
  description: string;
  items?: OrderItem[];
  salePrice: number;
  cost: number;
  profit: number;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type Filament = {
  id: string;
  color: string;
  brand: string;
  price: number;
  createdAt: string;
  updatedAt: string;
};

export const purchaseCategories = ["Insumos", "Ferramentas", "Manutenção", "Embalagens", "Escritório", "Equipamentos", "Outros"] as const;

export type PurchaseCategory = (typeof purchaseCategories)[number];

export type Purchase = {
  id: string;
  item: string;
  category: PurchaseCategory;
  quantity: number;
  unitPrice: number;
  total: number;
  purchasedAt: string;
  supplier?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  hasPassword: boolean;
  createdAt: string;
};

export type ProductChannelState = "notPublished" | "published" | "error";

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  createdAt: string;
  channels: Record<MarketplaceKey, ProductChannelState>;
};

export const marketplaceMeta: Record<MarketplaceKey, Pick<MarketplaceConnection, "name" | "shortName">> = {
  mercadoLivre: { name: "Mercado Livre", shortName: "ML" },
  shopee: { name: "Shopee", shortName: "S" },
  tiktok: { name: "TikTok Shop", shortName: "TT" },
};

export const emptyConnections: MarketplaceConnection[] = (
  Object.keys(marketplaceMeta) as MarketplaceKey[]
).map((id) => ({
  id,
  ...marketplaceMeta[id],
  status: "disconnected",
  orders: 0,
  revenue: 0,
  products: 0,
}));
