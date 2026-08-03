import { exportRequestSchema, normalizedTemplateRowSchema, type Business, type Preset, type TenantContext } from "@bank/domain";
import { createExtractionProvider } from "@bank/extraction";
import { buildWorkbookBuffer } from "@bank/export";
import { authProvider } from "./auth";
import {
  activePresetStore as presetStore,
  activeTenantStore as tenantStore,
  getBusinessById,
} from "./repositories";

const extractionProvider = createExtractionProvider();

export async function getDashboardData() {
  const user = await authProvider.getCurrentUser();
  const memberships = await tenantStore.listBusinessesForUser(user.id);
  const businesses = await Promise.all(
    memberships.map(async (membership) => ({
      business: membership.business,
      role: membership.role,
      templates: (await presetStore.listByBusiness(membership.business.id)).filter((preset) => preset.status === "active"),
    })),
  );
  return { user, businesses };
}

export async function getBusinessWorkspace(businessId: string) {
  const user = await authProvider.getCurrentUser();
  const memberships = await tenantStore.listBusinessesForUser(user.id);
  const membership = memberships.find((entry) => entry.business.id === businessId);
  if (!membership) throw new Error("Business not found for current user.");

  const presets = await presetStore.listByBusiness(businessId);
  return {
    user,
    business: membership.business,
    role: membership.role,
    presets,
    templates: presets.filter((preset) => preset.status === "active").sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getTemplateDetailData(args: { businessId: string; templateId: string }) {
  const workspace = await getBusinessWorkspace(args.businessId);
  const preset = await presetStore.getById(args.businessId, args.templateId);
  if (!preset) throw new Error("Template not found.");
  return { ...workspace, preset };
}

export async function processInMemoryDocuments(args: {
  businessId: string;
  presetId: string;
  files: File[];
}) {
  await getBusinessWorkspace(args.businessId);
  const preset = await presetStore.getById(args.businessId, args.presetId);
  if (!preset) throw new Error("Template not found.");

  const files = args.files.filter((file) => file.size > 0);
  if (!files.length) throw new Error("Upload at least one document before processing.");

  return extractionProvider.extractTransactions({
    preset,
    documents: await Promise.all(files.map(async (file) => ({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      content: Buffer.from(await file.arrayBuffer()),
    }))),
  });
}

export async function buildInMemoryExport(args: {
  businessId: string;
  presetId: string;
  request: unknown;
}): Promise<{ buffer: Buffer; filename: string }> {
  await getBusinessWorkspace(args.businessId);
  const preset = await presetStore.getById(args.businessId, args.presetId);
  if (!preset) throw new Error("Template not found.");

  const input = args.request as Record<string, unknown>;
  const request = exportRequestSchema.parse({
    format: "xlsx",
    selectedColumns: input.selectedColumns,
    workbookName: input.workbookName,
  });
  const rows = Array.isArray(input.rows) ? input.rows.map((row) => normalizedTemplateRowSchema.parse(row)) : [];
  const buffer = await buildWorkbookBuffer({ preset, rows, request });
  return { buffer, filename: `${request.workbookName}.xlsx` };
}

export async function createPreset(args: {
  businessId: string;
  name: string;
  documentType: Preset["documentType"];
  columns: Preset["definition"]["columns"];
  instructionText: string;
  ignoreRules: string;
}) {
  await getBusinessWorkspace(args.businessId);
  return presetStore.createPreset({
    businessId: args.businessId,
    name: args.name,
    status: "active",
    documentType: args.documentType,
    definition: { columns: args.columns, ignoreRules: args.ignoreRules, instructionText: args.instructionText },
    exampleNotes: "",
  });
}

export async function updatePreset(args: {
  businessId: string;
  presetId: string;
  name: string;
  documentType: Preset["documentType"];
  columns: Preset["definition"]["columns"];
  instructionText: string;
  ignoreRules: string;
}) {
  const workspace = await getBusinessWorkspace(args.businessId);
  const existing = await presetStore.getById(args.businessId, args.presetId);
  if (!existing) throw new Error("Template not found.");
  return presetStore.updatePreset({
    ...existing,
    businessId: workspace.business.id,
    name: args.name,
    documentType: args.documentType,
    definition: { ...existing.definition, columns: args.columns, ignoreRules: args.ignoreRules, instructionText: args.instructionText },
    updatedAt: new Date().toISOString(),
  });
}

export async function requireBusiness(businessId: string): Promise<Business> {
  const business = await getBusinessById(businessId);
  if (!business) throw new Error("Business not found.");
  return business;
}

export function makeTenantContext(businessId: string, userId: string, role: TenantContext["role"]): TenantContext {
  return { businessId, userId, role };
}

export function getTemplateRoute(businessId: string, templateId: string) {
  return `/businesses/${businessId}/templates/${templateId}`;
}
