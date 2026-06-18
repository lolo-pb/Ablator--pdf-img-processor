import { describe, expect, it } from "vitest";
import { documentTypeSchema, presetDefinitionSchema } from "./index";

describe("presetDefinitionSchema", () => {
  it("rejects duplicate column keys", () => {
    const parsed = presetDefinitionSchema.safeParse({
      columns: [
        { key: "date", label: "Date", type: "date", required: true },
        { key: "date", label: "Duplicate date", type: "date", required: false },
      ],
      ignoreRules: "",
      instructionText: "Extract rows",
    });

    expect(parsed.success).toBe(false);
  });

  it("maps legacy column types into current template column types", () => {
    const parsed = presetDefinitionSchema.parse({
      columns: [
        { key: "description", label: "Description", type: "string", required: true },
        { key: "amount", label: "Amount", type: "currency", required: true },
      ],
      ignoreRules: "",
      instructionText: "Extract rows",
    });

    expect(parsed.columns[0].type).toBe("text");
    expect(parsed.columns[1].type).toBe("money");
  });

  it("normalizes legacy ignoreRules arrays into freeform text", () => {
    const parsed = presetDefinitionSchema.parse({
      columns: [{ key: "description", label: "Description", type: "text", required: true }],
      ignoreRules: ["Ignore headers", "Ignore totals"],
      instructionText: "Extract rows",
    });

    expect(parsed.ignoreRules).toBe("Ignore headers\nIgnore totals");
  });
});

describe("documentTypeSchema", () => {
  it("accepts custom non-empty document types", () => {
    const parsed = documentTypeSchema.safeParse("credit card summary");

    expect(parsed.success).toBe(true);
  });
});
