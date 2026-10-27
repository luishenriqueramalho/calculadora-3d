"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import type { CustomerOrder } from "@/lib/business-types";
import admin from "../admin.module.css";
import styles from "./finance.module.css";

type Period = "all" | "7d" | "month" | "date";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const orderDate = (order: CustomerOrder) => {
  if (order.status === "delivered") return (order.deliveredAt ?? order.completedAt ?? order.deliveryAt ?? order.updatedAt).slice(0, 10);
  return (order.completedAt ?? order.deliveryAt ?? order.updatedAt).slice(0, 10);
};

export default function BillingPage() {
  const { orders, purchases, filaments } = useBusiness();
  const [period, setPeriod] = useState<Period>("all");
  const [specificDate, setSpecificDate] = useState(isoDate(new Date()));
  const today = isoDate(new Date());
  const sevenDaysAgo = (() => { const value = new Date(); value.setDate(value.getDate() - 6); return isoDate(value); })();
  const currentMonth = today.slice(0, 7);
  const includesDate = (value: string) => {
    const date = value.slice(0, 10);
    if (period === "7d") return date >= sevenDaysAgo && date <= today;
    if (period === "month") return date.startsWith(currentMonth);
    if (period === "date") return date === specificDate;
    return date <= today;
  };
  const values = useMemo(() => {
    const filteredPurchases = purchases.filter((purchase) => includesDate(purchase.purchasedAt));
    const finalOrders = orders.filter((order) => (!order.recordState || order.recordState === "active") && (order.status === "completed" || order.status === "delivered") && includesDate(orderDate(order)));
    const filamentExpenses = filaments.filter((filament) => includesDate(filament.createdAt)).reduce((sum, filament) => sum + filament.price, 0);
    const purchaseExpenses = filteredPurchases.filter((purchase) => purchase.source !== "filament" && !purchase.filamentId).reduce((sum, purchase) => sum + purchase.total, 0);
    const revenue = finalOrders.reduce((sum, order) => sum + order.salePrice, 0);
    const productionCost = finalOrders.reduce((sum, order) => sum + order.cost, 0);
    const profit = revenue - productionCost;
    return { filamentExpenses, purchaseExpenses, generalExpenses: filamentExpenses + purchaseExpenses + productionCost, revenue, productionCost, profit, orderCount: finalOrders.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, filaments, orders, period, purchases, sevenDaysAgo, specificDate, today]);
  const comparison = [
    { label: "Faturamento", value: values.revenue, color: "#2682df" },
    { label: "Custos de produção", value: values.productionCost, color: "#f59e0b" },
    { label: "Filamentos", value: values.filamentExpenses, color: "#8b5cf6" },
    { label: "Outras compras", value: values.purchaseExpenses, color: "#64748b" },
    { label: "Lucro", value: values.profit, color: values.profit >= 0 ? "#10a779" : "#d04d43" },
  ];
  const chartMax = Math.max(...comparison.map((item) => Math.abs(item.value)), 1);
  const totalExpenses = values.generalExpenses || 1;
  const filamentAngle = (values.filamentExpenses / totalExpenses) * 360;
  const purchaseAngle = filamentAngle + (values.purchaseExpenses / totalExpenses) * 360;
  const periodLabel = period === "7d" ? "Últimos 7 dias" : period === "month" ? "Mês atual" : period === "date" ? (specificDate ? new Date(`${specificDate}T12:00:00`).toLocaleDateString("pt-BR") : "Selecione uma data") : "Até o momento";

  return <main className={admin.page}>
    <header className={admin.pageHeader}><div><span className={admin.eyebrow}>Financeiro</span><h1>Faturamentos</h1><p>Receitas, custos e despesas consolidados da empresa. O faturamento considera apenas encomendas concluídas ou entregues.</p></div></header>
    <section className={styles.filters} aria-label="Filtrar período"><span>Período</span><div className={styles.filterButtons}>{([ ["all", "Até o momento"], ["7d", "7 dias"], ["month", "Mês atual"], ["date", "Data específica"] ] as Array<[Period, string]>).map(([value, label]) => <button type="button" className={period === value ? styles.active : ""} onClick={() => setPeriod(value)} key={value}>{label}</button>)}</div>{period === "date" && <input type="date" aria-label="Data específica" value={specificDate} max={today} onChange={(event) => setSpecificDate(event.target.value)} />}<strong>{periodLabel}</strong></section>
    <section className={styles.metrics} aria-label="Indicadores financeiros">
      <article className={`${styles.metric} ${styles.purple}`}><span>◉</span><div><small>Gastos com filamentos</small><strong>{money.format(values.filamentExpenses)}</strong></div></article>
      <article className={`${styles.metric} ${styles.slate}`}><span>▤</span><div><small>Gastos com compras</small><strong>{money.format(values.purchaseExpenses)}</strong></div></article>
      <article className={`${styles.metric} ${styles.red}`}><span>−</span><div><small>Gasto geral</small><strong>{money.format(values.generalExpenses)}</strong></div></article>
      <article className={`${styles.metric} ${styles.blue}`}><span>↗</span><div><small>Faturamento total</small><strong>{money.format(values.revenue)}</strong><em>{values.orderCount} venda(s) finalizada(s)</em></div></article>
      <article className={`${styles.metric} ${styles.amber}`}><span>▦</span><div><small>Custos para produção</small><strong>{money.format(values.productionCost)}</strong></div></article>
      <article className={`${styles.metric} ${values.profit >= 0 ? styles.green : styles.red}`}><span>＋</span><div><small>Lucro das encomendas</small><strong>{money.format(values.profit)}</strong></div></article>
    </section>
    <section className={styles.charts}>
      <article className={admin.card}><div className={admin.cardHeader}><div><h2>Comparativo financeiro</h2><p>Receitas, custos e resultado no período</p></div></div><div className={styles.barChart}>{comparison.map((item) => <div className={styles.barRow} key={item.label}><span>{item.label}</span><div className={styles.barTrack}><i style={{ width: `${Math.max((Math.abs(item.value) / chartMax) * 100, item.value ? 2 : 0)}%`, background: item.color }} /></div><strong>{money.format(item.value)}</strong></div>)}</div></article>
      <article className={admin.card}><div className={admin.cardHeader}><div><h2>Composição dos gastos</h2><p>Participação de cada tipo no gasto geral</p></div></div><div className={styles.donutWrap}><div className={styles.donut} style={{ "--filament-angle": `${filamentAngle}deg`, "--purchase-angle": `${purchaseAngle}deg`, ...(values.generalExpenses ? {} : { background: "#edf1f5" }) } as CSSProperties}><span><strong>{money.format(values.generalExpenses)}</strong><small>gasto geral</small></span></div><div className={styles.legend}><span><i className={styles.legendPurple} />Filamentos <strong>{money.format(values.filamentExpenses)}</strong></span><span><i className={styles.legendSlate} />Compras <strong>{money.format(values.purchaseExpenses)}</strong></span><span><i className={styles.legendAmber} />Produção <strong>{money.format(values.productionCost)}</strong></span></div></div></article>
    </section>
    <p className={styles.note}>Gasto geral = filamentos + outras compras + custos das encomendas finalizadas. Lucro das encomendas = faturamento − custos de produção.</p>
  </main>;
}
