import { companyFilter, getCompanyContext } from "@/lib/company";
import { orderStatuses, type OrderItem, type OrderStatus } from "@/lib/business-types";
import { parseOrderInput, type OrderInput } from "@/lib/order-input";

type UpdateInput = OrderInput & {
  customerName?: string;
  phone?: string;
  closedAt?: string;
  deliveryAt?: string;
  status?: OrderStatus;
  salePrice?: number;
  cost?: number;
};

export async function PATCH(request: Request, routeContext: RouteContext<"/api/orders/[id]">) {
  try {
    const context = await getCompanyContext();
    if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await routeContext.params;
    const current = await context.db.collection("orders").findOne({ $and: [{ id }, companyFilter(context.companyId)] });
    if (!current) return Response.json({ error: "Encomenda não encontrada." }, { status: 404 });
    const input = await request.json() as UpdateInput;
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updatedAt: now };
    if (Array.isArray(input.items)) {
      const parsed = await parseOrderInput(input, context.db, context.companyId, Array.isArray(current.items) ? current.items as OrderItem[] : []);
      Object.assign(update, parsed);
    } else {
      if (typeof input.customerName === "string") update.customerName = input.customerName.trim();
      if (typeof input.phone === "string") update.phone = input.phone.replace(/\D/g, "");
      if (typeof input.closedAt === "string") update.closedAt = input.closedAt;
      if (typeof input.deliveryAt === "string") update.deliveryAt = input.deliveryAt;
      if (typeof input.description === "string") update.description = input.description.trim();
      if (typeof input.salePrice === "number" && Number.isFinite(input.salePrice) && input.salePrice >= 0) update.salePrice = input.salePrice;
      if (typeof input.cost === "number" && Number.isFinite(input.cost) && input.cost >= 0) update.cost = input.cost;
    }
    if (input.status && orderStatuses.includes(input.status)) {
      update.status = input.status;
      if (input.status !== current.status) {
        if (input.status === "completed") update.completedAt = now;
        if (input.status === "delivered") update.deliveredAt = now;
        const last = await context.db.collection("orders").find({ $and: [{ status: input.status }, companyFilter(context.companyId)] }).sort({ position: -1 }).limit(1).next();
        update.position = typeof last?.position === "number" ? last.position + 1 : 0;
      }
    }
    const salePrice = typeof update.salePrice === "number" ? update.salePrice : Number(current.salePrice);
    const cost = typeof update.cost === "number" ? update.cost : Number(current.cost);
    update.profit = Math.round((salePrice - cost) * 100) / 100;
    await context.db.collection("orders").updateOne({ $and: [{ id }, companyFilter(context.companyId)] }, { $set: update });
    const order = await context.db.collection("orders").findOne({ $and: [{ id }, companyFilter(context.companyId)] }, { projection: { _id: 0, companyId: 0, ownerId: 0 } });
    return Response.json(order);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a encomenda." }, { status: 400 });
  }
}
