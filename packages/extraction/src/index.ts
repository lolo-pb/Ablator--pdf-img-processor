import OpenAI from "openai";
import {
  ExtractionProvider,
  extractionResultSchema,
  type ExtractionResult,
  normalizedTransactionRowSchema,
  type Preset,
  type SourceDocument,
} from "@bank/domain";

const mockDescriptions = [
  "Coffee shop",
  "Office supplies",
  "Payroll transfer",
  "Software subscription",
  "Card payment",
];

function buildInstructions(preset: Preset): string {
  return [
    "You extract structured rows from documents and images.",
    "Use the template context to decide what counts as a row and what each field means.",
    "Return strict JSON only.",
    "Do not explain your reasoning.",
    `Document type: ${preset.documentType}.`,
    `Instruction text: ${preset.definition.instructionText}`,
    `Ignore rules: ${preset.definition.ignoreRules.join("; ") || "none"}`,
    `Categories: ${preset.definition.classificationCategories.join(", ") || "Uncategorized"}`,
    "For each row produce: date, description, amount, currency, direction, balance, category, counterparty, reference, notes, confidence.",
  ].join(" ");
}

function toConfidenceObject(value: unknown) {
  const overall =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : 0.65;

  return {
    overall,
    fields: {
      date: overall,
      description: overall,
      amount: overall,
      category: overall,
    },
  };
}

function buildMockResult(documents: SourceDocument[]): ExtractionResult {
  const rows = documents.flatMap((document, documentIndex) =>
    Array.from({ length: 3 }, (_, rowIndex) =>
      normalizedTransactionRowSchema.parse({
        id: `${document.id}-row-${rowIndex}`,
        sourcePage: documentIndex,
        date: `2026-06-0${rowIndex + 1}`,
        description: `${mockDescriptions[rowIndex % mockDescriptions.length]} - ${document.filename}`,
        amount: Number(((rowIndex + 1) * 24.35).toFixed(2)),
        currency: "USD",
        direction: rowIndex % 2 === 0 ? "debit" : "credit",
        balance: Number((1000 - rowIndex * 24.35).toFixed(2)),
        category: rowIndex % 2 === 0 ? "Operations" : "Income",
        counterparty: rowIndex % 2 === 0 ? "Vendor" : "Client",
        reference: `MOCK-${documentIndex}-${rowIndex}`,
        notes: "Mock extraction used because OPENAI_API_KEY is not configured.",
        confidence: {
          overall: 0.72,
          fields: {
            date: 0.8,
            description: 0.7,
            amount: 0.75,
            category: 0.65,
          },
        },
        reviewStatus: "pending",
      }),
    ),
  );

  return extractionResultSchema.parse({
    rows,
    warnings: ["Using mock extraction provider."],
    processingMetadata: {
      provider: "mock",
      processedAt: new Date().toISOString(),
      pageCount: documents.length,
      repairAttempted: false,
    },
  });
}

async function runOpenAiExtraction(args: {
  apiKey: string;
  preset: Preset;
  documents: SourceDocument[];
  readDocument: (storagePath: string) => Promise<Buffer>;
}): Promise<ExtractionResult> {
  const client = new OpenAI({ apiKey: args.apiKey });
  const content: any[] = [
    {
      type: "input_text",
      text: "Extract financial transaction rows and answer in strict JSON matching the requested schema.",
    },
  ];

  for (const document of args.documents) {
    const buffer = await args.readDocument(document.storagePath);
    const base64 = buffer.toString("base64");
    if (document.mimeType === "application/pdf") {
      content.push({
        type: "input_file",
        filename: document.filename,
        file_data: `data:application/pdf;base64,${base64}`,
      });
    } else {
      content.push({
        type: "input_image",
        image_url: `data:${document.mimeType};base64,${base64}`,
        detail: "high",
      });
    }
  }

  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    instructions: buildInstructions(args.preset),
    text: {
      format: {
        type: "json_schema",
        name: "bank_transaction_rows",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  date: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  direction: { type: "string", enum: ["debit", "credit"] },
                  balance: { type: ["number", "null"] },
                  category: { type: "string" },
                  counterparty: { type: ["string", "null"] },
                  reference: { type: "string" },
                  notes: { type: "string" },
                  confidence: { type: "number" },
                },
                required: [
                  "date",
                  "description",
                  "amount",
                  "currency",
                  "direction",
                  "balance",
                  "category",
                  "counterparty",
                  "reference",
                  "notes",
                  "confidence",
                ],
              },
            },
          },
          required: ["rows"],
        },
      },
    },
    input: [
      {
        role: "user",
        content,
      },
    ],
  });

  const raw = response.output_text;
  const parsed = JSON.parse(raw) as { rows: Array<Record<string, unknown>> };
  const rows = parsed.rows.map((row, index) =>
    normalizedTransactionRowSchema.parse({
      id: `row-${index}`,
      sourcePage: 0,
      date: row.date,
      description: row.description,
      amount: row.amount,
      currency: row.currency ?? "USD",
      direction: row.direction,
      balance: row.balance ?? null,
      category: row.category ?? "Uncategorized",
      counterparty: row.counterparty ?? null,
      reference: row.reference ?? "",
      notes: row.notes ?? "",
      confidence: toConfidenceObject(row.confidence),
      reviewStatus: "pending",
    }),
  );

  return extractionResultSchema.parse({
    rows,
    warnings: [],
    processingMetadata: {
      provider: "openai",
      processedAt: new Date().toISOString(),
      pageCount: args.documents.length,
      repairAttempted: false,
    },
  });
}

export function createExtractionProvider(): ExtractionProvider {
  return {
    async extractTransactions({ preset, documents, readDocument }) {
      if (!process.env.OPENAI_API_KEY) {
        return buildMockResult(documents);
      }

      try {
        return await runOpenAiExtraction({
          apiKey: process.env.OPENAI_API_KEY,
          preset,
          documents,
          readDocument,
        });
      } catch (error) {
        const fallback = buildMockResult(documents);
        fallback.warnings.push(
          error instanceof Error
            ? `OpenAI extraction failed; fell back to mock provider: ${error.message}`
            : "OpenAI extraction failed; fell back to mock provider.",
        );
        return fallback;
      }
    },
  };
}
