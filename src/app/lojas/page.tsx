"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import type { MarketplaceKey } from "@/lib/business-types";
import styles from "../admin.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function StoresPage() {
  const { connections, connectStore, syncStore, storageMode } = useBusiness();
  const [loading, setLoading] = useState<MarketplaceKey | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("integration") === "success"
      ? "Loja conectada e primeira sincronização concluída."
      : params.get("integration") === "error" ? params.get("message") ?? "Não foi possível concluir a conexão." : "";
    if (message) window.setTimeout(() => setNotice(message), 0);
  }, []);
  const run = async (id: MarketplaceKey, action: "connect" | "sync") => {
    setLoading(id); setNotice("");
    try {
      if (action === "connect") await connectStore(id); else { await syncStore(id); setNotice("Dados da loja atualizados com sucesso."); }
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Não foi possível concluir a operação."); }
    setLoading(null);
  };
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Integrações</span><h1>Canais de venda</h1><p>Conecte e acompanhe Mercado Livre, Shopee e TikTok Shop sem precisar alternar entre plataformas.</p></div></header>
    {notice && <div className={styles.integrationInfo}>{notice}</div>}
    <section className={styles.storeGrid}>{connections.map((store) => <article className={styles.storeCard} key={store.id}>
      <div className={styles.storeTop}><div className={styles.storeIdentity}><span className={`${styles.marketLogo} ${styles[store.id]}`}>{store.shortName}</span><span><strong>{store.name}</strong><small>{store.account ?? "Ainda não conectada"}</small></span></div><span className={`${styles.status} ${styles[store.status]}`}>{store.status === "connected" ? "Conectada" : "Offline"}</span></div>
      <div className={styles.storeStats}><span><small>Pedidos recentes</small><strong>{store.orders}</strong></span><span><small>Produtos ativos</small><strong>{store.products}</strong></span><span><small>Receita recente</small><strong>{money.format(store.revenue)}</strong></span></div>
      {store.lastSync && <small>Última sincronização: {dateTime.format(new Date(store.lastSync))}</small>}
      <button type="button" disabled={loading === store.id} onClick={() => void run(store.id, store.status === "connected" ? "sync" : "connect")}>{loading === store.id ? "Aguarde..." : store.status === "connected" ? "Sincronizar agora" : `Conectar ${store.name}`}</button>
    </article>)}</section>
    <div className={styles.integrationInfo}><strong>Integração segura:</strong> {storageMode === "offline" ? "O banco está indisponível neste momento. " : "Tokens OAuth são criptografados no MongoDB e renovados automaticamente. "}A sincronização consulta a conta, produtos e pedidos disponíveis pelas permissões concedidas em cada canal.</div>
  </main>;
}
