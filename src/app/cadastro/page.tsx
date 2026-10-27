"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import styles from "../auth.module.css";

const phoneMask = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
const cpfMask = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), phone, cpf, storeName: data.get("storeName"), password: data.get("password") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível criar a conta.");
      router.push("/painel");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível criar a conta."); setLoading(false); }
  };
  return <main className={styles.page}>
    <section className={styles.formSide}><Link href="/" className={styles.brand}><span className={styles.brandMark}>◇</span><span><strong>PrintLab 3D</strong><small>Gestão para makers</small></span></Link><div className={styles.formWrap}><h1>Crie sua conta</h1><p>Comece a organizar sua empresa de impressão 3D. Já tem uma conta? <Link href="/login">Entre aqui</Link>.</p><form className={styles.form} onSubmit={submit}>{error && <p className={styles.error}>{error}</p>}<div className={styles.grid}><label className={styles.field}><span>Nome completo</span><input name="name" autoComplete="name" required minLength={3} placeholder="Seu nome" /></label><label className={styles.field}><span>Nome da loja</span><input name="storeName" required minLength={2} placeholder="Ex.: Studio 3D" /></label><label className={`${styles.field} ${styles.wide}`}><span>E-mail</span><input name="email" type="email" autoComplete="email" required placeholder="voce@sualoja.com.br" /></label><label className={styles.field}><span>Telefone</span><input name="phone" inputMode="tel" autoComplete="tel" required value={phone} onChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(phoneMask(event.target.value))} placeholder="(85) 99999-9999" /></label><label className={styles.field}><span>CPF</span><input name="cpf" inputMode="numeric" required value={cpf} onChange={(event: ChangeEvent<HTMLInputElement>) => setCpf(cpfMask(event.target.value))} placeholder="000.000.000-00" /></label><label className={`${styles.field} ${styles.wide}`}><span>Senha</span><input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Crie uma senha segura" /><small className={styles.passwordHint}>Use pelo menos 8 caracteres, incluindo uma letra e um número.</small></label></div><p className={styles.privacy}>Ao criar sua conta, você concorda com os termos de uso e com o tratamento dos dados necessários para prestação do serviço. Seu CPF é armazenado de forma criptografada.</p><button className={styles.submit} disabled={loading}>{loading ? "Criando sua conta..." : "Criar conta e acessar →"}</button></form></div><Link href="/" className={styles.back}>← Voltar para o início</Link></section>
    <aside className={styles.visual}><div className={styles.visualContent}><span>Comece com uma base sólida</span><h2>Sua empresa 3D pronta para o próximo nível.</h2><p>Centralize o trabalho diário e tome decisões com custos, margens e resultados sempre à vista.</p><div className={styles.benefits}><div><i>✓</i><span><strong>Projetos sempre organizados</strong><small>Salve cálculos e consulte seu histórico.</small></span></div><div><i>✓</i><span><strong>Venda em vários canais</strong><small>Mercado Livre, Shopee e TikTok Shop.</small></span></div><div><i>✓</i><span><strong>Dados separados por empresa</strong><small>Cada conta acessa apenas a própria operação.</small></span></div></div></div></aside>
  </main>;
}
