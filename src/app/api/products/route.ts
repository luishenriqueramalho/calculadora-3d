import { companyFilter, getCompanyContext } from "@/lib/company";
import { isMongoConfigured } from "@/lib/mongodb";
import { parseCatalogProductInput } from "@/lib/product-input";

export async function POST(request: Request) {
  try {
    if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
    const context = await getCompanyContext();
    if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const input = parseCatalogProductInput(await request.json() as Record<string, unknown>);
    const existing = await context.db.collection("products").findOne({ $and: [{ sku: input.sku }, { deletedAt: { $exists: false } }, companyFilter(context.companyId)] });
    if (existing) throw new Error("Já existe um produto com este SKU.");
    const now = new Date().toISOString();
    const product = {
      ...input,
      companyId: context.companyId,
      ownerId: context.companyId,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      channels: { mercadoLivre: "notPublished", shopee: "notPublished", tiktok: "notPublished" },
    };
    await context.db.collection("products").insertOne(product);
    const { companyId: _companyId, ownerId: _ownerId, ...publicProduct } = product;
    void _companyId; void _ownerId;
    return Response.json(publicProduct, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar o produto." }, { status: 400 });
  }
}
