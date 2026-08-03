import { randomUUID } from "node:crypto";
import { presetSchema } from "@bank/domain";
import type {
  Business,
  MembershipRole,
  Preset,
  PresetStore,
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
