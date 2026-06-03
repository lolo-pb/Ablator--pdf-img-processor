import Link from "next/link";
import { processJobAction } from "../../../../actions";
import { getJobReviewData } from "../../../../../lib/services";
import type { ExtractedRow, SourceDocument } from "@bank/domain";
import { ReviewClient } from "./review-client";

export default async function JobPage({
  params,
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const { businessId, jobId } = await params;
  const data = await getJobReviewData(businessId, jobId);
  const rows = data.rows.map((row: ExtractedRow) => row.normalized);

  return (
    <main className="grid">
      <section className="hero">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="pill">{data.job.status}</span>
            <h1>{data.preset.name}</h1>
            <p>{data.documents.length} uploaded source file(s). Processing stays page-oriented and export requires review completion.</p>
          </div>
          <Link className="button secondary" href={`/businesses/${businessId}`}>
            Back to workspace
          </Link>
        </div>
      </section>

      <section className="grid cols-2">
        <div className="panel stack">
          <h2>Job summary</h2>
          <div className="status">Created {new Date(data.job.createdAt).toLocaleString()}</div>
          <div className="muted">Preset version: v{data.preset.version}</div>
          <div className="muted">Warnings: {data.job.warnings.length ? data.job.warnings.join(" | ") : "none"}</div>
          <ul>
            {data.documents.map((document: SourceDocument) => (
              <li key={document.id}>
                {document.filename} · {document.mimeType} · {document.status}
              </li>
            ))}
          </ul>
          {data.job.status === "uploaded" ? (
            <form action={processJobAction}>
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="jobId" value={jobId} />
              <button type="submit">Process with AI</button>
            </form>
          ) : null}
        </div>

        <div className="panel stack">
          <h2>Preset instructions</h2>
          <div className="muted">{data.preset.definition.instructionText}</div>
          <div className="muted">Ignore: {data.preset.definition.ignoreRules.join(", ")}</div>
          <div className="muted">Categories: {data.preset.definition.classificationCategories.join(", ")}</div>
        </div>
      </section>

      {rows.length > 0 ? (
        <ReviewClient
          businessId={businessId}
          jobId={jobId}
          preset={data.preset}
          initialRows={rows}
          initialReviewCompleted={Boolean(data.job.reviewCompletedAt)}
        />
      ) : (
        <section className="panel">
          <p className="muted">No extracted rows yet. Run processing first.</p>
        </section>
      )}
    </main>
  );
}
