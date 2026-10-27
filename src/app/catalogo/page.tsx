"use client";

import Link from "next/link";
import { useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import type { MarketplaceKey } from "@/lib/business-types";
import styles from "../admin.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const channels: MarketplaceKey[] = ["mercadoLivre", "shopee", "tiktok"];
const labels: Record<MarketplaceKey, string> = { mercadoLivre: "ML", shopee: "S", tiktok: "TT" };

export default function CatalogPage() {
  const { products, connections, publishProduct } = useBusiness();
  const [publishing, setPublishing] = useState<string | null>(null);
  const connectedChannels = connections.filter((store) => store.status === "connected").map((store) => store.id);
  const publish = async (id: string) => {
    if (!connectedChannels.length) return;
    setPublishing(id);
    await publishProduct(id, connectedChannels);
    setPublishing(null);
  };
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Produtos</span><h1>Catálogo</h1><p>Cadastre uma vez e distribua seus produtos para todos os canais conectados.</p></div><div className={styles.headerActions}><Link href="/catalogo/novo" className={styles.primary}>＋ Novo produto</Link></div></header>
    {products.length ? <section className={styles.catalogGrid}>{products.map((product) => <article className={styles.productCard} key={product.id}>
      <div className={styles.productVisual}>◇</div>
      <div className={styles.productHead}><span className={styles.productName}><strong>{product.name}</strong><small>SKU {product.sku} · {product.stock} em estoque</small></span><span className={styles.productPrice}>{money.format(product.price)}</span></div>
      <div className={styles.channelDots} aria-label="Canais publicados">{channels.map((channel) => <span key={channel} title={channel} className={`${styles.channelDot} ${styles[channel]} ${product.channels[channel] === "published" ? styles.live : ""}`}>{labels[channel]}</span>)}</div>
      <div className={styles.productActions}><button type="button" disabled={publishing === product.id || !connectedChannels.length} onClick={() => void publish(product.id)}>{publishing === product.id ? "Publicando..." : connectedChannels.length ? "Publicar em 1 clique" : "Conecte uma loja"}</button><button type="button">Editar</button></div>
    </article>)}</section> : <article className={styles.card}><div className={styles.empty}><span>◇</span><h3>Nenhum produto no catálogo</h3><p>Cadastre seu primeiro produto e publique no Mercado Livre, Shopee e TikTok Shop em um único fluxo.</p><Link href="/catalogo/novo" className={styles.primary}>Cadastrar produto</Link></div></article>}
  </main>;
}
