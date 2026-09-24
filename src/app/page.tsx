"use client";

import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import styles from "./page.module.css";

type FormValues = {
  projectName: string;
  weight: string;
  hours: string;
  minutes: string;
  material: string;
  filamentPrice: string;
  rollWeight: string;
  printerPower: string;
  energyPrice: string;
  machineCost: string;
  otherCosts: string;
  margin: string;
};

const initialValues: FormValues = {
  projectName: "",
  weight: "",
  hours: "",
  minutes: "",
  material: "PLA",
  filamentPrice: "100",
  rollWeight: "1000",
  printerPower: "120",
  energyPrice: "0.74",
  machineCost: "",
  otherCosts: "",
  margin: "",
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

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Home() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [pulse, setPulse] = useState(false);

  const result = useMemo(() => {
    const hours = numberValue(values.hours) + numberValue(values.minutes) / 60;
    const material = numberValue(values.rollWeight)
      ? (numberValue(values.weight) / numberValue(values.rollWeight)) * numberValue(values.filamentPrice)
      : 0;
    const energy = hours * (numberValue(values.printerPower) / 1000) * numberValue(values.energyPrice);
    const machine = hours * numberValue(values.machineCost);
    const others = numberValue(values.otherCosts);
    const total = material + energy + machine + others;
    const profit = total * (numberValue(values.margin) / 100);

    return { material, energy, machine, others, total, profit, price: total + profit };
  }, [values]);

  const update = (key: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const calculate = (event: FormEvent) => {
    event.preventDefault();
    setPulse(true);
    window.setTimeout(() => setPulse(false), 450);
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
              <Field id="projectName" label="Nome do projeto" hint="Dê um nome para identificar seu projeto." icon="file">
                <input id="projectName" type="text" placeholder="Ex.: Miniatura articulada" {...inputProps("projectName")} />
              </Field>
              <Field id="weight" label="Peso da peça (g)" hint="Peso final da peça impressa." icon="weight">
                <input id="weight" type="number" min="0" step="0.01" placeholder="Ex.: 120,50" {...inputProps("weight")} />
              </Field>
              <Field id="hours" label="Tempo de impressão" hint="Tempo total estimado de impressão." icon="clock">
                <div className={styles.splitInput}>
                  <span><input id="hours" aria-label="Horas" type="number" min="0" step="1" placeholder="Ex.: 8" {...inputProps("hours")} /><em>Horas</em></span>
                  <span><input aria-label="Minutos" type="number" min="0" max="59" step="1" placeholder="Ex.: 30" {...inputProps("minutes")} /><em>Min</em></span>
                </div>
              </Field>
              <Field id="material" label="Material" hint="Selecione o material utilizado." icon="cube">
                <select id="material" value={values.material} onChange={(event) => update("material", event.target.value)}>
                  <option value="" disabled>Selecione o material</option>
                  <option>PLA</option><option>PETG</option><option>ABS</option><option>TPU</option><option>Resina</option>
                </select>
              </Field>
              <Field id="filamentPrice" label="Preço do filamento (R$)" hint="Valor pago no rolo de filamento." icon="tag">
                <input id="filamentPrice" type="number" min="0" step="0.01" placeholder="Ex.: 89,90" {...inputProps("filamentPrice")} />
              </Field>
              <Field id="rollWeight" label="Peso do rolo (g)" hint="Peso total do rolo de filamento." icon="spool">
                <input id="rollWeight" type="number" min="1" step="0.01" placeholder="Ex.: 1000" {...inputProps("rollWeight")} />
              </Field>
              <Field id="printerPower" label="Consumo da impressora (W)" hint="Potência média durante a impressão." icon="bolt">
                <input id="printerPower" type="number" min="0" step="0.01" placeholder="Ex.: 120" {...inputProps("printerPower")} />
              </Field>
              <Field id="energyPrice" label="Preço da energia (R$/kWh)" hint="Verifique o valor na sua conta de energia." icon="power">
                <input id="energyPrice" type="number" min="0" step="0.01" placeholder="Ex.: 0,95" {...inputProps("energyPrice")} />
              </Field>
              <Field id="machineCost" label="Custo da máquina por hora (R$)" hint="Inclua depreciação, manutenção, etc." icon="gear">
                <input id="machineCost" type="number" min="0" step="0.01" placeholder="Ex.: 2,00" {...inputProps("machineCost")} />
              </Field>
              <Field id="otherCosts" label="Outros custos (R$)" hint="Ex.: pós-processamento, embalagem, etc." icon="wallet">
                <input id="otherCosts" type="number" min="0" step="0.01" placeholder="Ex.: 3,00" {...inputProps("otherCosts")} />
              </Field>
            </div>

            <div className={styles.marginField}>
              <label htmlFor="margin"><Icon name="trend" size={20} /><span><strong>Margem de lucro (%)</strong><small>Defina a margem de lucro desejada.</small></span></label>
              <input id="margin" type="range" min="0" max="200" step="1" value={values.margin || "0"} onChange={(event) => update("margin", event.target.value)} />
              <span className={styles.marginValue}><input aria-label="Margem de lucro em porcentagem" type="number" min="0" max="200" placeholder="Ex.: 50" value={values.margin} onChange={(event) => update("margin", event.target.value)} /><em>%</em></span>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton}><Icon name="calculator" size={20} />Calcular</button>
              <button type="button" className={styles.secondaryButton} onClick={() => setValues(initialValues)}><Icon name="reset" size={20} />Limpar</button>
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
            <SummaryRow icon="coin" tone="blue" label="Custo do material" hint="Baseado no peso da peça e no preço do filamento." value={money.format(result.material)} />
            <SummaryRow icon="bolt" tone="green" label="Custo de energia" hint="Baseado no tempo de impressão e no consumo." value={money.format(result.energy)} />
            <SummaryRow icon="gear" tone="orange" label="Custo da máquina" hint="Tempo de uso da impressora." value={money.format(result.machine)} />
            <SummaryRow icon="wallet" tone="purple" label="Outros custos" hint="Custos adicionais do projeto." value={money.format(result.others)} />
          </div>

          <div className={styles.divider} />

          <div className={styles.totals}>
            <SummaryRow icon="sum" tone="gray" label="Custo total" hint="Soma de todos os custos." value={money.format(result.total)} />
            <SummaryRow icon="trend" tone="green" label="Lucro estimado" hint={`Baseado na margem de lucro de ${numberValue(values.margin)}%.`} value={money.format(result.profit)} />
          </div>

          <div className={`${styles.suggested} ${pulse ? styles.pricePulse : ""}`}>
            <span className={styles.priceIcon}><Icon name="tag" size={28} /></span>
            <span><strong>Preço sugerido</strong><small>Valor ideal para venda do seu projeto.</small></span>
            <strong>{money.format(result.price)}</strong>
          </div>

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
