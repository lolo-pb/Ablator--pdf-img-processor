import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileStore } from "@bank/domain";
import { shouldUseSupabase } from "./runtime";
import { supabaseFileStore } from "./supabase-storage";

const root = path.join(process.cwd(), ".local");
const uploadsDir = path.join(root, "uploads");
const exportsDir = path.join(root, "exports");

async function ensureDirs() {
  await Promise.all([
    mkdir(uploadsDir, { recursive: true }),
    mkdir(exportsDir, { recursive: true }),
  ]);
}

export const localFileStore: FileStore = {
  async writeSourceDocument(jobId, filename, buffer) {
    await ensureDirs();
    const storagePath = path.join(uploadsDir, `${jobId}-${Date.now()}-${filename}`);
    await writeFile(storagePath, buffer);
    return { storagePath };
  },
  async readSourceDocument(storagePath) {
    return readFile(storagePath);
  },
  async writeExport(jobId, filename, buffer) {
    await ensureDirs();
    const downloadPath = path.join(exportsDir, `${jobId}-${filename}`);
    await writeFile(downloadPath, buffer);
    return { downloadPath };
  },
  async readExport(downloadPath) {
    return readFile(downloadPath);
  },
  async deleteFile(filePath) {
    await rm(filePath, { force: true });
  },
};

export const fileStore: FileStore = {
  async writeSourceDocument(jobId, filename, buffer) {
    if (shouldUseSupabase()) return supabaseFileStore.writeSourceDocument(jobId, filename, buffer);
    return localFileStore.writeSourceDocument(jobId, filename, buffer);
  },
  async readSourceDocument(storagePath) {
    if (shouldUseSupabase()) return supabaseFileStore.readSourceDocument(storagePath);
    return localFileStore.readSourceDocument(storagePath);
  },
  async writeExport(jobId, filename, buffer) {
    if (shouldUseSupabase()) return supabaseFileStore.writeExport(jobId, filename, buffer);
    return localFileStore.writeExport(jobId, filename, buffer);
  },
  async readExport(downloadPath) {
    if (shouldUseSupabase()) return supabaseFileStore.readExport(downloadPath);
    return localFileStore.readExport(downloadPath);
  },
  async deleteFile(filePath) {
    if (shouldUseSupabase()) return supabaseFileStore.deleteFile(filePath);
    return localFileStore.deleteFile(filePath);
  },
};
