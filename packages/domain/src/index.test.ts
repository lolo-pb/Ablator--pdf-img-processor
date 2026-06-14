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

  it("maps legacy column types into current template column types", () => {
    const parsed = presetDefinitionSchema.parse({
      columns: [
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
    });

    expect(parsed.columns[0].type).toBe("text");
    expect(parsed.columns[1].type).toBe("money");
  });
});

describe("documentTypeSchema", () => {
  it("accepts custom non-empty document types", () => {
    const parsed = documentTypeSchema.safeParse("credit card summary");

    expect(parsed.success).toBe(true);
  });
});
