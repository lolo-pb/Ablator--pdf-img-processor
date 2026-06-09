import ExcelJS from "exceljs";
import { type ExportRequest, type Preset, type NormalizedTemplateRow } from "@bank/domain";

export async function buildWorkbookBuffer(args: {
  preset: Preset;
  rows: NormalizedTemplateRow[];
  request: ExportRequest;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(args.request.workbookName);

  const selectedColumns = args.preset.definition.columns.filter((column) =>
    args.request.selectedColumns.includes(column.key),
  );
  const includeConfidence = args.request.selectedColumns.includes("confidence");

  worksheet.columns = [
    ...selectedColumns.map((column) => ({
      header: column.label,
      key: column.key,
      width: 22,
    })),
    ...(includeConfidence ? [{ header: "Confidence", key: "confidence", width: 14 }] : []),
  ];

  for (const row of args.rows) {
    worksheet.addRow({
      ...Object.fromEntries(selectedColumns.map((column) => [column.key, row.values[column.key] ?? ""])),
      ...(includeConfidence ? { confidence: row.confidence } : {}),
    });
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
