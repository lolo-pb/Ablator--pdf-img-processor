"use client";

import { createContext, useContext, useState } from "react";
import type { NormalizedTemplateRow, Preset } from "@bank/domain";

type SessionBatch = {
  businessId: string;
  preset: Preset;
  rows: NormalizedTemplateRow[];
  warnings: string[];
};

const SessionBatchContext = createContext<{
  batch: SessionBatch | null;
  setBatch: (batch: SessionBatch | null) => void;
} | null>(null);

export function SessionBatchProvider({ children }: { children: React.ReactNode }) {
  const [batch, setBatch] = useState<SessionBatch | null>(null);
  return <SessionBatchContext.Provider value={{ batch, setBatch }}>{children}</SessionBatchContext.Provider>;
}

export function useSessionBatch() {
  const context = useContext(SessionBatchContext);
  if (!context) throw new Error("Session batch provider is missing.");
  return context;
}
