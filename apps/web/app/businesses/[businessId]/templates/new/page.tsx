import { DashboardShell } from "../../../../components/dashboard-shell";
import { TemplateForm } from "../../../../components/template-form";
import { getBusinessWorkspace } from "../../../../../lib/services";
import { getLocale, getMessages } from "../../../../../lib/i18n";

export default async function NewTemplatePage({
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
      currentPath={`/businesses/${businessId}/templates/new`}
      section={workspace.business.name}
      title={messages.templateForm.title}
      subtitle={messages.templateForm.subtitle}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: false },
        { label: messages.nav.createTemplate, href: `/businesses/${businessId}/templates/new`, active: true },
      ]}
    >
      <section className="focus-panel form-panel">
        <TemplateForm
          businessId={workspace.business.id}
          cancelHref={`/businesses/${businessId}`}
          messages={{
            ...messages.templateForm,
            cancel: messages.actions.cancel,
          }}
        />
      </section>
    </DashboardShell>
  );
}
