"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import type { CatalogProduct, MarketplaceKey } from "@/lib/business-types";
import styles from "../admin.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const channels: MarketplaceKey[] = ["mercadoLivre", "shopee", "tiktok"];
const labels: Record<MarketplaceKey, string> = { mercadoLivre: "ML", shopee: "S", tiktok: "TT" };
const categories = ["Decoração", "Miniaturas", "Utilidades", "Peças técnicas", "Brinquedos"];
type ProductForm = { name: string; sku: string; category: string; costPrice: string; price: string; stock: string; description: string };

const formFromProduct = (product: CatalogProduct): ProductForm => ({
  name: product.name,
  sku: product.sku,
  category: product.category,
  costPrice: String(product.costPrice ?? product.price),
  price: String(product.price),
  stock: String(product.stock),
  description: product.description,
});

export default function CatalogPage() {
  const { products, connections, publishProduct, updateProduct, deleteProduct } = useBusiness();
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const connectedChannels = connections.filter((store) => store.status === "connected").map((store) => store.id);

  const publish = async (id: string) => {
    if (!connectedChannels.length) return;
    setPublishing(id); setError("");
    try { await publishProduct(id, connectedChannels); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível publicar o produto."); }
    finally { setPublishing(null); }
  };

  const openEdit = (product: CatalogProduct) => {
    setError(""); setEditing(product); setForm(formFromProduct(product));
  };

  const closeEdit = () => { if (!saving) { setEditing(null); setForm(null); } };
  const updateField = (field: keyof ProductForm, value: string) => setForm((current) => current ? { ...current, [field]: value } : current);

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !form) return;
    setSaving(true); setError("");
    try {
      await updateProduct(editing.id, {
        name: form.name, sku: form.sku, category: form.category,
        costPrice: Number(form.costPrice.replace(",", ".")),
        price: Number(form.price.replace(",", ".")), stock: Number(form.stock), description: form.description,
      });
      setEditing(null); setForm(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível editar o produto."); }
    finally { setSaving(false); }
  };

  const remove = async (product: CatalogProduct) => {
    if (!window.confirm(`Excluir “${product.name}” do catálogo? As encomendas existentes serão preservadas.`)) return;
    setDeleting(product.id); setError("");
    try { await deleteProduct(product.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível excluir o produto."); }
    finally { setDeleting(null); }
  };

  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Produtos</span><h1>Catálogo</h1><p>Cadastre uma vez e distribua seus produtos para todos os canais conectados.</p></div><div className={styles.headerActions}><Link href="/catalogo/novo" className={styles.primary}>＋ Novo produto</Link></div></header>
    {error && !editing && <p className={styles.catalogError}>{error}<button type="button" onClick={() => setError("")}>×</button></p>}
    {products.length ? <section className={styles.catalogGrid}>{products.map((product) => <article className={styles.productCard} key={product.id}>
      <div className={styles.productVisual}>◇</div>
      <div className={styles.productHead}><span className={styles.productName}><strong>{product.name}</strong><small>SKU {product.sku} · {product.category} · {product.stock} em estoque</small></span><span className={styles.productPrice}>{money.format(product.price)}</span></div>
      <div className={styles.productCosts}><span>Custo unitário <b>{money.format(product.costPrice ?? product.price)}</b></span><span>Venda unitária <b>{money.format(product.price)}</b></span></div>
      <div className={styles.channelDots} aria-label="Canais publicados">{channels.map((channel) => <span key={channel} title={channel} className={`${styles.channelDot} ${styles[channel]} ${product.channels[channel] === "published" ? styles.live : ""}`}>{labels[channel]}</span>)}</div>
      <div className={styles.productActions}><button type="button" disabled={publishing === product.id || !connectedChannels.length} onClick={() => void publish(product.id)}>{publishing === product.id ? "Publicando..." : connectedChannels.length ? "Publicar" : "Conecte uma loja"}</button><button type="button" onClick={() => openEdit(product)}>Editar</button><button className={styles.dangerAction} type="button" disabled={deleting === product.id} onClick={() => void remove(product)}>{deleting === product.id ? "Excluindo..." : "Excluir"}</button></div>
    </article>)}</section> : <article className={styles.card}><div className={styles.empty}><span>◇</span><h3>Nenhum produto no catálogo</h3><p>Cadastre seu primeiro produto e publique no Mercado Livre, Shopee e TikTok Shop em um único fluxo.</p><Link href="/catalogo/novo" className={styles.primary}>Cadastrar produto</Link></div></article>}

    {editing && form && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEdit(); }}><form className={styles.catalogModal} onSubmit={saveEdit} role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
      <header><div><span>Catálogo</span><h2 id="edit-product-title">Editar produto</h2></div><button type="button" onClick={closeEdit} aria-label="Fechar">×</button></header>
      <div className={styles.catalogModalBody}>
        {error && <p className={styles.catalogError}>{error}</p>}
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.wide}`}><span>Nome do produto</span><input required minLength={2} value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
          <label className={styles.field}><span>SKU</span><input required value={form.sku} onChange={(event) => updateField("sku", event.target.value)} /></label>
          <label className={styles.field}><span>Categoria</span><select value={form.category} onChange={(event) => updateField("category", event.target.value)}>{!categories.includes(form.category) && <option>{form.category}</option>}{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className={styles.field}><span>Preço de custo unitário (R$)</span><input required type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => updateField("costPrice", event.target.value)} /></label>
          <label className={styles.field}><span>Preço de venda unitário (R$)</span><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} /></label>
          <label className={styles.field}><span>Estoque</span><input required type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField("stock", event.target.value)} /></label>
          <label className={`${styles.field} ${styles.wide}`}><span>Descrição</span><textarea required value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
        </div>
      </div>
      <footer><button className={styles.secondary} type="button" onClick={closeEdit}>Cancelar</button><button className={styles.primary} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></footer>
    </form></div>}
  </main>;
}
