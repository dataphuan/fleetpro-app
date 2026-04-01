import * as XLSX from 'xlsx';

export interface ImportColumn {
  key: string;
  header: string;
  required?: boolean;
}

export function prepareExcelData<T>(data: T[], columns: { key: string; header: string }[]) {
    return data.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
            // Support nested keys (e.g. vehicle.license_plate)
            const keys = col.key.split('.');
            let value: any = row;
            for (const k of keys) {
                value = (value as any)?.[k];
            }
            
            // Handle null/undefined
            obj[col.header] = value === null || value === undefined ? '' : value;
        });
        return obj;
    });
}

export function exportToCSV<T>(data: T[], filename: string, columns: { key: string; header: string }[]) {
    if (!data || data.length === 0) {
        return;
    }

    // Transform data into array of objects using exactly the specified columns
    const transformedData = prepareExcelData(data, columns);

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // Auto-fit column widths
    const colWidths = columns.map(col => ({
        wch: Math.max(col.header.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    // Write file with Vietnamese filename and current date
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
}

export function exportToJSON(data: unknown, filename: string) {
    if (!data) {
        return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function importFromFile(
  file: File,
  columns: ImportColumn[],
  onProgress?: (message: string) => void
): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('File Excel không chứa dữ liệu'));
          return;
        }

        // Validate required columns
        const requiredColumns = columns.filter(col => col.required).map(col => col.header);
        const excelHeaders = Object.keys(jsonData[0]);
        const missingColumns = requiredColumns.filter(col => !excelHeaders.includes(col));

        if (missingColumns.length > 0) {
          reject(new Error(`Các cột bắt buộc bị thiếu: ${missingColumns.join(', ')}`));
          return;
        }

        // Map Excel columns to database keys
        const mappedData = jsonData.map((row: Record<string, any>) => {
          const mappedRow: Record<string, any> = {};
          columns.forEach(col => {
            if (row[col.header] !== undefined && row[col.header] !== null && row[col.header] !== '') {
              mappedRow[col.key] = row[col.header];
            }
          });
          return mappedRow;
        });

        onProgress?.(`Đã đọc ${mappedData.length} bản ghi từ file`);
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc file'));
    };

    reader.readAsBinaryString(file);
  });
}
