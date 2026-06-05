"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createOrReplaceActiveBatch,
  getReviewRoute,
  getTemplateRoute,
  processJob,
  savePresetVersion,
} from "../lib/services";

function splitLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function createPresetAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  const preset = await savePresetVersion({
    businessId,
    name: String(formData.get("name")),
    documentType: String(formData.get("documentType")),
    instructionText: String(formData.get("instructionText")),
    categories: splitLines(formData.get("categories")),
    ignoreRules: splitLines(formData.get("ignoreRules")),
    exampleNotes: String(formData.get("exampleNotes")),
  });

  revalidatePath(`/businesses/${businessId}`);
  redirect(getTemplateRoute(businessId, preset.id));
}

export async function processTemplateAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  const presetId = String(formData.get("presetId"));
  const jobIdValue = formData.get("jobId");
  const fileEntries = formData.getAll("documents");
  const files = fileEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const job = await createOrReplaceActiveBatch({
    businessId,
    presetId,
    jobId: typeof jobIdValue === "string" && jobIdValue.length > 0 ? jobIdValue : null,
    files,
  });

  const shouldProcess = files.length > 0 || job.status === "uploaded" || job.status === "failed";
  if (shouldProcess) {
    await processJob(businessId, job.id);
  }
  revalidatePath(getTemplateRoute(businessId, presetId, job.id));
  redirect(getReviewRoute(businessId, job.id));
}
