import ExcelJS from "exceljs";
import { type ExportRequest, type Preset, type NormalizedTransactionRow } from "@bank/domain";

export async function buildWorkbookBuffer(args: {
  preset: Preset;
  rows: NormalizedTransactionRow[];
  request: ExportRequest;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(args.request.workbookName);

  const selectedColumns = args.preset.definition.columns.filter((column) =>
    args.request.selectedColumns.includes(column.key),
  );

  worksheet.columns = selectedColumns.map((column) => ({
    header: column.label,
    key: column.key,
    width: 22,
  }));

  for (const row of args.rows) {
    worksheet.addRow({
      date: row.date,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
      direction: row.direction,
      balance: row.balance,
      category: row.category,
      counterparty: row.counterparty ?? "",
      reference: row.reference,
      notes: row.notes,
    });
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

