"use client";

import Link from "next/link";
import { useState } from "react";
import { FlowHeader, MissingProject } from "@/components/PrintFlow";
import { usePrintProject } from "@/components/PrintProjectProvider";
import { createAdjusted3mf, getSettingDetails } from "@/lib/three-mf";
import styles from "../configurator.module.css";

export default function ChangesPage() {
  const { file, project, suggestion } = usePrintProject();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(suggestion?.alteracoes.map((_, index) => index) ?? []),
  );
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [downloadedCount, setDownloadedCount] = useState<number | null>(null);

  const toggle = (index: number) => {
    setDownloadedCount(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const download = async () => {
    if (!file || !project || !suggestion || selected.size === 0) return;
    setDownloading(true);
    setError("");
    setDownloadedCount(null);
    try {
      const changes = suggestion.alteracoes.filter((_, index) => selected.has(index));
      const blob = await createAdjusted3mf(file, project, changes);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = project.fileName.replace(/\.3mf$/i, "-ajustado.3mf");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadedCount(changes.length);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o novo arquivo.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <FlowHeader active={4} title="Revise as alterações" description="Escolha o que será aplicado. O arquivo original permanece intacto." />
        {!project || !file ? <MissingProject /> : !suggestion ? (
          <div className={styles.missing}>
            <span>JSON</span><h2>Nenhuma resposta validada</h2>
            <p>Cole e confira a resposta da IA antes de revisar as mudanças.</p>
            <Link href="/configuracao/resposta" className={styles.primaryButton}>Colar resposta</Link>
          </div>
        ) : (
          <section className={styles.contentCard}>
            <h2>{suggestion.alteracoes.length} alteração(ões) sugerida(s)</h2>
            <p>Compare o valor atual com o novo valor. Desmarque qualquer ajuste que não queira aplicar.</p>
            <div className={styles.suggestionSummary}><strong>Resumo da IA</strong>{suggestion.resumo}</div>
            <div className={styles.reviewToolbar}>
              <span>{selected.size} de {suggestion.alteracoes.length} selecionada(s)</span>
              <button type="button" onClick={() => {
                setDownloadedCount(null);
                setSelected(selected.size === suggestion.alteracoes.length ? new Set() : new Set(suggestion.alteracoes.map((_, index) => index)));
              }}>
                {selected.size === suggestion.alteracoes.length ? "Desmarcar todas" : "Selecionar todas"}
              </button>
            </div>
            <div className={styles.changeList}>
              {suggestion.alteracoes.map((change, index) => (
                <label className={styles.changeCard} key={change.chave}>
                  <input type="checkbox" checked={selected.has(index)} onChange={() => toggle(index)} />
                  <div className={styles.changeBody}>
                    <div className={styles.changeHead}>
                      <div className={styles.settingIdentity}>
                        <strong>{getSettingDetails(change.chave).label}</strong>
                        <code>{change.chave}</code>
                        <small>Aba: {getSettingDetails(change.chave).tab}</small>
                      </div>
                      <span><i className={styles.oldValue}>{project.settings[change.chave]}</i><b>→</b><i className={styles.newValue}>{change.valor}</i></span>
                    </div>
                    <p>{change.motivo}</p>
                  </div>
                </label>
              ))}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {downloadedCount !== null && <p className={styles.downloadSuccess} role="status">✓ 3MF gerado e conferido: todas as {downloadedCount} alterações foram gravadas. Ao abrir no fatiador, refaça o fatiamento.</p>}
            <div className={styles.contentActions}>
              <Link href="/configuracao/resposta" className={styles.secondaryButton}>← Editar resposta</Link>
              <button type="button" className={styles.primaryButton} disabled={downloading || selected.size === 0} onClick={() => void download()}>
                {downloading ? "Gerando arquivo…" : `Baixar 3MF ajustado (${selected.size})`}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
