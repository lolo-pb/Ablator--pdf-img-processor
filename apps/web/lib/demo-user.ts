import type { BusinessMembership, Preset, User } from "@bank/domain";

const now = new Date().toISOString();

export const demoUser: User = {
  id: "user-demo",
  name: "Demo Operator",
  email: "demo@acme.test",
  status: "active",
};

export const demoMembership: BusinessMembership = {
  id: "membership-1",
  userId: "user-demo",
  businessId: "business-acme",
  role: "owner",
};

export const demoPreset: Preset = {
  id: "preset-acme-bank-v1",
  businessId: "business-acme",
  name: "Bank Summary Classifier",
  version: 1,
  status: "active",
  documentType: "bank_summary",
  definition: {
    columns: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "description", label: "Description", type: "custom", required: true },
      { key: "amount", label: "Amount", type: "money", required: true },
      { key: "counterparty", label: "Counterparty", type: "custom", required: false },
      { key: "reference", label: "Reference", type: "custom", required: false },
    ],
    ignoreRules: "Ignore running balances when they are not transaction rows.\nIgnore page headers and statement summaries.",
    instructionText:
      "Extract transaction rows from bank summary documents. Keep one normalized row per transaction and use the configured columns exactly.",
  },
  exampleNotes: "Good for monthly summaries and reconciliation packs with debit/credit rows.",
  createdAt: now,
  updatedAt: now,
};
