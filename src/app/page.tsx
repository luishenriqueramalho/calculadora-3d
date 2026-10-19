import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Planeje melhor. Imprima com confiança.</span>
          <h1>Da ideia ao 3MF pronto para imprimir.</h1>
          <p>
            Calcule o preço real do seu projeto e transforme recomendações de IA em configurações
            aplicadas ao arquivo do Bambu Studio — com revisão antes do download.
          </p>
          <div className={styles.actions}>
            <Link href="/configuracao" className={styles.primary}>Configurar uma impressão <span>→</span></Link>
            <Link href="/calculadora" className={styles.secondary}>Calcular custos</Link>
          </div>
          <div className={styles.trust}>
            <span>✓ Seu 3MF fica no navegador</span>
            <span>✓ Você aprova cada alteração</span>
          </div>
        </div>

        <div className={styles.visual} aria-label="Fluxo de preparação de impressão 3D">
          <div className={styles.glow} />
          <article className={`${styles.floatingCard} ${styles.fileCard}`}>
            <span className={styles.cardIcon}>3MF</span>
            <span><small>Projeto</small><strong>escultura.3mf</strong></span>
            <i>✓</i>
          </article>
          <div className={styles.printer} aria-hidden="true">
            <span className={styles.printerTop} />
            <span className={styles.printerHead}><i /></span>
            <span className={styles.printObject} />
            <span className={styles.bed} />
          </div>
          <article className={`${styles.floatingCard} ${styles.settingCard}`}>
            <span className={styles.sliders}>≡</span>
            <span><small>Ajuste sugerido</small><strong>20 configurações</strong></span>
          </article>
          <div className={styles.status}><i /> Projeto pronto para revisão</div>
        </div>
      </section>

      <section className={styles.features} aria-labelledby="features-title">
        <div className={styles.sectionIntro}>
          <span>DUAS FERRAMENTAS, UM SÓ FLUXO</span>
          <h2 id="features-title">Tudo o que você precisa antes de fatiar</h2>
          <p>Decisões claras para precificar e preparar suas impressões.</p>
        </div>
        <div className={styles.featureGrid}>
          <article>
            <span className={styles.featureIcon}>▦</span>
            <div><small>01 · PRECIFICAÇÃO</small><h3>Calculadora de custos</h3></div>
            <p>Some filamento, energia, máquina e outros custos. Compare margens e preços para marketplaces.</p>
            <Link href="/calculadora">Abrir calculadora <span>→</span></Link>
          </article>
          <article>
            <span className={`${styles.featureIcon} ${styles.purple}`}>⚙</span>
            <div><small>02 · PREPARAÇÃO</small><h3>Configuração da impressão</h3></div>
            <p>Envie o 3MF, gere uma consulta para IA e aplique apenas as recomendações que você aprovar.</p>
            <Link href="/configuracao">Começar configuração <span>→</span></Link>
          </article>
          <aside>
            <strong>Como funciona</strong>
            <ol>
              <li><span>1</span><p><b>Envie o 3MF</b><small>O arquivo é analisado localmente.</small></p></li>
              <li><span>2</span><p><b>Consulte sua IA</b><small>Copie o prompt pronto.</small></p></li>
              <li><span>3</span><p><b>Revise e baixe</b><small>Aplique somente o que quiser.</small></p></li>
            </ol>
          </aside>
        </div>
      </section>
    </main>
  );
}
