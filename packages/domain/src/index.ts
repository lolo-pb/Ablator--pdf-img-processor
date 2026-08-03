import { pgEnum, pgTable, text, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";
import { z } from "zod";

export const membershipRoleSchema = z.enum(["owner", "admin", "member"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const documentTypeSchema = z.string().min(1);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const rowReviewStatusSchema = z.enum(["pending", "edited", "approved"]);
export type RowReviewStatus = z.infer<typeof rowReviewStatusSchema>;

export const confidenceSchema = z.object({
  overall: z.number().min(0).max(1),
  fields: z.record(z.string(), z.number().min(0).max(1)),
});
export type Confidence = z.infer<typeof confidenceSchema>;

export const outputColumnTypeSchema = z.enum(["date", "number", "money", "text", "custom", "enum"]);
export type OutputColumnType = z.infer<typeof outputColumnTypeSchema>;

export const outputColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.preprocess((value) => {
    if (value === "currency") return "money";
    if (value === "string") return "text";
    if (value === "enum") return "enum";
    return value;
  }, outputColumnTypeSchema),
  required: z.boolean().default(false),
  customHint: z.string().default(""),
  enumOptions: z.array(z.string().min(1)).default([]),
});
export type OutputColumn = z.infer<typeof outputColumnSchema>;

const ignoreTextSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join("\n");
  }
  return value ?? "";
}, z.string());

export const presetDefinitionSchema = z
  .object({
    columns: z.array(outputColumnSchema).min(1),
    ignoreRules: ignoreTextSchema.default(""),
    instructionText: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const column of value.columns) {
      if (seen.has(column.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["columns"],
          message: `Duplicate column key: ${column.key}`,
        });
      }
      seen.add(column.key);
    }
  });
export type PresetDefinition = z.infer<typeof presetDefinitionSchema>;

export const presetSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(["draft", "active", "archived"]).default("active"),
  documentType: documentTypeSchema,
  definition: presetDefinitionSchema,
  exampleNotes: z.string().default(""),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type Preset = z.infer<typeof presetSchema>;

export const templateCellValueSchema = z.union([z.string(), z.number(), z.null()]);
export type TemplateCellValue = z.infer<typeof templateCellValueSchema>;

function legacyConfidenceToNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }
  if (
    value &&
    typeof value === "object" &&
    "overall" in value &&
    typeof (value as { overall?: unknown }).overall === "number"
  ) {
    return Math.max(0, Math.min(1, (value as { overall: number }).overall));
  }
  return 0.65;
}

function coerceTemplateValue(value: unknown): TemplateCellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return String(value);
}

function normalizeTemplateRowInput(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  if ("values" in input && input.values && typeof input.values === "object") {
    return {
      ...input,
      confidence: legacyConfidenceToNumber(input.confidence),
    };
  }

  const values: Record<string, TemplateCellValue> = {};
  for (const [key, entry] of Object.entries(input)) {
    if (["id", "sourcePage", "confidence", "reviewStatus"].includes(key)) continue;
    values[key] = coerceTemplateValue(entry);
  }

  return {
    id: input.id,
    sourcePage: input.sourcePage,
    values,
    confidence: legacyConfidenceToNumber(input.confidence),
    reviewStatus: input.reviewStatus,
  };
}

export const normalizedTemplateRowSchema = z.preprocess(normalizeTemplateRowInput, z.object({
  id: z.string().min(1),
  sourcePage: z.number().int().nonnegative(),
  values: z.record(z.string(), templateCellValueSchema),
  confidence: z.number().min(0).max(1),
  reviewStatus: rowReviewStatusSchema.default("pending"),
}));
export type NormalizedTemplateRow = z.infer<typeof normalizedTemplateRowSchema>;

export const extractionResultSchema = z.object({
  rows: z.array(normalizedTemplateRowSchema),
  warnings: z.array(z.string()).default([]),
  processingMetadata: z.object({
    provider: z.string(),
    processedAt: z.string(),
    pageCount: z.number().int().positive(),
    repairAttempted: z.boolean().default(false),
  }),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export type InMemoryDocument = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

export const auditEventSchema = z.object({
  id: z.string().min(1),
  actorId: z.string().min(1),
  businessId: z.string().min(1),
  targetType: z.enum(["job", "preset", "business"]),
  targetId: z.string().min(1),
  action: z.string().min(1),
  createdAt: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const businessSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  billingContactEmail: z.string().email(),
  retentionPolicyDays: z.number().int().nonnegative(),
});
export type Business = z.infer<typeof businessSchema>;

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  status: z.enum(["active", "invited", "disabled"]),
});
export type User = z.infer<typeof userSchema>;

export const businessMembershipSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  businessId: z.string().min(1),
  role: membershipRoleSchema,
});
export type BusinessMembership = z.infer<typeof businessMembershipSchema>;

export const exportRequestSchema = z.object({
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
  selectedColumns: z.array(z.string()).min(1),
  workbookName: z.string().min(1),
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

export const tenantContextSchema = z.object({
  businessId: z.string().min(1),
  userId: z.string().min(1),
  role: membershipRoleSchema,
});
export type TenantContext = z.infer<typeof tenantContextSchema>;

export interface AuthProvider {
  getCurrentUser(): Promise<User>;
}

export interface TenantStore {
  listBusinessesForUser(userId: string): Promise<Array<{ business: Business; role: MembershipRole }>>;
  requireMembership(context: TenantContext): Promise<void>;
}

export interface PresetStore {
  listByBusiness(businessId: string): Promise<Preset[]>;
  getById(businessId: string, presetId: string): Promise<Preset | null>;
  createPreset(preset: Omit<Preset, "id" | "version" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Preset>;
  updatePreset(preset: Preset): Promise<Preset>;
}

export interface ExtractionProvider {
  extractTransactions(input: {
    preset: Preset;
    documents: InMemoryDocument[];
  }): Promise<ExtractionResult>;
}

export const businessesTable = pgTable("businesses", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  billingContactEmail: text("billing_contact_email").notNull(),
  retentionPolicyDays: integer("retention_policy_days").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const membershipRoleEnum = pgEnum("membership_role", ["owner", "admin", "member"]);

export const businessMembershipsTable = pgTable("business_memberships", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  businessId: uuid("business_id").notNull(),
  role: membershipRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const presetsTable = pgTable("presets", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull(),
  documentType: text("document_type").notNull(),
  definition: jsonb("definition").notNull(),
  exampleNotes: text("example_notes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
