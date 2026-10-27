import { companyFilter, getCompanyContext } from "@/lib/company";

export async function PATCH(request: Request, routeContext: { params: Promise<{ id: string; itemId: string }> }) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id, itemId } = await routeContext.params;
  const { completed } = await request.json() as { completed?: boolean };
  if (typeof completed !== "boolean") return Response.json({ error: "Estado do produto inválido." }, { status: 400 });
  const filter = { $and: [{ id, "items.id": itemId }, companyFilter(context.companyId)] };
  const result = await context.db.collection("orders").updateOne(filter, {
    $set: {
      "items.$[item].completed": completed,
      "items.$[item].completedAt": completed ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    },
  }, { arrayFilters: [{ "item.id": itemId }] });
  if (!result.matchedCount) return Response.json({ error: "Produto da encomenda não encontrado." }, { status: 404 });
  const order = await context.db.collection("orders").findOne(
    { $and: [{ id }, companyFilter(context.companyId)] },
    { projection: { _id: 0, companyId: 0, ownerId: 0 } },
  );
  return Response.json(order);
}
