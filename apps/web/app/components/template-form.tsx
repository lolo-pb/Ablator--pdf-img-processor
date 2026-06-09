"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPresetAction } from "../actions";

type ColumnType = "date" | "number" | "money" | "custom";

type DraftColumn = {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  required: boolean;
};

type TemplateFormMessages = {
  name: string;
  documentType: string;
  columns: string;
  addColumn: string;
  columnLabel: string;
  columnKey: string;
  columnType: string;
  required: string;
  removeColumn: string;
  moveUp: string;
  moveDown: string;
  typeDate: string;
  typeNumber: string;
  typeMoney: string;
  typeCustom: string;
  instructions: string;
  ignoreRules: string;
  submit: string;
  cancel: string;
};

type TemplateFormProps = {
  businessId: string;
  cancelHref: string;
  messages: TemplateFormMessages;
};

const initialColumns: DraftColumn[] = [
  { id: "date", key: "date", label: "Date", type: "date", required: true },
  { id: "description", key: "description", label: "Description", type: "custom", required: true },
  { id: "total", key: "total", label: "Total", type: "money", required: true },
];

function toKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function moveColumn(columns: DraftColumn[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= columns.length) return columns;
  const next = [...columns];
  const [column] = next.splice(index, 1);
  next.splice(nextIndex, 0, column);
  return next;
}

export function TemplateForm({ businessId, cancelHref, messages }: TemplateFormProps) {
  const [columns, setColumns] = useState<DraftColumn[]>(initialColumns);

  const serializedColumns = useMemo(
    () =>
      JSON.stringify(
        columns.map(({ key, label, type, required }) => ({
          key,
          label,
          type,
          required,
        })),
      ),
    [columns],
  );
  const keys = columns.map((column) => column.key);
  const hasDuplicateKeys = new Set(keys).size !== keys.length;
  const hasInvalidColumns = columns.length === 0 || columns.some((column) => !column.key || !column.label) || hasDuplicateKeys;

  function updateColumn(id: string, patch: Partial<DraftColumn>) {
    setColumns((current) =>
      current.map((column) => (column.id === id ? { ...column, ...patch } : column)),
    );
  }

  function addColumn() {
    const id = `column-${Date.now()}`;
    setColumns((current) => [
      ...current,
      { id, key: "", label: "", type: "custom", required: false },
    ]);
  }

  return (
    <form action={createPresetAction} className="stack">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="columnsJson" value={serializedColumns} />

      <label>
        {messages.name}
        <input name="name" defaultValue="Document Extractor" required />
      </label>
      <label>
        {messages.documentType}
        <input name="documentType" defaultValue="orders" required />
      </label>

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{messages.columns}</h2>
          <button type="button" className="secondary" onClick={addColumn}>
            {messages.addColumn}
          </button>
        </div>

        <div className="column-builder stack">
          {columns.map((column, index) => (
            <div className="column-builder__row" key={column.id}>
              <label>
                {messages.columnLabel}
                <input
                  value={column.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    updateColumn(column.id, {
                      label,
                      key: column.key ? column.key : toKey(label),
                    });
                  }}
                  required
                />
              </label>
              <label>
                {messages.columnKey}
                <input
                  value={column.key}
                  onChange={(event) => updateColumn(column.id, { key: toKey(event.target.value) })}
                  required
                />
              </label>
              <label>
                {messages.columnType}
                <select
                  value={column.type}
                  onChange={(event) => updateColumn(column.id, { type: event.target.value as ColumnType })}
                >
                  <option value="date">{messages.typeDate}</option>
                  <option value="number">{messages.typeNumber}</option>
                  <option value="money">{messages.typeMoney}</option>
                  <option value="custom">{messages.typeCustom}</option>
                </select>
              </label>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={column.required}
                  onChange={(event) => updateColumn(column.id, { required: event.target.checked })}
                />
                {messages.required}
              </label>
              <div className="row">
                <button
                  type="button"
                  className="secondary icon-button"
                  onClick={() => setColumns((current) => moveColumn(current, index, -1))}
                  disabled={index === 0}
                  title={messages.moveUp}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="secondary icon-button"
                  onClick={() => setColumns((current) => moveColumn(current, index, 1))}
                  disabled={index === columns.length - 1}
                  title={messages.moveDown}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setColumns((current) => current.filter((entry) => entry.id !== column.id))}
                >
                  {messages.removeColumn}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <label>
        {messages.instructions}
        <textarea
          name="instructionText"
          rows={5}
          defaultValue="Extract one row per visible record. Use the configured columns exactly and leave missing values blank."
          required
        />
      </label>
      <label>
        {messages.ignoreRules}
        <textarea
          name="ignoreRules"
          rows={3}
          defaultValue="Ignore headers, footers, logos, totals, and summary sections unless they are part of a requested row."
        />
      </label>
      <div className="row">
        <Link className="button secondary" href={cancelHref}>
          {messages.cancel}
        </Link>
        <button type="submit" disabled={hasInvalidColumns}>
          {messages.submit}
        </button>
      </div>
    </form>
  );
}
