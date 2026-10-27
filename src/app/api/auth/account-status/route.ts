import { getDatabase, isMongoConfigured } from "@/lib/mongodb";

export async function POST(request: Request) {
  if (!isMongoConfigured()) return Response.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const { email: rawEmail } = await request.json() as { email?: string };
  const email = rawEmail?.trim().toLowerCase() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  const user = await (await getDatabase()).collection("users").findOne({ email });
  return Response.json({ setupRequired: Boolean(user && (typeof user.passwordHash !== "string" || typeof user.passwordSalt !== "string")) });
}
