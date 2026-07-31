"use client";

import Link from "next/link";
import type { Preset } from "@bank/domain";
import { useMemo, useState } from "react";
import { createPresetAction } from "../actions";

type ColumnType = "date" | "number" | "money" | "text" | "custom" | "enum";

type DraftColumn = {
  id: string;
  label: string;
  type: ColumnType;
  required: boolean;
  customHint: string;
  enumOptions: string[];
  enumDraft: string;
};

type TemplateFormMessages = {
  title: string;
  name: string;
  documentType: string;
  defaultName: string;
  defaultDocumentType: string;
  columns: string;
  addColumn: string;
  columnLabel: string;
  columnType: string;
  columnConfig: string;
  customText: string;
  customTextPlaceholder: string;
  enumValues: string;
  enumValuesPlaceholder: string;
  addValue: string;
  required: string;
  actions: string;
  removeColumn: string;
  moveUp: string;
  moveDown: string;
  typeDate: string;
  typeNumber: string;
  typeMoney: string;
  typeText: string;
  typeCustom: string;
  typeEnum: string;
  instructions: string;
  defaultInstructions: string;
  ignoreRules: string;
  defaultIgnoreRules: string;
  submit: string;
  cancel: string;
};

type TemplateFormProps = {
  businessId: string;
  cancelHref: string;
  messages: TemplateFormMessages;
  initialPreset?: Preset;
  submitAction?: (formData: FormData) => Promise<void>;
};

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

function mapInitialColumns(preset: Preset | undefined): DraftColumn[] {
  if (!preset) return [];
  return preset.definition.columns.map((column, index) => ({
    id: `${column.key}-${index}`,
    label: column.label,
    type: column.type,
    required: column.required,
    customHint: column.customHint ?? "",
    enumOptions: column.enumOptions ?? [],
    enumDraft: "",
  }));
}

export function TemplateForm({
  businessId,
  cancelHref,
  messages,
  initialPreset,
  submitAction = createPresetAction,
}: TemplateFormProps) {
  const [columns, setColumns] = useState<DraftColumn[]>(() => mapInitialColumns(initialPreset));

  const serializedColumns = useMemo(
    () =>
      JSON.stringify(
        columns.map(({ label, type, required, customHint, enumOptions }) => ({
          key: toKey(label),
          label,
          type,
          required,
          customHint: type === "custom" ? customHint : "",
          enumOptions: type === "enum" ? enumOptions : [],
        })),
      ),
    [columns],
  );
  const keys = columns.map((column) => toKey(column.label));
  const hasDuplicateKeys = new Set(keys).size !== keys.length;
  const hasInvalidColumns = columns.length === 0 || columns.some((column) => !toKey(column.label) || !column.label) || hasDuplicateKeys;

  function updateColumn(id: string, patch: Partial<DraftColumn>) {
    setColumns((current) =>
      current.map((column) => (column.id === id ? { ...column, ...patch } : column)),
    );
  }

  function addColumn() {
    const id = `column-${Date.now()}`;
    setColumns((current) => [
      ...current,
      { id, label: "", type: "text", required: false, customHint: "", enumOptions: [], enumDraft: "" },
    ]);
  }

  function addEnumOption(id: string) {
    setColumns((current) =>
      current.map((column) => {
        if (column.id !== id) return column;
        const nextValue = column.enumDraft.trim();
        if (!nextValue || column.enumOptions.includes(nextValue)) {
          return { ...column, enumDraft: "" };
        }
        return {
          ...column,
          enumOptions: [...column.enumOptions, nextValue],
          enumDraft: "",
        };
      }),
    );
  }

  function removeEnumOption(id: string, option: string) {
    setColumns((current) =>
      current.map((column) =>
        column.id === id
          ? { ...column, enumOptions: column.enumOptions.filter((entry) => entry !== option) }
          : column,
      ),
    );
  }

  return (
    <form action={submitAction} className="stack template-form">
      <input type="hidden" name="businessId" value={businessId} />
      {initialPreset ? <input type="hidden" name="presetId" value={initialPreset.id} /> : null}
      <input type="hidden" name="columnsJson" value={serializedColumns} />

      <section className="template-form__grid">
        <label className="template-form__field">
          {messages.name}
          <input name="name" defaultValue={initialPreset?.name ?? messages.defaultName} required />
        </label>
        <label className="template-form__field">
          {messages.documentType}
          <input name="documentType" defaultValue={initialPreset?.documentType ?? messages.defaultDocumentType} required />
        </label>
      </section>

      <section className="stack">
        <div className="template-form__section-header">
          <h2>{messages.columns}</h2>
          <button type="button" className="secondary" onClick={addColumn}>
            {messages.addColumn}
          </button>
        </div>

        <div className="table-wrap column-builder-table-wrap">
          <table className="column-builder-table">
            <thead>
              <tr>
                <th>{messages.columnLabel}</th>
                <th>{messages.columnType}</th>
                <th>{messages.columnConfig}</th>
                <th>{messages.required}</th>
                <th>{messages.actions}</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column, index) => (
                <tr key={column.id}>
                  <td>
                    <input
                      className="column-builder-table__input"
                      value={column.label}
                      onChange={(event) => updateColumn(column.id, { label: event.target.value })}
                      required
                    />
                  </td>
                  <td>
                    <select
                      className="column-builder-table__input"
                      value={column.type}
                      onChange={(event) =>
                        updateColumn(column.id, {
                          type: event.target.value as ColumnType,
                          customHint: event.target.value === "custom" ? column.customHint : "",
                          enumOptions: event.target.value === "enum" ? column.enumOptions : [],
                          enumDraft: "",
                        })
                      }
                    >
                      <option value="date">{messages.typeDate}</option>
                      <option value="number">{messages.typeNumber}</option>
                      <option value="money">{messages.typeMoney}</option>
                      <option value="text">{messages.typeText}</option>
                      <option value="custom">{messages.typeCustom}</option>
                      <option value="enum">{messages.typeEnum}</option>
                    </select>
                  </td>
                  <td>
                    {column.type === "custom" ? (
                      <input
                        className="column-builder-table__input"
                        value={column.customHint}
                        onChange={(event) => updateColumn(column.id, { customHint: event.target.value })}
                        placeholder={messages.customTextPlaceholder}
                      />
                    ) : column.type === "enum" ? (
                      <div className="column-builder-table__enum">
                        <div className="column-builder-table__chips">
                          {column.enumOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className="column-builder-table__chip"
                              onClick={() => removeEnumOption(column.id, option)}
                              title={messages.removeColumn}
                            >
                              {option} x
                            </button>
                          ))}
                        </div>
                        <div className="column-builder-table__enum-entry">
                          <input
                            className="column-builder-table__input"
                            value={column.enumDraft}
                            onChange={(event) => updateColumn(column.id, { enumDraft: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                addEnumOption(column.id);
                              }
                            }}
                            placeholder={messages.enumValuesPlaceholder}
                          />
                          <button type="button" className="secondary" onClick={() => addEnumOption(column.id)}>
                            {messages.addValue}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="column-builder-table__placeholder">-</span>
                    )}
                  </td>
                  <td className="column-builder-table__required">
                    <input
                      type="checkbox"
                      checked={column.required}
                      onChange={(event) => updateColumn(column.id, { required: event.target.checked })}
                    />
                  </td>
                  <td>
                    <div className="column-builder-table__actions">
                      <button
                        type="button"
                        className="secondary icon-button"
                        onClick={() => setColumns((current) => moveColumn(current, index, -1))}
                        disabled={index === 0}
                        title={messages.moveUp}
                      >
                        {messages.moveUp}
                      </button>
                      <button
                        type="button"
                        className="secondary icon-button"
                        onClick={() => setColumns((current) => moveColumn(current, index, 1))}
                        disabled={index === columns.length - 1}
                        title={messages.moveDown}
                      >
                        {messages.moveDown}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setColumns((current) => current.filter((entry) => entry.id !== column.id))}
                      >
                        {messages.removeColumn}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <label className="template-form__field">
        {messages.instructions}
        <textarea
          name="instructionText"
          rows={5}
          defaultValue={
            initialPreset?.definition.instructionText ??
            messages.defaultInstructions
          }
          required
        />
      </label>
      <label className="template-form__field">
        {messages.ignoreRules}
        <textarea
          name="ignoreRules"
          rows={3}
          defaultValue={
            initialPreset?.definition.ignoreRules ??
            messages.defaultIgnoreRules
          }
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
