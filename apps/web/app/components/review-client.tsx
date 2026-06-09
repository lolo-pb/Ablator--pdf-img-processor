"use client";

import { useState, useTransition } from "react";
import type { NormalizedTemplateRow, OutputColumn, Preset, TemplateCellValue } from "@bank/domain";

type Messages = {
  markReady: string;
  export: string;
  title: string;
  reviewComplete: string;
  confidence: string;
  status: string;
  reviewSaved: string;
  reviewFailed: string;
};

type ReviewClientProps = {
  businessId: string;
  jobId: string;
  preset: Preset;
  initialRows: NormalizedTemplateRow[];
  initialReviewCompleted: boolean;
  messages: Messages;
};

type EditableRow = {
  id: string;
  values: Record<string, TemplateCellValue>;
  reviewStatus: "pending" | "edited" | "approved";
  confidence: number;
};

function mapRows(rows: NormalizedTemplateRow[]): EditableRow[] {
  return rows.map((row) => ({
    id: row.id,
    values: row.values,
    reviewStatus: row.reviewStatus,
    confidence: row.confidence,
  }));
}

function parseValue(value: string, column: OutputColumn): TemplateCellValue {
  if (value === "") return null;
  if (column.type === "number" || column.type === "money") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return value;
}

function renderValue(value: TemplateCellValue) {
  return value === null ? "" : String(value);
}

function inputType(column: OutputColumn) {
  if (column.type === "date") return "date";
  if (column.type === "number" || column.type === "money") return "number";
  return "text";
}

function inputStep(column: OutputColumn) {
  return column.type === "money" ? "0.01" : undefined;
}

export function ReviewClient(props: ReviewClientProps) {
  const [rows, setRows] = useState<EditableRow[]>(mapRows(props.initialRows));
  const [message, setMessage] = useState<string>("");
  const [isReady, setIsReady] = useState(props.initialReviewCompleted);
  const [isPending, startTransition] = useTransition();

  function updateValue(id: string, column: OutputColumn, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              values: {
                ...row.values,
                [column.key]: parseValue(value, column),
              },
            }
          : row,
      ),
    );
  }

  function updateStatus(id: string, reviewStatus: EditableRow["reviewStatus"]) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, reviewStatus } : row)),
    );
  }

  function save(approvalState: "in_progress" | "ready_for_export") {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/businesses/${props.businessId}/jobs/${props.jobId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: rows.map(({ id, values, reviewStatus }) => ({ id, values, reviewStatus })),
          approvalState,
        }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? props.messages.reviewFailed);
        return;
      }

      setIsReady(approvalState === "ready_for_export");
      setMessage(payload.message ?? props.messages.reviewSaved);
    });
  }

  const exportColumns = [...props.preset.definition.columns.map((column) => column.key), "confidence"];
  const exportUrl = `/api/businesses/${props.businessId}/jobs/${props.jobId}/export?columns=${encodeURIComponent(
    exportColumns.join(","),
  )}&workbookName=${encodeURIComponent(props.preset.name.replace(/\s+/g, " "))}`;

  return (
    <div className="focus-panel review-panel stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack tight">
          <h2>{props.messages.title}</h2>
          {message ? <p className="muted">{message}</p> : null}
        </div>
        <div className="row">
          <button type="button" onClick={() => save("ready_for_export")} disabled={isPending}>
            {props.messages.markReady}
          </button>
          <a className={`button ${!isReady ? "is-disabled" : ""}`} href={isReady ? exportUrl : undefined} aria-disabled={!isReady}>
            {props.messages.export}
          </a>
        </div>
      </div>

      {isReady ? <div className="alert-chip">{props.messages.reviewComplete}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {props.preset.definition.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>{props.messages.confidence}</th>
              <th>{props.messages.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {props.preset.definition.columns.map((column) => (
                  <td key={column.key}>
                    <input
                      type={inputType(column)}
                      step={inputStep(column)}
                      value={renderValue(row.values[column.key] ?? null)}
                      onChange={(event) => updateValue(row.id, column, event.target.value)}
                    />
                  </td>
                ))}
                <td>{Math.round(row.confidence * 100)}%</td>
                <td>
                  <select value={row.reviewStatus} onChange={(event) => updateStatus(row.id, event.target.value as EditableRow["reviewStatus"])}>
                    <option value="pending">pending</option>
                    <option value="edited">edited</option>
                    <option value="approved">approved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
