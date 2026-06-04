import type {
  Business,
  BusinessMembership,
  ExtractedRow,
  Preset,
  ProcessingJob,
  SourceDocument,
  StoragePolicy,
  User,
} from "@bank/domain";

export type AppState = {
  businesses: Business[];
  users: User[];
  memberships: BusinessMembership[];
  presets: Preset[];
  jobs: ProcessingJob[];
  documents: SourceDocument[];
  rows: ExtractedRow[];
  storagePolicies: StoragePolicy[];
};
