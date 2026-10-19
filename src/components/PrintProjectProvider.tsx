"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import type { AiSuggestion, PrintSelections, ProjectInfo } from "@/lib/three-mf";

const emptySelections: PrintSelections = {
  printer: "", nozzle: "", ams: "", filamentType: "", filamentBrand: "", priority: "", usage: "",
};

type PrintProjectContextValue = {
  file: File | null;
  project: ProjectInfo | null;
  selections: PrintSelections;
  suggestion: AiSuggestion | null;
  setUploadedProject: (file: File, project: ProjectInfo) => void;
  setSelections: React.Dispatch<React.SetStateAction<PrintSelections>>;
  setSuggestion: React.Dispatch<React.SetStateAction<AiSuggestion | null>>;
  resetProject: () => void;
};

const PrintProjectContext = createContext<PrintProjectContextValue | null>(null);

export function PrintProjectProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [selections, setSelections] = useState<PrintSelections>(emptySelections);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);

  const value = useMemo(() => ({
    file,
    project,
    selections,
    suggestion,
    setSelections,
    setSuggestion,
    setUploadedProject: (nextFile: File, nextProject: ProjectInfo) => {
      setFile(nextFile);
      setProject(nextProject);
      setSuggestion(null);
    },
    resetProject: () => {
      setFile(null);
      setProject(null);
      setSuggestion(null);
      setSelections(emptySelections);
    },
  }), [file, project, selections, suggestion]);

  return <PrintProjectContext.Provider value={value}>{children}</PrintProjectContext.Provider>;
}

export function usePrintProject() {
  const context = useContext(PrintProjectContext);
  if (!context) throw new Error("usePrintProject precisa estar dentro de PrintProjectProvider.");
  return context;
}
