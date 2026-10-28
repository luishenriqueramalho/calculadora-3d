"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct, CompanyUser, CustomerOrder, Filament, MarketplaceConnection, MarketplaceKey, OrderItem, OrderRecordState, OrderStatus, Purchase, SavedProject } from "@/lib/business-types";
import { emptyConnections, orderStatuses } from "@/lib/business-types";

type BusinessState = {
  projects: SavedProject[];
  products: CatalogProduct[];
  connections: MarketplaceConnection[];
  orders: CustomerOrder[];
  filaments: Filament[];
  purchases: Purchase[];
  users: CompanyUser[];
};

type NewOrder = Omit<CustomerOrder, "id" | "items" | "profit" | "position" | "createdAt" | "updatedAt"> & {
  items: Array<Omit<OrderItem, "id">>;
};
type ProductInput = Omit<CatalogProduct, "id" | "createdAt" | "updatedAt" | "channels">;

type BusinessContextValue = BusinessState & {
  ready: boolean;
  storageMode: "mongodb" | "offline";
  saveProject: (project: Omit<SavedProject, "id" | "createdAt" | "updatedAt">) => Promise<SavedProject>;
  addOrder: (order: NewOrder) => Promise<CustomerOrder>;
  updateOrder: (id: string, order: Partial<Omit<CustomerOrder, "id" | "position" | "createdAt" | "updatedAt">>) => Promise<CustomerOrder>;
  toggleOrderItem: (orderId: string, itemId: string, completed: boolean) => Promise<CustomerOrder>;
  setOrderRecordState: (orderId: string, state: Exclude<OrderRecordState, "active">) => Promise<CustomerOrder>;
  reorderOrders: (orders: CustomerOrder[]) => Promise<void>;
  addFilament: (filament: Pick<Filament, "color" | "brand" | "price">) => Promise<Filament>;
  deleteFilament: (id: string) => Promise<void>;
  addPurchase: (purchase: Omit<Purchase, "id" | "total" | "createdAt" | "updatedAt">) => Promise<Purchase>;
  deletePurchase: (id: string) => Promise<void>;
  addUser: (user: Pick<CompanyUser, "name" | "email">) => Promise<CompanyUser>;
  addProduct: (product: ProductInput) => Promise<CatalogProduct>;
  updateProduct: (id: string, product: ProductInput) => Promise<CatalogProduct>;
  deleteProduct: (id: string) => Promise<void>;
  publishProduct: (id: string, channels: MarketplaceKey[]) => Promise<void>;
  connectStore: (id: MarketplaceKey) => Promise<void>;
  syncStore: (id: MarketplaceKey) => Promise<void>;
};

const initialState: BusinessState = { projects: [], products: [], connections: emptyConnections, orders: [], filaments: [], purchases: [], users: [] };
const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BusinessState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageMode, setStorageMode] = useState<"mongodb" | "offline">("offline");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/business", { cache: "no-store" });
        if (!response.ok) throw new Error("Banco indisponível");
        const data = await response.json() as BusinessState;
        if (active) {
          setState(data);
          setStorageMode("mongodb");
        }
      } catch {
        if (active) setStorageMode("offline");
      } finally {
        if (active) setReady(true);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const request = useCallback(async (path: string, body: unknown, method = "POST") => {
    if (storageMode !== "mongodb") throw new Error("O banco de dados está indisponível.");
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar no MongoDB.");
    return result;
  }, [storageMode]);

  const saveProject = useCallback(async (input: Omit<SavedProject, "id" | "createdAt" | "updatedAt">) => {
    const project = await request("/api/projects", input) as SavedProject;
    setState((current) => ({ ...current, projects: [project, ...current.projects] }));
    return project;
  }, [request]);

  const addOrder = useCallback(async (input: NewOrder) => {
    const order = await request("/api/orders", input) as CustomerOrder;
    setState((current) => ({ ...current, orders: [...current.orders, order] }));
    return order;
  }, [request]);

  const updateOrder = useCallback(async (id: string, input: Partial<Omit<CustomerOrder, "id" | "position" | "createdAt" | "updatedAt">>) => {
    const order = await request(`/api/orders/${id}`, input, "PATCH") as CustomerOrder;
    setState((current) => ({ ...current, orders: current.orders.map((item) => item.id === id ? order : item) }));
    return order;
  }, [request]);

  const toggleOrderItem = useCallback(async (orderId: string, itemId: string, completed: boolean) => {
    const order = await request(`/api/orders/${orderId}/items/${itemId}`, { completed }, "PATCH") as CustomerOrder;
    setState((current) => ({ ...current, orders: current.orders.map((item) => item.id === orderId ? order : item) }));
    return order;
  }, [request]);

  const setOrderRecordState = useCallback(async (orderId: string, recordState: Exclude<OrderRecordState, "active">) => {
    const order = await request(`/api/orders/${orderId}/state`, { state: recordState }, "PATCH") as CustomerOrder;
    setState((current) => ({ ...current, orders: current.orders.map((item) => item.id === orderId ? order : item) }));
    return order;
  }, [request]);

  const reorderOrders = useCallback(async (orders: CustomerOrder[]) => {
    const previous = state.orders;
    const now = new Date().toISOString();
    const enrichedOrders = orders.map((order) => {
      const previousOrder = previous.find((item) => item.id === order.id);
      if (!previousOrder || previousOrder.status === order.status) return order;
      if (order.status === "completed") return { ...order, completedAt: now };
      if (order.status === "delivered") return { ...order, deliveredAt: now };
      return order;
    });
    const reorderedIds = new Set(enrichedOrders.map((order) => order.id));
    const mergedOrders = [...enrichedOrders, ...previous.filter((order) => !reorderedIds.has(order.id))];
    setState((current) => ({ ...current, orders: mergedOrders }));
    const columns = Object.fromEntries(orderStatuses.map((status) => [status, enrichedOrders.filter((order) => order.status === status).map((order) => order.id)])) as Record<OrderStatus, string[]>;
    try {
      await request("/api/orders/reorder", { columns }, "PUT");
    } catch (error) {
      setState((current) => ({ ...current, orders: previous }));
      throw error;
    }
  }, [request, state.orders]);

  const addFilament = useCallback(async (input: Pick<Filament, "color" | "brand" | "price">) => {
    const result = await request("/api/filaments", input) as { filament: Filament; purchase: Purchase };
    setState((current) => ({
      ...current,
      filaments: [result.filament, ...current.filaments],
      purchases: [result.purchase, ...current.purchases],
    }));
    return result.filament;
  }, [request]);

  const deleteFilament = useCallback(async (id: string) => {
    await request(`/api/filaments/${id}`, {}, "DELETE");
    setState((current) => ({
      ...current,
      filaments: current.filaments.filter((filament) => filament.id !== id),
      purchases: current.purchases.filter((purchase) => purchase.filamentId !== id),
    }));
  }, [request]);

  const addPurchase = useCallback(async (input: Omit<Purchase, "id" | "total" | "createdAt" | "updatedAt">) => {
    const purchase = await request("/api/purchases", input) as Purchase;
    setState((current) => ({ ...current, purchases: [purchase, ...current.purchases] }));
    return purchase;
  }, [request]);

  const deletePurchase = useCallback(async (id: string) => {
    await request(`/api/purchases/${id}`, {}, "DELETE");
    setState((current) => ({ ...current, purchases: current.purchases.filter((purchase) => purchase.id !== id) }));
  }, [request]);

  const addUser = useCallback(async (input: Pick<CompanyUser, "name" | "email">) => {
    const user = await request("/api/users", input) as CompanyUser;
    setState((current) => ({ ...current, users: [...current.users, user] }));
    return user;
  }, [request]);

  const addProduct = useCallback(async (input: ProductInput) => {
    const product = await request("/api/products", input) as CatalogProduct;
    setState((current) => ({ ...current, products: [product, ...current.products] }));
    return product;
  }, [request]);

  const updateProduct = useCallback(async (id: string, input: ProductInput) => {
    const product = await request(`/api/products/${id}`, input, "PATCH") as CatalogProduct;
    setState((current) => ({ ...current, products: current.products.map((item) => item.id === id ? product : item) }));
    return product;
  }, [request]);

  const deleteProduct = useCallback(async (id: string) => {
    await request(`/api/products/${id}`, {}, "DELETE");
    setState((current) => ({ ...current, products: current.products.filter((product) => product.id !== id) }));
  }, [request]);

  const publishProduct = useCallback(async (id: string, channels: MarketplaceKey[]) => {
    const published = await request(`/api/products/${id}/publish`, { channels }) as CatalogProduct;
    setState((current) => ({
      ...current,
      products: current.products.map((product) => product.id === id ? published : product),
    }));
  }, [request]);

  const connectStore = useCallback(async (id: MarketplaceKey) => {
    const response = await fetch(`/api/integrations/${id}/connect`, { cache: "no-store" });
    const result = await response.json() as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error ?? "Não foi possível iniciar a conexão.");
    window.location.assign(result.url);
  }, []);

  const syncStore = useCallback(async (id: MarketplaceKey) => {
    const response = await fetch(`/api/integrations/${id}/sync`, { method: "POST" });
    const result = await response.json() as MarketplaceConnection & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Não foi possível sincronizar a loja.");
    setState((current) => ({
      ...current,
      connections: current.connections.map((store) => store.id === id ? result : store),
    }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    ready,
    storageMode,
    saveProject,
    addOrder,
    updateOrder,
    toggleOrderItem,
    setOrderRecordState,
    reorderOrders,
    addFilament,
    deleteFilament,
    addPurchase,
    deletePurchase,
    addUser,
    addProduct,
    updateProduct,
    deleteProduct,
    publishProduct,
    connectStore,
    syncStore,
  }), [addFilament, addOrder, addProduct, addPurchase, addUser, connectStore, deleteFilament, deleteProduct, deletePurchase, publishProduct, ready, reorderOrders, saveProject, setOrderRecordState, state, storageMode, syncStore, toggleOrderItem, updateOrder, updateProduct]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness precisa estar dentro de BusinessProvider.");
  return context;
}
