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
import { fileStore } from "./file-store";
import {
  activeJobStore as jobStore,
  activePresetStore as presetStore,
  activeTenantStore as tenantStore,
  createAuditEvent,
  getBusinessById,
} from "./repositories";

const extractionProvider = createExtractionProvider();
const editableStatuses: ProcessingJob["status"][] = ["uploaded", "review_required"];

function getLatestActiveTemplates(presets: Preset[]) {
  const latestByName = new Map<string, Preset>();
  for (const preset of presets) {
    if (preset.status !== "active") {
      continue;
    }
    const current = latestByName.get(preset.name);
    if (!current || preset.version > current.version) {
      latestByName.set(preset.name, preset);
    }
  }
  return Array.from(latestByName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDashboardData() {
  const user = await authProvider.getCurrentUser();
  const memberships = await tenantStore.listBusinessesForUser(user.id);

  const businesses = await Promise.all(
    memberships.map(async (membership) => ({
      business: membership.business,
      role: membership.role,
      templates: getLatestActiveTemplates(await presetStore.listByBusiness(membership.business.id)),
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
  return {
    user,
    business: membership.business,
    role: membership.role,
    presets,
    templates: getLatestActiveTemplates(presets),
  };
}

async function getEditableDraftJobForTemplate(args: {
  businessId: string;
  presetId: string;
  userId: string;
}) {
  const jobs = await jobStore.listByBusiness(args.businessId);
  return (
    jobs.find(
      (job) =>
        job.presetId === args.presetId &&
        job.createdBy === args.userId &&
        editableStatuses.includes(job.status),
    ) ?? null
  );
}

export async function getTemplateDetailData(args: {
  businessId: string;
  templateId: string;
  jobId?: string | null;
}) {
  const workspace = await getBusinessWorkspace(args.businessId);
  const preset = await presetStore.getById(args.businessId, args.templateId);
  if (!preset) {
    throw new Error("Template not found.");
  }

  let job =
    args.jobId && args.jobId.length > 0
      ? await jobStore.getJob(args.businessId, args.jobId)
      : await getEditableDraftJobForTemplate({
          businessId: args.businessId,
          presetId: args.templateId,
          userId: workspace.user.id,
        });

  if (job && job.presetId !== preset.id) {
    job = null;
  }

  const documents = job ? await jobStore.listDocuments(job.id) : [];
  const rows = job ? await jobStore.listRows(job.id) : [];

  return {
    ...workspace,
    preset,
    job,
    documents,
    rows,
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

async function buildSourceDocuments(jobId: string, files: File[]) {
  const documents = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const written = await fileStore.writeSourceDocument(jobId, file.name, buffer);
    documents.push({
      id: randomUUID(),
      jobId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      pageCount: 1,
      storagePath: written.storagePath,
      status: "stored" as const,
      deletionScheduledAt: null,
    });
  }

  return documents;
}

export async function createOrUpdateDraftJob(input: {
  businessId: string;
  presetId: string;
  jobId?: string | null;
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

  let job =
    input.jobId && input.jobId.length > 0 ? await jobStore.getJob(input.businessId, input.jobId) : null;

  if (!job || job.presetId !== input.presetId || !editableStatuses.includes(job.status)) {
    job = await getEditableDraftJobForTemplate({
      businessId: input.businessId,
      presetId: input.presetId,
      userId: user.id,
    });
  }

  if (!job) {
    job = await jobStore.createJob({
      businessId: input.businessId,
      presetId: input.presetId,
      createdBy: user.id,
    });
  }

  const existingDocuments = await jobStore.listDocuments(job.id);
  const nextFiles = input.files.filter((file) => file.size > 0);

  if (nextFiles.length > 0) {
    await Promise.all(
      existingDocuments
        .filter((document) => document.status === "stored")
        .map((document) => fileStore.deleteFile(document.storagePath)),
    );

    const newDocuments = await buildSourceDocuments(job.id, nextFiles);
    await jobStore.updateDocuments(job.id, newDocuments);
    await jobStore.replaceRows(job.id, []);
    await jobStore.updateJob({
      ...job,
      status: "uploaded",
      warnings: [],
      reviewCompletedAt: null,
    });
    await jobStore.appendAuditEvent(
      createAuditEvent({
        actorId: user.id,
        businessId: input.businessId,
        targetType: "job",
        targetId: job.id,
        action: "job_files_replaced",
        metadata: { presetId: preset.id, fileCount: newDocuments.length },
      }),
    );
    return { ...job, status: "uploaded", warnings: [], reviewCompletedAt: null };
  }

  if (existingDocuments.length === 0) {
    throw new Error("Upload at least one document before processing.");
  }

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
      readDocument: fileStore.readSourceDocument,
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
  const saved = await fileStore.writeExport(job.id, filename, buffer);

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
        await fileStore.deleteFile(document.storagePath);
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

export function getTemplateRoute(businessId: string, templateId: string, jobId?: string | null) {
  const query = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
  return `/businesses/${businessId}/templates/${templateId}${query}`;
}

export function getReviewRoute(businessId: string, jobId: string) {
  return `/businesses/${businessId}/jobs/${jobId}/review`;
}
