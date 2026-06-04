import type { AppState } from "./types";
import { demoMembership, demoPreset, demoUser } from "./demo-user";

export const initialState: AppState = {
  businesses: [
    {
      id: "business-acme",
      name: "Acme Foods",
      slug: "acme-foods",
      billingContactEmail: "finance@acme.test",
      retentionPolicyDays: 0,
    },
  ],
  users: [demoUser],
  memberships: [demoMembership],
  presets: [demoPreset],
  jobs: [],
  documents: [],
  rows: [],
  storagePolicies: [
    {
      deleteSourceAfterExport: true,
      deleteSourceAfterFailure: true,
      retentionDays: 0,
    },
  ],
};
