import { randomUUID } from "node:crypto";
import {
  extractedRowSchema,
  exportRequestSchema,
  reviewPatchSchema,
  type Business,
  type ExtractedRow,
  type Preset,
  type ProcessingJob,
  type TenantContext,
} from "@bank/domain";
import { createExtractionProvider } from "@bank/extraction";
import { buildWorkbookBuffer } from "@bank/export";
import { authProvider } from "./auth";
import { localFileStore } from "./file-store";
import { createAuditEvent, getBusinessById, jobStore, presetStore, tenantStore } from "./repositories";

const extractionProvider = createExtractionProvider();

export async function getDashboardData() {
  const user = await authProvider.getCurrentUser();
  const memberships = await tenantStore.listBusinessesForUser(user.id);

  const businesses = await Promise.all(
    memberships.map(async (membership) => ({
      business: membership.business,
      role: membership.role,
      presets: await presetStore.listByBusiness(membership.business.id),
      jobs: await jobStore.listByBusiness(membership.business.id),
    })),
  );

  return { user, businesses };
}

export async function getBusinessWorkspace(businessId: string) {
  const user = await authProvider.getCurrentUser();
  const memberships = await tenantStore.listBusinessesForUser(user.id);
  const membership = memberships.find((entry) => entry.business.id === businessId);
  if (!membership) {
    throw new Error("Business not found for current user.");
  }

  const presets = await presetStore.listByBusiness(businessId);
  const jobs = await jobStore.listByBusiness(businessId);
  return {
    user,
    business: membership.business,
    role: membership.role,
    presets,
    jobs,
  };
}

export async function getJobReviewData(businessId: string, jobId: string) {
  const workspace = await getBusinessWorkspace(businessId);
  const job = await jobStore.getJob(businessId, jobId);
  if (!job) {
    throw new Error("Job not found.");
  }
  const rows = await jobStore.listRows(jobId);
  const documents = await jobStore.listDocuments(jobId);
  const preset = await presetStore.getById(businessId, job.presetId);
  if (!preset) {
    throw new Error("Preset not found.");
  }

  return {
    ...workspace,
    job,
    rows,
    documents,
    preset,
  };
}

export async function createJobFromUpload(input: {
  businessId: string;
  presetId: string;
  files: File[];
}): Promise<ProcessingJob> {
  const user = await authProvider.getCurrentUser();
  const memberships = await tenantStore.listBusinessesForUser(user.id);
  const membership = memberships.find((entry) => entry.business.id === input.businessId);
  if (!membership) {
    throw new Error("No access to business.");
  }

  const preset = await presetStore.getById(input.businessId, input.presetId);
  if (!preset) {
    throw new Error("Preset not found.");
  }

  const job = await jobStore.createJob({
    businessId: input.businessId,
    presetId: input.presetId,
    createdBy: user.id,
  });

  const documents = [];
  for (const file of input.files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const written = await localFileStore.writeSourceDocument(job.id, file.name, buffer);
    documents.push({
      id: randomUUID(),
      jobId: job.id,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      pageCount: 1,
      storagePath: written.storagePath,
      status: "stored" as const,
      deletionScheduledAt: null,
    });
  }

  await jobStore.addDocuments(documents);
  await jobStore.appendAuditEvent(
    createAuditEvent({
      actorId: user.id,
      businessId: input.businessId,
      targetType: "job",
      targetId: job.id,
      action: "job_created",
      metadata: { presetId: preset.id, fileCount: documents.length },
    }),
  );

  return job;
}

export async function processJob(businessId: string, jobId: string) {
  const job = await jobStore.getJob(businessId, jobId);
  if (!job) {
    throw new Error("Job not found.");
  }
  const preset = await presetStore.getById(businessId, job.presetId);
  if (!preset) {
    throw new Error("Preset not found.");
  }
  const documents = await jobStore.listDocuments(jobId);
  if (documents.length === 0) {
    throw new Error("Upload at least one document before processing.");
  }

  await jobStore.updateJob({ ...job, status: "processing" });

  try {
    const result = await extractionProvider.extractTransactions({
      preset,
      documents,
      readDocument: localFileStore.readSourceDocument,
    });

    const rows: ExtractedRow[] = result.rows.map((row, index) =>
      extractedRowSchema.parse({
        id: row.id || randomUUID(),
        jobId,
        rowIndex: index,
        rawFields: {
          date: row.date,
          description: row.description,
          amount: row.amount,
          category: row.category,
        },
        normalized: row,
      }),
    );

    await jobStore.replaceRows(jobId, rows);
    await jobStore.updateJob({
      ...job,
      status: "review_required",
      warnings: result.warnings,
    });
  } catch (error) {
    await jobStore.updateJob({
      ...job,
      status: "failed",
      warnings: [error instanceof Error ? error.message : "Unknown extraction failure."],
    });
    throw error;
  }
}

export async function updateReviewRows(args: {
  businessId: string;
  jobId: string;
  patch: unknown;
}) {
  const parsed = reviewPatchSchema.parse(args.patch);
  const job = await jobStore.getJob(args.businessId, args.jobId);
  if (!job) {
    throw new Error("Job not found.");
  }

  const currentRows = await jobStore.listRows(args.jobId);
  const nextRows = currentRows.map((row) => {
    const patchRow = parsed.rows.find((entry) => entry.id === row.id);
    if (!patchRow) {
      return row;
    }
    return {
      ...row,
      normalized: {
        ...row.normalized,
        date: patchRow.date,
        description: patchRow.description,
        amount: patchRow.amount,
        category: patchRow.category,
        direction: patchRow.direction,
        notes: patchRow.notes,
        reviewStatus: patchRow.reviewStatus,
      },
    };
  });

  await jobStore.replaceRows(args.jobId, nextRows);
  await jobStore.updateJob({
    ...job,
    reviewCompletedAt: parsed.approvalState === "ready_for_export" ? new Date().toISOString() : null,
    status: "review_required",
  });
}

export async function buildExport(args: {
  businessId: string;
  request: unknown;
}): Promise<{ buffer: Buffer; filename: string }> {
  const request = exportRequestSchema.parse(args.request);
  const job = await jobStore.getJob(args.businessId, request.jobId);
  if (!job) {
    throw new Error("Job not found.");
  }
  if (!job.reviewCompletedAt) {
    throw new Error("Review must be completed before export.");
  }

  const preset = await presetStore.getById(args.businessId, job.presetId);
  if (!preset) {
    throw new Error("Preset not found.");
  }
  const rows = (await jobStore.listRows(job.id)).map((row) => row.normalized);

  const buffer = await buildWorkbookBuffer({
    preset,
    rows,
    request,
  });
  const filename = `${preset.name.replace(/\s+/g, "-").toLowerCase()}-${job.id}.xlsx`;
  const saved = await localFileStore.writeExport(job.id, filename, buffer);

  await jobStore.saveExport({
    id: randomUUID(),
    jobId: job.id,
    format: "xlsx",
    generatedAt: new Date().toISOString(),
    downloadPath: saved.downloadPath,
  });

  const documents = await jobStore.listDocuments(job.id);
  await Promise.all(
    documents
      .filter((document) => document.status === "stored")
      .map(async (document) => {
        await localFileStore.deleteFile(document.storagePath);
        document.status = "deleted";
        document.deletionScheduledAt = new Date().toISOString();
      }),
  );
  await jobStore.updateDocuments(job.id, documents);
  await jobStore.updateJob({
    ...job,
    status: "completed",
  });

  return { buffer, filename };
}

export async function savePresetVersion(args: {
  businessId: string;
  name: string;
  documentFamily: Preset["documentFamily"];
  instructionText: string;
  categories: string[];
  ignoreRules: string[];
  exampleNotes: string;
}) {
  await getBusinessWorkspace(args.businessId);

  return presetStore.saveVersion({
    businessId: args.businessId,
    name: args.name,
    status: "active",
    documentFamily: args.documentFamily,
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
      classificationCategories: args.categories,
      ignoreRules: args.ignoreRules,
      instructionText: args.instructionText,
      dateParsingRules: ["Normalize to YYYY-MM-DD"],
      amountParsingRules: ["Return numeric decimal amounts only"],
      directionRules: ["Outgoing values are debit", "Incoming values are credit"],
      payeeHints: ["Use the clearest merchant or counterparty label available"],
    },
    exampleNotes: args.exampleNotes,
  });
}

export async function requireBusiness(businessId: string): Promise<Business> {
  const business = await getBusinessById(businessId);
  if (!business) {
    throw new Error("Business not found.");
  }
  return business;
}

export function makeTenantContext(businessId: string, userId: string, role: TenantContext["role"]): TenantContext {
  return { businessId, userId, role };
}

