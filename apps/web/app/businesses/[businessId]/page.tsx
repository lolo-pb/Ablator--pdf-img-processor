import Link from "next/link";
import { DashboardShell } from "../../components/dashboard-shell";
import { getBusinessWorkspace } from "../../../lib/services";
import { getLocale, getMessages } from "../../../lib/i18n";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const workspace = await getBusinessWorkspace(businessId);

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}`}
      section={workspace.business.name}
      title={messages.business.title}
      subtitle={messages.business.subtitle}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: true },
        { label: messages.nav.createTemplate, href: `/businesses/${businessId}/templates/new`, active: false },
      ]}
    >
      <section className="toolbar toolbar-end">
        <Link className="button" href={`/businesses/${businessId}/templates/new`}>
          {messages.nav.createTemplate}
        </Link>
      </section>

      {workspace.templates.length === 0 ? (
        <section className="empty-state">
          <h2>{messages.business.emptyTitle}</h2>
          <p>{messages.business.emptyBody}</p>
          <Link className="button" href={`/businesses/${businessId}/templates/new`}>
            {messages.nav.createTemplate}
          </Link>
        </section>
      ) : (
        <section className="card-grid template-grid">
          {workspace.templates.map((template) => (
            <article key={template.id} className="dashboard-card template-card file-card">
              <div className="stack tight">
                <h2>{template.name}</h2>
                <p>{template.documentType}</p>
              </div>
              <div className="template-meta">
                <strong>{messages.business.categories}</strong>
                <span>{template.definition.classificationCategories.join(", ")}</span>
              </div>
              <div className="template-meta">
                <strong>{messages.business.updatedAt}</strong>
                <span>{new Date(template.updatedAt).toLocaleDateString(locale)}</span>
              </div>
              <Link className="button" href={`/businesses/${businessId}/templates/${template.id}`}>
                {messages.business.openTemplate}
              </Link>
            </article>
          ))}
        </section>
      )}
    </DashboardShell>
  );
}
