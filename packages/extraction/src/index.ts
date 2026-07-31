import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import {
  ExtractionProvider,
  extractionResultSchema,
  normalizedTemplateRowSchema,
  type ExtractionResult,
  type OutputColumn,
  type Preset,
  type SourceDocument,
  type TemplateCellValue,
} from "@bank/domain";

const GEMINI_MODEL = "gemini-2.5-flash";

type GeminiResponseShape = {
  rows: Array<Record<string, unknown>>;
  warnings?: string[];
};

function buildColumnSchema(column: OutputColumn) {
  if (column.type === "number" || column.type === "money") {
    return { type: ["number", "null"] };
  }
  return { type: ["string", "null"] };
}

export function buildResponseSchema(preset: Preset) {
  const rowProperties = Object.fromEntries(
    preset.definition.columns.map((column) => [column.key, buildColumnSchema(column)]),
  );

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      rows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            ...rowProperties,
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: [...preset.definition.columns.map((column) => column.key), "confidence"],
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["rows", "warnings"],
  } as const;
}

function buildColumnInstructions(columns: OutputColumn[]) {
  return columns
    .map((column) => {
      const required = column.required ? "required" : "optional";
      const hint = column.customHint ? `; hint=${column.customHint}` : "";
      const options = column.enumOptions.length ? `; allowed=${column.enumOptions.join(", ")}` : "";
      return `- ${column.key}: ${column.label}; type=${column.type}; ${required}${hint}${options}`;
    })
    .join("\n");
}

function buildInstructions(preset: Preset): string {
  return [
    "You extract structured rows from documents and images.",
    "Use the template context to decide what counts as a row and what each field means.",
    "Use the exact schema keys provided by the template.",
    "Return null when a value is missing or not visible.",
    "All date fields must be returned in ISO format yyyy-MM-dd.",
    "If any template instruction is ambiguous, contradictory, underspecified, or hard to apply to the document, add a short note to warnings.",
    "If you are unsure about how to interpret a value, prefer adding a warning instead of staying silent.",
    "Return strict JSON only.",
    "Do not explain your reasoning.",
    `Document type: ${preset.documentType}.`,
    `Instruction text: ${preset.definition.instructionText}`,
    `Ignore text: ${preset.definition.ignoreRules.trim() || "none"}`,
    "Output columns:",
    buildColumnInstructions(preset.definition.columns),
  ].join("\n");
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function parseGeminiResponse(raw: string) {
  try {
    return {
      parsed: JSON.parse(raw) as GeminiResponseShape,
      repairAttempted: false,
    };
  } catch {
    const extracted = extractJsonObject(raw);
    if (extracted !== raw) {
      return {
        parsed: JSON.parse(extracted) as GeminiResponseShape,
        repairAttempted: true,
      };
    }
    throw new Error("Gemini returned invalid JSON that could not be repaired.");
  }
}

function toConfidenceNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0.65;
}

function coerceCellValue(value: unknown, column: OutputColumn): TemplateCellValue {
  if (value === null || value === undefined || value === "") return null;
  if (column.type === "number" || column.type === "money") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[$,\s]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
  return String(value);
}

function normalizeResponseRows(args: {
  rows: Array<Record<string, unknown>>;
  preset: Preset;
  sourcePage?: number;
}) {
  return args.rows.map((row, index) => {
    const values = Object.fromEntries(
      args.preset.definition.columns.map((column) => [
        column.key,
        coerceCellValue(row[column.key], column),
      ]),
    );

    return normalizedTemplateRowSchema.parse({
      id: `row-${index}`,
      sourcePage: args.sourcePage ?? 0,
      values,
      confidence: toConfidenceNumber(row.confidence),
      reviewStatus: "pending",
    });
  });
}

function buildMockResult(preset: Preset, documents: SourceDocument[]): ExtractionResult {
  const rows = documents.flatMap((document, documentIndex) =>
    Array.from({ length: 3 }, (_, rowIndex) => {
      const values = Object.fromEntries(
        preset.definition.columns.map((column) => {
          const rowNumber = rowIndex + 1;
          if (column.type === "date") {
            return [column.key, `2026-06-0${rowNumber}`];
          }
          if (column.type === "number") {
            return [column.key, rowNumber * 3];
          }
          if (column.type === "money") {
            return [column.key, Number((rowNumber * 24.35).toFixed(2))];
          }
          return [column.key, `${column.label} ${rowNumber} - ${document.filename}`];
        }),
      );

      return normalizedTemplateRowSchema.parse({
        id: `${document.id}-row-${rowIndex}`,
        sourcePage: documentIndex,
        values,
        confidence: 0.72,
        reviewStatus: "pending",
      });
    }),
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

function getGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

async function uploadDocumentToGemini(args: {
  client: GoogleGenAI;
  document: SourceDocument;
  readDocument: (storagePath: string) => Promise<Buffer>;
}) {
  const buffer = await args.readDocument(args.document.storagePath);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: args.document.mimeType || "application/octet-stream",
  });

  return args.client.files.upload({
    file: blob,
    config: {
      mimeType: args.document.mimeType || "application/octet-stream",
      displayName: args.document.filename,
    },
  });
}

async function runGeminiExtraction(args: {
  apiKey: string;
  preset: Preset;
  documents: SourceDocument[];
  readDocument: (storagePath: string) => Promise<Buffer>;
}): Promise<ExtractionResult> {
  const client = getGeminiClient(args.apiKey);
  const parts: Array<string | ReturnType<typeof createPartFromUri>> = [
    buildInstructions(args.preset),
  ];

  for (const document of args.documents) {
    const uploaded = await uploadDocumentToGemini({
      client,
      document,
      readDocument: args.readDocument,
    });

    if (!uploaded.uri || !uploaded.mimeType) {
      throw new Error(`Gemini file upload did not return a usable URI for ${document.filename}.`);
    }

    parts.push(createPartFromUri(uploaded.uri, uploaded.mimeType));
  }

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: createUserContent(parts),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: buildResponseSchema(args.preset),
      temperature: 0.1,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  const { parsed, repairAttempted } = parseGeminiResponse(raw);
  const rows = normalizeResponseRows({ rows: parsed.rows, preset: args.preset });
  const warnings = Array.isArray(parsed.warnings)
    ? parsed.warnings.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    : [];

  if (repairAttempted) {
    warnings.push("Gemini response JSON needed a repair pass before it could be parsed.");
  }

  return extractionResultSchema.parse({
    rows,
    warnings,
    processingMetadata: {
      provider: "gemini",
      processedAt: new Date().toISOString(),
      pageCount: args.documents.length,
      repairAttempted,
    },
  });
}

export function createExtractionProvider(): ExtractionProvider {
  return {
    async extractTransactions({ preset, documents, readDocument }) {
      if (!process.env.GEMINI_API_KEY) {
        return buildMockResult(preset, documents);
      }

      return runGeminiExtraction({
        apiKey: process.env.GEMINI_API_KEY,
        preset,
        documents,
        readDocument,
      });
    },
  };
}
