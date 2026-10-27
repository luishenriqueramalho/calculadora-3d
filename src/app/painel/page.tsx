"use client";

import Link from "next/link";
import { useBusiness } from "@/components/BusinessProvider";
import { orderStatusLabels, type MarketplaceKey } from "@/lib/business-types";
import styles from "../admin.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardPage() {
  const { orders, connections, storageMode } = useBusiness();
  const activeOrders = orders.filter((order) => !order.recordState || order.recordState === "active");
  const totalCost = activeOrders.reduce((sum, order) => sum + order.cost, 0);
  const totalSales = activeOrders.reduce((sum, order) => sum + order.salePrice, 0);
  const totalProfit = activeOrders.reduce((sum, order) => sum + order.profit, 0);
  const connected = connections.filter((store) => store.status === "connected").length;
  const classFor = (id: MarketplaceKey) => styles[id];
  const count = (status: "production" | "completed" | "delivered") => activeOrders.filter((order) => order.status === status).length;
  const recent = [...activeOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Painel administrativo</span><h1>Sua produção em um só lugar</h1><p>Acompanhe encomendas, prazos e o resultado financeiro da empresa.</p></div><div className={styles.headerActions}><Link href="/calculadora" className={styles.secondary}>▦ Calcular custo</Link><Link href="/projetos" className={styles.primary}>＋ Nova encomenda</Link></div></header>
    <p className={styles.storageNote}><strong>Armazenamento:</strong> {storageMode === "mongodb" ? "MongoDB conectado e sincronizando." : "não foi possível sincronizar com o banco agora."}</p>
    <section className={`${styles.metrics} ${styles.metricsSix}`} aria-label="Indicadores de produção e finanças">
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.productionIcon}`}>▶</span><span className={styles.metricTrend}>Produção</span></div><strong>{count("production")}</strong><small>encomendas em produção</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.completedIcon}`}>✓</span><span className={styles.metricTrend}>Concluídos</span></div><strong>{count("completed")}</strong><small>aguardando entrega</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.deliveredIcon}`}>⌂</span><span className={styles.metricTrend}>Entregues</span></div><strong>{count("delivered")}</strong><small>pedidos finalizados</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.costIcon}`}>−</span><span className={styles.metricTrend}>Custos</span></div><strong>{money.format(totalCost)}</strong><small>custos das encomendas</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={styles.metricIcon}>↗</span><span className={styles.metricTrend}>Vendas</span></div><strong>{money.format(totalSales)}</strong><small>preços de venda somados</small></article>
      <article className={styles.metric}><div className={styles.metricTop}><span className={`${styles.metricIcon} ${styles.profitIcon}`}>＋</span><span className={styles.metricTrend}>Lucro</span></div><strong>{money.format(totalProfit)}</strong><small>resultado previsto</small></article>
    </section>
    <section className={styles.dashboardGrid}>
      <article className={styles.card}><div className={styles.cardHeader}><div><h2>Encomendas recentes</h2><p>Últimas movimentações da produção</p></div><Link href="/projetos">Abrir Kanban →</Link></div>{recent.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Cliente</th><th>Entrega</th><th>Status</th><th>Venda</th><th>Lucro</th></tr></thead><tbody>{recent.map((order) => <tr key={order.id}><td><strong>{order.customerName}</strong></td><td>{new Date(`${order.deliveryAt}T12:00:00`).toLocaleDateString("pt-BR")}</td><td><span className={`${styles.status} ${styles.orderStatus}`}>{orderStatusLabels[order.status]}</span></td><td>{money.format(order.salePrice)}</td><td><strong>{money.format(order.profit)}</strong></td></tr>)}</tbody></table></div> : <div className={styles.empty}><span>▣</span><h3>Nenhuma encomenda cadastrada</h3><p>Cadastre seu primeiro orçamento ou pedido para acompanhar a produção.</p><Link className={styles.primary} href="/projetos">Abrir Kanban</Link></div>}</article>
      <article className={styles.card}><div className={styles.cardHeader}><div><h2>Acesso rápido</h2><p>Atalhos para sua rotina</p></div></div><div className={styles.quickActions}><Link href="/projetos"><span>▣</span><strong>Gerenciar encomendas</strong></Link><Link href="/calculadora"><span>▦</span><strong>Calcular novo projeto</strong></Link><Link href="/filamentos"><span>◉</span><strong>Cadastrar filamento</strong></Link><Link href="/equipe"><span>♙</span><strong>Gerenciar equipe</strong></Link></div></article>
    </section>
    <article className={`${styles.card} ${styles.recent}`}><div className={styles.cardHeader}><div><h2>Canais de venda</h2><p>{connected} de 3 canais conectados</p></div><Link href="/lojas">Gerenciar canais →</Link></div><div className={styles.channelList}>{connections.map((store) => <div className={styles.channelRow} key={store.id}><span className={`${styles.marketLogo} ${classFor(store.id)}`}>{store.shortName}</span><span className={styles.channelName}><strong>{store.name}</strong><small>{store.account ?? "Nenhuma conta conectada"}</small></span><span className={styles.channelStat}><small>Pedidos</small><strong>{store.orders}</strong></span><span className={styles.channelStat}><small>Produtos</small><strong>{store.products}</strong></span><span className={styles.channelStat}><small>Receita</small><strong>{money.format(store.revenue)}</strong></span><span className={`${styles.status} ${styles[store.status]}`}>{store.status === "connected" ? "Conectada" : store.status === "attention" ? "Atenção" : "Desconectada"}</span></div>)}</div></article>
  </main>;
}
