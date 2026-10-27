import { getDatabase, isMongoConfigured } from "@/lib/mongodb";
import { setSession, verifyPassword } from "@/lib/auth";

async function login(request: Request) {
  if (!isMongoConfigured()) return Response.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password) return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
  const user = await (await getDatabase()).collection("users").findOne({ email: email.trim().toLowerCase() });
  if (!user || typeof user.passwordSalt !== "string" || typeof user.passwordHash !== "string" || !await verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }
  await setSession(String(user.id));
  return Response.json({ user: { id: user.id, name: user.name, email: user.email, storeName: user.storeName } });
}

export async function POST(request: Request) {
  try {
    return await login(request);
  } catch (error) {
    console.error("Falha ao autenticar usuário no MongoDB:", error instanceof Error ? error.name : "erro desconhecido");
    return Response.json({
      error: "Não foi possível conectar ao MongoDB. Verifique se o IP atual está liberado no Atlas e tente novamente.",
    }, { status: 503 });
  }
}
