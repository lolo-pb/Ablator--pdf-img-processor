import { pgEnum, pgTable, text, timestamp, uuid, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

export const membershipRoleSchema = z.enum(["owner", "admin", "member"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const documentTypeSchema = z.string().min(1);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const processingJobStatusSchema = z.enum([
  "uploaded",
  "queued",
  "processing",
  "review_required",
  "completed",
  "failed",
]);
export type ProcessingJobStatus = z.infer<typeof processingJobStatusSchema>;

export const sourceDocumentStatusSchema = z.enum(["stored", "deleted"]);
export type SourceDocumentStatus = z.infer<typeof sourceDocumentStatusSchema>;

export const rowReviewStatusSchema = z.enum(["pending", "edited", "approved"]);
export type RowReviewStatus = z.infer<typeof rowReviewStatusSchema>;

export const confidenceSchema = z.object({
  overall: z.number().min(0).max(1),
  fields: z.record(z.string(), z.number().min(0).max(1)),
});
export type Confidence = z.infer<typeof confidenceSchema>;

export const outputColumnTypeSchema = z.enum(["date", "number", "money", "custom"]);
export type OutputColumnType = z.infer<typeof outputColumnTypeSchema>;

export const outputColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.preprocess((value) => {
    if (value === "currency") return "money";
    if (value === "string" || value === "enum") return "custom";
    return value;
  }, outputColumnTypeSchema),
  required: z.boolean().default(false),
});
export type OutputColumn = z.infer<typeof outputColumnSchema>;

export const presetDefinitionSchema = z
  .object({
    columns: z.array(outputColumnSchema).min(1),
    classificationCategories: z.array(z.string().min(1)).default([]),
    ignoreRules: z.array(z.string().min(1)).default([]),
    instructionText: z.string().min(1),
    dateParsingRules: z.array(z.string().min(1)).default([]),
    amountParsingRules: z.array(z.string().min(1)).default([]),
    directionRules: z.array(z.string().min(1)).default([]),
    payeeHints: z.array(z.string().min(1)).default([]),
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

    const categorySet = new Set<string>();
    for (const category of value.classificationCategories) {
      if (categorySet.has(category.toLowerCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["classificationCategories"],
          message: `Duplicate classification category: ${category}`,
        });
      }
      categorySet.add(category.toLowerCase());
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

export const sourceDocumentSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  pageCount: z.number().int().positive(),
  storagePath: z.string().min(1),
  status: sourceDocumentStatusSchema,
  deletionScheduledAt: z.string().nullable().default(null),
});
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;

export const processingJobSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  presetId: z.string().min(1),
  createdBy: z.string().min(1),
  status: processingJobStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  reviewCompletedAt: z.string().nullable().default(null),
  warnings: z.array(z.string()).default([]),
});
export type ProcessingJob = z.infer<typeof processingJobSchema>;

export const extractedRowSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  rowIndex: z.number().int().nonnegative(),
  rawFields: z.record(z.string(), z.unknown()),
  normalized: normalizedTemplateRowSchema,
});
export type ExtractedRow = z.infer<typeof extractedRowSchema>;

export const exportArtifactSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  format: z.enum(["xlsx", "csv"]),
  generatedAt: z.string().min(1),
  downloadPath: z.string().min(1),
});
export type ExportArtifact = z.infer<typeof exportArtifactSchema>;

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

export const reviewPatchSchema = z.object({
  rows: z.array(
    z.object({
      id: z.string().min(1),
      values: z.record(z.string(), templateCellValueSchema),
      reviewStatus: rowReviewStatusSchema,
    }),
  ),
  approvalState: z.enum(["in_progress", "ready_for_export"]),
});
export type ReviewPatch = z.infer<typeof reviewPatchSchema>;

export const exportRequestSchema = z.object({
  jobId: z.string().min(1),
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

export const storagePolicySchema = z.object({
  deleteSourceAfterExport: z.boolean().default(true),
  deleteSourceAfterFailure: z.boolean().default(true),
  retentionDays: z.number().int().nonnegative().default(0),
});
export type StoragePolicy = z.infer<typeof storagePolicySchema>;

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
  saveVersion(preset: Omit<Preset, "id" | "version" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Preset>;
}

export interface JobStore {
  listByBusiness(businessId: string): Promise<ProcessingJob[]>;
  getActiveJobForUser(userId: string): Promise<ProcessingJob | null>;
  getJob(businessId: string, jobId: string): Promise<ProcessingJob | null>;
  createJob(input: Omit<ProcessingJob, "id" | "createdAt" | "updatedAt" | "status" | "warnings" | "reviewCompletedAt">): Promise<ProcessingJob>;
  updateJob(job: ProcessingJob): Promise<void>;
  listRows(jobId: string): Promise<ExtractedRow[]>;
  replaceRows(jobId: string, rows: ExtractedRow[]): Promise<void>;
  clearJobData(jobId: string): Promise<void>;
  listDocuments(jobId: string): Promise<SourceDocument[]>;
  addDocuments(documents: SourceDocument[]): Promise<void>;
  updateDocuments(jobId: string, documents: SourceDocument[]): Promise<void>;
}

export interface FileStore {
  writeSourceDocument(jobId: string, filename: string, buffer: Buffer): Promise<{ storagePath: string }>;
  readSourceDocument(storagePath: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
}

export interface ExtractionProvider {
  extractTransactions(input: {
    preset: Preset;
    documents: SourceDocument[];
    readDocument: (storagePath: string) => Promise<Buffer>;
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

export const jobsTable = pgTable("processing_jobs", {
  id: uuid("id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  presetId: uuid("preset_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  status: text("status").notNull(),
  warnings: jsonb("warnings").notNull(),
  reviewCompletedAt: timestamp("review_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const sourceDocumentsTable = pgTable("source_documents", {
  id: uuid("id").primaryKey(),
  jobId: uuid("job_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  pageCount: integer("page_count").notNull(),
  storagePath: text("storage_path").notNull(),
  status: text("status").notNull(),
  deletionScheduledAt: timestamp("deletion_scheduled_at", { withTimezone: true }),
});

export const extractedRowsTable = pgTable("extracted_rows", {
  id: uuid("id").primaryKey(),
  jobId: uuid("job_id").notNull(),
  rowIndex: integer("row_index").notNull(),
  rawFields: jsonb("raw_fields").notNull(),
  normalized: jsonb("normalized").notNull(),
});

export const storagePolicyTable = pgTable("storage_policies", {
  businessId: uuid("business_id").primaryKey(),
  deleteSourceAfterExport: boolean("delete_source_after_export").notNull().default(true),
  deleteSourceAfterFailure: boolean("delete_source_after_failure").notNull().default(true),
  retentionDays: integer("retention_days").notNull().default(0),
});
