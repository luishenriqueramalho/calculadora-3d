"use client";

import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlowHeader, SelectionSummary } from "@/components/PrintFlow";
import { usePrintProject } from "@/components/PrintProjectProvider";
import { inspect3mf, PrintSelections } from "@/lib/three-mf";
import styles from "./configurator.module.css";

const options: Record<keyof PrintSelections, string[]> = {
  printer: ["Bambu Lab A1", "Bambu Lab A1 Mini", "Bambu Lab P1S", "Bambu Lab P1P", "Bambu Lab X1 Carbon", "Bambu Lab X1E", "Bambu Lab H2D"],
  nozzle: ["0.2", "0.4", "0.6", "0.8"],
  ams: ["AMS lite (4 cores)", "AMS (4 cores)", "Mais de 1 AMS", "Sem AMS"],
  filamentType: ["PLA", "PETG", "PLA Silk", "PLA Matte", "ABS", "ASA", "TPU", "PC", "PA"],
  filamentBrand: ["Volt3D", "Bambu Lab", "3D Lab", "Polymaker", "eSUN", "SUNLU", "Creality", "Elegoo", "Overture", "Hatchbox", "Prusament", "Anycubic", "Onyon 3D", "Outros"],
  priority: ["Equilibrada", "Qualidade visual", "Resistência", "Velocidade", "Menos material"],
  usage: ["Decorativa ou visual", "Funcional — uso leve", "Funcional com esforço mecânico", "Protótipo rápido", "Miniatura com muitos detalhes"],
};

const fieldInfo: { key: keyof PrintSelections; label: string; hint: string }[] = [
  { key: "printer", label: "Impressora", hint: "Modelo que será usado na impressão." },
  { key: "nozzle", label: "Diâmetro do bico", hint: "Bico instalado na impressora." },
  { key: "ams", label: "Sistema de materiais", hint: "Como os filamentos serão alimentados." },
  { key: "filamentType", label: "Tipo de filamento", hint: "Material principal da peça." },
  { key: "filamentBrand", label: "Marca do filamento", hint: "Ajuda a IA a considerar as recomendações do fabricante." },
  { key: "priority", label: "Prioridade", hint: "O que deve orientar os ajustes sugeridos." },
  { key: "usage", label: "Tipo de uso da peça", hint: "Finalidade e nível de exigência da peça." },
];

export default function ConfigurationPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { project, selections, setSelections, setUploadedProject } = usePrintProject();
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const upload = async (nextFile?: File) => {
    if (!nextFile) return;
    setLoading(true);
    setError("");
    try {
      const info = await inspect3mf(nextFile);
      setUploadedProject(nextFile, info);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível analisar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const missing = fieldInfo.find(({ key }) => !selections[key]);
    if (!project) return setError("Envie um arquivo 3MF do Bambu Studio para continuar.");
    if (missing) return setError(`Selecione: ${missing.label}.`);
    router.push("/configuracao/prompt");
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <FlowHeader active={1} title="Configuração da impressão" description="Envie seu projeto e conte como você quer imprimir. Nós preparamos o restante do fluxo." />
        <div className={styles.workspace}>
          <form className={styles.formCard} onSubmit={onSubmit}>
            <section>
              <div className={styles.sectionTitle}><span>1</span><div><h2>Arquivo do projeto</h2><p>Envie o arquivo salvo pelo Bambu Studio.</p></div></div>
              <div
                className={`${styles.dropzone} ${dragging ? styles.dragging : ""} ${project ? styles.hasFile : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input ref={inputRef} type="file" accept=".3mf" onChange={(event: ChangeEvent<HTMLInputElement>) => void upload(event.target.files?.[0])} />
                <span className={styles.uploadIcon}>{project ? "✓" : "⇧"}</span>
                <div>
                  <strong>{loading ? "Analisando o arquivo…" : project ? project.fileName : "Arraste seu arquivo .3mf aqui"}</strong>
                  <p>{project ? `${Object.keys(project.settings).length} configurações compatíveis encontradas` : "ou escolha o arquivo no seu computador"}</p>
                </div>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}>{project ? "Trocar arquivo" : "Selecionar arquivo"}</button>
                <small>Somente .3mf · processamento local no seu navegador</small>
              </div>
            </section>

            <section>
              <div className={styles.sectionTitle}><span>2</span><div><h2>Como será a impressão?</h2><p>Essas escolhas serão usadas para montar a consulta à IA.</p></div></div>
              <div className={styles.formGrid}>
                {fieldInfo.map((field) => (
                  <label key={field.key} className={field.key === "usage" ? styles.wideField : ""}>
                    <span>{field.label}</span>
                    <select value={selections[field.key]} onChange={(event) => setSelections((current) => ({ ...current, [field.key]: event.target.value }))}>
                      <option value="">Selecione uma opção</option>
                      {options[field.key].map((option) => <option key={option}>{option}</option>)}
                    </select>
                    <small>{field.hint}</small>
                  </label>
                ))}
              </div>
            </section>

            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.formActions}>
              <span><b>Próxima etapa:</b> gerar o texto para consultar uma IA.</span>
              <button className={styles.primaryButton} type="submit">Gerar sugestão <b>→</b></button>
            </div>
          </form>
          <SelectionSummary project={project} selections={selections} />
        </div>
      </div>
    </main>
  );
}
