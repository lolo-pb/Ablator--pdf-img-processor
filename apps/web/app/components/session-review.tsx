"use client";

import Link from "next/link";
import { ReviewClient } from "./review-client";
import { useSessionBatch } from "./session-batch";

type SessionReviewProps = {
  businessId: string;
  templateId: string;
  messages: {
    export: string;
    confidence: string;
    viewed: string;
    reviewFailed: string;
  };
};

export function SessionReview(props: SessionReviewProps) {
  const { batch } = useSessionBatch();
  const matchesRoute = batch?.businessId === props.businessId && batch.preset.id === props.templateId;
  if (!batch || !matchesRoute) {
    return (
      <section className="empty-state">
        <h2>Review unavailable</h2>
        <p>This session has no active batch. Upload files again to create a review.</p>
        <Link className="button" href={`/businesses/${props.businessId}/templates/${props.templateId}`}>Return to upload</Link>
      </section>
    );
  }

  return (
    <section className="stack">
      {batch.warnings.map((warning, index) => <p className="muted" key={index}>{warning}</p>)}
      <ReviewClient businessId={props.businessId} preset={batch.preset} initialRows={batch.rows} messages={props.messages} />
    </section>
  );
}
