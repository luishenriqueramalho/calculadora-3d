import { orderStatuses, type OrderStatus } from "@/lib/business-types";
import { companyFilter, getCompanyContext } from "@/lib/company";

export async function PUT(request: Request) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { columns } = await request.json() as { columns?: Partial<Record<OrderStatus, string[]>> };
  if (!columns) return Response.json({ error: "Ordenação inválida." }, { status: 400 });
  const entries = orderStatuses.flatMap((status) => (columns[status] ?? []).map((id, position) => ({ id, status, position })));
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) return Response.json({ error: "Uma encomenda não pode ocupar duas posições." }, { status: 400 });
  const count = await context.db.collection("orders").countDocuments({ $and: [{ id: { $in: ids } }, companyFilter(context.companyId)] });
  if (count !== ids.length) return Response.json({ error: "Uma ou mais encomendas são inválidas." }, { status: 400 });
  if (entries.length) {
    await context.db.collection("orders").bulkWrite(entries.map((entry) => ({
      updateOne: {
        filter: { $and: [{ id: entry.id }, companyFilter(context.companyId)] },
        update: { $set: { status: entry.status, position: entry.position, updatedAt: new Date().toISOString() } },
      },
    })));
  }
  return Response.json({ ok: true });
}
