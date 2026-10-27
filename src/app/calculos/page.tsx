"use client";

import Link from "next/link";
import { useBusiness } from "@/components/BusinessProvider";
import styles from "../admin.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function SavedCalculationsPage() {
  const { projects } = useBusiness();
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Precificação</span><h1>Cálculos salvos</h1><p>Histórico dos projetos calculados pela sua equipe.</p></div><div className={styles.headerActions}><Link href="/calculadora" className={styles.primary}>＋ Novo cálculo</Link></div></header>
    <article className={styles.card}><div className={styles.cardHeader}><div><h2>Projetos precificados</h2><p>{projects.length} registro(s) na base da empresa</p></div></div>{projects.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Nome</th><th>Criado em</th><th>Material</th><th>Custo total</th><th>Lucro</th><th>Preço sugerido</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><br/><small>{project.filaments.map((item) => item.material).join(", ")}</small></td><td>{new Date(project.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td><td>{money.format(project.result.material)}</td><td>{money.format(project.result.total)}</td><td>{money.format(project.result.profit)}</td><td><strong>{money.format(project.result.price)}</strong></td></tr>)}</tbody></table></div> : <div className={styles.empty}><span>▦</span><h3>Nenhum cálculo salvo ainda</h3><p>Use a calculadora para precificar sua primeira impressão.</p><Link className={styles.primary} href="/calculadora">Abrir calculadora</Link></div>}</article>
  </main>;
}
