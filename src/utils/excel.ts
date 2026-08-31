// Excel (.xlsx) export utility using ExcelJS + file-saver.

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
};

export type ExcelRow = Record<string, string | number | boolean | null | undefined>;

function applySheetStyle(sheet: ExcelJS.Worksheet, columns: ExcelColumn[]) {
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A4FA6' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  if (sheet.rowCount > 1) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  }
}

export async function exportToExcel(
  columns: ExcelColumn[],
  rows: ExcelRow[],
  filename: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aplikasi Magang BPJS Ketenagakerjaan';
    const sheet = workbook.addWorksheet('Data');
    applySheetStyle(sheet, columns);

    rows.forEach((r) => {
      sheet.addRow(r);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, filename);
    return { success: true, message: `Export berhasil: ${filename}` };
  } catch (e) {
    console.error('exportToExcel error:', e);
    return { success: false, message: 'Gagal meng-export Excel.' };
  }
}

export type WorkbookSheet = {
  name: string;
  columns: ExcelColumn[];
  rows: ExcelRow[];
};

export async function exportWorkbook(
  sheets: WorkbookSheet[],
  filename: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aplikasi Magang BPJS Ketenagakerjaan';

    sheets.forEach(({ name, columns, rows }) => {
      const sheet = workbook.addWorksheet(name);
      applySheetStyle(sheet, columns);
      rows.forEach((row) => sheet.addRow(row));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, filename);
    return { success: true, message: `Export berhasil: ${filename}` };
  } catch (e) {
    console.error('exportWorkbook error:', e);
    return { success: false, message: 'Gagal meng-export workbook Excel.' };
  }
}
