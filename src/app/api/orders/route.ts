import { companyFilter, getCompanyContext } from "@/lib/company";
import { isMongoConfigured } from "@/lib/mongodb";
import { parseOrderInput, type OrderInput } from "@/lib/order-input";

export async function POST(request: Request) {
  try {
    if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
    const context = await getCompanyContext();
    if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const rawInput = await request.json() as OrderInput;
    const input = await parseOrderInput(rawInput, context.db, context.companyId);
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
