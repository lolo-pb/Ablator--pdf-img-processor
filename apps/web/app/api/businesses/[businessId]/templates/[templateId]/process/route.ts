import { NextResponse } from "next/server";
import { processInMemoryDocuments } from "../../../../../../../lib/services";

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string; templateId: string }> },
) {
  try {
    const { businessId, templateId } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const result = await processInMemoryDocuments({ businessId, presetId: templateId, files });
    return NextResponse.json({ rows: result.rows, warnings: result.warnings });
  } catch {
    return NextResponse.json({ error: "Unable to process documents." }, { status: 400 });
  }
}
