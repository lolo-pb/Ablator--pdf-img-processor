import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale, Messages } from "../../lib/i18n";
import { LanguageSwitcher } from "./language-switcher";

export function DashboardShell({
  locale,
  messages,
  currentPath,
  section,
  title,
  subtitle,
  navItems,
  children,
}: {
  locale: Locale;
  messages: Messages;
  currentPath: string;
  section: string;
  title: string;
  subtitle: string;
  navItems: Array<{ label: string; href?: string; active?: boolean }>;
  children: ReactNode;
}) {
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-card">
          <div className="brand-badge">{messages.brand.name}</div>
          <div className="brand-copy">
            <strong>{messages.brand.subtitle}</strong>
            <span>{section}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) =>
            item.href ? (
              <Link key={`${item.label}-${item.href}`} className={`sidebar-link ${item.active ? "is-active" : ""}`} href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className={`sidebar-link ${item.active ? "is-active" : ""}`}>
                {item.label}
              </span>
            ),
          )}
        </nav>
        <LanguageSwitcher currentPath={currentPath} locale={locale} label={messages.nav.switchLanguage} />
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div className="stack tight">
            <span className="eyebrow">{section}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
