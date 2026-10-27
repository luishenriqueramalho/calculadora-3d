"use client";

import { FormEvent, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import styles from "../admin.module.css";
import management from "../management.module.css";

export default function TeamPage() {
  const { users, addUser } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await addUser({ name: String(data.get("name")), email: String(data.get("email")) });
      form.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar."); }
    finally { setLoading(false); }
  };
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Empresa</span><h1>Equipe</h1><p>Cadastre pessoas para compartilhar todos os dados e recursos da empresa.</p></div></header>
    <section className={management.layout}>
      <article className={styles.card}><form className={management.form} onSubmit={submit}><h2>Novo usuário</h2><p>O acesso será vinculado automaticamente à sua empresa.</p>{error && <p className={management.message}>{error}</p>}<div className={management.fields}><label className={management.field}><span>Nome completo</span><input name="name" required minLength={3} placeholder="Nome do colaborador" /></label><label className={management.field}><span>E-mail</span><input name="email" type="email" required placeholder="colaborador@empresa.com" /></label></div><button className={styles.primary} disabled={loading}>{loading ? "Cadastrando..." : "＋ Cadastrar usuário"}</button><p className={management.notice}>O usuário será criado sem senha. No primeiro acesso, ao informar este e-mail, ele poderá criar a própria senha.</p></form></article>
      <article className={styles.card}><div className={styles.cardHeader}><div><h2>Usuários da empresa</h2><p>{users.length} pessoa(s) com acesso</p></div></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Acesso</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><span className={management.identity}><i className={management.identityAvatar}>{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</i><strong>{user.name}</strong></span></td><td>{user.email}</td><td>{user.role === "owner" ? "Titular" : "Membro"}</td><td><span className={`${management.badge} ${!user.hasPassword ? management.pending : ""}`}>{user.hasPassword ? "Ativo" : "Aguardando senha"}</span></td></tr>)}</tbody></table></div></article>
    </section>
  </main>;
}
