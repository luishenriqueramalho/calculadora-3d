"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FlowHeader, MissingProject, SelectionSummary } from "@/components/PrintFlow";
import { usePrintProject } from "@/components/PrintProjectProvider";
import { buildAiPrompt } from "@/lib/three-mf";
import styles from "../configurator.module.css";

export default function PromptPage() {
  const { project, selections } = usePrintProject();
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => project ? buildAiPrompt(project, selections) : "", [project, selections]);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <FlowHeader active={2} title="Consulte sua IA" description="O texto abaixo já contém os dados do projeto e o formato exato esperado na resposta." />
        {!project ? <MissingProject /> : (
          <div className={styles.workspace}>
            <section className={styles.contentCard}>
              <h2>Prompt pronto para copiar</h2>
              <p>Copie todo o conteúdo, cole no ChatGPT ou Claude e aguarde a resposta em JSON.</p>
              <pre className={styles.codeBox}>{prompt}</pre>
              <ol className={styles.instructionList}>
                <li><span>1</span><div>Copie o prompt completo pelo botão abaixo.</div></li>
                <li><span>2</span><div>Cole em uma nova conversa na IA de sua preferência.</div></li>
                <li><span>3</span><div>Depois, volte e avance para colar a resposta recebida.</div></li>
              </ol>
              <div className={styles.contentActions}>
                <div>
                  <button type="button" className={styles.primaryButton} onClick={() => void copy()}>{copied ? "Prompt copiado ✓" : "Copiar prompt"}</button>
                  <Link href="/configuracao" className={styles.secondaryButton}>Editar escolhas</Link>
                </div>
                {copied && <span className={styles.copySuccess}>Pronto para colar na IA</span>}
                <Link href="/configuracao/resposta" className={styles.primaryButton}>Já tenho a resposta <b>→</b></Link>
              </div>
            </section>
            <SelectionSummary project={project} selections={selections} />
          </div>
        )}
      </div>
    </main>
  );
}
