import { getCompanyContext } from "@/lib/company";
import { isMongoConfigured } from "@/lib/mongodb";

export async function POST(request: Request) {
  if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const input = await request.json();
  const product = {
    ...input,
    companyId: context.companyId,
    ownerId: context.companyId,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    channels: { mercadoLivre: "notPublished", shopee: "notPublished", tiktok: "notPublished" },
  };
  await context.db.collection("products").insertOne(product);
  return Response.json(product, { status: 201 });
}
