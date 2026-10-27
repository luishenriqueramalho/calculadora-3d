import { companyFilter, getCompanyContext } from "@/lib/company";
import { orderStatuses, type OrderStatus } from "@/lib/business-types";
import { isMongoConfigured } from "@/lib/mongodb";

type OrderInput = {
  customerName?: string;
  phone?: string;
  closedAt?: string;
  deliveryAt?: string;
  status?: OrderStatus;
  description?: string;
  items?: Array<{ name?: string; quantity?: number; salePrice?: number; cost?: number }>;
};

function parseInput(input: OrderInput) {
  const customerName = input.customerName?.trim() ?? "";
  const phone = input.phone?.replace(/\D/g, "") ?? "";
  const closedAt = input.closedAt ?? "";
  const deliveryAt = input.deliveryAt ?? "";
  const status = input.status ?? "quote";
  const description = input.description?.trim() ?? "";
  const items = (input.items ?? []).map((item, index) => {
    const name = item.name?.trim() ?? "";
    const quantity = Number(item.quantity);
    const salePrice = Number(item.salePrice);
    const cost = Number(item.cost);
    if (name.length < 2) throw new Error(`Informe o nome do produto ${index + 1}.`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Informe uma quantidade válida para ${name}.`);
    if (!Number.isFinite(salePrice) || salePrice < 0 || !Number.isFinite(cost) || cost < 0) throw new Error(`Informe valores válidos para ${name}.`);
    return { id: crypto.randomUUID(), name, quantity, salePrice, cost, completed: false, completedAt: null };
  });
  const salePrice = Math.round(items.reduce((sum, item) => sum + item.salePrice, 0) * 100) / 100;
  const cost = Math.round(items.reduce((sum, item) => sum + item.cost, 0) * 100) / 100;
  if (customerName.length < 2) throw new Error("Informe o nome do cliente.");
  if (phone && (phone.length < 10 || phone.length > 11)) throw new Error("Informe um telefone válido ou deixe o campo vazio.");
  if (!closedAt || !deliveryAt) throw new Error("Informe as datas de fechamento e entrega.");
  if (deliveryAt < closedAt) throw new Error("A data de entrega não pode ser anterior ao fechamento.");
  if (!orderStatuses.includes(status)) throw new Error("Status inválido.");
  if (!items.length) throw new Error("Cadastre pelo menos um produto na encomenda.");
  return { customerName, phone: phone || undefined, closedAt, deliveryAt, status, description, items, salePrice, cost, profit: salePrice - cost };
}

export async function POST(request: Request) {
  try {
    if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
    const context = await getCompanyContext();
    if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const input = parseInput(await request.json() as OrderInput);
    const last = await context.db.collection("orders").find({ $and: [{ status: input.status }, companyFilter(context.companyId)] }).sort({ position: -1 }).limit(1).next();
    const now = new Date().toISOString();
    const publicOrder = {
      ...input,
      id: crypto.randomUUID(),
      position: typeof last?.position === "number" ? last.position + 1 : 0,
      createdAt: now,
      updatedAt: now,
      ...(input.status === "completed" ? { completedAt: now } : {}),
      ...(input.status === "delivered" ? { deliveredAt: now } : {}),
    };
    const order = { ...publicOrder, companyId: context.companyId, ownerId: context.companyId };
    await context.db.collection("orders").insertOne(order);
    return Response.json(publicOrder, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar a encomenda." }, { status: 400 });
  }
}
