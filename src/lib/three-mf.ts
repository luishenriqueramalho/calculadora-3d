import JSZip from "jszip";

export const settingGroups = {
  Qualidade: [
    "layer_height", "initial_layer_print_height", "wall_generator", "seam_position",
    "top_surface_pattern", "ironing_type", "elefant_foot_compensation", "detect_thin_wall",
    "top_one_wall_type",
  ],
  "Resistência": [
    "wall_loops", "top_shell_layers", "bottom_shell_layers", "sparse_infill_density",
    "sparse_infill_pattern",
  ],
  Suporte: [
    "enable_support", "support_type", "support_style", "support_threshold_angle",
    "support_on_build_plate_only", "support_top_z_distance",
  ],
  "Aderência": ["brim_type", "brim_width", "skirt_loops"],
  Velocidade: [
    "initial_layer_speed", "outer_wall_speed", "inner_wall_speed", "sparse_infill_speed",
    "internal_solid_infill_speed", "top_surface_speed", "support_speed", "bridge_speed",
    "travel_speed", "default_acceleration",
  ],
  Temperatura: [
    "nozzle_temperature", "nozzle_temperature_initial_layer", "hot_plate_temp",
    "hot_plate_temp_initial_layer", "textured_plate_temp", "textured_plate_temp_initial_layer",
    "cool_plate_temp", "cool_plate_temp_initial_layer", "eng_plate_temp",
    "eng_plate_temp_initial_layer",
  ],
  Resfriamento: [
    "fan_min_speed", "fan_max_speed", "overhang_fan_speed", "close_fan_the_first_x_layers",
    "slow_down_layer_time", "filament_max_volumetric_speed",
  ],
  Multicor: ["enable_prime_tower", "prime_tower_width"],
} as const;

export const allowedSettingKeys = new Set<string>(Object.values(settingGroups).flat());

export type PrintSelections = {
  printer: string;
  nozzle: string;
  ams: string;
  filamentType: string;
  filamentBrand: string;
  priority: string;
  usage: string;
};

export type ProjectInfo = {
  fileName: string;
  application: string;
  plates: number;
  objectNames: string[];
  projectFilaments: string[];
  settings: Record<string, string>;
  settingsPath: string;
};

export type SuggestedChange = {
  chave: string;
  valor: string;
  motivo: string;
};

export type AiSuggestion = {
  resumo: string;
  alteracoes: SuggestedChange[];
};

function readableValue(value: unknown) {
  if (Array.isArray(value)) return `[${value.map(String).join(", ")}] (por filamento)`;
  if (value === null || value === undefined) return "";
  return String(value);
}

async function readTextFiles(zip: JSZip, paths: string[]) {
  const entries = await Promise.all(paths.map(async (path) => ({
    path,
    text: await zip.file(path)?.async("string") ?? "",
  })));
  return entries;
}

function namesFromXml(xml: string) {
  if (!xml || typeof DOMParser === "undefined") return [];
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const names: string[] = [];
  document.querySelectorAll("object").forEach((object) => {
    const directName = object.getAttribute("name");
    const metadataName = Array.from(object.querySelectorAll("metadata"))
      .find((item) => item.getAttribute("key") === "name" || item.getAttribute("name") === "name")
      ?.getAttribute("value") ?? "";
    const name = directName || metadataName;
    if (name && !names.includes(name)) names.push(name);
  });
  return names;
}

export async function inspect3mf(file: File): Promise<ProjectInfo> {
  if (!file.name.toLowerCase().endsWith(".3mf")) {
    throw new Error("Selecione um arquivo com extensão .3mf.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("Não foi possível abrir o 3MF. Verifique se o arquivo não está corrompido.");
  }

  const paths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);
  const settingsPath = paths.find((path) => path.toLowerCase().endsWith("metadata/project_settings.config"))
    ?? paths.find((path) => path.toLowerCase().endsWith("project_settings.config"));

  if (!settingsPath) {
    throw new Error("Este 3MF não contém as configurações de projeto do Bambu Studio.");
  }

  let rawSettings: Record<string, unknown>;
  try {
    rawSettings = JSON.parse(await zip.file(settingsPath)!.async("string"));
  } catch {
    throw new Error("As configurações internas do 3MF não estão em um formato reconhecido.");
  }

  const settings: Record<string, string> = {};
  for (const key of allowedSettingKeys) {
    if (Object.prototype.hasOwnProperty.call(rawSettings, key)) {
      settings[key] = readableValue(rawSettings[key]);
    }
  }

  if (Object.keys(settings).length === 0) {
    throw new Error("Nenhuma configuração compatível foi encontrada neste projeto.");
  }

  const metadataPaths = paths.filter((path) => {
    const lower = path.toLowerCase();
    return lower.startsWith("metadata/") && (lower.endsWith(".config") || lower.endsWith(".json"));
  });
  const metadata = await readTextFiles(zip, metadataPaths);
  const metadataText = metadata.map(({ text }) => text).join("\n");
  const applicationMatch = metadataText.match(/BambuStudio[-_ /]?\d+(?:\.\d+){1,3}/i);
  const plateFiles = paths.filter((path) => /metadata\/plate_\d+\.json$/i.test(path));
  const xmlPlateCount = (metadataText.match(/<plate(?:\s|>)/gi) ?? []).length;
  const modelPaths = paths.filter((path) => /(?:model_settings\.config|\.model)$/i.test(path));
  const modelFiles = await readTextFiles(zip, modelPaths);
  const objectNames = [...new Set(modelFiles.flatMap(({ text }) => namesFromXml(text)))];
  const filamentTypes = Array.isArray(rawSettings.filament_type) ? rawSettings.filament_type : [];
  const filamentColors = Array.isArray(rawSettings.filament_colour) ? rawSettings.filament_colour : [];
  const filamentCount = Math.max(filamentTypes.length, filamentColors.length);
  const projectFilaments = Array.from({ length: filamentCount }, (_, index) => {
    const type = String(filamentTypes[index] ?? "Filamento");
    const color = String(filamentColors[index] ?? "");
    return `${type}${color ? ` ${color}` : ""}`;
  });

  return {
    fileName: file.name,
    application: applicationMatch?.[0] ?? "Bambu Studio",
    plates: Math.max(plateFiles.length, xmlPlateCount, 1),
    objectNames,
    projectFilaments,
    settings,
    settingsPath,
  };
}

export function buildAiPrompt(project: ProjectInfo, selections: PrintSelections) {
  const configLines = Object.entries(settingGroups).flatMap(([group, keys]) => {
    const available = keys.filter((key) => project.settings[key]);
    if (available.length === 0) return [];
    return [`# ${group}`, ...available.map((key) => `${key} = ${project.settings[key]}`)];
  });
  const objects = project.objectNames.length ? project.objectNames.join(", ") : "não identificados no arquivo";
  const filaments = project.projectFilaments.length ? project.projectFilaments.join(", ") : "não identificados no arquivo";

  return `Preciso ajustar as configurações de um projeto do Bambu Studio antes de fatiar.

Impressora: ${selections.printer} | bico ${selections.nozzle} mm | ${selections.ams}
Filamento: ${selections.filamentType} ${selections.filamentBrand}
Uso da peça: ${selections.usage}
Prioridade: ${selections.priority}

Projeto: ${project.fileName} | ${project.application} | ${project.plates} placa(s) | ${project.objectNames.length || "?"} objeto(s)
Objetos: ${objects}
Filamentos no projeto (${project.projectFilaments.length || "?"}): ${filaments}

Configurações atuais (chave = valor):
${configLines.join("\n")}

Se precisar, pesquise as recomendações do fabricante do filamento e as especificações da impressora antes de responder.
Responda SOMENTE com um bloco de código JSON neste formato:
{"resumo":"uma frase","alteracoes":[{"chave":"layer_height","valor":"0.16","motivo":"explicação curta"}]}
Regras: use apenas chaves da lista acima; mantenha o mesmo formato de valor (ex.: "15%" para densidade); numa chave por filamento, um valor único vale para todos os filamentos; liste só o que realmente deve mudar.`;
}

export function parseAiSuggestion(input: string, project: ProjectInfo): AiSuggestion {
  const cleaned = input.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("O conteúdo não é um JSON válido. Cole somente a resposta completa da IA.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("A resposta precisa ser um objeto JSON.");
  const result = parsed as Partial<AiSuggestion>;
  if (typeof result.resumo !== "string" || !Array.isArray(result.alteracoes)) {
    throw new Error("A resposta precisa conter “resumo” e a lista “alteracoes”.");
  }

  const seen = new Set<string>();
  const changes = result.alteracoes.map((change, index) => {
    if (!change || typeof change !== "object") throw new Error(`Alteração ${index + 1} inválida.`);
    const item = change as Partial<SuggestedChange>;
    if (typeof item.chave !== "string" || typeof item.valor !== "string" || typeof item.motivo !== "string") {
      throw new Error(`Alteração ${index + 1} precisa ter chave, valor e motivo em texto.`);
    }
    if (!allowedSettingKeys.has(item.chave) || !(item.chave in project.settings)) {
      throw new Error(`A chave “${item.chave}” não existe na lista de configurações deste 3MF.`);
    }
    if (seen.has(item.chave)) throw new Error(`A chave “${item.chave}” aparece mais de uma vez.`);
    seen.add(item.chave);
    return { chave: item.chave, valor: item.valor, motivo: item.motivo };
  });

  return { resumo: result.resumo, alteracoes: changes };
}

function coerceLike(value: string, sample: unknown) {
  if (typeof sample === "number") {
    const numeric = Number(value.replace("%", "").replace(",", "."));
    return Number.isFinite(numeric) ? numeric : value;
  }
  if (typeof sample === "boolean") return value === "1" || value.toLowerCase() === "true";
  return value;
}

export async function createAdjusted3mf(file: File, project: ProjectInfo, changes: SuggestedChange[]) {
  const zip = await JSZip.loadAsync(file);
  const configFile = zip.file(project.settingsPath);
  if (!configFile) throw new Error("O arquivo interno de configurações não foi encontrado.");
  const config = JSON.parse(await configFile.async("string")) as Record<string, unknown>;

  for (const change of changes) {
    if (!Object.prototype.hasOwnProperty.call(config, change.chave)) continue;
    const current = config[change.chave];
    config[change.chave] = Array.isArray(current)
      ? current.map((item) => coerceLike(change.valor, item))
      : coerceLike(change.valor, current);
  }

  zip.file(project.settingsPath, JSON.stringify(config, null, 4));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
