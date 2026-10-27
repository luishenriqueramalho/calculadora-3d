import { emptyConnections } from "@/lib/business-types";
import { companyFilter, getCompanyContext } from "@/lib/company";
import { isStoredMarketplaceAuth } from "@/lib/marketplaces/types";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET() {
  if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { db, companyId } = context;
  const [projects, products, savedConnections, orders, filaments, purchases, users] = await Promise.all([
    db.collection("projects").find(companyFilter(companyId), { projection: { _id: 0, companyId: 0, ownerId: 0 } }).sort({ createdAt: -1 }).toArray(),
    db.collection("products").find(companyFilter(companyId), { projection: { _id: 0, companyId: 0, ownerId: 0 } }).sort({ createdAt: -1 }).toArray(),
    db.collection("connections").find(companyFilter(companyId)).toArray(),
    db.collection("orders").find(companyFilter(companyId), { projection: { _id: 0, companyId: 0, ownerId: 0 } }).sort({ status: 1, position: 1 }).toArray(),
    db.collection("filaments").find(companyFilter(companyId), { projection: { _id: 0, companyId: 0, ownerId: 0 } }).sort({ createdAt: -1 }).toArray(),
    db.collection("purchases").find(companyFilter(companyId), { projection: { _id: 0, companyId: 0, ownerId: 0 } }).sort({ purchasedAt: -1, createdAt: -1 }).toArray(),
    db.collection("users").find({ $or: [{ companyId }, { id: companyId }] }, { projection: { _id: 0, id: 1, name: 1, email: 1, role: 1, passwordHash: 1, passwordSalt: 1, createdAt: 1 } }).sort({ createdAt: 1 }).toArray(),
  ]);
  const connections = emptyConnections.map((fallback) => {
    const saved = savedConnections.find((connection) => connection.id === fallback.id);
    if (!saved || !isStoredMarketplaceAuth(saved.auth, fallback.id)) return fallback;
    return {
      ...fallback,
      status: "connected" as const,
      account: typeof saved.account === "string" ? saved.account : undefined,
      orders: typeof saved.orders === "number" ? saved.orders : 0,
      revenue: typeof saved.revenue === "number" ? saved.revenue : 0,
      products: typeof saved.products === "number" ? saved.products : 0,
      lastSync: typeof saved.lastSync === "string" ? saved.lastSync : undefined,
    };
  });
  const companyUsers = users.map((user) => ({
    id: String(user.id),
    name: String(user.name),
    email: String(user.email),
    role: user.role === "member" ? "member" as const : "owner" as const,
    hasPassword: typeof user.passwordHash === "string" && typeof user.passwordSalt === "string",
    createdAt: String(user.createdAt),
  }));
  return Response.json({ projects, products, connections, orders, filaments, purchases, users: companyUsers });
}
