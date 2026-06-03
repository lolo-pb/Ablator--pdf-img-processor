import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileStore } from "@bank/domain";

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

