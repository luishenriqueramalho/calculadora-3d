"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { PrintProjectProvider } from "./PrintProjectProvider";
import styles from "./AppShell.module.css";

const items = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/calculadora", label: "Calculadora", icon: "▦" },
  { href: "/configuracao", label: "Configuração da impressão", icon: "⚙" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <PrintProjectProvider>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link href="/" className={styles.brand} onClick={() => setMenuOpen(false)}>
            <span className={styles.mark} aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m12 2.8 8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4L12 2.8Z"/><path d="m4.2 7.7 7.8 4.4 7.8-4.4M12 12.1v9"/></svg>
            </span>
            <span><strong>PrintLab 3D</strong><small>Custos e impressão inteligente</small></span>
          </Link>

          <button
            className={styles.menuButton}
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span /><span />
          </button>

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Menu principal">
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? styles.active : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <span aria-hidden="true">{item.icon}</span>{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </PrintProjectProvider>
  );
}
