import { TemplateEditorPage } from "../../../../../components/template-editor-page";
import { getLocale, getMessages } from "../../../../../../lib/i18n";
import { getTemplateDetailData } from "../../../../../../lib/services";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ businessId: string; templateId: string }>;
}) {
  const { businessId, templateId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const data = await getTemplateDetailData({ businessId, templateId });

  return (
    <TemplateEditorPage
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}/templates/${templateId}/edit`}
      section={data.business.name}
      businessId={data.business.id}
      cancelHref={`/businesses/${businessId}/templates/${templateId}`}
      title={messages.templateForm.editTitle}
      subtitle={messages.templateForm.editSubtitle}
      activeLabel={messages.nav.editTemplate}
      initialPreset={data.preset}
      templateHref={`/businesses/${businessId}/templates/${templateId}`}
      submitLabel={messages.templateForm.saveNewVersion}
    />
  );
}
