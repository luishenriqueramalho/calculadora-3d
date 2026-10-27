"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "../auth.module.css";

type Step = "email" | "password" | "setup";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const continueWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/account-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível continuar.");
      setStep(result.setupRequired ? "setup" : "password");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível continuar."); }
    finally { setLoading(false); }
  };
  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    try {
      if (step === "setup" && password !== String(data.get("confirmPassword"))) throw new Error("As senhas não coincidem.");
      const endpoint = step === "setup" ? "/api/auth/setup-password" : "/api/auth/login";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível entrar.");
      router.push("/painel");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível entrar."); setLoading(false); }
  };
  const restart = () => { setStep("email"); setError(""); };
  return <main className={styles.page}>
    <section className={styles.formSide}><Link href="/" className={styles.brand}><span className={styles.brandMark}>◇</span><span><strong>PrintLab 3D</strong><small>Gestão para makers</small></span></Link><div className={styles.formWrap}><h1>{step === "setup" ? "Crie sua senha" : "Bem-vindo de volta"}</h1><p>{step === "email" ? <>Informe seu e-mail para continuar. Ainda não tem conta? <Link href="/cadastro">Cadastre-se gratuitamente</Link>.</> : step === "setup" ? "Seu usuário já foi cadastrado pela empresa. Defina uma senha para ativar o acesso." : <>Acessando como <strong>{email}</strong>. <button type="button" onClick={restart}>Trocar e-mail</button></>}</p>
      {step === "email" ? <form className={styles.form} onSubmit={continueWithEmail}>{error && <p className={styles.error}>{error}</p>}<label className={styles.field}><span>E-mail</span><input name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@sualoja.com.br" autoFocus /></label><button className={styles.submit} disabled={loading}>{loading ? "Verificando..." : "Continuar →"}</button></form> : <form className={styles.form} onSubmit={authenticate}>{error && <p className={styles.error}>{error}</p>}<label className={styles.field}><span>{step === "setup" ? "Crie uma senha" : "Senha"}</span><input name="password" type="password" autoComplete={step === "setup" ? "new-password" : "current-password"} required minLength={step === "setup" ? 8 : undefined} placeholder={step === "setup" ? "Mínimo de 8 caracteres" : "Sua senha"} autoFocus /></label>{step === "setup" && <label className={styles.field}><span>Confirme a senha</span><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} placeholder="Digite a senha novamente" /></label>}<div className={styles.remember}><button type="button" onClick={restart}>← Usar outro e-mail</button><span>🔒 Sessão protegida por 7 dias</span></div><button className={styles.submit} disabled={loading}>{loading ? (step === "setup" ? "Criando senha..." : "Entrando...") : (step === "setup" ? "Criar senha e acessar →" : "Entrar no painel →")}</button></form>}
    </div><Link href="/" className={styles.back}>← Voltar para o início</Link></section>
    <aside className={styles.visual}><div className={styles.visualContent}><span>Seu negócio, sob controle</span><h2>Mais tempo imprimindo. Menos tempo administrando.</h2><p>Uma visão clara dos custos, projetos, produtos e canais de venda da sua empresa de impressão 3D.</p><div className={styles.benefits}><div><i>▦</i><span><strong>Precificação inteligente</strong><small>Custos e margens calculados em segundos.</small></span></div><div><i>◇</i><span><strong>Catálogo centralizado</strong><small>Cadastre uma vez e publique em todos os canais.</small></span></div><div><i>↗</i><span><strong>Operação consolidada</strong><small>Suas lojas reunidas em um único painel.</small></span></div></div></div></aside>
  </main>;
}
