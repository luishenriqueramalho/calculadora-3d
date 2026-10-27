import { getCompanyContext } from "@/lib/company";

function dateInFortaleza() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function POST(request: Request) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const input = await request.json() as { color?: string; brand?: string; price?: number };
  const color = input.color?.trim() ?? "";
  const brand = input.brand?.trim() ?? "";
  const price = Number(input.price);
  if (!color || !brand || !Number.isFinite(price) || price < 0) return Response.json({ error: "Preencha cor, marca e preço corretamente." }, { status: 400 });
  const now = new Date().toISOString();
  const publicFilament = { id: crypto.randomUUID(), color, brand, price, createdAt: now, updatedAt: now };
  const filament = { ...publicFilament, companyId: context.companyId, ownerId: context.companyId };
  const publicPurchase = {
    id: crypto.randomUUID(),
    item: `Filamento ${brand} - ${color}`,
    category: "Insumos" as const,
    quantity: 1,
    unitPrice: price,
    total: price,
    purchasedAt: dateInFortaleza(),
    supplier: brand,
    notes: "Compra criada automaticamente pelo cadastro de filamento.",
    source: "filament" as const,
    filamentId: publicFilament.id,
    createdAt: now,
    updatedAt: now,
  };
  let filamentInserted = false;
  try {
    await context.db.collection("filaments").insertOne(filament);
    filamentInserted = true;
    await context.db.collection("purchases").insertOne({ ...publicPurchase, companyId: context.companyId, ownerId: context.companyId });
  } catch (error) {
    if (filamentInserted) await context.db.collection("filaments").deleteOne({ id: publicFilament.id, companyId: context.companyId });
    throw error;
  }
  return Response.json({ filament: publicFilament, purchase: publicPurchase }, { status: 201 });
}
