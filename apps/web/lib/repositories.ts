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
import { shouldUseSupabase } from "./runtime";
import {
  assertSupabaseBusinessMembership,
  getSupabaseBusinessById,
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
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((preset) => presetSchema.parse(preset));
  },
  async getById(businessId, presetId) {
    const state = await readAppState();
    const preset = state.presets.find((entry) => entry.businessId === businessId && entry.id === presetId);
    return preset ? presetSchema.parse(preset) : null;
  },
  async createPreset(input) {
    return withAppState((state) => {
      const now = new Date().toISOString();
      const nextPreset: Preset = {
        ...input,
        id: input.id ?? randomUUID(),
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      state.presets.push(nextPreset);
      return nextPreset;
    });
  },
  async updatePreset(input) {
    return withAppState((state) => {
      const index = state.presets.findIndex(
        (preset) => preset.businessId === input.businessId && preset.id === input.id,
      );
      if (index < 0) {
        throw new Error("Preset not found.");
      }
      const nextPreset: Preset = {
        ...input,
        createdAt: state.presets[index].createdAt,
        updatedAt: new Date().toISOString(),
      };
      state.presets[index] = nextPreset;
      return nextPreset;
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
  async createPreset(input) {
    if (shouldUseSupabase()) return supabasePresetStore.createPreset(input);
    return presetStore.createPreset(input);
  },
  async updatePreset(input) {
    if (shouldUseSupabase()) return supabasePresetStore.updatePreset(input);
    return presetStore.updatePreset(input);
  },
};
