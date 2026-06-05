import { describe, expect, it } from "vitest";
import { documentTypeSchema, presetDefinitionSchema } from "./index";

describe("presetDefinitionSchema", () => {
  it("rejects duplicate column keys", () => {
    const parsed = presetDefinitionSchema.safeParse({
      columns: [
        { key: "date", label: "Date", type: "date", required: true },
        { key: "date", label: "Duplicate date", type: "date", required: false },
      ],
      classificationCategories: ["Ops"],
      ignoreRules: [],
      instructionText: "Extract rows",
      dateParsingRules: [],
      amountParsingRules: [],
      directionRules: [],
      payeeHints: [],
    });

    expect(parsed.success).toBe(false);
  });
});

describe("documentTypeSchema", () => {
  it("accepts custom non-empty document types", () => {
    const parsed = documentTypeSchema.safeParse("credit card summary");

    expect(parsed.success).toBe(true);
  });
});
