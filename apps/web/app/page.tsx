import Link from "next/link";
import { DashboardShell } from "./components/dashboard-shell";
import { getDashboardData } from "../lib/services";
import { getLocale, getMessages } from "../lib/i18n";

export default async function HomePage() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const data = await getDashboardData();

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath="/"
      section={messages.nav.businesses}
      title={messages.home.title}
      subtitle={messages.home.subtitle}
      navItems={[{ label: messages.nav.businesses, href: "/", active: true }]}
    >
      <section className="card-grid">
        {data.businesses.map(({ business, role, templates, jobs }) => (
          <article key={business.id} className="dashboard-card">
            <div className="card-topline">
              <span className="status-badge">{role}</span>
              <span className="soft-label">
                {templates.length} {messages.home.templateCount}
              </span>
            </div>
            <div className="stack tight">
              <h2>{business.name}</h2>
              <p className="card-slug">{business.slug}</p>
            </div>
            <div className="card-metrics">
              <div>
                <strong>{templates.length}</strong>
                <span>{messages.home.templateCount}</span>
              </div>
              <div>
                <strong>{jobs.length}</strong>
                <span>{messages.home.jobCount}</span>
              </div>
            </div>
            <Link className="button" href={`/businesses/${business.id}`}>
              {messages.home.openWorkspace}
            </Link>
          </article>
        ))}
      </section>
    </DashboardShell>
  );
}
