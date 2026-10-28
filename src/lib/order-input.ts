import type { Db } from "mongodb";
import { companyFilter } from "@/lib/company";
import { orderStatuses, type OrderItem, type OrderStatus } from "@/lib/business-types";

export type OrderInput = {
  customerName?: string;
  phone?: string;
  closedAt?: string;
  deliveryAt?: string;
  status?: OrderStatus;
  description?: string;
  items?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    salePrice?: number;
    cost?: number;
    pricingMode?: "manualTotal" | "catalogUnit";
    catalogProductId?: string;
  }>;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export async function parseOrderInput(
  input: OrderInput,
  db: Db,
  companyId: string,
  currentItems: OrderItem[] = [],
) {
  const customerName = input.customerName?.trim() ?? "";
  const phone = input.phone?.replace(/\D/g, "") ?? "";
  const closedAt = input.closedAt ?? "";
  const deliveryAt = input.deliveryAt ?? "";
  const status = input.status ?? "quote";
  const description = input.description?.trim() ?? "";
  const rawItems = input.items ?? [];
  const catalogIds = [...new Set(rawItems.flatMap((item) => item.pricingMode === "catalogUnit" && item.catalogProductId ? [item.catalogProductId] : []))];
  const catalogProducts = catalogIds.length
    ? await db.collection("products").find({ $and: [{ id: { $in: catalogIds } }, companyFilter(companyId)] }).toArray()
    : [];

  const items = rawItems.map((item, index) => {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Informe uma quantidade válida para o produto ${index + 1}.`);
    const previous = currentItems.find((current) => current.id === item.id);
    const id = previous?.id ?? crypto.randomUUID();
    const completion = { completed: previous?.completed ?? false, completedAt: previous?.completedAt ?? null };

    if (item.pricingMode === "catalogUnit") {
      const product = catalogProducts.find((candidate) => candidate.id === item.catalogProductId);
      if (!product) throw new Error(`Selecione um produto válido do catálogo na linha ${index + 1}.`);
      const unitSalePrice = Number(product.price);
      const unitCost = Number(product.costPrice ?? product.price);
      const salePrice = typeof item.salePrice === "number" ? item.salePrice : Number.NaN;
      if (!Number.isFinite(unitSalePrice) || unitSalePrice < 0 || !Number.isFinite(unitCost) || unitCost < 0) throw new Error(`O produto ${product.name} possui valores inválidos no catálogo.`);
      if (!Number.isFinite(salePrice) || salePrice < 0) throw new Error(`Informe o valor cobrado por ${product.name}.`);
      return {
        id,
        name: String(product.name),
        quantity,
        salePrice: roundMoney(salePrice),
        cost: roundMoney(unitCost * quantity),
        pricingMode: "catalogUnit" as const,
        catalogProductId: String(product.id),
        unitSalePrice,
        unitCost,
        ...completion,
      };
    }

    const name = item.name?.trim() ?? "";
    const salePrice = Number(item.salePrice);
    const cost = Number(item.cost);
    if (name.length < 2) throw new Error(`Informe o nome do produto ${index + 1}.`);
    if (!Number.isFinite(salePrice) || salePrice < 0 || !Number.isFinite(cost) || cost < 0) throw new Error(`Informe valores válidos para ${name}.`);
    return { id, name, quantity, salePrice: roundMoney(salePrice), cost: roundMoney(cost), pricingMode: "manualTotal" as const, ...completion };
  });

  const salePrice = roundMoney(items.reduce((sum, item) => sum + item.salePrice, 0));
  const cost = roundMoney(items.reduce((sum, item) => sum + item.cost, 0));
  if (customerName.length < 2) throw new Error("Informe o nome do cliente.");
  if (phone && (phone.length < 10 || phone.length > 11)) throw new Error("Informe um telefone válido ou deixe o campo vazio.");
  if (!closedAt || !deliveryAt) throw new Error("Informe as datas de fechamento e entrega.");
  if (deliveryAt < closedAt) throw new Error("A data de entrega não pode ser anterior ao fechamento.");
  if (!orderStatuses.includes(status)) throw new Error("Status inválido.");
  if (!items.length) throw new Error("Cadastre pelo menos um produto na encomenda.");
  return { customerName, phone, closedAt, deliveryAt, status, description, items, salePrice, cost, profit: roundMoney(salePrice - cost) };
}
