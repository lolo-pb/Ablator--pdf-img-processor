import { TemplateEditorPage } from "../../../../components/template-editor-page";
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
    <TemplateEditorPage
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}/templates/new`}
      section={workspace.business.name}
      businessId={workspace.business.id}
      cancelHref={`/businesses/${businessId}`}
      title={messages.templateForm.title}
      subtitle={messages.templateForm.subtitle}
      activeLabel={messages.nav.createTemplate}
    />
  );
}
