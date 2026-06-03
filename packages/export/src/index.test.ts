import { describe, expect, it } from "vitest";
import { buildWorkbookBuffer } from "./index";
import type { ExportRequest, Preset, NormalizedTransactionRow } from "@bank/domain";

const preset: Preset = {
  id: "preset-1",
  businessId: "biz-1",
  name: "Test preset",
  version: 1,
  status: "active",
  documentFamily: "bank_summary",
  definition: {
    columns: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "description", label: "Description", type: "string", required: true },
      { key: "amount", label: "Amount", type: "currency", required: true },
    ],
    classificationCategories: [],
    ignoreRules: [],
    instructionText: "Extract rows",
    dateParsingRules: [],
    amountParsingRules: [],
    directionRules: [],
    payeeHints: [],
  },
  exampleNotes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const rows: NormalizedTransactionRow[] = [
  {
    id: "row-1",
    sourcePage: 0,
    date: "2026-06-03",
    description: "Coffee",
    amount: 4.5,
    currency: "USD",
    direction: "debit",
    balance: null,
    category: "Operations",
    counterparty: null,
    reference: "",
    notes: "",
    confidence: { overall: 0.8, fields: { amount: 0.8 } },
    reviewStatus: "approved",
  },
];

const request: ExportRequest = {
  jobId: "job-1",
  format: "xlsx",
  selectedColumns: ["date", "description", "amount"],
  workbookName: "Transactions",
};

describe("buildWorkbookBuffer", () => {
  it("creates a non-empty workbook", async () => {
    const buffer = await buildWorkbookBuffer({ preset, rows, request });
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});

