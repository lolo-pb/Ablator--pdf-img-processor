"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createJobFromUpload, processJob, savePresetVersion } from "../lib/services";

function splitLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function createPresetAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  await savePresetVersion({
    businessId,
    name: String(formData.get("name")),
    documentFamily: String(formData.get("documentFamily")) as "bank_summary" | "reconciliation" | "statement",
    instructionText: String(formData.get("instructionText")),
    categories: splitLines(formData.get("categories")),
    ignoreRules: splitLines(formData.get("ignoreRules")),
    exampleNotes: String(formData.get("exampleNotes")),
  });

  revalidatePath(`/businesses/${businessId}`);
}

export async function createJobAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  const presetId = String(formData.get("presetId"));
  const fileEntries = formData.getAll("documents");
  const files = fileEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const job = await createJobFromUpload({
    businessId,
    presetId,
    files,
  });

  revalidatePath(`/businesses/${businessId}`);
  redirect(`/businesses/${businessId}/jobs/${job.id}`);
}

export async function processJobAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  const jobId = String(formData.get("jobId"));
  await processJob(businessId, jobId);
  revalidatePath(`/businesses/${businessId}/jobs/${jobId}`);
}

