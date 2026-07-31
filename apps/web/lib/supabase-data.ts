import { randomUUID } from "node:crypto";
import { extractedRowSchema, presetSchema } from "@bank/domain";
import type {
  Business,
  ExtractedRow,
  JobStore,
  MembershipRole,
  Preset,
  PresetStore,
  ProcessingJob,
  SourceDocument,
  TenantContext,
  TenantStore,
} from "@bank/domain";
import { demoMembership, demoPreset, demoUser } from "./demo-user";
import { getServerSupabaseClient } from "./supabase";

function mapBusiness(row: any): Business {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    billingContactEmail: row.billing_contact_email,
    retentionPolicyDays: row.retention_policy_days,
  };
}

function mapPreset(row: any): Preset {
  return presetSchema.parse({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    version: row.version,
    status: row.status,
    documentType: row.document_type,
    definition: row.definition,
    exampleNotes: row.example_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapJob(row: any): ProcessingJob {
  return {
    id: row.id,
    businessId: row.business_id,
    presetId: row.preset_id,
    createdBy: row.created_by,
    status: row.status,
    warnings: row.warnings ?? [],
    reviewCompletedAt: row.review_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row: any): SourceDocument {
  return {
    id: row.id,
    jobId: row.job_id,
    filename: row.filename,
    mimeType: row.mime_type,
    pageCount: row.page_count,
    storagePath: row.storage_path,
    status: row.status,
    deletionScheduledAt: row.deletion_scheduled_at,
  };
}

function mapRow(row: any): ExtractedRow {
  return extractedRowSchema.parse({
    id: row.id,
    jobId: row.job_id,
    rowIndex: row.row_index,
    rawFields: row.raw_fields,
    normalized: row.normalized,
  });
}

async function bootstrapIfNeeded() {
  const client = getServerSupabaseClient();
  const { data: business } = await client.from("businesses").select("id").eq("id", "business-acme").maybeSingle();
  if (!business) {
    await client.from("businesses").insert({
      id: "business-acme",
      name: "Acme Foods",
      slug: "acme-foods",
      billing_contact_email: "finance@acme.test",
      retention_policy_days: 0,
      created_at: new Date().toISOString(),
    } as any);
  }

  const { data: user } = await client.from("users").select("id").eq("id", demoUser.id).maybeSingle();
  if (!user) {
    await client.from("users").insert({
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      status: demoUser.status,
      created_at: new Date().toISOString(),
    } as any);
  }

  const { data: membership } = await client
    .from("business_memberships")
    .select("id")
    .eq("id", demoMembership.id)
    .maybeSingle();
  if (!membership) {
    await client.from("business_memberships").insert({
      id: demoMembership.id,
      user_id: demoMembership.userId,
      business_id: demoMembership.businessId,
      role: demoMembership.role,
      created_at: new Date().toISOString(),
    } as any);
  }

  const { data: preset } = await client.from("presets").select("id").eq("id", demoPreset.id).maybeSingle();
  if (!preset) {
    await client.from("presets").insert({
      id: demoPreset.id,
      business_id: demoPreset.businessId,
      name: demoPreset.name,
      version: demoPreset.version,
      status: demoPreset.status,
      document_type: demoPreset.documentType,
      definition: demoPreset.definition,
      example_notes: demoPreset.exampleNotes,
      created_at: demoPreset.createdAt,
      updated_at: demoPreset.updatedAt,
    } as any);
  }
}

export const supabaseTenantStore: TenantStore = {
  async listBusinessesForUser(userId) {
    await bootstrapIfNeeded();
    const client = getServerSupabaseClient();
    const { data, error } = await client
      .from("business_memberships")
      .select("role, businesses(*)")
      .eq("user_id", userId);
    if (error) throw new Error(`Supabase memberships lookup failed: ${error.message}`);
    return (data ?? []).map((row: any) => ({ business: mapBusiness(row.businesses), role: row.role as MembershipRole }));
  },
  async requireMembership(context: TenantContext) {
    const client = getServerSupabaseClient();
    const { data, error } = await client
      .from("business_memberships")
      .select("id")
      .eq("business_id", context.businessId)
      .eq("user_id", context.userId)
      .eq("role", context.role)
      .maybeSingle();
    if (error || !data) throw new Error("Forbidden.");
  },
};

export const supabasePresetStore: PresetStore = {
  async listByBusiness(businessId) {
    await bootstrapIfNeeded();
    const client = getServerSupabaseClient();
    const { data, error } = await client.from("presets").select("*").eq("business_id", businessId).order("updated_at", { ascending: false });
    if (error) throw new Error(`Supabase presets lookup failed: ${error.message}`);
    return (data ?? []).map(mapPreset);
  },
  async getById(businessId, presetId) {
    const client = getServerSupabaseClient();
    const { data, error } = await client.from("presets").select("*").eq("business_id", businessId).eq("id", presetId).maybeSingle();
    if (error) throw new Error(`Supabase preset lookup failed: ${error.message}`);
    return data ? mapPreset(data) : null;
  },
  async createPreset(input) {
    const client = getServerSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from("presets")
      .insert({
        id: input.id ?? randomUUID(),
        business_id: input.businessId,
        name: input.name,
        version: 1,
        status: input.status,
        document_type: input.documentType,
        definition: input.definition,
        example_notes: input.exampleNotes,
        created_at: now,
        updated_at: now,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(`Supabase preset save failed: ${error.message}`);
    return mapPreset(data);
  },
  async updatePreset(input) {
    const client = getServerSupabaseClient();
    const presetsTable: any = client.from("presets");
    const { data, error } = await presetsTable
      .update({
        business_id: input.businessId,
        name: input.name,
        version: input.version,
        status: input.status,
        document_type: input.documentType,
        definition: input.definition,
        example_notes: input.exampleNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("business_id", input.businessId)
      .select("*")
      .single();
    if (error) throw new Error(`Supabase preset update failed: ${error.message}`);
    return mapPreset(data);
  },
};

export const supabaseJobStore: JobStore = {
  async listByBusiness(businessId) {
    const client = getServerSupabaseClient();
    const { data, error } = await client.from("processing_jobs").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    if (error) throw new Error(`Supabase jobs lookup failed: ${error.message}`);
    return (data ?? []).map(mapJob);
  },
  async getActiveJobForUser(userId) {
    const client = getServerSupabaseClient();
    const { data, error } = await client
      .from("processing_jobs")
      .select("*")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase active job lookup failed: ${error.message}`);
    return data ? mapJob(data) : null;
  },
  async getJob(businessId, jobId) {
    const client = getServerSupabaseClient();
    const { data, error } = await client.from("processing_jobs").select("*").eq("business_id", businessId).eq("id", jobId).maybeSingle();
    if (error) throw new Error(`Supabase job lookup failed: ${error.message}`);
    return data ? mapJob(data) : null;
  },
  async createJob(input) {
    const client = getServerSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from("processing_jobs")
      .insert({
        id: randomUUID(),
        business_id: input.businessId,
        preset_id: input.presetId,
        created_by: input.createdBy,
        status: "uploaded",
        warnings: [],
        review_completed_at: null,
        created_at: now,
        updated_at: now,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(`Supabase job creation failed: ${error.message}`);
    return mapJob(data);
  },
  async updateJob(job) {
    const client = getServerSupabaseClient();
    const processingJobsTable: any = client.from("processing_jobs");
    const { error } = await processingJobsTable.update({
      business_id: job.businessId,
      preset_id: job.presetId,
      created_by: job.createdBy,
      status: job.status,
      warnings: job.warnings,
      review_completed_at: job.reviewCompletedAt,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);
    if (error) throw new Error(`Supabase job update failed: ${error.message}`);
  },
  async listRows(jobId) {
    const client = getServerSupabaseClient();
    const { data, error } = await client.from("extracted_rows").select("*").eq("job_id", jobId).order("row_index", { ascending: true });
    if (error) throw new Error(`Supabase rows lookup failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async replaceRows(jobId, rows) {
    const client = getServerSupabaseClient();
    const { error: clearError } = await client.from("extracted_rows").delete().eq("job_id", jobId);
    if (clearError) throw new Error(`Supabase rows clear failed: ${clearError.message}`);
    if (!rows.length) return;
    const { error } = await client.from("extracted_rows").insert(rows.map((row) => ({
      id: row.id,
      job_id: row.jobId,
      row_index: row.rowIndex,
      raw_fields: row.rawFields,
      normalized: row.normalized,
    })) as any);
    if (error) throw new Error(`Supabase rows insert failed: ${error.message}`);
  },
  async clearJobData(jobId) {
    const client = getServerSupabaseClient();
    const { error: rowsError } = await client.from("extracted_rows").delete().eq("job_id", jobId);
    if (rowsError) throw new Error(`Supabase rows clear failed: ${rowsError.message}`);
    const { error: documentsError } = await client.from("source_documents").delete().eq("job_id", jobId);
    if (documentsError) throw new Error(`Supabase documents clear failed: ${documentsError.message}`);
  },
  async listDocuments(jobId) {
    const client = getServerSupabaseClient();
    const { data, error } = await client.from("source_documents").select("*").eq("job_id", jobId);
    if (error) throw new Error(`Supabase documents lookup failed: ${error.message}`);
    return (data ?? []).map(mapDocument);
  },
  async addDocuments(documents) {
    const client = getServerSupabaseClient();
    if (!documents.length) return;
    const { error } = await client.from("source_documents").insert(documents.map((document) => ({
      id: document.id,
      job_id: document.jobId,
      filename: document.filename,
      mime_type: document.mimeType,
      page_count: document.pageCount,
      storage_path: document.storagePath,
      status: document.status,
      deletion_scheduled_at: document.deletionScheduledAt,
    })) as any);
    if (error) throw new Error(`Supabase documents insert failed: ${error.message}`);
  },
  async updateDocuments(jobId, documents) {
    const client = getServerSupabaseClient();
    const { error: clearError } = await client.from("source_documents").delete().eq("job_id", jobId);
    if (clearError) throw new Error(`Supabase documents clear failed: ${clearError.message}`);
    await this.addDocuments(documents);
  },
};

export async function getSupabaseBusinessById(businessId: string): Promise<Business | null> {
  const client = getServerSupabaseClient();
  const { data, error } = await client.from("businesses").select("*").eq("id", businessId).maybeSingle();
  if (error) throw new Error(`Supabase business lookup failed: ${error.message}`);
  return data ? mapBusiness(data) : null;
}

export function assertSupabaseBusinessMembership(role: MembershipRole | undefined): MembershipRole {
  if (!role) throw new Error("Missing business membership.");
  return role;
}
