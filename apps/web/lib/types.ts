import type {
  AuditEvent,
  Business,
  BusinessMembership,
  ExportArtifact,
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
  exports: ExportArtifact[];
  auditEvents: AuditEvent[];
  storagePolicies: StoragePolicy[];
};

