import { hashPassword, setSession } from "@/lib/auth";
import { getDatabase, isMongoConfigured } from "@/lib/mongodb";

export async function POST(request: Request) {
  if (!isMongoConfigured()) return Response.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const { email: rawEmail, password } = await request.json() as { email?: string; password?: string };
  const email = rawEmail?.trim().toLowerCase() ?? "";
  if (!email) return Response.json({ error: "Informe seu e-mail." }, { status: 400 });
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return Response.json({ error: "A senha deve ter pelo menos 8 caracteres, uma letra e um número." }, { status: 400 });
  const db = await getDatabase();
  const user = await db.collection("users").findOne({ email });
  if (!user) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (typeof user.passwordHash === "string" && typeof user.passwordSalt === "string") return Response.json({ error: "Este usuário já possui senha. Entre normalmente." }, { status: 409 });
  const passwordData = await hashPassword(password);
  const result = await db.collection("users").updateOne({ id: user.id, passwordHash: { $exists: false } }, { $set: { passwordHash: passwordData.hash, passwordSalt: passwordData.salt, passwordCreatedAt: new Date().toISOString() } });
  if (!result.modifiedCount) return Response.json({ error: "A senha já foi cadastrada. Entre normalmente." }, { status: 409 });
  await setSession(String(user.id));
  return Response.json({ user: { id: user.id, name: user.name, email: user.email, storeName: user.storeName } });
}
