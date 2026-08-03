import { buildInMemoryExport } from "../../../../../../../lib/services";

export async function POST(
  request: Request,
  context: { params: Promise<{ businessId: string; templateId: string }> },
) {
  try {
    const { businessId, templateId } = await context.params;
    const result = await buildInMemoryExport({ businessId, presetId: templateId, request: await request.json() });
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch {
    return new Response("Export failed.", { status: 400 });
  }
}
