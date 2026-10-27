import { getCompanyContext } from "@/lib/company";
import { isMongoConfigured } from "@/lib/mongodb";

export async function POST(request: Request) {
  if (!isMongoConfigured()) return Response.json({ error: "MongoDB não configurado" }, { status: 503 });
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const input = await request.json();
  const now = new Date().toISOString();
  const project = { ...input, companyId: context.companyId, ownerId: context.companyId, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await context.db.collection("projects").insertOne(project);
  return Response.json(project, { status: 201 });
}
