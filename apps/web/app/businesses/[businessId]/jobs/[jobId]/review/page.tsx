import type { ExtractedRow, SourceDocument } from "@bank/domain";
import { DashboardShell } from "../../../../../components/dashboard-shell";
import { ReviewClient } from "../../../../../components/review-client";
import { getLocale, getMessages } from "../../../../../../lib/i18n";
import { getJobReviewData, getTemplateRoute } from "../../../../../../lib/services";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const { businessId, jobId } = await params;
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const data = await getJobReviewData(businessId, jobId);
  const rows = data.rows.map((row: ExtractedRow) => row.normalized);

  return (
    <DashboardShell
      locale={locale}
      messages={messages}
      currentPath={`/businesses/${businessId}/jobs/${jobId}/review`}
      section={data.business.name}
      title={messages.review.title}
      subtitle={messages.review.subtitle}
      navItems={[
        { label: messages.nav.businesses, href: "/", active: false },
        { label: messages.nav.templates, href: `/businesses/${businessId}`, active: false },
        { label: data.preset.name, href: getTemplateRoute(businessId, data.preset.id, jobId), active: false },
        { label: messages.nav.review, href: `/businesses/${businessId}/jobs/${jobId}/review`, active: true },
      ]}
    >

      <section className="review-layout">
        {rows.length > 0 ? (
          <ReviewClient
            businessId={businessId}
            jobId={jobId}
            preset={data.preset}
            initialRows={rows}
            initialReviewCompleted={Boolean(data.job.reviewCompletedAt)}
            messages={{
              title: messages.review.title,
              markReady: messages.review.markReady,
              export: messages.review.export,
              reviewComplete: messages.review.reviewComplete,
              confidence: messages.review.confidence,
              status: messages.review.status,
              notes: messages.review.notes,
              date: messages.review.date,
              description: messages.review.description,
              amount: messages.review.amount,
              direction: messages.review.direction,
              category: messages.review.category,
              reviewSaved: messages.review.reviewSaved,
              reviewFailed: messages.review.reviewFailed,
            }}
          />
        ) : (
          <section className="focus-panel">
            <p>{messages.review.noRows}</p>
          </section>
        )}

        <article className="focus-panel info-panel stack review-sidebar">
          <div className="stack tight">
            <span className="status-badge">{messages.review.jobSummary}</span>
            <h2>{data.preset.name}</h2>
          </div>
          <div className="info-block">
            <strong>{messages.review.warnings}</strong>
            <span>{data.job.warnings.length ? data.job.warnings.join(" | ") : messages.review.none}</span>
          </div>
          <div className="info-block">
            <strong>{messages.review.uploadedFiles}</strong>
            <ul className="file-list">
              {data.documents.map((document: SourceDocument) => (
                <li key={document.id}>
                  <span>{document.filename}</span>
                  <small>{document.status}</small>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
