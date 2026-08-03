import { DashboardShell } from "../../../../../components/dashboard-shell";
import { SessionReview } from "../../../../../components/session-review";
import { getLocale, getMessages } from "../../../../../../lib/i18n";
import { getTemplateDetailData } from "../../../../../../lib/services";

export default async function ReviewPage({ params }: { params: Promise<{ businessId: string; templateId: string }> }) {
  const { businessId, templateId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const data = await getTemplateDetailData({ businessId, templateId });

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}/templates/${templateId}/review`}
      section={data.business.name}
      title={messages.review.title}
      subtitle={data.preset.name}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: false },
        { label: data.preset.name, href: `/businesses/${businessId}/templates/${templateId}`, active: false },
        { label: messages.nav.review, href: `/businesses/${businessId}/templates/${templateId}/review`, active: true },
      ]}
    >
      <SessionReview businessId={businessId} templateId={templateId} messages={messages.review} />
    </DashboardShell>
  );
}
