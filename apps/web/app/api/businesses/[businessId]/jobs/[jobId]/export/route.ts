import { buildExport } from "../../../../../../../lib/services";

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string; jobId: string }> },
) {
  try {
    const { businessId, jobId } = await context.params;
    const { searchParams } = new URL(request.url);
    const selectedColumns = (searchParams.get("columns") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const workbookName = searchParams.get("workbookName") ?? "Transactions";

    const result = await buildExport({
      businessId,
      request: {
        jobId,
        format: "xlsx",
        selectedColumns,
        workbookName,
      },
    });

    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Export failed.", { status: 400 });
  }
}
