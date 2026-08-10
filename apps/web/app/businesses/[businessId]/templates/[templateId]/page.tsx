import Link from "next/link";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { SessionProcessor } from "../../../../components/session-processor";
import { getLocale, getMessages } from "../../../../../lib/i18n";
import { getTemplateDetailData } from "../../../../../lib/services";

export default async function TemplateDetailPage({ params }: { params: Promise<{ businessId: string; templateId: string }> }) {
  const { businessId, templateId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const data = await getTemplateDetailData({ businessId, templateId });

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}/templates/${templateId}`}
      section={data.business.name}
      title={data.preset.name}
      subtitle={messages.templateDetail.uploadBody}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: false },
        { label: data.preset.name, href: `/businesses/${businessId}/templates/${templateId}`, active: true },
      ]}
    >
      <section className="template-layout">
        <SessionProcessor
          businessId={businessId}
          preset={data.preset}
          uploadLabels={{ ...messages.templateDetail, process: messages.templateDetail.process }}
        />
        <article className="focus-panel info-panel stack">
          <div className="template-info-header">
            <div className="template-info-header__row">
              <span className="status-badge">{messages.templateDetail.templateInfo}</span>
              <Link className="button secondary template-info-header__action" href={`/businesses/${businessId}/templates/${templateId}/edit`}>Edit</Link>
            </div>
          </div>
          <div className="info-block"><strong>{messages.business.documentType}</strong><span>{data.preset.documentType}</span></div>
          <div className="info-block"><strong>{messages.business.columns}</strong><span>{data.preset.definition.columns.map((column) => column.label).join(", ")}</span></div>
          <div className="info-block"><strong>{messages.templateForm.instructions}</strong><span>{data.preset.definition.instructionText}</span></div>
          <div className="info-block"><strong>{messages.templateForm.ignoreRules}</strong><span>{data.preset.definition.ignoreRules || messages.review.none}</span></div>
        </article>
      </section>
    </DashboardShell>
  );
}
