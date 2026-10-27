"use client";

import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { useBusiness } from "@/components/BusinessProvider";
import styles from "../page.module.css";

type FormValues = {
  hours: string;
  minutes: string;
  printerPower: string;
  energyPrice: string;
  machineCost: string;
  otherCosts: string;
  margin: string;
};

type Filament = {
  id: string;
  color: string;
  material: string;
  usedWeight: string;
  filamentPrice: string;
  rollWeight: string;
};

type StoreKey = "shopee" | "tiktok" | "mercadoLivre";

type FeeTier = {
  min: number;
  max: number;
  rate: number;
  fixed: number;
};

const initialValues: FormValues = {
  hours: "",
  minutes: "",
  printerPower: "120",
  energyPrice: "0.74",
  machineCost: "0.50",
  otherCosts: "",
  margin: "100",
};

const initialFilaments: Filament[] = [{
  id: "filament-1",
  color: "",
  material: "PLA",
  usedWeight: "",
  filamentPrice: "100",
  rollWeight: "1000",
}];

const storeDetails: Record<StoreKey, { name: string; shortName: string; feeLabel: string }> = {
  shopee: {
    name: "Shopee",
    shortName: "S",
    feeLabel: "20% + R$ 4 até R$ 79,99; 14% + tarifa por faixa acima",
  },
  tiktok: {
    name: "TikTok Shop",
    shortName: "T",
    feeLabel: "Comissão + tarifa por item + programa de envio",
  },
  mercadoLivre: {
    name: "Mercado Livre",
    shortName: "ML",
    feeLabel: "14% no Clássico (estimativa conservadora, sem frete)",
  },
};

const storeKeys: StoreKey[] = ["shopee", "tiktok", "mercadoLivre"];

const feeTiers: Record<StoreKey, FeeTier[]> = {
  shopee: [
    { min: 0, max: 8, rate: 0.7, fixed: 0 },
    { min: 8, max: 80, rate: 0.2, fixed: 4 },
    { min: 80, max: 100, rate: 0.14, fixed: 16 },
    { min: 100, max: 200, rate: 0.14, fixed: 20 },
    { min: 200, max: Number.POSITIVE_INFINITY, rate: 0.14, fixed: 26 },
  ],
  tiktok: [
    { min: 0, max: 50, rate: 0.16, fixed: 4 },
    { min: 50, max: 50 / 0.06, rate: 0.12, fixed: 6 },
    { min: 50 / 0.06, max: Number.POSITIVE_INFINITY, rate: 0.06, fixed: 56 },
  ],
  mercadoLivre: [
    { min: 0, max: Number.POSITIVE_INFINITY, rate: 0.14, fixed: 0 },
  ],
};

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.4 7.7 7.6 4.4 7.6-4.4M12 12.1V21"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6m-6 4h6m-6 4h4"/></>,
    chart: <><path d="M5 20v-5m7 5V9m7 11V4"/><path d="M3 20h18"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6m-6 4h6"/></>,
    weight: <><path d="M8 8a4 4 0 1 1 8 0"/><path d="M6.5 8h11l2 13h-15z"/><path d="M12 6v2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    tag: <><path d="M3 12 12 3h7v7l-9 9-7-7Z"/><circle cx="16" cy="7" r="1"/></>,
    spool: <><ellipse cx="12" cy="5" rx="6" ry="3"/><path d="M6 5v14m12-14v14M6 19c0 1.7 12 1.7 12 0M7 9c2 1.2 8 1.2 10 0m-10 6c2 1.2 8 1.2 10 0"/><circle cx="12" cy="12" r="2"/></>,
    bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6z"/>,
    power: <><path d="M12 2v9"/><path d="M7.2 5.5a8 8 0 1 0 9.6 0"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></>,
    wallet: <><path d="M4 7h15v13H4a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3h12v3"/><path d="M15 11h6v5h-6z"/></>,
    calculator: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 5h8v4H8zm0 8h1m3 0h1m3 0h1m-9 4h1m3 0h1m3 0h1"/></>,
    reset: <><path d="M4 10a8 8 0 1 1 2 8"/><path d="M4 4v6h6"/></>,
    bulb: <><path d="M8 14a6 6 0 1 1 8 0c-1.2 1-1.4 2-1.4 3H9.4c0-1-.2-2-1.4-3Z"/><path d="M9.5 20h5"/></>,
    heart: <path d="M20.8 5.7c-2-2-5.2-2-7.2 0L12 7.3l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8.1a5.1 5.1 0 0 0 0-7.2Z"/>,
    coin: <><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v5c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 10v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 15v3c0 1.7 3.1 3 7 3s7-1.3 7-3v-3"/></>,
    sum: <path d="M18 4H7l6 8-6 8h11"/>,
    trend: <path d="M5 20v-5m5 5v-9m5 9V7m5 13V3"/>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Field({ id, label, hint, icon, children }: { id: string; label: string; hint: string; icon: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}><Icon name={icon} size={19} />{label}</label>
      {children}
      <p>{hint}</p>
    </div>
  );
}

function SummaryRow({ icon, tone, label, hint, value }: { icon: string; tone: string; label: string; hint: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={`${styles.summaryIcon} ${styles[tone]}`}><Icon name={icon} size={26} /></span>
      <span className={styles.summaryCopy}><strong>{label}</strong><small>{hint}</small></span>
      <strong className={styles.summaryValue}>{value}</strong>
    </div>
  );
}

function numberValue(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function marketplaceFee(store: StoreKey, price: number) {
  if (price <= 0) return 0;

  const tier = feeTiers[store].find(({ min, max }) => price >= min && price < max)
    ?? feeTiers[store][feeTiers[store].length - 1];

  return price * tier.rate + tier.fixed;
}

function marketplacePrice(store: StoreKey, targetNet: number) {
  if (targetNet <= 0) return 0;

  const candidates = feeTiers[store].flatMap((tier) => {
    const calculated = (targetNet + tier.fixed) / (1 - tier.rate);
    return [calculated, tier.min].filter((price) => price >= tier.min && price < tier.max);
  });

  const validPrice = candidates
    .map((price) => Math.ceil(price * 100) / 100)
    .sort((a, b) => a - b)
    .find((price) => price - marketplaceFee(store, price) + 0.0001 >= targetNet);

  return validPrice ?? 0;
}

function resellerPrice(totalCost: number) {
  if (totalCost <= 0) {
    return {
      makerMarkup: 0,
      makerMargin: 0,
      resellerMargin: 0,
      wholesalePrice: 0,
      retailPrice: 0,
      makerProfit: 0,
      resellerProfit: 0,
    };
  }

  const tier = totalCost <= 25
    ? { makerMarkup: 0.8, resellerMargin: 0.4 }
    : totalCost <= 75
      ? { makerMarkup: 0.65, resellerMargin: 0.35 }
      : totalCost <= 200
        ? { makerMarkup: 0.55, resellerMargin: 0.32 }
        : { makerMarkup: 0.45, resellerMargin: 0.3 };
  const wholesalePrice = Math.ceil(totalCost * (1 + tier.makerMarkup) * 100) / 100;
  const retailPrice = Math.ceil((wholesalePrice / (1 - tier.resellerMargin)) * 100) / 100;
  const makerProfit = wholesalePrice - totalCost;
  const resellerProfit = retailPrice - wholesalePrice;
  const makerMargin = (makerProfit / wholesalePrice) * 100;

  return {
    makerMarkup: tier.makerMarkup * 100,
    makerMargin,
    resellerMargin: tier.resellerMargin * 100,
    wholesalePrice,
    retailPrice,
    makerProfit,
    resellerProfit,
  };
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Home() {
  const { saveProject, storageMode } = useBusiness();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [filaments, setFilaments] = useState<Filament[]>(initialFilaments);
  const [pulse, setPulse] = useState(false);
  const [selectedStores, setSelectedStores] = useState<StoreKey[]>([]);
  const [showResellerPrice, setShowResellerPrice] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const result = useMemo(() => {
    const hours = numberValue(values.hours) + numberValue(values.minutes) / 60;
    const material = filaments.reduce((total, filament) => {
      const rollWeight = numberValue(filament.rollWeight);
      const cost = rollWeight
        ? (numberValue(filament.usedWeight) / rollWeight) * numberValue(filament.filamentPrice)
        : 0;

      return total + cost;
    }, 0);
    const energy = hours * (numberValue(values.printerPower) / 1000) * numberValue(values.energyPrice);
    const machine = hours * numberValue(values.machineCost);
    const others = numberValue(values.otherCosts);
    const total = material + energy + machine + others;
    const profit = total * (numberValue(values.margin) / 100);

    return { material, energy, machine, others, total, profit, price: total + profit };
  }, [filaments, values]);

  const priceSuggestions = useMemo(() => {
    const chosenPercentage = numberValue(values.margin);
    const options = [
      { label: "Competitivo", percentage: Math.max(0, chosenPercentage - 25) },
      { label: "Recomendado", percentage: chosenPercentage },
      { label: "Premium", percentage: Math.min(300, chosenPercentage + 50) },
    ];

    return options.map(({ label, percentage }) => {
      const profit = result.total * (percentage / 100);
      const price = result.total + profit;
      const realMargin = price > 0 ? (profit / price) * 100 : 0;

      return { label, percentage, profit, price, realMargin };
    });
  }, [result.total, values.margin]);

  const totalFilamentWeight = filaments.reduce(
    (total, filament) => total + numberValue(filament.usedWeight),
    0,
  );
  const reseller = useMemo(() => resellerPrice(result.total), [result.total]);

  const update = (key: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const updateFilament = (id: string, key: keyof Omit<Filament, "id">, value: string) => {
    setFilaments((current) => current.map((filament) => (
      filament.id === id ? { ...filament, [key]: value } : filament
    )));
  };

  const addFilament = () => {
    setFilaments((current) => [...current, {
      id: `filament-${Date.now()}`,
      color: "",
      material: "PLA",
      usedWeight: "",
      filamentPrice: "100",
      rollWeight: "1000",
    }]);
  };

  const removeFilament = (id: string) => {
    setFilaments((current) => current.filter((filament) => filament.id !== id));
  };

  const reset = () => {
    setValues(initialValues);
    setFilaments(initialFilaments.map((filament) => ({ ...filament })));
    setSelectedStores([]);
    setShowResellerPrice(false);
  };

  const toggleStore = (store: StoreKey) => {
    setSelectedStores((current) => current.includes(store)
      ? current.filter((selected) => selected !== store)
      : [...current, store]);
  };

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    setPulse(true);
    window.setTimeout(() => setPulse(false), 450);
  };

  const persistProject = async () => {
    if (!projectName.trim()) return;
    setSaveStatus("saving");
    try {
      await saveProject({ name: projectName.trim(), status: "priced", values, filaments, result });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
    window.setTimeout(() => setSaveStatus("idle"), 2200);
  };

  const inputProps = (key: keyof FormValues) => ({
    value: values[key],
    onChange: (event: ChangeEvent<HTMLInputElement>) => update(key, event.target.value),
  });

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}><Icon name="cube" size={40} /></span>
          <span><strong>Calculadora 3D</strong><small>Calcule o custo e o preço ideal do seu projeto.</small></span>
        </div>
        <div className={styles.headerQuote}>Ideias reais<br />impressas em<br /><strong>novas possibilidades.</strong></div>
        <div className={styles.headerArt} aria-hidden="true">
          <span className={styles.printer}><i /><b /></span>
          <span className={styles.filament}><i /></span>
          <em>Mais makers,<br />menos limites.</em>
        </div>
      </header>

      <section className={styles.workspace}>
        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <span className={styles.headingIcon}><Icon name="clipboard" size={25} /></span>
            <span><h1>Dados do Projeto</h1><p>Preencha as informações para calcular o custo e o preço ideal.</p></span>
          </div>

          <form onSubmit={calculate} className={styles.form}>
            <div className={styles.formGrid}>
              <Field id="hours" label="Tempo de impressão" hint="Tempo total estimado de impressão." icon="clock">
                <div className={styles.splitInput}>
                  <span><input id="hours" aria-label="Horas" type="number" min="0" step="1" placeholder="Ex.: 8" {...inputProps("hours")} /><em>Horas</em></span>
                  <span><input aria-label="Minutos" type="number" min="0" max="59" step="1" placeholder="Ex.: 30" {...inputProps("minutes")} /><em>Min</em></span>
                </div>
              </Field>
              <Field id="printerPower" label="Consumo da impressora (W)" hint="Potência média durante a impressão." icon="bolt">
                <input id="printerPower" type="number" min="0" step="0.01" placeholder="Ex.: 120" {...inputProps("printerPower")} />
              </Field>
              <Field id="energyPrice" label="Preço da energia (R$/kWh)" hint="Verifique o valor na sua conta de energia." icon="power">
                <input id="energyPrice" type="number" min="0" step="0.01" placeholder="Ex.: 0,95" {...inputProps("energyPrice")} />
              </Field>
              <Field id="machineCost" label="Custo da máquina por hora (R$)" hint="Inclua depreciação, manutenção, etc." icon="gear">
                <input id="machineCost" type="number" min="0" step="0.01" placeholder="Sugestão: 0,50" {...inputProps("machineCost")} />
              </Field>
              <Field id="otherCosts" label="Outros custos (R$)" hint="Ex.: pós-processamento, embalagem, etc." icon="wallet">
                <input id="otherCosts" type="number" min="0" step="0.01" placeholder="Ex.: 3,00" {...inputProps("otherCosts")} />
              </Field>
            </div>

            <section className={styles.filamentSection}>
              <div className={styles.filamentHeading}>
                <span>
                  <strong><Icon name="spool" size={20} />Filamentos utilizados</strong>
                  <small>Informe o consumo e o custo de cada cor usada na impressão.</small>
                </span>
                <span className={styles.weightBadge}>{totalFilamentWeight.toLocaleString("pt-BR")} g no total</span>
              </div>

              <div className={styles.filamentList}>
                {filaments.map((filament, index) => (
                  <fieldset key={filament.id} className={styles.filamentRow}>
                    <legend>Filamento {index + 1}</legend>
                    <label>
                      <span>Cor</span>
                      <input type="text" placeholder="Ex.: Azul" value={filament.color} onChange={(event) => updateFilament(filament.id, "color", event.target.value)} />
                    </label>
                    <label>
                      <span>Material</span>
                      <select value={filament.material} onChange={(event) => updateFilament(filament.id, "material", event.target.value)}>
                        <option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option><option>Resina</option>
                      </select>
                    </label>
                    <label>
                      <span>Gasto na cor (g)</span>
                      <input type="number" min="0" step="0.01" placeholder="Ex.: 80" value={filament.usedWeight} onChange={(event) => updateFilament(filament.id, "usedWeight", event.target.value)} />
                    </label>
                    <label>
                      <span>Valor do filamento (R$)</span>
                      <input type="number" min="0" step="0.01" placeholder="Ex.: 100,00" value={filament.filamentPrice} onChange={(event) => updateFilament(filament.id, "filamentPrice", event.target.value)} />
                    </label>
                    <label>
                      <span>Peso do rolo (g)</span>
                      <input type="number" min="1" step="0.01" placeholder="Ex.: 1000" value={filament.rollWeight} onChange={(event) => updateFilament(filament.id, "rollWeight", event.target.value)} />
                    </label>
                    {filaments.length > 1 && (
                      <button type="button" className={styles.removeFilament} aria-label={`Remover filamento ${index + 1}`} onClick={() => removeFilament(filament.id)}>
                        <Icon name="trash" size={18} />
                      </button>
                    )}
                  </fieldset>
                ))}
              </div>

              <button type="button" className={styles.addFilament} onClick={addFilament}>
                <Icon name="plus" size={18} />Adicionar outro filamento
              </button>
            </section>

            <div className={styles.marginField}>
              <label htmlFor="margin"><Icon name="trend" size={20} /><span><strong>Lucro sobre o custo (%)</strong><small>Use 100% para dobrar o custo total.</small></span></label>
              <input id="margin" type="range" min="0" max="200" step="1" value={values.margin || "0"} onChange={(event) => update("margin", event.target.value)} />
              <span className={styles.marginValue}><input aria-label="Margem de lucro em porcentagem" type="number" min="0" max="200" placeholder="Ex.: 50" value={values.margin} onChange={(event) => update("margin", event.target.value)} /><em>%</em></span>
            </div>

            <section className={styles.priceSuggestions} aria-label="Sugestões de preço">
              <div className={styles.suggestionIntro}>
                <strong>Sugestões para a sua venda</strong>
                <small>Valores calculados a partir dos custos preenchidos.</small>
              </div>
              <div className={styles.suggestionGrid}>
                {priceSuggestions.map((suggestion) => (
                  <article key={suggestion.label} className={suggestion.label === "Recomendado" ? styles.recommendedSuggestion : ""}>
                    <span>{suggestion.label}</span>
                    <strong>{money.format(suggestion.price)}</strong>
                    <small>{suggestion.percentage}% sobre o custo</small>
                    <dl>
                      <div><dt>Lucro</dt><dd>{money.format(suggestion.profit)}</dd></div>
                      <div><dt>Margem no preço</dt><dd>{suggestion.realMargin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.resellerSection}>
              <label className={styles.resellerToggle}>
                <input type="checkbox" checked={showResellerPrice} onChange={(event) => setShowResellerPrice(event.target.checked)} />
                <span>
                  <strong>Calcular preço para revendedor</strong>
                  <small>Recomendação independente do lucro definido acima.</small>
                </span>
              </label>

              {showResellerPrice && (
                <article className={styles.resellerCard} aria-live="polite">
                  <div className={styles.resellerPrice}>
                    <span><Icon name="tag" size={22} /></span>
                    <span><small>Preço recomendado para o revendedor</small><strong>{money.format(reseller.wholesalePrice)}</strong></span>
                  </div>
                  <dl>
                    <div><dt>Seu lucro por unidade</dt><dd>{money.format(reseller.makerProfit)}</dd></div>
                    <div><dt>Margem na sua venda</dt><dd>{reseller.makerMargin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</dd></div>
                    <div><dt>Preço sugerido ao consumidor</dt><dd>{money.format(reseller.retailPrice)}</dd></div>
                    <div><dt>Lucro do revendedor</dt><dd>{money.format(reseller.resellerProfit)}</dd></div>
                  </dl>
                  <p>
                    O cálculo aplica {reseller.makerMarkup.toLocaleString("pt-BR")}% sobre o seu custo e reserva uma margem de {reseller.resellerMargin.toLocaleString("pt-BR")}% para o revendedor. Frete, impostos e taxas de marketplace não estão incluídos.
                  </p>
                </article>
              )}
            </section>

            <div className={styles.saveProject}>
              <span><strong>Salvar este projeto</strong><small>{storageMode === "mongodb" ? "Será sincronizado no MongoDB." : "Será salvo neste navegador até o MongoDB ser conectado."}</small></span>
              <input aria-label="Nome do projeto" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Nome do projeto" />
              <button type="button" disabled={!projectName.trim() || saveStatus === "saving"} onClick={() => void persistProject()}>{saveStatus === "saving" ? "Salvando..." : saveStatus === "saved" ? "✓ Projeto salvo" : saveStatus === "error" ? "Falha ao salvar" : "Salvar projeto"}</button>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton}><Icon name="calculator" size={20} />Calcular</button>
              <button type="button" className={styles.secondaryButton} onClick={reset}><Icon name="reset" size={20} />Limpar</button>
            </div>
          </form>
        </section>

        <aside className={styles.card} aria-live="polite">
          <div className={`${styles.sectionHeading} ${styles.summaryHeading}`}>
            <span className={styles.headingChart}><Icon name="chart" size={28} /></span>
            <span><h2>Resumo do Cálculo</h2><p>Confira a composição de custos e o preço sugerido.</p></span>
            <span className={styles.liveBadge}><i /><span>Simulação em tempo real</span></span>
          </div>

          <div className={styles.summaryList}>
            <SummaryRow icon="coin" tone="blue" label="Custo dos filamentos" hint="Soma do consumo informado para cada cor." value={money.format(result.material)} />
            <SummaryRow icon="bolt" tone="green" label="Custo de energia" hint="Baseado no tempo de impressão e no consumo." value={money.format(result.energy)} />
            <SummaryRow icon="gear" tone="orange" label="Custo da máquina" hint="Tempo de uso da impressora." value={money.format(result.machine)} />
            <SummaryRow icon="wallet" tone="purple" label="Outros custos" hint="Custos adicionais do projeto." value={money.format(result.others)} />
          </div>

          <div className={styles.divider} />

          <div className={styles.totals}>
            <SummaryRow icon="sum" tone="gray" label="Custo total" hint="Soma de todos os custos." value={money.format(result.total)} />
            <SummaryRow icon="trend" tone="green" label="Lucro estimado" hint={`Acréscimo de ${numberValue(values.margin)}% sobre o custo.`} value={money.format(result.profit)} />
          </div>

          <div className={`${styles.suggested} ${pulse ? styles.pricePulse : ""}`}>
            <span className={styles.priceIcon}><Icon name="tag" size={28} /></span>
            <span><strong>Preço sugerido</strong><small>Valor ideal para venda do seu projeto.</small></span>
            <strong>{money.format(result.price)}</strong>
          </div>

          <section className={styles.marketplaces}>
            <div className={styles.marketplaceHeading}>
              <span><strong>Vender em marketplaces</strong><small>Selecione as lojas para incluir as taxas no preço.</small></span>
            </div>

            <div className={styles.storeOptions}>
              {storeKeys.map((store) => (
                <label key={store} className={`${styles.storeToggle} ${selectedStores.includes(store) ? styles.storeToggleActive : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store)}
                    onChange={() => toggleStore(store)}
                  />
                  <span className={`${styles.storeMark} ${styles[store]}`}>{storeDetails[store].shortName}</span>
                  <strong>{storeDetails[store].name}</strong>
                </label>
              ))}
            </div>

            {selectedStores.length > 0 ? (
              <div className={styles.storeResults} aria-live="polite">
                {selectedStores.map((store) => {
                  const price = marketplacePrice(store, result.total + result.profit);
                  const fee = marketplaceFee(store, price);
                  const profit = Math.max(0, price - fee - result.total);

                  return (
                    <article key={store} className={styles.storeResult}>
                      <div className={styles.storeResultTitle}>
                        <span className={`${styles.storeMark} ${styles[store]}`}>{storeDetails[store].shortName}</span>
                        <span><strong>{storeDetails[store].name}</strong><small>{storeDetails[store].feeLabel}</small></span>
                      </div>
                      <dl>
                        <div><dt>Taxas estimadas</dt><dd>{money.format(fee)}</dd></div>
                        <div className={styles.storePrice}><dt>Preço sugerido de venda</dt><dd>{money.format(price)}</dd></div>
                        <div className={styles.storeProfit}><dt>Seu lucro líquido</dt><dd>{money.format(profit)}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={styles.storeEmpty}>Marque uma ou mais lojas para comparar os valores.</p>
            )}

            <p className={styles.feeNote}>Estimativa com taxas vigentes em set/2026. Fretes variáveis, campanhas, afiliados e impostos não estão incluídos.</p>
          </section>

          <div className={styles.tip}>
            <span><Icon name="bulb" size={25} /></span>
            <p><strong>Dica</strong>Os valores são uma estimativa e podem variar de acordo com a sua realidade.<br />Ajuste os parâmetros para encontrar o melhor preço para o seu projeto.</p>
            <em>Grandes projetos<br />começam com<br />boas ideias.</em>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}><span><Icon name="cube" size={20} /><strong>Calculadora 3D</strong><i />Para makers, criadores e grandes ideias.</span><span><Icon name="heart" size={18} />Imprima um futuro melhor.</span></footer>
    </main>
  );
}
