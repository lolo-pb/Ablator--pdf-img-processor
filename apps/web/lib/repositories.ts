import { randomUUID } from "node:crypto";
import type {
  AuditEvent,
  Business,
  ExportArtifact,
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
  async saveExport(artifact) {
    await withAppState((state) => {
      state.exports.push(artifact);
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
  async appendAuditEvent(event) {
    await withAppState((state) => {
      state.auditEvents.push(event);
    });
  },
};

export async function getBusinessById(businessId: string): Promise<Business | null> {
  const state = await readAppState();
  return state.businesses.find((business) => business.id === businessId) ?? null;
}

export function createAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">): AuditEvent {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

export function assertBusinessMembership(role: MembershipRole | undefined): MembershipRole {
  if (!role) {
    throw new Error("Missing business membership.");
  }
  return role;
}

