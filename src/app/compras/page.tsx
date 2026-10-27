"use client";

import { FormEvent, useMemo, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import { purchaseCategories, type PurchaseCategory } from "@/lib/business-types";
import styles from "../admin.module.css";
import management from "../management.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

export default function PurchasesPage() {
  const { purchases, addPurchase } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const currentMonth = today().slice(0, 7);
  const summary = useMemo(() => {
    const monthPurchases = purchases.filter((purchase) => purchase.purchasedAt.startsWith(currentMonth));
    const monthTotal = monthPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
    return { monthPurchases, monthTotal, average: monthPurchases.length ? monthTotal / monthPurchases.length : 0 };
  }, [currentMonth, purchases]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await addPurchase({
        item: String(data.get("item")), category: String(data.get("category")) as PurchaseCategory,
        quantity: Number(data.get("quantity")), unitPrice: Number(data.get("unitPrice")),
        purchasedAt: String(data.get("purchasedAt")), supplier: String(data.get("supplier")), notes: String(data.get("notes")),
      });
      form.reset(); setQuantity(1); setUnitPrice(0);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar a compra."); }
    finally { setLoading(false); }
  };

  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Despesas do dia a dia</span><h1>Compras</h1><p>Registre insumos, ferramentas, embalagens e tudo o que a empresa compra para manter a operação funcionando.</p></div></header>
    <section className={`${styles.metrics} ${management.purchaseMetrics}`} aria-label="Resumo de compras">
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.costIcon}`}>▤</span><span className={styles.metricTrend}>Este mês</span></div><strong>{money.format(summary.monthTotal)}</strong><small>total comprado no mês</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={styles.metricIcon}>#</span><span className={styles.metricTrend}>Registros</span></div><strong>{summary.monthPurchases.length}</strong><small>compras cadastradas no mês</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.deliveredIcon}`}>÷</span><span className={styles.metricTrend}>Média</span></div><strong>{money.format(summary.average)}</strong><small>valor médio por compra</small></article>
    </section>
    <section className={management.layout}>
      <article className={styles.card}><form className={management.form} onSubmit={submit}><h2>Cadastrar compra</h2><p>O valor total é calculado pela quantidade e pelo valor unitário.</p>{error && <p className={management.message}>{error}</p>}<div className={management.fields}>
        <label className={management.field}><span>Item comprado</span><input name="item" required minLength={2} placeholder="Ex.: Fita crepe azul" /></label>
        <label className={management.field}><span>Categoria</span><select name="category" defaultValue="Insumos">{purchaseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <div className={management.fieldRow}><label className={management.field}><span>Quantidade</span><input name="quantity" type="number" min="0.01" step="0.01" required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label className={management.field}><span>Valor unitário</span><input name="unitPrice" type="number" min="0" step="0.01" required value={unitPrice || ""} onChange={(event) => setUnitPrice(Number(event.target.value))} placeholder="0,00" /></label></div>
        <div className={management.totalPreview}><span>Total da compra</span><strong>{money.format((Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0))}</strong></div>
        <label className={management.field}><span>Data da compra</span><input name="purchasedAt" type="date" required defaultValue={today()} /></label>
        <label className={management.field}><span>Fornecedor <small>(opcional)</small></span><input name="supplier" placeholder="Ex.: Loja do Maker" /></label>
        <label className={management.field}><span>Observações <small>(opcional)</small></span><textarea name="notes" placeholder="Detalhes da compra, finalidade ou referência da nota." /></label>
      </div><button className={styles.primary} disabled={loading}>{loading ? "Salvando..." : "＋ Cadastrar compra"}</button></form></article>
      <article className={styles.card}><div className={styles.cardHeader}><div><h2>Histórico de compras</h2><p>{purchases.length} registro(s) na empresa</p></div></div>{purchases.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Item</th><th>Categoria</th><th>Data</th><th>Quantidade</th><th>Valor unitário</th><th>Total</th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td><strong>{purchase.item}</strong>{(purchase.supplier || purchase.notes) && <small className={management.purchaseNote}>{purchase.supplier}{purchase.supplier && purchase.notes ? " · " : ""}{purchase.notes}</small>}</td><td><span className={management.badge}>{purchase.category}</span></td><td>{new Date(`${purchase.purchasedAt}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{purchase.quantity.toLocaleString("pt-BR")}</td><td>{money.format(purchase.unitPrice)}</td><td><strong>{money.format(purchase.total)}</strong></td></tr>)}</tbody></table></div> : <div className={styles.empty}><span>▤</span><h3>Nenhuma compra cadastrada</h3><p>Use o formulário para registrar a primeira compra do dia a dia.</p></div>}</article>
    </section>
  </main>;
}
