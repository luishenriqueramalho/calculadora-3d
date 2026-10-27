import { getCompanyContext } from "@/lib/company";

export async function POST(request: Request) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const input = await request.json() as { name?: string; email?: string };
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  if (name.length < 3) return Response.json({ error: "Informe o nome completo." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  const users = context.db.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  if (await users.findOne({ email })) return Response.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
  const user = {
    id: crypto.randomUUID(), name, email, storeName: context.user.storeName,
    companyId: context.companyId, role: "member", createdAt: new Date().toISOString(),
  };
  try {
    await users.insertOne(user);
  } catch (error) {
    if (error instanceof Error && error.message.includes("E11000")) return Response.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    throw error;
  }
  return Response.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt, hasPassword: false }, { status: 201 });
}
