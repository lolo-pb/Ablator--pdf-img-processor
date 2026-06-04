import { randomUUID } from "node:crypto";
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
import { shouldUseSupabase } from "./runtime";
import {
  assertSupabaseBusinessMembership,
  getSupabaseBusinessById,
  supabaseJobStore,
  supabasePresetStore,
  supabaseTenantStore,
} from "./supabase-data";
import { withAppState, readAppState } from "./state-store";

export const tenantStore: TenantStore = {
  async listBusinessesForUser(userId) {
    const state = await readAppState();
    return state.memberships
      .filter((membership) => membership.userId === userId)
      .map((membership) => {
        const business = state.businesses.find((entry) => entry.id === membership.businessId);
        if (!business) {
          throw new Error(`Missing business ${membership.businessId}.`);
        }
        return { business, role: membership.role };
      });
  },
  async requireMembership(context: TenantContext) {
    const state = await readAppState();
    const membership = state.memberships.find(
      (entry) =>
        entry.businessId === context.businessId &&
        entry.userId === context.userId &&
        entry.role === context.role,
    );
    if (!membership) {
      throw new Error("Forbidden.");
    }
  },
};

export const presetStore: PresetStore = {
  async listByBusiness(businessId) {
    const state = await readAppState();
    return state.presets
      .filter((preset) => preset.businessId === businessId)
      .sort((a, b) => b.version - a.version);
  },
  async getById(businessId, presetId) {
    const state = await readAppState();
    return state.presets.find((preset) => preset.businessId === businessId && preset.id === presetId) ?? null;
  },
  async saveVersion(input) {
    return withAppState((state) => {
      const related = state.presets.filter(
        (preset) => preset.businessId === input.businessId && preset.name === input.name,
      );
      const version = related.length ? Math.max(...related.map((preset) => preset.version)) + 1 : 1;
      const now = new Date().toISOString();
      const nextPreset: Preset = {
        ...input,
        id: input.id ?? randomUUID(),
        version,
        createdAt: now,
        updatedAt: now,
      };
      state.presets.push(nextPreset);
      return nextPreset;
    });
  },
};

export const jobStore: JobStore = {
  async listByBusiness(businessId) {
    const state = await readAppState();
    return state.jobs.filter((job) => job.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getActiveJobForUser(userId) {
    const state = await readAppState();
    const jobs = state.jobs
      .filter((job) => job.createdBy === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return jobs[0] ?? null;
  },
  async getJob(businessId, jobId) {
    const state = await readAppState();
    return state.jobs.find((job) => job.businessId === businessId && job.id === jobId) ?? null;
  },
  async createJob(input) {
    return withAppState((state) => {
      const now = new Date().toISOString();
      const job: ProcessingJob = {
        ...input,
        id: randomUUID(),
        status: "uploaded",
        warnings: [],
        reviewCompletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      state.jobs.push(job);
      return job;
    });
  },
  async updateJob(job) {
    await withAppState((state) => {
      const index = state.jobs.findIndex((entry) => entry.id === job.id);
      if (index < 0) {
        throw new Error("Job not found.");
      }
      state.jobs[index] = { ...job, updatedAt: new Date().toISOString() };
    });
  },
  async listRows(jobId) {
    const state = await readAppState();
    return state.rows.filter((row) => row.jobId === jobId).sort((a, b) => a.rowIndex - b.rowIndex);
  },
  async replaceRows(jobId, rows) {
    await withAppState((state) => {
      state.rows = state.rows.filter((row) => row.jobId !== jobId).concat(rows);
    });
  },
  async clearJobData(jobId) {
    await withAppState((state) => {
      state.rows = state.rows.filter((row) => row.jobId !== jobId);
      state.documents = state.documents.filter((document) => document.jobId !== jobId);
    });
  },
  async listDocuments(jobId) {
    const state = await readAppState();
    return state.documents.filter((document) => document.jobId === jobId);
  },
  async addDocuments(documents) {
    await withAppState((state) => {
      state.documents.push(...documents);
    });
  },
  async updateDocuments(jobId, documents) {
    await withAppState((state) => {
      state.documents = state.documents.filter((document) => document.jobId !== jobId).concat(documents);
    });
  },
};

export async function getBusinessById(businessId: string): Promise<Business | null> {
  if (shouldUseSupabase()) {
    return getSupabaseBusinessById(businessId);
  }
  const state = await readAppState();
  return state.businesses.find((business) => business.id === businessId) ?? null;
}

export function assertBusinessMembership(role: MembershipRole | undefined): MembershipRole {
  if (shouldUseSupabase()) {
    return assertSupabaseBusinessMembership(role);
  }
  if (!role) {
    throw new Error("Missing business membership.");
  }
  return role;
}

export const activeTenantStore: TenantStore = {
  async listBusinessesForUser(userId) {
    if (shouldUseSupabase()) return supabaseTenantStore.listBusinessesForUser(userId);
    return tenantStore.listBusinessesForUser(userId);
  },
  async requireMembership(context) {
    if (shouldUseSupabase()) return supabaseTenantStore.requireMembership(context);
    return tenantStore.requireMembership(context);
  },
};

export const activePresetStore: PresetStore = {
  async listByBusiness(businessId) {
    if (shouldUseSupabase()) return supabasePresetStore.listByBusiness(businessId);
    return presetStore.listByBusiness(businessId);
  },
  async getById(businessId, presetId) {
    if (shouldUseSupabase()) return supabasePresetStore.getById(businessId, presetId);
    return presetStore.getById(businessId, presetId);
  },
  async saveVersion(input) {
    if (shouldUseSupabase()) return supabasePresetStore.saveVersion(input);
    return presetStore.saveVersion(input);
  },
};

export const activeJobStore: JobStore = {
  async listByBusiness(businessId) {
    if (shouldUseSupabase()) return supabaseJobStore.listByBusiness(businessId);
    return jobStore.listByBusiness(businessId);
  },
  async getActiveJobForUser(userId) {
    if (shouldUseSupabase()) return supabaseJobStore.getActiveJobForUser(userId);
    return jobStore.getActiveJobForUser(userId);
  },
  async getJob(businessId, jobId) {
    if (shouldUseSupabase()) return supabaseJobStore.getJob(businessId, jobId);
    return jobStore.getJob(businessId, jobId);
  },
  async createJob(input) {
    if (shouldUseSupabase()) return supabaseJobStore.createJob(input);
    return jobStore.createJob(input);
  },
  async updateJob(job) {
    if (shouldUseSupabase()) return supabaseJobStore.updateJob(job);
    return jobStore.updateJob(job);
  },
  async listRows(jobId) {
    if (shouldUseSupabase()) return supabaseJobStore.listRows(jobId);
    return jobStore.listRows(jobId);
  },
  async replaceRows(jobId, rows) {
    if (shouldUseSupabase()) return supabaseJobStore.replaceRows(jobId, rows);
    return jobStore.replaceRows(jobId, rows);
  },
  async clearJobData(jobId) {
    if (shouldUseSupabase()) return supabaseJobStore.clearJobData(jobId);
    return jobStore.clearJobData(jobId);
  },
  async listDocuments(jobId) {
    if (shouldUseSupabase()) return supabaseJobStore.listDocuments(jobId);
    return jobStore.listDocuments(jobId);
  },
  async addDocuments(documents) {
    if (shouldUseSupabase()) return supabaseJobStore.addDocuments(documents);
    return jobStore.addDocuments(documents);
  },
  async updateDocuments(jobId, documents) {
    if (shouldUseSupabase()) return supabaseJobStore.updateDocuments(jobId, documents);
    return jobStore.updateDocuments(jobId, documents);
  },
};
