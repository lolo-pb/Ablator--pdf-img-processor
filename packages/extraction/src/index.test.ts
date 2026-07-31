import { describe, expect, it } from "vitest";
import { buildResponseSchema } from "./index";

const preset = {
  id: "preset-1",
  businessId: "business-1",
  name: "Custom template",
  version: 1,
  status: "active",
  documentType: "statement",
  definition: {
    columns: [
      { key: "merchant", label: "Merchant", type: "text", required: true, customHint: "", enumOptions: [] },
      { key: "total", label: "Total", type: "money", required: true, customHint: "", enumOptions: [] },
    ],
    ignoreRules: "",
    instructionText: "Extract purchases.",
  },
  exampleNotes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("buildResponseSchema", () => {
  it("allows only saved template columns and confidence", () => {
    const schema = buildResponseSchema(preset as never);
    const rowSchema = schema.properties.rows.items;

    expect(Object.keys(rowSchema.properties)).toEqual(["merchant", "total", "confidence"]);
    expect(rowSchema.required).toEqual(["merchant", "total", "confidence"]);
    expect(rowSchema.additionalProperties).toBe(false);
  });
});
