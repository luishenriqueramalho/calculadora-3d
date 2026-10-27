"use client";

import { FormEvent, useState, type CSSProperties } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import styles from "../admin.module.css";
import management from "../management.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const swatchColor = (value: string) => `hsl(${[...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360} 58% 54%)`;

export default function FilamentsPage() {
  const { filaments, addFilament, deleteFilament } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await addFilament({ color: String(data.get("color")), brand: String(data.get("brand")), price: Number(data.get("price")) });
      form.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar."); }
    finally { setLoading(false); }
  };
  const removeFilament = async (id: string) => {
    if (!window.confirm("Excluir este filamento e a compra vinculada a ele?")) return;
    setDeletingId(id); setError("");
    try { await deleteFilament(id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível excluir o filamento."); }
    finally { setDeletingId(null); }
  };
  return <main className={styles.page}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Materiais</span><h1>Filamentos</h1><p>Mantenha as cores, marcas e preços dos rolos disponíveis na empresa. Cada novo rolo também é lançado automaticamente em Compras.</p></div></header>
    <section className={management.layout}>
      <article className={styles.card}><form className={management.form} onSubmit={submit}><h2>Cadastrar filamento</h2><p>Informe os dados comerciais do material.</p>{error && <p className={management.message}>{error}</p>}<div className={management.fields}><label className={management.field}><span>Cor</span><input name="color" required placeholder="Ex.: Azul petróleo" /></label><label className={management.field}><span>Marca</span><input name="brand" required placeholder="Ex.: 3D Fila" /></label><label className={management.field}><span>Preço do rolo</span><input name="price" type="number" min="0" step="0.01" required placeholder="0,00" /></label></div><p className={management.notice}>Ao salvar, será criada uma compra de 1 rolo na categoria “Insumos”, usando o preço informado.</p><button className={styles.primary} disabled={loading}>{loading ? "Salvando..." : "＋ Cadastrar filamento"}</button></form></article>
      <article className={styles.card}><div className={styles.cardHeader}><div><h2>Filamentos cadastrados</h2><p>{filaments.length} material(is) disponível(is)</p></div></div>{filaments.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Cor</th><th>Marca</th><th>Preço</th><th>Cadastrado em</th><th>Ações</th></tr></thead><tbody>{filaments.map((filament) => <tr key={filament.id}><td><span className={management.identity}><i className={management.swatch} style={{ "--swatch": swatchColor(filament.color) } as CSSProperties} /><strong>{filament.color}</strong></span></td><td>{filament.brand}</td><td><strong>{money.format(filament.price)}</strong></td><td>{new Date(filament.createdAt).toLocaleDateString("pt-BR")}</td><td><button className={management.deleteButton} type="button" disabled={deletingId === filament.id} onClick={() => void removeFilament(filament.id)}>{deletingId === filament.id ? "Excluindo..." : "Excluir"}</button></td></tr>)}</tbody></table></div> : <div className={styles.empty}><span>◉</span><h3>Nenhum filamento cadastrado</h3><p>Cadastre o primeiro material usando o formulário ao lado.</p></div>}</article>
    </section>
  </main>;
}
