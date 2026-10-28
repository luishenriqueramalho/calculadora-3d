import { companyFilter, getCompanyContext } from "@/lib/company";
import { parseCatalogProductInput } from "@/lib/product-input";

export async function PATCH(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const context = await getCompanyContext();
    if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await routeContext.params;
    const filter = { $and: [{ id }, { deletedAt: { $exists: false } }, companyFilter(context.companyId)] };
    const current = await context.db.collection("products").findOne(filter);
    if (!current) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    const input = parseCatalogProductInput(await request.json() as Record<string, unknown>);
    const duplicate = await context.db.collection("products").findOne({ $and: [{ id: { $ne: id } }, { sku: input.sku }, { deletedAt: { $exists: false } }, companyFilter(context.companyId)] });
    if (duplicate) throw new Error("Já existe outro produto com este SKU.");
    await context.db.collection("products").updateOne(filter, { $set: { ...input, updatedAt: new Date().toISOString() } });
    const product = await context.db.collection("products").findOne(filter, { projection: { _id: 0, companyId: 0, ownerId: 0, deletedAt: 0 } });
    return Response.json(product);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível editar o produto." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await routeContext.params;
  const filter = { $and: [{ id }, { deletedAt: { $exists: false } }, companyFilter(context.companyId)] };
  const now = new Date().toISOString();
  const result = await context.db.collection("products").updateOne(filter, { $set: { deletedAt: now, updatedAt: now } });
  if (!result.matchedCount) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  return Response.json({ success: true });
}
