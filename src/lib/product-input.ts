export type CatalogProductInput = {
  name: string;
  sku: string;
  category: string;
  description: string;
  costPrice: number;
  price: number;
  stock: number;
};

const numberValue = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value.replace(",", "."));
  return Number.NaN;
};

export function parseCatalogProductInput(input: Record<string, unknown>): CatalogProductInput {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const sku = typeof input.sku === "string" ? input.sku.trim().toUpperCase() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const costPrice = numberValue(input.costPrice);
  const price = numberValue(input.price);
  const stock = numberValue(input.stock);
  if (name.length < 2 || !sku || !category) throw new Error("Preencha nome, SKU e categoria.");
  if (!description) throw new Error("Informe a descrição do produto.");
  if (!Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(price) || price < 0) throw new Error("Informe preços válidos.");
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Informe um estoque válido.");
  return { name, sku, category, description, costPrice, price, stock };
}
