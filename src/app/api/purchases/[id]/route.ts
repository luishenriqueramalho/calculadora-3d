import { companyFilter, getCompanyContext } from "@/lib/company";

export async function DELETE(_request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await routeContext.params;
  const purchase = await context.db.collection("purchases").findOne({ $and: [{ id }, companyFilter(context.companyId)] });
  if (!purchase) return Response.json({ error: "Compra não encontrada." }, { status: 404 });
  if (purchase.source === "filament" || purchase.filamentId) return Response.json({ error: "Esta compra pertence a um filamento. Exclua o filamento para remover os dois registros." }, { status: 409 });
  await context.db.collection("purchases").deleteOne({ $and: [{ id }, companyFilter(context.companyId)] });
  return Response.json({ ok: true });
}
