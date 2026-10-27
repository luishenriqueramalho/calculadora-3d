"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import { orderStatusLabels, orderStatuses, type CustomerOrder, type OrderStatus } from "@/lib/business-types";
import adminStyles from "../admin.module.css";
import styles from "./kanban.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
const phoneMask = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
const today = () => { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; };
type DraftItem = { key: string; name: string; quantity: string; salePrice: string; cost: string };
type OrdersView = "kanban" | "delivered" | "inactive";
const blankItem = (key: string): DraftItem => ({ key, name: "", quantity: "1", salePrice: "", cost: "" });
const recordState = (order: CustomerOrder) => order.recordState ?? "active";
const deliveredTime = (order: CustomerOrder) => new Date(order.deliveredAt ?? `${order.deliveryAt}T12:00:00`).getTime();

export default function ProjectsPage() {
  const { orders, addOrder, updateOrder, reorderOrders, toggleOrderItem, setOrderRecordState } = useBusiness();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerOrder | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([blankItem("item-1")]);
  const [view, setView] = useState<OrdersView>("kanban");
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const deliveredOrders = useMemo(() => orders.filter((order) => recordState(order) === "active" && order.status === "delivered" && clock > 0 && clock - deliveredTime(order) >= 24 * 60 * 60 * 1000).sort((a, b) => deliveredTime(b) - deliveredTime(a)), [clock, orders]);
  const inactiveOrders = useMemo(() => orders.filter((order) => recordState(order) !== "active").sort((a, b) => (b.deletedAt ?? b.cancelledAt ?? b.updatedAt).localeCompare(a.deletedAt ?? a.cancelledAt ?? a.updatedAt)), [orders]);
  const columns = useMemo(() => Object.fromEntries(orderStatuses.map((status) => [status, orders.filter((order) => recordState(order) === "active" && order.status === status && !deliveredOrders.some((delivered) => delivered.id === order.id)).sort((a, b) => a.position - b.position)])) as Record<OrderStatus, CustomerOrder[]>, [deliveredOrders, orders]);
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

  const changeItemState = async (itemId: string, completed: boolean) => {
    if (!selected) return;
    setUpdatingItemId(itemId); setError("");
    try {
      const updated = await toggleOrderItem(selected.id, itemId, completed);
      setSelected(updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o produto."); }
    finally { setUpdatingItemId(null); }
  };

  const changeRecordState = async (state: "cancelled" | "deleted") => {
    if (!selected) return;
    const action = state === "cancelled" ? "cancelar" : "excluir";
    if (!window.confirm(`Tem certeza que deseja ${action} esta encomenda? Ela será movida para Cancelados/Excluídos.`)) return;
    setSaving(true); setError("");
    try {
      await setOrderRecordState(selected.id, state);
      setSelected(null); setView("inactive");
    } catch (reason) { setError(reason instanceof Error ? reason.message : `Não foi possível ${action} a encomenda.`); }
    finally { setSaving(false); }
  };

  return <main className={`${adminStyles.page} ${styles.page}`}>
    <header className={adminStyles.pageHeader}><div><span className={adminStyles.eyebrow}>Orçamentos e encomendas</span><h1>Fluxo de produção</h1><p>Arraste os cards para mudar o status e a prioridade de cada pedido. A ordem fica salva para toda a equipe.</p></div><div className={adminStyles.headerActions}><button className={adminStyles.primary} type="button" onClick={openCreate}>＋ Nova encomenda</button></div></header>
    <nav className={styles.viewTabs} aria-label="Visualizações de encomendas"><button type="button" className={view === "kanban" ? styles.activeTab : ""} onClick={() => setView("kanban")}>Kanban <span>{orderStatuses.reduce((sum, status) => sum + columns[status].length, 0)}</span></button><button type="button" className={view === "delivered" ? styles.activeTab : ""} onClick={() => setView("delivered")}>Entregues <span>{deliveredOrders.length}</span></button><button type="button" className={view === "inactive" ? styles.activeTab : ""} onClick={() => setView("inactive")}>Cancelados/Excluídos <span>{inactiveOrders.length}</span></button></nav>
    {error && <p className={styles.pageError}>{error}<button type="button" onClick={() => setError("")}>×</button></p>}
    {view === "kanban" ? <section className={styles.board} aria-label="Kanban de encomendas">
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
            {order.items?.length ? <span className={styles.cardProgress}><i style={{ width: `${(order.items.filter((item) => item.completed).length / order.items.length) * 100}%` }} /><span>{order.items.filter((item) => item.completed).length}/{order.items.length} produtos finalizados</span></span> : null}
            <span className={styles.cardMeta}><span>Entrega <b>{date(order.deliveryAt)}</b></span><span><b>{money.format(order.salePrice)}</b></span></span>
            <span className={`${styles.margin} ${order.profit < 0 ? styles.negative : ""}`}>Lucro {money.format(order.profit)}</span>
          </button>)}
          {!columns[status].length && <div className={styles.dropHint}>Arraste uma encomenda para cá</div>}
        </div>
      </article>)}
    </section> : <section className={styles.archivePanel}><header><div><h2>{view === "delivered" ? "Encomendas entregues" : "Encomendas canceladas ou excluídas"}</h2><p>{view === "delivered" ? "Pedidos que permaneceram por 24 horas na coluna Entregue." : "Histórico preservado para consulta e controle."}</p></div></header>{(view === "delivered" ? deliveredOrders : inactiveOrders).length ? <div className={styles.orderList}>{(view === "delivered" ? deliveredOrders : inactiveOrders).map((order) => <button type="button" className={styles.orderListRow} onClick={() => { setError(""); setSelected(order); }} key={order.id}><span><strong>{order.customerName}</strong><small>{order.items?.map((item) => `${item.quantity}× ${item.name}`).join(", ") || order.description}</small></span><span><small>{view === "delivered" ? "Entregue em" : recordState(order) === "cancelled" ? "Cancelada em" : "Excluída em"}</small><b>{new Date(view === "delivered" ? (order.deliveredAt ?? `${order.deliveryAt}T12:00:00`) : recordState(order) === "cancelled" ? (order.cancelledAt ?? order.updatedAt) : (order.deletedAt ?? order.updatedAt)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</b></span><span><small>Valor</small><b>{money.format(order.salePrice)}</b></span><span className={`${styles.recordBadge} ${view === "delivered" ? styles.deliveredRecord : recordState(order) === "cancelled" ? styles.cancelledRecord : styles.deletedRecord}`}>{view === "delivered" ? "Entregue" : recordState(order) === "cancelled" ? "Cancelada" : "Excluída"}</span><i>Ver detalhes →</i></button>)}</div> : <div className={styles.archiveEmpty}><span>{view === "delivered" ? "✓" : "⊘"}</span><h3>Nenhuma encomenda nesta lista</h3><p>{view === "delivered" ? "Os pedidos aparecem aqui 24 horas após entrarem em Entregue." : "Encomendas canceladas ou excluídas aparecerão aqui."}</p></div>}</section>}

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
      <div className={styles.detailBody}>{error && <p className={styles.formError}>{error}</p>}{recordState(selected) === "active" ? <div className={styles.statusControl}><label htmlFor="detail-status">Status atual</label><select id="detail-status" value={selected.status} disabled={saving} onChange={(event) => void changeStatus(event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option value={status} key={status}>{orderStatusLabels[status]}</option>)}</select></div> : <div className={`${styles.inactiveNotice} ${recordState(selected) === "deleted" ? styles.deletedNotice : ""}`}><strong>{recordState(selected) === "cancelled" ? "Encomenda cancelada" : "Encomenda excluída"}</strong><span>Este registro foi mantido somente para consulta.</span></div>}
      {selected.items?.length ? <div className={styles.orderItems}><div className={styles.orderItemsTitle}><h3>Produtos</h3><span>{selected.items.filter((item) => item.completed).length} de {selected.items.length} finalizados</span></div>{selected.items.map((item) => <label className={`${styles.detailItem} ${item.completed ? styles.itemCompleted : ""}`} key={item.id}><input className={styles.itemCheck} type="checkbox" checked={Boolean(item.completed)} disabled={recordState(selected) !== "active" || updatingItemId === item.id} onChange={(event) => void changeItemState(item.id, event.target.checked)} /><span><strong>{item.name}</strong><small>{item.quantity.toLocaleString("pt-BR")} unidade(s)</small></span><span><small>Custo do lote</small><b>{money.format(item.cost)}</b></span><span><small>Valor cobrado pelo lote</small><b>{money.format(item.salePrice)}</b></span></label>)}</div> : null}
      {selected.description && <p className={styles.description}>{selected.description}</p>}
      <dl className={styles.details}><div><dt>Telefone</dt><dd>{selected.phone ? phoneMask(selected.phone) : "Não informado"}</dd></div><div><dt>Fechamento</dt><dd>{date(selected.closedAt)}</dd></div><div><dt>Entrega</dt><dd>{date(selected.deliveryAt)}</dd></div></dl>
      <div className={styles.financials}><div><span>Custo</span><strong>{money.format(selected.cost)}</strong></div><div><span>Valor cobrado</span><strong>{money.format(selected.salePrice)}</strong></div><div className={selected.profit < 0 ? styles.loss : ""}><span>Lucro</span><strong>{money.format(selected.profit)}</strong></div></div>
      </div><footer>{recordState(selected) === "active" && <div className={styles.destructiveActions}><button className={styles.cancelButton} type="button" disabled={saving} onClick={() => void changeRecordState("cancelled")}>Cancelar encomenda</button><button className={styles.deleteOrderButton} type="button" disabled={saving} onClick={() => void changeRecordState("deleted")}>Excluir encomenda</button></div>}<button className={adminStyles.primary} type="button" onClick={() => setSelected(null)}>Fechar</button></footer>
    </section></div>}
  </main>;
}
