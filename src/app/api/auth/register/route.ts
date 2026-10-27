import { getDatabase, isMongoConfigured } from "@/lib/mongodb";
import { hashPassword, isValidCpf, normalizeCpf, protectCpf, setSession } from "@/lib/auth";

type RegisterInput = { name?: string; email?: string; phone?: string; cpf?: string; storeName?: string; password?: string };

async function register(request: Request) {
  if (!isMongoConfigured()) return Response.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const input = await request.json() as RegisterInput;
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const phone = input.phone?.replace(/\D/g, "") ?? "";
  const cpf = normalizeCpf(input.cpf ?? "");
  const storeName = input.storeName?.trim() ?? "";
  const password = input.password ?? "";

  if (name.length < 3 || storeName.length < 2) return Response.json({ error: "Preencha seu nome e o nome da loja." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (phone.length < 10 || phone.length > 11) return Response.json({ error: "Informe um telefone válido." }, { status: 400 });
  if (!isValidCpf(cpf)) return Response.json({ error: "Informe um CPF válido." }, { status: 400 });
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return Response.json({ error: "A senha deve ter pelo menos 8 caracteres, uma letra e um número." }, { status: 400 });

  const db = await getDatabase();
  const users = db.collection("users");
  const cpfData = protectCpf(cpf);
  await Promise.all([users.createIndex({ email: 1 }, { unique: true }), users.createIndex({ cpfHash: 1 }, { unique: true })]);
  if (await users.findOne({ $or: [{ email }, { cpfHash: cpfData.hash }] })) return Response.json({ error: "Já existe uma conta com este e-mail ou CPF." }, { status: 409 });

  const passwordData = await hashPassword(password);
  const userId = crypto.randomUUID();
  const user = {
    id: userId, companyId: userId, name, email, phone, storeName,
    cpfHash: cpfData.hash, cpfEncrypted: cpfData.encrypted, cpfIv: cpfData.iv, cpfTag: cpfData.tag,
    passwordHash: passwordData.hash, passwordSalt: passwordData.salt,
    role: "owner", createdAt: new Date().toISOString(),
  };
  try {
    await users.insertOne(user);
  } catch (error) {
    if (error instanceof Error && error.message.includes("E11000")) return Response.json({ error: "Já existe uma conta com este e-mail ou CPF." }, { status: 409 });
    throw error;
  }
  await setSession(user.id);
  return Response.json({ user: { id: user.id, name, email, storeName } }, { status: 201 });
}

export async function POST(request: Request) {
  try {
    return await register(request);
  } catch (error) {
    console.error("Falha ao cadastrar usuário no MongoDB:", error instanceof Error ? error.name : "erro desconhecido");
    return Response.json({
      error: "Não foi possível conectar ao MongoDB. Verifique se o IP atual está liberado no Atlas e tente novamente.",
    }, { status: 503 });
  }
}
