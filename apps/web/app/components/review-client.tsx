"use client";

import { useState, useTransition } from "react";
import type { NormalizedTransactionRow, Preset } from "@bank/domain";

type Messages = {
  markReady: string;
  export: string;
  title: string;
  reviewComplete: string;
  confidence: string;
  status: string;
  notes: string;
  date: string;
  description: string;
  amount: string;
  direction: string;
  category: string;
  reviewSaved: string;
  reviewFailed: string;
};

type ReviewClientProps = {
  businessId: string;
  jobId: string;
  preset: Preset;
  initialRows: NormalizedTransactionRow[];
  initialReviewCompleted: boolean;
  messages: Messages;
};

type EditableRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  direction: "debit" | "credit";
  notes: string;
  reviewStatus: "pending" | "edited" | "approved";
  confidence: number;
};

function mapRows(rows: NormalizedTransactionRow[]): EditableRow[] {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    amount: row.amount,
    category: row.category,
    direction: row.direction,
    notes: row.notes,
    reviewStatus: row.reviewStatus,
    confidence: row.confidence.overall,
  }));
}

export function ReviewClient(props: ReviewClientProps) {
  const [rows, setRows] = useState<EditableRow[]>(mapRows(props.initialRows));
  const [message, setMessage] = useState<string>("");
  const [isReady, setIsReady] = useState(props.initialReviewCompleted);
  const [isPending, startTransition] = useTransition();

  function updateRow(id: string, field: keyof EditableRow, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === "amount" ? Number(value) : value,
            }
          : row,
      ),
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
          rows,
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

  const exportUrl = `/api/businesses/${props.businessId}/jobs/${props.jobId}/export?columns=${encodeURIComponent(
    props.preset.definition.columns.map((column) => column.key).join(","),
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
              <th>{props.messages.date}</th>
              <th>{props.messages.description}</th>
              <th>{props.messages.amount}</th>
              <th>{props.messages.direction}</th>
              <th>{props.messages.category}</th>
              <th>{props.messages.notes}</th>
              <th>{props.messages.confidence}</th>
              <th>{props.messages.status}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input value={row.date} onChange={(event) => updateRow(row.id, "date", event.target.value)} />
                </td>
                <td>
                  <input value={row.description} onChange={(event) => updateRow(row.id, "description", event.target.value)} />
                </td>
                <td>
                  <input type="number" step="0.01" value={row.amount} onChange={(event) => updateRow(row.id, "amount", event.target.value)} />
                </td>
                <td>
                  <select value={row.direction} onChange={(event) => updateRow(row.id, "direction", event.target.value)}>
                    <option value="debit">debit</option>
                    <option value="credit">credit</option>
                  </select>
                </td>
                <td>
                  <select value={row.category} onChange={(event) => updateRow(row.id, "category", event.target.value)}>
                    {props.preset.definition.classificationCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input value={row.notes} onChange={(event) => updateRow(row.id, "notes", event.target.value)} />
                </td>
                <td>{Math.round(row.confidence * 100)}%</td>
                <td>
                  <select value={row.reviewStatus} onChange={(event) => updateRow(row.id, "reviewStatus", event.target.value)}>
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
