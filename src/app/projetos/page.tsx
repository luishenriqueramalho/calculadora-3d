"use client";

import { FormEvent, useMemo, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import { orderStatusLabels, orderStatuses, type CustomerOrder, type OrderStatus } from "@/lib/business-types";
import adminStyles from "../admin.module.css";
import styles from "./kanban.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
const phoneMask = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
const today = () => { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; };
type DraftItem = { key: string; name: string; quantity: string; salePrice: string; cost: string };
const blankItem = (key: string): DraftItem => ({ key, name: "", quantity: "1", salePrice: "", cost: "" });

export default function ProjectsPage() {
  const { orders, addOrder, updateOrder, reorderOrders } = useBusiness();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerOrder | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<DraftItem[]>([blankItem("item-1")]);
  const columns = useMemo(() => Object.fromEntries(orderStatuses.map((status) => [status, orders.filter((order) => order.status === status).sort((a, b) => a.position - b.position)])) as Record<OrderStatus, CustomerOrder[]>, [orders]);
  const orderTotals = useMemo(() => items.reduce((totals, item) => {
    totals.salePrice += Number(item.salePrice) || 0;
    totals.cost += Number(item.cost) || 0;
    return totals;
  }, { salePrice: 0, cost: 0 }), [items]);
  const updateItem = (key: string, field: keyof Omit<DraftItem, "key">, value: string) => setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: value } : item));
  const openCreate = () => { setError(""); setItems([blankItem("item-1")]); setCreateOpen(true); };

  const createOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      await addOrder({
        customerName: String(data.get("customerName")), phone: String(data.get("phone")),
        closedAt: String(data.get("closedAt")), deliveryAt: String(data.get("deliveryAt")),
        status: String(data.get("status")) as OrderStatus, description: String(data.get("description")),
        items: items.map((item) => ({ name: item.name, quantity: Number(item.quantity), salePrice: Number(item.salePrice), cost: Number(item.cost) })),
        salePrice: orderTotals.salePrice, cost: orderTotals.cost,
      });
      setCreateOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar."); }
    finally { setSaving(false); }
  };

  const dropOrder = async (status: OrderStatus, index: number) => {
    if (!draggingId) return;
    const dragged = orders.find((order) => order.id === draggingId);
    if (!dragged) return;
    const nextColumns = Object.fromEntries(orderStatuses.map((itemStatus) => [itemStatus, columns[itemStatus].filter((order) => order.id !== draggingId)])) as Record<OrderStatus, CustomerOrder[]>;
    const sourceIndex = columns[status].findIndex((order) => order.id === draggingId);
    const insertionIndex = sourceIndex >= 0 && sourceIndex < index ? index - 1 : index;
    nextColumns[status].splice(insertionIndex, 0, { ...dragged, status });
    const next = orderStatuses.flatMap((itemStatus) => nextColumns[itemStatus].map((order, position) => ({ ...order, status: itemStatus, position })));
    setDraggingId(null);
    try { await reorderOrders(next); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível reordenar."); }
  };

  const changeStatus = async (status: OrderStatus) => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const updated = await updateOrder(selected.id, { status });
      setSelected(updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar."); }
    finally { setSaving(false); }
  };

  return <main className={`${adminStyles.page} ${styles.page}`}>
    <header className={adminStyles.pageHeader}><div><span className={adminStyles.eyebrow}>Orçamentos e encomendas</span><h1>Fluxo de produção</h1><p>Arraste os cards para mudar o status e a prioridade de cada pedido. A ordem fica salva para toda a equipe.</p></div><div className={adminStyles.headerActions}><button className={adminStyles.primary} type="button" onClick={openCreate}>＋ Nova encomenda</button></div></header>
    {error && <p className={styles.pageError}>{error}<button type="button" onClick={() => setError("")}>×</button></p>}
    <section className={styles.board} aria-label="Kanban de encomendas">
      {orderStatuses.map((status) => <article className={`${styles.column} ${styles[status]}`} key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => void dropOrder(status, columns[status].length)}>
        <header className={styles.columnHeader}><span className={styles.statusDot} /><strong>{orderStatusLabels[status]}</strong><small>{columns[status].length}</small></header>
        <div className={styles.cards}>
          {columns[status].map((order, index) => <button
            type="button" draggable className={`${styles.orderCard} ${draggingId === order.id ? styles.dragging : ""}`} key={order.id}
            onDragStart={(event) => { setDraggingId(order.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", order.id); }}
            onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); event.stopPropagation(); void dropOrder(status, index); }}
            onClick={() => setSelected(order)}>
            <span className={styles.dragHandle} aria-hidden="true">⠿</span>
            <strong>{order.customerName}</strong><p>{order.items?.length ? order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ") : order.description}</p>
            <span className={styles.cardMeta}><span>Entrega <b>{date(order.deliveryAt)}</b></span><span><b>{money.format(order.salePrice)}</b></span></span>
            <span className={`${styles.margin} ${order.profit < 0 ? styles.negative : ""}`}>Lucro {money.format(order.profit)}</span>
          </button>)}
          {!columns[status].length && <div className={styles.dropHint}>Arraste uma encomenda para cá</div>}
        </div>
      </article>)}
    </section>

    {createOpen && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="new-order-title"><header><div><span>Novo registro</span><h2 id="new-order-title">Cadastrar encomenda</h2></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Fechar">×</button></header><form onSubmit={createOrder}>
      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.formGrid}>
        <label><span>Nome do cliente</span><input name="customerName" required minLength={2} placeholder="Ex.: Maria Silva" /></label>
        <label><span>Telefone <small>(opcional)</small></span><input name="phone" inputMode="tel" placeholder="(85) 99999-9999" onChange={(event) => { event.currentTarget.value = phoneMask(event.currentTarget.value); }} /></label>
        <label><span>Data de fechamento</span><input name="closedAt" type="date" required defaultValue={today()} /></label>
        <label><span>Data de entrega</span><input name="deliveryAt" type="date" required /></label>
        <label className={styles.wide}><span>Status</span><select name="status" defaultValue="quote">{orderStatuses.map((status) => <option value={status} key={status}>{orderStatusLabels[status]}</option>)}</select></label>
        <div className={`${styles.wide} ${styles.productsField}`}><div className={styles.productsHeader}><div><strong>Produtos da encomenda</strong><small>O valor cobrado e o custo representam o lote inteiro da linha.</small></div><button type="button" onClick={() => setItems((current) => [...current, blankItem(crypto.randomUUID())])}>＋ Adicionar produto</button></div><div className={styles.productLabels}><span>Produto</span><span>Qtd.</span><span>Cobrado total</span><span>Custo total</span><span /></div>{items.map((item, index) => <div className={styles.productRow} key={item.key}><input aria-label={`Nome do produto ${index + 1}`} required minLength={2} value={item.name} onChange={(event) => updateItem(item.key, "name", event.target.value)} placeholder="Ex.: Chaveiro personalizado" /><input aria-label={`Quantidade do produto ${index + 1}`} type="number" min="0.01" step="0.01" required value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", event.target.value)} /><input aria-label={`Valor total cobrado pelo lote do produto ${index + 1}`} type="number" min="0" step="0.01" required value={item.salePrice} onChange={(event) => updateItem(item.key, "salePrice", event.target.value)} placeholder="0,00" /><input aria-label={`Custo total do lote do produto ${index + 1}`} type="number" min="0" step="0.01" required value={item.cost} onChange={(event) => updateItem(item.key, "cost", event.target.value)} placeholder="0,00" /><button type="button" aria-label={`Remover produto ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((currentItem) => currentItem.key !== item.key))}>×</button></div>)}</div>
        <label className={styles.wide}><span>Observações <small>(opcional)</small></span><textarea name="description" placeholder="Cores, acabamento, referências e outras informações da encomenda." /></label>
        <div className={`${styles.wide} ${styles.orderSummary}`}><div><span>Custo total</span><strong>{money.format(orderTotals.cost)}</strong></div><div><span>Valor cobrado</span><strong>{money.format(orderTotals.salePrice)}</strong></div><div className={orderTotals.salePrice - orderTotals.cost < 0 ? styles.summaryLoss : ""}><span>Lucro</span><strong>{money.format(orderTotals.salePrice - orderTotals.cost)}</strong></div></div>
      </div><footer><button className={adminStyles.secondary} type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button className={adminStyles.primary} disabled={saving}>{saving ? "Salvando..." : "Cadastrar encomenda"}</button></footer>
    </form></section></div>}

    {selected && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className={`${styles.modal} ${styles.detailModal}`} role="dialog" aria-modal="true" aria-labelledby="order-detail-title"><header><div><span>Detalhes da encomenda</span><h2 id="order-detail-title">{selected.customerName}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar">×</button></header>
      <div className={styles.detailBody}><div className={styles.statusControl}><label htmlFor="detail-status">Status atual</label><select id="detail-status" value={selected.status} disabled={saving} onChange={(event) => void changeStatus(event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option value={status} key={status}>{orderStatusLabels[status]}</option>)}</select></div>
      {selected.items?.length ? <div className={styles.orderItems}><h3>Produtos</h3>{selected.items.map((item) => <div className={styles.detailItem} key={item.id}><span><strong>{item.name}</strong><small>{item.quantity.toLocaleString("pt-BR")} unidade(s)</small></span><span><small>Custo do lote</small><b>{money.format(item.cost)}</b></span><span><small>Valor cobrado pelo lote</small><b>{money.format(item.salePrice)}</b></span></div>)}</div> : null}
      {selected.description && <p className={styles.description}>{selected.description}</p>}
      <dl className={styles.details}><div><dt>Telefone</dt><dd>{selected.phone ? phoneMask(selected.phone) : "Não informado"}</dd></div><div><dt>Fechamento</dt><dd>{date(selected.closedAt)}</dd></div><div><dt>Entrega</dt><dd>{date(selected.deliveryAt)}</dd></div></dl>
      <div className={styles.financials}><div><span>Custo</span><strong>{money.format(selected.cost)}</strong></div><div><span>Valor cobrado</span><strong>{money.format(selected.salePrice)}</strong></div><div className={selected.profit < 0 ? styles.loss : ""}><span>Lucro</span><strong>{money.format(selected.profit)}</strong></div></div>
      </div><footer><button className={adminStyles.primary} type="button" onClick={() => setSelected(null)}>Fechar</button></footer>
    </section></div>}
  </main>;
}
