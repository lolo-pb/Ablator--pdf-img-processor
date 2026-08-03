import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { initialState } from "./seed";
import type { AppState } from "./types";

const dataDir = path.join(process.cwd(), ".local");
const statePath = path.join(dataDir, "app-state.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

export async function readAppState(): Promise<AppState> {
  await ensureDataDir();
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as AppState & Record<string, unknown>;
    const state: AppState = {
      businesses: parsed.businesses ?? [],
      users: parsed.users ?? [],
      memberships: parsed.memberships ?? [],
      presets: parsed.presets ?? [],
    };
    if ("jobs" in parsed || "documents" in parsed || "rows" in parsed || "storagePolicies" in parsed) {
      await writeAppState(state);
    }
    return state;
  } catch {
    await writeAppState(initialState);
    return initialState;
  }
}

export async function writeAppState(state: AppState): Promise<void> {
  await ensureDataDir();
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

export async function withAppState<T>(updater: (state: AppState) => Promise<T> | T): Promise<T> {
  const state = await readAppState();
  const result = await updater(state);
  await writeAppState(state);
  return result;
}
