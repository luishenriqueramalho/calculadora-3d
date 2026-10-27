import { companyFilter, getCompanyContext } from "@/lib/company";

export async function DELETE(_request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await routeContext.params;
  const filament = await context.db.collection("filaments").findOne({ $and: [{ id }, companyFilter(context.companyId)] });
  if (!filament) return Response.json({ error: "Filamento não encontrado." }, { status: 404 });
  await context.db.collection("filaments").deleteOne({ $and: [{ id }, companyFilter(context.companyId)] });
  await context.db.collection("purchases").deleteMany({ $and: [{ filamentId: id }, companyFilter(context.companyId)] });
  return Response.json({ ok: true });
}
