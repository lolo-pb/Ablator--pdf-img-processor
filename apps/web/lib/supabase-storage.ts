import { FileStore } from "@bank/domain";
import { getServerSupabaseClient } from "./supabase";

const sourceBucket = "bank-source-files";
const exportsBucket = "bank-export-files";

export const supabaseFileStore: FileStore = {
  async writeSourceDocument(jobId, filename, buffer) {
    const client = getServerSupabaseClient();
    const path = `${jobId}/${Date.now()}-${filename}`;
    const { error } = await client.storage.from(sourceBucket).upload(path, buffer, {
      upsert: true,
      contentType: "application/octet-stream",
    });
    if (error) {
      throw new Error(`Supabase source upload failed: ${error.message}`);
    }
    return { storagePath: `${sourceBucket}:${path}` };
  },
  async readSourceDocument(storagePath) {
    const client = getServerSupabaseClient();
    const [bucket, ...rest] = storagePath.split(":");
    const path = rest.join(":");
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error || !data) {
      throw new Error(`Supabase source download failed: ${error?.message ?? "missing file"}`);
    }
    return Buffer.from(await data.arrayBuffer());
  },
  async writeExport(jobId, filename, buffer) {
    const client = getServerSupabaseClient();
    const path = `${jobId}/${filename}`;
    const { error } = await client.storage.from(exportsBucket).upload(path, buffer, {
      upsert: true,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    if (error) {
      throw new Error(`Supabase export upload failed: ${error.message}`);
    }
    return { downloadPath: `${exportsBucket}:${path}` };
  },
  async readExport(downloadPath) {
    const client = getServerSupabaseClient();
    const [bucket, ...rest] = downloadPath.split(":");
    const path = rest.join(":");
    const { data, error } = await client.storage.from(bucket).download(path);
    if (error || !data) {
      throw new Error(`Supabase export download failed: ${error?.message ?? "missing file"}`);
    }
    return Buffer.from(await data.arrayBuffer());
  },
  async deleteFile(storagePath) {
    const client = getServerSupabaseClient();
    const [bucket, ...rest] = storagePath.split(":");
    const path = rest.join(":");
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) {
      throw new Error(`Supabase file delete failed: ${error.message}`);
    }
  },
};

