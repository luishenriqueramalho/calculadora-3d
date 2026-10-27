import { purchaseCategories, type PurchaseCategory } from "@/lib/business-types";
import { getCompanyContext } from "@/lib/company";

type PurchaseInput = {
  item?: string;
  category?: PurchaseCategory;
  quantity?: number;
  unitPrice?: number;
  purchasedAt?: string;
  supplier?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const context = await getCompanyContext();
  if (!context) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const input = await request.json() as PurchaseInput;
  const item = input.item?.trim() ?? "";
  const category = input.category ?? "Outros";
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  const purchasedAt = input.purchasedAt ?? "";
  const supplier = input.supplier?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  if (item.length < 2) return Response.json({ error: "Informe o item comprado." }, { status: 400 });
  if (!purchaseCategories.includes(category)) return Response.json({ error: "Categoria inválida." }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity <= 0) return Response.json({ error: "Informe uma quantidade válida." }, { status: 400 });
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return Response.json({ error: "Informe um valor unitário válido." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt)) return Response.json({ error: "Informe a data da compra." }, { status: 400 });
  const now = new Date().toISOString();
  const publicPurchase = {
    id: crypto.randomUUID(), item, category, quantity, unitPrice,
    total: Math.round(quantity * unitPrice * 100) / 100,
    purchasedAt, supplier: supplier || undefined, notes: notes || undefined,
    createdAt: now, updatedAt: now,
  };
  await context.db.collection("purchases").insertOne({ ...publicPurchase, companyId: context.companyId, ownerId: context.companyId });
  return Response.json(publicPurchase, { status: 201 });
}
