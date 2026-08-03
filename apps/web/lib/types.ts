import type {
  Business,
  BusinessMembership,
  Preset,
  User,
} from "@bank/domain";

export type AppState = {
  businesses: Business[];
  users: User[];
  memberships: BusinessMembership[];
  presets: Preset[];
};
