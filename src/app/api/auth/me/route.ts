import { getSession } from "@/lib/auth";
import { getDatabase, isMongoConfigured } from "@/lib/mongodb";

export async function GET() {
  const session = await getSession();
  if (!session || !isMongoConfigured()) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const user = await (await getDatabase()).collection("users").findOne({ id: session.userId }, { projection: { _id: 0, id: 1, name: 1, email: 1, storeName: 1, role: 1 } });
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  return Response.json({ user });
}
