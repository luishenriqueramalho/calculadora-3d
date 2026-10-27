"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/components/BusinessProvider";
import styles from "../../admin.module.css";

export default function NewProductPage() {
  const router = useRouter();
  const { addProduct } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", sku: "", description: "", price: "", stock: "", category: "Decoração" });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await addProduct({ name: form.name, sku: form.sku, description: form.description, price: Number(form.price.replace(",", ".")), stock: Number(form.stock), category: form.category });
      router.push("/catalogo");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o produto.");
      setSaving(false);
    }
  };
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Catálogo</span><h1>Novo produto</h1><p>As informações abaixo serão a fonte única para publicar em todos os marketplaces.</p></div></header>
    <form className={`${styles.card} ${styles.formCard}`} onSubmit={submit}>
      {error && <p className={styles.storageNote}>{error}</p>}
      <div className={styles.formGrid}>
        <label className={`${styles.field} ${styles.wide}`}><span>Nome do produto</span><input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Ex.: Vaso geométrico G" /></label>
        <label className={styles.field}><span>SKU</span><input required value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="Ex.: VASO-G-001" /></label>
        <label className={styles.field}><span>Categoria</span><select value={form.category} onChange={(event) => update("category", event.target.value)}><option>Decoração</option><option>Miniaturas</option><option>Utilidades</option><option>Peças técnicas</option><option>Brinquedos</option></select></label>
        <label className={styles.field}><span>Preço de venda (R$)</span><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="0,00" /></label>
        <label className={styles.field}><span>Estoque</span><input required type="number" min="0" step="1" value={form.stock} onChange={(event) => update("stock", event.target.value)} placeholder="0" /></label>
        <label className={`${styles.field} ${styles.wide}`}><span>Descrição</span><textarea required value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Descreva material, medidas, acabamento e prazo de produção." /></label>
      </div>
      <div className={styles.formActions}><button type="button" className={styles.secondary} onClick={() => router.back()}>Cancelar</button><button className={styles.primary} disabled={saving}>{saving ? "Salvando..." : "Salvar no catálogo"}</button></div>
    </form>
  </main>;
}
