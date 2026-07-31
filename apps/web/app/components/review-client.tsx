"use client";

import { useState, useTransition } from "react";
import type { NormalizedTemplateRow, OutputColumn, Preset, TemplateCellValue } from "@bank/domain";

type Messages = {
  export: string;
  confidence: string;
  viewed: string;
  reviewFailed: string;
};

type ReviewClientProps = {
  businessId: string;
  jobId: string;
  preset: Preset;
  initialRows: NormalizedTemplateRow[];
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

function normalizeDateValue(value: TemplateCellValue) {
  if (typeof value !== "string") return value === null ? "" : String(value);

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return value;

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return `${normalizedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return value;
}

function renderValue(value: TemplateCellValue, column: OutputColumn) {
  if (column.type === "date") {
    return normalizeDateValue(value);
  }
  return value === null ? "" : String(value);
}

function inputType(column: OutputColumn) {
  if (column.type === "date") return "date";
  if (column.type === "number" || column.type === "money") return "text";
  return "text";
}

function inputStep(column: OutputColumn) {
  return column.type === "money" ? "0.01" : undefined;
}

function inputMode(column: OutputColumn) {
  if (column.type === "number" || column.type === "money") return "decimal";
  return undefined;
}

export function ReviewClient(props: ReviewClientProps) {
  const [rows, setRows] = useState<EditableRow[]>(mapRows(props.initialRows));
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function updateValue(id: string, column: OutputColumn, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              reviewStatus: "edited",
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

  const exportColumns = [...props.preset.definition.columns.map((column) => column.key), "confidence"];
  const exportUrl = `/api/businesses/${props.businessId}/jobs/${props.jobId}/export?columns=${encodeURIComponent(
    exportColumns.join(","),
  )}&workbookName=${encodeURIComponent(props.preset.name.replace(/\s+/g, " "))}`;

  function exportReview() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/businesses/${props.businessId}/jobs/${props.jobId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: rows.map(({ id, values, reviewStatus }) => ({ id, values, reviewStatus })),
        }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? props.messages.reviewFailed);
        return;
      }

      window.location.assign(exportUrl);
    });
  }

  return (
    <div className="focus-panel review-panel stack">
      <div className="review-toolbar">
        <div className="stack tight review-toolbar__copy">
          <div className="row review-toolbar__meta">
            <span className="status-badge">{rows.length}</span>
          </div>
          {message ? <p className="muted review-toolbar__message">{message}</p> : null}
        </div>
        <div className="row review-toolbar__actions">
          <button type="button" onClick={exportReview} disabled={isPending}>
            {props.messages.export}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              {props.preset.definition.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>{props.messages.confidence}</th>
              <th>{props.messages.viewed}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {props.preset.definition.columns.map((column) => (
                  <td key={column.key}>
                    <input
                      className="review-table__input"
                      type={inputType(column)}
                      inputMode={inputMode(column)}
                      step={inputStep(column)}
                      value={renderValue(row.values[column.key] ?? null, column)}
                      onChange={(event) => updateValue(row.id, column, event.target.value)}
                    />
                  </td>
                ))}
                <td className="review-table__confidence">{Math.round(row.confidence * 100)}%</td>
                <td className="review-table__status">
                  <label className="review-table__checkbox">
                    <input
                      type="checkbox"
                      checked={row.reviewStatus === "approved"}
                      onChange={(event) => updateStatus(row.id, event.target.checked ? "approved" : "pending")}
                    />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
