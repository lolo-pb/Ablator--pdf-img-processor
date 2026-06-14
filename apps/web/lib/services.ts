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
  getBusinessById,
} from "./repositories";

const extractionProvider = createExtractionProvider();

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

function getLatestActiveTemplateForName(presets: Preset[], name: string) {
  return getLatestActiveTemplates(presets).find((preset) => preset.name === name) ?? null;
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

async function getActiveBatchForCurrentUser() {
  const user = await authProvider.getCurrentUser();
  const job = await jobStore.getActiveJobForUser(user.id);
  return { user, job };
}

async function clearStoredFiles(documents: Array<{ storagePath: string; status: string }>) {
  await Promise.all(
    documents
      .filter((document) => document.status === "stored")
      .map((document) => fileStore.deleteFile(document.storagePath)),
  );
}

async function clearBatch(job: ProcessingJob) {
  const documents = await jobStore.listDocuments(job.id);
  await clearStoredFiles(documents);
  await jobStore.clearJobData(job.id);
}

export async function getTemplateDetailData(args: {
  businessId: string;
  templateId: string;
  jobId?: string | null;
}) {
  const workspace = await getBusinessWorkspace(args.businessId);
  const requestedPreset = await presetStore.getById(args.businessId, args.templateId);
  if (!requestedPreset) {
    throw new Error("Template not found.");
  }
  const preset = getLatestActiveTemplateForName(workspace.presets, requestedPreset.name) ?? requestedPreset;
  const familyPresetIds = new Set(
    workspace.presets
      .filter((entry) => entry.name === requestedPreset.name)
      .map((entry) => entry.id),
  );

  const activeJob = await jobStore.getActiveJobForUser(workspace.user.id);
  const requestedJob =
    args.jobId && args.jobId.length > 0 ? await jobStore.getJob(args.businessId, args.jobId) : null;

  let job: ProcessingJob | null = null;
  if (requestedJob && activeJob && requestedJob.id === activeJob.id && familyPresetIds.has(requestedJob.presetId)) {
    job = requestedJob;
  } else if (activeJob && activeJob.businessId === args.businessId && familyPresetIds.has(activeJob.presetId)) {
    job = activeJob;
  }

  const documents = job ? await jobStore.listDocuments(job.id) : [];
  const rows = job ? await jobStore.listRows(job.id) : [];

  return {
    ...workspace,
    requestedPreset,
    preset,
    job,
    documents,
    rows,
  };
}

export async function getJobReviewData(businessId: string, jobId: string) {
  const workspace = await getBusinessWorkspace(businessId);
  const activeJob = await jobStore.getActiveJobForUser(workspace.user.id);
  if (!activeJob || activeJob.id !== jobId || activeJob.businessId !== businessId) {
    throw new Error("This batch is no longer active. Return to the template and process again.");
  }
  const job = activeJob;
  const rows = await jobStore.listRows(jobId);
  const documents = await jobStore.listDocuments(jobId);
  const preset = await presetStore.getById(businessId, job.presetId);
  if (!preset) {
    throw new Error("Preset not found.");
  }
  const latestPreset = getLatestActiveTemplateForName(workspace.presets, preset.name) ?? preset;

  return {
    ...workspace,
    job,
    rows,
    documents,
    preset,
    latestPreset,
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

export async function createOrReplaceActiveBatch(input: {
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

  const nextFiles = input.files.filter((file) => file.size > 0);
  let job = await jobStore.getActiveJobForUser(user.id);

  if (nextFiles.length > 0) {
    if (!job) {
      job = await jobStore.createJob({
        businessId: input.businessId,
        presetId: input.presetId,
        createdBy: user.id,
      });
    } else {
      await clearBatch(job);
      await jobStore.updateJob({
        ...job,
        businessId: input.businessId,
        presetId: input.presetId,
        status: "uploaded",
        warnings: [],
        reviewCompletedAt: null,
      });
    }

    const newDocuments = await buildSourceDocuments(job.id, nextFiles);
    await jobStore.updateDocuments(job.id, newDocuments);
    await jobStore.replaceRows(job.id, []);
    await jobStore.updateJob({
      ...job,
        status: "uploaded",
        warnings: [],
        reviewCompletedAt: null,
      });
    return {
      ...job,
      businessId: input.businessId,
      presetId: input.presetId,
      status: "uploaded",
      warnings: [],
      reviewCompletedAt: null,
    };
  }

  if (!job || job.businessId !== input.businessId || job.presetId !== input.presetId) {
    throw new Error("Upload at least one document before processing.");
  }

  if (job.status === "review_required" || job.status === "completed") {
    return job;
  }

  const existingDocuments = await jobStore.listDocuments(job.id);
  if (existingDocuments.length === 0) {
    throw new Error("Upload at least one document before processing.");
  }

  return job;
}

export async function processJob(businessId: string, jobId: string) {
  const { user, job } = await getActiveBatchForCurrentUser();
  if (!job || job.id !== jobId || job.businessId !== businessId || job.createdBy !== user.id) {
    throw new Error("Job not found.");
  }
  if (job.status === "review_required" || job.status === "completed") {
    throw new Error("Upload new files to process this template again.");
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
        rawFields: row.values,
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
  const { user, job } = await getActiveBatchForCurrentUser();
  if (!job || job.id !== args.jobId || job.businessId !== args.businessId || job.createdBy !== user.id) {
    throw new Error("This batch is no longer active.");
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
        values: patchRow.values,
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
  const { user, job } = await getActiveBatchForCurrentUser();
  if (!job || job.id !== request.jobId || job.businessId !== args.businessId || job.createdBy !== user.id) {
    throw new Error("This batch is no longer active.");
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
  await jobStore.updateJob({ ...job, status: "completed" });

  return { buffer, filename };
}

export async function savePresetVersion(args: {
  businessId: string;
  name: string;
  documentType: Preset["documentType"];
  columns: Preset["definition"]["columns"];
  instructionText: string;
  ignoreRules: string[];
}) {
  await getBusinessWorkspace(args.businessId);

  return presetStore.saveVersion({
    businessId: args.businessId,
    name: args.name,
    status: "active",
    documentType: args.documentType,
    definition: {
      columns: args.columns,
      classificationCategories: [],
      ignoreRules: args.ignoreRules,
      instructionText: args.instructionText,
      dateParsingRules: [],
      amountParsingRules: [],
      directionRules: [],
      payeeHints: [],
    },
    exampleNotes: "",
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
