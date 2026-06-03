import type { AppState } from "./types";

const now = new Date().toISOString();

export const initialState: AppState = {
  businesses: [
    {
      id: "business-acme",
      name: "Acme Foods",
      slug: "acme-foods",
      billingContactEmail: "finance@acme.test",
      retentionPolicyDays: 0,
    },
  ],
  users: [
    {
      id: "user-demo",
      name: "Demo Operator",
      email: "demo@acme.test",
      status: "active",
    },
  ],
  memberships: [
    {
      id: "membership-1",
      userId: "user-demo",
      businessId: "business-acme",
      role: "owner",
    },
  ],
  presets: [
    {
      id: "preset-acme-bank-v1",
      businessId: "business-acme",
      name: "Bank Summary Classifier",
      version: 1,
      status: "active",
      documentFamily: "bank_summary",
      definition: {
        columns: [
          { key: "date", label: "Date", type: "date", required: true },
          { key: "description", label: "Description", type: "string", required: true },
          { key: "amount", label: "Amount", type: "currency", required: true },
          { key: "currency", label: "Currency", type: "string", required: true },
          { key: "direction", label: "Direction", type: "enum", required: true },
          { key: "balance", label: "Balance", type: "currency", required: false },
          { key: "category", label: "Category", type: "enum", required: true },
          { key: "counterparty", label: "Counterparty", type: "string", required: false },
          { key: "reference", label: "Reference", type: "string", required: false },
          { key: "notes", label: "Notes", type: "string", required: false },
        ],
        classificationCategories: ["Operations", "Payroll", "Subscriptions", "Taxes", "Income", "Uncategorized"],
        ignoreRules: ["Ignore running balances when they are not transaction rows", "Ignore page headers and statement summaries"],
        instructionText:
          "Extract transaction rows from bank summary documents. Classify spend categories using the provided taxonomy and keep one normalized row per transaction.",
        dateParsingRules: ["Prefer ISO date output in YYYY-MM-DD format"],
        amountParsingRules: ["Use decimal numbers without currency symbols", "Negative outgoing values should be converted to debit direction"],
        directionRules: ["Map withdrawals, card charges, and fees to debit", "Map deposits and transfers received to credit"],
        payeeHints: ["Merchant names may appear after card references", "Use bank transfer counterparties when available"],
      },
      exampleNotes: "Good for monthly summaries and reconciliation packs with debit/credit rows.",
      createdAt: now,
      updatedAt: now,
    },
  ],
  jobs: [],
  documents: [],
  rows: [],
  exports: [],
  auditEvents: [],
  storagePolicies: [
    {
      deleteSourceAfterExport: true,
      deleteSourceAfterFailure: true,
      retentionDays: 0,
    },
  ],
};

