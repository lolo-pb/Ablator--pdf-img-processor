import type { SourceDocument } from "@bank/domain";
import { processTemplateAction } from "../../../../actions";
import { DashboardShell } from "../../../../components/dashboard-shell";
import { getLocale, getMessages } from "../../../../../lib/i18n";
import { getTemplateDetailData, getReviewRoute } from "../../../../../lib/services";

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string; templateId: string }>;
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { businessId, templateId } = await params;
  const { jobId } = await searchParams;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const data = await getTemplateDetailData({ businessId, templateId, jobId });

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath={jobId ? `/businesses/${businessId}/templates/${templateId}?jobId=${jobId}` : `/businesses/${businessId}/templates/${templateId}`}
      section={data.business.name}
      title={data.preset.name}
      subtitle={messages.templateDetail.uploadBody}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: false },
        { label: data.preset.name, href: `/businesses/${businessId}/templates/${templateId}`, active: true },
        ...(data.job ? [{ label: messages.nav.review, href: getReviewRoute(businessId, data.job.id), active: false }] : []),
      ]}
    >
      <section className="template-layout">
        <article className="focus-panel upload-panel">
          <div className="stack tight">
            <span className="status-badge">{messages.templateDetail.uploadTitle}</span>
            <h2>{messages.templateDetail.uploadTitle}</h2>
            <p>{messages.templateDetail.replaceHint}</p>
          </div>

          <form action={processTemplateAction} className="stack">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="presetId" value={templateId} />
            <input type="hidden" name="jobId" value={data.job?.id ?? ""} />
            <label className="dropzone">
              <span className="dropzone__icon">+</span>
              <span className="dropzone__title">{messages.templateDetail.uploadTitle}</span>
              <span className="dropzone__body">{messages.templateDetail.uploadBody}</span>
              <input name="documents" type="file" accept=".pdf,image/*" multiple={!data.job} required={!data.job} />
            </label>
            <button type="submit">{messages.templateDetail.process}</button>
          </form>
        </article>

        <article className="focus-panel info-panel stack">
          <div className="stack tight">
            <span className="status-badge">{messages.templateDetail.templateInfo}</span>
            <h2>{messages.templateDetail.templateInfo}</h2>
          </div>
          <div className="info-block">
            <strong>{messages.business.family}</strong>
            <span>{data.preset.documentFamily}</span>
          </div>
          <div className="info-block">
            <strong>{messages.business.categories}</strong>
            <span>{data.preset.definition.classificationCategories.join(", ")}</span>
          </div>
          <div className="info-block">
            <strong>{messages.templateForm.instructions}</strong>
            <span>{data.preset.definition.instructionText}</span>
          </div>
          <div className="info-block">
            <strong>{messages.templateDetail.currentFiles}</strong>
            {data.documents.length > 0 ? (
              <ul className="file-list">
                {data.documents.map((document: SourceDocument) => (
                  <li key={document.id}>
                    <span>{document.filename}</span>
                    <small>{document.status}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <span>{messages.templateDetail.noFiles}</span>
            )}
          </div>
          {data.job?.status === "review_required" ? <div className="alert-chip">{messages.templateDetail.latestReview}</div> : null}
        </article>
      </section>
    </DashboardShell>
  );
}
