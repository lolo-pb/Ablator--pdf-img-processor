import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale, Messages } from "../../lib/i18n";
import { shouldUseSupabase } from "../../lib/runtime";
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
  const usingLocalData = !shouldUseSupabase();

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-card">
          <div className="brand-badge" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img">
              <path d="M8 7.5h9a5.5 5.5 0 0 1 0 11H8z" />
              <path d="M8 13.5h10.5a5.5 5.5 0 0 1 0 11H8z" />
            </svg>
          </div>
          <div className="brand-copy">
            <strong>{messages.brand.name}</strong>
            <span className="brand-copy__subtitle">{messages.brand.subtitle}</span>
            <span>{section}</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item) =>
            item.href ? (
              <Link
                key={`${item.label}-${item.href}`}
                className={`sidebar-link ${item.active ? "is-active" : ""}`}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
              >
                <span className="sidebar-link__indicator" aria-hidden="true" />
                <span>{item.label}</span>
                <span className="sidebar-link__chevron" aria-hidden="true">›</span>
              </Link>
            ) : (
              <span key={item.label} className={`sidebar-link ${item.active ? "is-active" : ""}`}>
                <span className="sidebar-link__indicator" aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            ),
          )}
        </nav>
        {usingLocalData ? <div className="sidebar-warning">{messages.nav.localWarning}</div> : null}
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
        <div className="dashboard-page">{children}</div>
      </section>
    </main>
  );
}
