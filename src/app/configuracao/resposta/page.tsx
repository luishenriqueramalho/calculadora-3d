"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FlowHeader, MissingProject, SelectionSummary } from "@/components/PrintFlow";
import { usePrintProject } from "@/components/PrintProjectProvider";
import { parseAiSuggestion } from "@/lib/three-mf";
import styles from "../configurator.module.css";

export default function ResponsePage() {
  const router = useRouter();
  const { project, selections, suggestion, setSuggestion } = usePrintProject();
  const [response, setResponse] = useState(suggestion ? JSON.stringify(suggestion, null, 2) : "");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!project) return;
    try {
      const parsed = parseAiSuggestion(response, project);
      setSuggestion(parsed);
      router.push("/configuracao/alteracoes");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível validar a resposta.");
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <FlowHeader active={3} title="Cole a resposta da IA" description="Vamos conferir o formato e impedir alterações em chaves que não pertencem ao seu projeto." />
        {!project ? <MissingProject /> : (
          <div className={styles.workspace}>
            <form className={styles.contentCard} onSubmit={submit}>
              <h2>Resposta em JSON</h2>
              <p>Cole o bloco completo recebido. Aceitamos JSON puro ou envolvido por três crases.</p>
              <textarea
                className={styles.responseArea}
                value={response}
                onChange={(event) => { setResponse(event.target.value); setError(""); }}
                placeholder={'{"resumo":"…","alteracoes":[{"chave":"layer_height","valor":"0.16","motivo":"…"}]}' }
                aria-label="Resposta da inteligência artificial"
              />
              {error && <p className={styles.error} role="alert">{error}</p>}
              <div className={styles.contentActions}>
                <Link href="/configuracao/prompt" className={styles.secondaryButton}>← Voltar ao prompt</Link>
                <button type="submit" className={styles.primaryButton}>Conferir alterações <b>→</b></button>
              </div>
            </form>
            <SelectionSummary project={project} selections={selections} />
          </div>
        )}
      </div>
    </main>
  );
}
