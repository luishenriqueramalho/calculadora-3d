import Link from "next/link";
import type { PrintSelections, ProjectInfo } from "@/lib/three-mf";
import styles from "@/app/configuracao/configurator.module.css";

const steps = [
  { number: 1, label: "Projeto" },
  { number: 2, label: "Consultar IA" },
  { number: 3, label: "Resposta" },
  { number: 4, label: "Revisar" },
];

export function FlowHeader({ active, title, description }: { active: number; title: string; description: string }) {
  return (
    <>
      <div className={styles.breadcrumb}><Link href="/">Home</Link><span>›</span><Link href="/configuracao">Configuração da impressão</Link></div>
      <div className={styles.flowHeading}>
        <span className={styles.flowIcon}>⚙</span>
        <div><h1>{title}</h1><p>{description}</p></div>
      </div>
      <ol className={styles.steps} aria-label="Etapas da configuração">
        {steps.map((step, index) => (
          <li key={step.number} className={step.number === active ? styles.currentStep : step.number < active ? styles.doneStep : ""}>
            <span>{step.number < active ? "✓" : step.number}</span><strong>{step.label}</strong>
            {index < steps.length - 1 && <i />}
          </li>
        ))}
      </ol>
    </>
  );
}

const labels: Record<keyof PrintSelections, string> = {
  printer: "Impressora", nozzle: "Bico", ams: "Sistema AMS", filamentType: "Filamento",
  filamentBrand: "Marca", priority: "Prioridade", usage: "Tipo de uso",
};

export function SelectionSummary({ project, selections }: { project: ProjectInfo | null; selections: PrintSelections }) {
  return (
    <aside className={styles.summaryCard}>
      <div className={styles.summaryTitle}><span>≡</span><div><h2>Resumo do projeto</h2><p>Atualizado conforme você preenche</p></div><i /></div>
      <div className={styles.fileSummary}>
        <span>3MF</span>
        <div><small>ARQUIVO</small><strong>{project?.fileName ?? "Nenhum arquivo enviado"}</strong>{project && <em>{project.plates} placa(s) · {project.objectNames.length || "?"} objeto(s)</em>}</div>
      </div>
      <dl className={styles.summaryList}>
        {(Object.keys(labels) as (keyof PrintSelections)[]).map((key) => (
          <div key={key}><dt>{labels[key]}</dt><dd className={selections[key] ? "" : styles.empty}>{selections[key] || "Não selecionado"}{key === "nozzle" && selections[key] ? " mm" : ""}</dd></div>
        ))}
      </dl>
      <p className={styles.privacy}><span>✓</span><strong>Processamento local</strong><small>Seu arquivo não é enviado para nenhum servidor.</small></p>
    </aside>
  );
}

export function MissingProject() {
  return (
    <div className={styles.missing}>
      <span>3MF</span><h2>Projeto não encontrado</h2>
      <p>Volte à primeira etapa e envie o arquivo para continuar. O projeto fica disponível enquanto você navega neste fluxo.</p>
      <Link href="/configuracao" className={styles.primaryButton}>Voltar e enviar o 3MF</Link>
    </div>
  );
}
