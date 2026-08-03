"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NormalizedTemplateRow, Preset } from "@bank/domain";
import { useSessionBatch } from "./session-batch";
import { UploadPicker } from "./upload-picker";

type SessionProcessorProps = {
  businessId: string;
  preset: Preset;
  uploadLabels: {
    browseFiles: string;
    dropPrompt: string;
    fileTypesHint: string;
    removeFile: string;
    selectedFiles: string;
    process: string;
  };
};

export function SessionProcessor(props: SessionProcessorProps) {
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { setBatch } = useSessionBatch();

  async function processFiles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/${props.businessId}/templates/${props.preset.id}/process`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      if (!response.ok) throw new Error("Processing failed.");
      const payload = (await response.json()) as { rows: NormalizedTemplateRow[]; warnings: string[] };
      setBatch({ businessId: props.businessId, preset: props.preset, rows: payload.rows, warnings: payload.warnings });
      router.push(`/businesses/${props.businessId}/templates/${props.preset.id}/review`);
    } catch {
      setError("Could not process the selected documents.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="stack">
      <article className="focus-panel upload-panel">
        <form onSubmit={processFiles} className="stack">
          <UploadPicker
            name="documents"
            accept=".pdf,image/*"
            multiple={true}
            required={true}
            labels={props.uploadLabels}
          />
          <button type="submit" disabled={isProcessing}>{props.uploadLabels.process}</button>
        </form>
        {error ? <p className="muted">{error}</p> : null}
      </article>
    </section>
  );
}
