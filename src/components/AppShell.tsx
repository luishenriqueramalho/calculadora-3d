"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { BusinessProvider } from "./BusinessProvider";
import { PrintProjectProvider } from "./PrintProjectProvider";
import styles from "./AppShell.module.css";

const mainItems = [
  { href: "/painel", label: "Visão geral", icon: "⌂" },
  { href: "/faturamentos", label: "Faturamentos", icon: "↗" },
  { href: "/projetos", label: "Encomendas", icon: "▣" },
  { href: "/filamentos", label: "Filamentos", icon: "◉" },
  { href: "/compras", label: "Compras", icon: "▤" },
  { href: "/catalogo", label: "Catálogo", icon: "◇" },
  { href: "/lojas", label: "Canais de venda", icon: "◎" },
];
const toolItems = [
  { href: "/calculadora", label: "Calculadora de custos", icon: "▦" },
  { href: "/calculos", label: "Cálculos salvos", icon: "≡" },
  { href: "/configuracao", label: "Preparar impressão", icon: "⚙" },
  { href: "/equipe", label: "Equipe", icon: "♙" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; storeName: string; role?: "owner" | "member" } | null>(null);
  const isPublic = pathname === "/" || pathname === "/login" || pathname === "/cadastro";
  useEffect(() => {
    if (isPublic) return;
    void fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then((data) => data?.user && setUser(data.user));
  }, [isPublic]);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  const renderLink = (item: (typeof mainItems)[number]) => (
    <Link key={item.href} href={item.href} className={isActive(item.href) ? styles.active : ""} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
      <span aria-hidden="true">{item.icon}</span>{item.label}
    </Link>
  );
  if (isPublic) return children;

  return (
    <BusinessProvider>
      <PrintProjectProvider>
        <div className={styles.app}>
          <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
            <Link href="/painel" className={styles.brand} onClick={() => setMenuOpen(false)}>
              <span className={styles.mark} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2.8 8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4L12 2.8Z"/><path d="m4.2 7.7 7.8 4.4 7.8-4.4M12 12.1v9"/></svg></span>
              <span><strong>PrintLab 3D</strong><small>Gestão para makers</small></span>
            </Link>
            <nav className={styles.nav} aria-label="Menu principal">
              <span className={styles.navLabel}>Gestão</span>{mainItems.map(renderLink)}
              <span className={styles.navLabel}>Ferramentas</span>{toolItems.map(renderLink)}
            </nav>
            <div className={styles.sidebarFooter}><span><i /> Sistema operacional</span><small>Seus dados são sincronizados quando o MongoDB está configurado.</small></div>
          </aside>
          <div className={styles.body}>
            <header className={styles.topbar}>
              <button className={styles.menuButton} type="button" aria-label="Abrir menu" onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
              <span className={styles.workspaceName}><i /><span>Espaço de trabalho · {user?.storeName ?? "Minha empresa 3D"}</span></span>
              <div className={styles.account}><button type="button" aria-label="Sair" title="Sair" onClick={() => void logout()}>↪</button><span className={styles.accountCopy}><strong>{user?.name ?? "Administrador"}</strong><small>{user?.role === "member" ? "Membro da equipe" : "Conta principal"}</small></span><span className={styles.avatar}>{user?.name?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "AD"}</span></div>
            </header>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </PrintProjectProvider>
    </BusinessProvider>
  );
}
