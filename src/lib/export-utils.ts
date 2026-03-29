import * as XLSX from 'xlsx';

/**
 * Export data to Excel (.xlsx) file
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) return;
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to CSV file
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Print a table by opening a print-friendly window
 */
export function printTable(title: string, headers: string[], rows: string[][]) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const tableHeaders = headers.map(h => `<th style="border:1px solid #ccc;padding:8px 12px;background:#f8f9fa;font-weight:600;text-align:left;font-size:13px;">${h}</th>`).join('');
  const tableRows = rows.map(row => 
    `<tr>${row.map(cell => `<td style="border:1px solid #eee;padding:6px 12px;font-size:12px;">${cell}</td>`).join('')}</tr>`
  ).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #888; font-size: 12px; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</div>
      <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
      <br/>
      <button onclick="window.print()" style="padding:8px 24px;background:#1e293b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;">🖨️ In Ngay</button>
    </body>
    </html>
  `);
  printWindow.document.close();
}
