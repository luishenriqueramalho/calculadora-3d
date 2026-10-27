import type { MarketplaceKey } from "@/lib/business-types";
import { companyFilter, getCompanyContext } from "@/lib/company";
import { isMongoConfigured } from "@/lib/mongodb";

export async function POST(request: Request, context: RouteContext<"/api/products/[id]/publish">) {
  if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
  const company = await getCompanyContext();
  if (!company) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await context.params;
  const { channels } = await request.json() as { channels: MarketplaceKey[] };
  const set = Object.fromEntries(channels.map((channel) => [`channels.${channel}`, "published"]));
  await company.db.collection("products").updateOne({ $and: [{ id }, companyFilter(company.companyId)] }, { $set: set });
  const product = await company.db.collection("products").findOne({ $and: [{ id }, companyFilter(company.companyId)] }, { projection: { _id: 0, companyId: 0, ownerId: 0 } });
  return Response.json(product);
}
