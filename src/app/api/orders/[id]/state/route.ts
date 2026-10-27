import type { OrderRecordState } from "@/lib/business-types";
import { companyFilter, getCompanyContext } from "@/lib/company";

export async function PATCH(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await routeContext.params;
  const { state } = await request.json() as { state?: OrderRecordState };
  if (state !== "cancelled" && state !== "deleted") return Response.json({ error: "Ação inválida." }, { status: 400 });
  const now = new Date().toISOString();
  const update = {
    recordState: state,
    updatedAt: now,
    ...(state === "cancelled" ? { cancelledAt: now } : { deletedAt: now }),
  };
  const result = await context.db.collection("orders").updateOne({ $and: [{ id }, companyFilter(context.companyId)] }, { $set: update });
  if (!result.matchedCount) return Response.json({ error: "Encomenda não encontrada." }, { status: 404 });
  const order = await context.db.collection("orders").findOne(
    { $and: [{ id }, companyFilter(context.companyId)] },
    { projection: { _id: 0, companyId: 0, ownerId: 0 } },
  );
  return Response.json(order);
}
