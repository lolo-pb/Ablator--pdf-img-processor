"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { outputColumnSchema } from "@bank/domain";
import {
  createPreset,
  getTemplateRoute,
  updatePreset,
} from "../lib/services";

function parseColumns(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" && value.length > 0 ? JSON.parse(value) : [];
  if (!Array.isArray(raw)) {
    throw new Error("Template columns must be an array.");
  }
  return raw.map((column) => outputColumnSchema.parse(column));
}
export async function createPresetAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  const preset = await createPreset({
    businessId,
    name: String(formData.get("name")),
    documentType: String(formData.get("documentType")),
    columns: parseColumns(formData.get("columnsJson")),
    instructionText: String(formData.get("instructionText")),
    ignoreRules: String(formData.get("ignoreRules") ?? ""),
  });

  revalidatePath(`/businesses/${businessId}`);
  redirect(getTemplateRoute(businessId, preset.id));
}

export async function updatePresetAction(formData: FormData) {
  const businessId = String(formData.get("businessId"));
  const presetId = String(formData.get("presetId"));
  const preset = await updatePreset({
    businessId,
    presetId,
    name: String(formData.get("name")),
    documentType: String(formData.get("documentType")),
    columns: parseColumns(formData.get("columnsJson")),
    instructionText: String(formData.get("instructionText")),
    ignoreRules: String(formData.get("ignoreRules") ?? ""),
  });

  revalidatePath(`/businesses/${businessId}`);
  revalidatePath(getTemplateRoute(businessId, preset.id));
  redirect(getTemplateRoute(businessId, preset.id));
}
